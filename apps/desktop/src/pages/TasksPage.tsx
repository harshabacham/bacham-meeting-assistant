import React, { useState, useEffect } from 'react';
import { TauriClient } from '@/infrastructure/tauri-client';
import { CheckSquare, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface GlobalActionItem {
  lectureId: string;
  lectureTitle: string;
  task: string;
  owner: string;
  priority: string;
  status: string; // 'todo' or 'done'
}

export const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<GlobalActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const items = await TauriClient.getAllActionItems();
      setTasks(items);
    } catch (e) {
      console.error('Failed to fetch action items', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const toggleStatus = async (task: GlobalActionItem) => {
    const newStatus = task.status === 'todo' ? 'done' : 'todo';
    
    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.lectureId === task.lectureId && t.task === task.task 
        ? { ...t, status: newStatus } 
        : t
    ));

    try {
      await TauriClient.updateActionItemStatus(task.lectureId, task.task, newStatus);
    } catch (e) {
      console.error('Failed to update status', e);
      // Revert on failure
      setTasks(prev => prev.map(t => 
        t.lectureId === task.lectureId && t.task === task.task 
          ? { ...t, status: task.status } 
          : t
      ));
    }
  };

  const todoTasks = tasks.filter(t => t.status === 'todo');
  const doneTasks = tasks.filter(t => t.status === 'done');

  return (
    <div className="flex flex-col h-full bg-[#09090b] text-zinc-100 overflow-hidden">
      {/* Header */}
      <div className="flex-none p-8 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <CheckSquare className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Global Tasks</h1>
              <p className="text-zinc-400 mt-1">Manage action items extracted from all your meetings.</p>
            </div>
          </div>
          <button 
            onClick={fetchTasks}
            className="p-2.5 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 text-zinc-300 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 pb-12 custom-scrollbar">
        {loading && tasks.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-zinc-500" />
            </div>
            <h3 className="text-lg font-medium text-zinc-200">No Action Items</h3>
            <p className="text-zinc-400 mt-2 max-w-md">
              BACHAM automatically extracts action items from your meeting transcripts. They will appear here.
            </p>
          </div>
        ) : (
          <div className="flex gap-6 h-full">
            
            {/* To Do Column */}
            <div className="flex-1 flex flex-col bg-zinc-900/40 rounded-2xl border border-zinc-800/60 overflow-hidden">
              <div className="p-4 border-b border-zinc-800/60 bg-zinc-900/80 backdrop-blur flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span className="font-semibold text-zinc-200">To Do</span>
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded-md bg-zinc-800 text-zinc-400">
                  {todoTasks.length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {todoTasks.map((task, idx) => (
                  <TaskCard key={idx} task={task} onToggle={() => toggleStatus(task)} onClick={() => navigate(`/study/${task.lectureId}`)} />
                ))}
              </div>
            </div>

            {/* Done Column */}
            <div className="flex-1 flex flex-col bg-zinc-900/20 rounded-2xl border border-zinc-800/40 overflow-hidden opacity-80">
              <div className="p-4 border-b border-zinc-800/40 bg-zinc-900/60 backdrop-blur flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-zinc-300">Done</span>
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded-md bg-zinc-800/50 text-zinc-500">
                  {doneTasks.length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {doneTasks.map((task, idx) => (
                  <TaskCard key={idx} task={task} onToggle={() => toggleStatus(task)} onClick={() => navigate(`/study/${task.lectureId}`)} />
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

const TaskCard = ({ task, onToggle, onClick }: { task: GlobalActionItem; onToggle: () => void; onClick: () => void }) => {
  const isDone = task.status === 'done';
  
  return (
    <div className={`p-4 rounded-xl border transition-all cursor-pointer ${
      isDone 
        ? 'bg-zinc-800/20 border-zinc-800/50 hover:bg-zinc-800/40' 
        : 'bg-zinc-800/40 border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600'
    }`}>
      <div className="flex items-start gap-3">
        <button 
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className={`mt-0.5 flex-none w-5 h-5 rounded flex items-center justify-center transition-colors border ${
            isDone 
              ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
              : 'bg-zinc-900 border-zinc-600 text-transparent hover:border-indigo-400'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
        </button>
        
        <div className="flex-1 min-w-0" onClick={onClick}>
          <p className={`text-sm font-medium leading-snug ${isDone ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
            {task.task}
          </p>
          
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
              isDone ? 'text-zinc-600 border-zinc-800 bg-transparent' : 
              task.priority.toLowerCase() === 'high' ? 'text-red-400 bg-red-400/10 border-red-400/20' :
              task.priority.toLowerCase() === 'medium' ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' :
              'text-blue-400 bg-blue-400/10 border-blue-400/20'
            }`}>
              {task.priority || 'medium'}
            </span>
            
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-[11px] hover:text-indigo-400 hover:border-indigo-500/30 transition-colors">
              <Clock className="w-3 h-3" />
              <span className="truncate max-w-[120px]">{task.lectureTitle}</span>
            </div>
            
            {task.owner && (
              <span className="text-[11px] text-zinc-500 font-medium">
                @ {task.owner}
              </span>
            )}
            
            {!isDone && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  // Just mocking the token and page id for prototyping
                  const res = await TauriClient.pushTaskToNotion({
                    token: "mock_token",
                    pageId: "mock_page",
                    title: task.task,
                    content: `Lecture: ${task.lectureTitle}\nPriority: ${task.priority}\nOwner: ${task.owner || 'None'}`
                  });
                  if (res) alert("Pushed to Notion!");
                }}
                className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] uppercase font-bold hover:bg-indigo-500/20 transition-colors"
              >
                Push to Notion
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
