import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';

interface AiGlossaryPopoverProps {
  term: string;
  definition: string;
  children: React.ReactNode;
}

export function AiGlossaryPopover({ term, definition, children }: AiGlossaryPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span className="relative inline-block">
      <span
        onClick={() => setIsOpen(!isOpen)}
        className="underline decoration-primary/50 decoration-dashed underline-offset-4 cursor-pointer hover:text-primary transition-colors font-medium"
        title="Click for AI Glossary definition"
      >
        {children}
      </span>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 z-50 w-64 p-3 bg-surface border border-border/80 rounded-xl shadow-xl space-y-2 text-xs animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between font-bold text-foreground border-b border-border/40 pb-1.5">
            <span className="flex items-center gap-1.5 text-primary">
              <BookOpen size={12} /> {term}
            </span>
            <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground text-[10px]">✕</button>
          </div>
          <p className="text-muted-foreground leading-relaxed text-[11px]">{definition}</p>
        </div>
      )}
    </span>
  );
}
