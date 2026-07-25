import { TimelineStrip } from '@/components/timeline/TimelineStrip';
import { TimelineEvent } from '@/infrastructure/tauri-client';
import { Loader2 } from 'lucide-react';
import { useLectureSyncStore } from '@/shared/stores/lectureSyncStore';

interface TimelineTabProps {
  timelineEvents: TimelineEvent[];
  durationMs: number;
  isPipelineRunning: boolean;
  onJumpToTime: (ms: number) => void;
}

export function TimelineTab({ timelineEvents, durationMs, isPipelineRunning, onJumpToTime }: TimelineTabProps) {
  const { currentTimeMs } = useLectureSyncStore();

  return (
    <div className="flex-1 overflow-y-auto p-4 h-full">
      <div className="max-w-4xl mx-auto">
        <TimelineStrip 
          events={timelineEvents} 
          durationMs={durationMs}
          currentPositionMs={currentTimeMs}
          onEventClick={(e) => onJumpToTime(e.timestampMs)}
        />

        {/* No data state while pipeline running */}
        {timelineEvents.length === 0 && isPipelineRunning && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
            <Loader2 size={24} className="animate-spin text-primary" />
            <p className="text-xs text-center">Processing timeline data...</p>
          </div>
        )}
        
        {timelineEvents.length === 0 && !isPipelineRunning && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
            <p className="text-xs text-center">No timeline events available.</p>
          </div>
        )}
      </div>
    </div>
  );
}
