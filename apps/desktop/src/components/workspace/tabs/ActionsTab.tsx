import React, { useState } from 'react';
import { Markdown as ReactMarkdown } from '@/components/ui/markdown';
import { CheckSquare, ArrowRight, BrainCircuit, Target, Sparkles, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';

interface ActionsTabProps {
  artifacts: Record<string, any>;
  lectureId: string;
}

const ActionItemCard = ({ item, context }: { item: any; context: string }) => {
  const [isExecuting, setIsExecuting] = useState(false);

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
    } finally {
      setIsExecuting(false);
    }
  };

  // If the task text contains a timestamp like [12:35], let's also render it nicely
  return (
    <div className="flex flex-col bg-background/50 p-4 rounded-xl border border-border/50 group hover:border-primary/30 transition-colors shadow-sm relative overflow-hidden">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
           {/* We use our custom Markdown to automatically parse [MM:SS] tags inside the task string! */}
           <div className="text-sm text-foreground font-medium leading-relaxed prose prose-sm prose-invert max-w-none">
             <ReactMarkdown>{item.task}</ReactMarkdown>
           </div>
        </div>
        
        <button 
          onClick={handleExecute}
          disabled={isExecuting}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors text-[10px] font-bold uppercase tracking-wider"
          title="Execute with AI"
        >
          {isExecuting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {isExecuting ? 'Thinking...' : 'Execute'}
        </button>
      </div>
      <div className="flex justify-start items-center mt-4 gap-3 text-xs">
        <span className="text-muted-foreground bg-surface px-2.5 py-1 rounded-md border border-border/50 font-medium">Owner: {item.owner || 'Unassigned'}</span>
        <span className={`px-2.5 py-1 rounded-md uppercase tracking-wider font-bold ${
          item.priority === 'high' ? 'text-red-400 bg-red-400/10' :
          item.priority === 'medium' ? 'text-yellow-400 bg-yellow-400/10' :
          'text-blue-400 bg-blue-400/10'
        }`}>
          {item.priority}
        </span>
      </div>
    </div>
  );
};

export const ActionsTab: React.FC<ActionsTabProps> = ({ artifacts }) => {
  const navigate = useNavigate();
  
  const crmMetadata = artifacts['lecture_intelligence']?.crm_metadata;
  const actionItems = crmMetadata?.action_items || [];
  const keyDecisions = crmMetadata?.key_decisions || [];

  if (!crmMetadata || (actionItems.length === 0 && keyDecisions.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
        <div className="h-16 w-16 bg-surface-raised rounded-full flex items-center justify-center mb-4 border border-border/50">
           <CheckSquare size={24} className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No Execution Items Found</h3>
        <p className="text-sm text-muted-foreground">
          Generate the AI Summary to extract Action Items and Key Decisions automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6">
      
      {/* Header & Global Tasks Link */}
      <div className="flex flex-wrap items-center justify-between mb-8 gap-4 bg-[color:var(--accent)]/5 border border-[color:var(--accent)]/20 p-4 rounded-2xl">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Target size={18} className="text-[color:var(--accent)]" />
            Execution Focus
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Focus on what needs to be done next. Action items sync to your global board.</p>
        </div>
        <button 
          onClick={() => navigate('/tasks')}
          className="flex items-center gap-2 px-4 py-2 bg-[color:var(--accent)] text-[var(--bg)] font-bold rounded-xl text-sm shadow-sm transition-transform hover:scale-105"
        >
          View Global Execution Board
          <ArrowRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        
        {/* Key Decisions Section */}
        {keyDecisions.length > 0 && (
          <section>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-4">
              <BrainCircuit size={16} className="text-purple-400" />
              Key Decisions
            </h3>
            <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm space-y-4">
              {keyDecisions.map((decision: string, idx: number) => (
                <div key={idx} className="flex items-start gap-3 border-b border-border/40 pb-4 last:border-0 last:pb-0">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                  <div className="text-sm text-foreground/90 prose prose-sm prose-invert max-w-none flex-1">
                    <ReactMarkdown>{decision}</ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Action Items Section */}
        {actionItems.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <CheckSquare size={16} className="text-[color:var(--accent)]" />
                Action Items
              </h3>
              <button
                onClick={() => {
                  const payload = actionItems.map((a: any) => `- [ ] ${a.task}`).join('\n');
                  navigator.clipboard.writeText(`## Meeting Action Items\n\n${payload}`);
                  alert('Action Items copied as Markdown! Ready to paste into Catch or Notion.');
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border text-xs font-semibold text-foreground transition-colors shadow-sm"
              >
                <ArrowRight size={14} className="text-[color:var(--accent)]" />
                Push to External (Catch/Notion)
              </button>
            </div>
            <div className="space-y-3">
              {actionItems.map((item: any, idx: number) => (
                <ActionItemCard 
                  key={idx} 
                  item={item} 
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
