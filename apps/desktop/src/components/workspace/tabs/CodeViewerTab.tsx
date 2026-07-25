import { useState } from "react";
import { Zap } from 'lucide-react';
import { TutorQuickActions } from '@/components/study/TutorQuickActions';
import { Markdown as ReactMarkdown } from '@/components/ui/markdown';

interface CodeViewerTabProps {
  lectureId: string;
  codeBlocks: any[];
}

function CodeBlockCard({ cb, lectureId }: { cb: any, lectureId: string }) {
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  return (
    <div className="bg-surface/30 rounded-2xl border border-border/50 overflow-hidden hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5">
      <div className="bg-[var(--glass-bg)] px-4 py-3 border-b border-border/50 text-sm font-mono flex items-center justify-between">
        <span className="text-foreground">{cb.title}</span>
        <span className="text-primary/70 bg-primary/10 px-2 py-0.5 rounded text-xs">{cb.language}</span>
      </div>
      <pre className="p-5 text-sm overflow-x-auto m-0 bg-background">
        <code className={`language-${cb.language} text-foreground font-mono`}>{cb.code}</code>
      </pre>
      {cb.explanation && (
        <div className="p-4 bg-primary/5 text-sm border-t border-border/50 text-foreground">
          <span className="font-medium text-primary mr-2">Explanation:</span>
          {cb.explanation}
        </div>
      )}
      <div className="p-4 border-t border-border/50">
        <TutorQuickActions 
          lectureId={lectureId}
          targetText={`Code snippet: ${cb.title}\n\n\`\`\`${cb.language}\n${cb.code}\n\`\`\``}
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

export function CodeViewerTab({ lectureId, codeBlocks }: CodeViewerTabProps) {
  if (!codeBlocks || codeBlocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground p-8">
        <div className="h-16 w-16 bg-surface/50 rounded-full flex items-center justify-center">
          <Zap className="h-8 w-8 opacity-30" />
        </div>
        <div className="text-center">
          <p className="font-medium text-muted-foreground mb-1">No Code Snippets Detected</p>
          <p className="text-sm">Important code sections extracted by AI will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <h3 className="text-lg sm:text-xl font-semibold mb-6 text-primary flex items-center gap-2">
        <Zap size={18}/> Code Snippets
      </h3>
      {codeBlocks.map((cb, i) => (
        <CodeBlockCard key={i} cb={cb} lectureId={lectureId} />
      ))}
    </div>
  );
}
