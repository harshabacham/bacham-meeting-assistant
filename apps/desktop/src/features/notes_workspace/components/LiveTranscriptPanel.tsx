import { useState, useEffect, useRef, useCallback } from 'react';
import { 
    Copy, Minus, Sparkles, 
    ChevronUp, Check, X, Wand2, Volume2, Mic
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TauriClient } from '@/infrastructure/tauri-client';
import { emit } from '@tauri-apps/api/event';
import { cn } from '@/components';

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
}

export function LiveTranscriptPanel({ isOpen, onClose, onProcess, onInsertQuote }: LiveTranscriptPanelProps) {
    const [fullText, setFullText] = useState('');
    const [interimText, setInterimText] = useState('');
    const [isStreaming, setIsStreaming] = useState(true);
    const [isMinimized, setIsMinimized] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState('auto');
    const [recordingTime, setRecordingTime] = useState(0);
    const [copied, setCopied] = useState(false);
    const [isPolishing, setIsPolishing] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);

    const scrollRef = useRef<HTMLDivElement>(null);
    const recRef = useRef<any>(null);
    const isActiveRef = useRef(false);
    const langRef = useRef('en-US');

    const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    useEffect(() => {
        if (!isOpen || !isStreaming) return;
        const t = setInterval(() => setRecordingTime(p => p + 1), 1000);
        return () => clearInterval(t);
    }, [isOpen, isStreaming]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [fullText, interimText]);

    useEffect(() => {
        setAudioLevel(interimText ? Math.min(100, interimText.length * 4) : 0);
    }, [interimText]);

    const startRecognition = useCallback(() => {
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR || !isActiveRef.current) return;

        if (recRef.current) {
            try { recRef.current.abort(); } catch (_) {}
            recRef.current = null;
        }

        const rec = new SR();
        rec.continuous = true;
        rec.interimResults = true;
        rec.maxAlternatives = 1;
        rec.lang = langRef.current;

        rec.onresult = (e: any) => {
            if (!isActiveRef.current) return;
            let interim = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const t = e.results[i][0].transcript;
                if (e.results[i].isFinal) {
                    const word = t.trim();
                    if (word) {
                        setFullText(prev => prev ? prev + ' ' + word : word);
                        setInterimText('');
                        emit('live_caption_received', {
                            sessionId: 'live-session',
                            text: word,
                            timestamp: Date.now(),
                            platform: 'desktop'
                        }).catch(() => {});
                    }
                } else {
                    interim += t;
                }
            }
            setInterimText(interim);
        };

        rec.onerror = (e: any) => {
            if (e.error === 'not-allowed') return;
            if (isActiveRef.current) setTimeout(() => startRecognition(), 300);
        };

        rec.onend = () => {
            recRef.current = null;
            if (isActiveRef.current) setTimeout(() => startRecognition(), 50);
        };

        try {
            rec.start();
            recRef.current = rec;
        } catch (_) {
            setTimeout(() => startRecognition(), 500);
        }
    }, []);

    // Start/stop when panel opens or closes
    useEffect(() => {
        if (!isOpen) {
            isActiveRef.current = false;
            if (recRef.current) {
                try { recRef.current.abort(); } catch (_) {}
                recRef.current = null;
            }
            setFullText('');
            setInterimText('');
            setRecordingTime(0);
            TauriClient.stopNativeRecording().catch(() => {});
            return;
        }

        isActiveRef.current = true;
        TauriClient.startNativeRecording().catch(() => {});
        const langEntry = MULTILINGUAL_CATALOG.find(l => l.code === selectedLanguage);
        langRef.current = langEntry?.bcp || 'en-US';
        startRecognition();

        return () => {
            isActiveRef.current = false;
            if (recRef.current) {
                try { recRef.current.abort(); } catch (_) {}
                recRef.current = null;
            }
            TauriClient.stopNativeRecording().catch(() => {});
        };
    }, [isOpen, selectedLanguage, startRecognition]);

    // Pause / resume
    useEffect(() => {
        if (!isOpen) return;
        if (isStreaming) {
            isActiveRef.current = true;
            startRecognition();
        } else {
            isActiveRef.current = false;
            if (recRef.current) {
                try { recRef.current.abort(); } catch (_) {}
                recRef.current = null;
            }
            setInterimText('');
        }
    }, [isStreaming, isOpen, startRecognition]);

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
                `Fix speech-to-text errors in this transcript while preserving all content:\n\n${fullText}`
            );
            if (result) setFullText(result);
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
                        className="w-[520px] max-w-[92vw] bg-[#111113] border border-white/[0.08] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-white/[0.07] flex items-center justify-between bg-[#141416]">
                            <div className="flex items-center gap-2.5">
                                <span className={cn("w-2 h-2 rounded-full shrink-0", isStreaming ? "bg-emerald-400 animate-pulse" : "bg-zinc-500")} />
                                <span className="text-[13px] font-semibold text-zinc-100">
                                    {isStreaming ? 'Live Transcript' : 'Paused'}
                                </span>

                                <div className="flex items-center gap-[3px] h-4 ml-1">
                                    {[0.2, 0.5, 0.35, 0.65, 0.45, 0.3, 0.55].map((factor, i) => (
                                        <span
                                            key={i}
                                            className={cn("w-[3px] rounded-full transition-all duration-75", isStreaming && audioLevel > 5 ? "bg-emerald-400" : "bg-zinc-700")}
                                            style={{ height: isStreaming && audioLevel > 5 ? `${Math.max(3, Math.min(14, audioLevel * factor * 0.2 + 3))}px` : '3px' }}
                                        />
                                    ))}
                                </div>

                                <span className="text-[11px] text-zinc-500 font-mono tabular-nums">{formatTime(recordingTime)}</span>

                                <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                    <Volume2 size={10} />
                                    Mic
                                </span>
                            </div>

                            <div className="flex items-center gap-1">
                                <button type="button" onClick={handleCopyAll} disabled={!fullText}
                                    className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors cursor-pointer disabled:opacity-30"
                                    title="Copy transcript">
                                    {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                                </button>
                                <button type="button" onClick={() => setIsMinimized(true)}
                                    className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors cursor-pointer">
                                    <Minus size={13} />
                                </button>
                                <button type="button" onClick={onClose}
                                    className="p-1.5 rounded-md text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer">
                                    <X size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Transcript body — single flowing paragraph */}
                        <div
                            ref={scrollRef}
                            className="px-6 py-5 max-h-[46vh] min-h-[200px] overflow-y-auto bg-[#0D0D0F] scroll-smooth"
                        >
                            {!fullText && !interimText ? (
                                <div className="flex flex-col items-center justify-center min-h-[160px] gap-3 text-center select-none">
                                    <div className="w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center">
                                        <Mic size={15} className="text-zinc-500" />
                                    </div>
                                    <div>
                                        <p className="text-[13px] font-medium text-zinc-400 mb-1">
                                            {isStreaming ? 'Listening...' : 'Paused'}
                                        </p>
                                        <p className="text-[11px] text-zinc-600 max-w-[220px] leading-relaxed">
                                            Everything spoken will appear here as continuous text.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-[15px] leading-[1.9] text-zinc-100 font-normal select-text tracking-[-0.01em]">
                                    {fullText}
                                    {fullText && interimText ? ' ' : ''}
                                    {interimText && (
                                        <span className="text-zinc-400">
                                            {interimText}
                                            <span className="inline-block w-[2px] h-[15px] ml-[2px] bg-emerald-400 animate-pulse align-middle rounded-sm" />
                                        </span>
                                    )}
                                    {!interimText && fullText && (
                                        <span className="inline-block w-[2px] h-[15px] ml-[2px] bg-zinc-600/60 align-middle rounded-sm" />
                                    )}
                                </p>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06] bg-[#141416]">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsStreaming(p => !p)}
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
                                    className="text-[11px] text-zinc-500 bg-transparent border-none outline-none cursor-pointer hover:text-zinc-300 transition-colors"
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
                                    <button type="button" onClick={handlePolish} disabled={isPolishing}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.09] text-zinc-300 text-xs font-medium transition-all cursor-pointer disabled:opacity-40 border border-white/[0.07]">
                                        <Wand2 size={11} className={cn("text-amber-400", isPolishing && "animate-spin")} />
                                        {isPolishing ? 'Fixing...' : 'AI Fix'}
                                    </button>
                                )}
                                <button type="button" onClick={handleGenerateNotes} disabled={!fullText}
                                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-white hover:bg-zinc-100 text-zinc-900 text-xs font-semibold transition-all cursor-pointer shadow-sm disabled:opacity-40">
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
