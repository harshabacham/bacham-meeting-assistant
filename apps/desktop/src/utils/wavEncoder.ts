/**
 * Ultra-fast, zero-dependency 16kHz 16-bit Mono PCM WAV Encoder for raw Float32 audio samples.
 * Produces 100% compliant, standard RIFF WAV files accepted by Gemini, Whisper, and Neural ASR engines.
 */
export function encodeWavBase64(samples: Float32Array, sampleRate = 16000): string {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = samples.length * (bitsPerSample / 8);
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // 1. RIFF Identifier
    writeString(view, 0, 'RIFF');
    // File size minus RIFF identifier & size field (36 + dataSize)
    view.setUint32(4, 36 + dataSize, true);
    // RIFF Type
    writeString(view, 8, 'WAVE');

    // 2. "fmt " Sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);           // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true);            // AudioFormat (1 = PCM)
    view.setUint16(22, numChannels, true);  // NumChannels (1 = Mono)
    view.setUint32(24, sampleRate, true);   // SampleRate (16000)
    view.setUint32(28, byteRate, true);     // ByteRate (16000 * 1 * 2 = 32000)
    view.setUint16(32, blockAlign, true);   // BlockAlign (2 bytes per sample)
    view.setUint16(34, bitsPerSample, true);// BitsPerSample (16 bits)

    // 3. "data" Sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // 4. Write 16-bit Linear PCM audio samples
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        // Clamp sample to [-1, 1]
        const s = Math.max(-1, Math.min(1, samples[i]));
        // Convert to signed 16-bit integer (-32768 to 32767)
        const intSample = s < 0 ? s * 0x8000 : s * 0x7FFF;
        view.setInt16(offset, intSample, true);
    }

    // 5. Binary to Base64 conversion (chunked to prevent call stack overflow)
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000; // 32KB chunks
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const sub = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, sub as any);
    }
    return btoa(binary);
}

function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}
