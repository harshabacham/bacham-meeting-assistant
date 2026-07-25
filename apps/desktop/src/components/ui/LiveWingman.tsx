import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { Bot, MessageSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/shared/utils/cn";

interface LiveCaption {
  sessionId: string;
  text: string;
  timestamp: number;
  platform: string;
}

export function LiveWingman() {
  const [captions, setCaptions] = useState<LiveCaption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    const unlisten = listen<LiveCaption>('live_caption_received', (event) => {
      setCaptions((prev) => {
        const newCaptions = [...prev, event.payload];
        if (newCaptions.length > 5) newCaptions.shift();
        return newCaptions;
      });
      setIsOpen(true);
      setIsRecording(true);
    });

    return () => {
      unlisten.then((u) => u());
    };
  }, []);

  if (!isRecording && captions.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] font-sans flex flex-col items-end gap-3 pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="w-80 bg-surface/90 backdrop-blur-xl border border-border rounded-xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col"
          >
            <div className="flex items-center justify-between p-3 border-b border-border bg-background/50">
              <div className="flex items-center gap-2 text-primary">
                <Bot size={16} />
                <span className="text-sm font-semibold tracking-wide">AI Wingman</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-3 max-h-60 overflow-y-auto flex flex-col gap-2 scrollbar-hide">
              {captions.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-4">Listening to meeting...</p>
              ) : (
                captions.map((cap, idx) => (
                  <motion.div 
                    key={cap.timestamp + idx} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-background/60 p-2.5 rounded-lg border border-border/50 text-sm text-foreground/90 leading-relaxed shadow-sm flex gap-2 items-start"
                  >
                    <MessageSquare size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                    <span>{cap.text}</span>
                  </motion.div>
                ))
              )}
            </div>
            
            <div className="p-2 border-t border-border bg-background/30 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Live Analysis Active</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 pointer-events-auto",
          isOpen ? "bg-surface border border-border text-foreground hover:bg-surface-hover" : "bg-primary text-primary-foreground hover:scale-105"
        )}
      >
        <Bot size={20} />
      </button>
    </div>
  );
}
