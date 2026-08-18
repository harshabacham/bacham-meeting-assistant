import React, { useState, useEffect, useMemo } from 'react';
import { TauriClient } from '@/infrastructure/tauri-client';
import { 
  CheckSquare, Plus, Trash2, Calendar, Copy, Check, 
  Mail, Code2, FileText, Target, CheckCircle2, Circle, ShieldAlert
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/ToastProvider';

export interface GlobalActionItem {
  id: string;
  lectureId?: string;
  lectureTitle?: string;
  task: string;
  owner: string;
  rawQuote?: string;
  timestamp?: string;
  dueDate?: string;
  dueDateIso?: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  category?: 'follow_up' | 'development' | 'documentation' | 'scheduling' | 'review' | 'general';
  status: 'todo' | 'done';
  createdAt: number;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  follow_up: { label: 'Follow-up', icon: Mail, color: 'text-sky-500 bg-sky-500/10 border-sky-500/20' },
  development: { label: 'Development', icon: Code2, color: 'text-violet-500 bg-violet-500/10 border-violet-500/20' },
  documentation: { label: 'Docs & Specs', icon: FileText, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  scheduling: { label: 'Scheduling', icon: Calendar, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
  review: { label: 'Review', icon: CheckSquare, color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' },
  general: { label: 'Task', icon: Target, color: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20' },
};

export const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<GlobalActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'all' | 'mine' | 'follow_up' | 'development' | 'done'>('all');
  const [newTaskText, setNewTaskText] = useState('');
  const [copiedAll, setCopiedAll] = useState(false);

  const navigate = useNavigate();
  const { showToast } = useToast();

  const fetchTasks = async () => {
    setLoading(true);
    try {
      // 1. Fetch real action items from Tauri backend database
      const items = await TauriClient.getAllActionItems().catch(() => []);
      
      // 2. Fetch real workspace notes and parse any task items
      const notes = await TauriClient.getWorkspaceNotes().catch(() => []);
      const parsedNoteTasks: GlobalActionItem[] = [];
      
      notes.forEach((n: any) => {
        const text = n.content?.replace(/<[^>]+>/g, '\n') || '';
        const lines = text.split('\n');
        lines.forEach((line: string, idx: number) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('[ ]') || trimmed.startsWith('- [ ]') || trimmed.startsWith('[x]') || trimmed.startsWith('- [x]')) {
            const isChecked = trimmed.startsWith('[x]') || trimmed.startsWith('- [x]');
            parsedNoteTasks.push({
              id: `note_task_${n.id}_${idx}`,
              lectureId: n.id,
              lectureTitle: n.title || 'Workspace Note',
              task: trimmed.replace(/^-\s*\[[ x]\]/, '').replace(/^\[[ x]\]/, '').trim(),
              owner: 'Me',
              priority: 'medium',
              category: 'general',
              status: isChecked ? 'done' : 'todo',
              createdAt: n.updatedAt || Date.now(),
            });
          }
        });
      });

      // 3. Fetch custom user tasks created by the user
      const localCustomRaw = localStorage.getItem('bacham_custom_global_tasks');
      const customTasks: GlobalActionItem[] = localCustomRaw ? JSON.parse(localCustomRaw) : [];

      // Combine real backend items + real note tasks + user created tasks
      const mappedBackendItems: GlobalActionItem[] = (items || []).map((t: any, idx: number) => ({
        id: t.id || `backend_item_${t.lectureId}_${idx}`,
        lectureId: t.lectureId,
        lectureTitle: t.lectureTitle || 'Meeting Note',
        task: t.task,
        owner: t.owner || 'Me',
        rawQuote: t.rawQuote || t.raw_quote,
        timestamp: t.timestamp || t.timestamp_str,
        dueDate: t.dueDate || t.due_date,
        dueDateIso: t.dueDateIso || t.due_date_iso,
        priority: (t.priority?.toLowerCase() as any) || 'medium',
        category: (t.category?.toLowerCase() as any) || 'general',
        status: t.status === 'done' ? 'done' : 'todo',
        createdAt: Date.now() - idx * 1000,
      }));

      const combined = [...customTasks, ...mappedBackendItems, ...parsedNoteTasks];
      setTasks(combined);
    } catch (e) {
      console.error('Failed to fetch action items', e);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const saveCustomTasks = (updatedTasks: GlobalActionItem[]) => {
    setTasks(updatedTasks);
    localStorage.setItem('bacham_custom_global_tasks', JSON.stringify(updatedTasks));
  };

  const toggleStatus = async (task: GlobalActionItem) => {
    const newStatus = task.status === 'todo' ? 'done' : 'todo';
    const updated = tasks.map(t => t.id === task.id ? { ...t, status: newStatus as 'todo' | 'done' } : t);
    saveCustomTasks(updated);

    if (task.lectureId) {
      TauriClient.updateActionItemStatus(task.lectureId, task.task, newStatus).catch(console.error);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    const updated = tasks.filter(t => t.id !== taskId);
    saveCustomTasks(updated);
    showToast('Task removed', 'info');
  };

  const handleCopyPending = async () => {
    const pending = tasks.filter(t => t.status === 'todo');
    if (pending.length === 0) return;
    const content = pending.map(t => {
      const owner = t.owner && t.owner !== 'Unassigned' ? ` @${t.owner}` : '';
      const due = t.dueDate ? ` (Due: ${t.dueDate})` : '';
      return `- [ ] ${t.task}${owner}${due}`;
    }).join('\n');

    await navigator.clipboard.writeText(`### Pending Action Items (${pending.length})\n\n${content}`);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
    showToast(`Copied ${pending.length} pending tasks as Markdown!`, 'success');
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filterTab === 'done') return t.status === 'done';
      if (filterTab === 'mine') return t.status === 'todo' && (t.owner.toLowerCase() === 'me' || t.owner.toLowerCase().includes('harsha'));
      if (filterTab === 'follow_up') return t.status === 'todo' && t.category === 'follow_up';
      if (filterTab === 'development') return t.status === 'todo' && t.category === 'development';
      return t.status === 'todo';
    });
  }, [tasks, filterTab]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTaskText.trim()) {
      const newTask: GlobalActionItem = {
        id: `task_custom_${Date.now()}`,
        lectureTitle: 'Quick Task',
        task: newTaskText.trim(),
        owner: 'Me',
        priority: 'medium',
        category: 'general',
        status: 'todo',
        createdAt: Date.now(),
      };
      const updated = [newTask, ...tasks];
      saveCustomTasks(updated);
      setNewTaskText('');
      showToast('Task added', 'success');
    }
  };

  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => b.createdAt - a.createdAt);
  }, [filteredTasks]);

  const pendingCount = tasks.filter(t => t.status === 'todo').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] text-[var(--text-primary)] overflow-hidden font-sans">
      {/* Sleek Header */}
      <div className="flex-none max-w-4xl mx-auto w-full px-8 pt-14 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2.5">
              <CheckSquare size={22} className="text-[var(--accent)]" />
              <span>Action Items & Execution</span>
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {pendingCount} pending task{pendingCount !== 1 ? 's' : ''} across your meetings, recordings, and workspace notes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyPending}
              disabled={pendingCount === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shadow-xs disabled:opacity-40"
              title="Copy all pending action items as Markdown"
            >
              {copiedAll ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              <span>{copiedAll ? 'Copied' : 'Copy Pending'}</span>
            </button>
          </div>
        </div>
        
        {/* Quick Add Input */}
        <div className="relative group mb-6">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Plus size={16} className="text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors" />
          </div>
          <input
            type="text"
            value={newTaskText}
            onChange={e => setNewTaskText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a new task and press Enter..."
            className="w-full bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] focus:bg-[var(--surface)] focus:border-[var(--border-accent)] rounded-xl py-3.5 pl-11 pr-4 text-[13px] font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-all shadow-xs"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-[var(--border)] text-xs">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filterTab === 'all' 
                ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border)] font-semibold shadow-xs' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
            }`}
          >
            All Pending ({pendingCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('mine')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filterTab === 'mine' 
                ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border)] font-semibold shadow-xs' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
            }`}
          >
            Assigned to Me
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('follow_up')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filterTab === 'follow_up' 
                ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border)] font-semibold shadow-xs' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
            }`}
          >
            Follow-ups
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('development')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filterTab === 'development' 
                ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border)] font-semibold shadow-xs' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
            }`}
          >
            Dev & Bugs
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('done')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ml-auto ${
              filterTab === 'done' 
                ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border)] font-semibold shadow-xs' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
            }`}
          >
            Completed ({doneCount})
          </button>
        </div>
      </div>

      {/* Content List */}
      <div className="flex-1 overflow-y-auto px-8 pb-24 max-w-4xl mx-auto w-full">
        {loading && tasks.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--border)] border-t-[var(--accent)]"></div>
          </div>
        ) : sortedTasks.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center opacity-60">
            <CheckSquare size={28} className="text-[var(--text-muted)] mb-3" />
            <h3 className="font-medium text-[var(--text-primary)] text-sm mb-1">
              {filterTab === 'done' ? 'No completed tasks' : 'All caught up!'}
            </h3>
            <p className="text-[var(--text-muted)] text-xs">
              {filterTab === 'done' ? 'Completed items will appear here.' : 'No pending action items in this view.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 pt-2">
            <AnimatePresence>
              {sortedTasks.map((task) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  transition={{ duration: 0.18 }}
                >
                  <TaskRow 
                    task={task} 
                    onToggle={() => toggleStatus(task)} 
                    onDelete={() => handleDeleteTask(task.id)}
                    onClick={() => task.lectureId && navigate(task.lectureId.startsWith('note_') ? '/notes' : `/lectures/${task.lectureId}`)} 
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

const TaskRow = ({ 
  task, 
  onToggle, 
  onDelete, 
  onClick 
}: { 
  task: GlobalActionItem; 
  onToggle: () => void; 
  onDelete: () => void;
  onClick: () => void;
}) => {
  const isDone = task.status === 'done';
  const category = (task.category?.toLowerCase() as string) || 'general';
  const categoryMeta = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.general;
  const CategoryIcon = categoryMeta.icon;
  const priority = task.priority?.toLowerCase() || 'medium';

  return (
    <div className={`group flex items-center justify-between p-3.5 rounded-xl transition-all border ${
      isDone 
        ? 'opacity-50 hover:opacity-100 bg-[var(--surface)]/30 border-[var(--border)]/50' 
        : 'bg-[var(--surface)] hover:bg-[var(--surface-hover)] border-[var(--border)] hover:border-[var(--border-accent)] shadow-xs'
    }`}>
      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        <button 
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className="shrink-0 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors focus-visible:outline-none"
          title={isDone ? 'Mark as pending' : 'Mark as completed'}
        >
          {isDone ? (
            <CheckCircle2 size={18} className="text-emerald-500 fill-emerald-500/20" />
          ) : (
            <Circle size={18} className="hover:text-[var(--accent)]" />
          )}
        </button>
        
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${categoryMeta.color}`}>
              <CategoryIcon size={10} />
              <span>{categoryMeta.label}</span>
            </span>

            {priority === 'urgent' && (
              <span className="inline-flex items-center gap-0.5 text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border border-red-500/20">
                <ShieldAlert size={10} />
                <span>Urgent</span>
              </span>
            )}

            {task.timestamp && (
              <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--surface-raised)] px-1.5 py-0.5 rounded border border-[var(--border)]">
                {task.timestamp}
              </span>
            )}

            {task.dueDate && (
              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                {task.dueDate}
              </span>
            )}
          </div>

          <p 
            className={`text-[13px] font-medium leading-snug truncate ${isDone ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}
          >
            {task.task}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 ml-4 shrink-0">
        <span className="text-[11px] font-medium text-[var(--text-secondary)] bg-[var(--surface-raised)] px-2 py-0.5 rounded border border-[var(--border)]">
          {task.owner}
        </span>

        {task.lectureTitle && (
          <span 
            onClick={onClick}
            className="text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)] hover:underline cursor-pointer truncate max-w-[140px] hidden sm:inline"
            title={`Open: ${task.lectureTitle}`}
          >
            {task.lectureTitle}
          </span>
        )}
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-[var(--text-muted)] hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete task"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
};

