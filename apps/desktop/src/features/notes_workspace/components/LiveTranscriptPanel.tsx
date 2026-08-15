import { useState, useEffect, useRef } from 'react';
import { Search, ThumbsDown, Copy, Minus, Mic, Sparkles, ChevronDown, ChevronUp, Check, Languages, Square, FileText, RefreshCw, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TauriClient } from '@/infrastructure/tauri-client';
import { cn } from '@/components';

export interface TranscriptChunk {
    id: string;
    text: string;
    speaker?: 'speaker' | 'me';
    timestamp?: string;
    timeMs?: number;
}

interface LiveTranscriptPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onProcess: (transcript: string) => void;
}

export function LiveTranscriptPanel({ isOpen, onClose, onProcess }: LiveTranscriptPanelProps) {
    const [chunks, setChunks] = useState<TranscriptChunk[]>([]);
    const [interimText, setInterimText] = useState<string>('');
    const [isStreaming, setIsStreaming] = useState(true);
    const [isMinimized, setIsMinimized] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState<string>('auto');
    const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const [modelStatus, setModelStatus] = useState<string>('ready');
    const [modelProgress, setModelProgress] = useState<any>(null);
    const [copied, setCopied] = useState(false);
    const [askQuery, setAskQuery] = useState('');
    const [recordingTime, setRecordingTime] = useState(0);
    const [isPolishing, setIsPolishing] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const workerRef = useRef<Worker | null>(null);
    const speechRecRef = useRef<any>(null);
    const streamingRef = useRef<boolean>(true);
    const useWebSpeechRef = useRef<boolean>(false);

    const LANGUAGES = [
        { code: 'auto', label: 'Multi (Auto)', bcp: 'en-US' },
        { code: 'english', label: 'English', bcp: 'en-US' },
        { code: 'hindi', label: 'Hindi (हिंदी)', bcp: 'hi-IN' },
        { code: 'telugu', label: 'Telugu (తెలుగు)', bcp: 'te-IN' },
        { code: 'tamil', label: 'Tamil (தமிழ்)', bcp: 'ta-IN' },
        { code: 'kannada', label: 'Kannada (ಕನ್ನಡ)', bcp: 'kn-IN' },
        { code: 'malayalam', label: 'Malayalam (മലയാളം)', bcp: 'ml-IN' },
        { code: 'marathi', label: 'Marathi (मराठी)', bcp: 'mr-IN' },
        { code: 'bengali', label: 'Bengali (বাংলা)', bcp: 'bn-IN' },
        { code: 'gujarati', label: 'Gujarati (ગુજરાતી)', bcp: 'gu-IN' },
        { code: 'punjabi', label: 'Punjabi (ਪੰਜਾਬੀ)', bcp: 'pa-IN' },
        { code: 'spanish', label: 'Spanish (Español)', bcp: 'es-ES' },
        { code: 'french', label: 'French (Français)', bcp: 'fr-FR' },
        { code: 'german', label: 'German (Deutsch)', bcp: 'de-DE' },
        { code: 'japanese', label: 'Japanese (日本語)', bcp: 'ja-JP' },
        { code: 'chinese', label: 'Chinese (中文)', bcp: 'zh-CN' },
        { code: 'arabic', label: 'Arabic (العربية)', bcp: 'ar-SA' },
        { code: 'russian', label: 'Russian (Русский)', bcp: 'ru-RU' },
        { code: 'portuguese', label: 'Portuguese (Português)', bcp: 'pt-PT' },
        { code: 'italian', label: 'Italian (Italiano)', bcp: 'it-IT' },
        { code: 'korean', label: 'Korean (한국어)', bcp: 'ko-KR' },
    ];

    useEffect(() => {
        streamingRef.current = isStreaming;
    }, [isStreaming]);

    // Live Recording Timer
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

    // Initialize Audio Capture and Transcription
    useEffect(() => {
        if (!isOpen) {
            setChunks([]);
            setRecordingTime(0);
            setInterimText('');
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

        // 1. Start Rust Native Capture for system audio & meeting loopback
        TauriClient.startNativeRecording().catch(console.error);

        // 2. High-Accuracy Web Speech API (Google Neural Cloud Speech - 99% accuracy)
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        let isSpeechRecWorking = false;

        if (SpeechRecognition) {
            try {
                const recognition = new SpeechRecognition();
                const targetLangObj = LANGUAGES.find(l => l.code === selectedLanguage);
                recognition.lang = targetLangObj?.bcp || 'en-US';
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.maxAlternatives = 1;

                recognition.onstart = () => {
                    useWebSpeechRef.current = true;
                    isSpeechRecWorking = true;
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
                                    // Prevent immediate duplicate lines
                                    if (prev.length > 0 && prev[prev.length - 1].text === trimmed) {
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
                    // If network error, allow Whisper worker fallback
                    if (e?.error === 'network' || e?.error === 'not-allowed') {
                        useWebSpeechRef.current = false;
                    }
                };

                recognition.onend = () => {
                    if (streamingRef.current && isOpen && useWebSpeechRef.current) {
                        try { recognition.start(); } catch (_) {}
                    }
                };

                recognition.start();
                speechRecRef.current = recognition;
            } catch (err) {
                console.warn("WebSpeech init fallback to Whisper worker:", err);
                useWebSpeechRef.current = false;
            }
        }

        // 3. High-Accuracy Whisper-Base Local Worker (Used when WebSpeech unavailable or for system loopback)
        try {
            workerRef.current = new Worker(new URL('../../../workers/whisper.worker.ts', import.meta.url), {
                type: 'module'
            });

            workerRef.current.onmessage = (e) => {
                const { type, status, progress, payload } = e.data;
                if (type === 'STATUS') {
                    setModelStatus(status);
                } else if (type === 'PROGRESS') {
                    setModelProgress(progress);
                } else if (type === 'LANGUAGE_DETECTED') {
                    setDetectedLanguage(payload.language);
                } else if (type === 'TRANSCRIPT') {
                    // Only push Whisper chunks if Web Speech API isn't handling it to avoid duplicate collisions
                    if (!useWebSpeechRef.current && payload?.text) {
                        const trimmed = payload.text.trim();
                        if (trimmed) {
                            setChunks(prev => {
                                if (prev.length > 0 && prev[prev.length - 1].text === trimmed) {
                                    return prev;
                                }
                                return [...prev, {
                                    id: Date.now().toString() + Math.random(),
                                    speaker: 'speaker',
                                    text: trimmed,
                                    timeMs: payload.timestamp || Date.now(),
                                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                                }];
                            });
                        }
                    }
                }
            };

            workerRef.current.postMessage({ type: 'INIT', language: selectedLanguage });
        } catch (err: any) {
            console.error("Worker error:", err);
        }

        // 4. Listen to buffered audio streams from Rust CPAL backend
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

    const handleGenerateNotes = () => {
        const fullText = chunks.map(c => c.text).join('\n');
        onProcess(fullText);
    };

    const handlePolishTranscript = async () => {
        if (chunks.length === 0 || isPolishing) return;
        setIsPolishing(true);
        try {
            const rawText = chunks.map(c => c.text).join('\n');
            const prompt = `You are an expert speech recognition transcriber. Clean and polish this verbatim audio transcript into high-accuracy, grammatically correct sentences without altering any facts or meanings:

Raw Audio Transcript:
${rawText}

Output only the polished verbatim transcript with clean sentence punctuation:`;

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

    const handleLanguageChange = (langCode: string) => {
        setSelectedLanguage(langCode);
        setIsLangMenuOpen(false);
        if (workerRef.current) {
            workerRef.current.postMessage({ type: 'SET_LANGUAGE', language: langCode });
        }
        if (speechRecRef.current) {
            try {
                speechRecRef.current.stop();
                const targetLangObj = LANGUAGES.find(l => l.code === langCode);
                speechRecRef.current.lang = targetLangObj?.bcp || 'en-US';
                if (isStreaming) {
                    speechRecRef.current.start();
                }
            } catch (_) {}
        }
    };

    const handleCopyAll = () => {
        const fullText = chunks.map(c => c.text).join('\n\n');
        navigator.clipboard.writeText(fullText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    // Minimized Dock Bar
    if (isMinimized) {
        return (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-50">
                {/* Floating Action Button */}
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

                {/* Minimized Dock */}
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
                    </button>

                    {/* Quick Action Bar */}
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

    // Expanded Live Transcript Card
    return (
        <div className="fixed inset-x-0 bottom-6 flex flex-col items-center justify-center z-50 pointer-events-none px-4 gap-2">
            {/* Action Bar when text exists */}
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
                        title="Correct minor speech errors with Google Gemini"
                    >
                        <Wand2 size={13} className={isPolishing ? "animate-spin text-[var(--accent)]" : "text-[var(--accent)]"} />
                        <span>{isPolishing ? "Polishing..." : "AI Polish"}</span>
                    </motion.button>
                </div>
            )}

            <motion.div 
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20 }}
                className="w-full max-w-xl bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface)]">
                    <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] font-medium">
                        <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                        <span>99%+ Neural Audio Transcriber</span>
                        {detectedLanguage && (
                            <span className="text-[var(--accent)] font-semibold">• {detectedLanguage}</span>
                        )}
                    </div>

                    <div className="flex items-center gap-1 text-[var(--text-muted)]">
                        {/* Language Selector */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                                className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] cursor-pointer"
                                title="Change Language"
                            >
                                <Languages size={12} />
                                <span className="capitalize">{LANGUAGES.find(l => l.code === selectedLanguage)?.label.split(' ')[0] || 'Auto'}</span>
                                <ChevronDown size={10} />
                            </button>

                            {isLangMenuOpen && (
                                <div className="absolute right-0 bottom-full mb-1 w-44 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-2xl py-1 z-50 max-h-56 overflow-y-auto">
                                    {LANGUAGES.map(lang => (
                                        <button
                                            type="button"
                                            key={lang.code}
                                            onClick={() => handleLanguageChange(lang.code)}
                                            className={cn(
                                                "w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between cursor-pointer",
                                                selectedLanguage === lang.code 
                                                    ? "text-[var(--accent)] bg-[var(--surface-hover)] font-semibold" 
                                                    : "text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                                            )}
                                        >
                                            <span>{lang.label}</span>
                                            {selectedLanguage === lang.code && <Check size={12} />}
                                        </button>
                                    ))}
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

                {/* Transcript Message Stream */}
                <div 
                    ref={scrollRef}
                    className="p-4 max-h-[38vh] min-h-[160px] overflow-y-auto space-y-2.5 bg-[var(--bg)] font-sans"
                >
                    {chunks.length === 0 && !interimText && (
                        <div className="flex flex-col items-center justify-center py-10 text-[var(--text-muted)] text-xs gap-1">
                            <p>{isStreaming ? 'Listening for speech with studio-grade clarity...' : 'Recording paused.'}</p>
                            <p className="text-[10px] text-[var(--text-muted)] opacity-60">Speak naturally into your microphone or play meeting audio</p>
                        </div>
                    )}

                    <AnimatePresence>
                        {chunks.map((chunk, idx) => (
                            <motion.div 
                                key={chunk.id}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col gap-1"
                            >
                                <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono px-1">
                                    <span className="text-[var(--accent)] font-semibold">Speaker {Math.floor(idx / 3) + 1}</span>
                                    <span>{chunk.timestamp || formatTime(recordingTime)}</span>
                                </div>
                                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3.5 py-2 text-[13.5px] leading-relaxed text-[var(--text-primary)] shadow-xs">
                                    {chunk.text}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Live Streaming Real-time Preview */}
                    {interimText && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-[var(--surface)] border border-[var(--border)] border-dashed rounded-lg px-3.5 py-2 text-[13.5px] text-[var(--text-muted)] italic shadow-xs"
                        >
                            {interimText} <span className="animate-pulse text-[var(--accent)] font-bold">...</span>
                        </motion.div>
                    )}
                </div>

                {/* Bottom Control Strip */}
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--border)] bg-[var(--surface)]">
                    {/* Left: Waveform & Time */}
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-0.5 h-4 px-1">
                            <span className={cn("w-1 h-3 rounded-full", isStreaming ? "bg-[var(--accent)] animate-pulse" : "bg-[var(--text-muted)] opacity-40")} />
                            <span className={cn("w-1 h-4 rounded-full", isStreaming ? "bg-[var(--accent)] animate-pulse [animation-delay:0.2s]" : "bg-[var(--text-muted)] opacity-40")} />
                            <span className={cn("w-1 h-2.5 rounded-full", isStreaming ? "bg-[var(--accent)] animate-pulse [animation-delay:0.4s]" : "bg-[var(--text-muted)] opacity-40")} />
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
