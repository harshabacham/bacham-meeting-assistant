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
      // Use Xenova/whisper-tiny.en for high accuracy on English YouTube/meetings (~75MB)
      transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
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

    // Calculate independent RMS energy to prevent microphone ambient noise from degrading pristine system audio
    let sysRms = 0;
    for (let i = 0; i < sys16k.length; i++) sysRms += sys16k[i] * sys16k[i];
    sysRms = sys16k.length > 0 ? Math.sqrt(sysRms / sys16k.length) : 0;

    let micRms = 0;
    for (let i = 0; i < mic16k.length; i++) micRms += mic16k[i] * mic16k[i];
    micRms = mic16k.length > 0 ? Math.sqrt(micRms / mic16k.length) : 0;

    // Granola-style Intelligent Voice Activity Routing:
    // If YouTube / Video is playing, use pristine direct digital audio without mic background noise/phase cancellation!
    let activeAudio: Float32Array;
    let sourceLabel = '';

    if (sysRms > 0.003 && micRms < 0.02) {
      activeAudio = sys16k;
      sourceLabel = `Sys Audio ${(sysRms * 100).toFixed(0)}%`;
    } else if (micRms > 0.015 && sysRms < 0.003) {
      activeAudio = mic16k;
      sourceLabel = `Mic ${(micRms * 100).toFixed(0)}%`;
    } else {
      // Both active (e.g. speaking over a video or meeting dialogue), mix both
      const len = Math.max(sys16k.length, mic16k.length);
      activeAudio = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        const s = (i < sys16k.length ? sys16k[i] : 0);
        const m = (i < mic16k.length ? mic16k[i] : 0);
        activeAudio[i] = Math.max(-1.0, Math.min(1.0, s + m));
      }
      sourceLabel = `Mixed (Sys: ${(sysRms * 100).toFixed(0)}%, Mic: ${(micRms * 100).toFixed(0)}%)`;
    }

    const maxLen = activeAudio.length;
    if (maxLen === 0) continue;

    // Dynamic amplitude normalization (boost quiet speech for Whisper)
    let maxAmp = 0;
    for (let i = 0; i < maxLen; i++) {
      const abs = Math.abs(activeAudio[i]);
      if (abs > maxAmp) maxAmp = abs;
    }
    if (maxAmp > 0.002) {
      const gain = Math.min(0.95 / maxAmp, 5.0); // Boost quiet audio up to 5x
      for (let i = 0; i < maxLen; i++) {
        activeAudio[i] *= gain;
      }
    }

    const durationSec = (maxLen / TARGET_SAMPLE_RATE).toFixed(1);

    try {
      self.postMessage({ 
        type: 'STATUS', 
        status: `Processing ${durationSec}s [${sourceLabel}]...` 
      });
      
      // If audio is practically dead silence (< 0.2%), skip inference
      if (maxAmp < 0.002) {
        self.postMessage({ type: 'STATUS', status: 'ready (listening)' });
        continue;
      }

      // Run Whisper speech-to-text inference
      const output = await transcriber(activeAudio);

      let text = '';
      if (typeof output === 'string') {
        text = output;
      } else if (output && typeof output.text === 'string') {
        text = output.text;
      } else if (Array.isArray(output) && output.length > 0) {
        text = output.map((item: any) => item?.text || '').join(' ');
      }

      text = text.trim();

      // Filter out Whisper hallucinated tokens on silence/noise
      const isHallucination = !text || 
        text.includes('[BLANK_AUDIO]') || 
        text === '.' || text === '...' || text === 'you' || text === 'Thank you.';

      if (text && text.length > 0 && !isHallucination) {
        self.postMessage({
          type: 'TRANSCRIPT',
          payload: {
            text: text,
            timestamp: Date.now()
          }
        });
        self.postMessage({ type: 'STATUS', status: `Transcribed: "${text.substring(0, 40)}..."` });
      } else {
        self.postMessage({ type: 'STATUS', status: `Result: "${text || '(no words)'}" in ${durationSec}s` });
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
