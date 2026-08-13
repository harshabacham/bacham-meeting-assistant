import { BrainCircuit, Loader2, Zap, Clock, BookOpen, Layers, Book } from 'lucide-react';
import { Markdown as ReactMarkdown } from '@/components/ui/markdown';
import { LectureIntelligenceView } from '@/components/study/LectureIntelligenceView';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface LectureIntelligenceTabProps {
  artifacts: Record<string, any>;
  summary: string | null;
  summaryError: string | null;
  isGeneratingSummary: boolean;
  transcript: string | null;
  hasVisuals: boolean;
  isPipelineRunning: boolean;
  onGenerateSummary: () => void;
  workspaceType?: string;
}

export function LectureIntelligenceTab({
  artifacts,
  summary,
  summaryError,
  isGeneratingSummary,
  transcript,
  hasVisuals,
  isPipelineRunning,
  onGenerateSummary,
  workspaceType = 'lecture'
}: LectureIntelligenceTabProps) {
  const [summaryTier, setSummaryTier] = useState<'quick' | 'standard' | 'deep' | 'textbook'>('standard');

  const renderMultiLevelSummary = (parsed: any) => {
    const content = parsed[`${summaryTier}_summary`] || parsed[summaryTier === 'deep' ? 'deep_notes' : summaryTier === 'textbook' ? 'textbook_notes' : 'standard_summary'];
    
    // We explicitly remove executive_summary from parsed so that LectureIntelligenceView doesn't render it again
    // since the multi-tier summary (which is acting as our executive summary) is already rendered at the top.
    const viewData = { ...parsed };
    delete viewData.executive_summary;

    return (
      <div className="space-y-6">
        <div className="flex p-1 bg-surface-raised border border-border/50 rounded-xl overflow-hidden shadow-sm">
          <button onClick={() => setSummaryTier('quick')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-colors ${summaryTier === 'quick' ? 'bg-indigo-500/10 text-indigo-400' : 'text-muted-foreground hover:bg-surface-hover'}`}>
            <Clock size={14} /> {workspaceType === 'meeting' ? 'Key Decisions' : 'Quick (30s)'}
          </button>
          <button onClick={() => setSummaryTier('standard')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-colors ${summaryTier === 'standard' ? 'bg-blue-500/10 text-blue-400' : 'text-muted-foreground hover:bg-surface-hover'}`}>
            <BookOpen size={14} /> {workspaceType === 'meeting' ? 'Executive Overview' : 'Standard (5m)'}
          </button>
          <button onClick={() => setSummaryTier('deep')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-colors ${summaryTier === 'deep' ? 'bg-purple-500/10 text-purple-400' : 'text-muted-foreground hover:bg-surface-hover'}`}>
            <Layers size={14} /> {workspaceType === 'meeting' ? 'Debates & Context' : 'Deep Notes (15m)'}
          </button>
          <button onClick={() => setSummaryTier('textbook')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-colors ${summaryTier === 'textbook' ? 'bg-amber-500/10 text-amber-400' : 'text-muted-foreground hover:bg-surface-hover'}`}>
            <Book size={14} /> {workspaceType === 'meeting' ? 'Full Minutes & Actions' : 'Textbook'}
          </button>
        </div>

        <div className="bg-surface border border-border/50 rounded-xl p-8 shadow-sm">
          <div className="prose prose-sm prose-invert max-w-none">
            <ReactMarkdown>{content || "This summary level is not available yet."}</ReactMarkdown>
          </div>
        </div>

        <LectureIntelligenceView data={viewData} />
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-6">
      {artifacts['lecture_intelligence'] ? (
        <>
          <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <BrainCircuit size={14} className="text-[color:var(--accent)]" />
              <span>Generated from structured intelligence pipeline</span>
            </div>
            <Button variant="outline" onClick={onGenerateSummary} disabled={isGeneratingSummary} className="rounded-full bg-surface border-border/50 text-xs px-3 py-1 h-auto">
              {isGeneratingSummary ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Regenerating...</> : <><Zap className="h-3.5 w-3.5 mr-2 text-[color:var(--accent)]" />Regenerate</>}
            </Button>
          </div>
          {summaryError && <p className="text-destructive text-sm p-3 bg-destructive/10 rounded-lg mb-4">{summaryError}</p>}
          <LectureIntelligenceView data={artifacts['lecture_intelligence']} />
        </>
      ) : summary ? (
        <>
          <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <BrainCircuit size={14} className="text-[color:var(--accent)]" />
              <span>Core AI Summary Engine</span>
            </div>
            <Button variant="outline" onClick={onGenerateSummary} disabled={isGeneratingSummary} className="rounded-full bg-surface border-border/50 text-xs px-3 py-1 h-auto">
              {isGeneratingSummary ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Regenerating...</> : <><Zap className="h-3.5 w-3.5 mr-2 text-[color:var(--accent)]" />Regenerate</>}
            </Button>
          </div>
          <div className="w-full">
            {(() => {
              try {
                const parsed = JSON.parse(summary);
                
                // New multi-level summary check
                if (parsed.quick_summary || parsed.standard_summary || parsed.deep_notes || parsed.textbook_notes) {
                  return renderMultiLevelSummary(parsed);
                }

                // Legacy JSON Array fallback
                if (Array.isArray(parsed)) {
                  return (
                    <div className="space-y-6">
                      {parsed.map((section: any, idx: number) => (
                        <div key={idx} className="bg-surface border border-border/50 rounded-xl p-6 shadow-sm">
                          {section.section_title && (
                            <h2 className="text-lg font-semibold text-foreground mb-4 pb-3 border-b border-border/40">
                              {section.section_title}
                            </h2>
                          )}
                          <div className="prose prose-sm prose-invert max-w-none">
                            <ReactMarkdown>{section.content}</ReactMarkdown>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                }
              } catch (e) {
                // Not JSON, fallback to raw markdown
              }
              return (
                <div className="bg-surface border border-border/50 rounded-xl p-8 shadow-sm">
                  <div className="prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown>{summary}</ReactMarkdown>
                  </div>
                </div>
              );
            })()}
          </div>
        </>
      ) : (
        <div className="text-center py-20 space-y-4">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
            <BrainCircuit className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">Synthesize Knowledge</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            Let AI analyze your transcript <em>and</em> visual frames to generate a comprehensive multimodal summary.
          </p>
          {summaryError && <p className="text-destructive text-sm max-w-sm mx-auto p-3 bg-destructive/10 rounded-lg">{summaryError}</p>}
          {!transcript && !hasVisuals && !isPipelineRunning && (
            <p className="text-xs text-muted-foreground">Waiting for content to summarize...</p>
          )}
          {isPipelineRunning && (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Processing pipeline...</p>
              <p className="text-xs text-muted-foreground">Summary will auto-generate after processing</p>
            </div>
          )}
          {(transcript || hasVisuals) && !isPipelineRunning && (
            <Button onClick={onGenerateSummary} disabled={isGeneratingSummary} className="mt-4 rounded-full px-6">
              {isGeneratingSummary
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                : 'Generate Summary'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
