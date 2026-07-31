import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLectureStore } from "@/shared/stores/lectureStore";
import { useFolderStore } from "@/shared/stores/folderStore";
import { TauriClient, Flashcard } from "@/infrastructure/tauri-client";
import { DashboardSummary, Lecture } from "@/shared/types";
import { useAuthStore } from "@/shared/stores/authStore";
import { useLearningContext } from "@/shared/hooks/useLearningContext";
import { ArrowIcon } from '@/components/ui/skiper-ui/skiper99';
import { Folder } from "@/components/ui/Folder";
import {
    BookOpen,
    Zap,
    Clock,
    RotateCcw,
    ChevronRight,
    Bookmark,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import NumberFlow from "@number-flow/react";
import { GlobalAskAI } from "@/components/dashboard/GlobalAskAI";
import { PreMeetingBriefWidget } from "@/components/dashboard/PreMeetingBriefWidget";

// ─── Sub-components ────────────────────────────────────────────────────────────

const StatPill = React.memo(function StatPill({ value, label }: { value: string | number; label: string }) {
    const isNumber = typeof value === 'number' || !isNaN(Number(value));
    const numericValue = isNumber ? Number(value) : value;

    return (
        <span className="flex items-baseline gap-1.5">
            <span className="text-[13px] font-semibold text-[var(--text-secondary)]">
                {isNumber ? (
                    <NumberFlow value={numericValue as number} />
                ) : (
                    value
                )}
            </span>
            <span className="text-[12px] text-[var(--text-muted)]">{label}</span>
        </span>
    );
});

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60 mb-2.5 select-none">
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
            className="group shrink-0 w-[200px] text-left bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 transition-all duration-200 hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] relative overflow-hidden"
            aria-label={`Open lecture: ${lecture.title || "Untitled Lecture"}`}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
            {lecture.isFavorite && (
                <div className="absolute top-3 right-3 text-[var(--accent)]">
                    <Bookmark size={13} className="fill-current" />
                </div>
            )}
            <div className="flex flex-col justify-between h-full min-h-[96px]">
                <p className="text-[12.5px] font-medium text-foreground leading-snug line-clamp-3 pr-5">
                    {lecture.title || "Untitled Lecture"}
                </p>
                <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground flex-wrap">
                    {mins > 0 && (
                        <span className="flex items-center gap-1">
                            <Clock size={10} aria-hidden="true" />
                            {mins}m
                        </span>
                    )}
                    <span>{dateStr}</span>
                    {lecture.course && (
                        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground truncate max-w-[68px]">
                            {lecture.course}
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getTimeOfDay(): string {
    const h = new Date().getHours();
    if (h < 12) return "morning";
    if (h < 17) return "afternoon";
    return "evening";
}

function formatRelativeDate(isoString: string): string {
    const date = new Date(isoString);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);
    if (diffMins < 2) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function DashboardPage() {
    const { lectures, fetchLectures } = useLectureStore();
    const { folders, fetchFolders } = useFolderStore();
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const shouldReduceMotion = useReducedMotion();

    useLearningContext({
        type: 'home',
        title: 'Dashboard',
        subtitle: 'Today\'s Focus & Study Companion',
    });

    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [dueCards, setDueCards] = useState<Flashcard[]>([]);
    const [analytics, setAnalytics] = useState<{ currentStreakDays: number; longestStreakDays: number; totalHoursStudied: number; conceptsMastered: number; weakTopics: any[]; strongTopics: any[] } | null>(null);
    const [coachSuggestions, setCoachSuggestions] = useState<any[]>([]);

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            await Promise.all([
                fetchLectures(),
                fetchFolders(),
                TauriClient.getDashboardSummary().then(setSummary).catch(console.error),
                TauriClient.getDueFlashcards().then(setDueCards).catch(console.error),
                TauriClient.getDailyLearningPlan().catch(console.error),
                TauriClient.getLearningAnalytics().then(setAnalytics).catch(console.error),
                TauriClient.getAiStudyCoachSuggestions().then(setCoachSuggestions).catch(console.error),
                TauriClient.getSpacedRepetitionQueue().catch(console.error),
            ]);
            setIsLoading(false);
        };
        init();
    }, [fetchLectures, fetchFolders]);

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

    const recentLectures = useMemo(() =>
        [...lectures]
            .filter((l) => l.status !== "RECORDING" && !l.isArchived && !l.trashedAt)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 10),
        [lectures]
    );

    const revisionLectures = useMemo(() => {
        const map = new Map<string, number>();
        for (const card of dueCards) {
            map.set(card.lectureId, (map.get(card.lectureId) ?? 0) + 1);
        }
        return Array.from(map.entries())
            .slice(0, 5)
            .map(([lectureId, count]) => ({
                lectureId,
                count,
                title: lectures.find((l) => l.id === lectureId)?.title ?? "Untitled",
            }));
    }, [dueCards, lectures]);

    const firstName = user?.displayName?.split(" ")[0] || "there";

    const fadeUp = shouldReduceMotion ? {} : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as any },
    };

    const staggerParent = shouldReduceMotion ? {} : {
        initial: "hidden",
        animate: "show",
        variants: { hidden: {}, show: { transition: { staggerChildren: 0.06 } } },
    };

    const staggerChild = shouldReduceMotion ? {} : {
        variants: {
            hidden: { opacity: 0, y: 6 },
            show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as any } },
        },
    };

    if (isLoading) {
        return (
            <div className="flex-1 h-full overflow-y-auto" aria-busy="true">
                <div className="w-full max-w-[1080px] mx-auto px-8 py-10 flex flex-col gap-8">
                    {/* Greeting skeleton */}
                    <div className="flex flex-col gap-3 pb-6 border-b border-border/50">
                        <div className="skeleton skeleton-text w-32" />
                        <div className="skeleton w-64 h-8 rounded-lg" />
                        <div className="flex gap-4 mt-1">
                            <div className="skeleton skeleton-text w-16" />
                            <div className="skeleton skeleton-text w-20" />
                        </div>
                    </div>
                    {/* Cards skeleton */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-3">
                            <div className="skeleton skeleton-text w-28" />
                            <div className="skeleton skeleton-card" />
                        </div>
                        <div className="flex flex-col gap-3">
                            <div className="skeleton skeleton-text w-24" />
                            <div className="skeleton skeleton-card" />
                        </div>
                    </div>
                    {/* Recent lectures skeleton */}
                    <div className="flex flex-col gap-3">
                        <div className="skeleton skeleton-text w-16" />
                        <div className="flex gap-3">
                            {[1,2,3,4].map(i => (
                                <div key={i} className="skeleton shrink-0 w-[200px] h-[120px] rounded-xl" />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="w-80 shrink-0 flex flex-col gap-6">
                    <PreMeetingBriefWidget />
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto h-full bg-[var(--bg)]">
            <div className="w-full max-w-[1040px] mx-auto px-8 py-10 flex flex-col gap-8">
                {/* ── Active Recording Banner ─────────────────────────────────── */}
                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center bg-surface/50 p-6 rounded-2xl border border-border">
                        <div>
                            <h2 className="text-sm font-semibold text-foreground">Native Desktop Capture</h2>
                            <p className="text-xs text-muted-foreground mt-1">Record your screen and audio directly without the Chrome extension.</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    TauriClient.startNativeRecording();
                                    navigate('/live');
                                }}
                                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2"
                            >
                                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                Start Recording
                            </button>
                            <button
                                onClick={() => TauriClient.stopNativeRecording()}
                                className="px-4 py-2 bg-surface-hover hover:bg-red-500/10 text-muted-foreground hover:text-red-500 text-xs font-semibold rounded-lg transition-colors border border-border"
                            >
                                Stop
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Active Recording Banner ─────────────────────────────────── */}
                {recordingSession && (
                    <motion.div {...fadeUp}>
                        <button
                            onClick={() => navigate(`/lectures/${recordingSession.id}`)}
                            className="w-full flex items-center gap-4 px-5 py-3.5 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/30 hover:border-[var(--accent)]/60 transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                            aria-label={`Active recording: ${recordingSession.title || "Untitled"}. Click to open.`}
                        >
                            <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse shrink-0" aria-hidden="true" />
                            <span className="flex-1 text-left">
                                <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-[0.18em] block">Recording in progress</span>
                                <span className="text-[13px] text-[var(--text-secondary)]">{recordingSession.title || "Untitled"}</span>
                            </span>
                            <div className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-all shrink-0">
                                <ArrowIcon />
                            </div>
                        </button>
                    </motion.div>
                )}

    {/* ── Greeting & Analytics ────────────────────────────────────── */}
    <motion.div {...fadeUp} className="flex flex-col gap-2 pb-6 border-b border-border/40">
        <div className="flex items-center justify-between">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <div className="flex items-center gap-2">

            </div>
        </div>
        <h1 className="text-[28px] font-semibold text-foreground tracking-tight leading-tight">
            Good {getTimeOfDay()}, {firstName}.
        </h1>
        <div className="flex items-center gap-5 mt-0.5 flex-wrap">
            {summary?.totalLectures ? <StatPill value={summary.totalLectures} label={summary.totalLectures === 1 ? "lecture" : "lectures"} /> : null}
            {analytics?.currentStreakDays ? <StatPill value={`${analytics.currentStreakDays}d`} label="study streak" /> : null}
            {analytics?.totalHoursStudied ? <StatPill value={`${analytics.totalHoursStudied}h`} label="studied" /> : null}
            {dueCards.length > 0 ? <StatPill value={dueCards.length} label={dueCards.length === 1 ? "card due" : "cards due"} /> : null}
        </div>

    </motion.div>




                {/* ── AI Study Coach Suggestion Banner ────────────────────────── */}
                {coachSuggestions.length > 0 && (
                    <motion.div {...fadeUp} className="bg-surface/80 border border-primary/20 p-4 rounded-xl shadow-sm flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <Zap size={16} />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-foreground">{coachSuggestions[0].title}</h3>
                                <p className="text-[11px] text-muted-foreground">{coachSuggestions[0].description}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                if (coachSuggestions[0].lectureId) navigate(`/lectures/${coachSuggestions[0].lectureId}`);
                                else if (coachSuggestions[0].actionType === 'revise') navigate('/lectures');
                                else navigate('/library');
                            }}
                            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity shrink-0"
                        >
                            Start ({coachSuggestions[0].estimatedMinutes}m)
                        </button>
                    </motion.div>
                )}

                {/* ── Tier 1 two-column grid ─────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Continue Learning */}
                    <motion.div {...fadeUp} className="flex flex-col gap-2.5">
                        <SectionLabel>Continue learning</SectionLabel>
                        {continueLecture ? (
                            <button
                                onClick={() => navigate(`/lectures/${continueLecture.id}`)}
                                className="flex-1 w-full text-left group relative flex flex-col gap-4 px-5 py-5 rounded-xl bg-surface hover:bg-[var(--surface-hover)] border border-border hover:border-primary/25 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:shadow-md overflow-hidden"
                                aria-label={`Continue lecture: ${continueLecture.title || "Untitled"}`}
                            >
                                <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-primary" aria-hidden="true" />
                                <div className="pl-4">
                                    {(continueLecture.courseLabel || continueLecture.course) && (
                                        <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.15em] mb-1.5">
                                            {continueLecture.courseLabel || continueLecture.course}
                                        </p>
                                    )}
                                    <h2 className="text-[16px] font-semibold text-foreground leading-snug tracking-tight">
                                        {continueLecture.title || "Untitled Lecture"}
                                    </h2>
                                    <div className="flex items-center gap-4 mt-2 text-[11.5px] text-muted-foreground">
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
                                <div className="pl-4 flex items-center gap-2 text-primary text-[12.5px] font-medium group-hover:gap-3 transition-all duration-200">
                                    <span>Open</span>
                                    <div className="w-3.5 h-3.5 text-primary">
                                        <ArrowIcon className="text-primary" />
                                    </div>
                                </div>
                            </button>
                        ) : (
                            <div className="flex-1 flex flex-col items-start gap-3 px-5 py-8 rounded-xl border border-dashed border-border/60">
                                <BookOpen size={20} className="text-muted-foreground/30" aria-hidden="true" />
                                <div>
                                    <p className="text-[13.5px] font-medium text-foreground/70">No lectures yet</p>
                                    <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
                                        Start recording with the BACHAM Chrome extension.
                                    </p>
                                </div>
                            </div>
                        )}
                    </motion.div>

                    {/* Today's Focus */}
                    <motion.div {...fadeUp} className="flex flex-col gap-2.5">
                        <SectionLabel>Today's focus</SectionLabel>
                        {dueCards.length > 0 ? (
                            <button
                                onClick={() => navigate("/lectures")}
                                className="flex-1 w-full text-left group flex items-center gap-5 px-5 py-5 rounded-xl bg-surface hover:bg-[var(--surface-hover)] border border-border hover:border-primary/25 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:shadow-md"
                                aria-label={`Review ${dueCards.length} due flashcards`}
                            >
                                <div className="p-3 rounded-xl bg-[var(--accent)]/10 shrink-0">
                                    <Zap size={18} className="text-[var(--accent)]" aria-hidden="true" />
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                    <p className="text-[15px] font-semibold text-[var(--text-primary)]">
                                        {dueCards.length} {dueCards.length === 1 ? "card" : "cards"} due for review
                                    </p>
                                    <p className="text-[12px] text-[var(--text-muted)] mt-1 leading-relaxed">
                                        Spaced repetition — a quick session now saves hours later.
                                    </p>
                                </div>
                                <div className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-all shrink-0">
                                    <ArrowIcon />
                                </div>
                            </button>
                        ) : (
                            <div className="flex-1 flex flex-col items-start gap-3 px-6 py-8 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                                <Zap size={20} className="text-[var(--text-muted)] opacity-40" aria-hidden="true" />
                                <div>
                                    <p className="text-[14px] font-medium text-[var(--text-secondary)]">All caught up</p>
                                    <p className="text-[13px] text-[var(--text-muted)] mt-1 leading-relaxed">
                                        No flashcards due. Keep recording lectures to build your review queue.
                                    </p>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* ── Recent Lectures ────────────────────────────────────────── */}
                {recentLectures.length > 0 && (
                    <motion.div {...fadeUp}>
                        <div className="flex items-center justify-between mb-2.5">
                            <SectionLabel>Recent</SectionLabel>
                            <button
                                onClick={() => {
                                    useLectureStore.getState().setSelectedFolderId(null);
                                    navigate("/lectures");
                                }}
                                className="text-[11px] text-muted-foreground/60 hover:text-muted-foreground flex items-center gap-0.5 transition-colors -mt-3 focus-visible:outline-none rounded px-1"
                                aria-label="View all lectures in Library"
                            >
                                View all <ChevronRight size={11} aria-hidden="true" />
                            </button>
                        </div>
                        <div
                            className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1"
                            role="list"
                            aria-label="Recent lectures"
                        >
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
                    <motion.div {...fadeUp}>
                        <div className="flex items-center justify-between mb-5">
                            <SectionLabel>Collections</SectionLabel>
                            <button
                                onClick={() => {
                                    useLectureStore.getState().setSelectedFolderId(null);
                                    navigate("/lectures");
                                }}
                                className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] flex items-center gap-1 transition-colors -mt-3 focus-visible:outline-none rounded px-1"
                                aria-label="View all collections"
                            >
                                All <ChevronRight size={11} aria-hidden="true" />
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-8 items-start">
                            {folders.slice(0, 8).map((folder, index) => {
                                const defaultColors = ["#52A8FF", "#9C73F8", "#FF7E79", "#F5A623", "#52D189", "#F06292", "#26C6DA", "#AB47BC"];
                                const folderColor = folder.color || defaultColors[index % defaultColors.length];
                                const folderLectures = lectures.filter((l) => l.folderId === folder.id).slice(0, 3);

                                const renderCard = (l: Lecture) => (
                                    <div
                                        key={l.id}
                                        onClick={(e) => { e.stopPropagation(); navigate(`/lectures/${l.id}`); }}
                                        className="w-full h-full bg-white flex flex-col p-1.5 shadow-sm rounded-sm overflow-hidden border border-gray-100/50 cursor-pointer hover:border-primary/50 transition-colors hover:scale-[1.02]"
                                    >
                                        <span className="text-[6px] sm:text-[8px] font-bold text-gray-800 leading-tight line-clamp-2 mb-1">
                                            {l.title || "Untitled"}
                                        </span>
                                        <div className="mt-auto opacity-60">
                                            <div className="h-0.5 w-full bg-gray-200 rounded" />
                                            <div className="h-0.5 w-2/3 bg-gray-200 rounded mt-0.5" />
                                        </div>
                                    </div>
                                );

                                let items: React.ReactNode[] = [null, null, null];
                                if (folderLectures.length === 1) {
                                    items[2] = renderCard(folderLectures[0]);
                                } else if (folderLectures.length === 2) {
                                    items[0] = renderCard(folderLectures[1]);
                                    items[2] = renderCard(folderLectures[0]);
                                } else if (folderLectures.length >= 3) {
                                    items[0] = renderCard(folderLectures[2]);
                                    items[1] = renderCard(folderLectures[1]);
                                    items[2] = renderCard(folderLectures[0]);
                                } else {
                                    items = [null, null,
                                        <div key="empty" className="w-full h-full bg-white flex items-center justify-center p-1 shadow-sm rounded-sm">
                                            <span className="text-[8px] font-semibold text-gray-400">Empty</span>
                                        </div>
                                    ];
                                }

                                return (
                                    <div
                                        key={folder.id}
                                        onClick={() => {
                                            useLectureStore.getState().setSelectedFolderId(folder.id);
                                            navigate('/lectures');
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                useLectureStore.getState().setSelectedFolderId(folder.id);
                                                navigate('/lectures');
                                            }
                                        }}
                                        className="flex flex-col items-center gap-3 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-xl p-1"
                                        role="button"
                                        tabIndex={0}
                                        aria-label={`Open collection: ${folder.name}`}
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

                {/* ── Smart Revision ─────────────────────────────────────────── */}
                {revisionLectures.length > 0 && (
                    <motion.div {...staggerParent} className="flex flex-col gap-2.5 mt-8">
                        <SectionLabel>Needs revision</SectionLabel>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="list" aria-label="Lectures with due flashcards">
                            {revisionLectures.map((item) => (
                                <motion.div key={item.lectureId} {...staggerChild} role="listitem">
                                    <button
                                        onClick={() => navigate(`/lectures/${item.lectureId}`)}
                                        className="w-full text-left group flex items-center gap-4 p-4 rounded-xl bg-surface border border-border hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        aria-label={`${item.title} — ${item.count} ${item.count === 1 ? "card" : "cards"} due`}
                                    >
                                        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                                            <RotateCcw size={14} aria-hidden="true" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1 mb-0.5">
                                                {item.title}
                                            </h4>
                                            <p className="text-[11px] text-muted-foreground">{item.count} card{item.count !== 1 ? 's' : ''} due</p>
                                        </div>
                                        <ChevronRight size={14} className="text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-150 shrink-0" />
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}

                <div className="h-8" aria-hidden="true" />
                

            </div>
            
            <GlobalAskAI />
        </div>
    );
}




