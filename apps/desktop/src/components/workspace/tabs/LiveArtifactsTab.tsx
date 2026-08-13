import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Layers, Loader2, RefreshCw, Copy, Check, GitBranch,
  ListTodo, FileCode2, Sparkles, Zap, Activity
} from 'lucide-react';
import { TauriClient } from '@/infrastructure/tauri-client';
import { Markdown as ReactMarkdown } from '@/components/ui/markdown';

// ────────────────────────────────────────────────────────────
//  Artifact Types
// ────────────────────────────────────────────────────────────

type ArtifactType = 'spec' | 'kanban' | 'diagram' | 'brief';

interface ArtifactConfig {
  id: ArtifactType;
  label: string;
  icon: React.FC<any>;
  color: string;
  description: string;
  systemPrompt: string;
}

const ARTIFACT_CONFIGS: ArtifactConfig[] = [
  {
    id: 'spec',
    label: 'Feature Spec',
    icon: FileCode2,
    color: 'from-blue-600 to-cyan-600',
    description: 'Structured spec with goals, requirements, and open questions',
    systemPrompt: `You are a senior product manager drafting a live feature specification based on a meeting transcript. 
Output a clean Markdown spec with these sections: ## Goal, ## Background, ## Requirements (bulleted), ## Out of Scope, ## Open Questions.
Keep it concise and actionable. Use only what is explicitly discussed in the transcript — do not fabricate.`,
  },
  {
    id: 'kanban',
    label: 'Action Board',
    icon: ListTodo,
    color: 'from-emerald-600 to-teal-600',
    description: 'Kanban-style action items grouped by owner and status',
    systemPrompt: `You are a project manager extracting action items from a meeting transcript.
Output structured Markdown with sections: ## 🔴 Immediate (by EOD), ## 🟡 This Week, ## 🟢 Backlog.
Under each, list items as: "- **[Owner]**: Task description". If owner is unknown, use "Unassigned".
Keep tasks specific and actionable.`,
  },
  {
    id: 'diagram',
    label: 'Flow Diagram',
    icon: GitBranch,
    color: 'from-violet-600 to-purple-600',
    description: 'Mermaid flow diagram of the process or system discussed',
    systemPrompt: `You are a technical architect creating a flow diagram from a meeting transcript.
Output ONLY a valid Mermaid flowchart (no other text). Use "flowchart TD" format.
Capture the main process, decisions, and system interactions discussed. Keep it concise (max 12 nodes).
Example format:
\`\`\`mermaid
flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action A]
    B -->|No| D[Action B]
\`\`\``,
  },
  {
    id: 'brief',
    label: 'Executive Brief',
    icon: Sparkles,
    color: 'from-amber-600 to-orange-600',
    description: 'One-page executive summary for stakeholders',
    systemPrompt: `You are a communication expert creating an executive brief from a meeting.
Output clean Markdown with: ## TL;DR (2-3 sentences max), ## Key Decisions (bulleted), ## What's Changing (bulleted), ## Next Steps (bulleted with owners if mentioned).
Write for a busy executive who wasn't in the meeting. Be direct and professional.`,
  },
];

// ────────────────────────────────────────────────────────────
//  Component
// ────────────────────────────────────────────────────────────

interface LiveArtifactsTabProps {
  lectureId: string;
  transcript?: string;
}

export function LiveArtifactsTab({ lectureId, transcript: propTranscript }: LiveArtifactsTabProps) {
  const [activeType, setActiveType] = useState<ArtifactType>('spec');
  const [artifacts, setArtifacts] = useState<Record<ArtifactType, string | null>>({
    spec: null, kanban: null, diagram: null, brief: null,
  });
  const [generating, setGenerating] = useState<Record<ArtifactType, boolean>>({
    spec: false, kanban: false, diagram: false, brief: false,
  });
  const [copied, setCopied] = useState(false);
  const [liveBuffer, setLiveBuffer] = useState('');
  const [captionCount, setCaptionCount] = useState(0);
  const [autoGenEnabled, setAutoGenEnabled] = useState(true);
  const [lastGenAt, setLastGenAt] = useState<number | null>(null);
  const [insightCount, setInsightCount] = useState({ actionItems: 0, risks: 0 });

  const liveBufferRef = useRef('');
  const autoGenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generatingRef = useRef(generating);
  generatingRef.current = generating;

  // ── Live transcript subscription ───────────────────────────
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const setup = async () => {
      unlisten = await TauriClient.onTranscriptUpdate((data) => {
        if (data.lectureId !== lectureId) return;
        setLiveBuffer(prev => {
          const combined = prev + '\n' + data.content;
          const updated = combined.length > 8000 ? combined.slice(-8000) : combined;
          liveBufferRef.current = updated;
          return updated;
        });
        setCaptionCount(c => c + 1);

        // Auto-gen: debounce 30s after new caption batch arrives
        if (autoGenEnabled) {
          if (autoGenTimerRef.current) clearTimeout(autoGenTimerRef.current);
          autoGenTimerRef.current = setTimeout(() => {
            if (!generatingRef.current[activeType]) {
              generateArtifact(activeType);
            }
          }, 30000);
        }
      });
    };
    setup().catch(console.error);
    return () => {
      if (unlisten) unlisten();
      if (autoGenTimerRef.current) clearTimeout(autoGenTimerRef.current);
    };
  }, [lectureId, activeType, autoGenEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const lowerBuffer = liveBuffer.toLowerCase();
    const actions = (lowerBuffer.match(/action item|todo|will do|follow up/g) || []).length;
    const risks = (lowerBuffer.match(/risk|objection|expensive|security/g) || []).length;
    setInsightCount({ actionItems: actions, risks });
  }, [liveBuffer]);

  // ── Generate an artifact ───────────────────────────────────
  const generateArtifact = useCallback(async (type: ArtifactType) => {
    if (generatingRef.current[type]) return;

    // Get transcript context: prefer live buffer, else fall back to propTranscript
    const context = liveBufferRef.current || propTranscript || '';
    if (!context.trim()) return;

    setGenerating(prev => ({ ...prev, [type]: true }));

    const config = ARTIFACT_CONFIGS.find(c => c.id === type)!;
    const prompt = `Meeting Transcript (partial or complete):\n---\n${context.slice(-6000)}\n---\n\nGenerate the ${config.label} for this meeting.`;

    try {
      const result = await TauriClient.globalAskAi(prompt);
      setArtifacts(prev => ({ ...prev, [type]: result }));
      setLastGenAt(Date.now());
    } catch (e: any) {
      console.error('[LiveArtifacts] Generation failed', e);
    } finally {
      setGenerating(prev => ({ ...prev, [type]: false }));
    }
  }, [propTranscript]);

  const currentArtifact = artifacts[activeType];
  const isGenerating = generating[activeType];
  const currentConfig = ARTIFACT_CONFIGS.find(c => c.id === activeType)!;

  const copyArtifact = () => {
    if (currentArtifact) {
      navigator.clipboard.writeText(currentArtifact);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ────────────────────────────────────────────────────────────
  //  Render
  // ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto w-full p-2 sm:p-4 gap-3">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 mr-auto">
          <Layers size={16} className="text-[color:var(--accent)]" />
          <h3 className="text-sm font-semibold text-foreground">Live Artifacts</h3>
          <span className="text-[10px] text-muted-foreground">Auto-drafts concrete outputs as the meeting happens</span>
        </div>

        {captionCount > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
            <Activity size={9} className="animate-pulse" />
            Live — {captionCount} caption segments
          </span>
        )}
        
        {(insightCount.actionItems > 0 || insightCount.risks > 0) && (
          <div className="flex items-center gap-2">
            {insightCount.actionItems > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                {insightCount.actionItems} Action{insightCount.actionItems > 1 ? 's' : ''}
              </span>
            )}
            {insightCount.risks > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2 py-0.5 rounded-full">
                {insightCount.risks} Risk{insightCount.risks > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        <button
          onClick={() => setAutoGenEnabled(v => !v)}
          className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full border transition-all font-medium ${
            autoGenEnabled
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-surface border-border/50 text-muted-foreground'
          }`}
        >
          <Zap size={11} />
          Auto-draft {autoGenEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* ── Artifact Type Tabs ───────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {ARTIFACT_CONFIGS.map(config => {
          const Icon = config.icon;
          const isActive = activeType === config.id;
          const hasContent = !!artifacts[config.id];
          const isGen = generating[config.id];
          return (
            <button
              key={config.id}
              onClick={() => setActiveType(config.id)}
              className={`relative group flex flex-col items-start gap-1.5 p-3 rounded-2xl border text-left transition-all ${
                isActive
                  ? 'bg-surface-hover border-primary/30 shadow-sm'
                  : 'bg-surface/50 border-border/40 hover:border-border/70 hover:bg-surface'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center shrink-0 shadow-sm`}>
                {isGen ? <Loader2 size={14} className="animate-spin text-white" /> : <Icon size={14} className="text-white" />}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-foreground">{config.label}</span>
                  {hasContent && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </div>
                <p className="text-[10px] text-muted-foreground line-clamp-2">{config.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Generate Button & Status ─────────────────────── */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => generateArtifact(activeType)}
          disabled={isGenerating || (!liveBuffer.trim() && !propTranscript?.trim())}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all text-white shadow-sm bg-gradient-to-r ${currentConfig.color} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isGenerating
            ? <><Loader2 size={14} className="animate-spin" /> Generating {currentConfig.label}…</>
            : <><currentConfig.icon size={14} /> Generate {currentConfig.label}</>
          }
        </button>

        {currentArtifact && (
          <>
            <button
              onClick={() => generateArtifact(activeType)}
              disabled={isGenerating}
              className="p-2 rounded-full text-muted-foreground hover:text-foreground bg-surface border border-border/50 hover:bg-surface-hover transition-colors"
              title="Regenerate"
            >
              <RefreshCw size={13} className={isGenerating ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={copyArtifact}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-surface border border-border/50 hover:bg-surface-hover transition-colors px-3 py-1.5 rounded-full"
            >
              {copied ? <><Check size={11} className="text-emerald-400" /> Copied</> : <><Copy size={11} /> Copy</>}
            </button>
          </>
        )}

        {lastGenAt && (
          <span className="text-[10px] text-muted-foreground ml-auto">
            Last generated {Math.round((Date.now() - lastGenAt) / 1000)}s ago
          </span>
        )}
      </div>

      {/* ── Artifact Content ─────────────────────────────── */}
      <div className="flex-1 overflow-hidden rounded-2xl border border-border/40 bg-surface/20 min-h-0">
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
            <div className="relative">
              <div className={`w-16 h-16 rounded-3xl bg-gradient-to-br ${currentConfig.color} opacity-10 absolute inset-0 animate-ping`} />
              <div className={`w-16 h-16 rounded-3xl bg-gradient-to-br ${currentConfig.color} flex items-center justify-center relative`}>
                <currentConfig.icon size={28} className="text-white" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground mb-1">Drafting {currentConfig.label}…</p>
              <p className="text-xs text-muted-foreground max-w-[280px]">
                Analyzing the meeting transcript to build a concrete, shareable artifact
              </p>
            </div>
            {/* Fake typing lines for polish */}
            <div className="w-full max-w-sm space-y-2 mt-2">
              {[80, 60, 90, 40].map((w, i) => (
                <div key={i} className={`h-2.5 rounded-full bg-surface-hover animate-pulse`}
                  style={{ width: `${w}%`, animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          </div>
        ) : currentArtifact ? (
          <div className="h-full overflow-y-auto p-6 prose prose-sm prose-invert max-w-none">
            <ReactMarkdown>{currentArtifact}</ReactMarkdown>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
            <div className={`w-16 h-16 rounded-3xl bg-gradient-to-br ${currentConfig.color} opacity-10 flex items-center justify-center`}>
              <currentConfig.icon size={28} className="text-white opacity-50" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">{currentConfig.label} not yet generated</p>
              <p className="text-xs text-muted-foreground max-w-[260px]">
                {captionCount > 0
                  ? `Meeting is live with ${captionCount} caption segments. Click Generate above, or wait for auto-draft.`
                  : 'Start a meeting or load an existing transcript, then click Generate to draft this artifact.'
                }
              </p>
            </div>
            {!liveBuffer && !propTranscript && (
              <p className="text-[10px] text-muted-foreground/50 bg-surface/50 border border-border/30 rounded-lg px-3 py-2">
                💡 Tip: Start recording a meeting to get live transcript data for artifact generation
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
