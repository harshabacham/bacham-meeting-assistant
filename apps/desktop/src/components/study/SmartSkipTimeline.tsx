import { FastForward } from 'lucide-react';

interface SkipSegment {
  id: string;
  startMs: number;
  endMs: number;
  segmentType: string; // 'essential', 'helpful', 'optional'
  category: string;
  summary: string;
}

interface SmartSkipTimelineProps {
  segments: SkipSegment[];
  durationMs: number;
  onSeek: (ms: number) => void;
  autoSkipEnabled: boolean;
  setAutoSkipEnabled: (enabled: boolean) => void;
}

export function SmartSkipTimeline({ 
  segments, 
  durationMs, 
  onSeek,
  autoSkipEnabled,
  setAutoSkipEnabled
}: SmartSkipTimelineProps) {
  if (segments.length === 0 || durationMs <= 0) return null;

  return (
    <div className="bg-surface/60 border border-border/40 rounded-xl p-2.5 px-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <FastForward size={13} className="text-primary animate-pulse" />
          <span className="text-[10px] font-bold tracking-wide uppercase text-muted-foreground">Smart Skip AI Timeline</span>
        </div>

        <button
          onClick={() => setAutoSkipEnabled(!autoSkipEnabled)}
          className={`px-2 py-0.5 rounded-md text-[9px] font-bold border transition-all active:scale-[0.98] ${
            autoSkipEnabled
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-zinc-800/40 text-zinc-400 border-border/50'
          }`}
        >
          Auto-Skip: {autoSkipEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Sleek, thinner timeline bar */}
      <div className="relative w-full h-1.5 bg-[#1F2228] rounded-full overflow-hidden flex cursor-pointer">
        {segments.map(s => {
          const widthPct = ((s.endMs - s.startMs) / durationMs) * 100;
          const bg =
            s.segmentType === 'essential'
              ? 'bg-emerald-500 hover:brightness-110'
              : s.segmentType === 'helpful'
              ? 'bg-blue-500 hover:brightness-110'
              : 'bg-zinc-600/40 hover:brightness-125';

          return (
            <div
              key={s.id}
              onClick={() => onSeek(s.startMs)}
              style={{ width: `${widthPct}%` }}
              className={`h-full transition-all border-r border-background/10 ${bg}`}
              title={`${s.segmentType.toUpperCase()}: ${s.summary}`}
            />
          );
        })}
      </div>

      {/* Mini Legend */}
      <div className="flex items-center justify-between text-[9px] text-muted-foreground">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Essential</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>Helpful</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600/40" />
            <span>Optional</span>
          </span>
        </div>
        <span className="text-[9px] opacity-60">Seek by clicking segments</span>
      </div>
    </div>
  );
}
