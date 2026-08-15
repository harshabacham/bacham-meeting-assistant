import { pipeline, env } from '@xenova/transformers';

// Configure transformers.js for Tauri/WebView2 (100% Free & Local Open Source)
env.allowLocalModels = false;
env.useBrowserCache = true;

// CRITICAL for Tauri WebView2 - no SharedArrayBuffer support
if ((env as any).backends?.onnx?.wasm) {
  (env as any).backends.onnx.wasm.numThreads = 1;
  (env as any).backends.onnx.wasm.proxy = false;
}

let transcriber: any = null;
let isModelLoaded = false;
let currentLanguage = 'auto'; // Default to auto-detect
let isLooping = false;

// Separate ring-buffers for system audio and microphone
let sysBuffer: Float32Array = new Float32Array(0);
let micBuffer: Float32Array = new Float32Array(0);

const TARGET_SAMPLE_RATE = 16000;
const PROCESS_INTERVAL_MS = 3500;              // 3.5s cycle for rich context
const MIN_SAMPLES = TARGET_SAMPLE_RATE * 1.5;   // at least 1.5s of audio for stable phonemes
const MAX_SAMPLES = TARGET_SAMPLE_RATE * 8;     // up to 8s context for full sentences

const LANGUAGE_MAP: Record<string, { code: string; isEnglishOnly: boolean }> = {
  'english':  { code: 'en', isEnglishOnly: true },
  'auto':     { code: 'auto', isEnglishOnly: false },
  'hindi':    { code: 'hi', isEnglishOnly: false },
  'telugu':   { code: 'te', isEnglishOnly: false },
  'tamil':    { code: 'ta', isEnglishOnly: false },
  'spanish':  { code: 'es', isEnglishOnly: false },
  'french':   { code: 'fr', isEnglishOnly: false },
  'german':   { code: 'de', isEnglishOnly: false },
  'japanese': { code: 'ja', isEnglishOnly: false },
  'chinese':  { code: 'zh', isEnglishOnly: false },
};

self.onerror = (e: any) => {
  self.postMessage({ type: 'STATUS', status: 'error', error: e?.message || String(e) });
};

async function loadModel(lang: string) {
  isModelLoaded = false;
  currentLanguage = lang || 'auto';
  self.postMessage({ type: 'STATUS', status: `loading` });

  try {
    // Upgraded to whisper-base (74M parameters) for dramatically higher accuracy (3x lower WER)
    // Runs 100% locally and completely free/open-source
    const isEnglishOnly = currentLanguage === 'english';
    const modelName = isEnglishOnly ? 'Xenova/whisper-base.en' : 'Xenova/whisper-base';

    transcriber = await pipeline('automatic-speech-recognition', modelName, {
      progress_callback: (progress: any) => {
        self.postMessage({ type: 'PROGRESS', progress });
      }
    });

    isModelLoaded = true;
    sysBuffer = new Float32Array(0);
    micBuffer = new Float32Array(0);
    self.postMessage({ type: 'STATUS', status: `ready` });
  } catch (err: any) {
    isModelLoaded = false;
    self.postMessage({ type: 'STATUS', status: 'error', error: err.message || String(err) });
  }
}

/**
 * Append a plain number[] from Tauri JSON IPC into a typed Float32Array buffer.
 */
function appendToBuffer(existing: Float32Array, incoming: number[]): Float32Array {
  if (!incoming || incoming.length === 0) return existing;
  const chunk = new Float32Array(incoming.length);
  for (let i = 0; i < incoming.length; i++) chunk[i] = incoming[i];
  const merged = new Float32Array(existing.length + chunk.length);
  merged.set(existing, 0);
  merged.set(chunk, existing.length);
  return merged.length > MAX_SAMPLES ? merged.slice(merged.length - MAX_SAMPLES) : merged;
}

function rms(buf: Float32Array): number {
  if (buf.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.sqrt(sum / buf.length);
}

/**
 * High-accuracy dynamic range normalizer for Whisper mel-spectrogram input
 */
function normalize(buf: Float32Array): Float32Array {
  let maxAmp = 0;
  for (let i = 0; i < buf.length; i++) {
    const abs = Math.abs(buf[i]);
    if (abs > maxAmp) maxAmp = abs;
  }
  if (maxAmp < 0.0001) return buf; // truly silent
  
  // Scale audio to target peak 0.9 with adaptive gain up to 40x
  const gain = Math.min(0.9 / maxAmp, 40.0);
  const out = new Float32Array(buf.length);
  for (let i = 0; i < buf.length; i++) {
    out[i] = Math.max(-1.0, Math.min(1.0, buf[i] * gain));
  }
  return out;
}

self.onmessage = async (e) => {
  const { type, stream, payload, language } = e.data;

  if (type === 'INIT') {
    await loadModel(language || 'auto');
    if (!isLooping) {
      isLooping = true;
      processLoop();
    }
  }

  if (type === 'SET_LANGUAGE') {
    const newLang = language || 'auto';
    if (newLang !== currentLanguage) {
      await loadModel(newLang);
    }
  }

  if (type === 'AUDIO_CHUNK') {
    if (!isModelLoaded) return;
    const data: number[] = Array.isArray(payload) ? payload : Object.values(payload);
    if (stream === 'sys') {
      sysBuffer = appendToBuffer(sysBuffer, data);
    } else {
      micBuffer = appendToBuffer(micBuffer, data);
    }
  }
};

async function processLoop() {
  while (true) {
    await new Promise(resolve => setTimeout(resolve, PROCESS_INTERVAL_MS));
    if (!isModelLoaded) continue;

    const totalSamples = sysBuffer.length + micBuffer.length;
    if (totalSamples < MIN_SAMPLES) continue;

    // Snapshot buffers atomically and clear them
    const sys = sysBuffer;
    const mic = micBuffer;
    sysBuffer = new Float32Array(0);
    micBuffer = new Float32Array(0);

    const sysRms = rms(sys);
    const micRms = rms(mic);

    // Intelligent source selection:
    // If YouTube / Video is playing, use pristine direct loopback digital audio!
    let activeAudio: Float32Array;
    let sourceLabel: string;

    if (sysRms > 0.0003 && sysRms >= micRms * 0.5) {
      activeAudio = sys;
      sourceLabel = `Sys ${(sysRms * 100).toFixed(1)}%`;
    } else if (micRms > 0.001) {
      activeAudio = mic;
      sourceLabel = `Mic ${(micRms * 100).toFixed(1)}%`;
    } else {
      // Very low energy - restore samples to avoid wasting audio buffer
      const newSys = new Float32Array(sys.length + sysBuffer.length);
      newSys.set(sys); newSys.set(sysBuffer, sys.length);
      sysBuffer = newSys.length > MAX_SAMPLES ? newSys.slice(-MAX_SAMPLES) : newSys;
      const newMic = new Float32Array(mic.length + micBuffer.length);
      newMic.set(mic); newMic.set(micBuffer, mic.length);
      micBuffer = newMic.length > MAX_SAMPLES ? newMic.slice(-MAX_SAMPLES) : newMic;
      self.postMessage({ type: 'STATUS', status: `ready` });
      continue;
    }

    const finalAudio = normalize(activeAudio);
    const durationSec = (finalAudio.length / TARGET_SAMPLE_RATE).toFixed(1);

    self.postMessage({
      type: 'STATUS',
      status: `Processing ${durationSec}s [${sourceLabel}]...`
    });

    try {
      const langInfo = LANGUAGE_MAP[currentLanguage] || { code: 'auto', isEnglishOnly: false };

      const genOptions: any = {
        temperature: 0.0,
        max_new_tokens: 128,
        repetition_penalty: 1.2,
        no_repeat_ngram_size: 3,
        return_timestamps: false,
      };

      if (!langInfo.isEnglishOnly) {
        genOptions.task = 'transcribe';
        if (langInfo.code !== 'auto') {
          genOptions.language = langInfo.code;
        }
      }

      const output = await transcriber(finalAudio, genOptions);

      let text = '';
      if (typeof output === 'string') {
        text = output;
      } else if (output?.text) {
        text = output.text;
      } else if (Array.isArray(output)) {
        text = output.map((x: any) => x?.text || '').join(' ');
      }

      text = text
        .replace(/\[BLANK_AUDIO\]/gi, '')
        .replace(/\[Music\]/gi, '')
        .replace(/\[Applause\]/gi, '')
        .replace(/\(.*?\)/g, '')
        .trim();

      // Filter obvious hallucinations
      const isHallucination =
        !text ||
        text.length < 2 ||
        /^[\.\s,]+$/.test(text) ||
        /^(\[.*\])$/.test(text) ||
        /(\b\w+\b)(\s*[,.]?\s*\1){3,}/i.test(text);

      if (text && !isHallucination) {
        self.postMessage({
          type: 'TRANSCRIPT',
          payload: { text, timestamp: Date.now() }
        });
      }
      self.postMessage({ type: 'STATUS', status: `ready` });

    } catch (err: any) {
      console.error('Whisper transcription error:', err);
      self.postMessage({ type: 'STATUS', status: 'error', error: err?.message || String(err) });
      await new Promise(r => setTimeout(r, 2000));
      await loadModel(currentLanguage);
    }
  }
}


