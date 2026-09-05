import React from 'react';
import { 
  MessageSquareHeart, Bug, Lightbulb, Github, ExternalLink, 
  Send, Loader2, CheckCircle2, ShieldCheck, Sparkles, Heart,
  FileCode2, Users
} from 'lucide-react';
import { useFeedbackStore, FeedbackCategory, FeedbackRating } from '@/shared/stores/feedbackStore';
import { useAuthStore } from '@/shared/stores/authStore';
import { useToast } from '@/components/ui/ToastProvider';

export const FeedbackSettingsTab: React.FC = () => {
  const { 
    category, 
    rating, 
    message, 
    email, 
    includeDiagnostics, 
    isSubmitting, 
    isSuccess, 
    errorMessage, 
    setCategory, 
    setRating, 
    setMessage, 
    setEmail, 
    setIncludeDiagnostics, 
    resetForm, 
    submitFeedback, 
    openGitHubIssue 
  } = useFeedbackStore();

  const { user } = useAuthStore();
  const { showToast } = useToast();

  const handleInlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await submitFeedback();
    if (success) {
      showToast('Feedback sent! Thank you for helping us polish v1.0.0 🎉', 'success');
      setTimeout(() => {
        resetForm();
      }, 2500);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-4xl">
      {/* Tab Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 mb-2">
          <Sparkles size={12} />
          <span>v1.0.0 Launch • Open Source</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">Feedback & Community Support</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Bacham is completely free, local-first, and open source. Share thoughts, report bugs, or connect directly with the maintainers.
        </p>
      </div>

      {/* Quick Links Bento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* GitHub Issues Card */}
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-xl bg-surface-raised border border-border flex items-center justify-center text-foreground">
              <Github size={18} />
            </div>
            <h3 className="text-sm font-bold text-foreground">GitHub Issues</h3>
            <p className="text-xs text-muted-foreground">
              Track bugs, view feature requests, and upvote community proposals publicly.
            </p>
          </div>
          <button
            type="button"
            onClick={openGitHubIssue}
            className="mt-4 flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold bg-surface-raised hover:bg-surface-hover border border-border text-foreground transition-all cursor-pointer"
          >
            <span>Open Issue on GitHub</span>
            <ExternalLink size={12} className="text-muted-foreground" />
          </button>
        </div>

        {/* Discord / Instant Feedback */}
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Users size={18} />
            </div>
            <h3 className="text-sm font-bold text-foreground">Maintainer Channel</h3>
            <p className="text-xs text-muted-foreground">
              In-app feedback posts directly into the maintainer team's Discord notifications.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Webhook Connected & Active</span>
          </div>
        </div>

        {/* Release Candidate Info */}
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Sparkles size={18} />
            </div>
            <h3 className="text-sm font-bold text-foreground">Version 1.0.0 Release</h3>
            <p className="text-xs text-muted-foreground">
              Scheduled for September 11, 2026. Local-first AI meeting transcription & synthesis.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
            <FileCode2 size={12} />
            <span>MIT License • 100% Free</span>
          </div>
        </div>
      </div>

      {/* Embedded Feedback Form */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-border">
          <MessageSquareHeart size={18} className="text-primary" />
          <div>
            <h3 className="text-sm font-bold text-foreground">Send Feedback Directly</h3>
            <p className="text-xs text-muted-foreground">
              Submissions are delivered instantly to the developer. No signups or external browser required.
            </p>
          </div>
        </div>

        {isSuccess ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 bg-surface-raised/40 rounded-xl border border-emerald-500/20">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 size={26} />
            </div>
            <h4 className="text-sm font-bold text-foreground">Thank you for your feedback!</h4>
            <p className="text-xs text-muted-foreground max-w-sm">
              Your note was posted to our notifications. We are excited to make Bacham better for you.
            </p>
          </div>
        ) : (
          <form onSubmit={handleInlineSubmit} className="space-y-4">
            {/* Category selection */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Feedback Type
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'bug' as FeedbackCategory, label: 'Bug / Defect', icon: Bug, color: 'text-red-400 border-red-500/30 bg-red-500/10' },
                  { id: 'suggestion' as FeedbackCategory, label: 'Feature Request', icon: Lightbulb, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
                  { id: 'general' as FeedbackCategory, label: 'General / Praise', icon: Heart, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = category === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCategory(item.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                        isSelected
                          ? `${item.color} font-semibold border-current shadow-sm`
                          : 'border-border bg-surface-raised hover:bg-surface-hover text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon size={14} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Experience Rating */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Rating
              </label>
              <div className="flex gap-2">
                {[
                  { id: 'love' as FeedbackRating, emoji: '🤩', label: 'Love it' },
                  { id: 'good' as FeedbackRating, emoji: '🙂', label: 'Good' },
                  { id: 'neutral' as FeedbackRating, emoji: '😐', label: 'Okay' },
                  { id: 'frustrated' as FeedbackRating, emoji: '😕', label: 'Frustrated' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRating(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border transition-all cursor-pointer ${
                      rating === item.id
                        ? 'bg-primary/10 border-primary text-foreground font-semibold shadow-sm'
                        : 'border-border bg-surface-raised hover:bg-surface-hover text-muted-foreground'
                    }`}
                  >
                    <span>{item.emoji}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Message Area */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Your Thoughts <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What can we improve, fix, or add before the September 11th release?"
                className="w-full px-3 py-2.5 rounded-xl text-xs bg-surface-raised border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-all resize-none"
                required
              />
            </div>

            {/* Optional Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Your Email (Optional)
                </label>
                <input
                  type="email"
                  value={email || user?.email || ''}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@domain.com (for replies)"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-surface-raised border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-all"
                />
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeDiagnostics}
                    onChange={(e) => setIncludeDiagnostics(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                  />
                  <div className="flex items-center gap-1">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    <span>Attach OS & App Version diagnostics</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Submit button */}
            {errorMessage && (
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {errorMessage}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !message.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Submit Feedback</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
