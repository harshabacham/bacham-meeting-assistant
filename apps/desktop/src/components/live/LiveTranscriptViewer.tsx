import { useEffect, useState, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { Bot, Loader2, Sparkles, PenTool } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TauriClient } from '@/infrastructure/tauri-client';

type TimelineItemType = 'caption' | 'screenshot' | 'user_note' | 'ai_response';

interface TimelineItem {
  id: string;
  type: TimelineItemType;
  timestamp: number;
  content: string; // text, or base64 image data
  speaker?: string;
}

interface LiveTranscriptViewerProps {
  onScreenshotClick?: (dataUrl: string) => void;
}

export function LiveTranscriptViewer({ onScreenshotClick }: LiveTranscriptViewerProps) {
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [liveInterim, setLiveInterim] = useState('');
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unlistenCaption = listen<{sessionId?: string, text: string, timestamp?: number, isInterim?: boolean}>('live_caption_received', (event) => {
      if (!event.payload?.text) return;
      const text = event.payload.text.trim();
      if (!text) return;

      if (!activeSessionId && event.payload.sessionId) setActiveSessionId(event.payload.sessionId);

      if (event.payload.isInterim) {
        setLiveInterim(text);
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        return;
      }

      setLiveInterim('');
      
      setTimeline((prev) => {
        if (prev.length > 0 && prev[prev.length - 1].content.toLowerCase() === text.toLowerCase()) return prev;
        return [...prev, {
          id: `cap_${Date.now()}_${Math.random()}`,
          type: 'caption',
          timestamp: event.payload.timestamp || Date.now(),
          content: text,
          speaker: 'Speaker',
        }];
      });
      
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 50);
    });

    // Mock listener for screenshots (assuming native host sends this)
    const unlistenScreenshot = listen<{sessionId: string, dataUrl: string, timestamp: number}>('live_screenshot_received', (event) => {
      setTimeline((prev) => [...prev, {
        id: `img_${Date.now()}_${Math.random()}`,
        type: 'screenshot',
        timestamp: event.payload.timestamp || Date.now(),
        content: event.payload.dataUrl,
      }]);
      
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 100);
    });

    return () => {
      unlistenCaption.then((u) => u());
      unlistenScreenshot.then((u) => u());
    };
  }, [activeSessionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isProcessing) return;

    const input = query.trim();
    setQuery('');
    
    // If it starts with '/', it's a command for the AI Wingman
    if (input.startsWith('/')) {
      const userMessage = input.slice(1).trim();
      setTimeline(prev => [...prev, { id: Date.now().toString(), type: 'user_note', timestamp: Date.now(), content: `Ask AI: ${userMessage}` }]);
      setIsProcessing(true);

      try {
        const recentCaptions = timeline.filter(t => t.type === 'caption').slice(-20).map(c => c.content).join(' ');
        const prompt = `You are a live meeting AI Wingman. Transcript context:\n"${recentCaptions}"\n\nUser Question: ${userMessage}`;
        const res = await TauriClient.sendGlobalMemoryChat(prompt);
        
        setTimeline(prev => [...prev, { id: (Date.now() + 1).toString(), type: 'ai_response', timestamp: Date.now(), content: res }]);
      } catch (err) {
        setTimeline(prev => [...prev, { id: (Date.now() + 1).toString(), type: 'ai_response', timestamp: Date.now(), content: 'Failed to connect to AI Wingman.' }]);
      } finally {
        setIsProcessing(false);
      }
    } else {
      // It's a manual note
      setTimeline(prev => [...prev, { id: Date.now().toString(), type: 'user_note', timestamp: Date.now(), content: input }]);
      
      if (activeSessionId) {
         TauriClient.saveLiveScratchpad(activeSessionId, input).catch(e => console.error(e));
      }
    }

    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 100);
  };

  const renderTimelineItem = (item: TimelineItem) => {
    switch (item.type) {
      case 'caption': {
        const cleanContent = item.content.replace(/^\[.*?\]:\s*/, '').trim();
        return (
          <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="group relative flex flex-col gap-1.5 my-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 shadow-xs hover:bg-[var(--surface-hover)] transition-all">
            <div className="flex items-center justify-between text-xs px-0.5">
              <span className="text-[10px] text-[var(--text-muted)] font-mono">
                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(cleanContent)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] px-1.5 py-0.5 rounded hover:bg-[var(--surface)] cursor-pointer"
                title="Copy caption"
              >
                Copy
              </button>
            </div>
            <p className="text-[13px] text-[var(--text-primary)] leading-relaxed font-sans select-text">{cleanContent}</p>
          </motion.div>
        );
      }
      case 'screenshot':
        return (
          <motion.div key={item.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="my-3">
            <div 
              className="rounded-2xl overflow-hidden border border-[var(--border)] shadow-md cursor-pointer hover:ring-2 hover:ring-[var(--accent)] transition-all"
              onClick={() => onScreenshotClick && onScreenshotClick(item.content)}
              title="Click to insert into notes"
            >
              <img src={item.content} alt="Meeting Screenshot" className="w-full h-auto object-cover max-h-52" />
            </div>
          </motion.div>
        );
      case 'user_note':
        return (
          <motion.div key={item.id} initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} className="flex justify-end my-3">
            <div className="max-w-[85%] bg-[var(--text-primary)] text-[var(--bg)] p-3 rounded-2xl rounded-tr-xs shadow-xs text-xs font-medium leading-relaxed">
              {item.content}
            </div>
          </motion.div>
        );
      case 'ai_response':
        return (
          <motion.div key={item.id} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2.5 my-3">
            <div className="shrink-0 mt-1">
              <div className="w-7 h-7 rounded-xl bg-[var(--accent-dim)] text-[var(--accent)] flex items-center justify-center">
                <Sparkles size={13} />
              </div>
            </div>
            <div className="flex-1 bg-[var(--surface)] border border-[var(--border)] p-3.5 rounded-2xl rounded-tl-xs shadow-xs text-xs text-[var(--text-primary)] leading-relaxed font-sans">
              {item.content}
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col bg-transparent overflow-hidden">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-5 scroll-smooth"
      >
        {timeline.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[var(--text-secondary)]">
            <Bot className="w-8 h-8 mb-3 opacity-40" />
            <p className="text-sm font-medium">Waiting for meeting data...</p>
            <p className="text-xs opacity-60 mt-2 text-center max-w-[200px]">Transcripts, notes, and screenshots will appear here.</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {timeline.map(renderTimelineItem)}
            {liveInterim && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="group relative flex flex-col gap-1 my-3 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3.5 shadow-xs">
                <div className="flex items-center gap-1.5 text-xs px-0.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                    Live
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] animate-pulse">Speaking...</span>
                </div>
                <p className="text-[13.5px] text-[var(--text-primary)] leading-relaxed font-sans">
                  {liveInterim}
                  <span className="inline-block w-1.5 h-3.5 ml-1 bg-emerald-400 animate-pulse align-middle" />
                </p>
              </motion.div>
            )}
            {isProcessing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 my-4">
                <div className="shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Loader2 size={14} className="animate-spin" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Smart Input (Notes & AI Wingman) */}
      <div className="p-3 bg-[var(--surface)] border-t border-[var(--border)] shrink-0">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type note or /ask AI Wingman..."
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-3 pl-4 pr-12 text-sm text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-[var(--text-secondary)] shadow-inner"
          />
          <button
            type="submit"
            disabled={!query.trim() || isProcessing}
            className="absolute right-2 p-1.5 text-indigo-500 hover:bg-indigo-500/10 rounded-lg disabled:opacity-50 transition-colors"
          >
            {query.startsWith('/') ? <Sparkles size={16} /> : <PenTool size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
}
