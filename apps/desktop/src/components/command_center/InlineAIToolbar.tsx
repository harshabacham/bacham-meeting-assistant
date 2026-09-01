import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, HelpCircle, Layers, Copy, Check, X } from 'lucide-react';
import { useAiCommandCenterStore } from '@/shared/stores/aiCommandCenterStore';

export function InlineAIToolbar() {
  const { inlineSelection, setInlineSelection, submitQuery } = useAiCommandCenterStore();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Only trigger if inside an ai-selectable area
      if (!target.closest('.ai-selectable')) {
        setInlineSelection(null);
        return;
      }
      
      // Don't trigger inside inputs, textareas, or if target is toolbar itself
      if (target.closest('input, textarea, [contenteditable="true"], .inline-ai-toolbar')) {
        return;
      }

      setTimeout(() => {
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed) {
          const selectedText = selection.toString().trim();
          if (selectedText.length >= 3) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            setInlineSelection({
              text: selectedText,
              x: Math.max(10, Math.min(window.innerWidth - 300, rect.left + rect.width / 2 - 120)),
              y: Math.max(10, rect.top - 48),
            });
            return;
          }
        }
        setInlineSelection(null);
      }, 50);
    };

    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [setInlineSelection]);

  if (!inlineSelection) return null;

  const handleAction = (promptPrefix: string, actionName: string) => {
    const selected = inlineSelection.text;
    submitQuery(`${promptPrefix} "${selected}"`, actionName);
    setInlineSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inlineSelection.text);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setInlineSelection(null);
    }, 1200);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 6 }}
        transition={{ duration: 0.15 }}
        style={{ left: `${inlineSelection.x}px`, top: `${inlineSelection.y}px` }}
        className="inline-ai-toolbar fixed z-50 flex items-center gap-1 p-1.5 rounded-xl bg-surface/95 backdrop-blur-xl border border-border/80 shadow-2xl text-xs text-foreground"
      >
        <button
          onClick={() => handleAction('Explain this concept clearly:', 'Explain Selection')}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-foreground text-[11px] font-semibold transition-colors"
          title="Explain Selected Text"
        >
          <Sparkles size={12} className="text-primary" />
          <span>Explain</span>
        </button>

        <button
          onClick={() => handleAction('Simplify and rewrite this snippet:', 'Simplify Selection')}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-foreground text-[11px] font-semibold transition-colors"
          title="Simplify Text"
        >
          <Zap size={12} className="text-amber-400" />
          <span>Simplify</span>
        </button>

        <button
          onClick={() => handleAction('Generate 3 practice flashcards from:', 'Create Flashcards')}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-foreground text-[11px] font-semibold transition-colors"
          title="Create Flashcards"
        >
          <Layers size={12} className="text-emerald-400" />
          <span>Flashcard</span>
        </button>

        <button
          onClick={() => handleAction('Quiz me on this concept:', 'Quiz Me')}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-foreground text-[11px] font-semibold transition-colors"
          title="Generate Quiz Question"
        >
          <HelpCircle size={12} className="text-sky-400" />
          <span>Quiz Me</span>
        </button>

        <div className="w-px h-3.5 bg-border/60 mx-0.5" />

        <button
          onClick={handleCopy}
          className="p-1 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors"
          title="Copy Text"
        >
          {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
        </button>

        <button
          onClick={() => setInlineSelection(null)}
          className="p-1 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors"
          title="Dismiss"
        >
          <X size={12} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
