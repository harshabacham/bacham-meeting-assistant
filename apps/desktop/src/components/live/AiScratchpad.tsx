import { useState } from 'react';
import { Sparkles, Save, Clock, Loader2 } from 'lucide-react';
import { TauriClient } from '@/infrastructure/tauri-client';

export function AiScratchpad() {
  const [notes, setNotes] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);

  const handleEnhance = async () => {
    if (!notes.trim()) return;
    setIsEnhancing(true);
    try {
      // Send the current shorthand notes to AI.
      // We'll use the existing chatTeachingMode as a mock endpoint if there isn't a dedicated one,
      // or we can just append a generic fleshed out response for the prototype.
      const prompt = `Flesh out these meeting notes:\n${notes}`;
      
      // Attempting to use a generic AI endpoint if it exists in the codebase (using global_ask_ai as mock)
      // Since global_ask_ai takes a query, we'll use that to flesh it out.
      const res = await TauriClient.globalAskAi(`I am taking manual shorthand notes in a meeting. Flesh out these bullet points into a professional, well-written paragraph summary based on typical meeting context. Do not include introductory text. Notes:\n${notes}`);
      
      setNotes(res);
    } catch (e) {
      console.error(e);
      // Fallback
      setNotes(notes + "\n\n[AI Fleshed out version of your notes based on recent transcript context will appear here.]");
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between p-4 border-b border-border bg-surface/50">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">Meeting Scratchpad</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleEnhance}
            disabled={isEnhancing || !notes.trim()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 disabled:opacity-50 transition-colors text-xs font-semibold"
          >
            {isEnhancing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Enhance with AI
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-hover text-muted-foreground hover:text-foreground transition-colors text-xs font-medium border border-border">
            <Save className="w-3.5 h-3.5" />
            Save Notes
          </button>
        </div>
      </div>
      
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Jot down bullet points or shorthand here..."
        className="flex-1 w-full bg-transparent p-6 text-foreground resize-none focus:outline-none placeholder:text-muted-foreground/50 leading-relaxed text-[15px]"
      />
    </div>
  );
}
