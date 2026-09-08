import { useState, useEffect, useRef } from 'react';
import { 
    Copy, Minus, Sparkles, 
    ChevronUp, Check, X, Wand2, Volume2, Mic, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TauriClient } from '@/infrastructure/tauri-client';
import { emit, listen } from '@tauri-apps/api/event';
import { cn } from '@/components';
import { encodeWavBase64 } from '@/utils/wavEncoder';

export interface LanguageOption {
    code: string;
    label: string;
    nativeName: string;
    flag: string;
    bcp: string;
    category: 'popular' | 'indic' | 'european' | 'asian' | 'middle-eastern';
}

export const MULTILINGUAL_CATALOG: LanguageOption[] = [
    { code: 'auto', label: 'Auto Detect', nativeName: 'Automatic Detection', flag: '🌐', bcp: 'en-US', category: 'popular' },
    { code: 'english', label: 'English (US)', nativeName: 'English', flag: '🇺🇸', bcp: 'en-US', category: 'popular' },
    { code: 'english-in', label: 'English (India)', nativeName: 'Indian English', flag: '🇮🇳', bcp: 'en-IN', category: 'popular' },
    { code: 'hindi', label: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳', bcp: 'hi-IN', category: 'indic' },
    { code: 'telugu', label: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳', bcp: 'te-IN', category: 'indic' },
    { code: 'tamil', label: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳', bcp: 'ta-IN', category: 'indic' },
    { code: 'kannada', label: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳', bcp: 'kn-IN', category: 'indic' },
    { code: 'malayalam', label: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳', bcp: 'ml-IN', category: 'indic' },
    { code: 'marathi', label: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳', bcp: 'mr-IN', category: 'indic' },
    { code: 'bengali', label: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳', bcp: 'bn-IN', category: 'indic' },
    { code: 'gujarati', label: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳', bcp: 'gu-IN', category: 'indic' },
    { code: 'punjabi', label: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳', bcp: 'pa-IN', category: 'indic' },
    { code: 'spanish', label: 'Spanish', nativeName: 'Español', flag: '🇪🇸', bcp: 'es-ES', category: 'european' },
    { code: 'french', label: 'French', nativeName: 'Français', flag: '🇫🇷', bcp: 'fr-FR', category: 'european' },
    { code: 'german', label: 'German', nativeName: 'Deutsch', flag: '🇩🇪', bcp: 'de-DE', category: 'european' },
    { code: 'portuguese', label: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', bcp: 'pt-PT', category: 'european' },
    { code: 'italian', label: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', bcp: 'it-IT', category: 'european' },
    { code: 'russian', label: 'Russian', nativeName: 'Русский', flag: '🇷🇺', bcp: 'ru-RU', category: 'european' },
    { code: 'japanese', label: 'Japanese', nativeName: '日本語', flag: '🇯🇵', bcp: 'ja-JP', category: 'asian' },
    { code: 'chinese', label: 'Chinese', nativeName: '中文', flag: '🇨🇳', bcp: 'zh-CN', category: 'asian' },
    { code: 'korean', label: 'Korean', nativeName: '한국어', flag: '🇰🇷', bcp: 'ko-KR', category: 'asian' },
    { code: 'arabic', label: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', bcp: 'ar-SA', category: 'middle-eastern' },
];

interface LiveTranscriptPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onProcess: (transcript: string) => void;
    onInsertQuote?: (quote: string) => void;
    isStreaming: boolean;
    onStreamingChange: (isStreaming: boolean) => void;
}

export function LiveTranscriptPanel({ isOpen, isStreaming, onStreamingChange, onClose, onProcess }: LiveTranscriptPanelProps) {
    const [fullText, setFullText] = useState<string>('');
    const [isMinimized, setIsMinimized] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState('auto');
    const [recordingTime, setRecordingTime] = useState(0);
    const [copied, setCopied] = useState(false);
    const [isPolishing, setIsPolishing] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);
    const [quotaWarning, setQuotaWarning] = useState<string | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const streamingRef = useRef<boolean>(true);
    const audioCtxRef = useRef<AudioContext | null>(null);

    const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    useEffect(() => {
        streamingRef.current = isStreaming;
    }, [isStreaming]);

    // Timer
    useEffect(() => {
        if (!isOpen || !isStreaming) return;
        const t = setInterval(() => setRecordingTime(p => p + 1), 1000);
        return () => clearInterval(t);
    }, [isOpen, isStreaming]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [fullText]);

    // Core Audio Pipeline: Microphone (WebAudio) + System Audio (Rust CPAL WASAPI) -> Non-Dropping Audio Queue -> ASR
    useEffect(() => {
        if (!isOpen) {
            setFullText('');
            setRecordingTime(0);
            setQuotaWarning(null);
            TauriClient.stopNativeRecording().catch(() => {});
            if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
                audioCtxRef.current.close().catch(() => {});
                audioCtxRef.current = null;
            }
            return;
        }

        // 1. Start Rust Native WASAPI Loopback (System Audio + Mic)
        TauriClient.startNativeRecording().catch(console.error);

        // 2. High-Precision 16kHz PCM WAV Audio Streaming Queue
        let pcmBuffer: number[] = [];
        let windowMaxRms = 0;
        let isProcessingQueue = false;
        const audioQueue: Float32Array[] = [];

        const processQueue = async () => {
            if (isProcessingQueue || audioQueue.length === 0 || !streamingRef.current) return;
            isProcessingQueue = true;

            while (audioQueue.length > 0 && streamingRef.current) {
                const samples = audioQueue.shift();
                if (!samples) continue;

                try {
                    const wavBase64 = encodeWavBase64(samples, 16000);
                    const res = await TauriClient.transcribeLiveAudioChunk(wavBase64, 'audio/wav', selectedLanguage);
                    
                    if (res && res.text && res.text.trim()) {
                        const trimmed = res.text.trim();
                        const lower = trimmed.toLowerCase();
                        if (
                            trimmed !== '00:00' && 
                            trimmed !== '0:00' && 
                            trimmed !== '00:01' && 
                            trimmed !== '00:02' && 
                            trimmed !== 'one' && 
                            !lower.startsWith('subtitles') &&
                            !lower.startsWith('<noise') &&
                            !lower.startsWith('[noise') &&
                            !lower.startsWith('[silence') &&
                            lower !== '<noise>' &&
                            lower !== '[noise]' &&
                            lower !== '[silence]' &&
                            lower !== 'thank you.' &&
                            lower !== 'thank you'
                        ) {
                            setFullText(prev => {
                                const cleanPrev = prev.trim();
                                if (!cleanPrev) return trimmed;
                                if (cleanPrev.toLowerCase().endsWith(lower)) return prev;
                                
                                // Prevent repeating the exact last sentence if overlapped
                                const prevWords = cleanPrev.split(/\s+/);
                                const newWords = trimmed.split(/\s+/);
                                
                                let overlapCount = 0;
                                const maxOverlapCheck = Math.min(prevWords.length, newWords.length, 6);
                                for (let len = maxOverlapCheck; len >= 2; len--) {
                                    const prevTail = prevWords.slice(-len).join(' ').toLowerCase();
                                    const newHead = newWords.slice(0, len).join(' ').toLowerCase();
                                    if (prevTail === newHead) {
                                        overlapCount = len;
                                        break;
                                    }
                                }

                                const nonOverlappingText = overlapCount > 0 
                                    ? newWords.slice(overlapCount).join(' ') 
                                    : trimmed;

                                if (!nonOverlappingText.trim()) return prev;

                                const needsPeriod = !/[.!?]$/.test(cleanPrev);
                                return needsPeriod 
                                    ? `${cleanPrev}. ${nonOverlappingText}` 
                                    : `${cleanPrev} ${nonOverlappingText}`;
                            });

                            emit('live_caption_received', {
                                sessionId: 'live-session',
                                text: trimmed,
                                timestamp: Date.now(),
                                platform: 'desktop'
                            }).catch(() => {});
                        }
                    }
                } catch (apiErr: any) {
                    const errStr = String(apiErr);
                    if (errStr.includes('429') || errStr.includes('quota') || errStr.includes('RESOURCE_EXHAUSTED')) {
                        setQuotaWarning('Gemini API daily quota reached. Add a free Groq API key in Settings for 2,000 free transcriptions/day.');
                    }
                    console.warn("PCM WAV Transcription error:", apiErr);
                }
            }

            isProcessingQueue = false;
        };

        const pushSamples = (data: number[] | Float32Array, fromRate: number) => {
            if (!streamingRef.current || !data || data.length === 0) return;
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
            setAudioLevel(Math.min(100, Math.round(rms * 600)));

            // 4.0s natural sentence streaming window (64,000 samples at 16kHz)
            const WINDOW_SIZE = 64000;
            const STEP_SIZE = 51200; // 800ms overlap

            if (pcmBuffer.length >= WINDOW_SIZE) {
                const samplesToProcess = pcmBuffer.slice(0, WINDOW_SIZE);
                pcmBuffer = pcmBuffer.slice(STEP_SIZE);
                // Ultra-sensitive threshold to capture soft and whispered speech
                const hadVoice = windowMaxRms > 0.0004;
                windowMaxRms = 0;

                if (hadVoice) {
                    audioQueue.push(new Float32Array(samplesToProcess));
                    processQueue();
                }
            }
        };

        // 3. Listen to native Rust System Audio Loopback (System Sounds, Zoom, Google Meet, YouTube)
        let unlistenSys: (() => void) | undefined;

        listen<{ data: number[]; rate: number }>('audio_stream_sys', (event) => {
            if (event.payload?.data) {
                pushSamples(event.payload.data, event.payload.rate || 48000);
            }
        }).then(u => { unlistenSys = u; });

        // 4. Capture Microphone via WebAudio API directly in WebView
        let mediaStream: MediaStream | null = null;
        let processor: ScriptProcessorNode | null = null;
        let audioCtx: AudioContext | null = null;

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    channelCount: 1,
                }
            }).then((stream) => {
                mediaStream = stream;
                try {
                    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                    audioCtx = new AudioContextClass();
                    audioCtxRef.current = audioCtx;
                    if (audioCtx.state === 'suspended') {
                        audioCtx.resume();
                    }

                    const actualSampleRate = audioCtx.sampleRate || 48000;
                    const micSource = audioCtx.createMediaStreamSource(stream);
                    processor = audioCtx.createScriptProcessor(4096, 1, 1);
                    processor.onaudioprocess = (e) => {
                        const inputData = e.inputBuffer.getChannelData(0);
                        const rate = e.inputBuffer.sampleRate || actualSampleRate;
                        pushSamples(inputData, rate);
                    };

                    // Route through 0-gain to avoid speaker feedback loop
                    const muteGain = audioCtx.createGain();
                    muteGain.gain.value = 0;
                    micSource.connect(processor);
                    processor.connect(muteGain);
                    muteGain.connect(audioCtx.destination);
                } catch (err) {
                    console.warn("WebAudio context init notice:", err);
                }
            }).catch(err => {
                console.warn("Microphone access notice:", err);
            });
        }

        return () => {
            TauriClient.stopNativeRecording().catch(() => {});
            if (unlistenSys) unlistenSys();
            if (mediaStream) {
                mediaStream.getTracks().forEach(t => t.stop());
            }
            if (processor) {
                processor.disconnect();
            }
            if (audioCtx && audioCtx.state !== 'closed') {
                audioCtx.close().catch(() => {});
            }
        };
    }, [isOpen, selectedLanguage]);

    const handleCopyAll = () => {
        navigator.clipboard.writeText(fullText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleGenerateNotes = () => {
        onProcess(fullText);
        onClose();
    };

    const handlePolish = async () => {
        if (!fullText || isPolishing) return;
        setIsPolishing(true);
        try {
            const result = await TauriClient.sendGlobalMemoryChat(
                `Fix any speech-to-text transcription errors in this transcript while preserving all content and meaning verbatim:\n\n${fullText}`
            );
            if (result) setFullText(result.trim());
        } catch (_) {} finally {
            setIsPolishing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
            {/* Minimized pill */}
            <AnimatePresence>
                {isMinimized && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        onClick={() => setIsMinimized(false)}
                        className="bg-[#111113]/95 border border-white/10 rounded-full px-4 py-2 flex items-center gap-3 shadow-2xl backdrop-blur-xl cursor-pointer hover:border-white/20 transition-all group"
                    >
                        <span className={cn("w-2 h-2 rounded-full shrink-0", isStreaming ? "bg-emerald-400 animate-pulse" : "bg-zinc-500")} />
                        <span className="text-xs font-semibold text-zinc-200">Live Transcript</span>
                        <span className="text-xs text-zinc-500 font-mono">{formatTime(recordingTime)}</span>
                        <ChevronUp size={13} className="text-zinc-400 group-hover:text-white transition-colors" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Expanded panel */}
            <AnimatePresence>
                {!isMinimized && (
                    <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.97 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="w-[540px] max-w-[92vw] bg-[#111113] border border-white/[0.08] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-white/[0.07] flex items-center justify-between bg-[#141416]">
                            <div className="flex items-center gap-2.5">
                                <span className={cn("w-2 h-2 rounded-full shrink-0", isStreaming ? "bg-emerald-400 animate-pulse" : "bg-zinc-500")} />
                                <span className="text-[13px] font-semibold text-zinc-100">
                                    {isStreaming ? 'Live Transcript' : 'Paused'}
                                </span>

                                {/* Equalizer waveform */}
                                <div className="flex items-center gap-[3px] h-4 ml-1">
                                    {[0.2, 0.5, 0.35, 0.65, 0.45, 0.3, 0.55].map((factor, i) => (
                                        <span
                                            key={i}
                                            className={cn("w-[3px] rounded-full transition-all duration-75", isStreaming && audioLevel > 3 ? "bg-emerald-400" : "bg-zinc-700")}
                                            style={{ height: isStreaming && audioLevel > 3 ? `${Math.max(3, Math.min(14, audioLevel * factor * 0.2 + 3))}px` : '3px' }}
                                        />
                                    ))}
                                </div>

                                <span className="text-[11px] text-zinc-500 font-mono tabular-nums">{formatTime(recordingTime)}</span>

                                <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                    <Volume2 size={10} />
                                    Mic + System
                                </span>
                            </div>

                            <div className="flex items-center gap-1">
                                <button 
                                    type="button" 
                                    onClick={handleCopyAll} 
                                    disabled={!fullText}
                                    className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors cursor-pointer disabled:opacity-30"
                                    title="Copy transcript"
                                >
                                    {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setIsMinimized(true)}
                                    className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
                                    title="Minimize"
                                >
                                    <Minus size={13} />
                                </button>
                                <button 
                                    type="button" 
                                    onClick={onClose}
                                    className="p-1.5 rounded-md text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                    title="Close"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Quota Warning Alert */}
                        {quotaWarning && (
                            <div className="mx-4 my-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <AlertCircle size={14} className="shrink-0 text-amber-400" />
                                    <span>{quotaWarning}</span>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => setQuotaWarning(null)} 
                                    className="text-zinc-400 hover:text-white p-1 cursor-pointer"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        )}

                        {/* Transcript body — single flowing paragraph */}
                        <div
                            ref={scrollRef}
                            className="px-6 py-5 max-h-[46vh] min-h-[220px] overflow-y-auto bg-[var(--surface-raised)] dark:bg-[#0D0D0F] scroll-smooth select-text ai-selectable"
                        >
                            {!fullText ? (
                                <div className="flex flex-col items-center justify-center min-h-[170px] gap-3 text-center select-none">
                                    <div className="w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center">
                                        <Mic size={15} className="text-zinc-500" />
                                    </div>
                                    <div>
                                        <p className="text-[13px] font-medium text-zinc-400 mb-1">
                                            {isStreaming ? 'Listening to audio...' : 'Paused'}
                                        </p>
                                        <p className="text-[11px] text-zinc-600 max-w-[240px] leading-relaxed">
                                            Microphone and system audio will flow here in continuous paragraph format.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-[14.5px] leading-[1.85] text-zinc-100 font-normal select-text tracking-[-0.01em]">
                                    {fullText}
                                    <span className="inline-block w-[2px] h-[15px] ml-[3px] bg-emerald-400 animate-pulse align-middle rounded-sm" />
                                </p>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06] bg-[#141416]">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => onStreamingChange(!isStreaming)}
                                    className={cn(
                                        "text-xs font-semibold px-3 py-1.5 rounded-full transition-all cursor-pointer",
                                        isStreaming
                                            ? "bg-white/[0.06] text-zinc-300 hover:bg-white/[0.1]"
                                            : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                    )}
                                >
                                    {isStreaming ? '⏸ Pause' : '▶ Resume'}
                                </button>

                                <select
                                    value={selectedLanguage}
                                    onChange={e => setSelectedLanguage(e.target.value)}
                                    className="text-[11px] text-zinc-400 bg-transparent border-none outline-none cursor-pointer hover:text-zinc-200 transition-colors"
                                >
                                    {MULTILINGUAL_CATALOG.map(l => (
                                        <option key={l.code} value={l.code} className="bg-[#1a1a1c] text-zinc-200">
                                            {l.flag} {l.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                {fullText && (
                                    <button 
                                        type="button" 
                                        onClick={handlePolish} 
                                        disabled={isPolishing}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.09] text-zinc-300 text-xs font-medium transition-all cursor-pointer disabled:opacity-40 border border-white/[0.07]"
                                    >
                                        <Wand2 size={11} className={cn("text-amber-400", isPolishing && "animate-spin")} />
                                        {isPolishing ? 'Fixing...' : 'AI Polish'}
                                    </button>
                                )}
                                <button 
                                    type="button" 
                                    onClick={handleGenerateNotes} 
                                    disabled={!fullText}
                                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-white hover:bg-zinc-100 text-zinc-900 text-xs font-semibold transition-all cursor-pointer shadow-sm disabled:opacity-40"
                                >
                                    <Sparkles size={11} className="text-amber-600" />
                                    Done & Generate Notes
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
