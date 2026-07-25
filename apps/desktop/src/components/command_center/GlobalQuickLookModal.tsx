import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ExternalLink,
  Sparkles,
  FileText,
  Clock,
  Code,
  Sigma,
  PieChart,
  BookOpen,
  Image as ImageIcon,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { useAiCommandCenterStore } from '@/shared/stores/aiCommandCenterStore';

export function GlobalQuickLookModal() {
  const { quickLookItem, closeQuickLook, submitQuery } = useAiCommandCenterStore();
  const navigate = useNavigate();

  // Listen to Spacebar or Esc key globally to close/toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in input or textarea
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, [contenteditable="true"]')) {
        return;
      }

      if (e.key === ' ' && quickLookItem) {
        e.preventDefault();
        closeQuickLook();
      } else if (e.key === 'Escape' && quickLookItem) {
        e.preventDefault();
        closeQuickLook();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickLookItem, closeQuickLook]);

  if (!quickLookItem) return null;

  const getIcon = () => {
    switch (quickLookItem.type) {
      case 'lecture': return BookOpen;
      case 'notes': return FileText;
      case 'code': return Code;
      case 'formula': return Sigma;
      case 'diagram': return PieChart;
      case 'screenshot': return ImageIcon;
      case 'flashcard': return Layers;
      case 'quiz': return HelpCircle;
      default: return Sparkles;
    }
  };

  const IconComponent = getIcon();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-2xl bg-surface border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between bg-surface-raised/50 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0 pr-4">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary px-2 py-0.5 rounded bg-primary/10 shrink-0">
                <IconComponent size={12} />
                Quick Look (Space)
              </span>
              <h2 className="text-base font-bold text-foreground truncate">{quickLookItem.title}</h2>
            </div>
            <button
              onClick={closeQuickLook}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors shrink-0"
              title="Close Preview (Space/Esc)"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin scrollbar-thumb-border">
            {/* Meta bar */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pb-3 border-b border-border/40">
              {quickLookItem.course && (
                <span className="font-semibold text-foreground bg-muted px-2.5 py-0.5 rounded-lg">
                  {quickLookItem.course}
                </span>
              )}
              {quickLookItem.durationMs && (
                <span className="flex items-center gap-1">
                  <Clock size={12} /> {Math.round(quickLookItem.durationMs / 60000)}m
                </span>
              )}
              {quickLookItem.createdAt && (
                <span>Date: {new Date(quickLookItem.createdAt).toLocaleDateString()}</span>
              )}
            </div>

            {/* Content Body */}
            {quickLookItem.content && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <Sparkles size={14} className="text-primary" />
                  <span>Content Overview</span>
                </div>
                <div className="text-xs text-foreground/90 leading-relaxed bg-surface-raised/60 p-4 rounded-xl border border-border/50 font-mono whitespace-pre-wrap">
                  {quickLookItem.content}
                </div>
              </div>
            )}

            {/* Code Snippet Preview */}
            {quickLookItem.codeLanguage && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-foreground">
                  <span className="flex items-center gap-2">
                    <Code size={14} className="text-emerald-400" />
                    <span>Code Snippet ({quickLookItem.codeLanguage})</span>
                  </span>
                </div>
                <pre className="text-xs text-emerald-300 font-mono bg-zinc-950 p-4 rounded-xl border border-border/60 overflow-x-auto">
                  <code>{quickLookItem.content}</code>
                </pre>
              </div>
            )}

            {/* Screenshots */}
            {quickLookItem.screenshots && quickLookItem.screenshots.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <ImageIcon size={14} className="text-muted-foreground" />
                  <span>Captured Keyframes</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {quickLookItem.screenshots.map((s, idx) => (
                    <div key={idx} className="aspect-video bg-muted rounded-lg overflow-hidden border border-border/50">
                      <img src={s.filePath || s.url} alt="Keyframe" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-border/50 bg-surface-raised/50 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-muted-foreground">Press Space or Esc to dismiss</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const item = quickLookItem;
                  closeQuickLook();
                  submitQuery(`Explain this ${item.type}: "${item.title}"`, `Explain ${item.title}`);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-surface-hover border border-border/60 text-foreground rounded-xl text-xs font-semibold hover:bg-surface-raised transition-colors"
              >
                <Sparkles size={13} className="text-primary" /> AI Insights
              </button>

              {quickLookItem.lectureId && (
                <button
                  onClick={() => {
                    const id = quickLookItem.lectureId;
                    closeQuickLook();
                    navigate(`/lectures/${id}`);
                  }}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
                >
                  <ExternalLink size={13} /> Open Full Workspace
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
