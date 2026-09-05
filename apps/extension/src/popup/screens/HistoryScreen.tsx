import { useEffect, useState } from 'react';
import { useSession } from '@/shared/hooks/useSession';
import { useConnection } from '@/shared/hooks/useConnection';
import { History, Calendar, Clock, ArrowRight, RefreshCw, ArrowLeft, Sparkles } from 'lucide-react';
import type { LectureSummary } from '@/shared/types';
import { motion } from 'framer-motion';

export function HistoryScreen() {
  const { connectionStatus } = useConnection();
  const { fetchHistory } = useSession();
  const [history, setHistory] = useState<LectureSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState<LectureSummary | null>(null);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      if (connectionStatus === 'connected') {
        const data = await fetchHistory();
        if (data) {
          setHistory(data.lectures);
        }
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    if (connectionStatus === 'connected') {
      setLoading(true);
      fetchHistory().then((data) => {
        if (data) {
          setHistory(data.lectures);
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [connectionStatus, fetchHistory]);

  if (selectedLecture) {
    const date = new Date(selectedLecture.created_at);
    const dur = Math.round(selectedLecture.duration_ms / 60000);
    return (
      <div className="flex flex-col h-full bg-[#0A0A0C] font-sans text-white animate-fade-in overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 gap-3 shrink-0">
          <button
            onClick={() => setSelectedLecture(null)}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
            title="Back to history"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="flex-1" />
          <button
            onClick={() => chrome.runtime.sendMessage({ type: 'OPEN_APP' }).catch(() => {})}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-[11px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Open in Desktop App"
          >
            <Sparkles size={12} className="text-[#BAFF29]" />
            <span>Desktop App</span>
          </button>
        </div>

        {/* Title */}
        <div className="px-5 pb-3 shrink-0">
          <h1 className="text-[20px] font-bold text-white leading-tight tracking-tight">
            {selectedLecture.title}
          </h1>
          <div className="flex items-center gap-2 mt-1.5 text-[11.5px] text-white/40 font-medium">
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {dur} min
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div>
            <h2 className="text-[14px] font-bold text-white mb-2">Executive Summary</h2>
            <ul className="space-y-2">
              <li className="flex gap-2.5 text-[12.5px] text-white/70 leading-relaxed">
                <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-[#BAFF29] shrink-0" />
                <span>Recorded meeting session with audio, screen captures, and live notes.</span>
              </li>
              <li className="flex gap-2.5 text-[12.5px] text-white/70 leading-relaxed">
                <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-white/40 shrink-0" />
                <span>Open the BACHAM desktop app for the full AI summary, action items, and mindmap.</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            onClick={() => chrome.runtime.sendMessage({ type: 'OPEN_APP' }).catch(() => {})}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-[#BAFF29] hover:bg-[#a3e622] text-[#0A0A0C] text-[13px] font-extrabold transition-all active:scale-98 shadow-lg shadow-[#BAFF29]/20 mt-4 cursor-pointer"
          >
            <Sparkles size={14} className="text-[#0A0A0C]" />
            View Full AI Summary in App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full font-sans animate-fade-in p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[20px] font-bold text-[var(--text-primary)] tracking-tight">Meeting History</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-[var(--surface-hover)] hover:bg-white/10 border border-[var(--separator)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="Refresh history"
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-[var(--accent)]' : ''} />
          </button>
          <div className="p-2 rounded-xl bg-[var(--surface-hover)] border border-[var(--separator)] text-[var(--text-secondary)]">
            <History size={16} strokeWidth={2} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-5 h-5 border-2 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-6 mt-10">
            <div className="w-12 h-12 rounded-2xl bg-[var(--surface-hover)] border border-[var(--separator)] flex items-center justify-center mb-4 shadow-inner">
              <Calendar size={20} className="text-[var(--text-secondary)]" />
            </div>
            <h2 className="text-[14px] font-bold text-[var(--text-primary)] mb-2">No History Found</h2>
            <p className="text-[12px] text-[var(--text-secondary)]">
              Your previous meetings and generated notes will appear here once you complete a capture session.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.slice(0, 3).map((lecture, i) => (
              <motion.div
                key={lecture.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 20 }}
                className="group p-4 rounded-xl border border-white/5 bg-black/20 hover:bg-black/40 backdrop-blur-md shadow-sm hover:shadow-lg cursor-pointer transition-all duration-300 relative overflow-hidden"
                onClick={() => setSelectedLecture(lecture)}
              >
                {/* Subtle highlight glow on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex justify-between items-start relative z-10">
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="text-[14px] font-semibold text-[var(--text-primary)] truncate mb-1.5 group-hover:text-[var(--accent)] transition-colors">
                      {lecture.title}
                    </h3>
                    <div className="flex items-center gap-3 text-[11px] text-[var(--text-secondary)] font-medium">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} className="opacity-70" />
                        {new Date(lecture.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} className="opacity-70" />
                        {Math.round(lecture.duration_ms / 60000)} min
                      </span>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[var(--surface-hover)] flex items-center justify-center group-hover:bg-[var(--accent)] group-hover:text-white transition-colors border border-[var(--separator)] group-hover:border-transparent">
                    <ArrowRight size={14} strokeWidth={2} />
                  </div>
                </div>
              </motion.div>
            ))}
            {history.length > 3 && (
              <button
                type="button"
                onClick={() => chrome.runtime.sendMessage({ type: 'OPEN_APP' }).catch(() => {})}
                className="w-full py-2.5 px-3 mt-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-white/10 text-[12px] font-semibold text-white/50 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>View All {history.length} Meetings in Desktop App</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
