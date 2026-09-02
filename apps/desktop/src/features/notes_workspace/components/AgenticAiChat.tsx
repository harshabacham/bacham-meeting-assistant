import React, { useState, useEffect, useRef } from 'react';
import { 
    Sparkles, X, Minimize2, Maximize2, Plus, 
    Copy, Check, RefreshCw, ArrowUp, FileText, CheckSquare, 
    Target, Mail, Bot, Square, Play, Pause, Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/components';
import { TauriClient } from '@/infrastructure/tauri-client';

export interface AiRecipe {
    id: string;
    shortTitle: string;
    title: string;
    icon: React.ElementType;
    prompt: (contextName: string) => string;
}

interface AgenticAiChatProps {
    contextName: string;
    contextText?: string;
    recipes: AiRecipe[];
    position?: 'fixed' | 'absolute' | 'relative';
    className?: string;
    isRecordingOpen?: boolean;
    isRecording?: boolean;
    onToggleRecording?: () => void;
    onStopRecording?: () => void;
    onInsertToEditor?: (content: string) => void;
    placeholder?: string;
}

const DEFAULT_GRANOLA_CHIPS = [
    { label: 'Summarize', icon: FileText, prompt: 'Provide a concise, executive summary of these meeting notes with main decisions.' },
    { label: 'Action Items', icon: CheckSquare, prompt: 'Extract all action items, assignees, and next steps from these notes in bullet points.' },
    { label: 'Key Decisions', icon: Target, prompt: 'Highlight the key decisions agreed upon during this discussion.' },
    { label: 'Follow-up Email', icon: Mail, prompt: 'Draft a professional follow-up email to all meeting attendees summarizing the discussion.' },
];

export function AgenticAiChat({ 
    contextName, 
    contextText: _contextText, 
    recipes: customRecipes, 
    className,
    position,
    isRecordingOpen,
    isRecording,
    onToggleRecording,
    onStopRecording,
    onInsertToEditor,
    placeholder
}: AgenticAiChatProps) {
    const [expanded, setExpanded] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [transcript, setTranscript] = useState<{ role: 'user' | 'ai', content: string }[]>([]);
    
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (expanded && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [transcript, expanded, fullscreen]);

    const handleAskAi = async (customQuery?: string) => {
        const query = customQuery || inputText;
        if (!query.trim() || loading) return;

        setExpanded(true);
        if (!customQuery) setInputText('');
        
        setTranscript(prev => [...prev, { role: 'user', content: query }]);
        setLoading(true);

        try {
            const responseText = await TauriClient.sendGlobalMemoryChat(
                query, 
                transcript.map(t => ({ role: t.role, content: t.content }))
            );

            setTranscript(prev => [...prev, {
                role: 'ai',
                content: responseText || `I've analyzed your notes.`
            }]);
        } catch (err) {
            console.error('Failed to ask AI', err);
            const errMsg = err instanceof Error ? err.message : String(err);
            setTranscript(prev => [...prev, {
                role: 'ai',
                content: `⚠️ Failed to reach AI assistant: ${errMsg}. Please check your API key in Settings.`
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyMessage = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleAskAi();
    };

    const activeRecipes = customRecipes && customRecipes.length > 0 
        ? customRecipes.map(r => ({ label: r.shortTitle, icon: r.icon, prompt: r.prompt(contextName) }))
        : DEFAULT_GRANOLA_CHIPS;

    return (
        <>
            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {/* 1. EXPANDED GRANOLA AI COPILOT DRAWER                                  */}
            {/* ═══════════════════════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.96 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
                        className={cn(
                            "fixed z-50 bg-[var(--surface)]/95 backdrop-blur-2xl border border-[var(--border)] shadow-[0_24px_70px_rgba(0,0,0,0.28)] flex flex-col overflow-hidden font-sans",
                            fullscreen 
                                ? "inset-6 rounded-2xl" 
                                : "right-6 bottom-6 w-[440px] max-w-[calc(100vw-3rem)] h-[580px] max-h-[calc(100vh-5rem)] rounded-2xl"
                        )}
                    >
                        {/* Granola Minimalist Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)]/50 shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-md bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)]">
                                    <Sparkles size={12} />
                                </div>
                                <span className="text-xs font-semibold text-[var(--text-primary)] truncate max-w-[220px]">
                                    {contextName || 'Note Assistant'}
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-1 text-[var(--text-muted)]">
                                <button 
                                    type="button"
                                    onClick={() => setFullscreen(!fullscreen)}
                                    className="p-1.5 hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-md transition-colors cursor-pointer"
                                    title={fullscreen ? "Restore size" : "Expand window"}
                                >
                                    {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setExpanded(false);
                                        setFullscreen(false);
                                    }}
                                    className="p-1.5 hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-md transition-colors cursor-pointer"
                                    title="Close assistant"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Chat Timeline */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs leading-relaxed scroll-smooth">
                            {transcript.length === 0 && !loading && (
                                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[var(--text-muted)] gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] shadow-xs">
                                        <Bot size={20} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-[var(--text-primary)] text-sm mb-1">Granola AI Assistant</p>
                                        <p className="text-xs text-[var(--text-muted)] max-w-xs leading-normal">
                                            Ask questions, generate meeting summaries, or extract action items directly into your notes.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {transcript.map((msg, i) => (
                                <div key={i} className="flex flex-col gap-1.5">
                                    {msg.role === 'user' ? (
                                        <div className="ml-auto bg-[var(--text-primary)] text-[var(--bg)] font-medium px-4 py-2.5 rounded-2xl rounded-tr-xs max-w-[85%] shadow-xs text-xs leading-relaxed">
                                            {msg.content}
                                        </div>
                                    ) : (
                                        <div className="mr-auto w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl rounded-tl-xs p-4 shadow-xs flex flex-col gap-2.5">
                                            <div 
                                                className="text-[var(--text-primary)] leading-relaxed space-y-2 text-xs font-sans prose prose-neutral dark:prose-invert max-w-none"
                                                dangerouslySetInnerHTML={{ 
                                                    __html: msg.content
                                                        .replace(/^### (.*$)/gim, '<h4 class="text-[13px] font-semibold text-[var(--text-primary)] mt-2 mb-1">$1</h4>')
                                                        .replace(/^## (.*$)/gim, '<h3 class="text-[14px] font-semibold text-[var(--text-primary)] mt-3 mb-1.5 pb-1 border-b border-[var(--border)]">$1</h3>')
                                                        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-[var(--text-primary)]">$1</strong>')
                                                        .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc text-xs text-[var(--text-secondary)]">$1</li>')
                                                        .replace(/\n/g, '<br/>')
                                                }}
                                            />
                                            
                                            {/* Action bar on AI response */}
                                            <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)] text-[11px] text-[var(--text-muted)]">
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyMessage(msg.content, i)}
                                                    className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors cursor-pointer px-2 py-1 rounded hover:bg-[var(--surface-hover)]"
                                                >
                                                    {copiedIndex === i ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                                    <span>{copiedIndex === i ? 'Copied' : 'Copy'}</span>
                                                </button>
                                                
                                                {onInsertToEditor && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onInsertToEditor(msg.content)}
                                                        className="flex items-center gap-1 text-[var(--accent)] hover:underline font-semibold ml-auto cursor-pointer px-2 py-1 rounded hover:bg-[var(--accent-dim)]"
                                                    >
                                                        <Plus size={12} />
                                                        <span>Insert to Note</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {loading && (
                                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 w-fit shadow-xs">
                                    <RefreshCw size={13} className="text-[var(--accent)] animate-spin" />
                                    <span>Synthesizing response...</span>
                                </div>
                            )}

                            <div ref={bottomRef} className="h-2" />
                        </div>

                        {/* Bottom Input & Quick Suggestion Chips */}
                        <div className="p-3 border-t border-[var(--border)] bg-[var(--surface)]/80 shrink-0">
                            {/* Suggestion Chips */}
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 no-scrollbar">
                                {activeRecipes.map((item) => (
                                    <button
                                        type="button"
                                        key={item.label}
                                        onClick={() => handleAskAi(item.prompt)}
                                        className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer shadow-2xs"
                                    >
                                        <item.icon size={11} className="text-[var(--accent)]" />
                                        <span>{item.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Main Input Field */}
                            <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-[var(--bg)] border border-[var(--border)] focus-within:border-[var(--text-primary)] rounded-xl pl-3.5 pr-1.5 py-1 transition-all shadow-inner">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={inputText}
                                    onChange={e => setInputText(e.target.value)}
                                    placeholder={placeholder || "Ask AI anything about this note..."}
                                    className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 shadow-none text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-medium py-1.5"
                                />
                                <button 
                                    type="submit" 
                                    disabled={loading || !inputText.trim()}
                                    className="p-1.5 bg-[var(--text-primary)] hover:bg-[var(--text-secondary)] disabled:opacity-30 text-[var(--bg)] rounded-lg transition-all shrink-0 cursor-pointer shadow-xs"
                                >
                                    <ArrowUp size={13} className="font-bold" />
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {/* 2. PREMIUM DARK AI CHAT DOCK (UNEXPANDED)                               */}
            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {!expanded && (
                <div className={cn(
                    position === 'relative' 
                        ? "w-full max-w-2xl mx-auto px-4 pointer-events-auto mt-6" 
                        : `absolute bottom-10 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4 pointer-events-auto`,
                    className
                )}>
                    <motion.div 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full flex flex-col items-center justify-center gap-3"
                    >
                        {/* Recording Controls (Visible when active) */}
                        {isRecordingOpen && (
                            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-1.5 flex items-center gap-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
                                <div className="flex items-center justify-center w-10 h-8 gap-0.5 px-2">
                                    {isRecording ? (
                                        <>
                                            <span className="w-[3px] h-3 bg-red-500 rounded-full animate-[pulse_1s_ease-in-out_infinite]" />
                                            <span className="w-[3px] h-4 bg-red-500 rounded-full animate-[pulse_1.2s_ease-in-out_infinite_100ms]" />
                                            <span className="w-[3px] h-3 bg-red-500 rounded-full animate-[pulse_0.9s_ease-in-out_infinite_200ms]" />
                                        </>
                                    ) : (
                                        <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full" />
                                    )}
                                </div>
                                
                                <button
                                    type="button"
                                    onClick={onToggleRecording}
                                    className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-[var(--surface-hover)] hover:bg-[var(--surface-raised)] text-[var(--text-primary)] text-[14px] font-medium transition-colors cursor-pointer"
                                >
                                    {isRecording ? (
                                        <>
                                            <Pause fill="currentColor" size={13} className="text-[var(--text-muted)]" />
                                            <span>Pause</span>
                                        </>
                                    ) : (
                                        <>
                                            <Play fill="currentColor" size={13} className="text-[var(--accent)]" />
                                            <span>Resume</span>
                                        </>
                                    )}
                                </button>

                                {isRecording && (
                                    <button
                                        type="button"
                                        onClick={onStopRecording}
                                        className="flex items-center gap-2 px-4 py-1.5 rounded-xl hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-red-500 text-[14px] font-medium transition-colors cursor-pointer"
                                    >
                                        <Square fill="currentColor" size={12} />
                                        <span>Stop</span>
                                    </button>
                                )}
                            </div>
                        )}
                        
                        {/* Ask AI Input Field - Theme Adapting Pill */}
                        <div className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-[24px] p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.3)] transition-all hover:border-[var(--border-accent)] focus-within:border-[var(--text-muted)] focus-within:bg-[var(--bg)] group backdrop-blur-xl">
                            <form onSubmit={handleSubmit} className="flex flex-1 items-center">
                                <div className="pl-4 text-[var(--text-muted)] shrink-0">
                                    <Sparkles size={16} />
                                </div>
                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={e => setInputText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && inputText.trim()) {
                                            handleSubmit(e);
                                        }
                                    }}
                                    placeholder={placeholder || "Ask AI about this meeting..."}
                                    className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 shadow-none text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-normal px-3 py-2.5"
                                />
                                <div className="pr-1 flex items-center shrink-0">
                                    <button 
                                        type={inputText.trim() ? "submit" : "button"}
                                        className={cn(
                                            "w-9 h-9 flex items-center justify-center rounded-full transition-all cursor-pointer",
                                            inputText.trim() 
                                                ? "bg-[var(--accent)] text-white hover:scale-105 shadow-[0_0_15px_rgba(var(--accent-rgb),0.4)]" 
                                                : "bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]"
                                        )}
                                    >
                                        {inputText.trim() ? <ArrowUp size={16} strokeWidth={2.5} /> : <Send size={15} />}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </div>
            )}
        </>
    );
}
