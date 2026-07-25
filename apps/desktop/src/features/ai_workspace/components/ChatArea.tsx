import { useState, useEffect, useRef } from 'react';
import { TauriClient, ChatChunkEvent } from '@/infrastructure/tauri-client';
import type { ChatMessage } from '@/shared/types';
import { Conversation, MessageReference } from '../types';
import { BrainCircuit, Send, BookOpen } from 'lucide-react';
import { WaveLoader, cn } from '@/components';
import { PromptLibrary } from './PromptLibrary';
import { ParsedModelContent } from '@/components/workspace/chat/ParsedModelContent';

type WorkspaceChatMessage = ChatMessage & { references?: MessageReference[]; followups?: string[] };

interface ChatAreaProps {
    conversation: Conversation;
    onReferenceClick: (ref: MessageReference) => void;
}

export function ChatArea({ conversation, onReferenceClick }: ChatAreaProps) {
    const [history, setHistory] = useState<WorkspaceChatMessage[]>([]);
    const [prompt, setPrompt] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [showPromptLibrary, setShowPromptLibrary] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    useEffect(() => {
        const loadHistory = async () => {
            setIsLoadingHistory(true);
            try {
                const pastMessages = await TauriClient.getConversationHistory(conversation.id);
                setHistory(pastMessages.map((m: any) => ({
                    role: m.role,
                    content: m.content,
                    references: m.references
                })));
            } catch (e) {
                console.error('Failed to load history:', e);
            } finally {
                setIsLoadingHistory(false);
            }
        };
        
        loadHistory();
    }, [conversation.id]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history]);

    useEffect(() => {
        let isMounted = true;
        
        // Listen to chunks for the new streaming model
        const unlistenPromise = TauriClient.onAiChatChunk((event: ChatChunkEvent) => {
            if (!isMounted) return;
            
            setHistory(prev => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'model') {
                    const existingRefs = last.references || [];
                    const newRefs = event.references || [];
                    const mergedRefs = [...existingRefs];
                    for (const nr of newRefs as any[]) {
                        if (!mergedRefs.find((r: any) => r.refType === nr.refType && r.excerpt === nr.value)) {
                            mergedRefs.push({
                                id: Math.random().toString(),
                                refType: nr.refType,
                                excerpt: nr.value,
                                lectureId: ''
                            });
                        }
                    }
                    return [
                        ...prev.slice(0, -1),
                        { role: 'model', content: last.content + event.chunk, references: mergedRefs }
                    ];
                }
                
                const initialRefs = (event.references || []).map((nr: any) => ({
                    id: Math.random().toString(),
                    refType: nr.refType,
                    excerpt: nr.value,
                    lectureId: ''
                }));
                return [...prev, { role: 'model', content: event.chunk, references: initialRefs }];
            });
            setIsSending(false);
        });

        const unlistenFollowupsPromise = TauriClient.onAiChatFollowups((data) => {
            if (!isMounted) return;
            
            setHistory(prev => {
                if (prev.length === 0) return prev;
                const newHistory = [...prev];
                const last = newHistory[newHistory.length - 1];
                if (last.role === 'model') {
                    last.followups = data.suggestions;
                }
                return newHistory;
            });
        });

        return () => {
            isMounted = false;
            unlistenPromise.then(unlisten => unlisten());
            unlistenFollowupsPromise.then(unlisten => unlisten());
        };
    }, []);

    const handleSend = async (overridePrompt?: string) => {
        const msgToSend = (typeof overridePrompt === 'string' ? overridePrompt : prompt).trim();
        if (!msgToSend || isSending) return;
        
        setHistory(prev => [...prev, { role: 'user', content: msgToSend }]);
        if (typeof overridePrompt !== 'string') setPrompt('');
        setIsSending(true);

        try {
            await TauriClient.sendMessage(conversation.id, msgToSend);
        } catch (e: any) {
            setIsSending(false);
            setHistory(prev => [
                ...prev,
                { role: 'model', content: `[ERROR] Failed to send message: ${e.message || String(e)}` }
            ]);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[var(--bg)] relative">
            {/* Minimal Header */}
            <div className="h-14 shrink-0 flex items-center px-8">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-white/[0.03] rounded-md border border-white/5">
                        <BrainCircuit size={15} className="text-white opacity-80" />
                    </div>
                    <div>
                        <h2 className="text-[13px] font-medium text-white">{conversation.title}</h2>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-8 py-4 flex flex-col gap-8 scroll-smooth"
            >
                {isLoadingHistory ? (
                    <div className="flex-1 flex items-center justify-center text-[var(--text-muted)]">
                        <WaveLoader className="w-10 h-5 opacity-50" />
                    </div>
                ) : history.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)] space-y-3 max-w-sm mx-auto text-center mt-[-10vh]">
                        <h3 className="text-xl font-semibold text-white tracking-tight">How can I help?</h3>
                        <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                            Ask anything about your {conversation.scopeType.toLowerCase()}. I'll search through the transcripts, summaries, and notes to give you the perfect answer.
                        </p>
                    </div>
                ) : (
                    history.map((msg, idx) => (
                    <div 
                        key={idx} 
                        className={cn(
                            "flex flex-col w-full max-w-3xl mx-auto",
                            msg.role === 'user' ? "items-end" : "items-start"
                        )}
                    >
                        <div 
                            className={cn(
                                "py-3 text-[14px] leading-[1.7] tracking-tight",
                                msg.role === 'user' 
                                    ? "px-5 bg-white/[0.04] border border-white/[0.03] text-white rounded-2xl rounded-br-sm max-w-[85%]" 
                                    : "text-[var(--text-secondary)] w-full prose prose-invert prose-sm max-w-none"
                            )}
                        >
                            {msg.role === 'user' ? (
                                <div className="whitespace-pre-wrap">{msg.content}</div>
                            ) : (
                                <ParsedModelContent 
                                    text={msg.content} 
                                    references={msg.references || []} 
                                    onReferenceClick={onReferenceClick} 
                                />
                            )}
                        </div>
                    </div>
                )))}
                {isSending && (
                    <div className="w-full max-w-3xl mx-auto flex items-center gap-3 text-[var(--text-muted)] py-4 opacity-70">
                        <WaveLoader className="w-6 h-3" />
                        <span className="text-[13px]">Thinking...</span>
                    </div>
                )}
                
                {/* Follow-up Suggestions */}
                {history.length > 0 && history[history.length - 1].role === 'model' && !isSending && history[history.length - 1].followups && history[history.length - 1].followups!.length > 0 && (
                    <div className="w-full max-w-3xl mx-auto flex flex-wrap gap-2 mt-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {history[history.length - 1].followups!.map((suggestion, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    setPrompt(suggestion);
                                    setTimeout(() => handleSend(suggestion), 50);
                                }}
                                className="text-[12px] px-3.5 py-2 rounded-full border border-white/[0.05] text-[var(--text-secondary)] bg-white/[0.02] hover:bg-white/[0.06] hover:text-white transition-all shadow-sm"
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                )}
                
                {/* Spacer for floating input */}
                <div className="h-24 shrink-0" />
            </div>

            {/* Floating Input Pill */}
            <div className="absolute bottom-6 left-0 w-full px-8 pointer-events-none flex flex-col items-center justify-end z-20">
                <div className="w-full max-w-2xl relative flex items-end bg-[#111111]/80 backdrop-blur-xl border border-white/[0.08] rounded-[24px] focus-within:border-white/[0.15] transition-all overflow-hidden shadow-2xl pointer-events-auto">
                    <button 
                        onClick={() => setShowPromptLibrary(true)}
                        title="Prompt Library"
                        className="absolute left-3 top-3.5 p-2 rounded-xl text-[var(--text-muted)] hover:bg-white/[0.05] hover:text-white transition-colors"
                    >
                        <BookOpen size={15} />
                    </button>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="Ask anything..."
                        className="flex-1 max-h-48 min-h-[52px] py-4 pl-12 pr-14 bg-transparent text-[14px] tracking-tight resize-none focus:outline-none text-white placeholder:text-[var(--text-muted)] leading-relaxed scrollbar-hide"
                        rows={1}
                    />
                    <button 
                        onClick={() => handleSend()}
                        disabled={!prompt.trim() || isSending}
                        className="absolute right-3 bottom-3 p-1.5 rounded-full text-[var(--text-muted)] hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--text-muted)] transition-all"
                    >
                        <Send size={15} className={cn("transition-transform", isSending ? "translate-x-1 opacity-0" : "")} />
                    </button>
                </div>
                <div className="w-full max-w-2xl text-center mt-3 pointer-events-auto">
                    <span className="text-[10px] text-[var(--text-muted)] tracking-[0.02em] font-medium">
                        AI answers are grounded in your personal knowledge base.
                    </span>
                </div>
            </div>

            {showPromptLibrary && (
                <PromptLibrary 
                    onClose={() => setShowPromptLibrary(false)}
                    onSelectPrompt={(body) => {
                        setPrompt(body);
                        // Focus on textarea could happen here
                    }}
                />
            )}
        </div>
    );
}
