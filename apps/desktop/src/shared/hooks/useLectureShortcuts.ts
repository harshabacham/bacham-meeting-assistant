import { useEffect } from 'react';
import { useLectureSyncStore } from '@/shared/stores/lectureSyncStore';

export function useLectureShortcuts(
  videoRef: React.RefObject<HTMLVideoElement | null>
) {
  const { isPlaying, seekTo, currentTimeMs } = useLectureSyncStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea' || 
                      (document.activeElement as HTMLElement)?.isContentEditable;

      if (isInput) {
        return;
      }

      switch (e.code) {
        case 'Space':
        case 'KeyK':
          e.preventDefault();
          if (videoRef.current) {
             if (videoRef.current.paused) {
                 videoRef.current.play();
             } else {
                 videoRef.current.pause();
             }
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekTo(Math.max(0, currentTimeMs - 5000));
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekTo(currentTimeMs + 5000);
          break;
        case 'KeyJ':
          e.preventDefault();
          seekTo(Math.max(0, currentTimeMs - 10000));
          break;
        case 'KeyL':
          e.preventDefault();
          seekTo(currentTimeMs + 10000);
          break;
        case 'KeyM':
          e.preventDefault();
          if (videoRef.current) {
              videoRef.current.muted = !videoRef.current.muted;
          }
          break;
        case 'KeyF':
          e.preventDefault();
          if (videoRef.current) {
            if (document.fullscreenElement) {
              document.exitFullscreen();
            } else {
              videoRef.current.requestFullscreen();
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [videoRef, isPlaying, seekTo, currentTimeMs]);
}
