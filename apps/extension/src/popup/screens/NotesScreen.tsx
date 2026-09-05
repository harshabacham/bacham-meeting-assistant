import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pencil,
  FileText,
  Calendar,
  Clock,
  Sparkles,
  Plus,
  Trash2,
  Check,
  ArrowLeft,
  Mic,
} from 'lucide-react';
import { useSession } from '@/shared/hooks/useSession';
import { useConnection } from '@/shared/hooks/useConnection';
import { type LectureSummary, MessageType } from '@/shared/types';

interface ActionItem {
  id: string;
  text: string;
  completed: boolean;
  tag: 'action' | 'decision' | 'idea';
}

type Tab = 'notes' | 'history';

export function NotesScreen() {
  const { session, sessionState, fetchHistory } = useSession();
  const { connectionStatus } = useConnection();

  const [activeTab, setActiveTab] = useState<Tab>('notes');
  const [askText, setAskText] = useState('');

  // ── Notes/Tasks tab state ─────────────────────────────────────────
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [newText, setNewText] = useState('');
  const [selectedTag, setSelectedTag] = useState<'action' | 'decision' | 'idea'>('action');

  // ── History tab state ─────────────────────────────────────────────
  const [history, setHistory] = useState<LectureSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState<LectureSummary | null>(null);

  const isRecording = sessionState === 'recording' || sessionState === 'paused';

  // Load stored notes/actions
  useEffect(() => {
    if (session?.id) {
      const saved = localStorage.getItem(`bacham_actions_${session.id}`);
      if (saved) {
        try { setActions(JSON.parse(saved)); } catch {}
      }
    }
  }, [session?.id]);

  // Persist actions
  useEffect(() => {
    if (session?.id) {
      localStorage.setItem(`bacham_actions_${session.id}`, JSON.stringify(actions));
    }
  }, [actions, session?.id]);

  // Load history when switching to history tab
  useEffect(() => {
    if (activeTab === 'history' && connectionStatus === 'connected') {
      setHistoryLoading(true);
      fetchHistory?.().then((data) => {
        if (data) setHistory(data.lectures);
        setHistoryLoading(false);
      });
    }
  }, [activeTab, connectionStatus, fetchHistory]);

  const addAction = () => {
    if (!newText.trim()) return;
    const itemText = newText.trim();
    setActions((prev) => [...prev, { id: String(Date.now()), text: itemText, completed: false, tag: selectedTag }]);
    chrome.runtime.sendMessage({
      type: MessageType.APPEND_LIVE_NOTE,
      payload: { text: `[${selectedTag.toUpperCase()}] ${itemText}` },
      sessionId: session?.id,
    }).catch(() => {});
    setNewText('');
  };

  const toggleAction = (id: string) =>
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, completed: !a.completed } : a)));

  const deleteAction = (id: string) =>
    setActions((prev) => prev.filter((a) => a.id !== id));

  const completedCount = actions.filter((a) => a.completed).length;

  // ── Lecture detail view ───────────────────────────────────────────
  if (selectedLecture) {
    const date = new Date(selectedLecture.created_at);
    const dur = Math.round(selectedLecture.duration_ms / 60000);
    return (
      <div className="flex flex-col h-full bg-[#111111] text-white font-sans">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/8 shrink-0">
          <button
            onClick={() => setSelectedLecture(null)}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/60 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-1.5 text-[11px] text-white/40 font-medium">
            <Calendar size={12} />
            <span>{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <span className="mx-1">·</span>
            <Clock size={12} />
            <span>{dur} min</span>
          </div>
          <div className="w-8" />
        </div>

        {/* Title */}
        <div className="px-5 pt-5 pb-3 shrink-0">
          <h1 className="text-[22px] font-bold text-white leading-tight tracking-tight">
            {selectedLecture.title}
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-5 pb-3 border-b border-white/8 shrink-0">
          {(['Summary', 'Notes'] as const).map((tab) => (
            <button
              key={tab}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                tab === 'Summary'
                  ? 'bg-white/10 text-white border border-white/15'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {tab === 'Summary' && <FileText size={12} />}
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Executive Summary section */}
          <div>
            <h2 className="text-[14px] font-bold text-white mb-2">Executive Summary</h2>
            <ul className="space-y-1.5">
              <li className="flex gap-2 text-[12.5px] text-white/70 leading-relaxed">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-white/40 shrink-0" />
                <span>Meeting notes and transcript are available in the desktop app.</span>
              </li>
              <li className="flex gap-2 text-[12.5px] text-white/70 leading-relaxed">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-white/40 shrink-0" />
                <span>Duration: {dur} minute{dur !== 1 ? 's' : ''}. Open the BACHAM app for the full AI summary.</span>
              </li>
            </ul>
          </div>

          {/* Open in app CTA */}
          <button
            onClick={() => chrome.runtime.sendMessage({ type: 'OPEN_APP' })}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-[#BAFF29] hover:bg-[#a3e622] text-[#0A0A0C] text-[13px] font-extrabold transition-all active:scale-98 shadow-lg shadow-[#BAFF29]/20 cursor-pointer"
          >
            <Sparkles size={14} className="text-[#0A0A0C]" />
            View Full AI Summary in App
          </button>
        </div>

        {/* Bottom bar */}
        <div className="shrink-0 border-t border-white/8 px-4 py-3 flex items-center gap-3 bg-[#141517]">
          <div className="flex items-center gap-1.5 text-white/30">
            <span className="w-4 h-3 flex items-end gap-px">
              {[3, 5, 4, 6, 3].map((h, i) => (
                <span key={i} style={{ height: `${h * 2}px` }} className="w-0.5 bg-white/30 rounded-full" />
              ))}
            </span>
          </div>
          <input
            value={askText}
            onChange={(e) => setAskText(e.target.value)}
            placeholder="Ask about this meeting..."
            className="flex-1 bg-transparent text-[12.5px] text-white/70 placeholder:text-white/25 outline-none"
          />
          <Mic size={16} className="text-white/40 hover:text-[var(--accent)] cursor-pointer" />
        </div>
      </div>
    );
  }

  // ── Main view ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-[#0A0A0C] text-white font-sans">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
        <div>
          <h1 className="text-[20px] font-bold text-white tracking-tight leading-tight">
            {isRecording && session ? session.tabTitle || 'Active Meeting' : 'Meeting Notes'}
          </h1>
          <p className="text-[11px] text-white/40 mt-0.5">
            {isRecording ? '🔴 Recording in progress' : 'Your meetings & tasks'}
          </p>
        </div>
        {isRecording && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-[10px] font-bold text-rose-400">LIVE</span>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4 pb-3 border-b border-white/8 shrink-0">
        {[
          { id: 'notes' as Tab, label: 'Notes & Tasks', icon: Pencil },
          { id: 'history' as Tab, label: 'History', icon: Calendar },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${
              activeTab === id
                ? 'bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <AnimatePresence mode="wait">
          {activeTab === 'notes' ? (
            <motion.div
              key="notes"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col h-full px-4 pt-4 pb-3"
            >
              {/* Progress strip */}
              {actions.length > 0 && (
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-[#BAFF29] to-emerald-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(completedCount / actions.length) * 100}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-white/40 shrink-0">
                    {completedCount}/{actions.length} done
                  </span>
                </div>
              )}

              {/* Tag + input row */}
              <div className="flex flex-col gap-2 mb-4">
                <div className="flex gap-1.5">
                  {(['action', 'decision', 'idea'] as const).map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(tag)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition-all cursor-pointer ${
                        selectedTag === tag
                          ? tag === 'action' ? 'bg-[#BAFF29] text-[#0A0A0C]'
                          : tag === 'decision' ? 'bg-emerald-500 text-[#0A0A0C]'
                          : 'bg-amber-400 text-[#0A0A0C]'
                          : 'bg-white/5 text-white/40 border border-white/10'
                      }`}
                    >
                      {tag === 'action' ? '🎯' : tag === 'decision' ? '⚖️' : '💡'} {tag}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addAction()}
                    placeholder="Add a task, decision, or idea..."
                    className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[12px] text-white placeholder:text-white/25 outline-none focus:border-[#BAFF29] transition-colors"
                  />
                  <button
                    onClick={addAction}
                    className="px-3 py-2 rounded-xl bg-[#BAFF29] hover:bg-[#a3e622] text-[#0A0A0C] font-black text-[12px] flex items-center justify-center shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus size={14} strokeWidth={3} />
                  </button>
                </div>
              </div>

              {/* Task list */}
              <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                {actions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                      <Pencil size={16} className="text-white/30" />
                    </div>
                    <p className="text-[12px] font-semibold text-white/40">No tasks yet</p>
                    <p className="text-[11px] text-white/25 mt-1">Add actions, decisions, or ideas above</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {actions.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          item.completed
                            ? 'bg-white/3 border-white/5 opacity-50'
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <button
                          onClick={() => toggleAction(item.id)}
                          className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 transition-all border-2 cursor-pointer ${
                            item.completed
                              ? 'bg-emerald-500 border-emerald-500 text-[#0A0A0C]'
                              : 'border-white/20 bg-transparent hover:border-[#BAFF29]'
                          }`}
                        >
                          {item.completed && <Check size={10} strokeWidth={3} />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[12px] font-medium leading-tight ${
                            item.completed ? 'line-through text-white/30' : 'text-white/80'
                          }`}>
                            {item.text}
                          </p>
                          <span className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 inline-block ${
                            item.tag === 'decision' ? 'text-emerald-400'
                            : item.tag === 'idea' ? 'text-amber-400'
                            : 'text-[#BAFF29]'
                          }`}>
                            {item.tag}
                          </span>
                        </div>
                        <button
                          onClick={() => deleteAction(item.id)}
                          className="p-1 text-white/20 hover:text-rose-400 transition-colors cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              className="px-4 pt-4 pb-3"
            >
              {historyLoading ? (
                <div className="flex justify-center py-16">
                  <div className="w-5 h-5 border-2 border-[#BAFF29]/30 border-t-[#BAFF29] rounded-full animate-spin" />
                </div>
              ) : connectionStatus !== 'connected' ? (
                <div className="flex flex-col items-center justify-center text-center py-16 px-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                    <Calendar size={20} className="text-white/30" />
                  </div>
                  <p className="text-[13px] font-bold text-white/60 mb-1">Desktop App Offline</p>
                  <p className="text-[11px] text-white/30 max-w-[200px]">
                    Start the BACHAM desktop app to view your meeting history.
                  </p>
                </div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-16 px-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                    <Calendar size={20} className="text-white/30" />
                  </div>
                  <p className="text-[13px] font-bold text-white/60 mb-1">No History Yet</p>
                  <p className="text-[11px] text-white/30 max-w-[200px]">
                    Your recorded meetings will appear here after you complete a session.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((lecture, i) => {
                    const date = new Date(lecture.created_at);
                    const dur = Math.round(lecture.duration_ms / 60000);
                    return (
                      <motion.div
                        key={lecture.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 24 }}
                        onClick={() => setSelectedLecture(lecture)}
                        className="group flex items-center gap-3 p-3.5 rounded-xl border border-white/8 bg-[#141517] hover:bg-[#1A1C20] hover:border-[var(--border-accent)] cursor-pointer transition-all"
                      >
                        {/* Date badge */}
                        <div className="w-10 h-10 rounded-xl bg-white/6 border border-white/10 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-white/50 leading-none">
                            {date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}
                          </span>
                          <span className="text-[16px] font-black text-white leading-none">
                            {date.getDate()}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-[13px] font-semibold text-white/80 truncate group-hover:text-white transition-colors">
                            {lecture.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5 text-[10.5px] text-white/35">
                            <Clock size={10} />
                            <span>{dur} min</span>
                          </div>
                        </div>

                        <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 group-hover:bg-[#BAFF29]/15 group-hover:border-[#BAFF29]/30 flex items-center justify-center transition-all shrink-0">
                          <FileText size={11} className="text-white/30 group-hover:text-[#BAFF29] transition-colors" />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Ask bar */}
      <div className="shrink-0 border-t border-white/8 px-4 py-3 flex items-center gap-3 bg-[#141517]">
        <div className="flex items-end gap-px h-4">
          {[3, 5, 4, 6, 3].map((h, i) => (
            <span
              key={i}
              style={{ height: `${h * 2}px` }}
              className={`w-0.5 rounded-full transition-all ${isRecording ? 'bg-[#BAFF29] animate-pulse' : 'bg-white/20'}`}
            />
          ))}
        </div>
        <input
          value={askText}
          onChange={(e) => setAskText(e.target.value)}
          placeholder={isRecording ? 'Ask about your meeting...' : 'Search notes or ask AI...'}
          className="flex-1 bg-transparent text-[12.5px] text-white/60 placeholder:text-white/25 outline-none"
        />
        <Mic size={15} className="text-white/30 hover:text-[var(--accent)] cursor-pointer transition-colors" />
      </div>
    </div>
  );
}
