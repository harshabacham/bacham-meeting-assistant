import { useState, useEffect, useRef } from 'react';
import { 
    Search, Copy, Minus, Sparkles, ChevronDown, 
    ChevronUp, Check, X, Wand2, Volume2, Plus, Mic, User, AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { TauriClient } from '@/infrastructure/tauri-client';
import { emit } from '@tauri-apps/api/event';
import { cn } from '@/components';
import { encodeWavBase64 } from '@/utils/wavEncoder';

export interface TranscriptChunk {
    id: string;
    text: string;
    speaker?: 'speaker' | 'me';
    timestamp?: string;
    timeMs?: number;
    language?: string;
    isTranslated?: boolean;
}

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
    
    // Indic Languages
    { code: 'hindi', label: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳', bcp: 'hi-IN', category: 'indic' },
    { code: 'telugu', label: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳', bcp: 'te-IN', category: 'indic' },
    { code: 'tamil', label: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳', bcp: 'ta-IN', category: 'indic' },
    { code: 'kannada', label: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳', bcp: 'kn-IN', category: 'indic' },
    { code: 'malayalam', label: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳', bcp: 'ml-IN', category: 'indic' },
    { code: 'marathi', label: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳', bcp: 'mr-IN', category: 'indic' },
    { code: 'bengali', label: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳', bcp: 'bn-IN', category: 'indic' },
    { code: 'gujarati', label: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳', bcp: 'gu-IN', category: 'indic' },
    { code: 'punjabi', label: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳', bcp: 'pa-IN', category: 'indic' },

    // European Languages
    { code: 'spanish', label: 'Spanish', nativeName: 'Español', flag: '🇪🇸', bcp: 'es-ES', category: 'european' },
    { code: 'french', label: 'French', nativeName: 'Français', flag: '🇫🇷', bcp: 'fr-FR', category: 'european' },
    { code: 'german', label: 'German', nativeName: 'Deutsch', flag: '🇩🇪', bcp: 'de-DE', category: 'european' },
    { code: 'portuguese', label: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', bcp: 'pt-PT', category: 'european' },
    { code: 'italian', label: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', bcp: 'it-IT', category: 'european' },
    { code: 'russian', label: 'Russian', nativeName: 'Русский', flag: '🇷🇺', bcp: 'ru-RU', category: 'european' },

    // Asian & Middle Eastern
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
}

export function LiveTranscriptPanel({ isOpen, onClose, onProcess, onInsertQuote }: LiveTranscriptPanelProps) {
    const [chunks, setChunks] = useState<TranscriptChunk[]>([]);
    const [interimText, setInterimText] = useState<string>('');
    const [isStreaming, setIsStreaming] = useState(true);
    const [isMinimized, setIsMinimized] = useState(false);
    
    // Multilingual State
    const [selectedLanguage, setSelectedLanguage] = useState<string>('auto');
    const [detectedLanguage, setDetectedLanguage] = useState<{ label: string; flag: string } | null>(null);
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const [langSearch, setLangSearch] = useState('');
    const [transcriptSearch, setTranscriptSearch] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [copiedChunkId, setCopiedChunkId] = useState<string | null>(null);

    const [copied, setCopied] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isPolishing, setIsPolishing] = useState(false);
    const [isSystemAudioActive, setIsSystemAudioActive] = useState(false);
    const [audioLevel, setAudioLevel] = useState<number>(0);
    const [quotaWarning, setQuotaWarning] = useState<string | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const workerRef = useRef<Worker | null>(null);
    const speechRecRef = useRef<any>(null);
    const streamingRef = useRef<boolean>(true);
    const useWebSpeechRef = useRef<boolean>(false);
    const pendingLangRestartRef = useRef<string | null>(null);
    const systemStreamRef = useRef<MediaStream | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const mixedDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);

    const activeLanguage = MULTILINGUAL_CATALOG.find(l => l.code === selectedLanguage) || MULTILINGUAL_CATALOG[0];

    useEffect(() => {
        streamingRef.current = isStreaming;
    }, [isStreaming]);

    // Live Recording Duration Timer
    useEffect(() => {
        if (!isOpen || !isStreaming) return;
        const interval = setInterval(() => {
            setRecordingTime(t => t + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [isOpen, isStreaming]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Initialize Web Speech Engine and PCM Audio Pipeline
    useEffect(() => {
        if (!isOpen) {
            setChunks([]);
            setRecordingTime(0);
            setInterimText('');
            setDetectedLanguage(null);
            setIsSystemAudioActive(false);
            if (systemStreamRef.current) {
                systemStreamRef.current.getTracks().forEach(t => t.stop());
                systemStreamRef.current = null;
            }
            TauriClient.stopNativeRecording().catch(console.error);
            if (speechRecRef.current) {
                try { speechRecRef.current.stop(); } catch (_) {}
                speechRecRef.current = null;
            }
            if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
            }
            return;
        }

        // 1. Start Rust Native Audio Stream
        TauriClient.startNativeRecording().catch(console.error);

        // 2. Continuous Web Speech Neural Recognition (0ms Latency, Zero Quota Limit)
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        const startRecognition = (langCode: string) => {
            if (!SpeechRecognition || !streamingRef.current) return;
            try {
                if (speechRecRef.current) {
                    try { speechRecRef.current.abort(); } catch (_) {}
                    speechRecRef.current = null;
                }

                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.maxAlternatives = 1;
                
                const langEntry = MULTILINGUAL_CATALOG.find(l => l.code === langCode);
                recognition.lang = langEntry?.bcp || 'en-US';

                recognition.onresult = (event: any) => {
                    if (!streamingRef.current) return;
                    let currentInterim = '';
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const transcript = event.results[i][0].transcript;
                        if (event.results[i].isFinal) {
                            const trimmed = transcript.trim();
                            if (trimmed) {
                                setChunks(prev => {
                                    if (prev.length > 0 && prev[prev.length - 1].text.toLowerCase() === trimmed.toLowerCase()) {
                                        return prev;
                                    }
                                    return [...prev, {
                                        id: Date.now().toString() + Math.random(),
                                        speaker: 'speaker',
                                        text: trimmed,
                                        timeMs: Date.now(),
                                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                                    }];
                                });
                                emit('live_caption_received', {
                                    sessionId: 'live-session',
                                    text: trimmed,
                                    timestamp: Date.now(),
                                    platform: 'desktop'
                                }).catch(() => {});
                                setInterimText('');
                            }
                        } else {
                            currentInterim += transcript;
                        }
                    }
                    if (currentInterim) {
                        setInterimText(currentInterim);
                    }
                };

                recognition.onerror = (e: any) => {
                    if (e.error !== 'no-speech' && e.error !== 'aborted') {
                        console.warn("Speech recognition notice:", e.error);
                    }
                };

                recognition.onend = () => {
                    if (!streamingRef.current) return;
                    if (pendingLangRestartRef.current) {
                        const nextLang = pendingLangRestartRef.current;
                        pendingLangRestartRef.current = null;
                        setTimeout(() => startRecognition(nextLang), 100);
                        return;
                    }
                    setTimeout(() => {
                        if (streamingRef.current) {
                            try {
                                recognition.start();
                            } catch (_) {
                                setTimeout(() => startRecognition(selectedLanguage), 250);
                            }
                        }
                    }, 100);
                };

                recognition.start();
                speechRecRef.current = recognition;
            } catch (err) {
                console.warn("Speech recognition init notice:", err);
            }
        };

        if (SpeechRecognition) {
            useWebSpeechRef.current = true;
            startRecognition(selectedLanguage);
        }

        // 3. Unified 16kHz PCM WAV Streaming Pipeline (System Audio + Microphone)
        let pcmBuffer: number[] = [];
        let windowMaxRms = 0;
        let isTranscribingChunk = false;
        let currentSpeaker: 'me' | 'speaker' = 'me';

        const pushSamples = async (data: number[] | Float32Array, fromRate: number, speaker: 'me' | 'speaker') => {
            if (!streamingRef.current) return;
            currentSpeaker = speaker;
            const ratio = fromRate > 0 ? fromRate / 16000 : 1;
            let sum = 0;

            if (ratio === 1) {
                for (let i = 0; i < data.length; i++) {
                    const val = data[i];
                    sum += val * val;
                    pcmBuffer.push(val);
                }
            } else {
                for (let i = 0; i < data.length; i += ratio) {
                    const val = data[Math.floor(i)];
                    sum += val * val;
                    pcmBuffer.push(val);
                }
            }

            const rmsVal = Math.sqrt(sum / (data.length || 1));
            if (rmsVal > windowMaxRms) windowMaxRms = rmsVal;
            setAudioLevel(Math.min(100, Math.round(rmsVal * 600)));

            // 1.5s balanced streaming window (24,000 samples at 16kHz)
            if (pcmBuffer.length >= 24000) {
                const samplesToProcess = pcmBuffer.slice(0, 24000);
                pcmBuffer = pcmBuffer.slice(20800); // 200ms overlap
                const hadVoice = windowMaxRms > 0.006;
                windowMaxRms = 0;

                if (hadVoice && !isTranscribingChunk) {
                    isTranscribingChunk = true;
                    try {
                        const floatArr = new Float32Array(samplesToProcess);
                        const wavBase64 = encodeWavBase64(floatArr, 16000);
                        const res = await TauriClient.transcribeLiveAudioChunk(wavBase64, 'audio/wav', selectedLanguage);
                        if (res && res.text && res.text.trim()) {
                            const trimmed = res.text.trim();
                            // Filter out known model hallucinations and timestamp artifacts
                            if (
                                trimmed !== '00:00' && 
                                trimmed !== '0:00' && 
                                trimmed !== '00:01' && 
                                trimmed !== '00:02' && 
                                trimmed !== 'one' && 
                                trimmed.toLowerCase() !== 'subtitles by'
                            ) {
                                if (res.language && res.language !== 'Auto') {
                                    setDetectedLanguage({ label: res.language, flag: res.flag || '🌐' });
                                }
                                setChunks(prev => {
                                    if (prev.length > 0 && prev[prev.length - 1].text.toLowerCase() === trimmed.toLowerCase()) {
                                        return prev;
                                    }
                                    return [...prev, {
                                        id: Date.now().toString() + Math.random(),
                                        speaker: currentSpeaker,
                                        text: trimmed,
                                        language: res.language,
                                        timeMs: Date.now(),
                                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                                    }];
                                });
                                emit('live_caption_received', {
                                    sessionId: 'live-session',
                                    text: trimmed,
                                    timestamp: Date.now(),
                                    platform: 'desktop'
                                }).catch(() => {});
                                setInterimText('');
                            }
                        }
                    } catch (apiErr: any) {
                        const errStr = String(apiErr);
                        if (errStr.includes('429') || errStr.includes('quota') || errStr.includes('RESOURCE_EXHAUSTED')) {
                            setQuotaWarning('Gemini API free quota exceeded. Set up a free Groq key in Settings for 2000 free transcriptions/day.');
                        }
                        console.warn("Live transcription error:", apiErr);
                    } finally {
                        isTranscribingChunk = false;
                    }
                }
            }
        };

        // Listen to native Rust WASAPI System Audio Loopback
        let unlistenSys: (() => void) | undefined;

        import('@tauri-apps/api/event').then(({ listen }) => {
            listen<{ data: number[]; rate: number }>('audio_stream_sys', (event) => {
                if (event.payload?.data) {
                    pushSamples(event.payload.data, event.payload.rate || 16000, 'speaker');
                }
            }).then(u => { unlistenSys = u; });
        });

        // Capture microphone audio via WebAudio API
        let audioCtx: AudioContext | null = null;
        let mediaStream: MediaStream | null = null;
        let processor: ScriptProcessorNode | null = null;

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ 
                audio: { 
                    echoCancellation: true, 
                    noiseSuppression: true, 
                    autoGainControl: true,
                    channelCount: 1 
                } 
            }).then((stream) => {
                mediaStream = stream;
                try {
                    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                    audioCtx = new AudioContextClass({ sampleRate: 16000 });
                    audioCtxRef.current = audioCtx;
                    if (audioCtx.state === 'suspended') {
                        audioCtx.resume();
                    }

                    const micSource = audioCtx.createMediaStreamSource(stream);
                    processor = audioCtx.createScriptProcessor(4096, 1, 1);
                    processor.onaudioprocess = (e) => {
                        const inputData = e.inputBuffer.getChannelData(0);
                        pushSamples(inputData, 16000, 'me');
                    };

                    micSource.connect(processor);
                    processor.connect(audioCtx.destination);
                } catch (err) {
                    console.warn("WebAudio context init notice:", err);
                }
            }).catch((err) => {
                console.warn("Microphone access notice:", err);
            });
        }

        return () => {
            TauriClient.stopNativeRecording().catch(console.error);
            if (unlistenSys) unlistenSys();
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop());
            }
            if (processor) {
                try { processor.disconnect(); } catch (_) {}
            }
            if (audioCtx) {
                try { audioCtx.close(); } catch (_) {}
            }
        };
    }, [isOpen]);

    const handleLanguageChange = (langCode: string) => {
        setSelectedLanguage(langCode);
        setIsLangMenuOpen(false);
        if (speechRecRef.current) {
            pendingLangRestartRef.current = langCode;
            try { speechRecRef.current.stop(); } catch (_) {}
        }
    };

    const toggleStreaming = () => {
        setIsStreaming(!isStreaming);
    };

    const handleCopyAll = () => {
        const fullText = chunks.map(c => `${c.speaker === 'me' ? 'You' : 'Speaker'}: ${c.text}`).join('\n');
        navigator.clipboard.writeText(fullText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleGenerateNotes = () => {
        const fullTranscript = chunks.map(c => c.text).join(' ');
        onProcess(fullTranscript);
        onClose();
    };

    const handlePolishTranscript = async () => {
        if (chunks.length === 0 || isPolishing) return;
        setIsPolishing(true);
        try {
            const raw = chunks.map(c => c.text).join(' ');
            const polished = await TauriClient.sendGlobalMemoryChat(`Clean up and format this live transcript while preserving meaning:\n\n${raw}`);
            if (polished) {
                setChunks([{
                    id: Date.now().toString(),
                    speaker: 'speaker',
                    text: polished,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                }]);
            }
        } catch (e) {
            console.error("Failed to polish:", e);
        } finally {
            setIsPolishing(false);
        }
    };

    const filteredLanguages = MULTILINGUAL_CATALOG.filter(l => 
        l.label.toLowerCase().includes(langSearch.toLowerCase()) || 
        l.nativeName.toLowerCase().includes(langSearch.toLowerCase())
    );

    const visibleChunks = chunks.filter(c => 
        !transcriptSearch.trim() || c.text.toLowerCase().includes(transcriptSearch.toLowerCase())
    );

    // Auto-scroll transcript container
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chunks, interimText]);

    if (!isOpen) return null;

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. MINIMIZED GRANOLA FLOATING WAVEFORM PILL
    // ═══════════════════════════════════════════════════════════════════════════
    if (isMinimized) {
        return (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    whileHover={{ y: -1 }}
                    className="flex items-center gap-3 px-4 py-2 rounded-full bg-[#121214]/95 backdrop-blur-xl border border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.35)]"
                >
                    {/* Live Dancing Waveform */}
                    <div className="flex items-center gap-0.5 h-3.5">
                        <span className={cn("w-1 rounded-full transition-all duration-75", isStreaming ? "bg-emerald-400" : "bg-zinc-600")} style={{ height: isStreaming ? `${Math.max(4, Math.min(14, audioLevel * 0.2 + 4))}px` : '4px' }} />
                        <span className={cn("w-1 rounded-full transition-all duration-75", isStreaming ? "bg-emerald-400" : "bg-zinc-600")} style={{ height: isStreaming ? `${Math.max(6, Math.min(14, audioLevel * 0.35 + 6))}px` : '6px' }} />
                        <span className={cn("w-1 rounded-full transition-all duration-75", isStreaming ? "bg-emerald-400" : "bg-zinc-600")} style={{ height: isStreaming ? `${Math.max(4, Math.min(14, audioLevel * 0.22 + 4))}px` : '4px' }} />
                    </div>

                    <span className="text-xs font-mono text-zinc-300 font-medium tabular-nums">
                        {formatTime(recordingTime)}
                    </span>

                    <div className="h-3 w-px bg-white/10" />

                    <button 
                        type="button"
                        onClick={() => setIsMinimized(false)}
                        className="flex items-center gap-1 text-xs font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    >
                        <span>Transcript</span>
                        <ChevronUp size={13} className="text-zinc-400" />
                    </button>

                    <div className="h-3 w-px bg-white/10" />

                    <button
                        type="button"
                        onClick={handleGenerateNotes}
                        className="flex items-center gap-1 px-3 py-1 rounded-full bg-white hover:bg-zinc-200 text-zinc-900 text-xs font-semibold shadow-xs transition-all cursor-pointer"
                    >
                        <Sparkles size={11} className="text-amber-600" />
                        <span>Enhance</span>
                    </button>
                </motion.div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. EXPANDED GRANOLA CONVERSATIONAL TRANSCRIPT PANEL
    // ═══════════════════════════════════════════════════════════════════════════
    return (
        <div className="fixed inset-x-0 bottom-6 flex flex-col items-center justify-center z-50 pointer-events-none px-4">
            <motion.div 
                initial={{ opacity: 0, y: 25, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ type: 'spring', damping: 30, stiffness: 380 }}
                className="w-full max-w-xl bg-[#111113]/95 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col pointer-events-auto font-sans"
            >
                {/* Clean Granola Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#161619]/40 shrink-0">
                    {/* Left: Status & Language */}
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-1.5">
                            <span className={cn("w-2 h-2 rounded-full", isStreaming ? "bg-emerald-400 animate-pulse" : "bg-zinc-500")} />
                            <span className="text-xs font-semibold text-zinc-200">
                                {isStreaming ? 'Live Transcription' : 'Paused'}
                            </span>
                        </div>

                        {/* Automatic Mic + System Active Badge */}
                        <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shadow-2xs">
                            <Volume2 size={11} className="text-emerald-400" />
                            <span>Mic + System</span>
                        </span>

                    </div>

                    {/* Right: Controls */}
                    <div className="flex items-center gap-1.5 text-zinc-400">

                        {/* Search Toggle */}
                        <button 
                            type="button" 
                            onClick={() => setIsSearchOpen(!isSearchOpen)} 
                            className={cn("p-1.5 rounded-md transition-colors cursor-pointer", isSearchOpen ? "text-white bg-white/10" : "hover:text-white hover:bg-white/[0.04]")}
                            title="Search in transcript"
                        >
                            <Search size={13} />
                        </button>

                        {/* Copy All */}
                        <button 
                            type="button" 
                            onClick={handleCopyAll} 
                            className="p-1.5 hover:text-white hover:bg-white/[0.04] rounded-md transition-colors cursor-pointer" 
                            title="Copy entire transcript"
                        >
                            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        </button>

                        {/* Minimize */}
                        <button 
                            type="button" 
                            onClick={() => setIsMinimized(true)} 
                            className="p-1.5 hover:text-white hover:bg-white/[0.04] rounded-md transition-colors cursor-pointer" 
                            title="Minimize to waveform"
                        >
                            <Minus size={13} />
                        </button>

                        {/* Close */}
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="p-1.5 hover:text-white hover:bg-white/[0.04] rounded-md transition-colors cursor-pointer" 
                            title="Close"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* In-Transcript Keyword Filter */}
                {isSearchOpen && (
                    <div className="px-4 py-2 border-b border-white/[0.06] bg-[#0E0E10] flex items-center gap-2">
                        <Search size={12} className="text-zinc-400 shrink-0" />
                        <input
                            type="text"
                            value={transcriptSearch}
                            onChange={e => setTranscriptSearch(e.target.value)}
                            placeholder="Filter keywords in real-time..."
                            className="w-full bg-transparent border-none outline-none text-xs text-zinc-200 placeholder:text-zinc-500"
                            autoFocus
                        />
                        {transcriptSearch && (
                            <button type="button" onClick={() => setTranscriptSearch('')} className="text-[11px] text-zinc-400 hover:text-white cursor-pointer">
                                Clear
                            </button>
                        )}
                    </div>
                )}

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

                {/* Conversational Speech Stream */}
                <div 
                    ref={scrollRef}
                    className="p-5 max-h-[42vh] min-h-[180px] overflow-y-auto space-y-4 bg-[#0E0E10]/80 font-sans scroll-smooth"
                >
                    {chunks.length === 0 && !interimText && (
                        <div className="flex flex-col items-center justify-center py-12 text-zinc-500 text-xs gap-2 text-center">
                            <div className="w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center text-zinc-400 mb-1">
                                <Mic size={15} />
                            </div>
                            <p className="font-medium text-zinc-300">
                                {isStreaming ? `Listening to audio in ${activeLanguage.label}...` : 'Recording paused.'}
                            </p>
                            <p className="text-[11px] text-zinc-500 max-w-xs leading-normal">
                                What you or attendees say will appear here in clean verbatim native script.
                            </p>
                        </div>
                    )}

                    {/* Timeline Paragraphs */}
                    {visibleChunks.map((chunk, idx) => {
                        const isMe = chunk.speaker === 'me';
                        return (
                            <div 
                                key={chunk.id} 
                                className="group relative flex flex-col gap-1.5 px-3 py-2 rounded-xl transition-colors hover:bg-white/[0.03]"
                            >
                                {/* Speaker & Metadata Row */}
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide",
                                            isMe 
                                                ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20" 
                                                : "bg-white/[0.06] text-zinc-300 border border-white/[0.08]"
                                        )}>
                                            {isMe ? <Mic size={10} /> : <User size={10} />}
                                            <span>{isMe ? 'You' : `Speaker ${Math.floor(idx / 2) + 1}`}</span>
                                        </span>
                                    </div>

                                    {/* Hover Actions: Copy & Insert */}
                                    <div className="flex items-center gap-2">
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(chunk.text);
                                                    setCopiedChunkId(chunk.id);
                                                    setTimeout(() => setCopiedChunkId(null), 1800);
                                                }}
                                                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                                                title="Copy quote"
                                            >
                                                {copiedChunkId === chunk.id ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                                                <span>{copiedChunkId === chunk.id ? 'Copied' : 'Copy'}</span>
                                            </button>

                                            {onInsertQuote && (
                                                <button
                                                    type="button"
                                                    onClick={() => onInsertQuote(chunk.text)}
                                                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-amber-400 hover:bg-amber-400/10 font-medium transition-colors cursor-pointer"
                                                    title="Insert quote directly into notes"
                                                >
                                                    <Plus size={11} />
                                                    <span>Insert to Note</span>
                                                </button>
                                            )}
                                        </div>

                                        <span className="text-[11px] text-zinc-500 font-mono tabular-nums">
                                            {chunk.timestamp || formatTime(recordingTime)}
                                        </span>
                                    </div>
                                </div>

                                {/* Verbatim Speech Content */}
                                <div className="text-[13.5px] leading-relaxed text-zinc-100 pl-1 font-normal select-text">
                                    {chunk.text}
                                </div>
                            </div>
                        );
                    })}

                    {/* Active Live Real-Time Speech Stream (0ms latency) */}
                    {interimText && (
                        <div className="flex flex-col gap-1.5 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                            <div className="flex items-center gap-2 text-xs">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                                    <Mic size={10} className="animate-pulse" />
                                    <span>{isSystemAudioActive ? 'Speaker' : 'You'}</span>
                                </span>
                                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                    Live
                                </span>
                            </div>
                            <div className="text-[13.5px] leading-relaxed text-zinc-200 pl-1 font-normal select-text">
                                {interimText}
                                <span className="inline-block w-1.5 h-3.5 ml-1 bg-emerald-400 animate-pulse align-middle" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Minimalist Bottom Control Strip */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06] bg-[#161619]/60 shrink-0">
                    {/* Left: Waveform & Pause/Resume */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-0.5 h-4 px-0.5">
                            <span className={cn("w-1 rounded-full transition-all duration-75", isStreaming ? "bg-emerald-400" : "bg-zinc-600")} style={{ height: isStreaming ? `${Math.max(4, Math.min(16, audioLevel * 0.2 + 4))}px` : '4px' }} />
                            <span className={cn("w-1 rounded-full transition-all duration-75", isStreaming ? "bg-emerald-400" : "bg-zinc-600")} style={{ height: isStreaming ? `${Math.max(6, Math.min(16, audioLevel * 0.35 + 6))}px` : '6px' }} />
                            <span className={cn("w-1 rounded-full transition-all duration-75", isStreaming ? "bg-emerald-400" : "bg-zinc-600")} style={{ height: isStreaming ? `${Math.max(4, Math.min(16, audioLevel * 0.22 + 4))}px` : '4px' }} />
                        </div>
                        
                        <button 
                            type="button"
                            onClick={toggleStreaming}
                            className="text-zinc-300 hover:text-white transition-colors text-xs font-medium cursor-pointer"
                        >
                            {isStreaming ? 'Pause' : 'Resume'}
                        </button>
                    </div>

                    {/* Center: Live Monospace Timer */}
                    <span className="text-xs font-mono text-zinc-400 font-medium tabular-nums tracking-wider">
                        {formatTime(recordingTime)}
                    </span>

                    {/* Right: Polish & Done Buttons */}
                    <div className="flex items-center gap-2">
                        {chunks.length > 0 && (
                            <button
                                type="button"
                                onClick={handlePolishTranscript}
                                disabled={isPolishing}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 text-xs font-medium transition-all cursor-pointer disabled:opacity-50 border border-white/[0.08]"
                                title="Clean up transcription errors with AI"
                            >
                                <Wand2 size={12} className={isPolishing ? "animate-spin text-amber-400" : "text-amber-400"} />
                                <span>{isPolishing ? "Polishing..." : "AI Polish"}</span>
                            </button>
                        )}

                        <button 
                            type="button"
                            onClick={handleGenerateNotes}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-900 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                        >
                            <Sparkles size={12} className="text-amber-600" />
                            <span>Done & Generate Notes</span>
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
