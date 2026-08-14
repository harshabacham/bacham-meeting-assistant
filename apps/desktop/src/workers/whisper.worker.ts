import { pipeline, env } from '@xenova/transformers';

// Configure transformers.js environment to run locally
env.allowLocalModels = false; // We use HuggingFace Hub to pull the model on first run
env.useBrowserCache = true; // Cache it in the browser's IndexedDB

let transcriber: any = null;
let isModelLoaded = false;
let audioBuffer: Float32Array = new Float32Array(0);
let currentSampleRate = 48000;
let currentChannels = 1;
const TARGET_SAMPLE_RATE = 16000;
const PROCESSING_INTERVAL = 3000; // Process every 3 seconds

self.onmessage = async (e) => {
  const { type, payload } = e.data;

  if (type === 'INIT') {
    self.postMessage({ type: 'STATUS', status: 'loading' });
    try {
      // Use the smaller whispered model for real-time performance
      transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
        progress_callback: (progress: any) => {
          self.postMessage({ type: 'PROGRESS', progress });
        }
      });
      isModelLoaded = true;
      self.postMessage({ type: 'STATUS', status: 'ready' });
      processBufferLoop();
    } catch (err: any) {
      self.postMessage({ type: 'STATUS', status: 'error', error: err.message });
    }
  }

  if (type === 'AUDIO_CHUNK') {
    if (!isModelLoaded) return;
    
    if (e.data.sampleRate) {
        currentSampleRate = e.data.sampleRate;
    }
    if (e.data.channels) {
        currentChannels = e.data.channels;
    }
    
    let processedChunk = new Float32Array(payload);
    
    // Mixdown to mono if necessary
    if (currentChannels > 1) {
        const mono = new Float32Array(Math.floor(processedChunk.length / currentChannels));
        for (let i = 0; i < mono.length; i++) {
            let sum = 0;
            for (let c = 0; c < currentChannels; c++) {
                sum += processedChunk[i * currentChannels + c];
            }
            mono[i] = sum / currentChannels;
        }
        processedChunk = mono;
    }
    
    // Append incoming audio to the buffer
    const merged = new Float32Array(audioBuffer.length + processedChunk.length);
    merged.set(audioBuffer);
    merged.set(processedChunk, audioBuffer.length);
    audioBuffer = merged;
  }
};

async function processBufferLoop() {
  while (true) {
    await new Promise(resolve => setTimeout(resolve, PROCESSING_INTERVAL));
    if (!isModelLoaded || audioBuffer.length === 0) continue;

    // Grab the current buffer and clear it
    const currentBuffer = audioBuffer;
    audioBuffer = new Float32Array(0);

    // Resample to 16kHz
    const resampled = linearInterpolate(currentBuffer, currentSampleRate, TARGET_SAMPLE_RATE);

    try {
      // Tell UI we are processing
      self.postMessage({ type: 'STATUS', status: `Processing ${resampled.length} samples...` });
      
      // Transcribe
      const output = await transcriber(resampled, {
        language: "english",
        task: "transcribe"
      });

      if (output && output.text && output.text.trim()) {
        self.postMessage({
          type: 'TRANSCRIPT',
          payload: {
            text: output.text.trim(),
            timestamp: Date.now()
          }
        });
      } else {
        self.postMessage({ type: 'STATUS', status: 'ready (empty transcript)' });
      }
    } catch (err: any) {
      console.error('Transcription error:', err);
      self.postMessage({ type: 'STATUS', status: 'error', error: err.message });
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
