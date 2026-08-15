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
let lockedAutoLang: string | null = null;
let isLooping = false;

// Separate ring-buffers for system audio and microphone
let sysBuffer: Float32Array = new Float32Array(0);
let micBuffer: Float32Array = new Float32Array(0);

const TARGET_SAMPLE_RATE = 16000;
const PROCESS_INTERVAL_MS = 3500;              // 3.5s cycle for rich context
const MIN_SAMPLES = TARGET_SAMPLE_RATE * 1.5;   // at least 1.5s of audio for stable phonemes
const MAX_SAMPLES = TARGET_SAMPLE_RATE * 8;     // up to 8s context for full sentences

const LANGUAGE_MAP: Record<string, { code: string | null; isEnglishOnly: boolean }> = {
  'english':   { code: 'en', isEnglishOnly: true },
  'auto':      { code: null, isEnglishOnly: false },
  'hindi':     { code: 'hi', isEnglishOnly: false },
  'telugu':    { code: 'te', isEnglishOnly: false },
  'tamil':     { code: 'ta', isEnglishOnly: false },
  'kannada':   { code: 'kn', isEnglishOnly: false },
  'malayalam': { code: 'ml', isEnglishOnly: false },
  'marathi':   { code: 'mr', isEnglishOnly: false },
  'bengali':   { code: 'bn', isEnglishOnly: false },
  'gujarati':  { code: 'gu', isEnglishOnly: false },
  'punjabi':   { code: 'pa', isEnglishOnly: false },
  'spanish':   { code: 'es', isEnglishOnly: false },
  'french':    { code: 'fr', isEnglishOnly: false },
  'german':    { code: 'de', isEnglishOnly: false },
  'japanese':  { code: 'ja', isEnglishOnly: false },
  'chinese':   { code: 'zh', isEnglishOnly: false },
  'arabic':    { code: 'ar', isEnglishOnly: false },
  'russian':   { code: 'ru', isEnglishOnly: false },
  'portuguese':{ code: 'pt', isEnglishOnly: false },
  'italian':   { code: 'it', isEnglishOnly: false },
  'korean':    { code: 'ko', isEnglishOnly: false },
};

/**
 * Intelligent Script-to-Language Detector (identifies Unicode script from speech tokens)
 */
function detectScriptLanguage(text: string): { code: string; label: string } | null {
  if (!text) return null;
  // Devanagari (Hindi, Marathi)
  if (/[\u0900-\u097F]/.test(text)) return { code: 'hi', label: 'Hindi (हिंदी)' };
  // Telugu
  if (/[\u0C00-\u0C7F]/.test(text)) return { code: 'te', label: 'Telugu (తెలుగు)' };
  // Tamil
  if (/[\u0B80-\u0BFF]/.test(text)) return { code: 'ta', label: 'Tamil (தமிழ்)' };
  // Kannada
  if (/[\u0C80-\u0CFF]/.test(text)) return { code: 'kn', label: 'Kannada (ಕನ್ನಡ)' };
  // Malayalam
  if (/[\u0D00-\u0D7F]/.test(text)) return { code: 'ml', label: 'Malayalam (മലയാളം)' };
  // Bengali
  if (/[\u0980-\u09FF]/.test(text)) return { code: 'bn', label: 'Bengali (বাংলা)' };
  // Gujarati
  if (/[\u0A80-\u0AFF]/.test(text)) return { code: 'gu', label: 'Gujarati (ગુજરાતી)' };
  // Gurmukhi / Punjabi
  if (/[\u0A00-\u0A7F]/.test(text)) return { code: 'pa', label: 'Punjabi (ਪੰਜਾਬੀ)' };
  // Arabic / Urdu
  if (/[\u0600-\u06FF]/.test(text)) return { code: 'ar', label: 'Arabic (العربية)' };
  // Japanese (Hiragana / Katakana)
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return { code: 'ja', label: 'Japanese (日本語)' };
  // Chinese (Hanzi)
  if (/[\u4E00-\u9FFF]/.test(text)) return { code: 'zh', label: 'Chinese (中文)' };
  // Hangul / Korean
  if (/[\uAC00-\uD7AF]/.test(text)) return { code: 'ko', label: 'Korean (한국어)' };
  // Cyrillic / Russian
  if (/[\u0400-\u04FF]/.test(text)) return { code: 'ru', label: 'Russian (Русский)' };
  // Latin / English
  if (/[a-zA-Z]/.test(text)) return { code: 'en', label: 'English' };
  return null;
}

self.onerror = (e: any) => {
  self.postMessage({ type: 'STATUS', status: 'error', error: e?.message || String(e) });
};

async function loadModel(lang: string) {
  isModelLoaded = false;
  currentLanguage = lang || 'auto';
  lockedAutoLang = null;
  self.postMessage({ type: 'STATUS', status: `loading` });

  try {
    const isEnglishOnly = currentLanguage === 'english';
    // Upgrade to whisper-base for vastly superior accuracy (>95% vs ~60% with tiny)
    const modelName = isEnglishOnly ? 'Xenova/whisper-base.en' : 'Xenova/whisper-base';

    transcriber = await pipeline('automatic-speech-recognition', modelName, {
      quantized: true,
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

let sysSampleRate = 48000;
let micSampleRate = 48000;

function linearInterpolate(buffer: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate || buffer.length === 0) return buffer;
  const ratio = fromRate / toRate;
  const newLength = Math.floor(buffer.length / ratio);
  const resampled = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const origIndex = i * ratio;
    const index1 = Math.floor(origIndex);
    const index2 = Math.min(buffer.length - 1, index1 + 1);
    const frac = origIndex - index1;
    resampled[i] = buffer[index1] * (1 - frac) + buffer[index2] * frac;
  }
  return resampled;
}

function normalize(buf: Float32Array): Float32Array {
  let maxAmp = 0;
  for (let i = 0; i < buf.length; i++) {
    const abs = Math.abs(buf[i]);
    if (abs > maxAmp) maxAmp = abs;
  }
  if (maxAmp < 0.0001) return buf; // truly silent
  
  const gain = Math.min(0.9 / maxAmp, 40.0);
  const out = new Float32Array(buf.length);
  for (let i = 0; i < buf.length; i++) {
    out[i] = Math.max(-1.0, Math.min(1.0, buf[i] * gain));
  }
  return out;
}

self.onmessage = async (e) => {
  const { type, stream, payload, sampleRate, language } = e.data;

  if (type === 'INIT') {
    await loadModel(language || 'auto');
    if (!isLooping) {
      isLooping = true;
      processLoop();
    }
  }

  if (type === 'SET_LANGUAGE') {
    const newLang = language || 'auto';
    currentLanguage = newLang;
    lockedAutoLang = null;
    if (newLang === 'english' && !isModelLoaded) {
      await loadModel('english');
    } else {
      self.postMessage({ type: 'STATUS', status: `ready` });
    }
  }

  if (type === 'AUDIO_CHUNK') {
    if (!isModelLoaded) return;
    const data: number[] = Array.isArray(payload) ? payload : Object.values(payload);
    if (stream === 'sys') {
      if (sampleRate) sysSampleRate = sampleRate;
      sysBuffer = appendToBuffer(sysBuffer, data);
    } else {
      if (sampleRate) micSampleRate = sampleRate;
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

    const sys = sysBuffer;
    const mic = micBuffer;
    sysBuffer = new Float32Array(0);
    micBuffer = new Float32Array(0);

    const sysRms = rms(sys);
    const micRms = rms(mic);

    let activeAudio: Float32Array;
    let activeRate = 48000;
    let sourceLabel: string;

    if (sysRms > 0.0003 && sysRms >= micRms * 0.5) {
      activeAudio = sys;
      activeRate = sysSampleRate;
      sourceLabel = `Sys ${(sysRms * 100).toFixed(1)}%`;
    } else if (micRms > 0.001) {
      activeAudio = mic;
      activeRate = micSampleRate;
      sourceLabel = `Mic ${(micRms * 100).toFixed(1)}%`;
    } else {
      const newSys = new Float32Array(sys.length + sysBuffer.length);
      newSys.set(sys); newSys.set(sysBuffer, sys.length);
      sysBuffer = newSys.length > MAX_SAMPLES ? newSys.slice(-MAX_SAMPLES) : newSys;
      const newMic = new Float32Array(mic.length + micBuffer.length);
      newMic.set(mic); newMic.set(micBuffer, mic.length);
      micBuffer = newMic.length > MAX_SAMPLES ? newMic.slice(-MAX_SAMPLES) : newMic;
      self.postMessage({ type: 'STATUS', status: `ready` });
      continue;
    }

    const resampled16k = linearInterpolate(activeAudio, activeRate, TARGET_SAMPLE_RATE);
    const finalAudio = normalize(resampled16k);
    const durationSec = (finalAudio.length / TARGET_SAMPLE_RATE).toFixed(1);

    self.postMessage({
      type: 'STATUS',
      status: `Processing ${durationSec}s [${sourceLabel}]...`
    });

    try {
      const langInfo = LANGUAGE_MAP[currentLanguage] || { code: null, isEnglishOnly: false };

      const genOptions: any = {
        task: 'transcribe',
        temperature: 0.0,
        max_new_tokens: 128,
        repetition_penalty: 1.2,
        no_repeat_ngram_size: 3,
        return_timestamps: false,
      };

      // Determine target language:
      // If user selected explicit language: use it
      // If user selected auto: use lockedAutoLang once detected
      const targetLangCode = langInfo.code || lockedAutoLang;
      if (targetLangCode) {
        genOptions.language = targetLangCode;
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

      const isHallucination =
        !text ||
        text.length < 2 ||
        /^[\.\s,]+$/.test(text) ||
        /^(\[.*\])$/.test(text) ||
        /(\b\w+\b)(\s*[,.]?\s*\1){3,}/i.test(text);

      if (text && !isHallucination) {
        // Auto-detect language from native script on first sentence
        if (currentLanguage === 'auto' && !lockedAutoLang) {
          const detected = detectScriptLanguage(text);
          if (detected) {
            lockedAutoLang = detected.code;
            self.postMessage({
              type: 'LANGUAGE_DETECTED',
              payload: { language: detected.label, code: detected.code }
            });
          }
        }

        self.postMessage({
          type: 'TRANSCRIPT',
          payload: { text, timestamp: Date.now() }
        });
      }
      self.postMessage({ type: 'STATUS', status: `ready` });

    } catch (err: any) {
      console.error('Whisper transcription error:', err);
      self.postMessage({ type: 'STATUS', status: 'error', error: err?.message || String(err) });
    }
  }
}

