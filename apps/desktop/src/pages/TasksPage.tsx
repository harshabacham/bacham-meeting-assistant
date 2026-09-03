import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TauriClient } from '@/infrastructure/tauri-client';
import { 
  CheckSquare, Plus, Trash2, Calendar, Copy, Check, 
  Code2, FileText, Target, CheckCircle2, Circle, AlertCircle, Clock
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/ToastProvider';
import { useCalendarStore } from '@/shared/stores/calendarStore';
import { EventModal } from '@/components/calendar/EventModal';
import { FullCalendarView } from '@/components/calendar/FullCalendarView';

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

  const { events: calEvents, deleteEvent } = useCalendarStore();
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<any>(null);

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
              const note = notes.find((n:any) => n.id === task.lectureId);
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

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filterTab === 'done') return t.status === 'done';
      if (filterTab === 'mine') return t.status === 'todo' && (t.owner.toLowerCase() === 'me' || t.owner.toLowerCase().includes('harsha'));
      if (filterTab === 'urgent') return t.status === 'todo' && t.priority === 'urgent';
      return t.status === 'todo'; // 'all'
    });
  }, [tasks, filterTab]);

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
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => b.createdAt - a.createdAt);
  }, [filteredTasks]);

  const pendingCount = tasks.filter(t => t.status === 'todo').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;

  return (
    <div className="flex-1 overflow-y-auto h-full bg-[var(--bg)] relative">
      <div className="w-full max-w-[1300px] mx-auto px-8 py-10 flex flex-col gap-9 min-w-0">
        
        {/* Header matching Dashboard style */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} 
          className="flex flex-col gap-2 pb-7 border-b border-[var(--border)]"
        >
          <div className="flex justify-between items-end">
            <div>
              <Eyebrow>Action Items</Eyebrow>
              <h1 className="text-[27px] font-semibold text-[var(--text-primary)] tracking-tight leading-tight mt-1">
                Workspace
              </h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                {pendingCount} pending task{pendingCount !== 1 ? 's' : ''} to complete.
              </p>
            </div>

            {/* View Toggles */}
            <div className="flex items-center p-1 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)]">
              <button
                onClick={() => { setViewMode('tasks'); setSearchParams({}); }}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  viewMode === 'tasks' ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Tasks
              </button>
              <button
                onClick={() => { setViewMode('calendar'); setSearchParams({ view: 'calendar' }); }}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  viewMode === 'calendar' ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Calendar
              </button>
            </div>
          </div>
        </motion.div>

        {/* Main Content Area */}
        {viewMode === 'calendar' ? (
          <div className="flex-1 min-h-[500px]">
            <FullCalendarView />
          </div>
        ) : (
          <div className="flex gap-10 h-full items-start">
            
            {/* Left: Task List (Flex 1) */}
            <div className="flex-1 flex flex-col min-w-0 gap-6 pb-20">
              
              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex gap-5">
                  {[
                    { id: 'all', label: 'All Tasks' },
                    { id: 'mine', label: 'My Tasks' },
                    { id: 'urgent', label: 'Urgent' },
                    { id: 'done', label: 'Completed' }
                  ].map(tab => {
                    const isActive = filterTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setFilterTab(tab.id as any)}
                        className={`relative pb-2 text-[13px] font-medium transition-colors ${
                          isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {tab.label}
                        {isActive && (
                          <motion.div 
                            layoutId="taskTabIndicator"
                            className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--accent)]" 
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={handleCopyPending}
                  disabled={pendingCount === 0}
                  className="text-[12px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors disabled:opacity-40"
                >
                  {copiedAll ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  Copy all markdown
                </button>
              </div>

              {/* Quick Add Bar */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Plus size={14} className="text-[var(--text-muted)]" />
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={newTaskText}
                  onChange={e => setNewTaskText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Press Cmd+K to type a new task..."
                  className="w-full bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] py-3 pl-9 pr-4 text-[13px] font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-all"
                />
              </div>

              {/* List */}
              {loading && tasks.length === 0 ? (
                <div className="py-20 flex justify-center opacity-50">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--border)] border-t-[var(--accent)]"></div>
                </div>
              ) : sortedTasks.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center opacity-60">
                  <CheckSquare size={24} className="text-[var(--text-muted)] mb-3" />
                  <p className="text-[13px] font-medium text-[var(--text-primary)]">
                    {filterTab === 'done' ? 'No completed tasks' : 'Inbox zero'}
                  </p>
                  <p className="text-[12px] text-[var(--text-muted)] mt-1">
                    {filterTab === 'done' ? "You haven't completed any tasks recently." : "You're all caught up on your action items."}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col">
                  <AnimatePresence initial={false}>
                    {sortedTasks.map((task) => (
                      <motion.div
                        key={task.id}
                        layout="position"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
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

            {/* Right: Summary / Upcoming (Optional Sidebar for layout matching) */}
            <div className="hidden lg:flex flex-col w-[320px] shrink-0 gap-6">
              <div>
                <h3 className="text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
                  Summary
                </h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between py-2 border-b border-[var(--border)]">
                    <span className="text-[13px] text-[var(--text-muted)]">Active</span>
                    <span className="text-[13px] font-medium text-[var(--text-primary)]">{pendingCount}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[var(--border)]">
                    <span className="text-[13px] text-[var(--text-muted)]">Completed</span>
                    <span className="text-[13px] font-medium text-[var(--text-primary)]">{doneCount}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
      
      <EventModal 
        isOpen={isEventModalOpen} 
        onClose={() => setIsEventModalOpen(false)} 
        eventToEdit={eventToEdit} 
      />
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
  const isUrgent = task.priority === 'urgent';

  return (
    <div className={`group flex items-start gap-3 py-3.5 border-b border-[var(--border)] transition-opacity duration-200 ${
      isDone ? 'opacity-40 hover:opacity-70' : 'hover:opacity-90'
    }`}>
      {/* Checkbox */}
      <button 
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className="mt-0.5 shrink-0 focus-visible:outline-none text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
      >
        {isDone ? (
          <CheckCircle2 size={16} className="text-[var(--accent)] fill-current" />
        ) : (
          <Circle size={16} />
        )}
      </button>
      
      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-baseline gap-2">
          {isUrgent && !isDone && (
            <span className="text-[9px] font-bold text-[#FF5E5E] uppercase tracking-widest bg-[#FF5E5E]/10 px-1 rounded-sm">
              Urgent
            </span>
          )}

          <p className={`text-[13.5px] font-medium leading-snug ${isDone ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
            {task.task}
          </p>
        </div>

        {/* Source / Metadata */}
        {!isDone && (task.lectureTitle || task.dueDate || task.owner !== 'Me') && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-[11.5px] text-[var(--text-muted)]">
            {task.lectureTitle && (
              <span 
                onClick={(e) => { e.stopPropagation(); onClick(); }}
                className="flex items-center gap-1 hover:text-[var(--text-primary)] cursor-pointer transition-colors"
              >
                <FileText size={11} />
                <span className="truncate max-w-[200px]">{task.lectureTitle}</span>
              </span>
            )}
            
            {task.dueDate && (
              <span className="flex items-center gap-1 text-amber-500/80">
                <Clock size={11} />
                {task.dueDate}
              </span>
            )}
            
            {task.owner !== 'Me' && (
              <span className="flex items-center gap-1">
                <div className="w-3.5 h-3.5 rounded-full bg-[var(--surface-raised)] flex items-center justify-center text-[7px] font-bold uppercase text-[var(--text-primary)]">
                  {task.owner.charAt(0)}
                </div>
                {task.owner}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions (Hidden until hover) */}
      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-[var(--text-muted)] hover:text-[#FF5E5E] transition-colors p-1"
          title="Delete task"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
};
