import React, { useState } from 'react';
import { 
  CheckSquare, ArrowRight, BrainCircuit, Target, Sparkles, Loader2,
  Calendar, User, Clock, Quote, Copy, Check, ExternalLink, Mail, Code2, 
  FileText, ShieldAlert, CheckCircle2, Circle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';
import { useToast } from '@/components/ui/ToastProvider';
import { TauriClient } from '@/infrastructure/tauri-client';

interface ActionsTabProps {
  artifacts: Record<string, any>;
  lectureId: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  follow_up: { label: 'Follow-up', icon: Mail, color: 'text-sky-500 bg-sky-500/10 border-sky-500/20' },
  development: { label: 'Development', icon: Code2, color: 'text-violet-500 bg-violet-500/10 border-violet-500/20' },
  documentation: { label: 'Docs & Specs', icon: FileText, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  scheduling: { label: 'Scheduling', icon: Calendar, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
  review: { label: 'Review', icon: CheckSquare, color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' },
  general: { label: 'Action Item', icon: Target, color: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20' },
};

const ActionItemCard = ({ item, lectureId, context }: { item: any; lectureId: string; context: string }) => {
  const { showToast } = useToast();
  const [isExecuting, setIsExecuting] = useState(false);
  const [status, setStatus] = useState<'todo' | 'done'>(item.status === 'done' ? 'done' : 'todo');
  const [showQuote, setShowQuote] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleToggleStatus = async () => {
    const nextStatus = status === 'todo' ? 'done' : 'todo';
    setStatus(nextStatus);
    try {
      await TauriClient.updateActionItemStatus(lectureId, item.task, nextStatus);
      showToast(nextStatus === 'done' ? 'Task marked as completed' : 'Task reopened', 'success');
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    try {
      const url = await invoke<string>('execute_agentic_action', { 
        task: item.task,
        context: context || ""
      });
      if (url && url.length > 5) {
        await open(url);
      }
    } catch (e) {
      console.error("Execution failed:", e);
      showToast('Agent execution failed', 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCopyTask = async () => {
    const ownerText = item.owner && item.owner !== 'Unassigned' ? ` @${item.owner}` : '';
    const dueText = item.dueDate || item.due_date ? ` (Due: ${item.dueDate || item.due_date})` : '';
    const text = `- [ ] ${item.task}${ownerText}${dueText}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Copied task as Markdown', 'success');
  };

  const category = (item.category?.toLowerCase() as string) || 'general';
  const categoryMeta = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.general;
  const CategoryIcon = categoryMeta.icon;

  const rawQuote = item.rawQuote || item.raw_quote;
  const timestamp = item.timestamp || item.timestamp_str;
  const dueDate = item.dueDate || item.due_date;
  const priority = item.priority?.toLowerCase() || 'medium';

  return (
    <div className={`flex flex-col p-4 rounded-xl border transition-all shadow-xs relative overflow-hidden group ${
      status === 'done' 
        ? 'bg-[var(--surface)]/40 border-[var(--border)] opacity-70' 
        : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--border-accent)]'
    }`}>
      
      {/* Top row: Checkbox, Category, Priority, Action Toolbar */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <button 
            type="button"
            onClick={handleToggleStatus}
            className="mt-0.5 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors shrink-0 focus-visible:outline-none"
            title={status === 'done' ? 'Mark as pending' : 'Mark as completed'}
          >
            {status === 'done' ? (
              <CheckCircle2 size={18} className="text-emerald-500 fill-emerald-500/20" />
            ) : (
              <Circle size={18} className="hover:text-[var(--accent)]" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              {/* Category badge */}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${categoryMeta.color}`}>
                <CategoryIcon size={11} />
                <span>{categoryMeta.label}</span>
              </span>

              {/* Priority badge */}
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                priority === 'urgent' ? 'text-red-500 bg-red-500/10 border border-red-500/20' :
                priority === 'high' ? 'text-amber-500 bg-amber-500/10 border border-amber-500/20' :
                priority === 'medium' ? 'text-blue-500 bg-blue-500/10 border border-blue-500/20' :
                'text-zinc-500 bg-zinc-500/10 border border-zinc-500/20'
              }`}>
                {priority === 'urgent' && <ShieldAlert size={10} className="mr-1 inline" />}
                {priority}
              </span>

              {/* Timestamp citation */}
              {timestamp && (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-[var(--text-muted)] bg-[var(--surface-raised)] px-2 py-0.5 rounded-md border border-[var(--border)]">
                  <Clock size={10} />
                  <span>{timestamp}</span>
                </span>
              )}
            </div>

            {/* Task description */}
            <p className={`text-sm font-medium leading-snug ${
              status === 'done' ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
            }`}>
              {item.task}
            </p>
          </div>
        </div>

        {/* Action button toolbar */}
        <div className="flex items-center gap-1 shrink-0">
          <button 
            type="button"
            onClick={handleCopyTask}
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
            title="Copy as Markdown task"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>

          <button 
            onClick={handleExecute}
            disabled={isExecuting}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] hover:opacity-90 transition-all text-[11px] font-semibold cursor-pointer disabled:opacity-50"
            title="Execute with AI Assistant"
          >
            {isExecuting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            <span>{isExecuting ? '...' : 'AI Run'}</span>
          </button>
        </div>
      </div>

      {/* Metadata bar: Owner & Due Date */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-2.5 border-t border-[var(--border)]/60 text-xs">
        <div className="flex items-center gap-3">
          {/* Owner chip */}
          <span className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] font-medium bg-[var(--surface-raised)] px-2 py-0.5 rounded-md border border-[var(--border)]">
            <User size={11} className="text-[var(--text-muted)]" />
            <span>{item.owner || 'Unassigned'}</span>
          </span>

          {/* Due date */}
          {dueDate && (
            <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
              <Calendar size={11} />
              <span>{dueDate}</span>
            </span>
          )}
        </div>

        {/* Verbatim quote toggle */}
        {rawQuote && (
          <button
            type="button"
            onClick={() => setShowQuote(!showQuote)}
            className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium flex items-center gap-1 transition-colors"
          >
            <Quote size={11} />
            <span>{showQuote ? 'Hide transcript quote' : 'View quote'}</span>
          </button>
        )}
      </div>

      {/* Verbatim transcript evidence quote */}
      {showQuote && rawQuote && (
        <div className="mt-2.5 p-2.5 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] text-xs text-[var(--text-secondary)] italic leading-relaxed animate-in fade-in duration-150 flex items-start gap-2">
          <Quote size={12} className="text-[var(--accent)] shrink-0 mt-0.5 not-italic opacity-70" />
          <span>"{rawQuote}"</span>
        </div>
      )}
    </div>
  );
};

export const ActionsTab: React.FC<ActionsTabProps> = ({ artifacts, lectureId }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const crmMetadata = artifacts['lecture_intelligence']?.crm_metadata;
  const actionItems = crmMetadata?.action_items || [];
  const keyDecisions = crmMetadata?.key_decisions || [];

  const handleCopyAll = (format: 'markdown' | 'slack') => {
    if (actionItems.length === 0) return;
    
    let content = '';
    if (format === 'markdown') {
      const tasks = actionItems.map((a: any) => {
        const owner = a.owner && a.owner !== 'Unassigned' ? ` @${a.owner}` : '';
        const due = a.dueDate || a.due_date ? ` (Due: ${a.dueDate || a.due_date})` : '';
        return `- [ ] ${a.task}${owner}${due}`;
      }).join('\n');
      content = `### Meeting Action Items\n\n${tasks}`;
    } else {
      const tasks = actionItems.map((a: any) => `• *${a.task}* — assigned to: _${a.owner || 'Unassigned'}_`).join('\n');
      content = `*Action Items:*\n${tasks}`;
    }

    navigator.clipboard.writeText(content);
    showToast(`Copied ${actionItems.length} action items to clipboard!`, 'success');
  };

  if (!crmMetadata || (actionItems.length === 0 && keyDecisions.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
        <div className="h-16 w-16 bg-[var(--surface-raised)] rounded-2xl flex items-center justify-center mb-4 border border-[var(--border)] shadow-xs">
           <CheckSquare size={24} className="text-[var(--text-muted)]" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No Action Items Extracted</h3>
        <p className="text-sm text-[var(--text-muted)]">
          Run or regenerate the AI meeting summary to automatically extract action items, owners, and key decisions.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6">
      
      {/* Header & Global Tasks Link */}
      <div className="flex flex-wrap items-center justify-between mb-8 gap-4 bg-[var(--surface)] border border-[var(--border)] p-4 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Target size={18} className="text-[var(--accent)]" />
            <span>Meeting Action Items & Execution</span>
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Commitments extracted and grounded directly from the meeting transcript.
          </p>
        </div>
        <button 
          onClick={() => navigate('/tasks')}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-[var(--text-primary)] text-[var(--bg)] font-semibold rounded-lg text-xs shadow-xs hover:opacity-90 transition-opacity"
        >
          <span>Global Tasks Board</span>
          <ArrowRight size={13} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        
        {/* Key Decisions Section */}
        {keyDecisions.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-3">
              <BrainCircuit size={16} className="text-purple-500" />
              <span>Key Decisions Agreed Upon</span>
            </h3>
            <div className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-xl shadow-xs space-y-3">
              {keyDecisions.map((decision: string, idx: number) => (
                <div key={idx} className="flex items-start gap-3 border-b border-[var(--border)]/50 pb-3 last:border-0 last:pb-0">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                  <div className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed flex-1">
                    {decision}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Action Items Section */}
        {actionItems.length > 0 && (
          <section>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <CheckSquare size={16} className="text-[var(--accent)]" />
                  <span>Action Items ({actionItems.length})</span>
                </h3>
              </div>

              {/* Export toolbar */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyAll('markdown')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shadow-xs"
                  title="Copy as Markdown checklist"
                >
                  <Copy size={12} />
                  <span>Copy Markdown</span>
                </button>
                <button
                  onClick={() => handleCopyAll('slack')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shadow-xs"
                  title="Copy for Slack / Discord"
                >
                  <ExternalLink size={12} />
                  <span>Slack Format</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {actionItems.map((item: any, idx: number) => (
                <ActionItemCard 
                  key={idx} 
                  item={item} 
                  lectureId={lectureId}
                  context={artifacts['lecture_intelligence']?.executive_summary || ""}
                />
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
};

