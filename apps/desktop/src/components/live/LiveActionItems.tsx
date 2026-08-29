import { useState } from 'react';
import { CheckSquare, RefreshCw, Loader2 } from 'lucide-react';
import { TauriClient } from '@/infrastructure/tauri-client';
import { useToast } from '@/components/ui/ToastProvider';

interface ActionItem {
  id: string;
  task: string;
  owner: string;
  completed: boolean;
}

export function LiveActionItems() {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const { showToast } = useToast();

  const scanMeeting = async () => {
    setIsScanning(true);
    try {
      const prompt = `Review the live meeting transcript and extract any NEW tasks, action items, or follow-ups. 
      First, think step-by-step in the _reasoning field about what tasks were actually committed to.
      Return ONLY a raw JSON array of objects. Do NOT wrap in markdown codeblocks. Do NOT include tasks you already extracted. If none, return [].
      Schema:
      [
        {
          "task": "A clear, concise description of the task",
          "owner": "The person responsible (or 'Unassigned')",
          "priority": "urgent|high|medium|low",
          "category": "follow_up|development|documentation|scheduling|review|general",
          "raw_quote": "The exact quote from the transcript",
          "context": "Brief context on why this task is needed",
          "due_date": "Natural language due date if mentioned, else null"
        }
      ]`;
      
      const res = await TauriClient.sendGlobalMemoryChat(prompt);
      
      // Attempt to parse JSON robustly
      let newItems: any[] = [];
      try {
        const match = res.match(/\[[\s\S]*\]/);
        if (match) {
          newItems = JSON.parse(match[0]);
        } else {
          throw new Error('No JSON array found in response.');
        }
      } catch (e) {
        console.error('Failed to parse AI response as JSON:', res);
        throw new Error('AI returned invalid format.');
      }

      if (Array.isArray(newItems) && newItems.length > 0) {
        const formatted = newItems.map(item => ({
          id: Math.random().toString(36).substring(7),
          task: item.task || 'Unknown Task',
          owner: item.owner || 'Unassigned',
          completed: false
        }));
        
        setItems(prev => [...prev, ...formatted]);
        showToast(`Detected ${formatted.length} new action item(s)`, 'success');
      } else {
        showToast('No new action items detected', 'info');
      }
    } catch (e: any) {
      console.error(e);
      showToast(`Failed to scan meeting: ${e.message || e}`, 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
  };

  return (
    <div className="flex flex-col bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm h-full">
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--surface)]/50 shrink-0">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-[var(--text-secondary)]" />
          <h2 className="text-sm font-semibold tracking-wide text-[var(--text-primary)]">Action Items</h2>
        </div>
        <button 
          onClick={scanMeeting}
          disabled={isScanning}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors text-xs font-bold tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          {isScanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Auto-Detect
        </button>
      </div>
      <div className="p-4 flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] p-6 text-center space-y-3">
            <CheckSquare className="w-8 h-8 opacity-20" />
            <p className="text-sm">No action items detected yet. Click Auto-Detect to scan the meeting transcript.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map(item => (
              <li key={item.id} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                <button 
                  onClick={() => toggleItem(item.id)}
                  className={`mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${item.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-[var(--border-accent)] hover:border-emerald-500'}`}
                >
                  {item.completed && <CheckSquare className="w-3 h-3" />}
                </button>
                <div className={`flex flex-col ${item.completed ? 'opacity-50' : ''}`}>
                  <span className={`text-sm font-medium ${item.completed ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>{item.task}</span>
                  <span className="text-[11px] font-semibold tracking-wide uppercase text-[var(--text-secondary)] mt-1">Owner: {item.owner}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
