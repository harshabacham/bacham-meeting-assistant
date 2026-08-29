import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare,
  Sparkles,
  Plus,
  Trash2,
  Check,
} from 'lucide-react';
import { useSession } from '@/shared/hooks/useSession';

interface ActionItem {
  id: string;
  text: string;
  completed: boolean;
  tag: 'action' | 'decision' | 'idea';
}

export function NotesScreen() {
  const { session, sessionState } = useSession();
  const [actions, setActions] = useState<ActionItem[]>([
    { id: '1', text: 'Finalize meeting action items and assign milestones', completed: false, tag: 'action' },
    { id: '2', text: 'Deploy local-first Manifest V3 extension update', completed: true, tag: 'decision' },
    { id: '3', text: 'Enable cartoon mascot micro-interactions for side dock', completed: true, tag: 'idea' },
  ]);
  const [newText, setNewText] = useState('');
  const [selectedTag, setSelectedTag] = useState<'action' | 'decision' | 'idea'>('action');

  const isRecording = sessionState === 'recording' || sessionState === 'paused';

  // Load stored notes/actions
  useEffect(() => {
    if (session?.id) {
      const saved = localStorage.getItem(`bacham_actions_${session.id}`);
      if (saved) {
        try {
          setActions(JSON.parse(saved));
        } catch {}
      }
    }
  }, [session?.id]);

  // Persist actions
  useEffect(() => {
    if (session?.id) {
      localStorage.setItem(`bacham_actions_${session.id}`, JSON.stringify(actions));
    }
  }, [actions, session?.id]);

  const toggleAction = (id: string) => {
    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, completed: !a.completed } : a))
    );
  };

  const addAction = () => {
    if (!newText.trim()) return;
    setActions((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        text: newText.trim(),
        completed: false,
        tag: selectedTag,
      },
    ]);
    setNewText('');
  };

  const deleteAction = (id: string) => {
    setActions((prev) => prev.filter((a) => a.id !== id));
  };

  const completedCount = actions.filter((a) => a.completed).length;
  const progressPercent = actions.length > 0 ? Math.round((completedCount / actions.length) * 100) : 0;

  return (
    <div className="flex flex-col h-full font-sans animate-fade-in p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[18px] font-extrabold text-[var(--text-primary)] tracking-tight">Smart Notes & Tasks</h1>
          <p className="text-[11px] text-[var(--text-secondary)]">
            {isRecording ? '🟢 Auto-detecting meeting action items' : '📝 Meeting tasks and takeaways'}
          </p>
        </div>
        <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
          <Sparkles size={16} />
        </div>
      </div>

      {/* Progress Card */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-500/15 to-purple-500/10 border border-indigo-500/20 mb-3 flex flex-col gap-2 shadow-sm">
        <div className="flex items-center justify-between text-[12px]">
          <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
            <CheckSquare size={14} className="text-indigo-400" />
            <span>Action Items Progress</span>
          </span>
          <span className="font-extrabold text-indigo-400">
            {completedCount}/{actions.length} ({progressPercent}%)
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Add New Note Input */}
      <div className="mb-3 flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          {(['action', 'decision', 'idea'] as const).map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold capitalize transition-all ${
                selectedTag === tag
                  ? tag === 'action'
                    ? 'bg-indigo-600 text-white'
                    : tag === 'decision'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-600 text-white'
                  : 'bg-[var(--surface-hover)] text-[var(--text-secondary)] border border-[var(--separator)]'
              }`}
            >
              {tag === 'action' ? '🎯 Action' : tag === 'decision' ? '⚖️ Decision' : '💡 Idea'}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addAction()}
            placeholder="Add task or note..."
            className="flex-1 px-3 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--separator)] text-[12px] text-[var(--text-primary)] outline-none"
          />
          <button
            onClick={addAction}
            className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[12px] flex items-center justify-center shadow-md active:scale-95 transition-all"
          >
            <Plus size={15} />
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
        <AnimatePresence>
          {actions.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                item.completed
                  ? 'bg-[var(--surface-hover)]/40 border-[var(--separator)] opacity-60'
                  : 'bg-[var(--surface-2)] border-[var(--separator)] shadow-sm'
              }`}
            >
              <div
                onClick={() => toggleAction(item.id)}
                className="flex items-center gap-2.5 flex-1 cursor-pointer"
              >
                <div
                  className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${
                    item.completed
                      ? 'bg-emerald-500 text-white'
                      : 'border-2 border-[var(--separator-opaque)] bg-transparent'
                  }`}
                >
                  {item.completed && <Check size={11} strokeWidth={3} />}
                </div>
                <div>
                  <p
                    className={`text-[12px] font-semibold leading-tight ${
                      item.completed
                        ? 'line-through text-[var(--text-tertiary)]'
                        : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {item.text}
                  </p>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 inline-block ${
                      item.tag === 'decision'
                        ? 'text-emerald-400'
                        : item.tag === 'idea'
                        ? 'text-amber-400'
                        : 'text-indigo-400'
                    }`}
                  >
                    {item.tag}
                  </span>
                </div>
              </div>

              <button
                onClick={() => deleteAction(item.id)}
                className="p-1 text-[var(--text-tertiary)] hover:text-red-400 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
