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
        <div className="flex flex-col h-full bg-[var(--surface)] border-l border-[var(--border)] font-sans">
            {/* Header */}
            <div className="px-4 py-3 border-b border-[var(--border)] shrink-0 flex items-center justify-between bg-[var(--surface)]">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)]">
                        <BrainCircuit size={13} />
                    </div>
                    <span className="text-xs font-semibold text-[var(--text-primary)]">AI Lecture Assistant</span>
                </div>
                <div className="group relative">
                    <Info size={13} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer" />
                    <div className="absolute right-0 top-6 w-48 p-2 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] shadow-xl text-xs text-[var(--text-secondary)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        Ask questions about this lecture. The AI will cite its sources with clickable timestamps.
                    </div>
                </div>
            </div>

            {/* Chat Timeline */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs leading-relaxed scroll-smooth">
                {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] space-y-2.5 text-center p-6">
                        <div className="w-9 h-9 rounded-2xl bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] shadow-xs">
                            <BrainCircuit size={18} />
                        </div>
                        <p className="font-semibold text-[var(--text-primary)] text-xs">How can I help you study?</p>
                        <p className="text-[11px] text-[var(--text-muted)] max-w-[210px] leading-normal">
                            Ask questions, clarify concepts, or request chapter summaries from this recording.
                        </p>
                    </div>
                ) : (
                    history.map((msg, i) => (
                        <div key={i} className={cn("flex flex-col max-w-[90%]", msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start')}>
                            <div
                                className={cn(
                                    "p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs",
                                    msg.role === 'user' 
                                        ? 'bg-[var(--text-primary)] text-[var(--bg)] font-medium rounded-tr-xs' 
                                        : 'bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] rounded-tl-xs'
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
                        <div className="p-3 rounded-2xl rounded-tl-xs bg-[var(--surface)] border border-[var(--border)] shadow-xs flex items-center gap-2">
                            <Loader2 size={13} className="animate-spin text-[var(--accent)]" />
                            <span className="text-[11px] text-[var(--text-muted)]">Synthesizing answer...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Box */}
            <div className="p-3 border-t border-[var(--border)] shrink-0 bg-[var(--surface)]">
                <div className="relative flex items-center bg-[var(--bg)] border border-[var(--border)] focus-within:border-[var(--accent)] rounded-xl pl-3.5 pr-1.5 py-1 transition-all shadow-inner">
                    <input
                        type="text"
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        placeholder="Ask about this lecture..."
                        disabled={isSending}
                        className="flex-1 bg-transparent border-none outline-none text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-medium py-1.5"
                    />
                    <button 
                        onClick={handleSend}
                        disabled={isSending || !prompt.trim()}
                        className="p-1.5 bg-[var(--text-primary)] hover:bg-[var(--text-secondary)] disabled:opacity-30 text-[var(--bg)] rounded-lg transition-all shrink-0 cursor-pointer shadow-xs"
                    >
                        <Send size={12} />
                    </button>
                </div>
            </div>
        </div>
    );
}
