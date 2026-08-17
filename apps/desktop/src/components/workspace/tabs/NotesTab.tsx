import { useState, useEffect, useRef } from 'react';
import {
  BookOpen, Save, Clock, Sparkles, Loader2, Copy, Check,
  FileText, Mic, Activity, ChevronDown,
  Layout, AlignLeft, Bot, LayoutTemplate, BrainCircuit
} from 'lucide-react';
import { TauriClient } from '@/infrastructure/tauri-client';
import { LectureIntelligenceView } from '@/components/study/LectureIntelligenceView';
import { Button } from '@/components/ui/button';

// ────────────────────────────────────────────────────────────
//  Templates
// ────────────────────────────────────────────────────────────

const TEMPLATES: Record<string, { label: string; icon: string; content: string }> = {
  general:        { label: 'General Meeting',  icon: '📋', content: `## Key Discussion\n- \n\n## Decisions Made\n- \n\n## Action Items\n- [ ] \n\n## Questions / Follow-ups\n- ` },
  one_on_one:     { label: '1-on-1 Sync',      icon: '👥', content: `## How are things going?\n- \n\n## Priorities & Progress\n- \n\n## Roadblocks / Challenges\n- \n\n## Action Items\n- [ ] ` },
  user_interview: { label: 'User Interview',  icon: '🎤', content: `## Participant Info\n- Name: \n- Role / Background: \n\n## Key Insights & Feedback\n- \n\n## Pain Points\n- \n\n## Direct Quotes\n> ` },
  sales_call:     { label: 'Sales / Client',   icon: '💼', content: `## Client & Stakeholders\n- Company: \n- Contact: \n\n## Needs & Objectives\n- \n\n## Objections / Concerns\n- \n\n## Next Steps\n- [ ] ` },
  stand_up:       { label: 'Daily Stand-up',   icon: '⚡', content: `## Done Yesterday\n- \n\n## Planned for Today\n- \n\n## Blockers\n- ` },
  lecture:        { label: 'Lecture / Class',  icon: '📚', content: `## Core Topic\n\n## Key Concepts & Theorems\n- \n\n## Definitions\n- \n\n## Important Examples\n- \n\n## Questions for Review\n- ` },
};

// ────────────────────────────────────────────────────────────
//  Types
// ────────────────────────────────────────────────────────────

interface NotesTabProps {
  lectureId: string;
  lectureTitle?: string;
  templateType?: string;
  transcript?: string;
  isAudioSilent?: boolean;
  artifacts?: Record<string, any>;
  summary?: string | null;
  summaryError?: string | null;
  isGeneratingSummary?: boolean;
  onGenerateSummary?: () => void;
  hasVisuals?: boolean;
}

// ────────────────────────────────────────────────────────────
//  Helpers
// ────────────────────────────────────────────────────────────

const JOT_PLACEHOLDER =
  'Type your shorthand meeting notes in real-time…\n\n• Key discussion points\n• Assigned action items (e.g. John to review API)\n• Critical decisions and deadlines\n\nThe AI automatically cross-references your notes with the live audio and visual slides.';

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
//  Unified Granola Notes Canvas Component
// ────────────────────────────────────────────────────────────

export function NotesTab({
  lectureId,
  templateType = 'general',
  transcript: propTranscript,
  isAudioSilent,
  artifacts = {},
  summary,
  summaryError,
  isGeneratingSummary = false,
  onGenerateSummary,
}: NotesTabProps) {
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
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [view, setView] = useState<'split' | 'draft' | 'ai'>('split');
  const [copiedDraft, setCopiedDraft] = useState(false);

  // Live transcript rolling buffer (from real-time captions)
  const liveTranscriptBufferRef = useRef(propTranscript || '');
  const [captionCount, setCaptionCount] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

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
    }, 1000);
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

  // ── Insert Timestamp Helper ────────────────────────────────
  const insertTimestamp = () => {
    const now = new Date();
    const ts = `[${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}] `;
    const textarea = textareaRef.current;
    if (!textarea) {
      setDraft(d => d + '\n' + ts);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = draft.slice(0, start) + ts + draft.slice(end);
    setDraft(next);
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + ts.length;
      textarea.focus();
    }, 0);
  };

  // ── Template selection ─────────────────────────────────────
  const handleTemplateSelect = (key: string, content: string) => {
    setActiveTemplate(key);
    if (!draft.trim() || draft === TEMPLATES.general.content) {
      setDraft(content);
    } else if (window.confirm('Replace your current notes with this template?')) {
      setDraft(content);
    }
  };

  const copyDraftContent = () => {
    navigator.clipboard.writeText(draft);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
  };

  // Check if AI Intelligence data exists
  const aiIntelligenceData = artifacts['lecture_intelligence'] || (() => {
    if (!summary) return null;
    try {
      return JSON.parse(summary);
    } catch {
      return { executive_summary: summary };
    }
  })();

  return (
    <div className="flex flex-col h-full gap-0 bg-background overflow-hidden">

      {/* ── Granola Top Toolbar Bar ──────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-border/40 bg-surface/30 shrink-0 flex-wrap gap-y-2">
        {/* Left: Section Indicator & Live Sync Status */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
            <BookOpen size={14} className="text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground leading-none">Meeting Notes</h3>
            <div className="flex items-center gap-2 mt-1">
              {saveStatus === 'saved' ? (
                <span className="text-[10px] text-emerald-400/90 flex items-center gap-1 font-medium">
                  <Save size={9} /> Auto-saved
                </span>
              ) : (
                <span className="text-[10px] text-amber-400/90 font-medium animate-pulse">● Saving changes…</span>
              )}
              {captionCount > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded-full font-medium">
                  <Activity size={8} className={isAudioSilent ? '' : 'animate-pulse'} />
                  {isAudioSilent ? 'Silence' : 'Live Listening'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions, Template, View Switcher & Generate */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Template Picker */}
          <TemplatePicker current={activeTemplate} onSelect={handleTemplateSelect} />

          {/* Insert Timestamp */}
          <button
            onClick={insertTimestamp}
            title="Insert timestamp at cursor"
            className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border border-border/50 bg-surface hover:bg-surface-hover transition-colors text-foreground font-medium"
          >
            <Clock size={11} className="text-muted-foreground" />
            <span className="hidden sm:inline">Timestamp</span>
          </button>

          {/* View Mode Toggle: Split | My Notes | AI Notes */}
          <div className="flex items-center bg-surface border border-border/50 rounded-lg p-0.5 gap-0.5">
            {([
              { id: 'split', icon: Layout, label: 'Split' },
              { id: 'draft', icon: AlignLeft, label: 'My Notes' },
              { id: 'ai',    icon: Bot,      label: 'AI Notes' },
            ] as const).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                title={label}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                  view === id
                    ? 'bg-primary/15 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon size={11} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Generate / Regenerate AI Summary Button */}
          {onGenerateSummary && (
            <Button
              onClick={onGenerateSummary}
              disabled={isGeneratingSummary}
              className="flex items-center gap-1.5 text-[11px] px-3.5 py-1.5 h-auto rounded-lg font-semibold transition-all bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm shadow-primary/20 disabled:opacity-50"
            >
              {isGeneratingSummary ? (
                <>
                  <Loader2 size={12} className="animate-spin mr-1" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles size={12} className="mr-1" />
                  {aiIntelligenceData ? 'Regenerate Notes' : 'Generate Notes'}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* ── Error Strip if Generation Failed ─────────────────── */}
      {summaryError && (
        <div className="px-6 py-2.5 bg-destructive/10 border-b border-destructive/20 text-xs text-destructive shrink-0 flex items-center justify-between">
          <span>⚠️ {summaryError}</span>
          {onGenerateSummary && (
            <button onClick={onGenerateSummary} className="underline font-semibold ml-2 hover:opacity-80">
              Retry
            </button>
          )}
        </div>
      )}

      {/* ── Main Notes Canvas ─────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* Left Pane: User Shorthand Notes */}
        {(view === 'draft' || view === 'split') && (
          <div className={`flex flex-col min-h-0 min-w-0 ${view === 'split' ? 'w-1/2 border-r border-border/40' : 'w-full'}`}>
            {/* Shorthand Header */}
            <div className="flex items-center justify-between px-6 pt-3 pb-2 shrink-0">
              <div className="flex items-center gap-2">
                <FileText size={12} className="text-muted-foreground" />
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Your Notes</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-muted-foreground/50 tabular-nums">{draft.length} characters</span>
                <button
                  onClick={copyDraftContent}
                  title="Copy your notes"
                  className="p-1 rounded hover:bg-surface text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copiedDraft ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                </button>
              </div>
            </div>

            {/* Shorthand Textarea */}
            <div className="flex-1 mx-6 mb-6 relative rounded-2xl border border-border/40 bg-surface/20 hover:border-border/70 focus-within:border-primary/40 transition-colors overflow-hidden group">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={JOT_PLACEHOLDER}
                className="w-full h-full bg-transparent px-5 py-5 text-sm text-foreground resize-none focus:outline-none placeholder:text-muted-foreground/30 leading-relaxed font-sans"
                style={{ minHeight: 0 }}
              />
              {captionCount > 0 && (
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 text-[10px] text-emerald-400/80 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2.5 py-1">
                  <Mic size={9} className="animate-pulse" /> Live Captions Connected
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right Pane: AI Structured Intelligence */}
        {(view === 'ai' || view === 'split') && (
          <div className={`flex flex-col min-h-0 min-w-0 overflow-y-auto ${view === 'split' ? 'w-1/2' : 'w-full'}`}>
            <div className="p-6">
              {aiIntelligenceData ? (
                <LectureIntelligenceView data={aiIntelligenceData} />
              ) : isGeneratingSummary ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-4 text-center">
                  <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
                    <BrainCircuit className="h-8 w-8 text-primary animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-semibold text-foreground">Synthesizing Notes &amp; Intelligence</h4>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      Analyzing audio transcript, visual keyframes, and shorthand notes…
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center border border-dashed border-border/60 rounded-2xl p-8 bg-surface/10">
                  <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <Sparkles className="h-7 w-7 text-primary" />
                  </div>
                  <div className="space-y-1 max-w-md">
                    <h4 className="text-sm font-semibold text-foreground">AI Intelligence Not Yet Generated</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Click below to generate grounded meeting notes, chapter breakdowns, decisions, and action items using the multimodal AI engine.
                    </p>
                  </div>
                  {onGenerateSummary && (
                    <Button onClick={onGenerateSummary} className="rounded-xl bg-primary text-primary-foreground font-semibold text-xs px-5 py-2 h-auto shadow-sm">
                      <Sparkles size={13} className="mr-1.5" /> Generate Meeting Intelligence
                    </Button>
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
