import { useEffect, useState, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { Bot, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LiveCaption {
  sessionId: string;
  text: string;
  timestamp: number;
  platform: string;
}

export function LiveTranscriptViewer() {
  const [captions, setCaptions] = useState<LiveCaption[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unlistenCaption = listen<LiveCaption>('live_caption_received', (event) => {
      setCaptions((prev) => [...prev, event.payload]);
      
      // Auto scroll
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    });

    return () => {
      unlistenCaption.then((u) => u());
    };
  }, []);

  return (
    <div className="h-full flex flex-col bg-surface/30 backdrop-blur-md rounded-2xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border bg-surface/50 flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Live Transcript
        </h2>
        <span className="text-xs text-muted-foreground">Listening via Extension</span>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        {captions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <Bot className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">Waiting for meeting audio...</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {captions.map((cap, idx) => (
              <motion.div 
                key={cap.timestamp + idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <div className="shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                    <MessageSquare size={14} />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-foreground">Active Speaker</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(cap.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed bg-background/50 p-3 rounded-xl rounded-tl-none border border-border/50">
                    {cap.text}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
