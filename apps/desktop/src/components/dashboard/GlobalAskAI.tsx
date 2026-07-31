import React, { useState, useRef, useEffect } from 'react';
import { TauriClient } from '@/infrastructure/tauri-client';
import { Search, Loader2, Sparkles, X, ChevronRight, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const GlobalAskAI: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const result = await TauriClient.globalAskAi(query);
      setResponse(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to search past meetings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 p-4 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shadow-lg backdrop-blur-md hover:bg-indigo-500/20 hover:scale-105 transition-all z-50 flex items-center justify-center gap-2 group"
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-sm font-semibold pr-2 max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap">
            Ask AI Global
          </span>
        </button>
      )}

      {/* Floating Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 w-[400px] h-[500px] bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800/60 bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-200">Global AI Search</h3>
                  <p className="text-[10px] text-zinc-500">Ask questions across all past meetings</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-4">
              {response ? (
                <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-4">
                  <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {response}
                  </p>
                </div>
              ) : error ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                  <Search className="w-12 h-12 text-zinc-600 mb-3" />
                  <p className="text-sm text-zinc-400 max-w-[250px]">
                    Ask about decisions, action items, or topics discussed in any of your past recorded meetings.
                  </p>
                </div>
              )}
              
              {loading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                  <span className="ml-2 text-xs text-zinc-500">Searching transcripts...</span>
                </div>
              )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-800/60 bg-zinc-900/50">
              <div className="relative flex items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="What did John say about pricing last month?"
                  className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-4 pr-12 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  disabled={loading}
                />
                <button 
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="absolute right-2 p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 disabled:opacity-50 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
