import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLectureStore } from "@/shared/stores/lectureStore";
import { useFolderStore } from "@/shared/stores/folderStore";
import { TauriClient } from "@/infrastructure/tauri-client";
import { Lecture } from "@/shared/types";
import { useAuthStore } from "@/shared/stores/authStore";
import { useLearningContext } from "@/shared/hooks/useLearningContext";
import { 
  Clock, ChevronRight, Bookmark, Zap, CheckSquare, 
  Mic, Plus, ArrowUpRight, FileText
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import NumberFlow from "@number-flow/react";
import { ComingUpCalendarWidget } from "@/components/dashboard/ComingUpCalendarWidget";
import { GlobalAskAI } from "@/components/dashboard/GlobalAskAI";
import { useGlobalTasks } from "@/shared/hooks/useGlobalTasks";

// ─── Metric Pill ────────────────────────────────────────────────────────────

function MetricPill({ value, label, icon: Icon }: { value: string | number; label: string; icon?: any }) {
  const isNumber = typeof value === "number" || (!isNaN(Number(value)) && value !== "");
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs">
      {Icon && <Icon size={12} className="text-[var(--text-muted)]" />}
      <span className="font-semibold text-[var(--text-primary)] tabular-nums">
        {isNumber ? <NumberFlow value={Number(value)} /> : value}
      </span>
      <span className="text-[var(--text-muted)]">{label}</span>
    </div>
  );
}

function SectionHeading({ title, count, actionLabel, onAction }: { 
  title: string; 
  count?: number; 
  actionLabel?: string; 
  onAction?: () => void 
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-serif font-medium text-[var(--text-primary)] tracking-tight">
          {title}
        </h2>
        {count !== undefined && (
          <span className="text-[10px] font-mono text-[var(--text-muted)] px-1.5 py-0.5 rounded bg-[var(--surface-raised)] border border-[var(--border)]">
            {count}
          </span>
        )}
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span>{actionLabel}</span>
          <ChevronRight size={12} />
        </button>
      )}
    </div>
  );
}

// ─── Modern Minimalist Lecture Card (Zero Muddy Shadows, Clean Neutral Hover) ─

function LectureCard({ lecture, onClick }: { lecture: Lecture; onClick: () => void }) {
  const mins = Math.round((lecture.durationMs ?? 0) / 60000);
  const dateStr = new Date(lecture.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-xl p-4 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] hover:border-[var(--border-accent)] transition-colors duration-150 relative flex flex-col justify-between min-h-[120px] cursor-pointer"
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--text-muted)]">
            {mins > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--surface-raised)] border border-[var(--border)]">
                <Clock size={9} />
                {mins}m
              </span>
            )}
            <span>{dateStr}</span>
          </div>

          <div className="w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-opacity">
            <ArrowUpRight size={12} />
          </div>
        </div>

        <p className="text-[13px] font-medium text-[var(--text-primary)] leading-snug line-clamp-2 transition-colors">
          {lecture.title || "Untitled Recording"}
        </p>
      </div>

      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[var(--border)]/40 text-[11px] text-[var(--text-muted)]">
        <span className="truncate max-w-[140px]">
          {lecture.courseLabel || lecture.course || "Meeting"}
        </span>
        {lecture.isFavorite && (
          <Bookmark size={10} className="text-[var(--accent)] fill-current ml-auto shrink-0" />
        )}
      </div>
    </button>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

// ─── Main Dashboard Page ────────────────────────────────────────────────────

export function DashboardPage() {
  const { lectures, fetchLectures } = useLectureStore();
  const { folders, fetchFolders } = useFolderStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  useLearningContext({ type: "home", title: "Dashboard", subtitle: "Today's Focus & Study Companion" });

  const [analytics, setAnalytics] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingRecording, setIsStartingRecording] = useState(false);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchLectures(),
        fetchFolders(),
        TauriClient.getLearningAnalytics().then(setAnalytics).catch(console.error),
      ]);
      setIsLoading(false);
    };
    init();
  }, [fetchLectures, fetchFolders]);

  const { tasks: globalTasks, loading: loadingTasks, toggleTaskStatus } = useGlobalTasks();
  const myTasks = useMemo(() => {
    return globalTasks.filter(t => 
      t.owner.toLowerCase() === 'me' || 
      t.owner.toLowerCase() === 'you' || 
      t.owner.toLowerCase() === user?.displayName?.toLowerCase()
    ).slice(0, 4);
  }, [globalTasks, user]);

  const recordingSession = lectures.find((l) => l.status === "RECORDING");

  const recentLectures = useMemo(
    () =>
      [...lectures]
        .filter((l) => l.status !== "RECORDING" && !l.isArchived && !l.trashedAt)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 6),
    [lectures]
  );

  const firstName = user?.displayName?.split(" ")[0] || "there";

  const handleStartRecording = async () => {
    setIsStartingRecording(true);
    try {
      await TauriClient.startNativeRecording();
      navigate("/live");
    } finally {
      setIsStartingRecording(false);
    }
  };

  const animProps = shouldReduceMotion
    ? {}
    : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2 } };

  if (isLoading) {
    return (
      <div className="flex-1 h-full overflow-y-auto bg-[var(--bg)]" aria-busy="true">
        <div className="w-full max-w-[1200px] mx-auto px-8 py-10 flex flex-col gap-8">
          <div className="h-6 w-40 rounded bg-[var(--surface)] animate-pulse" />
          <div className="h-28 w-full rounded-xl bg-[var(--surface)] animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-[var(--surface)] animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isRecordingLive = Boolean(recordingSession);

  return (
    <div className="flex-1 overflow-y-auto h-full bg-[var(--bg)] relative text-[var(--text-primary)]">
      <div className="w-full max-w-[1200px] mx-auto px-8 py-10 flex flex-col gap-9">

        {/* ── 1. Editorial Header Bar ───────────────────────────────── */}
        <motion.div {...animProps} className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 pb-6 border-b border-[var(--border)]">
          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] font-mono uppercase tracking-widest text-[var(--text-muted)] font-semibold">
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[var(--text-primary)] tracking-tight">
              Good {getTimeOfDay()}, <span className="font-semibold">{firstName}</span>
            </h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <MetricPill value={lectures.length} label={lectures.length === 1 ? "recording" : "recordings"} icon={FileText} />
              {!!analytics?.currentStreakDays && (
                <MetricPill value={`${analytics.currentStreakDays}d`} label="streak" icon={Zap} />
              )}
              {globalTasks.length > 0 && (
                <MetricPill value={globalTasks.filter(t => t.status !== 'done').length} label="pending tasks" icon={CheckSquare} />
              )}
            </div>
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate('/notes')}
              className="px-3.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={13} />
              <span>New Note</span>
            </button>

            <button
              onClick={handleStartRecording}
              disabled={isStartingRecording || isRecordingLive}
              className="px-4 py-2 rounded-lg bg-[var(--text-primary)] text-[var(--bg)] hover:opacity-90 transition-opacity text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isStartingRecording ? (
                <span>Starting...</span>
              ) : (
                <>
                  <Mic size={13} className="text-red-500" />
                  <span>Start Recording</span>
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* ── 2. Live Recording Strip (if active) ───────────────────── */}
        {isRecordingLive && (
          <motion.div {...animProps}>
            <button
              onClick={() => navigate(`/lectures/${recordingSession!.id}`)}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-[var(--accent-dim)] border border-[var(--border-accent)] transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                <div className="text-left">
                  <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider">Recording in progress</span>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{recordingSession?.title || "Live Meeting"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs font-medium text-[var(--accent)]">
                <span>Open Canvas</span>
                <ChevronRight size={13} />
              </div>
            </button>
          </motion.div>
        )}

        {/* ── 3. Coming Up / Agenda Widget ─────────────────────────── */}
        <motion.div {...animProps}>
          <ComingUpCalendarWidget />
        </motion.div>

        {/* ── 4. Recent Meetings & Lectures ─────────────────────────── */}
        <motion.div {...animProps} className="flex flex-col">
          <SectionHeading 
            title="Recent Meetings & Notes" 
            count={recentLectures.length} 
            actionLabel="View all" 
            onAction={() => navigate('/lectures')} 
          />

          {recentLectures.length === 0 ? (
            <div className="py-12 px-6 border border-[var(--border)] rounded-xl bg-[var(--surface)] text-center flex flex-col items-center gap-2">
              <FileText size={20} className="text-[var(--text-muted)] opacity-50" />
              <p className="text-sm font-medium text-[var(--text-primary)]">No recordings yet</p>
              <p className="text-xs text-[var(--text-muted)] max-w-sm">
                Start a recording or use the browser extension to capture your first meeting.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {recentLectures.map((lecture) => (
                <LectureCard
                  key={lecture.id}
                  lecture={lecture}
                  onClick={() => navigate(`/lectures/${lecture.id}`)}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* ── 5. Workspaces & Action Items 2-Column Section ─────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Left Column: Workspaces / Folders */}
          <motion.div {...animProps} className="flex flex-col">
            <SectionHeading 
              title="Workspaces" 
              count={folders.length} 
              actionLabel="Manage" 
              onAction={() => navigate('/lectures')} 
            />

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 flex flex-col divide-y divide-[var(--border)]">
              {folders.length === 0 ? (
                <p className="py-6 text-center text-xs text-[var(--text-muted)]">No workspaces created yet.</p>
              ) : (
                folders.slice(0, 4).map((f) => {
                  const folderCount = lectures.filter((l) => l.folderId === f.id).length;
                  return (
                    <button
                      key={f.id}
                      onClick={() => {
                        useLectureStore.getState().setSelectedFolderId(f.id);
                        navigate('/lectures');
                      }}
                      className="py-2.5 px-2 flex items-center justify-between group hover:bg-[var(--surface-hover)] rounded-lg transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div 
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: f.color || '#3b82f6' }}
                        />
                        <span className="text-xs font-medium text-[var(--text-primary)] transition-colors truncate">
                          {f.name}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-[var(--text-muted)] tabular-nums">
                        {folderCount} note{folderCount !== 1 ? 's' : ''}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>

          {/* Right Column: Pending Action Items */}
          <motion.div {...animProps} className="flex flex-col">
            <SectionHeading 
              title="Action Items" 
              count={myTasks.length} 
              actionLabel="View all" 
              onAction={() => navigate('/tasks')} 
            />

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 flex flex-col divide-y divide-[var(--border)] min-h-[140px]">
              {loadingTasks ? (
                <div className="py-8 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
                </div>
              ) : myTasks.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                  All caught up! No open tasks.
                </div>
              ) : (
                myTasks.map((item) => {
                  const isDone = item.status === 'done';
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => item.lectureId && navigate(`/lectures/${item.lectureId}`)}
                      className={`py-2 px-2 flex items-center gap-3 group hover:bg-[var(--surface-hover)] rounded-lg transition-colors cursor-pointer ${isDone ? 'opacity-50' : ''}`}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTaskStatus(item);
                        }}
                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          isDone 
                            ? 'bg-[var(--text-muted)] border-transparent text-[var(--bg)]' 
                            : 'border-[var(--border)] group-hover:border-[var(--text-primary)]'
                        }`}
                      >
                        {isDone && <CheckSquare className="w-2.5 h-2.5" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${isDone ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                          {item.task}
                        </p>
                      </div>

                      {item.lectureTitle && (
                        <span className="text-[10px] text-[var(--text-muted)] bg-[var(--surface-raised)] border border-[var(--border)] px-1.5 py-0.5 rounded truncate max-w-[100px]">
                          {item.lectureTitle}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>

        </div>

      </div>

      <GlobalAskAI />
    </div>
  );
}