import { useState, RefObject } from "react";
import { BrainCircuit, Send, Sparkles, BookOpen, GraduationCap, Code2, Calculator } from 'lucide-react';
import { ParsedModelContent } from '../chat/ParsedModelContent';
import { cn } from "@/components";

interface AiChatTabProps {
  chatHistory: any[];
  prompt: string;
  setPrompt: (value: string) => void;
  isSendingChat: boolean;
  handleSendChat: (persona?: string) => void;
  chatScrollRef: RefObject<HTMLDivElement | null>;
}

const PERSONAS = [
  { id: 'general', label: 'General', icon: BrainCircuit },
  { id: 'beginner', label: 'Beginner', icon: BookOpen },
  { id: 'deep', label: 'Deep Study', icon: Sparkles },
  { id: 'exam_prep', label: 'Exam Prep', icon: GraduationCap },
  { id: 'interview_prep', label: 'Interview', icon: Code2 },
  { id: 'derivation', label: 'Derivation', icon: Calculator },
];

export function AiChatTab({ 
  chatHistory, 
  prompt, 
  setPrompt, 
  isSendingChat, 
  handleSendChat, 
  chatScrollRef 
}: AiChatTabProps) {
  const [selectedPersona, setSelectedPersona] = useState('general');

  return (
    <div className="flex flex-col h-full bg-background max-w-4xl mx-auto w-full">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4" ref={chatScrollRef}>
        {chatHistory.length === 0 ? (
          <div className="text-center py-12">
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
              <BrainCircuit className="h-6 w-6 text-primary" />
            </div>
            <h4 className="font-medium text-foreground mb-2 text-sm">How can I teach you today?</h4>
            <p className="text-xs text-muted-foreground px-4 max-w-md mx-auto leading-relaxed">
              Select a Teaching Mode persona below (Beginner, Deep Study, Exam Prep, Interview) to receive persona-adapted explanations grounded in your lecture.
            </p>
          </div>
        ) : (
          chatHistory.map((msg: any, i) => (
            <div key={i} className={cn('flex flex-col w-full max-w-3xl mx-auto', msg.role === 'user' ? 'items-end' : 'items-start')}>
              {msg.role === 'user' ? (
                <div className="px-4 py-3 bg-primary text-primary-foreground rounded-2xl rounded-br-sm max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap shadow-sm">
                  {msg.content}
                </div>
              ) : (
                <div className="w-full">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center">
                      <BrainCircuit size={11} className="text-primary" />
                    </div>
                    <span className="text-[11px] font-bold text-muted-foreground">BACHAM AI</span>
                    {msg.persona && (
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize">
                        {msg.persona}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-foreground leading-[1.8] prose prose-sm max-w-none prose-invert prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-code:text-primary prose-pre:bg-surface prose-blockquote:border-primary/40">
                    <ParsedModelContent
                      text={msg.content}
                      references={msg.references || []}
                      onReferenceClick={() => {}}
                    />
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        
        {!isSendingChat && chatHistory.length > 0 && chatHistory[chatHistory.length - 1]?.role === 'model' && chatHistory[chatHistory.length - 1]?.followups?.length ? (
          <div className="flex flex-wrap gap-2 mt-4 max-w-3xl mx-auto pl-7">
            {chatHistory[chatHistory.length - 1].followups!.map((f: string, fIdx: number) => (
              <button
                key={fIdx}
                onClick={() => {
                  setPrompt(f);
                  setTimeout(() => handleSendChat(selectedPersona), 50);
                }}
                className="text-xs px-3 py-2 rounded-xl bg-surface border border-border/50 text-foreground hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all text-left"
              >
                {f}
              </button>
            ))}
          </div>
        ) : null}
        {isSendingChat && (
          <div className="flex flex-col items-start">
            <div className="text-[10px] text-muted-foreground mb-1 px-2 uppercase tracking-wider font-semibold">Assistant</div>
            <div className="p-4 rounded-2xl bg-surface border border-border/30 rounded-tl-sm flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-6 border-t border-border/50 shrink-0 bg-[var(--glass-bg)] backdrop-blur-md">
        {/* Persona Selector Bar */}
        <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-hide max-w-4xl mx-auto">
          <span className="text-[11px] font-semibold text-muted-foreground mr-1 shrink-0">Teaching Mode:</span>
          {PERSONAS.map(p => {
            const Icon = p.icon;
            const isSelected = selectedPersona === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPersona(p.id)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all shrink-0 border",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-surface text-muted-foreground border-border/50 hover:text-foreground hover:bg-surface-hover"
                )}
              >
                <Icon size={12} />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>

        <div className="relative max-w-4xl mx-auto">
          <textarea 
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendChat(selectedPersona);
              }
            }}
            placeholder={`Ask about this lecture (${PERSONAS.find(p=>p.id===selectedPersona)?.label} mode)...`}
            className="w-full bg-surface border border-border/60 rounded-xl py-3 sm:py-4 pl-4 pr-12 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all duration-fast placeholder:text-muted-foreground"
            disabled={isSendingChat}
            rows={1}
            style={{ minHeight: '52px' }}
          />
          <button 
            onClick={() => handleSendChat(selectedPersona)}
            disabled={isSendingChat || !prompt.trim()}
            className="absolute right-2 sm:right-3 top-2 sm:top-2.5 h-9 w-9 bg-primary/10 text-primary rounded-lg flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all duration-fast disabled:opacity-50"
          >
            <Send size={14} />
          </button>
        </div>
        <div className="text-[10px] text-center text-muted-foreground mt-2 font-medium">
          Enter to send · Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}
