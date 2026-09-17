import { useState, useEffect } from 'react';
import { TauriClient } from '@/infrastructure/tauri-client';

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

export function useGlobalTasks() {
  const [tasks, setTasks] = useState<GlobalActionItem[]>([]);
  const [loading, setLoading] = useState(true);

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
            const rawTask = trimmed.replace(/^-\s*\[[ x]\]/, '').replace(/^\[[ x]\]/, '').trim();
            const tsMatch = rawTask.match(/\[(\d{1,2}:\d{2}(?::\d{2})?)\]/);
            const extractedTs = tsMatch ? tsMatch[1] : null;
            const cleanTask = tsMatch ? rawTask.replace(tsMatch[0], '').trim() : rawTask;

            parsedNoteTasks.push({
              id: `note_task_${n.id}_${idx}`,
              lectureId: n.id,
              lectureTitle: n.title || 'Workspace Note',
              task: cleanTask,
              owner: 'Me',
              timestamp: extractedTs || undefined,
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
    const handler = () => fetchTasks();
    window.addEventListener('bacham_tasks_updated', handler);
    return () => window.removeEventListener('bacham_tasks_updated', handler);
  }, []);

  const toggleTaskStatus = async (task: GlobalActionItem) => {
    const newStatus = task.status === 'todo' ? 'done' : 'todo';
    
    // Optimistic update
    setTasks(current => current.map(t => 
      t.id === task.id ? { ...t, status: newStatus } : t
    ));

    // Also update custom tasks if it's there
    const localCustomRaw = localStorage.getItem('bacham_custom_global_tasks');
    if (localCustomRaw) {
      const customTasks: GlobalActionItem[] = JSON.parse(localCustomRaw);
      const updatedCustom = customTasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t);
      localStorage.setItem('bacham_custom_global_tasks', JSON.stringify(updatedCustom));
      window.dispatchEvent(new Event('bacham_tasks_updated'));
    }

    if (task.id.startsWith('note_task_') && task.lectureId) {
      // Find the note
      const notes = await TauriClient.getWorkspaceNotes().catch(() => []);
      const n = notes.find((note: any) => note.id === task.lectureId);
      if (n && n.content) {
        // Toggle the markdown checkbox for this exact task
        const lines = n.content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.includes(task.task)) {
            if (newStatus === 'done' && line.includes('[ ]')) {
              lines[i] = line.replace('[ ]', '[x]');
            } else if (newStatus === 'todo' && line.includes('[x]')) {
              lines[i] = line.replace('[x]', '[ ]');
            }
          }
        }
        await TauriClient.updateWorkspaceNote(n.id, n.title, lines.join('\n')).catch(console.error);
      }
    } else if (task.lectureId) {
      TauriClient.updateActionItemStatus(task.lectureId, task.task, newStatus).catch(console.error);
    }
  };

  return { tasks, loading, refetch: fetchTasks, toggleTaskStatus };
}
