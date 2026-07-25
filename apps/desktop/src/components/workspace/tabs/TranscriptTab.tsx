import { AlertCircle, Loader2, FileText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TranscriptTabProps {
  transcriptBlocks: string[];
  isPipelineError: boolean;
  isPipelineRunning: boolean;
  pipelineStatusMessage: string | undefined;
  transcriptVirtualizer: any;
  onRefresh: () => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

export function TranscriptTab({
  transcriptBlocks,
  isPipelineError,
  isPipelineRunning,
  pipelineStatusMessage,
  transcriptVirtualizer,
  onRefresh,
  scrollRef
}: TranscriptTabProps) {
  return (
    <div className="max-w-3xl mx-auto h-full" ref={scrollRef}>
      <div className="prose prose-sm prose-invert max-w-none relative" style={{ height: transcriptBlocks.length > 0 ? `${transcriptVirtualizer.getTotalSize()}px` : 'auto' }}>
        {transcriptBlocks.length > 0 ? (
          transcriptVirtualizer.getVirtualItems().map((virtualRow: any) => (
            <div
              key={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
              ref={transcriptVirtualizer.measureElement}
              data-index={virtualRow.index}
              className="mb-4 text-foreground leading-relaxed text-sm sm:text-base"
            >
              {transcriptBlocks[virtualRow.index]}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
            {isPipelineError ? (
              <>
                <AlertCircle className="h-10 w-10 text-destructive mb-2" />
                <p className="text-lg font-medium text-foreground">Processing Failed</p>
                <p className="text-sm text-center max-w-xs text-destructive">{pipelineStatusMessage}</p>
                <Button variant="outline" size="sm" onClick={onRefresh} className="mt-4 rounded-full border-border/50 text-xs bg-surface hover:bg-surface-hover">
                  <RefreshCw size={12} className="mr-2" /> Retry Later
                </Button>
              </>
            ) : isPipelineRunning ? (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-lg font-medium text-foreground">Processing Audio...</p>
                <p className="text-sm text-center max-w-xs">{pipelineStatusMessage}</p>
                <p className="text-xs text-muted-foreground">Transcript will appear automatically when ready</p>
              </>
            ) : (
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="italic">No transcript available.</p>
                <p className="text-xs mt-2">Record a session or check if the pipeline completed.</p>
                <Button variant="outline" size="sm" onClick={onRefresh} className="mt-4 rounded-full">
                  <RefreshCw size={12} className="mr-2" /> Refresh
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
