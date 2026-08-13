import { useState, useEffect, useRef } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { TauriClient } from '@/infrastructure/tauri-client';
import { listen } from '@tauri-apps/api/event';
import { useToast } from '@/components/ui/ToastProvider';

export function AiScratchpad() {
  const [notes, setNotes] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const { showToast } = useToast();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Listen for captions to grab the active session ID if we don't have it
    const unlisten = listen<{ sessionId: string }>('live_caption_received', (event) => {
      if (!activeSessionId) {
        setActiveSessionId(event.payload.sessionId);
      }
    });

    return () => {
      unlisten.then(f => f());
    };
  }, [activeSessionId]);

  useEffect(() => {
    if (!activeSessionId || !notes.trim()) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      TauriClient.saveLiveScratchpad(activeSessionId, notes).catch(e => {
        console.error('Failed to autosave scratchpad:', e);
      });
    }, 1000); // Debounce 1 second

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [notes, activeSessionId]);

  const handleEnhance = async () => {
    if (!notes.trim()) return;
    setIsEnhancing(true);
    try {
      const prompt = `I am taking manual shorthand notes in a meeting. Flesh out these bullet points into a professional, well-written paragraph summary based on typical meeting context. Do not include introductory text. Notes:\n${notes}`;
      const res = await TauriClient.sendGlobalMemoryChat(prompt);
      
      setNotes(res);
      showToast('Notes enhanced successfully!', 'success');
    } catch (e: any) {
      console.error(e);
      showToast(`Failed to enhance notes: ${e.message || e}`, 'error');
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <div className="h-full flex flex-col w-full max-w-3xl mx-auto relative group">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Start typing your meeting notes here..."
        className="flex-1 w-full bg-transparent p-4 text-[var(--text-primary)] resize-none focus:outline-none placeholder:text-[var(--text-secondary)]/40 leading-relaxed text-sm font-medium"
      />
      
      {/* Floating AI Enhance Button that appears when there is text */}
      <div className={`absolute bottom-4 right-4 transition-all duration-300 ${notes.trim() ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <button 
          onClick={handleEnhance}
          disabled={isEnhancing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 disabled:opacity-50 transition-all text-xs font-bold"
        >
          {isEnhancing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          Enhance
        </button>
      </div>
    </div>
  );
}
