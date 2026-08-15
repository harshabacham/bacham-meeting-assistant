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
let currentLanguage = 'english';

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

const LANGUAGE_MAP: Record<string, { code: string; isEnglishOnly: boolean }> = {
  'english': { code: 'en', isEnglishOnly: true },
  'auto': { code: 'auto', isEnglishOnly: false },
  'hindi': { code: 'hi', isEnglishOnly: false },
  'telugu': { code: 'te', isEnglishOnly: false },
  'tamil': { code: 'ta', isEnglishOnly: false },
  'spanish': { code: 'es', isEnglishOnly: false },
  'french': { code: 'fr', isEnglishOnly: false },
  'german': { code: 'de', isEnglishOnly: false },
  'japanese': { code: 'ja', isEnglishOnly: false },
  'chinese': { code: 'zh', isEnglishOnly: false },
};

async function loadModel(lang: string) {
  isModelLoaded = false;
  currentLanguage = lang || 'english';
  self.postMessage({ type: 'STATUS', status: `loading model for ${currentLanguage}...` });
  
  try {
    const isEn = currentLanguage === 'english';
    const modelName = isEn ? 'Xenova/whisper-tiny.en' : 'Xenova/whisper-tiny';
    
    transcriber = await pipeline('automatic-speech-recognition', modelName, {
      progress_callback: (progress: any) => {
        self.postMessage({ type: 'PROGRESS', progress });
      }
    });
    isModelLoaded = true;
    self.postMessage({ type: 'STATUS', status: `ready (${currentLanguage} listening)` });
  } catch (err: any) {
    self.postMessage({ type: 'STATUS', status: 'error', error: err.message || String(err) });
  }
}

self.onmessage = async (e) => {
  const { type, stream, payload, sampleRate, channels, language } = e.data;

  if (type === 'INIT') {
    await loadModel(language || 'english');
    processBufferLoop();
  }

  if (type === 'SET_LANGUAGE') {
    const newLang = language || 'english';
    if (newLang !== currentLanguage) {
      await loadModel(newLang);
    }
  }

  if (type === 'AUDIO_CHUNK') {
    if (!isModelLoaded) return;
    
    const isSys = stream === 'sys';
    const processedChunk = new Float32Array(payload);
    
    // Append to respective stream buffer (already 16kHz mono from Rust)
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

    // Grab buffers and clear them (already 16kHz mono)
    const sys16k = sysBuffer;
    const mic16k = micBuffer;
    sysBuffer = new Float32Array(0);
    micBuffer = new Float32Array(0);

    if (sys16k.length === 0 && mic16k.length === 0) continue;

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

    // Cap active audio to max 5.0 seconds so latency never accumulates
    const maxAllowedSamples = TARGET_SAMPLE_RATE * 5;
    const finalAudio = activeAudio.length > maxAllowedSamples ? activeAudio.slice(-maxAllowedSamples) : activeAudio;
    const maxLen = finalAudio.length;
    if (maxLen === 0) continue;

    // Calculate peak amplitude
    let maxAmp = 0;
    for (let i = 0; i < maxLen; i++) {
      const abs = Math.abs(finalAudio[i]);
      if (abs > maxAmp) maxAmp = abs;
    }

    // Dynamic amplitude normalization (boost quiet speech for Whisper)
    if (maxAmp > 0.005) {
      const gain = Math.min(0.95 / maxAmp, 4.0); // Boost quiet speech cleanly
      for (let i = 0; i < maxLen; i++) {
        finalAudio[i] *= gain;
      }
    }

    const durationSec = (maxLen / TARGET_SAMPLE_RATE).toFixed(1);

    try {
      // Energy Gate: If peak amplitude is under 1.5% or RMS is ambient room noise, skip inference to prevent hallucinations
      const hasSpeechEnergy = (sysRms > 0.006) || (micRms > 0.025) || (maxAmp > 0.02);
      if (!hasSpeechEnergy) {
        self.postMessage({ type: 'STATUS', status: `Listening (${durationSec}s silence/ambient)` });
        continue;
      }

      self.postMessage({ 
        type: 'STATUS', 
        status: `Transcribing ${durationSec}s [${sourceLabel}] in ${currentLanguage}...` 
      });

      const langInfo = LANGUAGE_MAP[currentLanguage] || { code: 'en', isEnglishOnly: true };

      // Build generation parameters based on chosen language
      const genOptions: any = {
        temperature: 0.0,
        max_new_tokens: 64,
        repetition_penalty: 1.3,
        no_repeat_ngram_size: 3,
        return_timestamps: false
      };

      // Only pass task and language for multilingual models
      if (!langInfo.isEnglishOnly) {
        genOptions.task = 'transcribe';
        if (langInfo.code !== 'auto') {
          genOptions.language = langInfo.code;
        }
      }

      // Run speech-to-text with strict repetition penalties & greedy decoding
      const output = await transcriber(finalAudio, genOptions);

      let text = '';
      if (typeof output === 'string') {
        text = output;
      } else if (output && typeof output.text === 'string') {
        text = output.text;
      } else if (Array.isArray(output) && output.length > 0) {
        text = output.map((item: any) => item?.text || '').join(' ');
      }

      text = text.trim();

      // Filter out Whisper hallucinated tokens on low speech energy
      const isRepeatedLoop = /((\b\w+\b)[,\s]+)\2{2,}/i.test(text); // e.g. "oh, oh, oh" or "you you you"
      const isHallucination = !text || 
        isRepeatedLoop ||
        text.includes('[BLANK_AUDIO]') || 
        text.startsWith('(') && text.endsWith(')') ||
        text.startsWith('[') && text.endsWith(']') ||
        text === '.' || text === '...' || text.toLowerCase() === 'you' || text.toLowerCase() === 'thank you.';

      if (text && text.length > 0 && !isHallucination) {
        self.postMessage({
          type: 'TRANSCRIPT',
          payload: {
            text: text,
            timestamp: Date.now()
          }
        });
        self.postMessage({ type: 'STATUS', status: `Transcribed: "${text.substring(0, 45)}..."` });
      } else {
        self.postMessage({ type: 'STATUS', status: `Speech low/filtered in ${durationSec}s` });
      }
    } catch (err: any) {
      console.error('Transcription error:', err);
      self.postMessage({ type: 'STATUS', status: 'error', error: err?.message || String(err) });
    }
  }
}

// High-quality Anti-Aliased Box Resampler (averages all incoming samples in the time window)
function linearInterpolate(buffer: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return buffer;
  
  const ratio = fromRate / toRate;
  const newLength = Math.floor(buffer.length / ratio);
  const resampled = new Float32Array(newLength);
  
  for (let i = 0; i < newLength; i++) {
    const startPos = i * ratio;
    const endPos = (i + 1) * ratio;
    const startIdx = Math.floor(startPos);
    const endIdx = Math.min(buffer.length, Math.ceil(endPos));
    
    let sum = 0;
    let count = 0;
    for (let j = startIdx; j < endIdx; j++) {
      sum += buffer[j];
      count++;
    }
    
    resampled[i] = count > 0 ? (sum / count) : (buffer[startIdx] || 0);
  }
  return resampled;
}
