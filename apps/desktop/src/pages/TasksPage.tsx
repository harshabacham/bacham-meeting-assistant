import React, { useState, useEffect, useMemo } from 'react';
import { TauriClient } from '@/infrastructure/tauri-client';
import { CheckSquare, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/ToastProvider';

export interface GlobalActionItem {
  id: string;
  lectureId?: string;
  lectureTitle?: string;
  task: string;
  owner: string;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'done';
  createdAt: number;
}

export const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<GlobalActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New task form state
  const [newTaskText, setNewTaskText] = useState('');

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
          if (trimmed.startsWith('[ ]') || trimmed.startsWith('- [ ]')) {
            parsedNoteTasks.push({
              id: `note_task_${n.id}_${idx}`,
              lectureId: n.id,
              lectureTitle: n.title || 'Workspace Note',
              task: trimmed.replace(/^-\s*\[\s*\]/, '').replace(/^\[\s*\]/, '').trim(),
              owner: 'Note',
              priority: 'medium',
              status: 'todo',
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
        id: `backend_item_${t.lectureId}_${idx}`,
        lectureId: t.lectureId,
        lectureTitle: t.lectureTitle || 'Meeting Note',
        task: t.task,
        owner: t.owner || 'AI Assistant',
        priority: (t.priority?.toLowerCase() as any) || 'medium',
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

  const filteredTasks = useMemo(() => {
    return tasks;
  }, [tasks]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTaskText.trim()) {
      const newTask: GlobalActionItem = {
        id: `task_custom_${Date.now()}`,
        lectureTitle: 'Quick Task',
        task: newTaskText.trim(),
        owner: 'Me',
        priority: 'medium',
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
    const todo = filteredTasks.filter(t => t.status === 'todo').sort((a,b) => b.createdAt - a.createdAt);
    const done = filteredTasks.filter(t => t.status === 'done').sort((a,b) => b.createdAt - a.createdAt);
    return [...todo, ...done];
  }, [filteredTasks]);

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] text-[var(--text-primary)] overflow-hidden font-sans">
      {/* Sleek Header */}
      <div className="flex-none max-w-3xl mx-auto w-full px-8 pt-16 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-6">Action Items</h1>
        
        {/* Quick Add Input */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Plus size={16} className="text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors" />
          </div>
          <input
            type="text"
            value={newTaskText}
            onChange={e => setNewTaskText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Press Enter to add a new task..."
            className="w-full bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] focus:bg-[var(--bg)] focus:border-[var(--border-accent)] rounded-2xl py-4 pl-12 pr-4 text-[14px] font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-all shadow-sm focus:shadow-md"
          />
        </div>
      </div>

      {/* Content List */}
      <div className="flex-1 overflow-y-auto px-8 pb-24 max-w-3xl mx-auto w-full">
        {loading && tasks.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--border)] border-t-[var(--accent)]"></div>
          </div>
        ) : sortedTasks.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center opacity-50">
            <CheckSquare size={32} className="text-[var(--text-muted)] mb-4" />
            <h3 className="font-medium text-[var(--text-primary)] mb-1">No tasks yet</h3>
            <p className="text-[var(--text-muted)] text-[13px]">Type above and press enter to add one.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <AnimatePresence>
              {sortedTasks.map((task) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  transition={{ duration: 0.2 }}
                >
                  <TaskRow 
                    task={task} 
                    onToggle={() => toggleStatus(task)} 
                    onDelete={() => handleDeleteTask(task.id)}
                    onClick={() => task.lectureId && navigate(`/lectures/${task.lectureId}`)} 
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
  
  return (
    <div className={`group flex items-center justify-between py-3 px-4 rounded-xl transition-all ${
      isDone ? 'opacity-40 hover:opacity-100 bg-transparent' : 'bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-transparent hover:border-[var(--border)]'
    }`}>
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <button 
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className={`shrink-0 w-4 h-4 flex items-center justify-center rounded-[4px] border transition-colors ${
            isDone 
              ? 'bg-[var(--text-muted)] border-transparent text-[var(--bg)]' 
              : 'border-[var(--border)] text-transparent hover:border-[var(--accent)] hover:text-[var(--accent)]'
          }`}
        >
          {isDone && <CheckSquare className="w-3 h-3" />}
        </button>
        
        <p 
          className={`text-[14px] font-medium truncate flex-1 ${isDone ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}
        >
          {task.task}
        </p>
      </div>

      <div className="flex items-center gap-3 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
        {task.lectureTitle && (
          <span 
            onClick={onClick}
            className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer truncate max-w-[150px]"
          >
            {task.lectureTitle}
          </span>
        )}
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-[var(--text-muted)] hover:text-red-400 p-1"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};
