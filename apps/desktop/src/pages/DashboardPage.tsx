import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { pluginManager } from "@/core/integrations/PluginManager";
import { useLectureStore } from "@/shared/stores/lectureStore";
import { useFolderStore } from "@/shared/stores/folderStore";
import { TauriClient, Flashcard } from "@/infrastructure/tauri-client";
import { DashboardSummary, Lecture } from "@/shared/types";
import { useAuthStore } from "@/shared/stores/authStore";
import { useLearningContext } from "@/shared/hooks/useLearningContext";
import { ArrowIcon } from "@/components/ui/skiper-ui/skiper99";
import { Folder } from "@/components/ui/Folder";
import { Clock, ChevronRight, Bookmark, Zap, BookOpen, CheckSquare, Chrome, X, ArrowRight } from "lucide-react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import NumberFlow from "@number-flow/react";
import { ComingUpCalendarWidget } from "@/components/dashboard/ComingUpCalendarWidget";
import { useGlobalTasks } from "@/shared/hooks/useGlobalTasks";
import { useTranslation } from "react-i18next";
import { ErrorBoundary } from "@/shared/contexts/ErrorBoundary";

/**
 * DESIGN NOTES — read before touching this file
 * ------------------------------------------------
 * Identity: "Lime" — deep slate surfaces (#141517), lime green accent 
 * (#BAFF29) used ONLY for: (1) an active recording, (2) the single
 * primary CTA on the page, (3) an AI-in-progress indicator. Everywhere else
 * the accent is absent — that scarcity is what makes it mean something when
 * it appears. If you're reaching for `text-primary` / `bg-primary` for a
 * fourth thing, that's a sign the layout needs rethinking, not another
 * accent use.
 *
 * Structural rule: most content here does NOT live in a bordered card.
 * A card/surface is reserved for things that are genuinely a distinct
 * object floating on the page (the continue-learning action, a lecture
 * thumbnail). Everything else — the greeting, stats, section groupings —
 * is separated with space and a single hairline rule, never a box.
 *
 * There is exactly one recording status surface on this page, not two.
 * If desktop-capture and "recording in progress" both need UI, they are
 * two states of the same strip, never two competing banners.
 */

// ─── Small building blocks ──────────────────────────────────────────────────

function Stat({ value, label }: { value: string | number; label: string }) {
  const isNumber = typeof value === "number" || (!isNaN(Number(value)) && value !== "");
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-[13px] font-medium text-[var(--text-secondary)] tabular-nums">
        {isNumber ? <NumberFlow value={Number(value)} /> : value}
      </span>
      <span className="text-[12px] text-[var(--text-muted)]">{label}</span>
    </span>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)] select-none">
      {children}
    </p>
  );
}

function LectureCard({ lecture, onClick }: { lecture: Lecture; onClick: () => void }) {
  const mins = Math.round((lecture.durationMs ?? 0) / 60000);
  const dateStr = new Date(lecture.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  return (
    <button
      onClick={onClick}
      className="group shrink-0 min-w-[160px] w-[188px] text-left rounded-xl p-4 bg-white dark:bg-[var(--surface)] border border-[#E5E4DC] dark:border-white/10 hover:border-[#D1D0C7] dark:hover:border-white/20 shadow-[0_1px_3px_rgba(28,28,26,0.04),0_1px_2px_rgba(28,28,26,0.02)] hover:shadow-[0_10px_20px_-5px_rgba(28,28,26,0.07),0_3px_6px_-2px_rgba(28,28,26,0.03)] dark:shadow-none dark:hover:shadow-[0_10px_20px_-5px_rgba(0,0,0,0.5)] hover:-translate-y-0.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] relative cursor-pointer"
      aria-label={`Open lecture: ${lecture.title || "Untitled lecture"}`}
    >
      {lecture.isFavorite && (
        <Bookmark size={12} className="absolute top-3.5 right-3.5 text-[var(--accent)] fill-current" aria-hidden="true" />
      )}
      <p className="text-[12.5px] font-medium text-[var(--text-primary)] leading-snug line-clamp-3 pr-4 min-h-[52px]">
        {lecture.title || "Untitled lecture"}
      </p>
      <div className="flex items-center gap-2.5 mt-3 text-[11px] text-[var(--text-muted)]">
        {mins > 0 && <span className="flex items-center gap-1"><Clock size={10} aria-hidden="true" />{mins}m</span>}
        <span>{dateStr}</span>
      </div>
    </button>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function formatRelativeDate(isoString: string): string {
  const date = new Date(isoString);
  const diffMins = Math.round((Date.now() - date.getTime()) / 60000);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);
  if (diffMins < 2) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ─── Page ────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { lectures, fetchLectures } = useLectureStore();
  const { folders, fetchFolders } = useFolderStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const { t } = useTranslation();

  useLearningContext({ type: "home", title: "Dashboard", subtitle: "Today's Focus & Study Companion" });

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [analytics, setAnalytics] = useState<{
    currentStreakDays: number;
    longestStreakDays: number;
    totalHoursStudied: number;
    conceptsMastered: number;
    weakTopics: any[];
    strongTopics: any[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loadDashboardData = async () => {
    await Promise.all([
      fetchLectures(),
      fetchFolders(),
      TauriClient.getDashboardSummary().then(setSummary).catch(console.error),
      TauriClient.getDueFlashcards().then(setDueCards).catch(console.error),
      TauriClient.getDailyLearningPlan().catch(console.error),
      TauriClient.getLearningAnalytics().then(setAnalytics).catch(console.error),
      TauriClient.getSpacedRepetitionQueue().catch(console.error),
    ]);
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadDashboardData();
      setIsLoading(false);
    };
    init();
  }, [fetchLectures, fetchFolders]);

  const [isExtensionConnected, setIsExtensionConnected] = useState<boolean>(true);
  const [dismissedExtensionBanner, setDismissedExtensionBanner] = useState<boolean>(() => {
    return localStorage.getItem('bacham_dismissed_extension_banner') === 'true';
  });

  useEffect(() => {
    TauriClient.isExtensionConnected()
      .then((connected) => setIsExtensionConnected(connected))
      .catch(() => setIsExtensionConnected(false));

    let unlisten: (() => void) | undefined;
    TauriClient.onExtensionStatusChanged((connected) => {
      setIsExtensionConnected(connected);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handleDismissExtensionBanner = () => {
    setDismissedExtensionBanner(true);
    localStorage.setItem('bacham_dismissed_extension_banner', 'true');
  };

  const [hasAiConnection, setHasAiConnection] = useState<boolean>(true);
  const [dismissedAiBanner, setDismissedAiBanner] = useState<boolean>(() => {
    return localStorage.getItem('bacham_dismissed_ai_banner') === 'true';
  });

  useEffect(() => {
    let isMounted = true;
    const checkAiConnections = async () => {
      const aiPlugins = pluginManager.getPlugins().filter(p => p.manifest.category === 'AI Providers');
      let connected = false;
      for (const p of aiPlugins) {
        if (p.auth?.type === 'none') {
          connected = true;
          break;
        } else if (p.auth?.isConnected) {
          try {
            const isConn = await p.auth.isConnected();
            if (isConn) {
              connected = true;
              break;
            }
          } catch {
            // ignore
          }
        }
      }
      if (isMounted) {
        setHasAiConnection(connected);
      }
    };
    checkAiConnections();
    return () => { isMounted = false; };
  }, []);

  const handleDismissAiBanner = () => {
    setDismissedAiBanner(true);
    localStorage.setItem('bacham_dismissed_ai_banner', 'true');
  };

  const handleOpenExtensionLink = async () => {
    const url = 'https://github.com/harshabacham/bacham-meeting-assistant#browser-extension';
    try {
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(url);
    } catch {
      window.open(url, '_blank');
    }
  };

  const { tasks: globalTasks, loading: loadingTasks, toggleTaskStatus } = useGlobalTasks();
  const myTasks = useMemo(() => {
    return globalTasks.filter(t => 
      t.owner.toLowerCase() === 'me' || 
      t.owner.toLowerCase() === 'you' || 
      t.owner.toLowerCase() === user?.displayName?.toLowerCase()
    ).slice(0, 3);
  }, [globalTasks, user]);

  const recordingSession = lectures.find((l) => l.status === "RECORDING");

  const continueLecture = useMemo<Lecture | null>(() => {
    if (summary?.continueLearning) return summary.continueLearning;
    const sorted = [...lectures]
      .filter((l) => l.status !== "RECORDING" && !l.isArchived && !l.trashedAt)
      .sort((a, b) => {
        const tA = a.lastOpenedAt ? new Date(a.lastOpenedAt).getTime() : new Date(a.createdAt).getTime();
        const tB = b.lastOpenedAt ? new Date(b.lastOpenedAt).getTime() : new Date(b.createdAt).getTime();
        return tB - tA;
      });
    return sorted[0] ?? null;
  }, [summary, lectures]);

  const recentLectures = useMemo(
    () =>
      [...lectures]
        .filter((l) => l.status !== "RECORDING" && !l.isArchived && !l.trashedAt)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10),
    [lectures]
  );


  const fadeUp = shouldReduceMotion
    ? {}
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as any } };

  if (isLoading) {
    return (
      <div className="flex-1 h-full overflow-y-auto bg-[var(--bg)]" aria-busy="true" aria-label="Loading dashboard">
        <div className="w-full max-w-[1300px] mx-auto px-8 py-10 flex flex-col gap-8">
          <div className="flex flex-col gap-3 pb-6 border-b border-[var(--border)]">
            <div className="h-3 w-28 rounded bg-[var(--surface)] animate-pulse" />
            <div className="h-7 w-56 rounded bg-[var(--surface)] animate-pulse" />
            <div className="h-3 w-40 rounded bg-[var(--surface)] animate-pulse mt-1" />
          </div>
          <div className="h-32 w-full rounded-lg bg-[var(--surface)] animate-pulse" />
          <div className="flex gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 w-[188px] shrink-0 rounded-lg bg-[var(--surface)] animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isRecordingLive = Boolean(recordingSession);

  return (
    <div className="flex-1 overflow-y-auto h-full bg-[var(--bg)] relative">

      <div className="w-full max-w-[1300px] mx-auto px-8 py-10 flex gap-10">
        <div className="flex-1 flex flex-col gap-9 min-w-0">
          {/* ── Greeting ─────────────────────────────────────────────── */}
          <motion.div {...fadeUp} className="flex flex-col gap-2 pb-7 border-b border-[var(--border)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Eyebrow>{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</Eyebrow>
                <h1 className="text-[27px] font-semibold text-[var(--text-primary)] tracking-tight leading-tight mt-1">
                  {t('dashboard.title')}
                </h1>

              </div>
            </div>
            <div className="flex items-center gap-5 mt-1 flex-wrap">
              {!!summary?.totalLectures && <Stat value={summary.totalLectures} label={t('dashboard.stats.lectures', { count: summary.totalLectures })} />}
              {!!analytics?.currentStreakDays && <Stat value={`${analytics.currentStreakDays}d`} label={t('dashboard.stats.streak')} />}
              {!!analytics?.totalHoursStudied && <Stat value={`${analytics.totalHoursStudied}h`} label={t('dashboard.stats.studied')} />}
              {dueCards.length > 0 && <Stat value={dueCards.length} label={t('dashboard.stats.cards_due', { count: dueCards.length })} />}
            </div>
          </motion.div>

          {/* ── Recording status — single strip, two states ───────────── */}
          <motion.div {...fadeUp}>
            <AnimatePresence mode="wait" initial={false}>
              {isRecordingLive ? (
                <motion.button
                  key="live"
                  initial={shouldReduceMotion ? {} : { opacity: 0 }}
                  animate={shouldReduceMotion ? {} : { opacity: 1 }}
                  exit={shouldReduceMotion ? {} : { opacity: 0 }}
                  onClick={() => navigate(`/lectures/${recordingSession!.id}`)}
                  className="w-full flex items-center gap-4 px-5 py-4 rounded-lg bg-[var(--accent-dim)] transition-colors duration-150 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] border border-[var(--border-accent)]"
                  aria-label={`Active recording: ${recordingSession?.title || "Untitled"}. Click to open.`}
                >
                  <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse shrink-0" aria-hidden="true" />
                  <span className="flex-1 text-left flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-[0.16em]">{t('dashboard.recording_in_progress', 'Recording in progress')}</span>
                    <span className="text-[13px] text-[var(--text-primary)] font-medium">{recordingSession?.title || t('dashboard.untitled', 'Untitled')}</span>
                  </span>
                  <div className="w-4 h-4 text-[var(--accent)] transition-all shrink-0">
                    <ArrowIcon />
                  </div>
                </motion.button>
              ) : null}
            </AnimatePresence>
          </motion.div>

          {/* ── Chrome Extension Companion Banner ───────────────────── */}
          <AnimatePresence>
            {!isExtensionConnected && !dismissedExtensionBanner && (
              <motion.div
                initial={shouldReduceMotion ? {} : { opacity: 0, y: -6, height: 0 }}
                animate={shouldReduceMotion ? {} : { opacity: 1, y: 0, height: 'auto' }}
                exit={shouldReduceMotion ? {} : { opacity: 0, y: -6, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-[var(--surface)] border border-[#E5E4DC] dark:border-white/10 shadow-[0_1px_3px_rgba(28,28,26,0.04)] relative">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center shrink-0 text-[var(--accent)]">
                      <Chrome size={18} />
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                          Connect Bacham Chrome Extension
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--surface-raised)] text-[var(--text-muted)] border border-[var(--border)]">
                          Companion
                        </span>
                      </div>
                      <p className="text-[12px] text-[var(--text-secondary)] truncate">
                        Capture Google Meet, Zoom web, and browser tabs directly into your notes workspace.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleOpenExtensionLink}
                      className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-[#0A0A0C] text-[12px] font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span>Install Extension</span>
                      <ArrowRight size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={handleDismissExtensionBanner}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors cursor-pointer"
                      title="Dismiss"
                      aria-label="Dismiss extension companion banner"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Connect AI Provider Banner ───────────────────── */}
          <AnimatePresence>
            {!hasAiConnection && !dismissedAiBanner && (
              <motion.div
                initial={shouldReduceMotion ? {} : { opacity: 0, y: -6, height: 0 }}
                animate={shouldReduceMotion ? {} : { opacity: 1, y: 0, height: 'auto' }}
                exit={shouldReduceMotion ? {} : { opacity: 0, y: -6, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-[var(--surface)] border border-[#E5E4DC] dark:border-white/10 shadow-[0_1px_3px_rgba(28,28,26,0.04)] relative mt-2">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center shrink-0 text-[var(--accent)]">
                      <Zap size={18} />
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                          Connect an AI Provider
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--surface-raised)] text-[var(--text-muted)] border border-[var(--border)]">
                          Required
                        </span>
                      </div>
                      <p className="text-[12px] text-[var(--text-secondary)] truncate">
                        Add an API key to unlock automated meeting summaries, action item detection, and flashcards.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => navigate('/settings?tab=integrations')}
                      className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-[#0A0A0C] text-[12px] font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span>Connect API</span>
                      <ArrowRight size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={handleDismissAiBanner}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors cursor-pointer"
                      title="Dismiss"
                      aria-label="Dismiss AI connection banner"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Grid Layout ────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-2">
            
            {/* Continue Learning */}
            <motion.div {...fadeUp} className="flex flex-col gap-3">
              <Eyebrow>{t('dashboard.continue_learning', 'Continue learning')}</Eyebrow>
              {continueLecture ? (
                <button
                  onClick={() => navigate(`/lectures/${continueLecture.id}`)}
                  className="w-full h-[160px] text-left group relative flex flex-col justify-center px-6 py-6 rounded-xl bg-white dark:bg-[var(--surface)] border border-[#E5E4DC] dark:border-white/10 hover:border-[#D1D0C7] dark:hover:border-white/20 shadow-[0_1px_3px_rgba(28,28,26,0.04),0_1px_2px_rgba(28,28,26,0.02)] hover:shadow-[0_10px_20px_-5px_rgba(28,28,26,0.07),0_3px_6px_-2px_rgba(28,28,26,0.03)] dark:shadow-none dark:hover:shadow-[0_10px_20px_-5px_rgba(0,0,0,0.5)] hover:-translate-y-0.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] cursor-pointer"
                  aria-label={`Continue lecture: ${continueLecture.title || "Untitled"}`}
                >
                  <span className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full bg-[var(--accent)]" aria-hidden="true" />
                  <div className="pl-3">
                    {(continueLecture.courseLabel || continueLecture.course) && (
                      <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.15em] mb-1.5">
                        {continueLecture.courseLabel || continueLecture.course}
                      </p>
                    )}
                    <h2 className="text-[15px] font-medium text-[var(--text-primary)] leading-snug tracking-tight">
                      {continueLecture.title || "Untitled Lecture"}
                    </h2>
                    <div className="flex items-center gap-4 mt-2.5 text-[11px] text-[var(--text-muted)]">
                      {(continueLecture.durationMs ?? 0) > 0 && (
                        <span className="flex items-center gap-1.5">
                          <Clock size={11} aria-hidden="true" />
                          {Math.round(continueLecture.durationMs / 60000)}m
                        </span>
                      )}
                      {continueLecture.lastOpenedAt && (
                        <span>Opened {formatRelativeDate(continueLecture.lastOpenedAt)}</span>
                      )}
                    </div>
                  </div>
                </button>
              ) : (
                <div className="w-full h-[160px] flex flex-col justify-center items-start gap-3 px-5 py-6 rounded-lg border border-[var(--border)] border-dashed bg-transparent">
                  <BookOpen size={18} className="text-[var(--text-muted)] opacity-50" aria-hidden="true" />
                  <div>
                    <p className="text-[13px] font-medium text-[var(--text-secondary)]">No lectures yet</p>
                    <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Record a lecture to start learning.</p>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Smart Revision */}
            <motion.div {...fadeUp} className="flex flex-col gap-3">
              <Eyebrow>{t('dashboard.todays_focus', "Today's focus")}</Eyebrow>
              {dueCards.length > 0 ? (
                <button
                  onClick={() => navigate("/lectures")}
                  className="w-full h-[160px] text-left group flex items-center gap-5 px-6 py-6 rounded-xl bg-white dark:bg-[var(--surface)] border border-[#E5E4DC] dark:border-white/10 hover:border-[#D1D0C7] dark:hover:border-white/20 shadow-[0_1px_3px_rgba(28,28,26,0.04),0_1px_2px_rgba(28,28,26,0.02)] hover:shadow-[0_10px_20px_-5px_rgba(28,28,26,0.07),0_3px_6px_-2px_rgba(28,28,26,0.03)] dark:shadow-none dark:hover:shadow-[0_10px_20px_-5px_rgba(0,0,0,0.5)] hover:-translate-y-0.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] cursor-pointer"
                >
                  <div className="p-2.5 rounded bg-[var(--surface-raised)] shrink-0">
                    <Zap size={16} className="text-[var(--text-primary)]" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-[var(--text-primary)]">
                      {dueCards.length} {dueCards.length === 1 ? "card" : "cards"} due
                    </p>
                    <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                      Review now to strengthen retention.
                    </p>
                  </div>
                  <div className="w-4 h-4 text-[var(--text-muted)] transition-all shrink-0">
                    <ArrowIcon />
                  </div>
                </button>
              ) : (
                <div className="w-full h-[160px] flex flex-col justify-center items-start gap-3 px-5 py-6 rounded-lg border border-[var(--border)] bg-transparent">
                  <Zap size={18} className="text-[var(--text-muted)] opacity-30" aria-hidden="true" />
                  <div>
                    <p className="text-[13px] font-medium text-[var(--text-secondary)]">All caught up</p>
                    <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Keep recording to build your queue.</p>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Action Items for YOU */}
            <motion.div {...fadeUp} className="flex flex-col gap-3">
              <Eyebrow>{t('dashboard.action_items_for_you', 'Action items for you')}</Eyebrow>
              <div className="w-full h-[160px] flex flex-col gap-2 p-4 rounded-xl border border-[#E5E4DC] dark:border-white/10 bg-white dark:bg-[var(--surface)] shadow-[0_1px_3px_rgba(28,28,26,0.04),0_1px_2px_rgba(28,28,26,0.02)] overflow-hidden">
                <div className="flex items-center justify-between mb-1 shrink-0">
                  <div className="flex items-center gap-2">
                    <CheckSquare size={14} className="text-[var(--accent)]" />
                    <span className="text-[12px] font-semibold text-[var(--text-primary)] uppercase tracking-wider">{t('dashboard.your_tasks', 'Your Tasks')}</span>
                  </div>
                  {myTasks.length > 0 && (
                    <button 
                      onClick={() => navigate('/tasks')}
                      className="text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {t('common.view_all', 'View all')}
                    </button>
                  )}
                </div>
                
                {loadingTasks ? (
                  <div className="flex-1 flex flex-col justify-center items-center gap-2 opacity-50 min-h-0">
                    <div className="w-4 h-4 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
                  </div>
                ) : myTasks.length === 0 ? (
                  <div className="flex-1 flex flex-col justify-center items-center gap-2 mt-4 text-center min-h-0">
                    <CheckSquare size={20} className="text-[var(--text-muted)] opacity-30" />
                    <p className="text-[12px] text-[var(--text-muted)]">{t('dashboard.no_tasks', 'No action items assigned to you.')}</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto min-h-0 space-y-1.5 pr-1 pb-1 scrollbar-thin scrollbar-thumb-[var(--border)] scrollbar-track-transparent">
                    {myTasks.map(item => {
                      const isDone = item.status === 'done';
                      return (
                        <div key={item.id} onClick={() => item.lectureId && navigate(`/lectures/${item.lectureId}`)} className={`flex items-start gap-3 p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors group cursor-pointer border border-transparent hover:border-[var(--border)] ${isDone ? 'opacity-50' : ''}`}>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTaskStatus(item);
                            }}
                            className={`mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                              isDone 
                                ? 'bg-[var(--text-muted)] border-transparent text-[var(--bg)]' 
                                : 'border-[var(--border)] group-hover:border-[var(--accent)]/50 text-transparent'
                            }`}
                          >
                            {isDone && <CheckSquare className="w-2.5 h-2.5" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-[13px] font-medium truncate ${isDone ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'}`}>
                              {item.task}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] text-[var(--text-muted)] px-1.5 py-0.5 rounded bg-[var(--surface-raised)] truncate max-w-[120px]">
                              {item.lectureTitle}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] opacity-50">• {item.priority}</span>
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* ── Coming Up / Calendar ────────────────────────────────────── */}
          <motion.div {...fadeUp} className="mt-8 mb-6">
            <ErrorBoundary>
              <ComingUpCalendarWidget />
            </ErrorBoundary>
          </motion.div>

          {/* ── Recent Lectures ────────────────────────────────────────── */}
          {recentLectures.length > 0 && (
            <motion.div {...fadeUp} className="mt-4">
              <div className="flex items-center justify-between mb-4">
                <Eyebrow>{t('dashboard.recent_lectures', 'Recent Lectures')}</Eyebrow>
                <button
                  onClick={() => {
                    useLectureStore.getState().setSelectedFolderId(null);
                    navigate("/lectures");
                  }}
                  className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors focus-visible:outline-none"
                >
                  View all <ChevronRight size={11} aria-hidden="true" />
                </button>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2" role="list">
                {recentLectures.map((lecture) => (
                  <div key={lecture.id} role="listitem">
                    <LectureCard lecture={lecture} onClick={() => navigate(`/lectures/${lecture.id}`)} />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Collections ────────────────────────────────────────────── */}
          {folders.length > 0 && (
            <motion.div {...fadeUp} className="mt-2">
              <div className="flex items-center justify-between mb-5">
                <Eyebrow>{t('dashboard.collections', 'Collections')}</Eyebrow>
                <button
                  onClick={() => navigate("/lectures")}
                  className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors focus-visible:outline-none"
                >
                  All <ChevronRight size={11} aria-hidden="true" />
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-6 items-start">
                {folders.slice(0, 8).map((folder, index) => {
                  const defaultColors = ["#52A8FF", "#9C73F8", "#FF7E79", "#F5A623", "#52D189", "#F06292", "#26C6DA", "#AB47BC"];
                  const folderColor = folder.color || defaultColors[index % defaultColors.length];
                  const folderLectures = lectures.filter((l) => l.folderId === folder.id).slice(0, 3);
                  
                  // A simplified render card for the folder visualization
                  const renderCard = (l: Lecture) => (
                    <div
                      key={l.id}
                      onClick={(e) => { e.stopPropagation(); navigate(`/lectures/${l.id}`); }}
                      className="w-full h-full bg-[var(--surface-raised)] flex flex-col p-1.5 rounded-sm border border-[var(--border)]"
                    >
                      <span className="text-[6px] sm:text-[8px] font-bold text-[var(--text-primary)] leading-tight line-clamp-2">
                        {l.title || "Untitled"}
                      </span>
                    </div>
                  );
                  
                  let items: React.ReactNode[] = [null, null, null];
                  if (folderLectures.length === 1) items[2] = renderCard(folderLectures[0]);
                  else if (folderLectures.length === 2) { items[0] = renderCard(folderLectures[1]); items[2] = renderCard(folderLectures[0]); }
                  else if (folderLectures.length >= 3) { items[0] = renderCard(folderLectures[2]); items[1] = renderCard(folderLectures[1]); items[2] = renderCard(folderLectures[0]); }
                  
                  return (
                    <div
                      key={folder.id}
                      onClick={() => {
                        useLectureStore.getState().setSelectedFolderId(folder.id);
                        navigate('/lectures');
                      }}
                      className="flex flex-col items-center gap-3 cursor-pointer group focus-visible:outline-none p-1"
                      role="button"
                      tabIndex={0}
                    >
                      <Folder size={1} color={folderColor} items={items} />
                      <span className="text-[12px] font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors max-w-[90px] text-center truncate">
                        {folder.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          <div className="h-6" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}