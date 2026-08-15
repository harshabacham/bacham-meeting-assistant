import { useState, useEffect, useRef } from 'react';
import { Search, ThumbsDown, Copy, Minus, Mic, Sparkles, ChevronDown, ChevronUp, Check, Languages, Square, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { TauriClient } from '@/infrastructure/tauri-client';

interface TranscriptChunk {
    id: string;
    text: string;
    speaker?: 'speaker' | 'me';
    timestamp?: string;
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
    const [modelStatus, setModelStatus] = useState<string>('idle');
    const [modelProgress, setModelProgress] = useState<any>(null);
    const [copied, setCopied] = useState(false);
    const [askQuery, setAskQuery] = useState('');
    const [recordingTime, setRecordingTime] = useState(0);

    const scrollRef = useRef<HTMLDivElement>(null);
    const workerRef = useRef<Worker | null>(null);
    const speechRecRef = useRef<any>(null);
    const streamingRef = useRef<boolean>(true);

    const LANGUAGES = [
        { code: 'auto', label: 'Multi (Auto)', bcp: '' },
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

    // Timer
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

    // Initialize Web Worker and Audio Capture
    useEffect(() => {
        if (!isOpen) {
            setChunks([]);
            setRecordingTime(0);
            TauriClient.stopNativeRecording();
            if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
            }
            return;
        }

        // 1. Start Rust Dual-Capture
        TauriClient.startNativeRecording().catch(console.error);

        // 2. Initialize Transformers.js Web Worker
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
                    setChunks(prev => [...prev, {
                        id: Date.now().toString() + Math.random(),
                        speaker: 'speaker',
                        text: payload.text
                    }]);
                    
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

            workerRef.current.postMessage({ type: 'INIT', language: selectedLanguage });
        } catch (err: any) {
            console.error("Worker error:", err);
        }

        // 3. Listen to audio streams from Rust
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

        // 4. Native Web Speech Recognition for instant zero-latency speech preview
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            try {
                const recognition = new SpeechRecognition();
                const targetLangObj = LANGUAGES.find(l => l.code === selectedLanguage);
                if (selectedLanguage !== 'auto' && targetLangObj?.bcp) {
                    recognition.lang = targetLangObj.bcp;
                }
                recognition.continuous = true;
                recognition.interimResults = true;

                recognition.onresult = (event: any) => {
                    if (!streamingRef.current) return;
                    let interim = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        const transcript = event.results[i][0].transcript;
                        if (event.results[i].isFinal) {
                            if (transcript.trim()) {
                                setChunks(prev => [...prev, {
                                    id: Date.now().toString() + Math.random(),
                                    speaker: 'speaker',
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

                recognition.onend = () => {
                    if (streamingRef.current && isOpen) {
                        try { recognition.start(); } catch (_) {}
                    }
                };

                recognition.start();
                speechRecRef.current = recognition;
            } catch (_) {}
        }

        return () => {
            TauriClient.stopNativeRecording();
            if (workerRef.current) workerRef.current.terminate();
            if (speechRecRef.current) {
                try { speechRecRef.current.stop(); } catch (_) {}
                speechRecRef.current = null;
            }
            if (unlistenSys) unlistenSys();
            if (unlistenMic) unlistenMic();
        };
    }, [isOpen]);

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
                if (langCode !== 'auto' && targetLangObj?.bcp) {
                    speechRecRef.current.lang = targetLangObj.bcp;
                }
                speechRecRef.current.start();
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

    // Granola Minimized Floating Bottom Bar (Image 2)
    if (isMinimized) {
        return (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-50">
                {/* Floating Generate notes Button */}
                <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => onProcess(chunks.map(c => c.text).join(' '))}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#3d5a22] hover:bg-[#344d1d] text-white text-xs font-medium shadow-lg transition-all"
                >
                    <Sparkles size={13} className="text-[#a4e062]" />
                    <span>Generate notes</span>
                </motion.button>

                {/* Minimized Dock Bar */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2"
                >
                    {/* Left Audio State Pill */}
                    <button
                        onClick={() => setIsStreaming(!isStreaming)}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white border border-neutral-200 shadow-md text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                    >
                        <div className="flex items-center gap-0.5">
                            <span className={`w-0.5 h-3 bg-[#44a320] rounded-full ${isStreaming ? 'animate-pulse' : ''}`} />
                            <span className={`w-0.5 h-4 bg-[#44a320] rounded-full ${isStreaming ? 'animate-pulse [animation-delay:0.2s]' : ''}`} />
                            <span className={`w-0.5 h-2.5 bg-[#44a320] rounded-full ${isStreaming ? 'animate-pulse [animation-delay:0.4s]' : ''}`} />
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }}
                            className="p-0.5 hover:bg-neutral-100 rounded"
                        >
                            <ChevronUp size={14} className="text-neutral-500" />
                        </button>
                        <span className="text-[#44a320] font-semibold">{isStreaming ? 'Resume' : 'Paused'}</span>
                    </button>

                    {/* Right Ask Anything Bar */}
                    <div className="flex items-center bg-white border border-neutral-200 rounded-full shadow-md pl-4 pr-1.5 py-1 min-w-[380px]">
                        <input
                            type="text"
                            placeholder="Ask anything"
                            value={askQuery}
                            onChange={(e) => setAskQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && askQuery.trim()) {
                                    onProcess(chunks.map(c => c.text).join(' ') + `\n\nUser Question: ${askQuery}`);
                                    setAskQuery('');
                                }
                            }}
                            className="bg-transparent text-xs text-neutral-700 placeholder-neutral-400 outline-none flex-1 font-sans"
                        />
                        <button 
                            onClick={() => onProcess(chunks.map(c => c.text).join(' '))}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-neutral-200 text-[11px] font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
                        >
                            <FileText size={12} className="text-neutral-400" />
                            <span>Write follow up email</span>
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Granola Expanded Live Transcript Card (Image 1)
    return (
        <div className="fixed inset-x-0 bottom-6 flex flex-col items-center justify-center z-50 pointer-events-none px-4">
            <motion.div 
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20 }}
                className="w-full max-w-xl bg-white border border-neutral-200/90 rounded-[1.75rem] shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
            >
                {/* Header (Image 1) */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-100 bg-white">
                    <button className="text-neutral-400 hover:text-neutral-600 transition-colors p-1">
                        <Search size={14} />
                    </button>
                    
                    <span className="text-[11px] text-neutral-400 font-sans cursor-pointer hover:underline">
                        Always get consent when transcribing others. Learn more &gt;
                    </span>

                    <div className="flex items-center gap-1 text-neutral-400">
                        <button className="hover:text-neutral-600 p-1 transition-colors">
                            <ThumbsDown size={13} />
                        </button>
                        <button onClick={handleCopyAll} className="hover:text-neutral-600 p-1 transition-colors" title="Copy transcript">
                            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                        </button>
                        <button onClick={() => setIsMinimized(true)} className="hover:text-neutral-600 p-1 transition-colors" title="Minimize">
                            <Minus size={14} />
                        </button>
                    </div>
                </div>

                {/* Transcript Message List (Image 1) */}
                <div 
                    ref={scrollRef}
                    className="p-4 max-h-[38vh] min-h-[160px] overflow-y-auto space-y-2.5 bg-white font-sans"
                >
                    {chunks.length === 0 && !interimText && (
                        <div className="flex flex-col items-center justify-center py-10 text-neutral-400 text-xs">
                            <p>Listening for meeting audio & speech...</p>
                        </div>
                    )}

                    <AnimatePresence>
                        {chunks.map((chunk, idx) => (
                            <motion.div 
                                key={chunk.id}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col"
                            >
                                {idx === 2 && (
                                    <div className="text-[10px] text-neutral-400 text-center my-1.5 font-mono">
                                        {formatTime(recordingTime)}
                                    </div>
                                )}
                                
                                <div className="bg-[#f4f4ef] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed text-[#2c2c2c] max-w-[92%]">
                                    {chunk.text}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Live Streaming Interim Preview */}
                    {interimText && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-[#f4f4ef] rounded-xl px-3.5 py-2.5 text-[13px] text-neutral-500 italic max-w-[92%]"
                        >
                            {interimText} <span className="animate-pulse text-neutral-400">...</span>
                        </motion.div>
                    )}
                </div>

                {/* Bottom Control Bar (Image 1) */}
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-neutral-100 bg-white">
                    {/* Left: Waveform & Stop */}
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-0.5 h-4 px-1">
                            <span className={`w-0.5 h-3 bg-[#44a320] rounded-full ${isStreaming ? 'animate-pulse' : 'opacity-40'}`} />
                            <span className={`w-0.5 h-4 bg-[#44a320] rounded-full ${isStreaming ? 'animate-pulse [animation-delay:0.2s]' : 'opacity-40'}`} />
                            <span className={`w-0.5 h-2.5 bg-[#44a320] rounded-full ${isStreaming ? 'animate-pulse [animation-delay:0.4s]' : 'opacity-40'}`} />
                        </div>
                        
                        <button 
                            onClick={() => setIsStreaming(!isStreaming)}
                            className="text-neutral-500 hover:text-neutral-800 transition-colors p-0.5"
                            title={isStreaming ? "Pause recording" : "Resume recording"}
                        >
                            <Square size={13} className="fill-neutral-500" />
                        </button>
                    </div>

                    {/* Right: Mic & Language Selector (文A Multi ⌵) */}
                    <div className="flex items-center gap-3">
                        <button className="text-neutral-500 hover:text-neutral-800 transition-colors p-1">
                            <Mic size={14} />
                        </button>

                        <div className="relative">
                            <button 
                                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                                className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-900 font-medium px-2 py-1 rounded hover:bg-neutral-50 transition-colors"
                            >
                                <Languages size={13} className="text-neutral-500" />
                                <span>
                                    {selectedLanguage === 'auto'
                                        ? (detectedLanguage ? `Multi (${detectedLanguage})` : 'Multi')
                                        : (LANGUAGES.find(l => l.code === selectedLanguage)?.label || 'Language')}
                                </span>
                                <ChevronDown size={12} className="text-neutral-400" />
                            </button>

                            {isLangMenuOpen && (
                                <div className="absolute bottom-full right-0 mb-1.5 w-44 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 py-1 max-h-56 overflow-y-auto">
                                    {LANGUAGES.map(lang => (
                                        <button
                                            key={lang.code}
                                            onClick={() => handleLanguageChange(lang.code)}
                                            className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-neutral-100 transition-colors ${selectedLanguage === lang.code ? 'text-[#3d5a22] font-bold bg-[#f4f7ee]' : 'text-neutral-700'}`}
                                        >
                                            <span>{lang.label}</span>
                                            {selectedLanguage === lang.code && <span className="w-1.5 h-1.5 rounded-full bg-[#3d5a22]" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Bottom Caption (Image 1) */}
            <span className="text-[10px] text-neutral-400 mt-2">
                Bacham Meeting Assistant uses AI and can make mistakes.
            </span>
        </div>
    );
}
