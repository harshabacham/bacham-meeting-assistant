import { useState, useEffect } from 'react';
import { Download, Copy, Sparkles, Check } from 'lucide-react';
import { TauriClient } from '@/infrastructure/tauri-client';

interface OnePageCheatSheetProps {
  lectureId: string;
}

export function OnePageCheatSheet({ lectureId }: OnePageCheatSheetProps) {
  const [data, setData] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    TauriClient.generateOnePageCheatSheet(lectureId).then(setData).catch(console.error);
  }, [lectureId]);

  if (!data) return <div className="p-4 text-xs text-muted-foreground animate-pulse">Generating 1-Page Master Cheat Sheet...</div>;

  const handleCopyMarkdown = () => {
    const md = `# ${data.title}\n\n## Key Definitions\n${data.keyDefinitions.map((d: string) => `- ${d}`).join('\n')}\n\n## Essential Formulas\n${data.essentialFormulas.map((f: string) => `- ${f}`).join('\n')}\n\n## Common Mistakes\n${data.commonMistakes.map((m: string) => `- ${m}`).join('\n')}`;
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-surface border border-border/70 rounded-2xl p-6 space-y-5 print:p-0 print:border-none">
      <div className="flex items-center justify-between border-b border-border/40 pb-3 print:hidden">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-primary" />
          <h3 className="text-sm font-bold text-foreground">1-Page Exam Cheat Sheet</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-raised border border-border/60 text-xs font-semibold text-foreground hover:bg-surface-hover transition-colors"
          >
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy Markdown'}</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <Download size={12} />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      <div className="space-y-4 text-xs">
        <h1 className="text-base font-bold text-foreground tracking-tight">{data.title}</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-surface-raised/40 rounded-xl border border-border/40 space-y-2">
            <h4 className="font-bold text-primary text-[11px] uppercase tracking-wider">Key Definitions</h4>
            <ul className="space-y-1.5 list-disc list-inside text-muted-foreground">
              {data.keyDefinitions.map((def: string, i: number) => (
                <li key={i}>{def}</li>
              ))}
            </ul>
          </div>

          <div className="p-3 bg-surface-raised/40 rounded-xl border border-border/40 space-y-2">
            <h4 className="font-bold text-blue-400 text-[11px] uppercase tracking-wider">Essential Formulas</h4>
            <ul className="space-y-1.5 list-disc list-inside text-muted-foreground font-mono text-[11px]">
              {data.essentialFormulas.map((form: string, i: number) => (
                <li key={i}>{form}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="p-3 bg-destructive/5 rounded-xl border border-destructive/20 space-y-2">
          <h4 className="font-bold text-destructive text-[11px] uppercase tracking-wider">Common Mistakes to Avoid</h4>
          <ul className="space-y-1.5 list-disc list-inside text-muted-foreground">
            {data.commonMistakes.map((m: string, i: number) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
