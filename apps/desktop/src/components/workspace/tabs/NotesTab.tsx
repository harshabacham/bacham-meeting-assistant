import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BookOpen, Save, Clock, Sparkles, Loader2, Copy, Check,
  FileText, Zap, RotateCcw, Mic, Activity, ChevronDown,
  Layout, AlignLeft, Bot, LayoutTemplate
} from 'lucide-react';
import { TauriClient } from '@/infrastructure/tauri-client';
import { Markdown as ReactMarkdown } from '@/components/ui/markdown';

// ────────────────────────────────────────────────────────────
//  Templates
// ────────────────────────────────────────────────────────────

const TEMPLATES: Record<string, { label: string; icon: string; content: string }> = {
  general:        { label: 'General',        icon: '📋', content: `## Key Points\n- \n\n## Decisions Made\n- \n\n## Action Items\n- [ ] \n\n## Questions\n- ` },
  one_on_one:     { label: '1-on-1',         icon: '👥', content: `## How is [Name] doing?\n- \n\n## Updates\n- \n\n## Blockers\n- \n\n## Action Items\n- [ ] ` },
  user_interview: { label: 'User Interview', icon: '🎤', content: `## Participant\n- Name: \n- Role: \n\n## Goals\n- \n\n## Key Insights\n- \n\n## Pain Points\n- \n\n## Quotes\n> ` },
  sales_call:     { label: 'Sales Call',     icon: '💼', content: `## Account\n- Company: \n- Contact: \n\n## Needs Identified\n- \n\n## Objections\n- \n\n## Next Steps\n- [ ] ` },
  stand_up:       { label: 'Stand-up',       icon: '⚡', content: `## Yesterday\n- \n\n## Today\n- \n\n## Blockers\n- ` },
  lecture:        { label: 'Lecture',        icon: '📚', content: `## Topic\n\n## Key Concepts\n- \n\n## Definitions\n- \n\n## Examples\n- \n\n## Questions for Later\n- ` },
};

// ────────────────────────────────────────────────────────────
//  Types
// ────────────────────────────────────────────────────────────

interface NotesTabProps {
  lectureId: string;
  templateType?: string;
  transcript?: string;
  isAudioSilent?: boolean;
}

// ────────────────────────────────────────────────────────────
//  Helpers
// ────────────────────────────────────────────────────────────

const JOT_PLACEHOLDER =
  'Type your shorthand notes as the meeting happens…\n\nExamples:\n  deploy next week\n  john owns auth\n  - revisit pricing Q3\n\nThe AI will silently expand each point using the live transcript.';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// ────────────────────────────────────────────────────────────
//  Template Picker dropdown
// ────────────────────────────────────────────────────────────

function TemplatePicker({
  current,
  onSelect,
}: {
  current: string;
  onSelect: (key: string, content: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const t = TEMPLATES[current] ?? TEMPLATES.general;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border border-border/50 bg-surface hover:bg-surface-hover transition-colors text-foreground font-medium"
      >
        <LayoutTemplate size={11} className="text-muted-foreground" />
        <span>{t.icon} {t.label}</span>
        <ChevronDown size={10} className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 bg-popover border border-border/60 rounded-xl shadow-2xl overflow-hidden w-52 py-1">
          {Object.entries(TEMPLATES).map(([key, tmpl]) => (
            <button
              key={key}
              onClick={() => {
                onSelect(key, tmpl.content);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-left hover:bg-surface-hover transition-colors ${
                current === key ? 'text-primary bg-primary/5' : 'text-foreground'
              }`}
            >
              <span className="text-base leading-none">{tmpl.icon}</span>
              <span className="font-medium">{tmpl.label}</span>
              {current === key && <Check size={10} className="ml-auto text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
//  Component
// ────────────────────────────────────────────────────────────

export function NotesTab({ lectureId, templateType = 'general', transcript: propTranscript, isAudioSilent }: NotesTabProps) {
  const storageKey = `user_notes_draft_${lectureId}`;

  // Active template key
  const [activeTemplate, setActiveTemplate] = useState(templateType);

  // Draft state
  const [draft, setDraft] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) return saved;
    return TEMPLATES[templateType]?.content || TEMPLATES.general.content;
  });

  // UI state
  const [augmented, setAugmented] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [isAugmenting, setIsAugmenting] = useState(false);
  const [isAutoExpanding, setIsAutoExpanding] = useState(false);
  const [augmentError, setAugmentError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<'split' | 'draft' | 'ai'>('split');
  const [autoExpandEnabled, setAutoExpandEnabled] = useState(true);
  const [lastAutoAt, setLastAutoAt] = useState<number | null>(null);

  // Live transcript rolling buffer (from real-time captions)
  const liveTranscriptBufferRef = useRef('');
  const [captionCount, setCaptionCount] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  // Debounced draft for auto-expand trigger
  const debouncedDraft = useDebounce(draft, 2500);

  // ── Live transcript subscription ───────────────────────────
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const setup = async () => {
      unlisten = await TauriClient.onTranscriptUpdate((data) => {
        if (data.lectureId !== lectureId) return;
        const newEntry = '\n' + data.content;
        liveTranscriptBufferRef.current = (
          (liveTranscriptBufferRef.current + newEntry).length > 5000
            ? (liveTranscriptBufferRef.current + newEntry).slice(-5000)
            : liveTranscriptBufferRef.current + newEntry
        );
        setCaptionCount(c => c + 1);
      });
    };
    setup().catch(console.error);
    return () => { if (unlisten) unlisten(); };
  }, [lectureId]);

  // ── Auto-save draft ────────────────────────────────────────
  useEffect(() => {
    setSaveStatus('unsaved');
    const timer = setTimeout(() => {
      localStorage.setItem(storageKey, draft);
      TauriClient.updateNotes(lectureId, draft).catch(console.error);
      setSaveStatus('saved');
    }, 1200);
    return () => clearTimeout(timer);
  }, [draft, storageKey, lectureId]);

  // ── Load existing notes on mount ───────────────────────────
  useEffect(() => {
    TauriClient.getNotes(lectureId).then(saved => {
      if (saved && saved.trim()) {
        setDraft(saved);
        localStorage.setItem(storageKey, saved);
      }
    }).catch(console.error);
  }, [lectureId, storageKey]);

  // ── Auto-expand when draft stops changing ──────────────────
  useEffect(() => {
    if (!autoExpandEnabled) return;
    if (!debouncedDraft.trim() || debouncedDraft === (TEMPLATES[activeTemplate]?.content || TEMPLATES.general.content)) return;
    if (debouncedDraft.length < 25) return;
    triggerExpand(true);
  }, [debouncedDraft]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Core expand function ───────────────────────────────────
  const triggerExpand = useCallback(async (silent = false) => {
    const currentDraft = draftRef.current;
    if (!currentDraft.trim()) return;
    if (isAugmenting || isAutoExpanding) return;

    // Supress auto-expand during silence to avoid hallucinating on an empty transcript
    if (silent && isAudioSilent) {
      console.log('Skipping auto-expand: Audio watchdog reports silence');
      return;
    }

    silent ? setIsAutoExpanding(true) : setIsAugmenting(true);
    setAugmentError(null);

    try {
      const extraContext = liveTranscriptBufferRef.current || propTranscript || '';
      const draftWithHint = extraContext
        ? `[LIVE TRANSCRIPT CONTEXT]:\n${extraContext.slice(-3000)}\n\n[USER NOTES]:\n${currentDraft}`
        : currentDraft;
      const result = await TauriClient.notesAiAugment(lectureId, draftWithHint);
      setAugmented(result);
      setLastAutoAt(Date.now());
      if (view === 'draft' && !silent) setView('split');
    } catch (e: any) {
      if (!silent) setAugmentError(String(e));
    } finally {
      setIsAugmenting(false);
      setIsAutoExpanding(false);
    }
  }, [lectureId, isAugmenting, isAutoExpanding, view, propTranscript, isAudioSilent]);

  // ── Timestamp insert ───────────────────────────────────────
  const insertTimestamp = () => {
    const textarea = textareaRef.current;
    const now = new Date();
    const timeStr = `[${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}]`;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = draft.substring(0, start) + `\n**${timeStr}** ` + draft.substring(end);
      setDraft(newContent);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + timeStr.length + 6;
        textarea.focus();
      }, 10);
    } else {
      setDraft(prev => prev + `\n**${timeStr}** `);
    }
  };

  const handleTemplateSelect = (key: string, content: string) => {
    setActiveTemplate(key);
    if (!draft.trim() || draft === (TEMPLATES[activeTemplate]?.content || '')) {
      setDraft(content);
    } else if (window.confirm('Replace current draft with this template?')) {
      setDraft(content);
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

  const formatLastAuto = () => {
    if (!lastAutoAt) return null;
    const secs = Math.round((Date.now() - lastAutoAt) / 1000);
    if (secs < 60) return `${secs}s ago`;
    return `${Math.round(secs / 60)}m ago`;
  };

  // ────────────────────────────────────────────────────────────
  //  Render
  // ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full gap-0">

      {/* ── Top Header Bar ───────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-border/40 shrink-0 flex-wrap gap-y-2">
        {/* Left: title + status */}
        <div className="flex items-center gap-2.5 mr-auto min-w-0">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 shrink-0">
            <BookOpen size={14} className="text-violet-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground leading-none">Jot &amp; Expand</h3>
            <div className="flex items-center gap-2 mt-0.5">
              {saveStatus === 'saved' ? (
                <span className="text-[10px] text-emerald-400/80 flex items-center gap-1">
                  <Save size={9} /> Saved
                </span>
              ) : (
                <span className="text-[10px] text-amber-400/80">● Saving…</span>
              )}
              {captionCount > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded-full">
                  <Activity size={8} className="animate-pulse" />
                  {captionCount} live captions
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Template picker */}
          <TemplatePicker current={activeTemplate} onSelect={handleTemplateSelect} />

          {/* Timestamp */}
          <button
            onClick={insertTimestamp}
            title="Insert timestamp at cursor"
            className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border border-border/50 bg-surface hover:bg-surface-hover transition-colors text-foreground font-medium"
          >
            <Clock size={11} className="text-muted-foreground" />
            Timestamp
          </button>

          {/* Auto-expand toggle */}
          <button
            onClick={() => setAutoExpandEnabled(v => !v)}
            title={autoExpandEnabled ? 'Disable auto-expand' : 'Enable auto-expand'}
            className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border transition-all font-medium ${
              autoExpandEnabled
                ? 'bg-violet-500/10 border-violet-500/30 text-violet-300'
                : 'bg-surface border-border/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Zap size={11} className={autoExpandEnabled ? 'text-violet-400' : ''} />
            {autoExpandEnabled ? 'Auto ON' : 'Auto OFF'}
          </button>

          {/* View toggle */}
          <div className="flex items-center bg-surface border border-border/50 rounded-lg p-0.5 gap-0.5">
            {([
              { id: 'draft', icon: AlignLeft, label: 'Draft' },
              { id: 'split', icon: Layout, label: 'Split' },
              { id: 'ai',    icon: Bot,      label: 'AI' },
            ] as const).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                title={label}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                  view === id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon size={11} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Expand Now */}
          <button
            onClick={() => triggerExpand(false)}
            disabled={isAugmenting || !draft.trim()}
            className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-all bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-sm shadow-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isAugmenting ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
            {isAugmenting ? 'Expanding…' : 'Expand Now'}
          </button>
        </div>
      </div>

      {/* ── Auto-expand status strip ─────────────────────────── */}
      {(isAutoExpanding || lastAutoAt) && (
        <div className="flex items-center gap-2 px-5 py-2 bg-violet-500/5 border-b border-violet-500/10 text-[11px] text-violet-400/80 shrink-0">
          {isAutoExpanding ? (
            <>
              <Loader2 size={10} className="animate-spin shrink-0" />
              <span>Silently cross-referencing your notes with the meeting transcript…</span>
            </>
          ) : (
            <>
              <RotateCcw size={10} className="shrink-0" />
              <span>Last auto-expanded <strong className="text-violet-300">{formatLastAuto()}</strong></span>
              {captionCount > 0 && (
                <span className="flex items-center gap-1 ml-auto">
                  <Mic size={9} className="animate-pulse" /> Listening live
                </span>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Error strip ──────────────────────────────────────── */}
      {augmentError && (
        <div className="px-5 py-2.5 bg-destructive/5 border-b border-destructive/20 text-xs text-destructive shrink-0">
          ⚠️ {augmentError}
        </div>
      )}

      {/* ── Main Content Area ─────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* Draft panel */}
        {(view === 'draft' || view === 'split') && (
          <div className={`flex flex-col min-h-0 min-w-0 ${view === 'split' ? 'flex-1' : 'w-full'}`}>
            {/* Panel header */}
            <div className="flex items-center gap-2 px-4 pt-3 pb-2 shrink-0">
              <FileText size={12} className="text-muted-foreground" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Your Shorthand</span>
              <span className="ml-auto text-[10px] text-muted-foreground/40 tabular-nums">{draft.length} chars</span>
            </div>
            {/* Textarea */}
            <div className="flex-1 mx-4 mb-4 relative rounded-xl border border-border/40 bg-surface/30 hover:border-border/70 focus-within:border-violet-500/40 transition-colors overflow-hidden group">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={JOT_PLACEHOLDER}
                className="w-full h-full bg-transparent px-4 py-4 text-sm text-foreground resize-none focus:outline-none placeholder:text-muted-foreground/25 leading-relaxed font-mono"
                style={{ minHeight: 0 }}
              />
              {captionCount > 0 && (
                <div className="absolute bottom-3 right-3 flex items-center gap-1 text-[10px] text-emerald-400/60 bg-emerald-400/5 border border-emerald-400/10 rounded-full px-2 py-0.5">
                  <Mic size={8} className="animate-pulse" /> Listening…
                </div>
              )}
            </div>
          </div>
        )}

        {/* Divider for split view */}
        {view === 'split' && (
          <div className="w-px bg-border/30 shrink-0 my-4 self-stretch" />
        )}

        {/* AI Output panel */}
        {(view === 'ai' || view === 'split') && (
          <div className={`flex flex-col min-h-0 min-w-0 ${view === 'split' ? 'flex-1' : 'w-full'}`}>
            {/* Panel header */}
            <div className="flex items-center gap-2 px-4 pt-3 pb-2 shrink-0">
              <Sparkles size={12} className="text-violet-400" />
              <span className="text-[11px] font-semibold text-violet-400/80 uppercase tracking-wider">AI Expanded</span>
              {augmented && (
                <div className="ml-auto flex items-center gap-1.5">
                  <button
                    onClick={copyAugmented}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md bg-surface border border-border/50"
                  >
                    {copied ? <><Check size={10} className="text-emerald-400" /> Copied</> : <><Copy size={10} /> Copy</>}
                  </button>
                  <button
                    onClick={adoptAugmented}
                    className="flex items-center gap-1 text-[10px] text-violet-300 hover:text-violet-200 transition-colors px-2 py-1 rounded-md bg-violet-500/10 border border-violet-500/20 font-medium"
                  >
                    Use as Draft
                  </button>
                </div>
              )}
            </div>
            {/* Content */}
            <div className="flex-1 mx-4 mb-4 overflow-y-auto rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-indigo-500/5 min-h-0">
              {(isAugmenting || isAutoExpanding) ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                      <Sparkles className="h-6 w-6 text-violet-400 animate-pulse" />
                    </div>
                    <div className="absolute -inset-2 rounded-3xl border border-violet-500/10 animate-ping opacity-60" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-violet-300 mb-1">
                      {isAutoExpanding ? 'Auto-expanding your notes…' : 'Expanding with transcript context…'}
                    </p>
                    <p className="text-xs text-muted-foreground/60 max-w-[220px]">
                      Cross-referencing your shorthand with what was said in the meeting
                    </p>
                  </div>
                </div>
              ) : augmented ? (
                <div className="prose prose-sm prose-invert max-w-none px-5 py-5">
                  <ReactMarkdown>{augmented}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-5 p-8 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 border-dashed flex items-center justify-center">
                    <Sparkles size={22} className="text-violet-400/35" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground/60 mb-2">
                      {autoExpandEnabled ? 'Waiting for your notes…' : 'Ready to expand'}
                    </p>
                    <p className="text-xs text-muted-foreground/50 leading-relaxed max-w-[230px]">
                      {autoExpandEnabled
                        ? 'Auto-expand will fire 2.5s after you stop typing. Or click Expand Now to run it immediately.'
                        : 'Write your shorthand in the draft panel, then click Expand Now to enhance it with the transcript.'
                      }
                    </p>
                  </div>
                  {!autoExpandEnabled && (
                    <button
                      onClick={() => triggerExpand(false)}
                      disabled={!draft.trim() || isAugmenting}
                      className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white transition-all disabled:opacity-40"
                    >
                      <Sparkles size={12} />
                      Expand Now
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
