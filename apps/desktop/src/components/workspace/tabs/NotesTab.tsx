import { useState, useEffect, useRef } from 'react';
import { BookOpen, Save, Clock, Sparkles, Loader2, Copy, Check, ChevronRight, FileText, Maximize2 } from 'lucide-react';
import { useLectureSyncStore } from '@/shared/stores/lectureSyncStore';
import { TauriClient } from '@/infrastructure/tauri-client';
import { Markdown as ReactMarkdown } from '@/components/ui/markdown';

const TEMPLATES: Record<string, string> = {
  general: `## Key Points\n- \n\n## Decisions Made\n- \n\n## Action Items\n- [ ] \n\n## Questions\n- `,
  one_on_one: `## How is [Name] doing?\n- \n\n## Updates\n- \n\n## Blockers\n- \n\n## Action Items\n- [ ] `,
  user_interview: `## Participant\n- Name: \n- Role: \n\n## Goals\n- \n\n## Key Insights\n- \n\n## Pain Points\n- \n\n## Quotes\n> `,
  sales_call: `## Account\n- Company: \n- Contact: \n\n## Needs Identified\n- \n\n## Objections\n- \n\n## Next Steps\n- [ ] `,
  stand_up: `## Yesterday\n- \n\n## Today\n- \n\n## Blockers\n- `,
  lecture: `## Topic\n\n## Key Concepts\n- \n\n## Definitions\n- \n\n## Examples\n- \n\n## Questions for Later\n- `,
};

interface NotesTabProps {
  lectureId: string;
  templateType?: string;
}

export function NotesTab({ lectureId, templateType = 'general' }: NotesTabProps) {
  const storageKey = `user_notes_draft_${lectureId}`;
  const [draft, setDraft] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) return saved;
    return TEMPLATES[templateType] || TEMPLATES.general;
  });
  const [augmented, setAugmented] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [isAugmenting, setIsAugmenting] = useState(false);
  const [augmentError, setAugmentError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<'split' | 'draft' | 'ai'>('split');
  const { currentTimeMs } = useLectureSyncStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-save draft
  useEffect(() => {
    setSaveStatus('unsaved');
    const timer = setTimeout(() => {
      localStorage.setItem(storageKey, draft);
      // Also save to DB
      TauriClient.updateNotes(lectureId, draft).catch(console.error);
      setSaveStatus('saved');
    }, 1200);
    return () => clearTimeout(timer);
  }, [draft, storageKey, lectureId]);

  // Load existing notes on mount
  useEffect(() => {
    TauriClient.getNotes(lectureId).then(saved => {
      if (saved && saved.trim()) {
        setDraft(saved);
        localStorage.setItem(storageKey, saved);
      }
    }).catch(console.error);
  }, [lectureId]);

  const insertTimestamp = () => {
    const totalSeconds = Math.floor(currentTimeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const timeStr = `[${minutes}:${seconds.toString().padStart(2, '0')}]`;
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = draft.substring(0, start) + `\n\n**${timeStr}** ` + draft.substring(end);
      setDraft(newContent);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + timeStr.length + 6;
        textarea.focus();
      }, 10);
    } else {
      setDraft(prev => prev + `\n\n**${timeStr}** `);
    }
  };

  const handleAugment = async () => {
    if (!draft.trim() || isAugmenting) return;
    setIsAugmenting(true);
    setAugmentError(null);
    try {
      const result = await TauriClient.notesAiAugment(lectureId, draft);
      setAugmented(result);
      if (view === 'draft') setView('split');
    } catch (e: any) {
      setAugmentError(String(e));
    } finally {
      setIsAugmenting(false);
    }
  };

  const copyAugmented = () => {
    if (augmented) {
      navigator.clipboard.writeText(augmented);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const adoptAugmented = () => {
    if (augmented) {
      setDraft(augmented);
      setAugmented(null);
      setView('draft');
    }
  };

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto w-full p-2 sm:p-4 gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 mr-auto">
          <BookOpen size={16} className="text-[color:var(--accent)]" />
          <h3 className="text-sm font-semibold text-foreground">Smart Notes</h3>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            {saveStatus === 'saved' ? <><Save size={10} /> Saved</> : saveStatus === 'saving' ? 'Saving...' : '● Unsaved'}
          </span>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-surface border border-border/50 rounded-lg p-0.5">
          {(['draft', 'split', 'ai'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${view === v ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              {v === 'draft' ? 'Draft' : v === 'split' ? 'Split' : 'AI Output'}
            </button>
          ))}
        </div>

        <button onClick={insertTimestamp}
          className="flex items-center gap-1.5 text-xs bg-surface border border-border/50 hover:bg-surface-hover px-3 py-1.5 rounded-full transition-colors text-foreground">
          <Clock size={12} className="text-[color:var(--accent)]" />
          Timestamp
        </button>

        <button
          onClick={handleAugment}
          disabled={isAugmenting || !draft.trim()}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-all bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-sm shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAugmenting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {isAugmenting ? 'Augmenting...' : '✨ Augment with AI'}
        </button>
      </div>

      {augmentError && (
        <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{augmentError}</p>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex gap-3 min-h-0 overflow-hidden">
        {/* Draft panel */}
        {(view === 'draft' || view === 'split') && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center gap-1.5 mb-1.5">
              <FileText size={12} className="text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Your Notes</span>
            </div>
            <div className="flex-1 bg-surface/30 rounded-2xl border border-border/50 overflow-hidden relative group hover:border-[color:var(--border-accent)] transition-colors duration-300">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`Type your shorthand notes here...\n\nThen click "✨ Augment with AI" to expand them using the meeting transcript.`}
                className="w-full h-full bg-transparent p-5 text-sm text-foreground resize-none focus:outline-none placeholder:text-muted-foreground/40 leading-relaxed font-mono"
              />
            </div>
          </div>
        )}

        {/* Divider arrow */}
        {view === 'split' && augmented && (
          <div className="flex flex-col items-center justify-center gap-1 shrink-0">
            <ChevronRight size={16} className="text-muted-foreground/40" />
          </div>
        )}

        {/* AI Output panel */}
        {(view === 'ai' || (view === 'split' && augmented)) && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sparkles size={12} className="text-violet-400" />
              <span className="text-[10px] font-medium text-violet-400/80 uppercase tracking-wide">AI-Augmented</span>
              {augmented && (
                <div className="ml-auto flex gap-1.5">
                  <button onClick={copyAugmented} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-0.5 rounded-md bg-surface border border-border/50">
                    {copied ? <><Check size={10} className="text-emerald-400" /> Copied</> : <><Copy size={10} /> Copy</>}
                  </button>
                  <button onClick={adoptAugmented} className="flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300 transition-colors px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20">
                    <Maximize2 size={10} /> Use as Draft
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto bg-gradient-to-br from-violet-500/5 to-indigo-500/5 rounded-2xl border border-violet-500/20 p-5">
              {isAugmenting ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                  <div className="relative">
                    <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
                    <Sparkles className="h-3 w-3 absolute inset-0 m-auto text-violet-400/60" />
                  </div>
                  <p className="text-sm">Expanding your notes using the transcript...</p>
                </div>
              ) : augmented ? (
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown>{augmented}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                  <Sparkles size={24} className="text-violet-400/40" />
                  <p className="text-sm text-center">
                    Click <strong className="text-violet-400">✨ Augment with AI</strong> to expand your notes using the meeting transcript.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Placeholder when split but no augmented yet */}
        {view === 'split' && !augmented && !isAugmenting && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-violet-500/5 to-indigo-500/5 rounded-2xl border border-dashed border-violet-500/20">
            <Sparkles size={24} className="text-violet-400/40" />
            <p className="text-sm text-muted-foreground text-center max-w-[200px]">
              AI output will appear here after augmentation
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
