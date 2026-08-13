import { useEffect, useState } from "react";
import { Video, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { useLectureSyncStore } from '@/shared/stores/lectureSyncStore';
import { TauriClient } from '@/infrastructure/tauri-client';
import { Button } from '@/components';

interface VideoTabProps {
  lectureId: string;
  videoSrc: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isPipelineRunning: boolean;
  isPipelineError: boolean;
  pipelineStatusMessage: string | undefined;
  autoSkipEnabled: boolean;
  skipSegments: any[];
}

export function VideoTab({ 
  lectureId, 
  videoSrc, 
  videoRef, 
  isPipelineRunning, 
  isPipelineError, 
  pipelineStatusMessage,
  autoSkipEnabled,
  skipSegments
}: VideoTabProps) {
  const { setCurrentTimeMs, setIsPlaying, seekTargetMs, clearSeekTarget } = useLectureSyncStore();
  const [highlights, setHighlights] = useState<{startMs: number, endMs: number, reason: string}[] | null>(null);
  const [isGeneratingHighlights, setIsGeneratingHighlights] = useState(false);
  const { showToast } = useToast();
  const [isHighlightReelPlaying, setIsHighlightReelPlaying] = useState(false);
  const [currentHighlightIndex, setCurrentHighlightIndex] = useState(0);

  useEffect(() => {
    if (seekTargetMs !== null && videoRef.current) {
      videoRef.current.currentTime = seekTargetMs / 1000;
      videoRef.current.play().catch(() => {});
      clearSeekTarget();
    }
  }, [seekTargetMs, videoRef, clearSeekTarget]);

  // Handle Highlight Reel playback logic
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isHighlightReelPlaying || !highlights || highlights.length === 0) return;

    const handleTimeUpdate = () => {
      const currentMs = video.currentTime * 1000;
      const currentHighlight = highlights[currentHighlightIndex];
      
      if (!currentHighlight) {
        setIsHighlightReelPlaying(false);
        return;
      }

      if (currentMs >= currentHighlight.endMs) {
        if (currentHighlightIndex < highlights.length - 1) {
          const nextIndex = currentHighlightIndex + 1;
          setCurrentHighlightIndex(nextIndex);
          video.currentTime = highlights[nextIndex].startMs / 1000;
          video.play().catch(() => {});
        } else {
          setIsHighlightReelPlaying(false);
          video.pause();
        }
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [isHighlightReelPlaying, highlights, currentHighlightIndex, videoRef]);

  const toggleHighlightReel = async () => {
    if (isHighlightReelPlaying) {
      setIsHighlightReelPlaying(false);
      return;
    }

    if (highlights) {
      setIsHighlightReelPlaying(true);
      setCurrentHighlightIndex(0);
      if (videoRef.current) {
        videoRef.current.currentTime = highlights[0].startMs / 1000;
        videoRef.current.play().catch(() => {});
      }
      return;
    }

    setIsGeneratingHighlights(true);
    try {
      const newHighlights = await TauriClient.generateHighlightReel(lectureId);
      if (newHighlights && newHighlights.length > 0) {
        setHighlights(newHighlights);
        setIsHighlightReelPlaying(true);
        setCurrentHighlightIndex(0);
        if (videoRef.current) {
          videoRef.current.currentTime = newHighlights[0].startMs / 1000;
          videoRef.current.play().catch(() => {});
        }
      } else {
        showToast("Failed to generate highlights. Please try again.", 'error');
      }
    } catch (e: any) {
      showToast("Error generating highlights: " + e.message, 'error');
    } finally {
      setIsGeneratingHighlights(false);
    }
  };

  return (
    <div className="h-full relative flex flex-col">
      {videoSrc ? (
        <div className="flex-1 flex flex-col p-2 sm:p-4 bg-background rounded-xl">
            
          <div className="flex justify-between items-center mb-3 px-2">
            <div>
               {isHighlightReelPlaying && highlights && (
                   <div className="flex items-center gap-2 bg-accent/10 text-accent px-3 py-1.5 rounded-full text-xs font-semibold animate-in fade-in slide-in-from-top-2">
                       <Sparkles size={14} className="animate-pulse" />
                       Playing Highlight {currentHighlightIndex + 1} of {highlights.length}: {highlights[currentHighlightIndex].reason}
                   </div>
               )}
            </div>
            <Button 
                variant={isHighlightReelPlaying ? "default" : "outline"}
                className={`gap-2 shadow-sm ${isHighlightReelPlaying ? "bg-accent hover:bg-accent/90 text-black" : "border-border/60 hover:bg-surface"}`}
                onClick={toggleHighlightReel}
                disabled={isGeneratingHighlights}
            >
                {isGeneratingHighlights ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {isGeneratingHighlights ? "Analyzing..." : isHighlightReelPlaying ? "Stop Highlights" : "Play Highlight Reel"}
            </Button>
          </div>

          <div className="flex-1 min-h-0 flex items-center justify-center">
            <video 
                ref={videoRef}
                controls 
                className="max-h-full max-w-full rounded-xl shadow-2xl transition-all"
                src={videoSrc}
                key={videoSrc} // Force remount if src changes
                onTimeUpdate={(e) => {
                    const currentMs = e.currentTarget.currentTime * 1000;
                    setCurrentTimeMs(currentMs);
                    
                    if (autoSkipEnabled && skipSegments && skipSegments.length > 0) {
                      const activeOptional = skipSegments.find(s => 
                        s.segmentType === 'optional' && 
                        currentMs >= s.startMs && 
                        currentMs < s.endMs
                      );
                      if (activeOptional) {
                        e.currentTarget.currentTime = activeOptional.endMs / 1000;
                      }
                    }
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground p-8">
          <div className="h-16 w-16 bg-surface/50 rounded-full flex items-center justify-center">
            {isPipelineError ? (
              <AlertCircle className="h-8 w-8 text-destructive opacity-80" />
            ) : (
              <Video className="h-8 w-8 opacity-30" />
            )}
          </div>
          <div className="text-center">
            <p className="font-medium text-muted-foreground mb-1">
              {isPipelineError ? 'Processing Failed' : isPipelineRunning ? 'Processing Recording...' : 'No Video Available'}
            </p>
            <p className={`text-sm ${isPipelineError ? 'text-destructive max-w-md' : ''}`}>
              {isPipelineError ? pipelineStatusMessage : isPipelineRunning ? pipelineStatusMessage : 'Start a recording session to capture video.'}
            </p>
            {isPipelineRunning && <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto mt-3" />}
          </div>
        </div>
      )}
    </div>
  );
}
