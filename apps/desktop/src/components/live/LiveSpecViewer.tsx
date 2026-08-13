import { useState } from 'react';
import { FileText, RefreshCw, Loader2 } from 'lucide-react';
import { TauriClient } from '@/infrastructure/tauri-client';
import { useToast } from '@/components/ui/ToastProvider';
import { Markdown as ReactMarkdown } from '@/components/ui/markdown';

export function LiveSpecViewer() {
  const [spec, setSpec] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { showToast } = useToast();

  const generateSpec = async () => {
    setIsGenerating(true);
    try {
      const prompt = `Review the live meeting transcript and screenshots captured SO FAR. Generate a "Live Spec" or "Living Document" summarizing the product direction, features, or core topics discussed up to this point. Format as clean, professional Markdown. Do not include introductory conversational text.`;
      
      const res = await TauriClient.sendGlobalMemoryChat(prompt);
      setSpec(res);
      showToast('Live Draft Spec generated successfully', 'success');
    } catch (e: any) {
      console.error(e);
      showToast(`Failed to generate spec: ${e.message || e}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm h-full">
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--surface)]/50 shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[var(--text-secondary)]" />
          <h2 className="text-sm font-semibold tracking-wide text-[var(--text-primary)]">Live Draft Spec</h2>
        </div>
        <button 
          onClick={generateSpec}
          disabled={isGenerating}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 disabled:opacity-50 transition-colors text-xs font-bold tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Generate Draft
        </button>
      </div>
      <div className="p-4 flex-1 overflow-y-auto">
        {!spec ? (
          <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] p-6 text-center space-y-3">
            <FileText className="w-8 h-8 opacity-20" />
            <p className="text-sm">No spec generated yet. Click Generate Draft to build a living document from the meeting so far.</p>
          </div>
        ) : (
          <div className="prose prose-sm prose-invert max-w-none text-[var(--text-primary)]">
            <ReactMarkdown>{spec}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
