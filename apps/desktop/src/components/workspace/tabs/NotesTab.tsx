import { useState, useEffect } from 'react';
import { BookOpen, Save, Clock } from 'lucide-react';
import { useLectureSyncStore } from '@/shared/stores/lectureSyncStore';

interface NotesTabProps {
  lectureId: string;
}

export function NotesTab({ lectureId }: NotesTabProps) {
  // Using localStorage to persist notes locally per lecture
  const storageKey = `user_notes_${lectureId}`;
  const [content, setContent] = useState(() => localStorage.getItem(storageKey) || '');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const { currentTimeMs } = useLectureSyncStore();

  useEffect(() => {
    setSaveStatus('unsaved');
    const timer = setTimeout(() => {
      localStorage.setItem(storageKey, content);
      setSaveStatus('saved');
    }, 1000);
    return () => clearTimeout(timer);
  }, [content, storageKey]);

  const insertTimestamp = () => {
    const totalSeconds = Math.floor(currentTimeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const timeStr = `[${minutes}:${seconds.toString().padStart(2, '0')}]`;
    setContent((prev: string) => prev + `\n\n**${timeStr}** `);
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full p-2 sm:p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <BookOpen size={18} className="text-[var(--accent)]" />
          Personal Notes
        </h3>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            {saveStatus === 'saved' ? <><Save size={12} /> Saved</> : saveStatus === 'saving' ? 'Saving...' : 'Unsaved changes'}
          </span>
          <button 
            onClick={insertTimestamp}
            className="flex items-center gap-1.5 text-xs bg-surface border border-border/50 hover:bg-surface-hover px-3 py-1.5 rounded-full transition-colors text-foreground hover:border-[var(--border-accent)]"
          >
            <Clock size={12} className="text-[var(--accent)]" />
            Insert Timestamp
          </button>
        </div>
      </div>
      
      <div className="flex-1 bg-surface/30 rounded-2xl border border-border/50 overflow-hidden relative group hover:border-[var(--border-accent)] transition-colors duration-300">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type your notes here... Markdown is supported."
          className="w-full h-full bg-transparent p-6 text-sm text-foreground resize-none focus:outline-none placeholder:text-muted-foreground/50 leading-relaxed font-sans"
        />
      </div>
    </div>
  );
}
