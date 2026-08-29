import React, { useState } from 'react';
import { Markdown as ReactMarkdown } from '@/components/ui/markdown';
import { ChevronDown, ChevronRight, BookOpen, Code, FileText, CheckCircle, Clock, Info, Target, Briefcase, Sparkles, Loader2, Layers, Zap } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';

interface Props {
  data: any;
}

import { useCalendarStore } from '@/shared/stores/calendarStore';

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  follow_up: { label: 'Follow-up', icon: FileText, color: 'text-sky-500 bg-sky-500/10 border-sky-500/20' },
  development: { label: 'Development', icon: Code, color: 'text-violet-500 bg-violet-500/10 border-violet-500/20' },
  documentation: { label: 'Docs & Specs', icon: FileText, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  scheduling: { label: 'Scheduling', icon: Clock, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
  review: { label: 'Review', icon: CheckCircle, color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' },
  general: { label: 'Action Item', icon: Target, color: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20' },
};

const ActionItemCard = ({ item, context }: { item: any; context: string }) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(item.status === 'done' || item.status === 'completed');
  const [showQuote, setShowQuote] = useState(false);
  const { addEvent, setSyncModalOpen, isConnected } = useCalendarStore();

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

  const handleSetReminder = () => {
    if (!isConnected) {
      setSyncModalOpen(true);
      return;
    }

    const dueStr = item.dueDate || item.due_date;
    if (!dueStr) {
      alert("No due date found to set a reminder for.");
      return;
    }

    const today = new Date();
    addEvent({
      title: `Task: ${item.task}`,
      description: `Action item assigned to ${item.owner || 'Me'}${item.rawQuote ? `\n\nQuote: "${item.rawQuote}"` : ''}`,
      dateStr: dueStr,
      dayNum: today.getDate() + 1,
      monthStr: today.toLocaleString('default', { month: 'short' }),
      dayOfWeek: today.toLocaleString('default', { weekday: 'short' }),
      type: 'bacham',
      color: '#3b82f6'
    });
    alert(`Reminder for "${item.task}" added to your calendar!`);
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
      isCompleted 
        ? 'bg-[var(--surface)]/40 border-[var(--border)] opacity-60' 
        : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--border-accent)]'
    }`}>
      <div className="flex justify-between items-start gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <input 
            type="checkbox" 
            checked={isCompleted}
            onChange={(e) => setIsCompleted(e.target.checked)}
            className="mt-1 shrink-0 accent-[var(--accent)] cursor-pointer rounded"
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              {/* Category */}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${categoryMeta.color}`}>
                <CategoryIcon size={11} />
                <span>{categoryMeta.label}</span>
              </span>

              {/* Priority */}
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                priority === 'urgent' ? 'text-red-500 bg-red-500/10 border border-red-500/20' :
                priority === 'high' ? 'text-amber-500 bg-amber-500/10 border border-amber-500/20' :
                priority === 'medium' ? 'text-blue-500 bg-blue-500/10 border border-blue-500/20' :
                'text-zinc-500 bg-zinc-500/10 border border-zinc-500/20'
              }`}>
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

            <p className={`text-sm font-medium leading-relaxed ${isCompleted ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
              {item.task}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
          <button 
            onClick={handleExecute}
            disabled={isExecuting}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] hover:opacity-90 transition-colors text-[11px] font-semibold"
            title="Execute with AI"
          >
            {isExecuting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            <span>{isExecuting ? '...' : 'Run'}</span>
          </button>
          
          <button 
            onClick={async () => {
              try {
                const msg = await invoke<string>('push_to_composio', {
                  input: {
                    task: item.task,
                    owner: item.owner || 'Unassigned',
                    priority: item.priority || 'medium',
                    destination: 'Linear'
                  }
                });
                alert(msg);
              } catch (e) {
                console.error(e);
              }
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-[11px] font-medium"
            title="Push to Linear via Composio"
          >
            <Briefcase size={12} />
            <span>Linear</span>
          </button>

          <button 
            onClick={handleSetReminder}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/20 transition-colors text-[11px] font-medium"
            title="Set Reminder on Calendar"
          >
            <Clock size={12} />
            <span>Remind</span>
          </button>
        </div>
      </div>

      {/* Metadata bar: Owner, Due Date, Quote toggle */}
      <div className="flex flex-wrap justify-between items-center mt-3 pt-2.5 border-t border-[var(--border)]/60 text-xs gap-2">
        <div className="flex gap-2 items-center">
          <span className="text-[var(--text-secondary)] bg-[var(--surface-raised)] px-2 py-0.5 rounded-md border border-[var(--border)] font-medium">
            Owner: {item.owner || 'Unassigned'}
          </span>
          {dueDate && (
             <span className="text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 font-medium">
               Due: {dueDate}
             </span>
          )}
        </div>

        {rawQuote && (
          <button
            type="button"
            onClick={() => setShowQuote(!showQuote)}
            className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium transition-colors"
          >
            {showQuote ? 'Hide quote' : 'View quote'}
          </button>
        )}
      </div>

      {showQuote && rawQuote && (
        <div className="mt-2.5 p-2 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] text-xs text-[var(--text-secondary)] italic leading-relaxed">
          "{rawQuote}"
        </div>
      )}
    </div>
  );
};

export const LectureIntelligenceView: React.FC<Props> = ({ data }) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    executive_summary: true,
    discussion_points: true,
    crm: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const renderSectionHeader = (id: string, title: string, icon: React.ReactNode) => {
    const isExpanded = expandedSections[id];
    return (
      <div 
        className="flex items-center gap-3 py-4 cursor-pointer hover:bg-[var(--overlay-02)] -mx-4 px-4 rounded-lg transition-colors border-b border-border"
        onClick={() => toggleSection(id)}
      >
        {isExpanded ? <ChevronDown size={18} className="text-muted-foreground" /> : <ChevronRight size={18} className="text-muted-foreground" />}
        <div className="text-[color:var(--accent)] p-1.5 bg-[color:var(--accent)]/10 rounded-md">
          {icon}
        </div>
        <h2 className="text-lg font-semibold text-[color:var(--accent)] m-0">{title}</h2>
      </div>
    );
  };

  if (!data) return null;

  const isMeaningful = (val: any): boolean => {
    if (val === null || val === undefined) return false;
    if (typeof val === 'string') {
      const s = val.trim().toLowerCase();
      return s !== '' && s !== 'null' && s !== 'not identified' && s !== 'none' && s !== 'n/a' && s !== 'unknown' && s !== 'none identified' && !s.startsWith('no ');
    }
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === 'object') return Object.keys(val).length > 0;
    return Boolean(val);
  };

  const hasSummary = Boolean(
    isMeaningful(data.executive_summary) ||
    isMeaningful(data.overview) ||
    isMeaningful(data.quick_summary) ||
    isMeaningful(data.quickSummary) ||
    isMeaningful(data.standard_summary) ||
    isMeaningful(data.standardSummary)
  );

  const discussionPoints = data.discussion_points || data.discussionPoints || [];
  const hasDiscussion = discussionPoints.length > 0;

  // CRM & Action Items
  const rawBant = data.crm_metadata?.bant || data.crmMetadata?.bant;
  const bant = rawBant ? {
    budget: isMeaningful(rawBant.budget) ? String(rawBant.budget).trim() : null,
    authority: isMeaningful(rawBant.authority) ? String(rawBant.authority).trim() : null,
    need: isMeaningful(rawBant.need) ? String(rawBant.need).trim() : null,
    timeline: isMeaningful(rawBant.timeline) ? String(rawBant.timeline).trim() : null,
  } : null;
  const hasBant = Boolean(bant && (bant.budget || bant.authority || bant.need || bant.timeline));

  const actionItems = (data.crm_metadata?.action_items || data.crmMetadata?.action_items || []).filter((item: any) => 
    item && isMeaningful(item.task)
  );

  const keyDecisions = (data.crm_metadata?.key_decisions || data.crmMetadata?.key_decisions || []).filter((dec: any) => 
    isMeaningful(dec)
  );

  const hasCrmSection = hasBant || actionItems.length > 0 || keyDecisions.length > 0;

  const rawTakeaways = data.key_takeaways || data.keyTakeaways || data.key_concepts || [];
  const takeaways = (Array.isArray(rawTakeaways) ? rawTakeaways : []).filter((t: any) => isMeaningful(t));

  const getSummaryContent = () => {
    return data.executive_summary || data.standard_summary || data.overview || "Summary content is being generated...";
  };

  return (
    <div className="flex flex-col gap-6 font-sans" style={{ '--brand-lime': 'var(--accent)' } as any}>
      {/* Header Panel */}
      {data.lecture_information && (
        <div className="bg-surface border border-border p-6 rounded-xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[color:var(--accent)]" />
          <h1 className="text-2xl font-bold text-foreground mb-2">{data.lecture_information.title || 'Untitled Lecture'}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><BookOpen size={14}/> {data.lecture_information.subject}</span>
            <span className="flex items-center gap-1"><Info size={14}/> {data.lecture_information.instructor}</span>
            <span className="flex items-center gap-1"><Clock size={14}/> {data.lecture_information.duration_hint}</span>
          </div>
        </div>
      )}

      {/* Main Summary Section */}
      {hasSummary && (
        <section className="bg-background">
          {renderSectionHeader('executive_summary', 'Executive Summary', <FileText size={16} />)}
          {expandedSections['executive_summary'] && (
            <div className="mt-4 space-y-4">
              <div className="bg-surface border border-border/50 rounded-xl p-6 shadow-sm">
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown>{getSummaryContent()}</ReactMarkdown>
                </div>
              </div>

              {takeaways.length > 0 && (
                <div className="bg-surface border border-border/50 rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Key Takeaways</h3>
                  <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                    {takeaways.map((t: string, i: number) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Discussion Points Section */}
      {hasDiscussion && (
        <section className="bg-background">
          {renderSectionHeader('discussion_points', 'Discussion Points', <Layers size={16} />)}
          {expandedSections['discussion_points'] && (
            <div className="mt-4 grid grid-cols-1 gap-4">
              {discussionPoints.map((dp: any, idx: number) => (
                <div key={idx} className="bg-surface p-5 rounded-lg border border-border shadow-sm flex flex-col gap-2">
                  <div className="flex justify-between items-start gap-4">
                    <h3 className="text-sm font-semibold text-foreground">{dp.topic || "Discussion"}</h3>
                    {dp.timestamp && (
                      <span className="text-[11px] font-mono bg-surface-raised px-2 py-0.5 rounded text-muted-foreground border border-border whitespace-nowrap">
                        {dp.timestamp}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{dp.details}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* CRM Metadata */}
      {hasCrmSection && (
        <section className="bg-background">
          {renderSectionHeader('crm', 'Auto-CRM & Follow-ups', <Briefcase size={16} />)}
          {expandedSections['crm'] && (
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6 px-2">
              
              {/* BANT Framework */}
              {hasBant && bant && (
                <div className="bg-surface p-5 rounded-lg border border-border shadow-sm">
                  <h3 className="text-foreground font-medium mb-4 flex items-center gap-2">
                    <Target size={16} className="text-primary" /> BANT Qualification
                  </h3>
                  <div className="space-y-3">
                    {bant.budget && (
                      <div className="flex flex-col border-b border-border/50 pb-2">
                        <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Budget</span>
                        <span className="text-sm text-foreground mt-1">{bant.budget}</span>
                      </div>
                    )}
                    {bant.authority && (
                      <div className="flex flex-col border-b border-border/50 pb-2">
                        <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Authority</span>
                        <span className="text-sm text-foreground mt-1">{bant.authority}</span>
                      </div>
                    )}
                    {bant.need && (
                      <div className="flex flex-col border-b border-border/50 pb-2">
                        <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Need</span>
                        <span className="text-sm text-foreground mt-1">{bant.need}</span>
                      </div>
                    )}
                    {bant.timeline && (
                      <div className="flex flex-col">
                        <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Timeline</span>
                        <span className="text-sm text-foreground mt-1">{bant.timeline}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Items & Decisions */}
              {(actionItems.length > 0 || keyDecisions.length > 0) && (
                <div className="flex flex-col gap-4">
                  {actionItems.length > 0 && (
                    <div className="bg-surface p-5 rounded-lg border border-border shadow-sm flex-1">
                      <h3 className="text-foreground font-medium mb-3 flex items-center gap-2">
                        <CheckCircle size={16} className="text-[color:var(--accent)]" /> Action Items
                      </h3>
                      <div className="space-y-3">
                        {actionItems.map((item: any, i: number) => (
                          <ActionItemCard key={i} item={item} context={data.executive_summary || ''} />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {keyDecisions.length > 0 && (
                    <div className="bg-surface p-5 rounded-lg border border-border shadow-sm">
                      <h3 className="text-foreground font-medium mb-3 flex items-center gap-2">
                        <Zap size={16} className="text-yellow-400" /> Key Decisions
                      </h3>
                      <ul className="space-y-2">
                        {keyDecisions.map((decision: string, i: number) => (
                          <li key={i} className="text-sm text-foreground flex items-start gap-2">
                            <span className="text-[color:var(--accent)] mt-0.5">•</span>
                            {decision}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      )}



      {/* Raw Notes Fallback */}
      {data.detailed_notes && isMeaningful(data.detailed_notes) && (
        <section className="bg-background p-2 mt-4 opacity-50 hover:opacity-100 transition-opacity">
          {renderSectionHeader('detailed_notes', 'Raw Detailed Notes', <FileText size={16} />)}
          {expandedSections['detailed_notes'] && (
            <div className="mt-4 px-2 prose prose-sm prose-invert max-w-none">
              <ReactMarkdown>{data.detailed_notes}</ReactMarkdown>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
