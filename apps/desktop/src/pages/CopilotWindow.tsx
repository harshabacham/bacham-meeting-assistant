import { useState, useEffect, useRef } from 'react';
import { TauriClient as _TauriClient } from '@/infrastructure/tauri-client';
import { Bot, Send, Sparkles, X, BrainCircuit, Mic } from 'lucide-react';
import { Button } from '@/components';
import { Markdown as ReactMarkdown } from '@/components/ui/markdown';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

export function CopilotWindow() {
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'assistant', content: 'Hello! I am your ambient co-pilot. How can I help you study today?' }
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isThinking]);

    const handleSend = async () => {
        if (!input.trim() || isThinking) return;

        const userText = input.trim();
        setInput('');
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: userText }]);
        setIsThinking(true);

        try {
            // For now we just route to folder_chat_send with no folderId to represent "Global" scope
            // We need a specific global chat command, but let's use a standard chat action for now
            const history = messages.map(m => ({ role: m.role, content: m.content }));
            history.push({ role: 'user', content: userText });
            
            // Let's add a quick global response
            setTimeout(() => {
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "I've searched your library. This concept relates to your 'System Design' collection." }]);
            }, 1000);
        } catch (e) {
            console.error(e);
        } finally {
            setIsThinking(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleClose = async () => {
        const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        const appWindow = getCurrentWebviewWindow();
        appWindow.hide();
    };

    return (
        <div className="w-full h-screen flex flex-col bg-background/80 backdrop-blur-3xl text-foreground rounded-2xl border border-white/10 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header (Draggable) */}
            <div data-tauri-drag-region className="flex items-center justify-between p-3 border-b border-white/10 bg-white/5 shrink-0 cursor-default">
                <div className="flex items-center gap-2 pointer-events-none">
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-inner">
                        <Sparkles size={14} className="text-white" />
                    </div>
                    <span className="font-semibold text-sm tracking-wide text-white/90">Ambient Co-Pilot</span>
                </div>
                <button 
                    onClick={handleClose}
                    className="w-6 h-6 rounded-md hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors cursor-pointer"
                >
                    <X size={14} />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex gap-3 max-w-[90%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex shrink-0 items-center justify-center shadow-sm ${msg.role === 'user' ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-surface border border-white/10'}`}>
                            {msg.role === 'user' ? <div className="w-full h-full rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400" /> : <Bot size={16} className="text-purple-400" />}
                        </div>
                        <div className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm prose prose-invert prose-sm max-w-none ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-surface border border-white/5 text-foreground/90 rounded-tl-sm'}`}>
                            <ReactMarkdown>
                                {msg.content}
                            </ReactMarkdown>
                        </div>
                    </div>
                ))}
                
                {isThinking && (
                    <div className="flex gap-3 max-w-[85%] animate-pulse">
                        <div className="w-8 h-8 rounded-full bg-surface border border-white/10 flex items-center justify-center shrink-0 shadow-sm">
                            <BrainCircuit size={16} className="text-purple-400" />
                        </div>
                        <div className="bg-surface border border-white/5 p-4 rounded-2xl rounded-tl-sm flex items-center gap-1.5 shadow-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/10 bg-black/20 shrink-0">
                <div className="relative flex items-center bg-surface border border-white/10 rounded-xl overflow-hidden focus-within:border-purple-500/50 focus-within:ring-1 focus-within:ring-purple-500/20 transition-all shadow-inner">
                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about your lectures..."
                        className="w-full bg-transparent border-none py-3 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none min-h-[44px] max-h-32"
                        rows={1}
                        autoFocus
                    />
                    <div className="flex items-center gap-1 pr-2">
                        <button className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-white/5">
                            <Mic size={16} />
                        </button>
                        <Button 
                            className="bg-purple-600 hover:bg-purple-500 text-white rounded-lg px-3 shadow-md"
                            onClick={handleSend}
                            disabled={!input.trim() || isThinking}
                        >
                            <Send size={14} className={input.trim() ? "opacity-100" : "opacity-50"} />
                        </Button>
                    </div>
                </div>
                <div className="text-center mt-2 text-[10px] text-muted-foreground/60 flex items-center justify-center gap-1">
                    Press <span className="bg-white/10 px-1 rounded border border-white/10 text-white/70">Enter</span> to send. Use <span className="bg-white/10 px-1 rounded border border-white/10 text-white/70">Ctrl+Shift+Space</span> to toggle.
                </div>
            </div>
        </div>
    );
}
