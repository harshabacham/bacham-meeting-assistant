import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TauriClient } from '@/infrastructure/tauri-client';
import { 
  CheckSquare, Plus, Trash2, Copy, Check, 
  FileText, CheckCircle2, AlertCircle, Clock, Share2, RefreshCw,
  CalendarPlus, Search, X, Calendar as CalendarIcon, ListTodo
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/ToastProvider';
import { FullCalendarView } from '@/components/calendar/FullCalendarView';
import { SyncTasksModal } from '@/components/tasks/SyncTasksModal';
import { useCalendarStore } from '@/shared/stores/calendarStore';

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
  context?: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  category?: 'follow_up' | 'development' | 'documentation' | 'scheduling' | 'review' | 'general';
  status: 'todo' | 'done';
  createdAt: number;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)] select-none">
      {children}
    </p>
  );
}

export const TasksPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialViewMode = searchParams.get('view') === 'calendar' ? 'calendar' : 'tasks';
  const [viewMode, setViewMode] = useState<'tasks' | 'calendar'>(initialViewMode);
  const [filterTab, setFilterTab] = useState<'all' | 'mine' | 'urgent' | 'done'>('all');
  const [newTaskText, setNewTaskText] = useState('');
  const [tasks, setTasks] = useState<GlobalActionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  const navigate = useNavigate();
  const { showToast } = useToast();

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const items = await TauriClient.getAllActionItems().catch(() => []);
      const notes = await TauriClient.getWorkspaceNotes().catch(() => []);
      const parsedNoteTasks: GlobalActionItem[] = [];
      
      notes.forEach((n: any) => {
        const text = n.content?.replace(/<[^>]+>/g, '\n') || '';
        const lines = text.split('\n');
        lines.forEach((line: string, idx: number) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('[ ]') || trimmed.startsWith('- [ ]') || trimmed.startsWith('[x]') || trimmed.startsWith('- [x]')) {
            const isChecked = trimmed.startsWith('[x]') || trimmed.startsWith('- [x]');
            const isUrgent = trimmed.toLowerCase().includes('urgent') || trimmed.toLowerCase().includes('asap');
            
            parsedNoteTasks.push({
              id: `note_task_${n.id}_${idx}`,
              lectureId: n.id,
              lectureTitle: n.title || 'Workspace Note',
              task: trimmed.replace(/^-\s*\[[ x]\]/, '').replace(/^\[[ x]\]/, '').trim(),
              owner: 'Me',
              priority: isUrgent ? 'urgent' : 'medium',
              category: 'general',
              status: isChecked ? 'done' : 'todo',
              createdAt: n.updatedAt || Date.now(),
            });
          }
        });
      });

      const localCustomRaw = localStorage.getItem('bacham_custom_global_tasks');
      const customTasks: GlobalActionItem[] = localCustomRaw ? JSON.parse(localCustomRaw) : [];

      const mappedBackendItems: GlobalActionItem[] = (items || []).map((t: any, idx: number) => {
        const rawTask = t.task || '';
        const tsMatch = rawTask.match(/\[(\d{1,2}:\d{2}(?::\d{2})?)\]/);
        const extractedTs = tsMatch ? tsMatch[1] : null;
        const cleanTask = tsMatch ? rawTask.replace(tsMatch[0], '').trim() : rawTask;

        return {
          id: t.id || `backend_item_${t.lectureId}_${idx}`,
          lectureId: t.lectureId,
          lectureTitle: t.lectureTitle || 'Meeting Note',
          task: cleanTask,
          owner: t.owner || 'Me',
          rawQuote: t.rawQuote || t.raw_quote,
          timestamp: t.timestamp || t.timestamp_str || extractedTs || undefined,
          dueDate: t.dueDate || t.due_date,
          dueDateIso: t.dueDateIso || t.due_date_iso,
          priority: (t.priority?.toLowerCase() as any) || 'medium',
          category: (t.category?.toLowerCase() as any) || 'general',
          status: t.status === 'done' ? 'done' : 'todo',
          createdAt: Date.now() - idx * 1000,
        };
      });

      const combined = [...customTasks, ...mappedBackendItems, ...parsedNoteTasks];
      const uniqueTasks = Array.from(new Map(combined.map(item => [item.id, item])).values());
      setTasks(uniqueTasks);
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

  useEffect(() => {
    if (searchParams.get('view') === 'calendar') {
      setViewMode('calendar');
    } else {
      setViewMode('tasks');
    }
  }, [searchParams]);

  const toggleStatus = async (task: GlobalActionItem) => {
    const newStatus = task.status === 'todo' ? 'done' : 'todo';
    
    if (task.lectureId && !task.id.startsWith('task_custom')) {
      if (task.id.startsWith('note_task_')) {
        try {
          const notes = await TauriClient.getWorkspaceNotes();
          const note = notes.find((n: any) => n.id === task.lectureId);
          if (note) {
            const targetPrefix = newStatus === 'done' ? '[ ]' : '[x]';
            const replPrefix = newStatus === 'done' ? '[x]' : '[ ]';
            
            let newContent = note.content;
            const searchStr = `${targetPrefix} ${task.task}`;
            const replStr = `${replPrefix} ${task.task}`;
            
            if (newContent.includes(searchStr)) {
              newContent = newContent.replace(searchStr, replStr);
            } else if (newContent.includes(`- ${searchStr}`)) {
              newContent = newContent.replace(`- ${searchStr}`, `- ${replStr}`);
            }
            
            await TauriClient.updateNotes(note.id, newContent);
          }
        } catch(e) {
          console.error(e);
        }
      } else {
        TauriClient.updateActionItemStatus(task.lectureId, task.task, newStatus).catch(console.error);
      }
    } else {
      const localCustomRaw = localStorage.getItem('bacham_custom_global_tasks');
      const customTasks: GlobalActionItem[] = localCustomRaw ? JSON.parse(localCustomRaw) : [];
      const updatedCustom = customTasks.map(t => t.id === task.id ? { ...t, status: newStatus as 'todo' | 'done' } : t);
      localStorage.setItem('bacham_custom_global_tasks', JSON.stringify(updatedCustom));
    }

    const updated = tasks.map(t => t.id === task.id ? { ...t, status: newStatus as 'todo' | 'done' } : t);
    setTasks(updated);
  };

  const handleDeleteTask = (taskId: string) => {
    const localCustomRaw = localStorage.getItem('bacham_custom_global_tasks');
    const customTasks: GlobalActionItem[] = localCustomRaw ? JSON.parse(localCustomRaw) : [];
    const updatedCustom = customTasks.filter(t => t.id !== taskId);
    localStorage.setItem('bacham_custom_global_tasks', JSON.stringify(updatedCustom));

    const updated = tasks.filter(t => t.id !== taskId);
    setTasks(updated);
    showToast('Task removed', 'info');
  };

  const handleCopyPending = async () => {
    const pending = tasks.filter(t => t.status === 'todo');
    if (pending.length === 0) return;
    const content = pending.map(t => {
      const owner = t.owner && t.owner !== 'Unassigned' && t.owner !== 'Me' ? ` @${t.owner}` : '';
      const due = t.dueDate ? ` (Due: ${t.dueDate})` : '';
      return `- [ ] ${t.task}${owner}${due}`;
    }).join('\n');

    await navigator.clipboard.writeText(`### Pending Action Items (${pending.length})\n\n${content}`);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
    showToast(`Copied ${pending.length} pending tasks to clipboard`, 'success');
  };

  const querySearch = searchParams.get('q') || '';
  const queryTaskId = searchParams.get('taskId') || '';

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (queryTaskId && (String(t.id) === queryTaskId || String(t.lectureId) === queryTaskId)) {
        return true;
      }
      if (querySearch && !t.task.toLowerCase().includes(querySearch.toLowerCase())) {
        return false;
      }
      if (filterTab === 'done') return t.status === 'done';
      if (filterTab === 'mine') return t.status === 'todo' && (t.owner.toLowerCase() === 'me' || t.owner.toLowerCase().includes('harsha'));
      if (filterTab === 'urgent') return t.status === 'todo' && t.priority === 'urgent';
      return t.status === 'todo'; // 'all'
    });
  }, [tasks, filterTab, querySearch, queryTaskId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !newTaskText.trim()) return;
    e.preventDefault();

    const newTask: GlobalActionItem = {
      id: `task_custom_${Date.now()}`,
      task: newTaskText.trim(),
      owner: 'Me',
      priority: 'medium',
      category: 'general',
      status: 'todo',
      createdAt: Date.now(),
    };

    const localCustomRaw = localStorage.getItem('bacham_custom_global_tasks');
    const customTasks: GlobalActionItem[] = localCustomRaw ? JSON.parse(localCustomRaw) : [];
    const updatedCustomTasks = [newTask, ...customTasks];
    localStorage.setItem('bacham_custom_global_tasks', JSON.stringify(updatedCustomTasks));

    setTasks(prev => [newTask, ...prev]);
    setNewTaskText('');
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const addCalendarEvent = useCalendarStore(s => s.addEvent);

  const handleScheduleTask = async (task: GlobalActionItem) => {
    try {
      const now = new Date();
      const start = new Date(now.getTime() + 15 * 60000);
      const end = new Date(start.getTime() + 30 * 60000);

      const formatTime = (d: Date) => {
        let h = d.getHours();
        const m = d.getMinutes().toString().padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        h = h ? h : 12;
        return `${h}:${m} ${ampm}`;
      };

      const dateStr = start.toISOString().split('T')[0];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      await addCalendarEvent({
        title: `Focus: ${task.task}`,
        description: `Dedicated focus block for action item${task.lectureTitle ? ` from "${task.lectureTitle}"` : ''}`,
        dateStr,
        dayNum: start.getDate(),
        monthStr: monthNames[start.getMonth()],
        dayOfWeek: dayNames[start.getDay()],
        startTime: formatTime(start),
        endTime: formatTime(end),
        timeRange: `${formatTime(start)} – ${formatTime(end)}`,
        type: 'bacham',
        color: '#6366f1',
        lectureId: task.lectureId,
      });

      showToast('Scheduled 30m focus block on calendar!', 'success');
    } catch (err) {
      console.error('Failed to schedule focus time', err);
      showToast('Could not schedule calendar block', 'error');
    }
  };

  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => b.createdAt - a.createdAt);
  }, [filteredTasks]);

  const pendingCount = tasks.filter(t => t.status === 'todo').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;
  const urgentPendingTasks = useMemo(() => tasks.filter(t => t.priority === 'urgent' && t.status === 'todo'), [tasks]);
  const completionPercentage = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  return (
    <div className={`flex-1 overflow-y-auto bg-[var(--bg)] relative ${viewMode === 'calendar' ? 'h-full flex flex-col overflow-hidden' : ''}`}>
      <div className={`w-full mx-auto px-6 sm:px-8 flex flex-col min-w-0 ${
        viewMode === 'calendar' 
          ? 'max-w-[1400px] pt-7 pb-0 h-full gap-0' 
          : 'max-w-3xl py-10 gap-7'
      }`}>
        
        {/* Header matching Japanese book paper warm editorial standard */}
        <motion.div 
          initial={{ opacity: 0, y: 6 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} 
          className={`flex flex-col gap-2 ${viewMode === 'calendar' ? 'pb-4' : 'pb-5'}`}
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <Eyebrow>Deliverables & Follow-ups</Eyebrow>
              <h1 className="text-[26px] font-semibold text-[var(--text-primary)] tracking-tight leading-tight mt-1">
                Action Items
              </h1>
              <p className="text-[13px] text-[var(--text-secondary)] mt-1 font-normal">
                {pendingCount === 0 
                  ? `All caught up · ${doneCount} completed` 
                  : `${pendingCount} pending task${pendingCount !== 1 ? 's' : ''} · ${doneCount} completed`}
              </p>
            </div>

            {/* Header Actions - Uniform h-8 height across all controls */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {/* Refresh Button - Icon only */}
              <button
                type="button"
                onClick={async () => {
                  await fetchTasks();
                  showToast('Action items refreshed', 'success');
                }}
                disabled={loading}
                className="w-8 h-8 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all shadow-xs cursor-pointer flex items-center justify-center shrink-0"
                title="Refresh tasks & action items"
                aria-label="Refresh tasks & action items"
              >
                <RefreshCw size={13.5} className={loading ? "animate-spin text-[var(--text-primary)]" : ""} />
              </button>

              {/* Sync Tasks Modal Trigger */}
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(true)}
                className="h-8 px-3 rounded-lg bg-[var(--text-primary)] text-[var(--bg)] text-xs font-semibold hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
                title="Sync action items to Slack or Notion"
              >
                <Share2 size={13} />
                <span>Sync</span>
                {pendingCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-white/20 dark:bg-black/20 text-[10px] font-bold">
                    {pendingCount}
                  </span>
                )}
              </button>

              {/* View Toggles (Tasks | Calendar) */}
              <div className="h-8 flex items-center p-0.5 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => { setViewMode('tasks'); setSearchParams({}); }}
                  className={`h-full flex items-center gap-1.5 px-3 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    viewMode === 'tasks' 
                      ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-xs border border-[var(--border)]/70' 
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <ListTodo size={13} />
                  <span>List</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setViewMode('calendar'); setSearchParams({ view: 'calendar' }); }}
                  className={`h-full flex items-center gap-1.5 px-3 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    viewMode === 'calendar' 
                      ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-xs border border-[var(--border)]/70' 
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <CalendarIcon size={13} />
                  <span>Calendar</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content Area */}
        {viewMode === 'calendar' ? (
          <div className="flex-1 -mx-6 sm:-mx-8 relative">
            <FullCalendarView />
          </div>
        ) : (
          <div className="flex flex-col gap-5 pb-16">
            
            {/* Urgent Notification Banner (Only shows when urgent tasks exist) */}
            {urgentPendingTasks.length > 0 && filterTab !== 'urgent' && (
              <motion.div 
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-rose-500/[0.08] dark:bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
                  <span className="font-medium truncate">
                    <strong>{urgentPendingTasks.length} urgent item{urgentPendingTasks.length > 1 ? 's' : ''}</strong> require attention
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFilterTab('urgent')}
                  className="shrink-0 ml-3 font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                >
                  View urgent →
                </button>
              </motion.div>
            )}

            {/* Quick Add Bar - Warm Paper input, eliminates muddy dark grey oval */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-[var(--text-muted)] group-focus-within:text-[var(--text-primary)] transition-colors">
                <Plus size={16} />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={newTaskText}
                onChange={e => setNewTaskText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add an action item… (Press Enter to save)"
                className="w-full bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--text-muted)]/50 focus:border-[var(--text-primary)]/40 focus:ring-2 focus:ring-[var(--text-primary)]/5 rounded-xl py-2.5 pl-10 pr-20 text-[13.5px] font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-all shadow-xs"
              />
              <div className="absolute inset-y-0 right-3 flex items-center gap-1.5 pointer-events-none">
                {newTaskText.trim() ? (
                  <span className="text-[11px] font-medium text-[var(--text-secondary)] bg-[var(--surface-raised)] border border-[var(--border)] px-2 py-0.5 rounded-md">
                    Enter ↵
                  </span>
                ) : (
                  <span className="text-[11px] font-mono text-[var(--text-muted)] bg-[var(--surface-raised)] border border-[var(--border)] px-1.5 py-0.5 rounded-md">
                    ⌘K
                  </span>
                )}
              </div>
            </div>

            {/* Filter Tabs & Quick Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-1">
                {[
                  { id: 'all', label: 'All', count: pendingCount },
                  { id: 'mine', label: 'My Tasks', count: tasks.filter(t => t.status === 'todo' && (t.owner.toLowerCase() === 'me' || t.owner.toLowerCase().includes('harsha'))).length },
                  { id: 'urgent', label: 'Urgent', count: urgentPendingTasks.length },
                  { id: 'done', label: 'Completed', count: doneCount },
                ].map(tab => {
                  const isActive = filterTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFilterTab(tab.id as any)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-[var(--surface)] shadow-xs border border-[var(--border)] text-[var(--text-primary)]' 
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`text-[10.5px] px-1.5 py-0.2 rounded-full font-mono ${
                        isActive 
                          ? 'bg-[var(--surface-raised)] text-[var(--text-secondary)]' 
                          : 'text-[var(--text-muted)]'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-auto">
                {/* Micro progress indicator */}
                {tasks.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] select-none">
                    <div className="w-16 h-1.5 bg-[var(--surface-raised)] rounded-full overflow-hidden border border-[var(--border)]">
                      <div 
                        className="h-full bg-[var(--text-primary)] transition-all duration-300 rounded-full"
                        style={{ width: `${completionPercentage}%` }}
                      />
                    </div>
                    <span className="font-mono text-[11px]">{completionPercentage}%</span>
                  </div>
                )}

                {/* Copy Markdown button */}
                <button
                  type="button"
                  onClick={handleCopyPending}
                  disabled={pendingCount === 0}
                  className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors disabled:opacity-35 px-2.5 py-1.5 rounded-lg hover:bg-[var(--surface-hover)] cursor-pointer"
                  title="Copy pending tasks as Markdown checklist"
                >
                  {copiedAll ? <Check size={13} className="text-[var(--text-primary)]" /> : <Copy size={13} />}
                  <span>Copy markdown</span>
                </button>
              </div>
            </div>

            {/* Search filter banner if query param exists */}
            {(querySearch || queryTaskId) && (
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 animate-fade-in">
                <div className="flex items-center gap-2">
                  <Search size={13} />
                  <span>Filtered for: <strong>"{querySearch || queryTaskId}"</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => setSearchParams({})}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 hover:bg-amber-500/30 transition-colors cursor-pointer"
                >
                  <X size={11} />
                  <span>Clear</span>
                </button>
              </div>
            )}

            {/* Task List Feed */}
            <div className="flex flex-col">
              {loading && tasks.length === 0 ? (
                <div className="py-20 flex justify-center opacity-50">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--border)] border-t-[var(--text-primary)]"></div>
                </div>
              ) : sortedTasks.length === 0 ? (
                /* Serene Inbox Zero presentation */
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className="py-16 flex flex-col items-center justify-center text-center select-none"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] mb-3.5 shadow-xs">
                    {filterTab === 'done' ? (
                      <CheckCircle2 size={22} className="text-[var(--text-primary)]" />
                    ) : (
                      <CheckSquare size={22} />
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    {filterTab === 'done' ? 'No completed tasks yet' : 'Inbox zero'}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] max-w-sm mt-1 leading-relaxed">
                    {filterTab === 'done' 
                      ? 'Tasks you complete will appear here for reference and sync.' 
                      : "You're all caught up. New deliverables mentioned in meetings or notes will automatically appear here."}
                  </p>
                </motion.div>
              ) : (
                <div className="flex flex-col divide-y divide-[var(--border)]/60">
                  <AnimatePresence initial={false}>
                    {sortedTasks.map((task) => {
                      const isHighlighted = Boolean(
                        (queryTaskId && (String(task.id) === queryTaskId || String(task.lectureId) === queryTaskId)) || 
                        (querySearch && task.task.toLowerCase().includes(querySearch.toLowerCase()))
                      );
                      return (
                        <motion.div
                          key={task.id}
                          layout="position"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0, scale: 0.98 }}
                          transition={{ duration: 0.18 }}
                        >
                          <TaskRow 
                            task={task} 
                            onToggle={() => toggleStatus(task)} 
                            onDelete={() => handleDeleteTask(task.id)}
                            onSchedule={handleScheduleTask}
                            onClick={() => task.lectureId && navigate(`/notes?noteId=${encodeURIComponent(task.lectureId)}`)} 
                            isHighlighted={isHighlighted}
                          />
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      <SyncTasksModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        tasks={sortedTasks}
        filterTab={filterTab}
      />
    </div>
  );
};

const TaskRow = ({ 
  task, 
  onToggle, 
  onDelete, 
  onSchedule,
  onClick,
  isHighlighted = false
}: { 
  task: GlobalActionItem; 
  onToggle: () => void; 
  onDelete: () => void;
  onSchedule: (task: GlobalActionItem) => void;
  onClick: () => void;
  isHighlighted?: boolean;
}) => {
  const isDone = task.status === 'done';
  const isUrgent = task.priority === 'urgent';

  return (
    <div 
      className={`group flex items-start gap-3.5 py-3.5 px-3 rounded-xl transition-all duration-150 ${
        isHighlighted 
          ? 'border border-amber-400/50 bg-amber-400/[0.04]' 
          : 'hover:bg-[var(--surface-hover)]'
      } ${
        isDone ? 'opacity-50 hover:opacity-80' : ''
      }`}
    >
      {/* Squircle Checkbox */}
      <button 
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className={`mt-0.5 shrink-0 flex items-center justify-center w-[18px] h-[18px] rounded-[5px] border transition-all duration-150 cursor-pointer ${
          isDone 
            ? 'bg-[var(--text-primary)] border-[var(--text-primary)] text-[var(--bg)] shadow-xs' 
            : 'border-[#C8C7BF] dark:border-white/20 hover:border-[var(--text-primary)] bg-transparent'
        }`}
        title={isDone ? "Mark incomplete" : "Mark complete"}
      >
        {isDone && <Check size={11} strokeWidth={3} />}
      </button>
      
      {/* Task Details */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-baseline gap-2">
          {isUrgent && !isDone && (
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider bg-rose-500/10 px-1.5 py-0.5 rounded">
              Urgent
            </span>
          )}

          <p className={`text-[13.5px] leading-snug font-medium transition-all ${
            isDone ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
          }`}>
            {task.task}
          </p>
        </div>

        {/* Source & Context metadata tags */}
        {!isDone && (task.lectureTitle || task.dueDate || (task.owner && task.owner !== 'Me') || task.timestamp) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-[11.5px] font-medium text-[var(--text-muted)]">
            {task.timestamp && (
              <span className="flex items-center gap-1 font-mono text-[10.5px] font-semibold text-[var(--text-secondary)] bg-[var(--surface-raised)] px-1.5 py-0.5 rounded border border-[var(--border)]">
                ⏱ {task.timestamp}
              </span>
            )}

            {task.lectureTitle && (
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); onClick(); }}
                className="flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-raised)] hover:bg-[var(--surface)] border border-[var(--border)] px-1.5 py-0.5 rounded-md cursor-pointer transition-colors max-w-[240px] truncate"
                title={`Open note: ${task.lectureTitle}`}
              >
                <FileText size={11} className="shrink-0" />
                <span className="truncate">{task.lectureTitle}</span>
              </button>
            )}
            
            {task.dueDate && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Clock size={11} />
                <span>{task.dueDate}</span>
              </span>
            )}
            
            {task.owner && task.owner !== 'Me' && (
              <span className="flex items-center gap-1">
                <div className="w-3.5 h-3.5 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[7.5px] font-bold uppercase text-[var(--text-secondary)]">
                  {task.owner.charAt(0)}
                </div>
                <span>{task.owner}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Hover action buttons */}
      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        {!isDone && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSchedule(task);
            }}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] border border-transparent hover:border-[var(--border)] transition-colors p-1.5 rounded-lg cursor-pointer"
            title="Block 30m focus time on calendar"
          >
            <CalendarPlus size={13} />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors p-1.5 rounded-lg cursor-pointer"
          title="Delete task"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
};
