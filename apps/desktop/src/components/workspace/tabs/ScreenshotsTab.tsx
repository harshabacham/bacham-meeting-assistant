import { useState } from "react";
import { Video, Maximize2, X } from 'lucide-react';
import { Screenshot } from '@/infrastructure/tauri-client';
import { TutorQuickActions } from '@/components/study/TutorQuickActions';
import { Markdown as ReactMarkdown } from '@/components/ui/markdown';

interface ScreenshotsTabProps {
  lectureId: string;
  screenshots: Screenshot[];
  screenshotImages: Record<string, string>;
  onJumpToTime: (ms: number) => void;
}

function ScreenshotCard({ 
  s, 
  image, 
  lectureId, 
  onJumpToTime, 
  onExpand 
}: { 
  s: Screenshot, 
  image: string, 
  lectureId: string, 
  onJumpToTime: (ms: number) => void,
  onExpand: () => void 
}) {
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  return (
    <div className="group rounded-xl overflow-hidden border border-border/40 hover:border-[var(--border-accent)] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-lime bg-surface/20 relative">
      <div className="cursor-pointer relative overflow-hidden" onClick={() => onJumpToTime(s.capturedAt || 0)}>
        <img src={image} alt="Screenshot" className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-300" />
        <div className="absolute inset-0 bg-[var(--glass-bg)] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="bg-[var(--glass-bg)] text-foreground text-xs px-3 py-1.5 rounded-full font-medium">Jump to video</span>
        </div>
      </div>
      <button 
        onClick={(e) => { e.stopPropagation(); onExpand(); }}
        className="absolute top-2 right-2 bg-[var(--glass-bg)] p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background hover:text-[var(--accent)] text-foreground"
        title="View Fullscreen"
      >
        <Maximize2 size={14} />
      </button>
      <div className="p-3 border-t border-border/50 text-xs flex justify-between items-center text-foreground">
        <span>Frame</span>
        <span className="font-mono text-[var(--accent)] bg-[var(--glass-bg)] px-1.5 py-0.5 rounded">
          {Math.floor((s.capturedAt || 0) / 60000)}:{Math.floor(((s.capturedAt || 0) % 60000) / 1000).toString().padStart(2, '0')}
        </span>
      </div>
      <div className="p-3 border-t border-border/50 bg-surface/10">
        <TutorQuickActions 
          lectureId={lectureId}
          targetId={s.id}
          targetText={`[Screenshot captured at ${Math.floor((s.capturedAt || 0) / 60000)}:${Math.floor(((s.capturedAt || 0) % 60000) / 1000).toString().padStart(2, '0')}]`}
          onResult={(res) => setAiResponse(res)}
        />
        {aiResponse && (
          <div className="mt-3 p-3 rounded-lg bg-primary/10 border border-primary/20 prose prose-sm prose-invert max-w-none text-xs">
            <ReactMarkdown>{aiResponse}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

export function ScreenshotsTab({ lectureId, screenshots, screenshotImages, onJumpToTime }: ScreenshotsTabProps) {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  if (screenshots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground p-8">
        <div className="h-16 w-16 bg-surface/50 rounded-full flex items-center justify-center">
          <Video className="h-8 w-8 opacity-30" />
        </div>
        <div className="text-center">
          <p className="font-medium text-muted-foreground mb-1">No Screenshots</p>
          <p className="text-sm">Screenshots captured during the lecture will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 pb-20">
        {screenshots.map(s => (
          <ScreenshotCard 
            key={s.id} 
            s={s} 
            image={screenshotImages[s.id]} 
            lectureId={lectureId} 
            onJumpToTime={onJumpToTime}
            onExpand={() => setExpandedImage(screenshotImages[s.id])}
          />
        ))}
      </div>

      {/* Expanded Modal */}
      {expandedImage && (
        <div 
          className="fixed inset-0 z-50 bg-[var(--glass-bg)] backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setExpandedImage(null)}
        >
          <button 
            className="absolute top-6 right-6 p-2 bg-surface hover:bg-surface-hover rounded-full text-foreground transition-colors"
            onClick={() => setExpandedImage(null)}
          >
            <X size={24} />
          </button>
          <img 
            src={expandedImage} 
            alt="Expanded Screenshot" 
            className="max-w-full max-h-[90vh] rounded-xl border border-border shadow-2xl" 
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
