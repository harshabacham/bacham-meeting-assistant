import { useState, useEffect } from 'react';
import { useSession } from '@/shared/hooks/useSession';
import { FileText, Sparkles, Save } from 'lucide-react';
import { motion } from 'framer-motion';

export function NotesScreen() {
  const { session, sessionState } = useSession();
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const isRecording = sessionState === 'recording' || sessionState === 'paused';

  // Load notes for the current session
  useEffect(() => {
    if (session?.id) {
      const saved = localStorage.getItem(`bacham_notes_${session.id}`);
      if (saved) setNotes(saved);
    }
  }, [session?.id]);

  // Auto-save notes
  useEffect(() => {
    if (!session?.id) return;
    const timeout = setTimeout(() => {
      localStorage.setItem(`bacham_notes_${session.id}`, notes);
      setSaving(true);
      setTimeout(() => setSaving(false), 800);
    }, 500);
    return () => clearTimeout(timeout);
  }, [notes, session?.id]);

  return (
    <div className="flex flex-col h-full font-sans animate-fade-in p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[20px] font-bold text-[var(--text-primary)] tracking-tight">Live Notes</h1>
        <div className="p-2 rounded-xl bg-[var(--accent-dim)] border border-[var(--border-accent)] text-[var(--accent)]">
          <Sparkles size={16} strokeWidth={2} />
        </div>
      </div>

      {!isRecording ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <div className="w-12 h-12 rounded-2xl bg-[var(--surface-hover)] border border-[var(--separator)] flex items-center justify-center mb-4 shadow-inner">
            <FileText size={20} className="text-[var(--text-secondary)]" />
          </div>
          <h2 className="text-[14px] font-bold text-[var(--text-primary)] mb-2">No Active Session</h2>
          <p className="text-[12px] text-[var(--text-secondary)]">
            Start a capture session to see real-time AI notes and transcripts appear here automatically.
          </p>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex flex-col min-h-0 relative"
        >
          {/* Top indicator */}
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
              <span className="text-[11px] font-semibold text-[var(--success)] uppercase tracking-wider truncate max-w-[150px]" title={session?.tabTitle}>
                {session?.tabTitle || 'Recording'}
              </span>
            </div>
            
            {/* Auto-save indicator */}
            <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-opacity duration-300 ${saving ? 'opacity-100 text-[var(--accent)]' : 'opacity-0'}`}>
              <Save size={12} />
              Saved
            </div>
          </div>
          
          {/* Notes Textarea */}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Type your meeting notes here... They will be automatically saved to this session."
            className="flex-1 w-full bg-[var(--surface)] border border-[var(--border-strong)] rounded-xl p-4 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] resize-none transition-shadow shadow-inner"
            style={{ minHeight: '200px' }}
          />
        </motion.div>
      )}
    </div>
  );
}
