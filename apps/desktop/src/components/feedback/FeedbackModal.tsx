import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Send, Bug, Lightbulb, MessageSquareHeart, 
  Github, ExternalLink, Loader2, CheckCircle2, ShieldCheck, Sparkles 
} from 'lucide-react';
import { useFeedbackStore, FeedbackCategory, FeedbackRating } from '@/shared/stores/feedbackStore';
import { useAuthStore } from '@/shared/stores/authStore';
import { useToast } from '@/components/ui/ToastProvider';

const CATEGORIES: Array<{
  id: FeedbackCategory;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
}> = [
  { id: 'bug', label: 'Bug / Issue', icon: Bug, color: 'text-red-400 border-red-500/30 bg-red-500/10 hover:bg-red-500/20' },
  { id: 'suggestion', label: 'Feature Idea', icon: Lightbulb, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20' },
  { id: 'general', label: 'Praise / Feedback', icon: MessageSquareHeart, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20' },
];

const RATINGS: Array<{
  id: FeedbackRating;
  emoji: string;
  label: string;
}> = [
  { id: 'love', emoji: '🤩', label: 'Love it' },
  { id: 'good', emoji: '🙂', label: 'Good' },
  { id: 'neutral', emoji: '😐', label: 'Okay' },
  { id: 'frustrated', emoji: '😕', label: 'Frustrated' },
];

export const FeedbackModal: React.FC = () => {
  const {
    isOpen,
    category,
    rating,
    message,
    email,
    includeDiagnostics,
    isSubmitting,
    isSuccess,
    errorMessage,
    closeModal,
    setCategory,
    setRating,
    setMessage,
    setEmail,
    setIncludeDiagnostics,
    resetForm,
    submitFeedback,
    openGitHubIssue,
  } = useFeedbackStore();

  const { user } = useAuthStore();
  const { showToast } = useToast();

  // Pre-fill email from auth if empty
  useEffect(() => {
    if (isOpen && !email && user?.email) {
      setEmail(user.email);
    }
  }, [isOpen, user?.email, email, setEmail]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await submitFeedback();
    if (success) {
      showToast('Feedback sent! Thank you for helping us polish v1.0.0 🎉', 'success');
      setTimeout(() => {
        closeModal();
        resetForm();
      }, 1600);
    }
  };

  const getPlaceholder = () => {
    switch (category) {
      case 'bug':
        return 'What happened? What were you trying to do, and what went wrong? (e.g. mic disconnect during recording)';
      case 'suggestion':
        return 'What feature, shortcut, or integration would make Bacham 10x better for your workflow?';
      case 'general':
      default:
        return 'Tell us how you are using Bacham, what you like most, or any thoughts before our v1.0.0 launch...';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="relative w-full max-w-lg rounded-2xl border border-border/80 bg-surface shadow-2xl overflow-hidden"
        >
          {/* Header Accent Glow Bar */}
          <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-emerald-400" />

          <div className="p-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 mb-2">
                  <Sparkles size={12} />
                  <span>v1.0.0 Community Feedback</span>
                </div>
                <h2 className="text-base font-bold text-foreground">Share Feedback or Report an Issue</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  We are 100% open-source. Your feedback reaches our development team directly.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {isSuccess ? (
              <div className="py-10 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 size={28} />
                </div>
                <h3 className="text-sm font-bold text-foreground">Feedback Received!</h3>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Thank you for contributing to Bacham. We are actively reviewing submissions for the v1.0.0 release.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Category Selection */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    What would you like to share?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                            isSelected
                              ? `${cat.color} font-semibold shadow-sm border-current`
                              : 'border-border/60 bg-surface hover:bg-surface-hover text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Icon size={14} />
                          <span>{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Rating / Sentiment */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    How is your experience so far?
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {RATINGS.map((rate) => {
                      const isSelected = rating === rate.id;
                      return (
                        <button
                          key={rate.id}
                          type="button"
                          onClick={() => setRating(rate.id)}
                          className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl text-xs border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-primary/10 border-primary text-foreground font-semibold shadow-sm'
                              : 'border-border/60 bg-surface hover:bg-surface-hover text-muted-foreground'
                          }`}
                        >
                          <span className="text-sm">{rate.emoji}</span>
                          <span className="text-[11px]">{rate.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Message Textarea */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Details <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={getPlaceholder()}
                    className="w-full px-3 py-2.5 rounded-xl text-xs bg-surface-raised border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
                    required
                  />
                </div>

                {/* Optional Email Contact */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Contact Email <span className="text-[10px] lowercase text-muted-foreground/80">(optional)</span>
                    </label>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com (if you'd like us to reply)"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-surface-raised border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-all"
                  />
                </div>

                {/* Diagnostics Toggle */}
                <div className="flex items-start gap-2.5 pt-1">
                  <input
                    type="checkbox"
                    id="include-diagnostics"
                    checked={includeDiagnostics}
                    onChange={(e) => setIncludeDiagnostics(e.target.checked)}
                    className="mt-0.5 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                  />
                  <label htmlFor="include-diagnostics" className="text-[11px] text-muted-foreground cursor-pointer select-none">
                    <div className="flex items-center gap-1 font-medium text-foreground">
                      <ShieldCheck size={12} className="text-emerald-400" />
                      <span>Include diagnostic info (Windows, App v1.0.0, current view)</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/80 block mt-0.5">
                      No recordings, notes, transcripts, or personal data are ever shared.
                    </span>
                  </label>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                    {errorMessage}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/50">
                  <button
                    type="button"
                    onClick={openGitHubIssue}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-lg hover:bg-surface-hover"
                    title="Open an issue on our public GitHub repository"
                  >
                    <Github size={13} />
                    <span>Open on GitHub</span>
                    <ExternalLink size={11} className="opacity-60" />
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-3 py-1.5 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !message.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send size={13} />
                          <span>Send Feedback</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
