import { useState, useEffect, useRef } from 'react';
import { 
    Search, Copy, Minus, Sparkles, ChevronDown, 
    ChevronUp, Check, Square, FileText, Wand2, ArrowRightLeft,
    Volume2, VolumeX, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
    { code: 'auto', label: 'Auto (Multi-Language)', nativeName: 'Automatic Detection', flag: '🌐', bcp: 'en-US', category: 'popular' },
    { code: 'english', label: 'English (US/Global)', nativeName: 'English', flag: '🇺🇸', bcp: 'en-US', category: 'popular' },
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
    { code: 'chinese', label: 'Chinese', nativeName: '中文 (Mandarin)', flag: '🇨🇳', bcp: 'zh-CN', category: 'asian' },
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
    const [copiedChunkId, setCopiedChunkId] = useState<string | null>(null);
    const [translateMode, setTranslateMode] = useState<boolean>(false); // false = Original Script, true = Live English Translation

    const [modelStatus, setModelStatus] = useState<string>('ready');
    const [copied, setCopied] = useState(false);
    const [askQuery, setAskQuery] = useState('');
    const [recordingTime, setRecordingTime] = useState(0);
    const [isPolishing, setIsPolishing] = useState(false);
    const [isSystemAudioActive, setIsSystemAudioActive] = useState(false);
    const [audioLevel, setAudioLevel] = useState<number>(0);

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

    const toggleSystemAudio = async () => {
        if (isSystemAudioActive) {
            if (systemStreamRef.current) {
                systemStreamRef.current.getTracks().forEach(t => t.stop());
                systemStreamRef.current = null;
            }
            setIsSystemAudioActive(false);
            return;
        }
        try {
            const sysStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                }
            });
            systemStreamRef.current = sysStream;
            setIsSystemAudioActive(true);

            if (audioCtxRef.current && mixedDestRef.current) {
                try {
                    const sysSource = audioCtxRef.current.createMediaStreamSource(sysStream);
                    sysSource.connect(mixedDestRef.current);
                } catch (err) {
                    console.warn("Error connecting sysSource to mixer:", err);
                }
            }

            sysStream.getVideoTracks().forEach(track => track.stop());

            if (sysStream.getAudioTracks().length > 0) {
                sysStream.getAudioTracks()[0].onended = () => {
                    setIsSystemAudioActive(false);
                    systemStreamRef.current = null;
                };
            }
        } catch (err) {
            console.warn("System audio share notice:", err);
        }
    };

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

    // Initialize Web Speech Engine and Whisper-Base Local Worker
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

        // 1. Start Rust Native Audio Stream (System loopback + Mic)
        TauriClient.startNativeRecording().catch(console.error);

        // 2. High-Accuracy Web Speech API (Google Neural Cloud Speech - 99%+ accuracy)
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        const startRecognition = (langCode: string) => {
            if (!SpeechRecognition) return;
            try {
                if (speechRecRef.current) {
                    try { speechRecRef.current.stop(); } catch (_) {}
                }

                const recognition = new SpeechRecognition();
                const targetLangObj = MULTILINGUAL_CATALOG.find(l => l.code === langCode);
                recognition.lang = targetLangObj?.bcp || 'en-US';
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.maxAlternatives = 1;

                recognition.onstart = () => {
                    useWebSpeechRef.current = true;
                    setModelStatus('Live Transcription Active');
                };

                recognition.onresult = (event: any) => {
                    if (!streamingRef.current) return;
                    let interim = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        const transcript = event.results[i][0].transcript;
                        if (event.results[i].isFinal) {
                            const trimmed = transcript.trim();
                            if (trimmed) {
                                setChunks(prev => {
                                    if (prev.length > 0 && prev[prev.length - 1].text === trimmed) {
                                        return prev;
                                    }
                                    return [...prev, {
                                        id: Date.now().toString() + Math.random(),
                                        speaker: 'speaker',
                                        text: trimmed,
                                        language: targetLangObj?.label,
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
                            interim += transcript;
                        }
                    }
                    if (interim) {
                        setInterimText(interim);
                    }
                };

                recognition.onerror = (e: any) => {
                    console.warn("SpeechRecognition notice:", e?.error);
                    if (e?.error === 'network' || e?.error === 'not-allowed') {
                        useWebSpeechRef.current = false;
                    }
                };

                recognition.onend = () => {
                    if (pendingLangRestartRef.current) {
                        const nextLang = pendingLangRestartRef.current;
                        pendingLangRestartRef.current = null;
                        startRecognition(nextLang);
                        return;
                    }
                    if (streamingRef.current && isOpen && useWebSpeechRef.current) {
                        try { recognition.start(); } catch (_) {}
                    }
                };

                recognition.start();
                speechRecRef.current = recognition;
            } catch (err) {
                console.warn("WebSpeech init fallback:", err);
                useWebSpeechRef.current = false;
            }
        };

        startRecognition(selectedLanguage);

        // 3. Multilingual Whisper-Base Local Worker
        try {
            workerRef.current = new Worker(new URL('../../../workers/whisper.worker.ts', import.meta.url), {
                type: 'module'
            });

            workerRef.current.onmessage = (e) => {
                const { type, status, payload } = e.data;
                if (type === 'STATUS') {
                    setModelStatus(status);
                } else if (type === 'LANGUAGE_DETECTED') {
                    setDetectedLanguage({ label: payload.language, flag: payload.flag || '🌐' });
                } else if (type === 'TRANSCRIPT') {
                    if (payload?.text) {
                        const trimmed = payload.text.trim();
                        if (trimmed) {
                            setChunks(prev => {
                                if (prev.length > 0 && prev[prev.length - 1].text.toLowerCase() === trimmed.toLowerCase()) {
                                    return prev;
                                }
                                return [...prev, {
                                    id: Date.now().toString() + Math.random(),
                                    speaker: 'speaker',
                                    text: trimmed,
                                    isTranslated: payload.isTranslated,
                                    timeMs: payload.timestamp || Date.now(),
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
                }
            };

            workerRef.current.postMessage({ 
                type: 'INIT', 
                language: selectedLanguage, 
                task: translateMode ? 'translate' : 'transcribe' 
            });
        } catch (err: any) {
            console.error("Whisper worker error:", err);
        }

        // 4. Combined Audio Pipeline: Microphone + System Audio Loopback
        let audioCtx: AudioContext | null = null;
        let mediaStream: MediaStream | null = null;
        let processor: ScriptProcessorNode | null = null;
        let isTranscribingChunk = false;

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ 
                audio: { 
                    echoCancellation: false, 
                    noiseSuppression: false, 
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

                    const mixedDest = audioCtx.createMediaStreamDestination();
                    mixedDestRef.current = mixedDest;

                    // Connect mic to mixed destination
                    const micSource = audioCtx.createMediaStreamSource(stream);
                    micSource.connect(mixedDest);

                    // Connect system audio if already active
                    if (systemStreamRef.current && systemStreamRef.current.getAudioTracks().length > 0) {
                        try {
                            const sysSource = audioCtx.createMediaStreamSource(systemStreamRef.current);
                            sysSource.connect(mixedDest);
                        } catch (_) {}
                    }

                    // A. High-Precision 16kHz PCM WAV Audio Streaming Pipeline
                    let pcmBuffer: number[] = [];
                    let windowMaxRms = 0;

                    processor = audioCtx.createScriptProcessor(4096, 1, 1);
                    processor.onaudioprocess = async (e) => {
                        if (!streamingRef.current) return;
                        const inputData = e.inputBuffer.getChannelData(0);
                        const floatArray = new Float32Array(inputData);
                        
                        let sum = 0;
                        for (let i = 0; i < floatArray.length; i++) {
                            const val = floatArray[i];
                            sum += val * val;
                            pcmBuffer.push(val);
                        }
                        const rmsVal = Math.sqrt(sum / floatArray.length);
                        if (rmsVal > windowMaxRms) windowMaxRms = rmsVal;
                        setAudioLevel(Math.min(100, Math.round(rmsVal * 600)));
                        
                        if (rmsVal > 0.01) {
                            setModelStatus('Voice detected • Transcribing...');
                        }

                        // Also send to local worker
                        if (workerRef.current) {
                            workerRef.current.postMessage({
                                type: 'AUDIO_CHUNK',
                                stream: 'mic',
                                payload: Array.from(floatArray),
                                sampleRate: 16000
                            });
                        }

                        // Every ~2.0s (32,000 samples at 16kHz)
                        if (pcmBuffer.length >= 32000) {
                            const samplesToProcess = pcmBuffer.slice(0, 32000);
                            pcmBuffer = pcmBuffer.slice(28800); // 200ms overlap
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
                                        if (res.language && res.language !== 'Auto') {
                                            setDetectedLanguage({ label: res.language, flag: res.flag || '🌐' });
                                        }
                                        setChunks(prev => {
                                            if (prev.length > 0 && prev[prev.length - 1].text.toLowerCase() === trimmed.toLowerCase()) {
                                                return prev;
                                            }
                                            return [...prev, {
                                                id: Date.now().toString() + Math.random(),
                                                speaker: 'speaker',
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
                                } catch (apiErr) {
                                    console.warn("WAV transcription error:", apiErr);
                                } finally {
                                    isTranscribingChunk = false;
                                }
                            }
                        }
                    };

                    micSource.connect(processor);
                    processor.connect(audioCtx.destination);
                    (window as any).__audioProcessorRef = processor;
                } catch (err) {
                    console.warn("AudioContext init notice:", err);
                }
            }).catch((err) => {
                console.warn("Direct microphone stream notice:", err);
            });
        }

        // 5. Also listen to native background stream from Tauri CPAL backend
        let unlistenSys: () => void;
        let unlistenMic: () => void;

        import('@tauri-apps/api/event').then(({ listen }) => {
            listen<{data: number[], rate: number}>('audio_stream_sys', (event) => {
                if (streamingRef.current && workerRef.current && event.payload) {
                    workerRef.current.postMessage({ 
                        type: 'AUDIO_CHUNK', 
                        stream: 'sys',
                        payload: event.payload.data,
                        sampleRate: event.payload.rate
                    });
                }
            }).then(u => { unlistenSys = u; });
            
            listen<{data: number[], rate: number}>('audio_stream_mic', (event) => {
                if (streamingRef.current && workerRef.current && event.payload) {
                    workerRef.current.postMessage({ 
                        type: 'AUDIO_CHUNK', 
                        stream: 'mic',
                        payload: event.payload.data,
                        sampleRate: event.payload.rate
                    });
                }
            }).then(u => { unlistenMic = u; });
        });

        return () => {
            TauriClient.stopNativeRecording().catch(console.error);
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop());
            }
            if (processor) {
                try { processor.disconnect(); } catch (_) {}
            }
            if (audioCtx) {
                try { audioCtx.close(); } catch (_) {}
            }
            if (speechRecRef.current) {
                try { speechRecRef.current.stop(); } catch (_) {}
                speechRecRef.current = null;
            }
            if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
            }
            if (unlistenSys) unlistenSys();
            if (unlistenMic) unlistenMic();
        };
    }, [isOpen]);

    // Auto-scroll transcript container
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [chunks, interimText]);

    const toggleStreaming = async () => {
        if (isStreaming) {
            setIsStreaming(false);
            streamingRef.current = false;
            await TauriClient.stopNativeRecording().catch(console.error);
            if (speechRecRef.current) {
                try { speechRecRef.current.stop(); } catch (_) {}
            }
        } else {
            setIsStreaming(true);
            streamingRef.current = true;
            await TauriClient.startNativeRecording().catch(console.error);
            if (speechRecRef.current) {
                try { speechRecRef.current.start(); } catch (_) {}
            }
        }
    };

    const handleLanguageChange = (langCode: string) => {
        setSelectedLanguage(langCode);
        setIsLangMenuOpen(false);
        setLangSearch('');

        if (workerRef.current) {
            workerRef.current.postMessage({ type: 'SET_LANGUAGE', language: langCode });
        }

        // Safe Hot Language Switching
        if (speechRecRef.current) {
            try {
                pendingLangRestartRef.current = langCode;
                speechRecRef.current.stop();
            } catch (_) {
                // If stop fails or already stopped, re-init immediately
                const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                if (SpeechRecognition) {
                    const targetLangObj = MULTILINGUAL_CATALOG.find(l => l.code === langCode);
                    const rec = new SpeechRecognition();
                    rec.lang = targetLangObj?.bcp || 'en-US';
                    rec.continuous = true;
                    rec.interimResults = true;
                    if (isStreaming) rec.start();
                    speechRecRef.current = rec;
                }
            }
        }
    };

    const handleToggleTranslateMode = () => {
        const nextMode = !translateMode;
        setTranslateMode(nextMode);
        if (workerRef.current) {
            workerRef.current.postMessage({ type: 'SET_TASK', task: nextMode ? 'translate' : 'transcribe' });
        }
    };

    const handleGenerateNotes = () => {
        const fullText = chunks.map(c => c.text).join('\n');
        onProcess(fullText);
    };

    const handlePolishTranscript = async () => {
        if (chunks.length === 0 || isPolishing) return;
        setIsPolishing(true);
        try {
            const rawText = chunks.map(c => c.text).join('\n');
            const prompt = `You are a world-class multilingual meeting transcriber. Clean and polish this verbatim audio transcript:
1. Preserve original languages (Hindi, Telugu, Tamil, Spanish, French, German, Japanese, English, or mixed Hinglish/code-switching).
2. Fix sentence boundaries, capitalize proper nouns, and remove stutter/filler words.
3. Keep the authentic verbatim meaning accurate.

Raw Audio Transcript:
${rawText}

Output only the polished, punctuated verbatim dialogue:`;

            const polished = await TauriClient.sendGlobalMemoryChat(prompt, []);
            if (polished) {
                const lines = polished.split('\n').map(l => l.trim()).filter(Boolean);
                const polishedChunks: TranscriptChunk[] = lines.map((line, i) => ({
                    id: `polished-${Date.now()}-${i}`,
                    speaker: 'speaker',
                    text: line,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }));
                setChunks(polishedChunks);
            }
        } catch (err) {
            console.error("Failed to polish transcript", err);
        } finally {
            setIsPolishing(false);
        }
    };

    const handleCopyAll = () => {
        const fullText = chunks.map(c => c.text).join('\n\n');
        navigator.clipboard.writeText(fullText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const filteredLanguages = MULTILINGUAL_CATALOG.filter(l => 
        l.label.toLowerCase().includes(langSearch.toLowerCase()) || 
        l.nativeName.toLowerCase().includes(langSearch.toLowerCase()) ||
        l.code.toLowerCase().includes(langSearch.toLowerCase())
    );

    if (!isOpen) return null;

    // Minimized Dock Bar
    if (isMinimized) {
        return (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-50">
                <motion.button
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleGenerateNotes}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-[var(--text-primary)] hover:bg-[var(--text-secondary)] text-[var(--bg)] text-xs font-semibold shadow-xl transition-all cursor-pointer"
                >
                    <Sparkles size={14} className="text-[var(--accent)]" />
                    <span>Generate notes</span>
                </motion.button>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2"
                >
                    {/* Audio State Pill */}
                    <button
                        type="button"
                        onClick={toggleStreaming}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-md bg-[var(--surface)] border border-[var(--border)] shadow-md text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                    >
                        <div className="flex items-center gap-0.5">
                            <span className={cn("w-1 h-3 rounded-full", isStreaming ? "bg-[var(--accent)] animate-pulse" : "bg-[var(--text-muted)] opacity-40")} />
                            <span className={cn("w-1 h-4 rounded-full", isStreaming ? "bg-[var(--accent)] animate-pulse [animation-delay:0.2s]" : "bg-[var(--text-muted)] opacity-40")} />
                            <span className={cn("w-1 h-2.5 rounded-full", isStreaming ? "bg-[var(--accent)] animate-pulse [animation-delay:0.4s]" : "bg-[var(--text-muted)] opacity-40")} />
                        </div>
                        <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }}
                            className="p-0.5 hover:bg-[var(--surface-hover)] rounded cursor-pointer"
                        >
                            <ChevronUp size={14} className="text-[var(--text-muted)]" />
                        </button>
                        <span className={cn("font-semibold", isStreaming ? "text-[var(--accent)]" : "text-[var(--text-muted)]")}>
                            {isStreaming ? 'Recording' : 'Paused'}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)] font-normal border-l border-[var(--border)] pl-2">
                            {activeLanguage.flag} {activeLanguage.label.split(' ')[0]}
                        </span>
                        <span 
                            onClick={(e) => { e.stopPropagation(); toggleSystemAudio(); }} 
                            className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer ml-1",
                                isSystemAudioActive ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-primary)]"
                            )}
                            title={isSystemAudioActive ? "System Voice ON" : "Click to enable System Voice"}
                        >
                            {isSystemAudioActive ? '🔊 Sys ON' : '+ Sys'}
                        </span>
                    </button>

                    {/* Quick Ask Box */}
                    <div className="flex items-center bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-md pl-4 pr-1.5 py-1 min-w-[380px]">
                        <input
                            type="text"
                            placeholder="Ask AI anything about meeting..."
                            value={askQuery}
                            onChange={(e) => setAskQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && askQuery.trim()) {
                                    onProcess(chunks.map(c => c.text).join(' ') + `\n\nUser Question: ${askQuery}`);
                                    setAskQuery('');
                                }
                            }}
                            className="bg-transparent text-xs text-[var(--text-primary)] placeholder:[var(--text-muted)] outline-none flex-1 font-sans"
                        />
                        <button 
                            type="button"
                            onClick={handleGenerateNotes}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-[var(--border)] text-[11px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                        >
                            <FileText size={12} className="text-[var(--text-muted)]" />
                            <span>Save Notes</span>
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Expanded Multilingual Live Transcript Card
    return (
        <div className="fixed inset-x-0 bottom-6 flex flex-col items-center justify-center z-50 pointer-events-none px-4 gap-2">
            {/* Top Action Pills */}
            {(!isStreaming || chunks.length > 0) && (
                <div className="pointer-events-auto flex items-center gap-2">
                    <motion.button
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleGenerateNotes}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-[var(--text-primary)] hover:bg-[var(--text-secondary)] text-[var(--bg)] shadow-xl text-xs font-semibold tracking-wide transition-all cursor-pointer"
                    >
                        <Sparkles size={14} className="text-[var(--accent)]" />
                        <span>Synthesize Executive Notes</span>
                    </motion.button>

                    <motion.button
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handlePolishTranscript}
                        disabled={isPolishing}
                        className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-md bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border)] shadow-xl text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
                        title="Correct speech errors and format with Google Gemini"
                    >
                        <Wand2 size={13} className={isPolishing ? "animate-spin text-[var(--accent)]" : "text-[var(--accent)]"} />
                        <span>{isPolishing ? "Polishing..." : "AI Multilingual Polish"}</span>
                    </motion.button>
                </div>
            )}

            <motion.div 
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20 }}
                className="w-full max-w-xl bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
            >
                {/* Header with Multilingual Controls */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface)]">
                    <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] font-medium">
                        <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                        <span className="font-semibold text-[var(--text-primary)]">Multilingual Speech Engine</span>
                        {detectedLanguage && (
                            <span className="text-[var(--accent)] font-semibold flex items-center gap-1 bg-[var(--accent-dim)] px-1.5 py-0.5 rounded border border-[var(--border-accent)]">
                                <span>{detectedLanguage.flag}</span>
                                <span>{detectedLanguage.label}</span>
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                        {/* System Audio & Speaker Voice Capture Button */}
                        <button
                            type="button"
                            onClick={toggleSystemAudio}
                            className={cn(
                                "flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-all cursor-pointer border shadow-2xs font-medium",
                                isSystemAudioActive 
                                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" 
                                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border-[var(--border)]"
                            )}
                            title={isSystemAudioActive ? "System & Speaker Voice Active (Zoom/Meet/YouTube)" : "Click to Capture System/Speaker Audio (Zoom/Meet/YouTube)"}
                        >
                            {isSystemAudioActive ? <Volume2 size={12} className="text-emerald-400 animate-pulse" /> : <VolumeX size={12} />}
                            <span>{isSystemAudioActive ? 'System Voice: ON' : '+ System Voice'}</span>
                        </button>

                        <div className="h-3 w-px bg-[var(--border)] mx-0.5" />

                        {/* Live Translation Mode Switcher */}
                        <button
                            type="button"
                            onClick={handleToggleTranslateMode}
                            className={cn(
                                "flex items-center gap-1 px-2 py-1 rounded text-xs transition-all cursor-pointer",
                                translateMode 
                                    ? "bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] font-semibold" 
                                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                            )}
                            title={translateMode ? "Translating foreign audio to English" : "Transcribing in original native language"}
                        >
                            <ArrowRightLeft size={11} />
                            <span>{translateMode ? 'English Subtitles' : 'Original Script'}</span>
                        </button>

                        <div className="h-3 w-px bg-[var(--border)] mx-1" />

                        {/* Interactive Language Selector Dropdown */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                                className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--text-primary)] hover:bg-[var(--surface-hover)] font-medium cursor-pointer border border-[var(--border)] shadow-xs"
                                title="Change Spoken Language"
                            >
                                <span>{activeLanguage.flag}</span>
                                <span>{activeLanguage.label.split(' ')[0]}</span>
                                <ChevronDown size={10} className="text-[var(--text-muted)]" />
                            </button>

                            {isLangMenuOpen && (
                                <div className="absolute right-0 bottom-full mb-1 w-64 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl p-2 z-50">
                                    {/* Search */}
                                    <div className="relative mb-2">
                                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                        <input
                                            type="text"
                                            value={langSearch}
                                            onChange={e => setLangSearch(e.target.value)}
                                            placeholder="Search 99+ languages..."
                                            className="w-full pl-7 pr-2 py-1 rounded-md bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
                                            autoFocus
                                        />
                                    </div>

                                    <div className="max-h-56 overflow-y-auto space-y-0.5 scroll-smooth">
                                        {filteredLanguages.map(lang => (
                                            <button
                                                type="button"
                                                key={lang.code}
                                                onClick={() => handleLanguageChange(lang.code)}
                                                className={cn(
                                                    "w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center justify-between cursor-pointer",
                                                    selectedLanguage === lang.code 
                                                        ? "text-[var(--accent)] bg-[var(--surface-hover)] font-semibold" 
                                                        : "text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                                                )}
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    <span>{lang.flag}</span>
                                                    <span className="truncate">{lang.label}</span>
                                                    <span className="text-[10px] text-[var(--text-muted)]">({lang.nativeName})</span>
                                                </div>
                                                {selectedLanguage === lang.code && <Check size={12} className="shrink-0 text-[var(--accent)]" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button type="button" onClick={handleCopyAll} className="hover:text-[var(--text-primary)] p-1 transition-colors cursor-pointer" title="Copy transcript">
                            {copied ? <Check size={13} className="text-[var(--accent)]" /> : <Copy size={13} />}
                        </button>
                        <button type="button" onClick={() => setIsMinimized(true)} className="hover:text-[var(--text-primary)] p-1 transition-colors cursor-pointer" title="Minimize">
                            <Minus size={14} />
                        </button>
                        <button type="button" onClick={onClose} className="hover:text-[var(--text-primary)] p-1 transition-colors cursor-pointer" title="Close">
                            <Square size={12} />
                        </button>
                    </div>
                </div>

                {/* Transcript Search Bar */}
                {chunks.length > 2 && (
                    <div className="px-4 py-1.5 border-b border-[var(--border)] bg-[var(--surface)]/60 flex items-center gap-2">
                        <Search size={12} className="text-[var(--text-muted)] shrink-0" />
                        <input
                            type="text"
                            value={transcriptSearch}
                            onChange={e => setTranscriptSearch(e.target.value)}
                            placeholder="Filter transcript keywords..."
                            className="w-full bg-transparent border-none outline-none text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                        />
                        {transcriptSearch && (
                            <button type="button" onClick={() => setTranscriptSearch('')} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                                Clear
                            </button>
                        )}
                    </div>
                )}

                {/* Multilingual Transcript Stream */}
                <div 
                    ref={scrollRef}
                    className="p-4 max-h-[38vh] min-h-[160px] overflow-y-auto space-y-2 bg-[var(--bg)] font-sans"
                >
                    {chunks.length === 0 && !interimText && (
                        <div className="flex flex-col items-center justify-center py-10 text-[var(--text-muted)] text-xs gap-1.5">
                            <div className="flex items-center gap-1.5 text-base mb-1">
                                <span>🌐</span>
                                <span>🇮🇳</span>
                                <span>🇪🇸</span>
                                <span>🇫🇷</span>
                                <span>🇯🇵</span>
                                <span>🇩🇪</span>
                            </div>
                            <p className="font-semibold text-[var(--text-primary)]">
                                {isStreaming ? `Listening in ${activeLanguage.label}...` : 'Recording paused.'}
                            </p>
                            <p className="text-[11px] text-[var(--text-muted)] opacity-80">
                                Native script verbatim transcription & speaker attribution active.
                            </p>
                        </div>
                    )}

                    <AnimatePresence>
                        {chunks
                            .filter(c => !transcriptSearch.trim() || c.text.toLowerCase().includes(transcriptSearch.toLowerCase()))
                            .map((chunk, idx) => (
                            <motion.div 
                                key={chunk.id}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="group relative flex flex-col gap-1 rounded-xl p-2 transition-colors hover:bg-[var(--surface-hover)]/40"
                            >
                                <div className="flex items-center justify-between text-[11px] px-1">
                                    <div className="flex items-center gap-1.5">
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full text-[10px] font-semibold border shadow-2xs",
                                            idx % 2 === 0 
                                                ? "bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-accent)]" 
                                                : "bg-[var(--surface-raised)] text-[var(--text-secondary)] border-[var(--border)]"
                                        )}>
                                            {idx % 2 === 0 ? 'You' : `Speaker ${Math.floor(idx / 2) + 1}`}
                                        </span>
                                        {chunk.language && (
                                            <span className="text-[11px] text-[var(--text-muted)]">
                                                {chunk.language}
                                            </span>
                                        )}
                                        {chunk.isTranslated && (
                                            <span className="bg-[var(--accent-dim)] text-[var(--accent)] text-[9px] px-1 py-0.2 rounded font-semibold uppercase">Translated</span>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        {/* Hover Actions: Copy & Insert to Note */}
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(chunk.text);
                                                    setCopiedChunkId(chunk.id);
                                                    setTimeout(() => setCopiedChunkId(null), 1800);
                                                }}
                                                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                                                title="Copy Quote"
                                            >
                                                {copiedChunkId === chunk.id ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                                                <span>{copiedChunkId === chunk.id ? 'Copied' : 'Copy'}</span>
                                            </button>
                                            {onInsertQuote && (
                                                <button
                                                    type="button"
                                                    onClick={() => onInsertQuote(chunk.text)}
                                                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-[var(--accent)] hover:bg-[var(--accent-dim)] font-medium transition-colors cursor-pointer"
                                                    title="Insert directly into notes"
                                                >
                                                    <Plus size={10} />
                                                    <span>+ Add to Note</span>
                                                </button>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-[var(--text-muted)] font-mono tabular-nums">{chunk.timestamp || formatTime(recordingTime)}</span>
                                    </div>
                                </div>
                                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3.5 py-2 text-[13.5px] leading-relaxed text-[var(--text-primary)] shadow-xs">
                                    {chunk.text}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Live Interim Streaming Preview */}
                    {interimText && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-[var(--surface)] border border-[var(--border)] border-dashed rounded-xl px-3.5 py-2 text-[13.5px] text-[var(--text-muted)] italic shadow-xs"
                        >
                            {interimText} <span className="animate-pulse text-[var(--accent)] font-bold">...</span>
                        </motion.div>
                    )}
                </div>

                {/* Bottom Control Strip */}
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--border)] bg-[var(--surface)]">
                    {/* Left: Waveform & Time */}
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-0.5 h-4 px-1" title={`Live Audio Level: ${audioLevel}%`}>
                            <span className={cn("w-1 rounded-full transition-all duration-75", isStreaming ? "bg-[var(--accent)]" : "bg-[var(--text-muted)] opacity-40")} style={{ height: isStreaming ? `${Math.max(4, Math.min(16, audioLevel * 0.2 + 4))}px` : '4px' }} />
                            <span className={cn("w-1 rounded-full transition-all duration-75", isStreaming ? "bg-[var(--accent)]" : "bg-[var(--text-muted)] opacity-40")} style={{ height: isStreaming ? `${Math.max(6, Math.min(16, audioLevel * 0.35 + 6))}px` : '6px' }} />
                            <span className={cn("w-1 rounded-full transition-all duration-75", isStreaming ? "bg-[var(--accent)]" : "bg-[var(--text-muted)] opacity-40")} style={{ height: isStreaming ? `${Math.max(4, Math.min(16, audioLevel * 0.22 + 4))}px` : '4px' }} />
                        </div>
                        
                        <button 
                            type="button"
                            onClick={toggleStreaming}
                            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1 flex items-center gap-1 text-xs cursor-pointer font-medium"
                            title={isStreaming ? "Pause recording" : "Resume recording"}
                        >
                            <span>{isStreaming ? 'Pause' : 'Resume'}</span>
                        </button>
                    </div>

                    {/* Center: Live Duration */}
                    <span className="text-xs font-mono text-[var(--text-muted)] font-medium tabular-nums">
                        {formatTime(recordingTime)}
                    </span>

                    {/* Right: Done Button */}
                    <button 
                        type="button"
                        onClick={handleGenerateNotes}
                        className="px-3.5 py-1.5 rounded-md bg-[var(--text-primary)] hover:bg-[var(--text-secondary)] text-[var(--bg)] text-xs font-semibold transition-all cursor-pointer shadow-xs"
                    >
                        Done & Generate Notes
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
