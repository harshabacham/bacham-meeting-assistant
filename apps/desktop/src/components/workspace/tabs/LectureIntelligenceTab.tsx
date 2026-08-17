import { BrainCircuit, Loader2, Zap } from 'lucide-react';
import { LectureIntelligenceView } from '@/components/study/LectureIntelligenceView';
import { Button } from '@/components/ui/button';

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
}: LectureIntelligenceTabProps) {
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
                return <LectureIntelligenceView data={parsed} />;
              } catch (e) {
                return <LectureIntelligenceView data={{ executive_summary: summary }} />;
              }
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
