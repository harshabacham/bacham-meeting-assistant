import { useState, useEffect, useRef } from 'react';
import { Search, SlidersHorizontal, Minus, Mic, Sparkles, ChevronDown, CheckSquare, Target } from 'lucide-react';
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
    const [isStreaming, setIsStreaming] = useState(true);
    const [modelStatus, setModelStatus] = useState<string>('idle');
    const [modelProgress, setModelProgress] = useState<any>(null);
    const [debugLogs, setDebugLogs] = useState<string[]>(['Panel Mounted']);
    const scrollRef = useRef<HTMLDivElement>(null);
    const workerRef = useRef<Worker | null>(null);

    const addDebug = (msg: string) => setDebugLogs(prev => [...prev.slice(-10), msg]);

    // Initialize Web Worker and Audio Capture
    useEffect(() => {
        if (!isOpen) {
            setChunks([]);
            TauriClient.stopNativeRecording();
            if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
            }
            return;
        }

        // 1. Start Rust Dual-Capture
        TauriClient.startNativeRecording();

        // 2. Initialize Transformers.js Web Worker
        workerRef.current = new Worker(new URL('../../../workers/whisper.worker.ts', import.meta.url), {
            type: 'module'
        });

        workerRef.current.onmessage = (e) => {
            const { type, status, progress, payload, error } = e.data;
            if (type === 'STATUS') {
                setModelStatus(status);
                addDebug(`Worker Status: ${status}`);
                if (error) {
                    console.error("Whisper Error:", error);
                    addDebug(`Worker Error: ${error}`);
                }
            } else if (type === 'PROGRESS') {
                setModelProgress(progress);
            } else if (type === 'TRANSCRIPT') {
                addDebug(`Transcript Received: ${payload.text.substring(0, 20)}...`);
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

        workerRef.current.postMessage({ type: 'INIT' });
        addDebug('Sent INIT to worker');

        // 3. Listen to audio streams from Rust
        let unlistenSys: () => void;
        let unlistenMic: () => void;
        
        let sysChunkCount = 0;
        let micChunkCount = 0;

        import('@tauri-apps/api/event').then(({ listen }) => {
            listen<{rate: number, channels: number, data: number[]}>('audio_stream_sys', (event) => {
                sysChunkCount++;
                if (sysChunkCount % 50 === 0) addDebug(`Sys Audio Chunks: ${sysChunkCount}`);
                if (isStreaming && workerRef.current) {
                    workerRef.current.postMessage({ type: 'AUDIO_CHUNK', payload: event.payload.data, sampleRate: event.payload.rate, channels: event.payload.channels });
                }
            }).then(u => { unlistenSys = u; addDebug('Sys Listener Attached'); });
            
            listen<{rate: number, channels: number, data: number[]}>('audio_stream_mic', (event) => {
                micChunkCount++;
                if (micChunkCount % 50 === 0) addDebug(`Mic Audio Chunks: ${micChunkCount}`);
                if (isStreaming && workerRef.current) {
                    workerRef.current.postMessage({ type: 'AUDIO_CHUNK', payload: event.payload.data, sampleRate: event.payload.rate, channels: event.payload.channels });
                }
            }).then(u => { unlistenMic = u; addDebug('Mic Listener Attached'); });
        });

        return () => {
            TauriClient.stopNativeRecording();
            if (workerRef.current) workerRef.current.terminate();
            if (unlistenSys) unlistenSys();
            if (unlistenMic) unlistenMic();
        };
    }, [isOpen, isStreaming]);

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
                    <Search size={14} className="text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-primary)] transition-colors" />
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
                    
                    {/* DEBUG PANEL */}
                    <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                        <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-2">Diagnostic Logs</h4>
                        <ul className="space-y-1">
                            {debugLogs.map((log, i) => (
                                <li key={i} className="text-[10px] text-red-200 font-mono">{log}</li>
                            ))}
                        </ul>
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
