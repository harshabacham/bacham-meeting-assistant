import React, { useState, useRef, useEffect } from 'react';
import { TauriClient } from '@/infrastructure/tauri-client';
import { Search, Sparkles, X, ChevronRight, Bot, Trash2, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePetStore, PET_DEFINITIONS } from '@/shared/stores/petStore';
import { PetAvatar } from '@/components/pets/PetAvatars';

const TypewriterText = ({ text, onComplete }: { text: string, onComplete?: () => void }) => {
  const [displayedText, setDisplayedText] = useState('');
  useEffect(() => {
    setDisplayedText('');
    let i = 0;
    const timer = setInterval(() => {
      setDisplayedText(text.substring(0, i));
      i++;
      if (i > text.length) {
        clearInterval(timer);
        onComplete?.();
      }
    }, 10);
    return () => clearInterval(timer);
  }, [text]);
  return <>{displayedText}</>;
};

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  isStreaming?: boolean;
}

const PetCompanionWidget = ({ onClick, isThinking }: { onClick: () => void; isThinking?: boolean }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { selectedPetId, petSize, isTuckedAway } = usePetStore();
  const currentPet = PET_DEFINITIONS.find(p => p.id === selectedPetId) || PET_DEFINITIONS[0];

  if (isTuckedAway) return null;

  return (
    <motion.button
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      style={{ width: petSize, height: petSize }}
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center cursor-pointer focus:outline-none bg-transparent border-none p-0 outline-none shadow-none group"
      whileHover={{ y: -6, scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      aria-label={`Open ${currentPet.name} AI Companion`}
    >
      <div className="relative flex items-center justify-center w-full h-full">
        <PetAvatar id={selectedPetId} size={petSize} isHovered={isHovered} isThinking={isThinking} />
      </div>

      {/* Speech bubble tooltip on hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, x: 10, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 5, scale: 0.95 }}
            className="absolute right-[calc(100%+12px)] bg-surface-raised/95 backdrop-blur-xl border border-border/60 px-3.5 py-2 rounded-2xl whitespace-nowrap text-xs font-semibold tracking-wide text-foreground shadow-2xl pointer-events-none flex items-center gap-2"
          >
            <Sparkles size={13} style={{ color: currentPet.color }} />
            <span>Ask {currentPet.name}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

export const GlobalAskAI: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { selectedPetId } = usePetStore();
  const currentPet = PET_DEFINITIONS.find(p => p.id === selectedPetId) || PET_DEFINITIONS[0];

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const currentQuery = query;
    const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', text: currentQuery };
    
    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    // Build context
    const contextStr = messages.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.text}`).join('\n');
    const fullQuery = contextStr ? `Previous Conversation:\n${contextStr}\n\nCurrent Question: ${currentQuery}` : currentQuery;

    try {
      const result = await TauriClient.globalAskAi(fullQuery);
      setMessages(prev => [...prev, { id: Date.now().toString() + '-ai', role: 'ai', text: result, isStreaming: true }]);
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, { id: Date.now().toString() + '-err', role: 'ai', text: `Error: ${err.message || 'Failed to search past meetings'}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    setQuery('');
  };

  const removeStreamingFlag = (id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, isStreaming: false } : m));
  };

  return (
    <>
      {/* Floating Pet Companion Button */}
      {!isOpen && <PetCompanionWidget onClick={() => setIsOpen(true)} isThinking={loading} />}

      {/* Floating Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 30, scale: 0.95, filter: 'blur(10px)' }}
            className="fixed bottom-6 right-6 w-[400px] h-[550px] bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-[2rem] shadow-lg z-50 flex flex-col overflow-hidden ring-1 ring-[var(--border)]/30"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--surface-hover)]/30 backdrop-blur-md relative overflow-hidden shrink-0">
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent)]/5 to-transparent pointer-events-none" />
              <div className="flex items-center gap-3 relative">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] border border-[var(--border-accent)] flex items-center justify-center shadow-inner overflow-hidden">
                  <PetAvatar id={selectedPetId} size={32} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] tracking-wide">{currentPet.name} Companion</h3>
                  <p className="text-[11px] text-[var(--text-muted)]">Ask questions across all past meetings</p>
                </div>
              </div>
              <div className="flex items-center gap-1 relative">
                {messages.length > 0 && (
                  <button 
                    onClick={handleClear}
                    title="Clear Chat"
                    className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-red-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] text-[var(--text-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 custom-scrollbar flex flex-col gap-4 scroll-smooth">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                  <Search className="w-12 h-12 text-[var(--text-muted)] mb-3" />
                  <p className="text-sm text-[var(--text-muted)] max-w-[250px]">
                    Ask about decisions, action items, or topics discussed in any of your past recorded meetings.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {messages.map((msg) => (
                    <motion.div 
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 max-w-[90%] ${msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}
                    >
                      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-[var(--surface-raised)] text-[var(--text-secondary)] border border-[var(--border)]' : 'bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]'}`}>
                        {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                      </div>
                      <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] rounded-tr-sm border border-[var(--border)]' 
                          : 'bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-secondary)] rounded-tl-sm shadow-sm'
                      }`}>
                        {msg.isStreaming ? (
                          <TypewriterText text={msg.text} onComplete={() => removeStreamingFlag(msg.id)} />
                        ) : (
                          <span className="whitespace-pre-wrap">{msg.text}</span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  
                  {loading && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-3 self-start max-w-[90%]"
                    >
                      <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                        <Bot size={14} />
                      </div>
                      <div className="p-4 rounded-2xl rounded-tl-sm bg-[var(--surface-hover)] border border-[var(--border)] flex items-center gap-2">
                        <motion.div 
                          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} 
                          transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                          className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" 
                        />
                        <motion.div 
                          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} 
                          transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                          className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" 
                        />
                        <motion.div 
                          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} 
                          transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                          className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" 
                        />
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-[var(--border)] bg-[var(--surface)] shrink-0">
              <div className="relative flex items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask a question..."
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl pl-4 pr-12 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] focus:ring-1 focus:ring-[var(--border-accent)] transition-all"
                  disabled={loading}
                />
                <button 
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="absolute right-2 p-2 rounded-xl bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" strokeWidth={3} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
