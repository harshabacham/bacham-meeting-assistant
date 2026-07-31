import React, { useState } from 'react';
import { Markdown as ReactMarkdown } from '@/components/ui/markdown';
import { ChevronDown, ChevronRight, BookOpen, Code, Zap, FileText, CheckCircle, Clock, Info, BrainCircuit, Activity, Target, Briefcase, Sparkles, Loader2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';

interface Props {
  data: any;
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

  return (
    <div className="flex flex-col bg-background/50 p-3 rounded border border-border/50 group hover:border-primary/30 transition-colors">
      <div className="flex justify-between items-start gap-2">
        <span className="text-sm text-foreground font-medium leading-relaxed">{item.task}</span>
        <button 
          onClick={handleExecute}
          disabled={isExecuting}
          className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors text-[10px] font-bold uppercase tracking-wider"
          title="Execute with AI"
        >
          {isExecuting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {isExecuting ? 'Thinking...' : 'Execute'}
        </button>
      </div>
      <div className="flex justify-between items-center mt-3 text-xs">
        <span className="text-muted-foreground bg-surface px-2 py-0.5 rounded border border-border/50">Owner: {item.owner || 'Unassigned'}</span>
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

      {/* Executive Summary */}
      {data.executive_summary && (
        <section className="bg-background">
          {renderSectionHeader('executive_summary', 'Executive Summary', <FileText size={16} />)}
          {expandedSections['executive_summary'] && (
            <div className="mt-4 px-2 prose prose-sm prose-invert max-w-none">
              {typeof data.executive_summary === 'string' ? (
                <ReactMarkdown>{data.executive_summary}</ReactMarkdown>
              ) : Array.isArray(data.executive_summary) ? (
                data.executive_summary.map((section: any, idx: number) => (
                  <div key={idx} className="mb-6">
                    {section.section_title && <h3 className="text-foreground text-lg font-semibold mt-0 mb-2">{section.section_title}</h3>}
                    <ReactMarkdown>{section.content}</ReactMarkdown>
                  </div>
                ))
              ) : null}
            </div>
          )}
        </section>
      )}

      {/* CRM Metadata */}
      {data.crm_metadata && (
        <section className="bg-background">
          {renderSectionHeader('crm', 'Auto-CRM & Follow-ups', <Briefcase size={16} />)}
          {expandedSections['crm'] && (
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6 px-2">
              
              {/* BANT Framework */}
              {data.crm_metadata.bant && (
                <div className="bg-surface p-5 rounded-lg border border-border shadow-sm">
                  <h3 className="text-foreground font-medium mb-4 flex items-center gap-2">
                    <Target size={16} className="text-primary" /> BANT Qualification
                  </h3>
                  <div className="space-y-3">
                    <div className="flex flex-col border-b border-border/50 pb-2">
                      <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Budget</span>
                      <span className="text-sm text-foreground mt-1">{data.crm_metadata.bant.budget || 'Not identified'}</span>
                    </div>
                    <div className="flex flex-col border-b border-border/50 pb-2">
                      <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Authority</span>
                      <span className="text-sm text-foreground mt-1">{data.crm_metadata.bant.authority || 'Not identified'}</span>
                    </div>
                    <div className="flex flex-col border-b border-border/50 pb-2">
                      <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Need</span>
                      <span className="text-sm text-foreground mt-1">{data.crm_metadata.bant.need || 'Not identified'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Timeline</span>
                      <span className="text-sm text-foreground mt-1">{data.crm_metadata.bant.timeline || 'Not identified'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Items & Decisions */}
              <div className="flex flex-col gap-4">
                {data.crm_metadata.action_items && data.crm_metadata.action_items.length > 0 && (
                  <div className="bg-surface p-5 rounded-lg border border-border shadow-sm flex-1">
                    <h3 className="text-foreground font-medium mb-3 flex items-center gap-2">
                      <CheckCircle size={16} className="text-[color:var(--accent)]" /> Action Items
                    </h3>
                    <div className="space-y-3">
                      {data.crm_metadata.action_items.map((item: any, i: number) => (
                        <ActionItemCard key={i} item={item} context={data.executive_summary} />
                      ))}
                    </div>
                  </div>
                )}
                
                {data.crm_metadata.key_decisions && data.crm_metadata.key_decisions.length > 0 && (
                  <div className="bg-surface p-5 rounded-lg border border-border shadow-sm">
                    <h3 className="text-foreground font-medium mb-3 flex items-center gap-2">
                      <Zap size={16} className="text-yellow-400" /> Key Decisions
                    </h3>
                    <ul className="space-y-2">
                      {data.crm_metadata.key_decisions.map((decision: string, i: number) => (
                        <li key={i} className="text-sm text-foreground flex items-start gap-2">
                          <span className="text-[color:var(--accent)] mt-0.5">•</span>
                          {decision}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Chapters */}
      {data.chapter_breakdown && data.chapter_breakdown.length > 0 && (
        <section className="bg-background">
          {renderSectionHeader('chapter_breakdown', 'Chapters', <Clock size={16} />)}
          {expandedSections['chapter_breakdown'] && (
            <div className="mt-4 flex flex-col gap-4 px-2 border-l border-border ml-2">
              {data.chapter_breakdown.map((ch: any, i: number) => (
                <div key={i} className="relative pl-6">
                  <div className="absolute left-[-5px] top-1.5 w-2 h-2 rounded-full bg-[color:var(--accent)]" />
                  <div className="flex justify-between items-start gap-4">
                    <h4 className="font-medium text-foreground m-0">{ch.title}</h4>
                    <span className="text-xs font-mono text-[color:var(--accent)]/80 bg-[color:var(--accent)]/10 px-2 py-0.5 rounded">{ch.timestamp_hint}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{ch.summary}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Formulas */}
      {data.formula_sheet && data.formula_sheet.length > 0 && (
        <section className="bg-background">
          {renderSectionHeader('formula_sheet', 'Formula Sheet', <Activity size={16} />)}
          {expandedSections['formula_sheet'] && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 px-2">
              {data.formula_sheet.map((f: any, i: number) => (
                <div key={i} className="bg-surface p-4 rounded-lg border border-border hover:border-[color:var(--accent)]/30 transition-colors">
                  <div className="font-mono text-[color:var(--accent)] bg-[var(--glass-bg)] p-3 rounded text-center text-lg mb-3 overflow-x-auto">
                    {f.formula}
                  </div>
                  <h4 className="text-foreground font-medium mb-1">{f.meaning}</h4>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><strong>Variables:</strong> {f.variables}</p>
                    <p><strong>Example:</strong> {f.example}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Problems Solved */}
      {data.problems_solved && data.problems_solved.length > 0 && (
        <section className="bg-background">
          {renderSectionHeader('problems_solved', 'Problems Solved', <CheckCircle size={16} />)}
          {expandedSections['problems_solved'] && (
            <div className="mt-4 flex flex-col gap-4 px-2">
              {data.problems_solved.map((p: any, i: number) => (
                <div key={i} className="bg-surface p-5 rounded-lg border border-border">
                  <h4 className="text-foreground font-medium mb-3 pb-2 border-b border-border">Q: {p.question}</h4>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap mb-4">
                    <strong className="text-muted-foreground block mb-1">Step-by-step:</strong>
                    {p.step_by_step}
                  </div>
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
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Code Snippets */}
      {data.code_explained && data.code_explained.length > 0 && (
        <section className="bg-background">
          {renderSectionHeader('code_explained', 'Code References', <Code size={16} />)}
          {expandedSections['code_explained'] && (
            <div className="mt-4 flex flex-col gap-4 px-2">
              {data.code_explained.map((c: any, i: number) => (
                <div key={i} className="bg-surface overflow-hidden rounded-lg border border-border">
                  <div className="bg-[var(--glass-bg)] px-4 py-2 flex justify-between items-center border-b border-border">
                    <span className="text-sm font-medium text-foreground">{c.purpose}</span>
                    <span className="text-xs text-[color:var(--accent)] bg-[color:var(--accent)]/10 px-2 py-1 rounded font-mono">
                      {c.language}
                    </span>
                  </div>
                  <div className="p-4 bg-surface-hover overflow-x-auto">
                    <pre className="text-sm text-foreground font-mono m-0 whitespace-pre-wrap">{c.logic}</pre>
                  </div>
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

      {/* Cheat Sheet & Cheat Notes */}
      {data.cheat_sheet && (
        <section className="bg-background">
          {renderSectionHeader('cheat_sheet', 'Pre-Exam Cheat Sheet', <Zap size={16} />)}
          {expandedSections['cheat_sheet'] && (
            <div className="mt-4 p-5 bg-surface/90 border border-[color:var(--accent)]/30 rounded-xl prose prose-sm prose-invert max-w-none">
              <ReactMarkdown>{data.cheat_sheet}</ReactMarkdown>
            </div>
          )}
        </section>
      )}

      {/* Visual Explanations */}
      {data.visual_explanations && data.visual_explanations.length > 0 && (
        <section className="bg-background">
          {renderSectionHeader('visual_explanations', 'Visual & Diagram Breakdown', <Activity size={16} />)}
          {expandedSections['visual_explanations'] && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 px-2">
              {data.visual_explanations.map((v: any, i: number) => (
                <div key={i} className="bg-surface p-4 rounded-lg border border-border">
                  <h4 className="text-foreground font-medium mb-1">{v.title}</h4>
                  <p className="text-sm text-muted-foreground mb-3">{v.explanation}</p>
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
      {data.concepts_and_definitions && data.concepts_and_definitions.length > 0 && (
        <section className="bg-background">
          {renderSectionHeader('concepts_and_definitions', 'Concepts & Definitions', <BookOpen size={16} />)}
          {expandedSections['concepts_and_definitions'] && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 px-2">
              {data.concepts_and_definitions.map((c: any, i: number) => (
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
      {(data.interview_questions || data.exam_questions) && (
        <section className="bg-background">
          {renderSectionHeader('exam_prep', 'Exam & Interview Prep', <CheckCircle size={16} />)}
          {expandedSections['exam_prep'] && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 px-2">
              {data.exam_questions && (
                <div className="bg-surface p-5 rounded-lg border border-border">
                  <h3 className="text-foreground font-medium mb-3 flex items-center gap-2">
                    <FileText size={16} className="text-primary" /> Exam Problems
                  </h3>
                  <div className="space-y-4">
                    {data.exam_questions.map((q: any, i: number) => (
                      <div key={i} className="border-b border-border/50 pb-3 last:border-0">
                        <p className="text-sm font-medium text-foreground mb-1">Q: {q.question}</p>
                        <p className="text-xs text-muted-foreground"><strong>Solution:</strong> {q.solution}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {data.interview_questions && (
                <div className="bg-surface p-5 rounded-lg border border-border">
                  <h3 className="text-foreground font-medium mb-3 flex items-center gap-2">
                    <BrainCircuit size={16} className="text-purple-400" /> Technical Interview Questions
                  </h3>
                  <div className="space-y-4">
                    {data.interview_questions.map((q: any, i: number) => (
                      <div key={i} className="border-b border-border/50 pb-3 last:border-0">
                        <p className="text-sm font-medium text-foreground mb-1">Q: {q.question}</p>
                        <p className="text-xs text-muted-foreground"><strong>Answer:</strong> {q.expected_answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Key Concepts & Revision */}
      {(data.key_concepts || data.revision_notes || data.key_takeaways) && (
        <section className="bg-background">
          {renderSectionHeader('revision', 'Revision & Takeaways', <BrainCircuit size={16} />)}
          {expandedSections['revision'] && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 px-2">
              {(data.key_concepts || data.key_takeaways) && (
                <div className="bg-surface p-5 rounded-lg border border-border">
                  <h3 className="text-[color:var(--accent)] font-medium mb-3 flex items-center gap-2">
                    <Zap size={16} /> Key Takeaways
                  </h3>
                  <ul className="space-y-2 text-sm text-foreground">
                    {(data.key_takeaways || data.key_concepts).map((kc: string, i: number) => (
                      <li key={i} className="flex gap-2 items-start">
                        <span className="text-[color:var(--accent)] mt-1">•</span>
                        <span>{kc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data.revision_notes && (
                <div className="bg-surface p-5 rounded-lg border border-border">
                  <h3 className="text-foreground font-medium mb-3">Quick Revision</h3>
                  <div className="prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown>{data.revision_notes}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Raw Notes Fallback */}
      {data.detailed_notes && (
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
