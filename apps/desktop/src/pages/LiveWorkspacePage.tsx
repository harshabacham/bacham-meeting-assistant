import { LiveTranscriptViewer } from '@/components/live/LiveTranscriptViewer';
import { AiScratchpad } from '@/components/live/AiScratchpad';
import { Radio, Users, CheckCircle2 } from 'lucide-react';

export function LiveWorkspacePage() {
  return (
    <div className="flex flex-col h-full bg-background p-6 gap-6 overflow-hidden">
      <header className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Radio className="text-red-500 animate-pulse w-6 h-6" />
            Live Meeting Workspace
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Take intelligent shorthand notes while the meeting happens.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-surface border border-border px-4 py-2 rounded-xl">
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-foreground">Listening</span>
          </div>
          <div className="w-px h-4 bg-border mx-2" />
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Extension Connected</span>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AiScratchpad />
        <LiveTranscriptViewer />
      </div>
    </div>
  );
}
