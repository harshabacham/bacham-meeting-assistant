import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Markdown as ReactMarkdown } from '@/components/ui/markdown';
import {
  Sparkles,
  Send,
  X,
  BookOpen,
  FileText,
  HelpCircle,
  Zap,
  Code,
  Sigma,
  PieChart,
  Lightbulb,
  Copy,
  Check,
  Layers,
  Brain,
  MessageSquare,
  History,
  CornerDownLeft,
} from 'lucide-react';
import { useAiCommandCenterStore, LearningContextType } from '@/shared/stores/aiCommandCenterStore';
import { cn } from '@/components';

interface SuggestionChip {
  id: string;
  label: string;
  icon: React.ElementType;
  prompt: string;
}

const CHIP_PRESETS: Record<LearningContextType, SuggestionChip[]> = {
  home: [
    { id: 'today_focus', label: "Today's Focus", icon: Zap, prompt: "What should I focus on studying today based on my recent activity?" },
    { id: 'revision_due', label: 'Revision Due', icon: Brain, prompt: 'Which lectures or topics are due for spaced repetition review?' },
    { id: 'study_plan', label: 'Generate Study Plan', icon: Lightbulb, prompt: 'Create a 3-day study plan for my upcoming lectures and notes.' },
  ],
  library: [
    { id: 'search_all', label: 'Search Knowledge', icon: Sparkles, prompt: 'Summarize the core topics across all my saved lectures.' },
    { id: 'key_themes', label: 'Extract Key Themes', icon: Layers, prompt: 'What are the main recurring themes across my courses?' },
    { id: 'exam_prep', label: 'Exam Overview', icon: HelpCircle, prompt: 'Generate exam preparation priorities from my library.' },
  ],
  lecture: [
    { id: 'deep_summary', label: 'Deep Summary', icon: FileText, prompt: 'Give me a structured deep summary of this lecture with key insights.' },
    { id: 'flashcards', label: 'Generate Flashcards', icon: Layers, prompt: 'Convert the main concepts from this lecture into flashcards.' },
    { id: 'generate_quiz', label: 'Generate Quiz', icon: HelpCircle, prompt: 'Create a 5-question multiple choice practice quiz from this lecture.' },
    { id: 'prof_insights', label: 'Professor Insights', icon: Lightbulb, prompt: 'Highlight the key points the professor emphasized most.' },
    { id: 'cheat_sheet', label: 'One-Page Cheat Sheet', icon: BookOpen, prompt: 'Format a single-page formula & concept cheat sheet for this lecture.' },
  ],
  notes: [
    { id: 'improve_notes', label: 'Improve Notes', icon: Sparkles, prompt: 'Enhance and structure these notes for better readability and clarity.' },
    { id: 'rewrite', label: 'Rewrite & Simplify', icon: Zap, prompt: 'Rewrite these notes in clear, easy-to-understand student language.' },
    { id: 'convert_cards', label: 'Convert to Flashcards', icon: Layers, prompt: 'Turn the core facts in these notes into Q&A flashcards.' },
    { id: 'gen_questions', label: 'Generate Practice Questions', icon: HelpCircle, prompt: 'Generate 3 conceptual exam questions based on these notes.' },
  ],
  code: [
    { id: 'explain_code', label: 'Explain Code', icon: Code, prompt: 'Explain how this code works step-by-step.' },
    { id: 'optimize', label: 'Optimize Algorithm', icon: Zap, prompt: 'How can this code be optimized for time and space complexity?' },
    { id: 'complexity', label: 'Analyze Complexity', icon: PieChart, prompt: 'What is the Big-O time and space complexity of this snippet?' },
    { id: 'debug', label: 'Debug & Edge Cases', icon: Lightbulb, prompt: 'Identify potential edge cases or bugs in this code.' },
  ],
  formula: [
    { id: 'derive', label: 'Derive Formula', icon: Sigma, prompt: 'Provide the step-by-step derivation of this formula.' },
    { id: 'variables', label: 'Explain Variables', icon: FileText, prompt: 'Break down each variable, unit, and physical meaning in this formula.' },
    { id: 'example', label: 'Worked Example', icon: Lightbulb, prompt: 'Show a practical worked problem using this formula.' },
  ],
  diagram: [
    { id: 'explain_graph', label: 'Interpret Diagram', icon: PieChart, prompt: 'Explain the architecture or flow shown in this diagram.' },
    { id: 'compare', label: 'Compare Concepts', icon: Layers, prompt: 'Compare the components in this diagram with standard alternatives.' },
  ],
  summary: [
    { id: 'expand', label: 'Expand Topic', icon: BookOpen, prompt: 'Expand on the most important section of this summary.' },
    { id: 'quiz_me', label: 'Quiz Me On This', icon: HelpCircle, prompt: 'Ask me 3 testing questions on this summary.' },
  ],
  quiz: [
    { id: 'explain_q', label: 'Explain Solution', icon: Lightbulb, prompt: 'Explain the reasoning behind the correct answer to this question.' },
    { id: 'similar_q', label: 'Generate Similar Question', icon: HelpCircle, prompt: 'Create another practice question testing the same concept.' },
  ],
  ai_workspace: [
    { id: 'workspace_guide', label: 'Study Companion Mode', icon: Sparkles, prompt: 'Help me synthesize insights across all my active subjects.' },
  ],
  settings: [
    { id: 'shortcut_help', label: 'Keyboard Shortcuts', icon: Zap, prompt: 'List all useful keyboard shortcuts in BACHAM.' },
  ],
};

export function FloatingCommandCenter() {
  const {
    context,
    isDockVisible,
    isDockExpanded,
    query,
    isAiStreaming,
    activeResponse,
    activeActionName,
    history,
    setQuery,
    setDockExpanded,
    submitQuery,
  } = useAiCommandCenterStore();

  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll response pane
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeResponse, isAiStreaming]);

  // Focus input when sidebar/panel expands
  useEffect(() => {
    if (isDockExpanded) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isDockExpanded]);

  // Listen for Esc key and Ctrl+J shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDockExpanded) {
        setDockExpanded(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setDockExpanded(!isDockExpanded);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDockExpanded, setDockExpanded]);

  if (!isDockVisible || !isDockExpanded) return null;

  const currentChips = CHIP_PRESETS[context.type] || CHIP_PRESETS.home;

  const getPlaceholder = (): string => {
    if (context.selectedText) return `Ask about: "${context.selectedText.substring(0, 20)}..."`;
    if (context.codeSnippet) return 'Ask about this code snippet...';
    if (context.formulaSnippet) return 'Ask about this formula...';

    switch (context.type) {
      case 'lecture':
        return `Ask about ${context.title || 'this lecture'}...`;
      case 'notes':
        return 'Improve or query these notes...';
      case 'summary':
        return 'Explain or expand this summary...';
      case 'code':
        return 'Explain or optimize this code...';
      case 'formula':
        return 'Derive or apply this formula...';
      case 'quiz':
        return 'Help me understand this question...';
      case 'library':
        return 'Search across my library...';
      default:
        return 'Ask AI Learning Companion...';
    }
  };

  const handleChipClick = (chip: SuggestionChip) => {
    submitQuery(chip.prompt, chip.label);
  };

  const handleCopyResponse = () => {
    if (activeResponse) {
      navigator.clipboard.writeText(activeResponse);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (query.trim() && !isAiStreaming) {
        submitQuery();
      }
    }
  };

  return (
    <AnimatePresence>
      {isDockExpanded && (
        <>
          {/* Backdrop Overlay for focus and smooth containment */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDockExpanded(false)}
            className="fixed inset-0 bg-background/40 backdrop-blur-sm z-40 pointer-events-auto"
          />

          {/* Premium AI Companion Right Sidebar Panel - Blended with application styling tokens */}
          <motion.div
            initial={{ x: '100%', opacity: 0.9 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.9 }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-[420px] max-w-[100vw] bg-surface/95 backdrop-blur-2xl border-l border-border shadow-2xl flex flex-col pointer-events-auto"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-border bg-surface-raised/40 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <Sparkles size={16} className={isAiStreaming ? "animate-pulse" : ""} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    AI Study Companion
                    <span className="text-[9px] font-mono text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded border border-border">
                      Ctrl+J
                    </span>
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary">
                      {context.type}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                      {context.title || 'Workspace Hub'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    import('@tauri-apps/api/core').then(({ invoke }) => {
                      invoke('simulate_live_meeting');
                    });
                  }}
                  className="px-2 py-1 rounded border border-primary/30 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider hover:bg-primary/20 transition-colors"
                  title="Simulate Live Coaching"
                >
                  Simulate Live
                </button>
                <button
                  onClick={() => setDockExpanded(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-all active:scale-95"
                  title="Close Companion"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Scrollable Content Container */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin scrollbar-thumb-border bg-background/20"
            >
              {activeResponse || isAiStreaming ? (
                /* Chat view */
                <div className="space-y-4">
                  {/* Active Context Header */}
                  <div className="p-3.5 rounded-xl border border-border bg-surface/50 text-[11px] text-muted-foreground space-y-1">
                    <div className="font-semibold text-foreground/80 flex items-center gap-1">
                      <MessageSquare size={12} className="text-primary" /> Active Thread Context
                    </div>
                    <div className="truncate opacity-90">{context.title || 'General Workspace'}</div>
                  </div>

                  {/* AI Response Card */}
                  <div className="bg-surface/30 border border-border rounded-2xl p-5 space-y-4 shadow-sm relative">
                    <div className="flex items-center justify-between border-b border-border/20 pb-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <Sparkles size={13} className="text-primary" />
                        <span>{activeActionName || 'Study Response'}</span>
                      </div>
                      <button
                        onClick={handleCopyResponse}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
                        title="Copy text"
                      >
                        {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                      </button>
                    </div>

                    {isAiStreaming && !activeResponse ? (
                      <div className="flex items-center justify-center py-10 gap-3 text-muted-foreground">
                        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        <span className="text-xs font-medium animate-pulse">Analyzing context...</span>
                      </div>
                    ) : (
                      <div className="prose prose-invert prose-xs max-w-none text-[12px] leading-relaxed text-foreground/90 markdown-container">
                        <ReactMarkdown>{activeResponse}</ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {/* Action row at bottom of content */}
                  {!isAiStreaming && activeResponse && (
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          submitQuery("Generate 3 practice flashcards from this answer.", "Generate Flashcards");
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/15 hover:border-primary/30 text-[10px] font-bold tracking-wide uppercase transition-all"
                      >
                        <Layers size={12} /> Convert to Cards
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Welcome / Suggested Prompts Grid */
                <div className="space-y-6 py-4 animate-in fade-in duration-200">
                  <div className="text-center space-y-1.5">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto shadow-inner">
                      <Brain size={20} className="animate-pulse" />
                    </div>
                    <h4 className="text-sm font-extrabold text-foreground">How can I assist your study?</h4>
                    <p className="text-[11px] text-muted-foreground max-w-[280px] mx-auto">
                      Choose an action below or ask any direct question about your study materials.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 px-1">
                      Suggested Actions
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {currentChips.map((chip) => {
                        const Icon = chip.icon;
                        return (
                          <button
                            key={chip.id}
                            onClick={() => handleChipClick(chip)}
                            className="flex items-center gap-3 p-3 rounded-xl bg-surface/50 border border-border hover:border-primary/35 hover:bg-surface-hover transition-all text-left group active:scale-[0.99]"
                          >
                            <div className="w-7 h-7 rounded-lg bg-background border border-border flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/20 transition-all shrink-0">
                              <Icon size={13} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[11.5px] font-bold text-foreground/90 group-hover:text-foreground">
                                {chip.label}
                              </div>
                              <div className="text-[9.5px] text-muted-foreground truncate opacity-75 mt-0.5">
                                {chip.prompt}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {history.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 px-1 flex items-center gap-1.5">
                        <History size={11} /> Recent Queries
                      </span>
                      <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-surface/20">
                        {history.slice(0, 3).map((h) => (
                          <button
                            key={h.id}
                            onClick={() => submitQuery(h.query, 'Previous Query')}
                            className="w-full flex items-center justify-between p-2.5 text-left text-[11px] text-muted-foreground hover:text-foreground hover:bg-surface/50 transition-colors"
                          >
                            <span className="truncate pr-4">{h.query}</span>
                            <span className="text-[9px] opacity-50 uppercase tracking-wide shrink-0">
                              {h.contextType}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Input Area */}
            <div className="p-4 border-t border-border bg-surface-raised/40 space-y-3 shrink-0">
              {/* Dynamic suggestion chips row right above input when chat is open */}
              {(activeResponse || isAiStreaming) && currentChips.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
                  {currentChips.map((chip) => (
                    <button
                      key={chip.id}
                      onClick={() => handleChipClick(chip)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface border border-border text-[10px] text-muted-foreground hover:text-foreground hover:border-primary/20 hover:bg-surface-hover transition-all whitespace-nowrap"
                    >
                      <span>{chip.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Input container */}
              <div className="relative bg-background/60 border border-border focus-within:border-primary/50 rounded-xl p-2 transition-all">
                <textarea
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={getPlaceholder()}
                  rows={2}
                  className="w-full bg-transparent resize-none text-[11.5px] text-foreground placeholder:text-muted-foreground/60 outline-none pr-10 pl-2 scrollbar-none"
                />

                <div className="flex items-center justify-between border-t border-border/20 pt-2 px-2 mt-1.5">
                  <span className="text-[9px] text-muted-foreground/50 flex items-center gap-1">
                    <CornerDownLeft size={10} /> Enter to send
                  </span>

                  <button
                    onClick={() => {
                      if (query.trim() && !isAiStreaming) submitQuery();
                    }}
                    disabled={!query.trim() || isAiStreaming}
                    className={cn(
                      "p-1.5 rounded-lg transition-all flex items-center justify-center shrink-0",
                      query.trim() && !isAiStreaming
                        ? "bg-primary text-primary-foreground hover:opacity-90 active:scale-95 shadow-sm"
                        : "bg-surface-raised text-muted-foreground/30 cursor-not-allowed"
                    )}
                  >
                    {isAiStreaming ? (
                      <div className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                      <Send size={12} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
