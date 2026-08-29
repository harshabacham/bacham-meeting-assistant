import { BrainCircuit, Sparkles, Loader2 } from 'lucide-react';
import { LectureIntelligenceView } from '@/components/study/LectureIntelligenceView';
import { Button } from '@/components/ui/button';

interface SummaryTabProps {
  summary?: string | null;
  summaryError?: string | null;
  isGeneratingSummary?: boolean;
  onGenerateSummary?: () => void;
  artifacts?: Record<string, any>;
}

export function SummaryTab({
  summary,
  summaryError,
  isGeneratingSummary = false,
  onGenerateSummary,
  artifacts = {},
}: SummaryTabProps) {
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
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Top Action Bar */}
      <div className="flex items-center justify-end px-6 py-3 shrink-0">

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
                {aiIntelligenceData ? 'Regenerate Summary' : 'Generate Summary'}
              </>
            )}
          </Button>
        )}
      </div>

      {/* Error Strip */}
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

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0 relative">
        <div className="p-6 h-full max-w-4xl mx-auto">
          {aiIntelligenceData ? (
            <LectureIntelligenceView data={aiIntelligenceData} />
          ) : isGeneratingSummary ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4 text-center h-full">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
                <BrainCircuit className="h-8 w-8 text-primary animate-spin" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-semibold text-foreground">Synthesizing Intelligence</h4>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Analyzing audio transcript, visual keyframes, and shorthand notes…
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[80%] space-y-4 text-center border border-dashed border-border/60 rounded-2xl p-8 bg-surface/10">
              <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <div className="space-y-1 max-w-md">
                <h4 className="text-sm font-semibold text-foreground">No Intelligence Yet</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Click below to generate grounded meeting notes, chapter breakdowns, decisions, and action items using the multimodal AI engine.
                </p>
              </div>
              {onGenerateSummary && (
                <Button onClick={onGenerateSummary} className="rounded-xl bg-primary text-primary-foreground font-semibold text-xs px-5 py-2 h-auto shadow-sm mt-4">
                  <Sparkles size={13} className="mr-1.5" /> Generate Meeting Intelligence
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
