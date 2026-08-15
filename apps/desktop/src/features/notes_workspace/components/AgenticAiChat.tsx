import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Maximize2, History, CheckCircle2, ChevronRight, Mic, LayoutGrid, X, RefreshCw, Minimize2 } from 'lucide-react';
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
}

export function AgenticAiChat({ contextName, contextText: _contextText, recipes, position = 'fixed', className }: AgenticAiChatProps) {
    const [expanded, setExpanded] = useState(false);
    const [focused, setFocused] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [recipesExpanded, setRecipesExpanded] = useState(false);
    
    // Feature Toggles
    const [autoEnabled, setAutoEnabled] = useState(true);
    const [micEnabled, setMicEnabled] = useState(false);
    
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
                { id: '1', text: `Analyzing query for "${contextName}"`, status: 'pending' }
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
            setTranscript(prev => [...prev, {
                role: 'ai',
                content: 'Failed to contact AI assistant. Please check your AI provider settings.'
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleAskAi();
    };

    return (
        <div className={cn(
            "z-50 w-full px-4 flex flex-col items-center mx-auto",
            position === 'relative' ? "relative" : `${position} bottom-6 left-1/2 -translate-x-1/2`,
            fullscreen ? "max-w-5xl h-[85vh] !bottom-auto !top-1/2 -translate-y-1/2" : "max-w-2xl",
            className
        )}>
            {/* Expanded Chat Window */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.97 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className={cn(
                            "w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-3xl p-5 mb-4 shadow-sm flex flex-col overflow-hidden transition-all duration-300",
                            fullscreen ? "flex-1 h-full" : "h-[500px]"
                        )}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between pb-3 mb-2 shrink-0">
                            <div className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-sm font-semibold">
                                <History size={16} />
                                {fullscreen && <span>Chat History</span>}
                            </div>
                            <div className="flex items-center gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setFullscreen(!fullscreen)}
                                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                    title={fullscreen ? "Restore" : "Maximize"}
                                >
                                    {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setExpanded(false);
                                        setFullscreen(false);
                                        setFocused(false);
                                    }}
                                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                    title="Close"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                        
                        {/* Chat History & Progress */}
                        <div className="flex-1 overflow-y-auto space-y-6 pr-2 -mr-2 scroll-smooth">
                            {transcript.length === 0 && !loading && (
                                <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)]">
                                    <Sparkles size={32} className="mb-4 opacity-50" />
                                    <p className="text-sm font-medium">How can I help with {contextName}?</p>
                                </div>
                            )}

                            {transcript.map((msg, i) => (
                                <div key={i} className="flex flex-col">
                                    {msg.role === 'user' ? (
                                        <div className="ml-auto bg-[var(--bg)] border border-[var(--border)] px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm font-bold text-[var(--text-primary)] max-w-[80%] shadow-sm">
                                            {msg.content}
                                        </div>
                                    ) : (
                                        <div className="mr-auto px-1 text-sm text-[var(--text-primary)] leading-relaxed max-w-[95%]">
                                            <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>') }} />
                                        </div>
                                    )}
                                </div>
                            ))}

                            {progressSteps.length > 0 && (
                                <div className="mr-auto px-1 flex flex-col gap-2 mt-4 max-w-[80%]">
                                    {progressSteps.map((step) => (
                                        <div key={step.id} className="flex items-center gap-2 text-sm">
                                            {step.status === 'done' ? (
                                                <CheckCircle2 size={16} className="text-[var(--text-muted)]" />
                                            ) : (
                                                <RefreshCw size={14} className="text-[var(--accent)] animate-spin ml-0.5 mr-0.5" />
                                            )}
                                            <span className={step.status === 'done' ? 'text-[var(--text-muted)] font-medium' : 'text-[var(--text-primary)] font-bold'}>
                                                {step.text}
                                            </span>
                                            {step.status === 'done' && <ChevronRight size={14} className="text-[var(--text-muted)] ml-auto" />}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div ref={bottomRef} className="h-4" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>            {/* Granola Floating Input Bar */}
            <div 
                className={cn(
                    "w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-[2rem] shadow-xl p-2 flex flex-col transition-all duration-300 pointer-events-auto",
                    expanded ? "rounded-3xl" : (focused ? "rounded-[1.5rem]" : "rounded-full p-1.5 max-w-xl mx-auto")
                )}
                onMouseDown={(e) => {
                    // Prevent blur when clicking inside the container
                    if ((e.target as HTMLElement).tagName !== 'INPUT') {
                        e.stopPropagation();
                    }
                }}
            >
                
                {/* Recipes & Quick Prompts */}
                {(!expanded && focused) && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="flex flex-col gap-2 overflow-x-auto px-2 pb-2 mb-1 border-b border-[var(--border)] no-scrollbar"
                    >
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-[var(--text-muted)] shrink-0 pr-2">
                                <History size={14} />
                            </div>
                            {recipes.slice(0, recipesExpanded ? recipes.length : 3).map(recipe => (
                                <button
                                    type="button"
                                    key={recipe.id}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => handleAskAi(recipe.prompt(contextName))}
                                    className="flex items-center gap-1.5 shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                                >
                                    <recipe.icon size={13} className="opacity-70" />
                                    <span>{recipe.shortTitle}</span>
                                </button>
                            ))}
                            {recipes.length > 3 && (
                                <button 
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => setRecipesExpanded(!recipesExpanded)}
                                    className="flex items-center gap-1.5 shrink-0 px-2 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors ml-auto"
                                >
                                    <LayoutGrid size={13} className="opacity-70" />
                                    <span>{recipesExpanded ? 'Less' : 'All recipes'}</span>
                                </button>
                            )}
                        </div>
                        {/* Quick Prompts */}
                        <div className="flex items-center gap-2">
                             <div className="flex items-center gap-1 text-emerald-500 shrink-0 pr-2">
                                 <Sparkles size={14} />
                             </div>
                             {['Summarize', 'Action items', 'Follow-up'].map((promptText) => (
                                <button
                                    type="button"
                                    key={promptText}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => handleAskAi(`Can you generate a ${promptText.toLowerCase()} for this note?`)}
                                    className="flex items-center gap-1.5 shrink-0 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-[11px] font-semibold transition-colors"
                                >
                                    <span>{promptText}</span>
                                </button>
                             ))}
                        </div>
                    </motion.div>
                )}

                {/* Input Area */}
                <div className={cn("flex items-center gap-2 px-3", expanded || focused ? "py-1" : "py-1")}>
                    <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2 min-w-0">
                        <input
                            type="text"
                            value={inputText}
                            onChange={e => setInputText(e.target.value)}
                            onFocus={() => setFocused(true)}
                            onBlur={() => {
                                // Small timeout to allow click handlers to resolve smoothly
                                setTimeout(() => {
                                    if (!inputText.trim() && !expanded) {
                                        setFocused(false);
                                    }
                                }, 200);
                            }}
                            placeholder={expanded || focused ? "Ask anything about this note..." : "Continue chat"}
                            className="flex-1 bg-transparent border-none outline-none text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-medium truncate py-1 focus-visible:shadow-none"
                        />
                        {inputText.trim() && (
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition-colors shrink-0 flex items-center justify-center shadow-sm"
                            >
                                <Send size={13} className={loading ? "animate-pulse" : ""} />
                            </button>
                        )}
                    </form>

                    {/* Right side single recipe chip when unfocused */}
                    {(!expanded && !focused && recipes.length > 0 && !inputText.trim()) && (
                        <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleAskAi(recipes[0].prompt(contextName))}
                            className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full border border-[var(--border)] hover:border-emerald-500/40 hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all ml-auto bg-[var(--surface)] shadow-sm"
                        >
                            {React.createElement(recipes[0].icon, { size: 12, className: "text-emerald-500" })}
                            <span>{recipes[0].shortTitle}</span>
                        </button>
                    )}

                    {(expanded || focused) && (
                        <div className="flex items-center gap-1 shrink-0 pl-2 border-l border-[var(--border)]">
                            <button 
                                type="button" 
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => setAutoEnabled(!autoEnabled)}
                                className={cn(
                                    "flex items-center gap-1 px-2 py-1 text-xs font-semibold transition-colors rounded-lg",
                                    autoEnabled ? "text-emerald-500 bg-emerald-500/10" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                )}
                                title={autoEnabled ? "Auto memory enabled" : "Auto memory disabled"}
                            >
                                <span>Auto</span>
                                <ChevronDown size={12} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}



const ChevronDown = ({ size }: { size: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
);
