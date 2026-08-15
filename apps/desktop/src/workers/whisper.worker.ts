import { pipeline, env } from '@xenova/transformers';

// Configure transformers.js environment to run locally
env.allowLocalModels = false; // We use HuggingFace Hub to pull the model on first run
env.useBrowserCache = true; // Cache it in the browser's IndexedDB

// CRITICAL for WebView/Tauri: Web Workers cannot use SharedArrayBuffer multithreading without COOP/COEP
if (env.backends && env.backends.onnx && env.backends.onnx.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
  env.backends.onnx.wasm.proxy = false;
}

let transcriber: any = null;
let isModelLoaded = false;

// Separate buffers for system audio and microphone to prevent interleaving corruption
let sysBuffer: Float32Array = new Float32Array(0);
let micBuffer: Float32Array = new Float32Array(0);

let sysSampleRate = 48000;
let micSampleRate = 48000;
let sysChannels = 2;
let micChannels = 1;

const TARGET_SAMPLE_RATE = 16000;
const PROCESSING_INTERVAL = 3000; // Process every 3 seconds

self.onerror = (e: any) => {
  self.postMessage({ type: 'STATUS', status: 'error', error: e?.message || String(e) });
};

self.onmessage = async (e) => {
  const { type, stream, payload, sampleRate, channels } = e.data;

  if (type === 'INIT') {
    self.postMessage({ type: 'STATUS', status: 'loading' });
    try {
      // Use Xenova/whisper-tiny for fast multilingual real-time performance (~75MB)
      transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
        progress_callback: (progress: any) => {
          self.postMessage({ type: 'PROGRESS', progress });
        }
      });
      isModelLoaded = true;
      self.postMessage({ type: 'STATUS', status: 'ready (listening)' });
      processBufferLoop();
    } catch (err: any) {
      self.postMessage({ type: 'STATUS', status: 'error', error: err.message || String(err) });
    }
  }

  if (type === 'AUDIO_CHUNK') {
    if (!isModelLoaded) return;
    
    const isSys = stream === 'sys';
    const rate = sampleRate || 48000;
    const numChannels = channels || (isSys ? 2 : 1);

    if (isSys) {
      sysSampleRate = rate;
      sysChannels = numChannels;
    } else {
      micSampleRate = rate;
      micChannels = numChannels;
    }
    
    let processedChunk = new Float32Array(payload);
    
    // Downmix to mono if multi-channel (e.g. stereo WASAPI loopback)
    if (numChannels > 1) {
      const mono = new Float32Array(Math.floor(processedChunk.length / numChannels));
      for (let i = 0; i < mono.length; i++) {
        let sum = 0;
        for (let c = 0; c < numChannels; c++) {
          sum += processedChunk[i * numChannels + c];
        }
        mono[i] = sum / numChannels;
      }
      processedChunk = mono;
    }
    
    // Append to respective stream buffer
    if (isSys) {
      const merged = new Float32Array(sysBuffer.length + processedChunk.length);
      merged.set(sysBuffer);
      merged.set(processedChunk, sysBuffer.length);
      sysBuffer = merged;
    } else {
      const merged = new Float32Array(micBuffer.length + processedChunk.length);
      merged.set(micBuffer);
      merged.set(processedChunk, micBuffer.length);
      micBuffer = merged;
    }
  }
};

async function processBufferLoop() {
  while (true) {
    await new Promise(resolve => setTimeout(resolve, PROCESSING_INTERVAL));
    if (!isModelLoaded) continue;

    // Grab buffers and clear them
    const curSys = sysBuffer;
    const curMic = micBuffer;
    sysBuffer = new Float32Array(0);
    micBuffer = new Float32Array(0);

    if (curSys.length === 0 && curMic.length === 0) continue;

    // Resample both streams independently to 16kHz
    const sys16k = curSys.length > 0 ? linearInterpolate(curSys, sysSampleRate, TARGET_SAMPLE_RATE) : new Float32Array(0);
    const mic16k = curMic.length > 0 ? linearInterpolate(curMic, micSampleRate, TARGET_SAMPLE_RATE) : new Float32Array(0);

    // Mix both tracks parallelly
    const maxLen = Math.max(sys16k.length, mic16k.length);
    if (maxLen === 0) continue;

    const mixed = new Float32Array(maxLen);
    let sumSq = 0;

    for (let i = 0; i < maxLen; i++) {
      const s = (i < sys16k.length ? sys16k[i] : 0);
      const m = (i < mic16k.length ? mic16k[i] : 0);
      // Soft mix with clipping protection
      let val = s + m;
      if (val > 1.0) val = 1.0;
      if (val < -1.0) val = -1.0;
      mixed[i] = val;
      sumSq += val * val;
    }

    const rms = Math.sqrt(sumSq / maxLen);

    // Dynamic amplitude normalization (boost quiet speech for Whisper)
    let maxAmp = 0;
    for (let i = 0; i < maxLen; i++) {
      const abs = Math.abs(mixed[i]);
      if (abs > maxAmp) maxAmp = abs;
    }
    if (maxAmp > 0.005) {
      const gain = Math.min(0.9 / maxAmp, 6.0); // Boost quiet audio up to 6x
      for (let i = 0; i < maxLen; i++) {
        mixed[i] *= gain;
      }
    }

    try {
      self.postMessage({ 
        type: 'STATUS', 
        status: `Processing ${(maxLen / TARGET_SAMPLE_RATE).toFixed(1)}s audio (Vol: ${(rms * 100).toFixed(1)}%, Peak: ${(maxAmp * 100).toFixed(0)}%)...` 
      });
      
      // If audio is dead silence, skip inference
      if (rms < 0.002) {
        self.postMessage({ type: 'STATUS', status: 'ready (listening)' });
        continue;
      }

      // Run speech-to-text inference with raw audio object format
      const output = await transcriber(
        { raw: mixed, sampling_rate: TARGET_SAMPLE_RATE },
        {
          task: 'transcribe',
          return_timestamps: false
        }
      );

      let text = '';
      if (typeof output === 'string') {
        text = output;
      } else if (output && typeof output.text === 'string') {
        text = output.text;
      } else if (Array.isArray(output) && output.length > 0) {
        text = output.map((item: any) => item?.text || '').join(' ');
      }

      text = text.trim();

      // Filter out Whisper hallucinated tokens on silence/noise like [BLANK_AUDIO], (music), etc.
      const isHallucination = !text || 
        text.includes('[BLANK_AUDIO]') || 
        text.startsWith('(') && text.endsWith(')') ||
        text.startsWith('[') && text.endsWith(']') ||
        text === '.' || text === '...' || text === 'you' || text === 'Thank you.';

      if (text && text.length > 0 && !isHallucination) {
        self.postMessage({
          type: 'TRANSCRIPT',
          payload: {
            text: text,
            timestamp: Date.now()
          }
        });
        self.postMessage({ type: 'STATUS', status: `Transcribed: "${text.substring(0, 35)}..."` });
      } else {
        self.postMessage({ type: 'STATUS', status: `No speech detected in ${(maxLen / TARGET_SAMPLE_RATE).toFixed(1)}s chunk` });
      }
    } catch (err: any) {
      console.error('Transcription error:', err);
      self.postMessage({ type: 'STATUS', status: 'error', error: err?.message || String(err) });
    }
  }
}

// Robust linear interpolation resampler for arbitrary sample rates
function linearInterpolate(buffer: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return buffer;
  
  const ratio = fromRate / toRate;
  const newLength = Math.floor(buffer.length / ratio);
  const resampled = new Float32Array(newLength);
  
  for (let i = 0; i < newLength; i++) {
    const position = i * ratio;
    const index = Math.floor(position);
    const fraction = position - index;
    
    if (index + 1 < buffer.length) {
        resampled[i] = buffer[index] * (1 - fraction) + buffer[index + 1] * fraction;
    } else {
        resampled[i] = buffer[index];
    }
  }
  return resampled;
}
