import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, X, ExternalLink, Sparkles, FileText, Image as ImageIcon } from 'lucide-react';
import { Lecture } from '@/shared/types';
import { TauriClient } from '@/infrastructure/tauri-client';

interface QuickLookPreviewProps {
  lecture: Lecture | null;
  onClose: () => void;
}

export function QuickLookPreview({ lecture, onClose }: QuickLookPreviewProps) {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [screenshots, setScreenshots] = useState<any[]>([]);

  useEffect(() => {
    if (!lecture) return;
    let isMounted = true;

    TauriClient.getSummary(lecture.id).then(s => { if (isMounted) setSummary(s); }).catch(() => {});
    TauriClient.getTranscript(lecture.id).then(t => { if (isMounted) setTranscript(t); }).catch(() => {});
    TauriClient.getScreenshots(lecture.id).then(s => { if (isMounted) setScreenshots(s.slice(0, 6)); }).catch(() => {});

    return () => { isMounted = false; };
  }, [lecture]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === ' ' || e.key === 'Escape') && lecture) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lecture, onClose]);

  if (!lecture) return null;

  const mins = Math.round((lecture.durationMs ?? 0) / 60000);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-2xl bg-surface border border-border/80 rounded-2xl shadow-lg overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between bg-surface-raised/50 shrink-0">
            <div className="flex items-center gap-2 min-w-0 pr-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary px-2 py-0.5 rounded bg-primary/10 shrink-0">
                Quick Look (Space)
              </span>
              <h2 className="text-base font-bold text-foreground truncate">{lecture.title || 'Untitled Lecture'}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors shrink-0"
              title="Close Preview (Space/Esc)"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Meta bar */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pb-3 border-b border-border/40">
              {lecture.course && (
                <span className="font-semibold text-foreground bg-muted px-2 py-0.5 rounded">
                  {lecture.course}
                </span>
              )}
              {mins > 0 && (
                <span className="flex items-center gap-1">
                  <Clock size={12} /> {mins}m
                </span>
              )}
              <span>Created {new Date(lecture.createdAt).toLocaleDateString()}</span>
            </div>

            {/* Summary Snippet */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <Sparkles size={14} className="text-primary" />
                <span>AI Summary</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4 bg-surface-hover p-3 rounded-xl border border-border/40">
                {summary || 'AI Summary will appear here after lecture processing...'}
              </p>
            </div>

            {/* Transcript Snippet */}
            {transcript && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <FileText size={14} className="text-muted-foreground" />
                  <span>Transcript Preview</span>
                </div>
                <p className="text-xs text-muted-foreground/80 leading-relaxed line-clamp-3 bg-surface-hover/50 p-3 rounded-xl border border-border/30">
                  {transcript}
                </p>
              </div>
            )}

            {/* Keyframe Screenshots */}
            {screenshots.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <ImageIcon size={14} className="text-muted-foreground" />
                  <span>Keyframe Screenshots</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {screenshots.map((s, idx) => (
                    <div key={idx} className="aspect-video bg-muted rounded-lg overflow-hidden border border-border/50">
                      <img src={s.filePath} alt="Keyframe" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-border/50 bg-surface-raised/50 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-muted-foreground">Press Space or Esc to close</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  onClose();
                  navigate(`/lectures/${lecture.id}`);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
              >
                <ExternalLink size={13} /> Open Full Workspace
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
