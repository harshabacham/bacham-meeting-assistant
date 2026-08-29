let pcmBuffer: number[] = [];
let windowMaxRms = 0;

// 4.0s natural sentence streaming window (64,000 samples at 16kHz)
const WINDOW_SIZE = 64000;
const STEP_SIZE = 51200; // 800ms overlap

self.onmessage = function (e) {
  const { data, fromRate } = e.data;
  
  if (!data || data.length === 0) return;
  const targetRate = 16000;
  const srcRate = fromRate > 8000 ? fromRate : 48000;
  const ratio = srcRate / targetRate;
  let sum = 0;

  if (Math.abs(ratio - 1) < 0.05) {
    for (let i = 0; i < data.length; i++) {
      const val = data[i];
      sum += val * val;
      pcmBuffer.push(val);
    }
  } else {
    // High-fidelity Linear Interpolation Resampling from 48kHz/44.1kHz to 16kHz
    for (let i = 0; i < data.length; i += ratio) {
      const idx0 = Math.floor(i);
      const idx1 = Math.min(idx0 + 1, data.length - 1);
      const frac = i - idx0;
      const val = (data[idx0] || 0) * (1 - frac) + (data[idx1] || 0) * frac;
      sum += val * val;
      pcmBuffer.push(val);
    }
  }

  const rms = Math.sqrt(sum / (data.length || 1));
  if (rms > windowMaxRms) windowMaxRms = rms;
  
  // Post level update
  self.postMessage({ type: 'level', level: Math.min(100, Math.round(rms * 600)) });

  if (pcmBuffer.length >= WINDOW_SIZE) {
    const samplesToProcess = pcmBuffer.slice(0, WINDOW_SIZE);
    pcmBuffer = pcmBuffer.slice(STEP_SIZE);
    const hadVoice = windowMaxRms > 0.0004;
    windowMaxRms = 0;

    if (hadVoice) {
      self.postMessage({ type: 'chunk', samples: new Float32Array(samplesToProcess) });
    }
  }
};
