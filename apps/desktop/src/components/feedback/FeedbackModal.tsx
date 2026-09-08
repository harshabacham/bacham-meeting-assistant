import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Send, Bug, Lightbulb, MessageSquareHeart, 
  Github, ExternalLink, Loader2, CheckCircle2, ShieldCheck, Mail 
} from 'lucide-react';
import { useFeedbackStore, FeedbackCategory, FeedbackRating, getResolvedUserEmail } from '@/shared/stores/feedbackStore';
import { useAuthStore } from '@/shared/stores/authStore';
import { useCalendarStore } from '@/shared/stores/calendarStore';
import { useToast } from '@/components/ui/ToastProvider';

const CATEGORIES: Array<{
  id: FeedbackCategory;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconColor: string;
}> = [
  { id: 'suggestion', label: 'Feature', icon: Lightbulb, iconColor: 'text-amber-500 dark:text-amber-400' },
  { id: 'bug', label: 'Bug Report', icon: Bug, iconColor: 'text-rose-500 dark:text-rose-400' },
  { id: 'general', label: 'Feedback', icon: MessageSquareHeart, iconColor: 'text-emerald-600 dark:text-emerald-400' },
];

const RATINGS: Array<{
  id: FeedbackRating;
  emoji: string;
  label: string;
}> = [
  { id: 'love', emoji: '🤩', label: 'Love it' },
  { id: 'good', emoji: '🙂', label: 'Good' },
  { id: 'neutral', emoji: '😐', label: 'Okay' },
  { id: 'frustrated', emoji: '😕', label: 'Issues' },
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
  const { calendarEmail } = useCalendarStore();
  const { showToast } = useToast();

  const isAccountEmail = Boolean(
    user?.email && 
    !user.email.endsWith('@bacham.local') && 
    !user.email.endsWith('@bacham.app')
  );

  // Pre-fill user's genuine email if empty or dummy placeholder
  useEffect(() => {
    if (isOpen) {
      const isDummy = !email || email.endsWith('@bacham.local') || email.endsWith('@bacham.app');
      if (isDummy) {
        const resolved = getResolvedUserEmail(user?.email, calendarEmail);
        setEmail(resolved);
      }
    }
  }, [isOpen, user?.email, calendarEmail, setEmail]);

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
      showToast('Feedback sent! Thank you for helping us polish Bacham 🎉', 'success');
      setTimeout(() => {
        closeModal();
        resetForm();
      }, 1500);
    }
  };

  const getPlaceholder = () => {
    switch (category) {
      case 'bug':
        return 'What happened, and what did you expect instead?';
      case 'suggestion':
        return 'What feature or improvement would make Bacham better for you?';
      case 'general':
      default:
        return 'Share your thoughts, suggestions, or experience with us...';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/35 dark:bg-black/65 backdrop-blur-sm animate-in fade-in duration-150">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className="relative w-full max-w-md rounded-2xl border border-border bg-surface text-foreground shadow-2xl shadow-black/10 dark:shadow-black/60 overflow-hidden p-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-lime-500/15 text-lime-700 dark:bg-primary/15 dark:text-primary border border-lime-500/25 dark:border-primary/25 flex items-center justify-center">
                <MessageSquareHeart size={16} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground leading-tight">Send Feedback</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Help us improve Bacham
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={closeModal}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X size={15} />
            </button>
          </div>

          {isSuccess ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-10 flex flex-col items-center justify-center text-center space-y-2.5"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center justify-center">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-sm font-bold text-foreground">Feedback Sent!</h3>
              <p className="text-xs text-muted-foreground max-w-xs">
                Thank you for helping make Bacham better.
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Category Segmented Control */}
              <div className="flex p-1 bg-surface-raised rounded-xl border border-border gap-1">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`relative flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors cursor-pointer select-none ${
                        isSelected ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
                      }`}
                    >
                      {isSelected && (
                        <motion.div
                          layoutId="feedback-category-pill"
                          className="absolute inset-0 bg-surface rounded-lg border border-border shadow-xs"
                          transition={{ type: 'spring', bounce: 0.15, duration: 0.25 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1.5">
                        <Icon size={13} className={isSelected ? cat.iconColor : 'opacity-70'} />
                        <span>{cat.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Sentiment / Experience */}
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[11px] font-medium text-muted-foreground">Experience</span>
                <div className="flex items-center gap-1">
                  {RATINGS.map((rate) => {
                    const isSelected = rating === rate.id;
                    return (
                      <button
                        key={rate.id}
                        type="button"
                        onClick={() => setRating(rate.id)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-surface-raised text-foreground font-semibold border border-border shadow-xs'
                            : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover border border-transparent'
                        }`}
                        title={rate.label}
                      >
                        <span className="text-sm">{rate.emoji}</span>
                        {isSelected && <span className="text-[11px]">{rate.label}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message Details */}
              <div>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={getPlaceholder()}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-surface-raised border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:bg-surface focus:border-border-accent focus:ring-1 focus:ring-border-accent transition-all resize-none leading-relaxed"
                  required
                  autoFocus
                />
              </div>

              {/* Contact Email */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                    <Mail size={12} className="text-muted-foreground" />
                    <span>Contact Email</span>
                  </label>
                  {isAccountEmail && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 size={11} />
                      Your account email
                    </span>
                  )}
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (e.target.value.includes('@') && !e.target.value.endsWith('@bacham.local')) {
                      try {
                        localStorage.setItem('bacham_feedback_email', e.target.value.trim());
                      } catch {}
                    }
                  }}
                  placeholder="your.email@example.com (optional)"
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-surface-raised border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:bg-surface focus:border-border-accent focus:ring-1 focus:ring-border-accent transition-all font-normal"
                />
              </div>

              {/* Diagnostics Toggle */}
              <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none hover:text-foreground transition-colors">
                  <input
                    type="checkbox"
                    checked={includeDiagnostics}
                    onChange={(e) => setIncludeDiagnostics(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border border-border text-primary focus:ring-primary/20 accent-primary cursor-pointer"
                  />
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400" />
                    <span>Include diagnostic info</span>
                    <span className="text-[10px] text-muted-foreground font-mono">(Windows, App v1.0.0)</span>
                  </span>
                </label>
              </div>

              {/* Error Banner */}
              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-destructive-dim border border-destructive/20 text-destructive text-xs">
                  {errorMessage}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={openGitHubIssue}
                  className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-lg hover:bg-surface-raised cursor-pointer"
                  title="Open public issue on GitHub"
                >
                  <Github size={12} />
                  <span>GitHub Issue</span>
                  <ExternalLink size={10} className="opacity-60" />
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-3 py-1.5 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isSubmitting || !message.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send size={12} />
                        <span>Send Feedback</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
