import { useState, useEffect, useRef } from 'react';
import { TauriClient, ChatChunkEvent } from '@/infrastructure/tauri-client';
import type { ChatMessage } from '@/shared/types';
import { ParsedChatContent } from '@/components/chat/ReferenceChip';
import { BrainCircuit, Send, Loader2, Info } from 'lucide-react';
import { cn } from '@/components';

interface AiChatProps {
    targetId: string;
    mode?: 'lecture' | 'folder';
    onJumpToTime?: (ms: number) => void;
    onViewScreenshot?: (id: string) => void;
}

export function AiChat({ targetId, mode = 'lecture', onJumpToTime, onViewScreenshot }: AiChatProps) {
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [prompt, setPrompt] = useState('');
    const [isSending, setIsSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history]);

    // Setup chunk listener
    useEffect(() => {
        let isMounted = true;
        
        const unlistenPromise = TauriClient.onAiChatChunk((event: ChatChunkEvent) => {
            if (!isMounted) return;
            
            setHistory(prev => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'model') {
                    return [
                        ...prev.slice(0, -1),
                        { role: 'model', content: last.content + event.chunk }
                    ];
                }
                return [...prev, { role: 'model', content: event.chunk }];
            });
            setIsSending(false); // Stop loading animation on first chunk
        });

        return () => {
            isMounted = false;
            unlistenPromise.then(unlisten => unlisten());
        };
    }, []);

    const handleSend = async () => {
        if (!prompt.trim() || isSending) return;
        
        const userMsg = prompt.trim();
        const currentHistory = [...history];
        
        setHistory([...currentHistory, { role: 'user', content: userMsg }]);
        setPrompt('');
        setIsSending(true);

        try {
            if (mode === 'folder') {
                await TauriClient.sendFolderChat(targetId, userMsg, currentHistory);
            } else {
                await TauriClient.sendAiChat(userMsg, currentHistory, targetId);
            }
        } catch (e: any) {
            setIsSending(false);
            const errorStr = e.message || String(e);
            if (errorStr.includes('Rate limit exceeded')) {
                setHistory(prev => [
                    ...prev,
                    { role: 'model', content: `⚠️ **Quota Exceeded**: ${errorStr}. Please wait and try again shortly.` }
                ]);
            } else {
                setHistory(prev => [
                    ...prev,
                    { role: 'model', content: `[ERROR] Failed to connect: ${errorStr}` }
                ]);
            }
        }
    };

    return (
        <div className="flex flex-col h-full bg-[var(--surface)] border-l border-[var(--border)]">
            <div className="p-3 border-b border-[var(--border)] shrink-0 flex items-center justify-between bg-[var(--overlay-02)]">
                <div className="flex items-center gap-2 text-[var(--accent)]">
                    <BrainCircuit size={16} />
                    <span className="text-sm font-semibold tracking-wide uppercase">AI Assistant</span>
                </div>
                <div className="group relative">
                    <Info size={14} className="text-[var(--text-muted)] cursor-help" />
                    <div className="absolute right-0 top-6 w-48 p-2 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] shadow-xl text-xs text-[var(--text-secondary)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        Ask questions about this lecture. The AI will cite its sources with clickable timestamps.
                    </div>
                </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6">
                {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] space-y-3 opacity-60">
                        <BrainCircuit size={32} />
                        <p className="text-sm text-center max-w-[200px]">Ask anything about this lecture to get grounded answers.</p>
                    </div>
                ) : (
                    history.map((msg, i) => (
                        <div key={i} className={cn("flex flex-col max-w-[85%]", msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start')}>
                            <span className="text-[10px] uppercase font-bold tracking-wider mb-1 opacity-50 px-1">
                                {msg.role === 'user' ? 'You' : 'BACHAM'}
                            </span>
                            <div
                                className={cn(
                                    "p-3 rounded-2xl text-[13px] leading-relaxed shadow-sm",
                                    msg.role === 'user' 
                                        ? 'bg-[var(--accent-dim)] text-[var(--text-primary)] border border-[var(--border-accent)] rounded-tr-sm' 
                                        : 'bg-[var(--overlay-04)] text-[var(--text-primary)] border border-[var(--border)] rounded-tl-sm'
                                )}
                            >
                                {msg.role === 'model' && msg.content.startsWith('[ERROR]') ? (
                                    <span className="text-[var(--destructive)]">{msg.content.replace('[ERROR]', '')}</span>
                                ) : msg.role === 'model' ? (
                                    <ParsedChatContent 
                                        text={msg.content} 
                                        onTimestampClick={onJumpToTime}
                                        onScreenshotClick={onViewScreenshot}
                                    />
                                ) : (
                                    msg.content
                                )}
                            </div>
                        </div>
                    ))
                )}
                
                {isSending && (
                    <div className="flex flex-col items-start max-w-[85%] mr-auto">
                        <span className="text-[10px] uppercase font-bold tracking-wider mb-1 opacity-50 px-1">BACHAM</span>
                        <div className="p-3 rounded-2xl rounded-tl-sm bg-[var(--overlay-04)] border border-[var(--border)]">
                            <Loader2 size={14} className="animate-spin text-[var(--text-muted)]" />
                        </div>
                    </div>
                )}
            </div>

            <div className="p-3 border-t border-[var(--border)] shrink-0 bg-[var(--overlay-02)]">
                <div className="relative flex items-center">
                    <input
                        type="text"
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        placeholder="Ask about the lecture..."
                        disabled={isSending}
                        className="w-full bg-[var(--overlay-06)] border border-[var(--border)] rounded-xl py-2.5 pl-4 pr-10 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] focus:bg-[var(--overlay-08)] transition-all"
                    />
                    <button 
                        onClick={handleSend}
                        disabled={isSending || !prompt.trim()}
                        className="absolute right-2 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-dim)] disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-[var(--text-muted)] transition-colors"
                    >
                        <Send size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
