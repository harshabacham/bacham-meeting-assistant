import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Maximize2, History, CheckCircle2, ChevronRight, Mic, LayoutGrid, X, RefreshCw, Minimize2, Plus, Copy, Check } from 'lucide-react';
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
    onInsertToEditor?: (content: string) => void;
}

export function AgenticAiChat({ 
    contextName, 
    contextText: _contextText, 
    recipes, 
    className,
    onInsertToEditor 
}: AgenticAiChatProps) {
    const [expanded, setExpanded] = useState(false);
    const [focused, setFocused] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [recipesExpanded, setRecipesExpanded] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    
    // Feature Toggles
    const [autoEnabled, setAutoEnabled] = useState(true);
    
    // Agentic Progress State
    const [progressSteps, setProgressSteps] = useState<{ id: string, text: string, status: 'pending'|'done' }[]>([]);
    
    // Chat History
    const [transcript, setTranscript] = useState<{ role: 'user' | 'ai', content: string }[]>([]);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (expanded && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [transcript, progressSteps, expanded, fullscreen]);

    const handleAskAi = async (customQuery?: string) => {
        const query = customQuery || inputText;
        if (!query.trim() || loading) return;

        setExpanded(true);
        if (!customQuery) setInputText('');
        
        setTranscript(prev => [...prev, { role: 'user', content: query }]);
        setLoading(true);

        try {
            setProgressSteps([
                { id: '1', text: `Analyzing "${contextName}"`, status: 'pending' }
            ]);

            let responseText = await TauriClient.sendGlobalMemoryChat(
                query, 
                transcript.map(t => ({ role: t.role, content: t.content }))
            );
            
            // Handle actionable AI output
            const actionMatch = responseText.match(/<action>([\s\S]*?)<\/action>/);
            if (actionMatch) {
                try {
                    const actionData = JSON.parse(actionMatch[1]);
                    if (actionData.type === 'composio') {
                        setProgressSteps(prev => [...prev, { id: 'action', text: `Executing action: ${actionData.task}`, status: 'pending' }]);
                        await TauriClient.pushToComposio(actionData.task, "Harsha", "high", actionData.destination || 'calendar');
                        responseText = responseText.replace(actionMatch[0], "\n\n✅ **Action successfully executed via Composio:** " + actionData.task);
                        setProgressSteps(prev => prev.map(s => s.id === 'action' ? { ...s, status: 'done' } : s));
                    }
                } catch (e) {
                    console.error("Failed to parse action JSON:", e);
                }
            }
            
            setProgressSteps(prev => prev.map(s => s.id === '1' ? { ...s, status: 'done' } : s));

            await new Promise(r => setTimeout(r, 200));
            setProgressSteps([]);

            setTranscript(prev => [...prev, {
                role: 'ai',
                content: responseText || `Finished request.`
            }]);
        } catch (err) {
            console.error('Failed to ask AI', err);
            setProgressSteps([]);
            const errMsg = err instanceof Error ? err.message : String(err);
            setTranscript(prev => [...prev, {
                role: 'ai',
                content: `⚠️ Failed to contact AI assistant: ${errMsg}. Please verify your API key in Settings.`
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

    return (
        <>
            {/* 1. Right Copilot Side Drawer when Expanded */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ opacity: 0, x: 50, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 40, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className={cn(
                            "fixed z-50 bg-[var(--surface)] border border-[var(--border)] shadow-2xl flex flex-col overflow-hidden",
                            fullscreen 
                                ? "inset-6 rounded-3xl" 
                                : "right-6 bottom-6 w-[430px] max-w-[calc(100vw-3rem)] h-[560px] max-h-[calc(100vh-5rem)] rounded-[1.75rem]"
                        )}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-raised)] shrink-0">
                            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                                <Sparkles size={14} className="text-[var(--accent)]" />
                                <span className="truncate max-w-[200px]">AI Assistant &bull; {contextName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[var(--text-muted)]">
                                <button 
                                    type="button"
                                    onClick={() => setFullscreen(!fullscreen)}
                                    className="p-1 hover:text-[var(--text-primary)] transition-colors rounded hover:bg-[var(--surface-hover)] cursor-pointer"
                                    title={fullscreen ? "Restore size" : "Maximize"}
                                >
                                    {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setExpanded(false);
                                        setFullscreen(false);
                                        setFocused(false);
                                    }}
                                    className="p-1 hover:text-[var(--text-primary)] transition-colors rounded hover:bg-[var(--surface-hover)] cursor-pointer"
                                    title="Close Copilot"
                                >
                                    <X size={15} />
                                </button>
                            </div>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs scroll-smooth">
                            {transcript.length === 0 && !loading && (
                                <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] gap-2 py-12">
                                    <Sparkles size={28} className="opacity-40 text-[var(--accent)]" />
                                    <p className="font-medium text-center">Ask questions, request summaries, or organize your thoughts on this note.</p>
                                </div>
                            )}

                            {transcript.map((msg, i) => (
                                <div key={i} className="flex flex-col gap-1.5">
                                    {msg.role === 'user' ? (
                                        <div className="ml-auto bg-[var(--accent)] text-[#0A0A0C] font-semibold px-3.5 py-2 rounded-2xl rounded-tr-xs max-w-[85%] shadow-xs text-xs leading-relaxed">
                                            {msg.content}
                                        </div>
                                    ) : (
                                        <div className="mr-auto bg-[var(--surface-raised)] border border-[var(--border)] rounded-2xl rounded-tl-xs p-3.5 max-w-[95%] shadow-xs flex flex-col gap-2">
                                            <div 
                                                className="text-[var(--text-primary)] leading-relaxed space-y-2 text-xs"
                                                dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>') }}
                                            />
                                            {/* Action bar on AI response */}
                                            <div className="flex items-center gap-2 pt-1 mt-1 border-t border-[var(--border)] text-[11px] text-[var(--text-muted)]">
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyMessage(msg.content, i)}
                                                    className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                                                >
                                                    {copiedIndex === i ? <Check size={12} className="text-[var(--accent)]" /> : <Copy size={12} />}
                                                    <span>{copiedIndex === i ? 'Copied' : 'Copy'}</span>
                                                </button>
                                                {onInsertToEditor && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onInsertToEditor(msg.content)}
                                                        className="flex items-center gap-1 text-[var(--accent)] hover:underline font-semibold ml-auto cursor-pointer"
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

                            {progressSteps.length > 0 && (
                                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl px-3 py-2">
                                    <RefreshCw size={12} className="text-[var(--accent)] animate-spin" />
                                    <span>{progressSteps[0].text}...</span>
                                </div>
                            )}

                            <div ref={bottomRef} className="h-2" />
                        </div>

                        {/* Bottom Input inside Copilot */}
                        <div className="p-3 border-t border-[var(--border)] bg-[var(--surface-raised)]">
                            {/* Prompt Chips */}
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 no-scrollbar">
                                {['Summarize', 'Action items', 'Follow-up'].map((promptText) => (
                                    <button
                                        type="button"
                                        key={promptText}
                                        onClick={() => handleAskAi(`Can you generate ${promptText.toLowerCase()} for this note?`)}
                                        className="shrink-0 px-2.5 py-1 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] hover:opacity-80 text-[11px] font-semibold transition-colors cursor-pointer"
                                    >
                                        {promptText}
                                    </button>
                                ))}
                            </div>

                            <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-full pl-3.5 pr-1.5 py-1">
                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={e => setInputText(e.target.value)}
                                    placeholder="Ask anything..."
                                    className="flex-1 bg-transparent border-none outline-none text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-medium py-1"
                                />
                                <button 
                                    type="submit" 
                                    disabled={loading || !inputText.trim()}
                                    className="p-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 text-[#0A0A0C] rounded-full transition-colors shrink-0 cursor-pointer"
                                >
                                    <Send size={12} className={loading ? "animate-pulse" : ""} />
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 2. Floating Centered Bottom Pill when Minimized (Never shifts vertically) */}
            {!expanded && (
                <div 
                    className={cn(
                        "fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4 pointer-events-auto",
                        className
                    )}
                >
                    <div 
                        className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-full shadow-xl p-1.5 flex flex-col transition-all duration-300"
                        onMouseDown={(e) => {
                            if ((e.target as HTMLElement).tagName !== 'INPUT') {
                                e.stopPropagation();
                            }
                        }}
                    >
                        {/* Recipes bar when focused */}
                        {focused && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="flex flex-col gap-1.5 overflow-x-auto px-2 pb-2 mb-1 border-b border-[var(--border)] no-scrollbar"
                            >
                                <div className="flex items-center gap-2">
                                    <History size={13} className="text-[var(--text-muted)] shrink-0" />
                                    {recipes.slice(0, recipesExpanded ? recipes.length : 3).map(recipe => (
                                        <button
                                            type="button"
                                            key={recipe.id}
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => handleAskAi(recipe.prompt(contextName))}
                                            className="flex items-center gap-1 shrink-0 px-2 py-1 rounded text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                                        >
                                            <recipe.icon size={12} className="opacity-70" />
                                            <span>{recipe.shortTitle}</span>
                                        </button>
                                    ))}
                                    {recipes.length > 3 && (
                                        <button 
                                            type="button"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => setRecipesExpanded(!recipesExpanded)}
                                            className="flex items-center gap-1 shrink-0 px-2 py-1 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] ml-auto cursor-pointer"
                                        >
                                            <LayoutGrid size={12} />
                                            <span>{recipesExpanded ? 'Less' : 'More'}</span>
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* Input Row */}
                        <div className="flex items-center gap-2 px-3 py-1">
                            <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2 min-w-0">
                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={e => setInputText(e.target.value)}
                                    onFocus={() => setFocused(true)}
                                    onBlur={() => {
                                        setTimeout(() => {
                                            if (!inputText.trim()) setFocused(false);
                                        }, 200);
                                    }}
                                    placeholder="Continue chat or ask anything..."
                                    className="flex-1 bg-transparent border-none outline-none text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-medium truncate py-1"
                                />
                                {inputText.trim() && (
                                    <button 
                                        type="submit" 
                                        disabled={loading}
                                        className="p-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[#0A0A0C] font-bold rounded-full transition-colors shrink-0 cursor-pointer"
                                    >
                                        <Send size={12} className={loading ? "animate-pulse" : ""} />
                                    </button>
                                )}
                            </form>

                            {/* Right side prompt chip when unfocused */}
                            {(!focused && recipes.length > 0 && !inputText.trim()) && (
                                <button
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => handleAskAi(recipes[0].prompt(contextName))}
                                    className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all ml-auto bg-[var(--surface)] shadow-xs cursor-pointer"
                                >
                                    {React.createElement(recipes[0].icon, { size: 12, className: "text-[var(--accent)]" })}
                                    <span>{recipes[0].shortTitle}</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
