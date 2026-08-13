import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, Send, Loader2, Bot, User, Trash2 } from 'lucide-react';
import { TauriClient } from '@/infrastructure/tauri-client';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export function KnowledgeBasePage() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
                top: scrollContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        if (messages.length > 0 || isTyping) {
            scrollToBottom();
        }
    }, [messages, isTyping]);



    const handleSend = async (forcedMsg?: string) => {
        const msgToSend = forcedMsg || input.trim();
        if (!msgToSend || isTyping) return;

        if (!forcedMsg) setInput('');
        
        setMessages(prev => [...prev, { role: 'user', content: msgToSend }]);
        setIsTyping(true);

        try {
            const answer = await TauriClient.globalAskAi(msgToSend);
            setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
            setIsTyping(false);
        } catch (e) {
            console.error("Chat error:", e);
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, an error occurred while searching your knowledge base." }]);
            setIsTyping(false);
        }
    };

    const suggestedQuestions = [
        "What were the key decisions in last week's sync?",
        "Summarize my notes on Neural Networks",
        "What is our Q3 marketing strategy?"
    ];

    return (
        <div className="flex flex-col h-full w-full relative overflow-hidden bg-[var(--bg)] text-[var(--text-primary)] font-sans">
            {/* Header */}
            <motion.div 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="shrink-0 h-16 border-b border-[var(--border)] flex items-center pl-8 pr-[100px] justify-between z-10 sticky top-0"
            >
                <div className="flex items-center gap-4">
                    <div className="text-[var(--text-muted)]">
                        <BrainCircuit size={18} className="opacity-80" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-[var(--text-primary)] tracking-wide">Global Knowledge Base</h1>
                        <p className="text-[11px] text-[var(--text-muted)] font-medium">Search your entire encrypted local history</p>
                    </div>
                </div>
                {messages.length > 0 && (
                    <button 
                        onClick={() => setMessages([])}
                        className="p-2.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-red-400 transition-all duration-200 group"
                        title="Clear Chat"
                    >
                        <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
                    </button>
                )}
            </motion.div>

            {/* Chat Area */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-8 scrollbar-hide flex flex-col items-center relative z-10 w-full">
                <div className="w-full max-w-4xl flex flex-col gap-8 pb-32">
                    {messages.length === 0 ? (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="flex flex-col items-center justify-center min-h-[60vh] text-center"
                        >
                            <div className="mb-6 text-[var(--text-muted)]">
                                <BrainCircuit size={32} className="opacity-50" />
                            </div>
                            
                            <h2 className="text-2xl font-serif font-medium text-[var(--text-primary)] mb-3 tracking-tight">
                                How can I help you today?
                            </h2>
                            <p className="text-[13px] text-[var(--text-muted)] max-w-md leading-relaxed mb-10">
                                Ask anything about your past meetings, lectures, or study materials. 
                                The AI will synthesize answers directly from your private local history.
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-3xl">
                                {suggestedQuestions.map((q, idx) => (
                                    <motion.button 
                                        key={idx}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.4, delay: 0.2 + (idx * 0.1) }}
                                        onClick={() => handleSend(q)}
                                        className="flex items-center justify-center text-center p-3 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] transition-colors group"
                                    >
                                        <p className="text-[12px] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] font-medium transition-colors">
                                            "{q}"
                                        </p>
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    ) : (
                        <AnimatePresence>
                            {messages.map((msg, i) => (
                                <motion.div 
                                    key={i}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex gap-4 w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    {msg.role === 'assistant' && (
                                        <div className="w-8 h-8 shrink-0 rounded-lg bg-[var(--surface-hover)] flex items-center justify-center border border-[var(--border)] mt-1">
                                            <Bot size={16} className="text-[var(--text-muted)]" />
                                        </div>
                                    )}
                                    <div className={`max-w-[80%] rounded-2xl px-5 py-3 text-[14px] leading-relaxed shadow-sm ${
                                        msg.role === 'user' 
                                            ? 'bg-[var(--text-primary)] text-[var(--bg)] rounded-tr-sm' 
                                            : 'bg-[var(--surface)] border border-[var(--border)] rounded-tl-sm text-[var(--text-primary)] whitespace-pre-wrap'
                                    }`}>
                                        {msg.content}
                                    </div>
                                    {msg.role === 'user' && (
                                        <div className="w-8 h-8 shrink-0 rounded-lg bg-[var(--text-primary)] flex items-center justify-center mt-1">
                                            <User size={16} className="text-[var(--bg)]" />
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                            
                            {isTyping && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex gap-4 justify-start w-full"
                                >
                                    <div className="w-8 h-8 shrink-0 rounded-lg bg-[var(--surface-hover)] flex items-center justify-center border border-[var(--border)] mt-1">
                                        <Bot size={16} className="text-[var(--text-muted)]" />
                                    </div>
                                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-2 shadow-sm">
                                        <motion.div className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full" animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0 }} />
                                        <motion.div className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full" animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }} />
                                        <motion.div className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full" animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }} />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    )}
                    <div ref={messagesEndRef} className="h-4" />
                </div>
            </div>

            {/* Input Area */}
            <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
                className="absolute bottom-0 left-0 w-full p-6 flex justify-center z-20 pointer-events-none"
            >
                <div className="w-full max-w-3xl relative pointer-events-auto">
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] to-transparent -top-16 pointer-events-none z-[-1]" />
                    
                    <div className="relative group shadow-lg rounded-2xl bg-[var(--surface)] border border-[var(--border)] transition-all duration-300 focus-within:border-[var(--text-muted)] focus-within:shadow-xl">
                        <textarea
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Message Knowledge Base..."
                            className="w-full bg-transparent pl-5 pr-14 py-4 text-[14px] font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none resize-none min-h-[56px] max-h-[200px]"
                            rows={1}
                            style={{ height: 'auto' }}
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isTyping}
                            className="absolute right-2 bottom-2 p-2 rounded-xl bg-[var(--text-primary)] text-[var(--bg)] hover:opacity-90 transition-all duration-200 disabled:opacity-50 disabled:scale-95 shadow-sm"
                        >
                            {isTyping ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className="ml-0.5" />}
                        </button>
                    </div>
                    <p className="text-center text-[11px] text-[var(--text-muted)] mt-2 font-medium">
                        AI can make mistakes. Verify important information.
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
