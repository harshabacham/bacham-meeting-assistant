import { useState } from "react";
import { ListTree } from 'lucide-react';
import { TutorQuickActions } from '@/components/study/TutorQuickActions';
import { Markdown as ReactMarkdown } from '@/components/ui/markdown';

interface FormulaSheetTabProps {
  lectureId: string;
  formulas: any[];
}

function FormulaCard({ f, lectureId }: { f: any, lectureId: string }) {
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  return (
    <div className="bg-surface/30 rounded-2xl border border-border/50 p-6 flex flex-col justify-between hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5">
      <div>
        <div className="text-sm font-medium text-foreground mb-4">{f.name}</div>
        <div className="font-serif text-xl md:text-2xl text-primary text-center my-4 py-4 bg-[var(--glass-bg)] rounded-xl overflow-x-auto no-scrollbar">
          {f.formula}
        </div>
        <div className="text-sm text-muted-foreground mt-4 mb-4">{f.description}</div>
      </div>
      <div className="border-t border-border/50 pt-4 mt-auto">
        <TutorQuickActions 
          lectureId={lectureId}
          targetText={`Formula: ${f.name}\n${f.formula}\nDescription: ${f.description}`}
          onResult={(res) => setAiResponse(res)}
        />
        {aiResponse && (
          <div className="mt-4 p-4 rounded-xl bg-primary/10 border border-primary/20 prose prose-sm prose-invert max-w-none">
            <ReactMarkdown>{aiResponse}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

export function FormulaSheetTab({ lectureId, formulas }: FormulaSheetTabProps) {
  if (!formulas || formulas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground p-8">
        <div className="h-16 w-16 bg-surface/50 rounded-full flex items-center justify-center">
          <ListTree className="h-8 w-8 opacity-30" />
        </div>
        <div className="text-center">
          <p className="font-medium text-muted-foreground mb-1">No Formulas Detected</p>
          <p className="text-sm">Formulas extracted by AI will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h3 className="text-lg sm:text-xl font-semibold mb-6 text-primary flex items-center gap-2">
        <ListTree size={18}/> Formula Sheet
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
        {formulas.map((f, i) => (
          <FormulaCard key={i} f={f} lectureId={lectureId} />
        ))}
      </div>
    </div>
  );
}
