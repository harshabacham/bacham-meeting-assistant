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

        // 3. Intelligent Silence-Based Voice Activity Detection (VAD) Phrase Segmenter
        let activePhraseSamples: number[] = [];
        let consecutiveSilenceSamples = 0;
        let isSpeakingDetected = false;
        let isProcessingQueue = false;
        const audioQueue: { samples: Float32Array; speaker: 'me' | 'speaker' }[] = [];

        const SAMPLE_RATE = 16000;
        const SILENCE_THRESHOLD_RMS = 0.003; // Sensitive voice detection
        const SILENCE_HOLD_SAMPLES = SAMPLE_RATE * 0.40; // 400ms pause closes phrase
        const MIN_PHRASE_LENGTH = SAMPLE_RATE * 0.70; // 700ms minimum speech
        const MAX_PHRASE_LENGTH = SAMPLE_RATE * 6.0;  // 6.0s maximum speech phrase

        const processQueue = async () => {
            if (isProcessingQueue || audioQueue.length === 0 || !streamingRef.current) return;
            isProcessingQueue = true;

            while (audioQueue.length > 0 && streamingRef.current) {
                const item = audioQueue.shift();
                if (!item) continue;

                try {
                    const wavBase64 = encodeWavBase64(item.samples, 16000);
                    const res = await TauriClient.transcribeLiveAudioChunk(wavBase64, 'audio/wav', selectedLanguage);
                    if (res && res.text && res.text.trim()) {
                        const rawText = res.text.trim();
                        // Filter out hallucinations
                        if (
                            rawText !== '00:00' && 
                            rawText !== '0:00' && 
                            rawText !== '00:01' && 
                            rawText !== '00:02' && 
                            rawText !== 'one' && 
                            !rawText.toLowerCase().startsWith('subtitles')
                        ) {
                            setChunks(prev => {
                                const now = Date.now();
                                const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                if (prev.length > 0) {
                                    const last = prev[prev.length - 1];
                                    const timeSinceLastSpeech = now - (last.timeMs || 0);

                                    // If same speaker spoke within 8 seconds, seamlessly merge into current paragraph
                                    if (last.speaker === item.speaker && timeSinceLastSpeech < 8000) {
                                        const cleanLast = last.text.trim();
                                        const cleanNew = rawText.trim();
                                        
                                        // Avoid duplicate phrase
                                        if (cleanLast.toLowerCase().endsWith(cleanNew.toLowerCase())) {
                                            return prev;
                                        }

                                        const needsPeriod = !/[.!?]$/.test(cleanLast);
                                        const updatedParagraph = needsPeriod 
                                            ? `${cleanLast}. ${cleanNew.charAt(0).toUpperCase() + cleanNew.slice(1)}`
                                            : `${cleanLast} ${cleanNew.charAt(0).toUpperCase() + cleanNew.slice(1)}`;

                                        const updated = [...prev];
                                        updated[updated.length - 1] = {
                                            ...last,
                                            text: updatedParagraph,
                                            timeMs: now,
                                        };
                                        return updated;
                                    }
                                }

                                // New paragraph block
                                return [...prev, {
                                    id: Date.now().toString() + Math.random(),
                                    speaker: item.speaker,
                                    text: rawText.charAt(0).toUpperCase() + rawText.slice(1),
                                    timeMs: now,
                                    timestamp: timeStr,
                                }];
                            });

                            emit('live_caption_received', {
                                sessionId: 'live-session',
                                text: rawText,
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
                }
            }

            isProcessingQueue = false;
        };

        const pushSamples = async (data: number[] | Float32Array, fromRate: number, speaker: 'me' | 'speaker') => {
            if (!streamingRef.current) return;
            const ratio = fromRate > 0 ? fromRate / 16000 : 1;
            let sum = 0;
            const mono16k: number[] = [];

            if (ratio === 1) {
                for (let i = 0; i < data.length; i++) {
                    const val = data[i];
                    sum += val * val;
                    mono16k.push(val);
                }
            } else {
                for (let i = 0; i < data.length; i += ratio) {
                    const val = data[Math.floor(i)];
                    sum += val * val;
                    mono16k.push(val);
                }
            }

            const rms = Math.sqrt(sum / (data.length || 1));
            setAudioLevel(Math.min(100, Math.round(rms * 600)));

            const isVoice = rms > SILENCE_THRESHOLD_RMS;

            if (isVoice) {
                isSpeakingDetected = true;
                consecutiveSilenceSamples = 0;
                for (let i = 0; i < mono16k.length; i++) {
                    activePhraseSamples.push(mono16k[i]);
                }

                // If speech has been continuous for MAX_PHRASE_LENGTH (6s), flush full phrase
                if (activePhraseSamples.length >= MAX_PHRASE_LENGTH) {
                    const phraseToTranscribe = new Float32Array(activePhraseSamples);
                    activePhraseSamples = [];
                    audioQueue.push({ samples: phraseToTranscribe, speaker });
                    processQueue();
                }
            } else {
                if (isSpeakingDetected) {
                    consecutiveSilenceSamples += mono16k.length;
                    for (let i = 0; i < mono16k.length; i++) {
                        activePhraseSamples.push(mono16k[i]);
                    }

                    // Natural pause detected! Close the phrase
                    if (consecutiveSilenceSamples >= SILENCE_HOLD_SAMPLES) {
                        if (activePhraseSamples.length >= MIN_PHRASE_LENGTH) {
                            const phraseToTranscribe = new Float32Array(activePhraseSamples);
                            audioQueue.push({ samples: phraseToTranscribe, speaker });
                            processQueue();
                        }
                        activePhraseSamples = [];
                        consecutiveSilenceSamples = 0;
                        isSpeakingDetected = false;
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

                    const muteGain = audioCtx.createGain();
                    muteGain.gain.value = 0;
                    micSource.connect(processor);
                    processor.connect(muteGain);
                    muteGain.connect(audioCtx.destination);
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
                processor.disconnect();
            }
            if (audioCtx && audioCtx.state !== 'closed') {
                audioCtx.close().catch(() => {});
            }
            if (speechRecRef.current) {
                try { speechRecRef.current.abort(); } catch (_) {}
                speechRecRef.current = null;
            }
        };
    }, [selectedLanguage]);

    const handleCopyAll = () => {
        const fullText = chunks.map(c => `${c.speaker === 'me' ? 'You' : 'Speaker'} (${c.timestamp || ''}): ${c.text}`).join('\n\n');
        navigator.clipboard.writeText(fullText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleLanguageChange = (code: string) => {
        setSelectedLanguage(code);
        setIsLangMenuOpen(false);
        setLangSearch('');
        pendingLangRestartRef.current = code;
        if (speechRecRef.current) {
            try { speechRecRef.current.abort(); } catch (_) {}
        }
    };

    const handleToggleStreaming = () => setIsStreaming(!isStreaming);

    const handleGenerateNotes = () => {
        const fullTranscript = chunks.map(c => `${c.speaker === 'me' ? 'You' : 'Speaker'}: ${c.text}`).join('\n\n');
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

    const visibleChunks = transcriptSearch.trim() 
        ? chunks.filter(c => c.text.toLowerCase().includes(transcriptSearch.toLowerCase()))
        : chunks;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            <AnimatePresence>
                {isMinimized && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        onClick={() => setIsMinimized(false)}
                        className="bg-[#121214]/90 border border-white/10 rounded-full px-4 py-2 flex items-center gap-3 shadow-2xl backdrop-blur-xl cursor-pointer hover:border-white/20 transition-all group"
                    >
                        <div className="flex items-center gap-1.5">
                            <span className={cn("w-2 h-2 rounded-full", isStreaming ? "bg-emerald-400 animate-pulse" : "bg-zinc-500")} />
                            <span className="text-xs font-semibold text-zinc-200">Transcript</span>
                        </div>
                        <span className="text-xs text-zinc-400 font-mono tabular-nums">{formatTime(recordingTime)}</span>
                        <ChevronUp size={14} className="text-zinc-400 group-hover:text-white transition-colors" />
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {!isMinimized && isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 15 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="w-[520px] max-w-[92vw] bg-[#121214] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-2xl"
                    >
                        {/* Granola Minimalist Header */}
                        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between bg-[#141417]/80">
                            {/* Left: Status & Audio Badge */}
                            <div className="flex items-center gap-2.5">
                                <div className="flex items-center gap-1.5">
                                    <span className={cn("w-2 h-2 rounded-full", isStreaming ? "bg-emerald-400 animate-pulse" : "bg-zinc-500")} />
                                    <span className="text-xs font-semibold text-zinc-200">
                                        {isStreaming ? 'Live Transcript' : 'Paused'}
                                    </span>
                                </div>

                                <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shadow-2xs">
                                    <Volume2 size={11} className="text-emerald-400" />
                                    <span>Mic + System</span>
                                </span>
                            </div>

                            {/* Right: Controls */}
                            <div className="flex items-center gap-1.5 text-zinc-400">
                                <button
                                    type="button"
                                    onClick={() => setIsSearchOpen(!isSearchOpen)}
                                    className={cn(
                                        "p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors cursor-pointer",
                                        isSearchOpen && "bg-white/10 text-white"
                                    )}
                                    title="Search Transcript"
                                >
                                    <Search size={13} />
                                </button>

                                <button 
                                    type="button"
                                    onClick={handleCopyAll}
                                    className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
                                    title="Copy full transcript"
                                >
                                    {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                                </button>

                                <div className="h-3 w-px bg-white/[0.08] mx-0.5" />

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

                        {/* Granola Continuous Flowing Prose Document */}
                        <div 
                            ref={scrollRef}
                            className="p-5 max-h-[44vh] min-h-[200px] overflow-y-auto space-y-4 bg-[#0E0E10]/90 font-sans scroll-smooth"
                        >
                            {chunks.length === 0 && !interimText && (
                                <div className="flex flex-col items-center justify-center py-14 text-zinc-500 text-xs gap-2 text-center">
                                    <div className="w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center text-zinc-400 mb-1">
                                        <Mic size={15} />
                                    </div>
                                    <p className="font-medium text-zinc-300">
                                        {isStreaming ? 'Listening to conversation...' : 'Recording paused.'}
                                    </p>
                                    <p className="text-[11px] text-zinc-500 max-w-xs leading-normal">
                                        Spoken conversation will flow here in continuous paragraph format.
                                    </p>
                                </div>
                            )}

                            {/* Continuous Flowing Paragraphs */}
                            {visibleChunks.map((chunk) => {
                                const isMe = chunk.speaker === 'me';
                                return (
                                    <div 
                                        key={chunk.id} 
                                        className="group relative text-[14px] leading-relaxed text-zinc-200 transition-colors p-2 rounded-lg hover:bg-white/[0.02]"
                                    >
                                        <span className={cn(
                                            "font-semibold mr-2 select-none inline-flex items-center gap-1",
                                            isMe ? "text-indigo-400" : "text-zinc-300"
                                        )}>
                                            {isMe ? 'You' : 'Speaker'}
                                            <span className="text-[11px] font-normal text-zinc-500 font-mono">
                                                ({chunk.timestamp})
                                            </span>:
                                        </span>
                                        <span className="text-zinc-100 font-normal select-text">
                                            {chunk.text}
                                        </span>

                                        {/* Hover Actions Toolbar */}
                                        <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 inline-flex items-center gap-1.5 align-middle">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(chunk.text);
                                                    setCopiedChunkId(chunk.id);
                                                    setTimeout(() => setCopiedChunkId(null), 1800);
                                                }}
                                                className="text-[10px] text-zinc-400 hover:text-white px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-white/10 transition-colors cursor-pointer"
                                                title="Copy paragraph"
                                            >
                                                {copiedChunkId === chunk.id ? 'Copied' : 'Copy'}
                                            </button>
                                            {onInsertQuote && (
                                                <button
                                                    type="button"
                                                    onClick={() => onInsertQuote(chunk.text)}
                                                    className="text-[10px] text-amber-400 hover:text-amber-300 px-1.5 py-0.5 rounded bg-amber-400/10 hover:bg-amber-400/20 transition-colors cursor-pointer"
                                                    title="Insert into note"
                                                >
                                                    + Insert
                                                </button>
                                            )}
                                        </span>
                                    </div>
                                );
                            })}

                            {/* Live Interim Streaming Sentence */}
                            {interimText && (
                                <div className="text-[14px] leading-relaxed text-zinc-400 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                                    <span className="font-semibold text-indigo-400/80 mr-2 select-none">
                                        You:
                                    </span>
                                    <span className="text-zinc-200">{interimText}</span>
                                    <span className="inline-block w-1.5 h-3.5 ml-1 bg-emerald-400 animate-pulse align-middle" />
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
                            onClick={handleToggleStreaming}
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
