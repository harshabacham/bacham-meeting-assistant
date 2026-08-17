import React, { useState } from 'react';
import { Markdown as ReactMarkdown } from '@/components/ui/markdown';
import { ChevronDown, ChevronRight, BookOpen, Code, Zap, FileText, CheckCircle, Clock, Info, BrainCircuit, Activity, Target, Briefcase, Sparkles, Loader2, Layers, Book } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';

interface Props {
  data: any;
}

import { useCalendarStore } from '@/shared/stores/calendarStore';

const ActionItemCard = ({ item, context }: { item: any; context: string }) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(item.status === 'completed');
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

    if (!item.due_date) {
      alert("No due date found to set a reminder for.");
      return;
    }

    const today = new Date();
    // basic assumption that it's next day if due date is raw text, otherwise parse
    addEvent({
      title: `Task: ${item.task}`,
      description: `Action item assigned to ${item.owner}`,
      dateStr: item.due_date,
      dayNum: today.getDate() + 1,
      monthStr: today.toLocaleString('default', { month: 'short' }),
      dayOfWeek: today.toLocaleString('default', { weekday: 'short' }),
      type: 'bacham',
      color: '#3b82f6'
    });
    alert(`Reminder for "${item.task}" added to your calendar!`);
  };

  return (
    <div className={`flex flex-col bg-background/50 p-3 rounded border border-border/50 group hover:border-primary/30 transition-colors ${isCompleted ? 'opacity-50' : ''}`}>
      <div className="flex justify-between items-start gap-3">
        <div className="flex items-start gap-2 flex-1 mt-1">
          <input 
            type="checkbox" 
            checked={isCompleted}
            onChange={(e) => setIsCompleted(e.target.checked)}
            className="mt-0.5 shrink-0 accent-[var(--accent)] cursor-pointer"
          />
          <span className={`text-sm font-medium leading-relaxed ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
            {item.task}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 max-w-[200px]">
          <button 
            onClick={handleExecute}
            disabled={isExecuting}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors text-[10px] font-bold uppercase tracking-wider"
            title="Execute with AI"
          >
            {isExecuting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            Execute
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
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 hover:bg-[var(--accent)]/20 transition-colors text-[10px] font-bold uppercase tracking-wider"
            title="Push to Linear via Composio"
          >
            <Briefcase size={12} /> Push
          </button>

          <button 
            onClick={handleSetReminder}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/20 transition-colors text-[10px] font-bold uppercase tracking-wider"
            title="Set Reminder on Calendar"
          >
            <Clock size={12} /> Remind
          </button>
        </div>
      </div>
      <div className="flex flex-wrap justify-between items-center mt-3 text-xs gap-2">
        <div className="flex gap-2 items-center">
          <span className="text-muted-foreground bg-surface px-2 py-0.5 rounded border border-border/50">Owner: {item.owner || 'Unassigned'}</span>
          {item.due_date && (
             <span className="text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded border border-orange-400/20 font-medium">Due: {item.due_date}</span>
          )}
        </div>
        <span className={`px-2 py-0.5 rounded uppercase tracking-wider font-bold ${
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

export const LectureIntelligenceView: React.FC<Props> = ({ data }) => {
  const [summaryTier, setSummaryTier] = useState<'quick' | 'standard' | 'deep' | 'textbook'>('standard');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    executive_summary: true,
    chapter_breakdown: true,
    formula_sheet: true,
    problems_solved: true,
    code_explained: true,
    crm: true,
    revision: true,
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
    isMeaningful(data.standardSummary) ||
    isMeaningful(data.deep_notes) ||
    isMeaningful(data.deepNotes) ||
    isMeaningful(data.textbook_notes) ||
    isMeaningful(data.textbookNotes)
  );

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

  // Study & Tech Items
  const chapters = (data.chapter_breakdown || data.chapterBreakdown || []).filter((ch: any) => 
    ch && (isMeaningful(ch.title) || isMeaningful(ch.summary))
  );

  const formulas = (data.formula_sheet || data.formulaSheet || []).filter((f: any) => 
    f && isMeaningful(f.formula)
  );

  const problems = (data.problems_solved || data.problemsSolved || []).filter((p: any) => 
    p && isMeaningful(p.question)
  );

  const codeList = (data.code_explained || data.codeExplained || []).filter((c: any) => 
    c && (isMeaningful(c.logic) || isMeaningful(c.code_snippet) || isMeaningful(c.purpose))
  );

  const rawCheatSheet = data.cheat_sheet || data.cheatSheet;
  const hasCheatSheet = isMeaningful(rawCheatSheet);

  const visuals = (data.visual_explanations || data.visualExplanations || []).filter((v: any) => 
    v && (isMeaningful(v.title) || isMeaningful(v.explanation))
  );

  const concepts = (data.concepts_and_definitions || data.conceptsAndDefinitions || []).filter((c: any) => 
    c && isMeaningful(c.term) && isMeaningful(c.definition)
  );

  const examQuestions = (data.exam_questions || data.examQuestions || []).filter((q: any) => 
    q && isMeaningful(q.question)
  );
  const interviewQuestions = (data.interview_questions || data.interviewQuestions || []).filter((q: any) => 
    q && isMeaningful(q.question)
  );
  const hasPrepSection = examQuestions.length > 0 || interviewQuestions.length > 0;

  const rawTakeaways = data.key_takeaways || data.keyTakeaways || data.key_concepts || [];
  const takeaways = (Array.isArray(rawTakeaways) ? rawTakeaways : []).filter((t: any) => isMeaningful(t));
  const revisionNotes = data.revision_notes || data.revisionNotes;
  const hasRevisionSection = takeaways.length > 0 || isMeaningful(revisionNotes);

  const getTierContent = (tier: 'quick' | 'standard' | 'deep' | 'textbook') => {
    if (tier === 'quick') {
      const q = data.quickSummary || data.quick_summary;
      if (q && typeof q === 'string' && q.trim()) return q;
      if (takeaways.length > 0) {
        return `### ⚡ Quick Summary (Key Takeaways)\n\n${takeaways.map((t: string) => `- ${t}`).join('\n')}`;
      }
    }
    if (tier === 'standard') {
      const s = data.standardSummary || data.standard_summary || data.executive_summary || data.overview;
      if (s) {
        if (typeof s === 'string' && s.trim()) return s;
        if (Array.isArray(s)) {
          return s.map((sec: any) => `### ${sec.section_title || sec.title || 'Overview'}\n\n${sec.content || sec.summary || ''}`).join('\n\n');
        }
      }
    }
    if (tier === 'deep') {
      const d = data.deepNotes || data.deep_notes || data.deepSummary || data.deep_summary;
      if (d && typeof d === 'string' && d.trim()) return d;
      if (hasCheatSheet || (data.revision_tips && data.revision_tips.length > 0)) {
        let text = hasCheatSheet ? `### 🔍 Deep Insights & Cheat Sheet\n\n${rawCheatSheet}` : '';
        if (data.revision_tips && Array.isArray(data.revision_tips) && data.revision_tips.length > 0) {
          text += `\n\n### 💡 Key Context & Tips\n\n${data.revision_tips.map((t: string) => `- ${t}`).join('\n')}`;
        }
        return text;
      }
    }
    if (tier === 'textbook') {
      const tb = data.textbookNotes || data.textbook_notes || data.textbookSummary || data.textbook_summary;
      if (tb && typeof tb === 'string' && tb.trim()) return tb;
      
      let fullTextbook = '';
      if (data.objectives && Array.isArray(data.objectives) && data.objectives.length > 0) {
        fullTextbook += `### 🎯 Learning Objectives\n\n${data.objectives.map((o: string) => `1. ${o}`).join('\n')}\n\n`;
      }
      if (chapters.length > 0) {
        fullTextbook += `### 📖 Chapter Breakdown\n\n` + chapters.map((c: any) => `#### ${c.title || 'Chapter'}\n${c.summary || c.content || ''}`).join('\n\n') + '\n\n';
      }
      if (concepts.length > 0) {
        fullTextbook += `### 🧠 Core Concepts & Definitions\n\n` + concepts.map((c: any) => `**${c.term}:** ${c.definition}\n\n*${c.explanation || ''}*`).join('\n\n') + '\n\n';
      }
      if (fullTextbook.trim()) return fullTextbook;
    }

    const fallback = data.overview || data.executive_summary || data.standard_summary || "Summary content is being generated...";
    if (typeof fallback === 'string') return fallback;
    if (Array.isArray(fallback)) {
      return fallback.map((sec: any) => `### ${sec.section_title || sec.title || 'Section'}\n\n${sec.content || sec.summary || ''}`).join('\n\n');
    }
    return JSON.stringify(fallback, null, 2);
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

      {/* Multi-Tier Summary Section */}
      {hasSummary && (
        <section className="bg-background">
          {renderSectionHeader('executive_summary', 'Multi-Tier Summary', <FileText size={16} />)}
          {expandedSections['executive_summary'] && (
            <div className="mt-4 space-y-4">
              {/* 4-Tier Interactive Mode Switcher */}
              <div className="flex p-1 bg-surface-raised border border-border/50 rounded-xl overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setSummaryTier('quick')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-colors ${
                    summaryTier === 'quick' ? 'bg-indigo-500/15 text-indigo-400 shadow-sm' : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'
                  }`}
                >
                  <Clock size={14} /> Quick (30s)
                </button>
                <button
                  type="button"
                  onClick={() => setSummaryTier('standard')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-colors ${
                    summaryTier === 'standard' ? 'bg-blue-500/15 text-blue-400 shadow-sm' : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'
                  }`}
                >
                  <BookOpen size={14} /> Standard (5m)
                </button>
                <button
                  type="button"
                  onClick={() => setSummaryTier('deep')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-colors ${
                    summaryTier === 'deep' ? 'bg-purple-500/15 text-purple-400 shadow-sm' : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'
                  }`}
                >
                  <Layers size={14} /> Deep Notes (15m)
                </button>
                <button
                  type="button"
                  onClick={() => setSummaryTier('textbook')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-colors ${
                    summaryTier === 'textbook' ? 'bg-amber-500/15 text-amber-400 shadow-sm' : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'
                  }`}
                >
                  <Book size={14} /> Textbook
                </button>
              </div>

              {/* Tier Content Display */}
              <div className="bg-surface border border-border/50 rounded-xl p-6 shadow-sm">
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown>{getTierContent(summaryTier)}</ReactMarkdown>
                </div>
              </div>
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

      {/* Chapters */}
      {chapters.length > 0 && (
        <section className="bg-background">
          {renderSectionHeader('chapter_breakdown', 'Chapters', <Clock size={16} />)}
          {expandedSections['chapter_breakdown'] && (
            <div className="mt-4 flex flex-col gap-4 px-2 border-l border-border ml-2">
              {chapters.map((ch: any, i: number) => (
                <div key={i} className="relative pl-6">
                  <div className="absolute left-[-5px] top-1.5 w-2 h-2 rounded-full bg-[color:var(--accent)]" />
                  <div className="flex justify-between items-start gap-4">
                    <h4 className="font-medium text-foreground m-0">{ch.title || 'Section'}</h4>
                    {ch.timestamp_hint && (
                      <span className="text-xs font-mono text-[color:var(--accent)]/80 bg-[color:var(--accent)]/10 px-2 py-0.5 rounded">{ch.timestamp_hint}</span>
                    )}
                  </div>
                  {ch.summary && <p className="text-sm text-muted-foreground mt-1">{ch.summary}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Formulas */}
      {formulas.length > 0 && (
        <section className="bg-background">
          {renderSectionHeader('formula_sheet', 'Formula Sheet', <Activity size={16} />)}
          {expandedSections['formula_sheet'] && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 px-2">
              {formulas.map((f: any, i: number) => (
                <div key={i} className="bg-surface p-4 rounded-lg border border-border hover:border-[color:var(--accent)]/30 transition-colors">
                  <div className="font-mono text-[color:var(--accent)] bg-surface-raised p-3 rounded text-center text-lg mb-3 overflow-x-auto">
                    {f.formula}
                  </div>
                  {f.meaning && <h4 className="text-foreground font-medium mb-1">{f.meaning}</h4>}
                  <div className="text-xs text-muted-foreground space-y-1">
                    {f.variables && <p><strong>Variables:</strong> {f.variables}</p>}
                    {f.example && <p><strong>Example:</strong> {f.example}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Problems Solved */}
      {problems.length > 0 && (
        <section className="bg-background">
          {renderSectionHeader('problems_solved', 'Problems Solved', <CheckCircle size={16} />)}
          {expandedSections['problems_solved'] && (
            <div className="mt-4 flex flex-col gap-4 px-2">
              {problems.map((p: any, i: number) => (
                <div key={i} className="bg-surface p-5 rounded-lg border border-border">
                  <h4 className="text-foreground font-medium mb-3 pb-2 border-b border-border">Q: {p.question}</h4>
                  {p.step_by_step && (
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap mb-4">
                      <strong className="text-muted-foreground block mb-1">Step-by-step:</strong>
                      {p.step_by_step}
                    </div>
                  )}
                  {p.final_answer && (
                    <div className="flex flex-wrap gap-4 mt-4 bg-surface-hover p-3 rounded text-sm">
                      <div className="flex-1 min-w-[200px]">
                        <strong className="text-[color:var(--accent)] block mb-1">Final Answer:</strong>
                        <span className="text-foreground">{p.final_answer}</span>
                      </div>
                      {p.professors_explanation && (
                        <div className="flex-1 min-w-[200px]">
                          <strong className="text-muted-foreground block mb-1">Notes:</strong>
                          <span>{p.professors_explanation}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Code Snippets */}
      {codeList.length > 0 && (
        <section className="bg-background">
          {renderSectionHeader('code_explained', 'Code References', <Code size={16} />)}
          {expandedSections['code_explained'] && (
            <div className="mt-4 flex flex-col gap-4 px-2">
              {codeList.map((c: any, i: number) => (
                <div key={i} className="bg-surface overflow-hidden rounded-lg border border-border">
                  <div className="bg-surface-raised px-4 py-2 flex justify-between items-center border-b border-border">
                    <span className="text-sm font-medium text-foreground">{c.purpose || 'Snippet'}</span>
                    {c.language && (
                      <span className="text-xs text-[color:var(--accent)] bg-[color:var(--accent)]/10 px-2 py-1 rounded font-mono">
                        {c.language}
                      </span>
                    )}
                  </div>
                  {c.logic && (
                    <div className="p-4 bg-surface-hover overflow-x-auto">
                      <pre className="text-sm text-foreground font-mono m-0 whitespace-pre-wrap">{c.logic}</pre>
                    </div>
                  )}
                  <div className="p-4 text-sm text-muted-foreground grid grid-cols-1 md:grid-cols-2 gap-4">
                    {c.output && <div><strong className="text-muted-foreground">Output:</strong><br/>{c.output}</div>}
                    {c.complexity && <div><strong className="text-muted-foreground">Complexity:</strong><br/>{c.complexity}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Cheat Sheet */}
      {hasCheatSheet && (
        <section className="bg-background">
          {renderSectionHeader('cheat_sheet', 'Key Cheat Sheet', <Zap size={16} />)}
          {expandedSections['cheat_sheet'] && (
            <div className="mt-4 p-5 bg-surface/90 border border-[color:var(--accent)]/30 rounded-xl prose prose-sm prose-invert max-w-none">
              <ReactMarkdown>{rawCheatSheet}</ReactMarkdown>
            </div>
          )}
        </section>
      )}

      {/* Visual Explanations */}
      {visuals.length > 0 && (
        <section className="bg-background">
          {renderSectionHeader('visual_explanations', 'Visual & Diagram Breakdown', <Activity size={16} />)}
          {expandedSections['visual_explanations'] && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 px-2">
              {visuals.map((v: any, i: number) => (
                <div key={i} className="bg-surface p-4 rounded-lg border border-border">
                  {v.title && <h4 className="text-foreground font-medium mb-1">{v.title}</h4>}
                  {v.explanation && <p className="text-sm text-muted-foreground mb-3">{v.explanation}</p>}
                  {v.key_takeaway && (
                    <div className="text-xs bg-[color:var(--accent)]/10 text-[color:var(--accent)] p-2 rounded">
                      <strong>Takeaway:</strong> {v.key_takeaway}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Concepts & Definitions */}
      {concepts.length > 0 && (
        <section className="bg-background">
          {renderSectionHeader('concepts_and_definitions', 'Concepts & Definitions', <BookOpen size={16} />)}
          {expandedSections['concepts_and_definitions'] && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 px-2">
              {concepts.map((c: any, i: number) => (
                <div key={i} className="bg-surface p-4 rounded-lg border border-border">
                  <h4 className="text-[color:var(--accent)] font-semibold mb-1">{c.term}</h4>
                  <p className="text-sm text-foreground font-medium mb-2">{c.definition}</p>
                  {c.explanation && <p className="text-xs text-muted-foreground">{c.explanation}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Interview & Exam Preparation */}
      {hasPrepSection && (
        <section className="bg-background">
          {renderSectionHeader('exam_prep', 'Exam & Interview Prep', <CheckCircle size={16} />)}
          {expandedSections['exam_prep'] && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 px-2">
              {examQuestions.length > 0 && (
                <div className="bg-surface p-5 rounded-lg border border-border">
                  <h3 className="text-foreground font-medium mb-3 flex items-center gap-2">
                    <FileText size={16} className="text-primary" /> Exam Problems
                  </h3>
                  <div className="space-y-4">
                    {examQuestions.map((q: any, i: number) => (
                      <div key={i} className="border-b border-border/50 pb-3 last:border-0">
                        <p className="text-sm font-medium text-foreground mb-1">Q: {q.question}</p>
                        {q.solution && <p className="text-xs text-muted-foreground"><strong>Solution:</strong> {q.solution}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {interviewQuestions.length > 0 && (
                <div className="bg-surface p-5 rounded-lg border border-border">
                  <h3 className="text-foreground font-medium mb-3 flex items-center gap-2">
                    <BrainCircuit size={16} className="text-purple-400" /> Technical Interview Questions
                  </h3>
                  <div className="space-y-4">
                    {interviewQuestions.map((q: any, i: number) => (
                      <div key={i} className="border-b border-border/50 pb-3 last:border-0">
                        <p className="text-sm font-medium text-foreground mb-1">Q: {q.question}</p>
                        {q.expected_answer && <p className="text-xs text-muted-foreground"><strong>Answer:</strong> {q.expected_answer}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Key Takeaways & Revision */}
      {hasRevisionSection && (
        <section className="bg-background">
          {renderSectionHeader('revision', 'Revision & Takeaways', <BrainCircuit size={16} />)}
          {expandedSections['revision'] && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 px-2">
              {takeaways.length > 0 && (
                <div className="bg-surface p-5 rounded-lg border border-border">
                  <h3 className="text-[color:var(--accent)] font-medium mb-3 flex items-center gap-2">
                    <Zap size={16} /> Key Takeaways
                  </h3>
                  <ul className="space-y-2 text-sm text-foreground">
                    {takeaways.map((kc: string, i: number) => (
                      <li key={i} className="flex gap-2 items-start">
                        <span className="text-[color:var(--accent)] mt-1">•</span>
                        <span>{kc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {revisionNotes && isMeaningful(revisionNotes) && (
                <div className="bg-surface p-5 rounded-lg border border-border">
                  <h3 className="text-foreground font-medium mb-3">Quick Revision</h3>
                  <div className="prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown>{revisionNotes}</ReactMarkdown>
                  </div>
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
