import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLectureStore } from "@/shared/stores/lectureStore";
import { useFolderStore } from "@/shared/stores/folderStore";
import { TauriClient } from "@/infrastructure/tauri-client";
import { useLearningContext } from "@/shared/hooks/useLearningContext";
import { 
  Bookmark, 
  Mic, Plus, FileText, Search
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { ComingUpCalendarWidget } from "@/components/dashboard/ComingUpCalendarWidget";
import { GlobalAskAI } from "@/components/dashboard/GlobalAskAI";

// ─── Main Dashboard Page ────────────────────────────────────────────────────

export function DashboardPage() {
  const { lectures, fetchLectures } = useLectureStore();
  const { folders, fetchFolders } = useFolderStore();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  useLearningContext({ type: "home", title: "Dashboard", subtitle: "Today's Focus & Activity" });

  const [workspaceNotes, setWorkspaceNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingRecording, setIsStartingRecording] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 8);
  }, [lectures, workspaceNotes, folders, searchQuery]);

  // Group by date
  const groupedItems = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const sevenDaysAgo = today - 7 * 86400000;

    return {
      today: unifiedItems.filter(x => x.createdAt >= today),
      yesterday: unifiedItems.filter(x => x.createdAt >= yesterday && x.createdAt < today),
      previous7Days: unifiedItems.filter(x => x.createdAt >= sevenDaysAgo && x.createdAt < yesterday),
      older: unifiedItems.filter(x => x.createdAt < sevenDaysAgo)
    };
  }, [unifiedItems]);

  const animProps = shouldReduceMotion
    ? {}
    : { initial: { opacity: 0, y: 4 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.15 } };

  if (isLoading) {
    return (
      <div className="flex-1 h-full bg-[var(--bg)] p-12">
        <div className="h-4 w-32 rounded bg-[var(--surface-hover)] animate-pulse mb-8" />
        <div className="space-y-4">
          <div className="h-10 w-full rounded bg-[var(--surface)] animate-pulse" />
          <div className="h-10 w-full rounded bg-[var(--surface)] animate-pulse" />
        </div>
      </div>
    );
  }

  const renderGroup = (label: string, items: typeof unifiedItems) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-8">
        <h3 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 pl-4">
          {label}
        </h3>
        <div className="flex flex-col">
          {items.map((item) => {
            const mins = item.durationMs ? Math.round(item.durationMs / 60000) : 0;
            const folder = folders.find(f => f.id === item.folderId);
            const timeStr = new Date(item.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            
            return (
              <div
                key={`${item.type}_${item.id}`}
                onClick={() => navigate(item.route)}
                className="group flex items-center gap-4 py-2.5 px-4 hover:bg-[var(--surface-hover)] rounded-xl transition-colors cursor-pointer text-[13px]"
              >
                {/* Time */}
                <div className="w-16 shrink-0 text-[11px] font-medium text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
                  {timeStr}
                </div>

                {/* Icon */}
                <div className="shrink-0 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
                  {item.type === 'recording' ? <Mic size={13} /> : <FileText size={13} />}
                </div>

                {/* Title */}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--text-primary)] transition-colors">
                    {item.title}
                  </span>
                  {item.isFavorite && <Bookmark size={11} className="text-[var(--accent)] fill-current shrink-0" />}
                </div>

                {/* Folder Badge */}
                {folder && (
                  <div className="shrink-0 max-w-[120px] truncate">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--surface-raised)] border border-[var(--border)] text-[10px] font-medium text-[var(--text-secondary)]">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: folder.color || '#9ca3af' }} />
                      <span className="truncate">{folder.name}</span>
                    </span>
                  </div>
                )}

                {/* Duration */}
                {mins > 0 && (
                  <div className="w-12 shrink-0 text-right text-[11px] text-[var(--text-muted)] font-mono">
                    {mins}m
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto h-full bg-[var(--bg)] relative text-[var(--text-primary)] font-sans">
      <div className="max-w-[1000px] mx-auto px-6 py-12">

        {/* ── Granola-Style Top Bar ────────────────────────────── */}
        <motion.div {...animProps} className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">
              My Notes
            </h1>

            {/* Subtle Inline Search */}
            <div className="relative group flex items-center w-64">
              <Search size={14} className="absolute left-2.5 text-[var(--text-muted)] group-focus-within:text-[var(--text-primary)] transition-colors" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full bg-transparent hover:bg-[var(--surface-hover)] focus:bg-[var(--surface)] border border-transparent focus:border-[var(--border)] rounded-lg py-1.5 pl-8 pr-3 text-[13px] font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/notes')}
              className="px-3 py-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={13} />
              <span>Note</span>
            </button>

            <button
              onClick={handleStartRecording}
              disabled={isStartingRecording || isRecordingLive}
              className="px-3 py-1.5 rounded-lg bg-[var(--text-primary)] text-[var(--bg)] hover:opacity-90 transition-opacity text-[13px] font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span>{isStartingRecording ? "Starting..." : "Record"}</span>
            </button>
          </div>
        </motion.div>

        {/* ── Active Recording ────────────────────────────────────── */}
        {isRecordingLive && (
          <motion.div {...animProps} className="mb-8">
            <button
              onClick={() => navigate(`/lectures/${recordingSession!.id}`)}
              className="w-full flex items-center justify-between p-3 px-4 rounded-xl bg-red-50 border border-red-100 dark:bg-red-950/20 dark:border-red-900/30 transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                <span className="text-[13px] font-medium text-red-700 dark:text-red-400">
                  {recordingSession?.title || "Recording in progress..."}
                </span>
              </div>
              <span className="text-[11px] font-medium text-red-600/70 dark:text-red-400/70 group-hover:text-red-700 dark:group-hover:text-red-400 transition-colors">
                Open Canvas →
              </span>
            </button>
          </motion.div>
        )}

        {/* ── Upcoming Schedule ────────────────────────────────────── */}
        <motion.div {...animProps} className="mb-6">
          <ComingUpCalendarWidget />
        </motion.div>

        {/* ── List Feed ────────────────────────────────────────────── */}
        <motion.div {...animProps}>
          {unifiedItems.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center gap-2 text-[var(--text-muted)]">
              <FileText size={20} className="opacity-30 mb-2" />
              <p className="text-[13px] font-medium">No notes yet</p>
              <p className="text-[12px] opacity-70">Start a recording or create a note to begin.</p>
            </div>
          ) : searchQuery ? (
            <div className="flex flex-col">
              {renderGroup("Search Results", unifiedItems)}
            </div>
          ) : (
            <div className="flex flex-col">
              {renderGroup("Today", groupedItems.today)}
              {renderGroup("Yesterday", groupedItems.yesterday)}
              {renderGroup("Previous 7 Days", groupedItems.previous7Days)}
              {renderGroup("Older", groupedItems.older)}
            </div>
          )}
        </motion.div>

      </div>
      <GlobalAskAI />
    </div>
  );
}