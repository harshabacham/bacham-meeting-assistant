import { useState } from 'react';
import { TauriClient } from '@/infrastructure/tauri-client';
import { Loader2, Sparkles, BrainCircuit, RefreshCw } from 'lucide-react';

interface PatternConcept {
    name: string;
    description: string;
    occurrences: number;
    lectureIds: string[];
}

interface PatternResult {
    repeatedConcepts: PatternConcept[];
    repeatedFormulas: PatternConcept[];
    weakTopics: PatternConcept[];
}

export function PatternDetectionPanel({ scope }: { scope: any }) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<PatternResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleRunAnalysis = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await TauriClient.detectPatterns(scope);
            setResult(data as PatternResult);
        } catch (e: any) {
            console.error('Failed to detect patterns', e);
            setError(typeof e === 'string' ? e : e?.message || 'Failed to detect patterns.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[var(--surface)] overflow-y-auto border-l border-[var(--border)]">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between sticky top-0 bg-[var(--surface)] z-10">
                <div className="flex items-center gap-2">
                    <BrainCircuit size={18} className="text-[var(--accent)]" />
                    <h3 className="font-medium text-[var(--text-primary)]">Pattern Detection</h3>
                </div>
                {result && !loading && (
                    <button
                        onClick={handleRunAnalysis}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-highlight)] hover:text-[var(--text-primary)] transition-colors"
                        title="Re-run analysis"
                    >
                        <RefreshCw size={14} />
                    </button>
                )}
            </div>

            <div className="p-4 flex-1">
                {!result && !loading && !error && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
                            <Sparkles size={24} className="text-[var(--accent)]" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">Analyze this scope</p>
                            <p className="text-xs text-[var(--text-muted)] mt-1 max-w-[200px] mx-auto">
                                Discover recurring concepts, formulas, and identify weak topics across these lectures.
                            </p>
                        </div>
                        <button
                            onClick={handleRunAnalysis}
                            className="px-4 py-2 rounded-xl bg-[var(--accent)] text-foreground text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors shadow-sm"
                        >
                            Start Analysis
                        </button>
                    </div>
                )}

                {loading && (
                    <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] space-y-4">
                        <Loader2 size={24} className="animate-spin text-[var(--accent)]" />
                        <p className="text-sm animate-pulse">Analyzing context & discovering patterns...</p>
                    </div>
                )}

                {error && !loading && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
                        {error}
                        <button 
                            onClick={handleRunAnalysis}
                            className="block mt-2 underline opacity-80 hover:opacity-100"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {result && !loading && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <PatternSection 
                            title="Repeated Concepts" 
                            icon={<Sparkles size={16} className="text-purple-400" />}
                            items={result.repeatedConcepts} 
                        />
                        <PatternSection 
                            title="Recurring Formulas" 
                            icon={<Sparkles size={16} className="text-blue-400" />}
                            items={result.repeatedFormulas} 
                        />
                        <PatternSection 
                            title="Weak Topics (Needs Review)" 
                            icon={<Sparkles size={16} className="text-orange-400" />}
                            items={result.weakTopics} 
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

function PatternSection({ title, icon, items }: { title: string, icon: React.ReactNode, items: PatternConcept[] }) {
    if (!items || items.length === 0) return null;

    return (
        <div className="space-y-3">
            <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2">
                {icon}
                {title}
            </h4>
            <div className="space-y-2">
                {items.map((item, i) => (
                    <div key={i} className="p-3 bg-[var(--surface-highlight)] rounded-xl border border-[var(--border)]">
                        <div className="flex items-start justify-between gap-2">
                            <span className="font-medium text-sm text-[var(--text-primary)]">{item.name}</span>
                            <span className="text-[10px] bg-[var(--surface)] px-2 py-0.5 rounded-full text-[var(--text-muted)] border border-[var(--border)] shrink-0">
                                {item.occurrences} mentions
                            </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                            {item.description}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
