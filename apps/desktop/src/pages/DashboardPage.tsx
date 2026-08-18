import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLectureStore } from "@/shared/stores/lectureStore";
import { useFolderStore } from "@/shared/stores/folderStore";
import { TauriClient } from "@/infrastructure/tauri-client";
import { useAuthStore } from "@/shared/stores/authStore";
import { useLearningContext } from "@/shared/hooks/useLearningContext";
import { 
  ChevronRight, Bookmark, 
  Mic, Plus, ArrowUpRight, FileText, Search,
  Circle
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { ComingUpCalendarWidget } from "@/components/dashboard/ComingUpCalendarWidget";
import { GlobalAskAI } from "@/components/dashboard/GlobalAskAI";
import { useGlobalTasks } from "@/shared/hooks/useGlobalTasks";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function formatRelativeTime(dateStr: string | number): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ─── Main Dashboard Page ────────────────────────────────────────────────────

export function DashboardPage() {
  const { lectures, fetchLectures } = useLectureStore();
  const { folders, fetchFolders } = useFolderStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  useLearningContext({ type: "home", title: "Dashboard", subtitle: "Today's Focus & Activity" });

  const [workspaceNotes, setWorkspaceNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingRecording, setIsStartingRecording] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'recordings' | 'notes' | 'starred'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { tasks: globalTasks, loading: loadingTasks, toggleTaskStatus } = useGlobalTasks();

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchLectures(),
        fetchFolders(),
        TauriClient.getWorkspaceNotes().then(setWorkspaceNotes).catch(() => []),
      ]);
      setIsLoading(false);
    };
    init();
  }, [fetchLectures, fetchFolders]);

  const recordingSession = lectures.find((l) => l.status === "RECORDING");
  const isRecordingLive = Boolean(recordingSession);

  const pendingTasks = useMemo(() => {
    return globalTasks.filter(t => t.status === 'todo');
  }, [globalTasks]);

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

  // Combine lectures and workspace notes into a unified chronological feed
  const unifiedItems = useMemo(() => {
    const mappedLectures = lectures
      .filter((l) => l.status !== "RECORDING" && !l.isArchived && !l.trashedAt)
      .map((l) => ({
        id: l.id,
        type: 'recording' as const,
        title: l.title || "Untitled Recording",
        snippet: (l as any).overview || (l as any).executiveSummary || (l as any).summary || "",
        folderId: l.folderId,
        course: l.courseLabel || l.course || "Meeting",
        durationMs: l.durationMs,
        isFavorite: l.isFavorite,
        createdAt: new Date(l.createdAt).getTime(),
        route: `/lectures/${l.id}`
      }));

    const mappedNotes = (workspaceNotes || []).map((n) => ({
      id: n.id,
      type: 'note' as const,
      title: n.title || "Untitled Note",
      snippet: n.content?.replace(/<[^>]+>/g, '').slice(0, 120) || "",
      folderId: n.folderId,
      course: folders.find(f => f.id === n.folderId)?.name || "Note",
      durationMs: undefined,
      isFavorite: false,
      createdAt: n.updatedAt || n.createdAt || Date.now(),
      route: `/notes?noteId=${n.id}`
    }));

    const all = [...mappedLectures, ...mappedNotes];

    return all
      .filter(item => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return item.title.toLowerCase().includes(q) || item.snippet.toLowerCase().includes(q);
        }
        if (activeFilter === 'recordings') return item.type === 'recording';
        if (activeFilter === 'notes') return item.type === 'note';
        if (activeFilter === 'starred') return item.isFavorite;
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 8);
  }, [lectures, workspaceNotes, folders, activeFilter, searchQuery]);

  const animProps = shouldReduceMotion
    ? {}
    : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.18 } };

  if (isLoading) {
    return (
      <div className="flex-1 h-full overflow-y-auto bg-[var(--bg)]" aria-busy="true">
        <div className="w-full max-w-[1100px] mx-auto px-6 sm:px-8 py-10 flex flex-col gap-6">
          <div className="h-6 w-32 rounded bg-[var(--surface)] animate-pulse" />
          <div className="h-10 w-64 rounded-xl bg-[var(--surface)] animate-pulse" />
          <div className="h-20 w-full rounded-xl bg-[var(--surface)] animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto h-full bg-[var(--bg)] relative text-[var(--text-primary)] font-sans">
      <div className="w-full max-w-[1100px] mx-auto px-6 sm:px-8 py-10 flex flex-col gap-8">

        {/* ── 1. Minimalist Editorial Header ────────────────────────── */}
        <motion.div {...animProps} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-[var(--text-muted)] font-medium">
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
            </p>
            <h1 className="text-2xl sm:text-3xl font-serif text-[var(--text-primary)] tracking-tight mt-0.5">
              Good {getTimeOfDay()}, <span className="font-semibold">{firstName}</span>
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {lectures.length} recording{lectures.length !== 1 ? 's' : ''} · {pendingTasks.length} pending action item{pendingTasks.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Clean Primary Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate('/notes')}
              className="px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus size={13} />
              <span>New Note</span>
            </button>

            <button
              onClick={handleStartRecording}
              disabled={isStartingRecording || isRecordingLive}
              className="px-4 py-2 rounded-xl bg-[var(--text-primary)] text-[var(--bg)] hover:opacity-90 transition-opacity text-xs font-semibold flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span>{isStartingRecording ? "Starting..." : "Start Recording"}</span>
            </button>
          </div>
        </motion.div>

        {/* ── 2. Live Recording Active Strip (if active) ────────────── */}
        {isRecordingLive && (
          <motion.div {...animProps}>
            <button
              onClick={() => navigate(`/lectures/${recordingSession!.id}`)}
              className="w-full flex items-center justify-between p-3.5 px-4 rounded-xl bg-[var(--accent-dim)] border border-[var(--border-accent)] transition-colors group cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                <div className="text-left">
                  <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider">Recording in progress</span>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">{recordingSession?.title || "Live Meeting"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs font-medium text-[var(--accent)]">
                <span>Open Canvas</span>
                <ChevronRight size={13} />
              </div>
            </button>
          </motion.div>
        )}

        {/* ── 3. Quick Search Bar ───────────────────────────────────── */}
        <motion.div {...animProps}>
          <div className="relative group">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search meetings, notes, or transcripts..."
              className="w-full bg-[var(--surface)] hover:bg-[var(--surface-hover)] focus:bg-[var(--surface)] border border-[var(--border)] focus:border-[var(--border-accent)] rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-all shadow-xs"
            />
          </div>
        </motion.div>

        {/* ── 4. Today's Upcoming Schedule (Compact) ────────────────── */}
        <motion.div {...animProps}>
          <ComingUpCalendarWidget />
        </motion.div>

        {/* ── 5. Balanced 2-Column Minimalist Layout ────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">

          {/* Left Column (8 cols): Recent Meetings & Notes Feed */}
          <motion.div {...animProps} className="lg:col-span-8 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-[var(--surface)] border border-[var(--border)] p-1 rounded-xl shadow-xs">
                {(['all', 'recordings', 'notes', 'starred'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveFilter(tab)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer ${
                      activeFilter === tab
                        ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] font-semibold shadow-xs border border-[var(--border)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <button
                onClick={() => navigate('/lectures')}
                className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>View all</span>
                <ChevronRight size={12} />
              </button>
            </div>

            {/* List Feed */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl divide-y divide-[var(--border)] shadow-xs overflow-hidden">
              {unifiedItems.length === 0 ? (
                <div className="py-12 px-4 text-center text-xs text-[var(--text-muted)] flex flex-col items-center gap-2">
                  <FileText size={18} className="opacity-40" />
                  <p className="font-medium text-[var(--text-primary)]">No items found</p>
                  <p className="text-[11px]">Start a recording or create a note to see it here.</p>
                </div>
              ) : (
                unifiedItems.map((item) => {
                  const mins = item.durationMs ? Math.round(item.durationMs / 60000) : 0;
                  const folder = folders.find(f => f.id === item.folderId);
                  
                  return (
                    <div
                      key={`${item.type}_${item.id}`}
                      onClick={() => navigate(item.route)}
                      className="p-3.5 px-4 flex items-center justify-between gap-4 group hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                          item.type === 'recording'
                            ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                            : 'bg-sky-500/10 text-sky-500 border-sky-500/20'
                        }`}>
                          {item.type === 'recording' ? <Mic size={14} /> : <FileText size={14} />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">
                              {item.title}
                            </p>
                            {item.isFavorite && (
                              <Bookmark size={11} className="text-[var(--accent)] fill-current shrink-0" />
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--text-muted)]">
                            <span>{formatRelativeTime(item.createdAt)}</span>
                            {mins > 0 && (
                              <>
                                <span>·</span>
                                <span>{mins}m</span>
                              </>
                            )}
                            {folder && (
                              <>
                                <span>·</span>
                                <span className="truncate max-w-[120px] font-medium text-[var(--text-secondary)]">
                                  {folder.name}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-opacity shrink-0">
                        <ArrowUpRight size={13} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>

          {/* Right Column (4 cols): Action Items & Workspaces */}
          <div className="lg:col-span-4 flex flex-col gap-6">

            {/* Action Items Focus Card */}
            <motion.div {...animProps} className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Action Items
                  </span>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] px-1.5 py-0.2 rounded bg-[var(--surface-raised)] border border-[var(--border)]">
                    {pendingTasks.length}
                  </span>
                </div>

                <button
                  onClick={() => navigate('/tasks')}
                  className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  View all →
                </button>
              </div>

              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-2.5 flex flex-col divide-y divide-[var(--border)] shadow-xs">
                {loadingTasks ? (
                  <div className="py-6 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
                  </div>
                ) : pendingTasks.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[var(--text-muted)]">
                    All caught up! No pending tasks.
                  </div>
                ) : (
                  pendingTasks.slice(0, 4).map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => item.lectureId && navigate(item.lectureId.startsWith('note_') ? '/notes' : `/lectures/${item.lectureId}`)}
                      className="py-2.5 px-2 flex items-center gap-2.5 group hover:bg-[var(--surface-hover)] rounded-xl transition-colors cursor-pointer"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTaskStatus(item);
                        }}
                        className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors shrink-0 focus-visible:outline-none cursor-pointer"
                      >
                        <Circle size={15} className="hover:text-[var(--accent)]" />
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--text-primary)] truncate leading-snug">
                          {item.task}
                        </p>
                      </div>

                      {item.lectureTitle && (
                        <span className="text-[10px] text-[var(--text-muted)] bg-[var(--surface-raised)] border border-[var(--border)] px-1.5 py-0.5 rounded truncate max-w-[80px]">
                          {item.lectureTitle}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>

            {/* Workspaces Card */}
            <motion.div {...animProps} className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Workspaces
                </span>

                <button
                  onClick={() => navigate('/lectures')}
                  className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  Manage →
                </button>
              </div>

              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-2 flex flex-col shadow-xs">
                {folders.length === 0 ? (
                  <p className="py-5 text-center text-xs text-[var(--text-muted)]">No workspaces created yet.</p>
                ) : (
                  folders.slice(0, 4).map((f) => {
                    const count = lectures.filter((l) => l.folderId === f.id).length;
                    return (
                      <button
                        key={f.id}
                        onClick={() => {
                          useLectureStore.getState().setSelectedFolderId(f.id);
                          navigate('/lectures');
                        }}
                        className="py-2 px-2.5 flex items-center justify-between group hover:bg-[var(--surface-hover)] rounded-xl transition-colors cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div 
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: f.color || '#3b82f6' }}
                          />
                          <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                            {f.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-[var(--text-muted)] tabular-nums">
                          {count}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>

          </div>

        </div>

      </div>

      <GlobalAskAI />
    </div>
  );
}