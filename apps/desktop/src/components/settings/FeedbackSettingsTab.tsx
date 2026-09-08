import React, { useEffect } from 'react';
import { 
  MessageSquareHeart, Bug, Lightbulb, Github, ExternalLink, 
  Send, Loader2, CheckCircle2, ShieldCheck, Sparkles, Heart,
  FileCode2, Users, Mail
} from 'lucide-react';
import { useFeedbackStore, FeedbackCategory, FeedbackRating, getResolvedUserEmail } from '@/shared/stores/feedbackStore';
import { useAuthStore } from '@/shared/stores/authStore';
import { useCalendarStore } from '@/shared/stores/calendarStore';
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
  const { calendarEmail } = useCalendarStore();
  const { showToast } = useToast();

  const isAccountEmail = Boolean(
    user?.email && 
    !user.email.endsWith('@bacham.local') && 
    !user.email.endsWith('@bacham.app')
  );

  useEffect(() => {
    const isDummy = !email || email.endsWith('@bacham.local') || email.endsWith('@bacham.app');
    if (isDummy) {
      const resolved = getResolvedUserEmail(user?.email, calendarEmail);
      setEmail(resolved);
    }
  }, [user?.email, calendarEmail, setEmail]);

  const handleInlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await submitFeedback();
    if (success) {
      showToast('Feedback sent! Thank you for helping us polish Bacham 🎉', 'success');
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
              <div className="flex max-w-md p-1 bg-surface-raised rounded-xl border border-border/60 gap-1">
                {[
                  { id: 'suggestion' as FeedbackCategory, label: 'Feature Idea', icon: Lightbulb, iconColor: 'text-amber-400' },
                  { id: 'bug' as FeedbackCategory, label: 'Bug / Defect', icon: Bug, iconColor: 'text-rose-400' },
                  { id: 'general' as FeedbackCategory, label: 'Praise / Feedback', icon: Heart, iconColor: 'text-emerald-400' },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = category === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCategory(item.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'bg-surface text-foreground font-semibold shadow-xs border border-border/70'
                          : 'text-muted-foreground hover:text-foreground hover:bg-surface/50'
                      }`}
                    >
                      <Icon size={13} className={isSelected ? item.iconColor : 'opacity-70'} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Experience Rating */}
            <div className="flex items-center justify-between max-w-md px-0.5">
              <span className="text-[11px] font-medium text-muted-foreground">Experience</span>
              <div className="flex items-center gap-1">
                {[
                  { id: 'love' as FeedbackRating, emoji: '🤩', label: 'Love it' },
                  { id: 'good' as FeedbackRating, emoji: '🙂', label: 'Good' },
                  { id: 'neutral' as FeedbackRating, emoji: '😐', label: 'Okay' },
                  { id: 'frustrated' as FeedbackRating, emoji: '😕', label: 'Issues' },
                ].map((item) => {
                  const isSelected = rating === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setRating(item.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-primary/15 text-foreground font-medium border border-primary/30 shadow-xs'
                          : 'text-muted-foreground hover:text-foreground hover:bg-surface-raised border border-transparent'
                      }`}
                      title={item.label}
                    >
                      <span className="text-sm">{item.emoji}</span>
                      {isSelected && <span className="text-[11px]">{item.label}</span>}
                    </button>
                  );
                })}
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
                placeholder="What can we improve, fix, or add before the next release?"
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-surface-raised/70 border border-border/70 text-foreground placeholder:text-muted-foreground/45 focus:outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/30 transition-all resize-none leading-relaxed"
                required
              />
            </div>

            {/* Email & Diagnostics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                    <Mail size={12} className="text-muted-foreground" />
                    <span>Contact Email</span>
                  </label>
                  {isAccountEmail && (
                    <span className="text-[10px] text-emerald-400/90 font-medium flex items-center gap-1">
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
                  placeholder="name@example.com (optional)"
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-surface-raised/70 border border-border/70 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/30 transition-all font-normal"
                />
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeDiagnostics}
                    onChange={(e) => setIncludeDiagnostics(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/20 accent-primary cursor-pointer"
                  />
                  <div className="flex items-center gap-1">
                    <ShieldCheck size={13} className="text-emerald-400" />
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
