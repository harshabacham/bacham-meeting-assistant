import { useState, useEffect, useRef } from 'react';
import { Search, SlidersHorizontal, Minus, Mic, Sparkles, ChevronDown, CheckSquare, Target, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { TauriClient } from '@/infrastructure/tauri-client';

interface TranscriptChunk {
    id: string;
    text: string;
    speaker?: string;
    isCurrent?: boolean;
    tag?: 'decision' | 'action' | null;
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
    const [selectedLanguage, setSelectedLanguage] = useState<string>('english');
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const [modelStatus, setModelStatus] = useState<string>('idle');
    const [modelProgress, setModelProgress] = useState<any>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [sysChunks, setSysChunks] = useState<number>(0);
    const [micChunks, setMicChunks] = useState<number>(0);
    const [debugLogs, setDebugLogs] = useState<string[]>(['Panel Mounted']);
    const scrollRef = useRef<HTMLDivElement>(null);
    const workerRef = useRef<Worker | null>(null);
    const speechRecRef = useRef<any>(null);
    const streamingRef = useRef<boolean>(true);

    const LANGUAGES = [
        { code: 'english', label: 'English', bcp: 'en-US' },
        { code: 'auto', label: 'Auto Detect', bcp: 'en-US' },
        { code: 'hindi', label: 'Hindi (हिंदी)', bcp: 'hi-IN' },
        { code: 'telugu', label: 'Telugu (తెలుగు)', bcp: 'te-IN' },
        { code: 'tamil', label: 'Tamil (தமிழ்)', bcp: 'ta-IN' },
        { code: 'spanish', label: 'Spanish (Español)', bcp: 'es-ES' },
        { code: 'french', label: 'French (Français)', bcp: 'fr-FR' },
        { code: 'german', label: 'German (Deutsch)', bcp: 'de-DE' },
        { code: 'japanese', label: 'Japanese (日本語)', bcp: 'ja-JP' },
        { code: 'chinese', label: 'Chinese (中文)', bcp: 'zh-CN' },
    ];

    useEffect(() => {
        streamingRef.current = isStreaming;
    }, [isStreaming]);

    const addDebug = (msg: string) => {
        setDebugLogs(prev => [...prev.slice(-15), `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    // Initialize Web Worker and Audio Capture
    useEffect(() => {
        if (!isOpen) {
            setChunks([]);
            setSysChunks(0);
            setMicChunks(0);
            setErrorMessage(null);
            TauriClient.stopNativeRecording();
            if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
            }
            return;
        }

        // 1. Start Rust Dual-Capture
        TauriClient.startNativeRecording().then(() => {
            addDebug('Native audio capture started');
        }).catch((err) => {
            addDebug(`Native capture error: ${err}`);
            setErrorMessage(`Failed to start native audio capture: ${err}`);
        });

        // 2. Initialize Transformers.js Web Worker
        try {
            workerRef.current = new Worker(new URL('../../../workers/whisper.worker.ts', import.meta.url), {
                type: 'module'
            });

            workerRef.current.onmessage = (e) => {
                const { type, status, progress, payload, error } = e.data;
                if (type === 'STATUS') {
                    setModelStatus(status);
                    addDebug(`Worker: ${status}`);
                    if (error) {
                        console.error("Whisper Error:", error);
                        setErrorMessage(error);
                        addDebug(`Worker Error: ${error}`);
                    }
                } else if (type === 'PROGRESS') {
                    setModelProgress(progress);
                } else if (type === 'TRANSCRIPT') {
                    addDebug(`Transcript: "${payload.text}"`);
                    setChunks(prev => {
                        const newChunks = [...prev, {
                            id: Date.now().toString() + Math.random(),
                            speaker: 'Speaker',
                            text: payload.text
                        }];
                        return newChunks;
                    });
                    
                    if (scrollRef.current) {
                        setTimeout(() => {
                            scrollRef.current?.scrollTo({
                                top: scrollRef.current.scrollHeight,
                                behavior: 'smooth'
                            });
                        }, 50);
                    }
                }
            };

            workerRef.current.onerror = (err) => {
                console.error("Worker error event:", err);
                setErrorMessage(err.message || 'Worker initialization failed');
                addDebug(`Worker error: ${err.message}`);
            };

            workerRef.current.postMessage({ type: 'INIT', language: selectedLanguage });
            addDebug(`Sent INIT to Whisper Worker (Lang: ${selectedLanguage})`);
        } catch (err: any) {
            console.error("Failed to spawn worker:", err);
            setErrorMessage(err.message || 'Failed to spawn worker');
            addDebug(`Spawn error: ${err.message}`);
        }

        // 3. Listen to audio streams from Rust (clean 16kHz mono floats)
        let unlistenSys: () => void;
        let unlistenMic: () => void;
        let sysCount = 0;
        let micCount = 0;

        const statsTimer = setInterval(() => {
            setSysChunks(sysCount);
            setMicChunks(micCount);
        }, 1000);

        import('@tauri-apps/api/event').then(({ listen }) => {
            listen<number[]>('audio_stream_sys', (event) => {
                sysCount++;
                if (streamingRef.current && workerRef.current && event.payload) {
                    workerRef.current.postMessage({ 
                        type: 'AUDIO_CHUNK', 
                        stream: 'sys',
                        payload: event.payload 
                    });
                }
            }).then(u => { unlistenSys = u; addDebug('System Audio stream connected (16kHz)'); });
            
            listen<number[]>('audio_stream_mic', (event) => {
                micCount++;
                if (streamingRef.current && workerRef.current && event.payload) {
                    workerRef.current.postMessage({ 
                        type: 'AUDIO_CHUNK', 
                        stream: 'mic',
                        payload: event.payload 
                    });
                }
            }).then(u => { unlistenMic = u; addDebug('Microphone stream connected (16kHz)'); });
        });

        // 4. Initialize Native Web Speech Recognition for instant zero-latency speech streaming
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            try {
                const recognition = new SpeechRecognition();
                const targetLangObj = LANGUAGES.find(l => l.code === selectedLanguage);
                recognition.lang = targetLangObj?.bcp || 'en-US';
                recognition.continuous = true;
                recognition.interimResults = true;

                recognition.onresult = (event: any) => {
                    if (!streamingRef.current) return;
                    let interim = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        const transcript = event.results[i][0].transcript;
                        if (event.results[i].isFinal) {
                            if (transcript.trim()) {
                                addDebug(`Live speech: "${transcript.trim()}"`);
                                setChunks(prev => [...prev, {
                                    id: Date.now().toString() + Math.random(),
                                    speaker: 'Speaker',
                                    text: transcript.trim()
                                }]);
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
                    console.log("Web Speech notice:", e.error);
                };

                recognition.onend = () => {
                    if (streamingRef.current && isOpen) {
                        try { recognition.start(); } catch (_) {}
                    }
                };

                recognition.start();
                speechRecRef.current = recognition;
                addDebug(`Native Speech recognizer started (${recognition.lang})`);
            } catch (err) {
                console.log("SpeechRecognition not initialized:", err);
            }
        }

        return () => {
            clearInterval(statsTimer);
            TauriClient.stopNativeRecording();
            if (workerRef.current) workerRef.current.terminate();
            if (speechRecRef.current) {
                try { speechRecRef.current.stop(); } catch (_) {}
                speechRecRef.current = null;
            }
            if (unlistenSys) unlistenSys();
            if (unlistenMic) unlistenMic();
        };
    }, [isOpen, selectedLanguage]);

    const handleLanguageChange = (langCode: string) => {
        setSelectedLanguage(langCode);
        setIsLangMenuOpen(false);
        if (workerRef.current) {
            workerRef.current.postMessage({ type: 'SET_LANGUAGE', language: langCode });
            addDebug(`Language switched to: ${langCode}`);
        }
    };

    const handleTagLatest = (tag: 'decision' | 'action') => {
        setChunks(prev => {
            if (prev.length === 0) return prev;
            const newChunks = [...prev];
            newChunks[newChunks.length - 1] = { ...newChunks[newChunks.length - 1], tag };
            return newChunks;
        });
    };

    if (!isOpen) return null;

    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-3xl z-50">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
                    <div className="flex items-center gap-3">
                        <Search size={14} className="text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-primary)] transition-colors" />
                        <div className="relative">
                            <button 
                                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] text-[11px] font-medium text-[var(--text-primary)] hover:border-primary/50 transition-all"
                            >
                                <Globe size={12} className="text-primary" />
                                <span>{LANGUAGES.find(l => l.code === selectedLanguage)?.label || 'Language'}</span>
                                <ChevronDown size={11} className="text-[var(--text-muted)]" />
                            </button>

                            {isLangMenuOpen && (
                                <div className="absolute top-full left-0 mt-1.5 w-44 bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                                    {LANGUAGES.map(lang => (
                                        <button
                                            key={lang.code}
                                            onClick={() => handleLanguageChange(lang.code)}
                                            className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-[var(--surface-hover)] transition-colors ${selectedLanguage === lang.code ? 'text-primary font-bold bg-primary/10' : 'text-[var(--text-primary)]'}`}
                                        >
                                            <span>{lang.label}</span>
                                            {selectedLanguage === lang.code && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <SlidersHorizontal size={14} className="text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-primary)] transition-colors" />
                        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                            <Minus size={16} />
                        </button>
                    </div>
                </div>

                {/* Transcript Body */}
                <div 
                    ref={scrollRef}
                    className="p-5 max-h-[45vh] overflow-y-auto space-y-3 bg-[var(--bg)]"
                >
                    <AnimatePresence>
                        {chunks.map((chunk) => (
                            <motion.div 
                                key={chunk.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`relative p-3.5 bg-[var(--surface)] rounded-2xl border ${chunk.tag ? 'border-primary/40 shadow-sm' : 'border-[var(--border)]'}`}
                            >
                                {chunk.tag === 'decision' && (
                                    <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                        <Target size={10} /> Decision
                                    </div>
                                )}
                                {chunk.tag === 'action' && (
                                    <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                        <CheckSquare size={10} /> Action Item
                                    </div>
                                )}
                                <p className="text-[13px] leading-relaxed text-[var(--text-primary)] font-medium font-sans">
                                    {chunk.text}
                                </p>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Live Streaming Interim Preview */}
                    {interimText && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="p-3 bg-primary/5 rounded-2xl border border-primary/20 text-[13px] text-[var(--text-primary)] italic"
                        >
                            <span className="text-primary font-bold mr-1.5 animate-pulse">●</span> {interimText}...
                        </motion.div>
                    )}
                    
                    {modelStatus === 'loading' && (
                        <div className="text-xs text-[var(--text-muted)] flex flex-col items-center justify-center py-4">
                            <Sparkles size={16} className="animate-pulse mb-2" />
                            <p>Loading AI Speech Model...</p>
                            {modelProgress && (
                                <div className="w-full bg-[var(--surface-hover)] h-1 rounded-full mt-2 overflow-hidden">
                                    <div className="bg-[var(--accent)] h-full" style={{ width: `${Math.max(0, Math.min(100, modelProgress.progress || 0))}%` }} />
                                </div>
                            )}
                        </div>
                    )}

                    {isStreaming && modelStatus === 'ready' && (
                        <div className="flex gap-1 items-center p-3 opacity-50">
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" />
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:0.2s]" />
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:0.4s]" />
                        </div>
                    )}
                    
                    {/* Error Banner */}
                    {errorMessage && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex flex-col gap-1">
                            <span className="font-bold">Error Detected:</span>
                            <span className="font-mono text-[11px]">{errorMessage}</span>
                        </div>
                    )}

                    {/* Status & Diagnostics */}
                    <div className="mt-4 p-3.5 bg-black/40 border border-white/10 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${modelStatus === 'ready' || modelStatus.startsWith('ready') || modelStatus.startsWith('Transcribed') ? 'bg-emerald-500 animate-pulse' : modelStatus === 'loading' ? 'bg-amber-500 animate-spin' : 'bg-red-500'}`} />
                                <span className="font-medium text-white/90">Status: <span className="text-white/70">{modelStatus}</span></span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-white/50 font-mono">
                                <span>Sys: {sysChunks}</span>
                                <span>Mic: {micChunks}</span>
                            </div>
                        </div>

                        {modelStatus === 'loading' && modelProgress && (
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px] text-white/60">
                                    <span>Downloading Whisper AI weights...</span>
                                    <span>{Math.round(modelProgress.progress || 0)}%</span>
                                </div>
                                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-primary h-full transition-all duration-300" style={{ width: `${Math.max(5, modelProgress.progress || 0)}%` }} />
                                </div>
                            </div>
                        )}

                        <div className="pt-2 border-t border-white/5">
                            <h4 className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Live Diagnostics Activity</h4>
                            <div className="max-h-24 overflow-y-auto space-y-1 pr-1 font-mono text-[10px] text-white/60">
                                {debugLogs.map((log, i) => (
                                    <div key={i} className="truncate">{log}</div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3.5 bg-[var(--surface)] border-t border-[var(--border)]">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setIsStreaming(!isStreaming)}
                            className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)] hover:opacity-80 transition-opacity"
                        >
                            {isStreaming ? (
                                <><div className="flex items-center gap-0.5"><div className="w-0.5 h-3 bg-red-500 animate-pulse"/><div className="w-0.5 h-2 bg-red-500 animate-pulse"/><div className="w-0.5 h-3.5 bg-red-500 animate-pulse"/><div className="w-0.5 h-1.5 bg-red-500 animate-pulse"/></div> Pause</>
                            ) : (
                                <><Mic size={15} /> Resume</>
                            )}
                        </button>
                        
                        <div className="h-4 w-px bg-[var(--border)] mx-1" />
                        
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => handleTagLatest('decision')}
                                className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[var(--surface-hover)] text-[11px] font-bold text-primary transition-all focus:outline-none"
                            >
                                <Target size={12} /> Tag Decision
                            </button>
                            <button 
                                onClick={() => handleTagLatest('action')}
                                className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[var(--surface-hover)] text-[11px] font-bold text-amber-500 transition-all focus:outline-none"
                            >
                                <CheckSquare size={12} /> Tag Action
                            </button>
                        </div>
                    </div>

                    <button 
                        onClick={() => onProcess(chunks.map(c => c.text).join(' '))}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-[var(--surface-hover)] border border-transparent hover:border-[var(--border)] text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
                    >
                        <Sparkles size={13} className="text-[var(--text-muted)]" /> 
                        Multi 
                        <ChevronDown size={12} />
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
