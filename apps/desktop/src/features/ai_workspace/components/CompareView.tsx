import { useState, useEffect } from 'react';
import { TauriClient } from '@/infrastructure/tauri-client';
import { Loader2, GitCompare, CheckCircle2, XCircle, FileQuestion } from 'lucide-react';
import { cn } from '@/components';

interface ComparisonResult {
    commonTopics: string[];
    differences: string[];
    missingConcepts: string[];
}

interface CompareViewProps {
    lectureIds: string[];
    onClose: () => void;
}

export function CompareView({ lectureIds, onClose }: CompareViewProps) {
    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState<ComparisonResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (lectureIds.length < 2) {
            setError("Need at least 2 lectures to compare.");
            setLoading(false);
            return;
        }
        
        const runCompare = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await TauriClient.compareLectures(lectureIds);
                setResult(data as ComparisonResult);
            } catch (e: any) {
                console.error('Failed to compare lectures', e);
                setError(typeof e === 'string' ? e : e?.message || 'Failed to compare lectures.');
            } finally {
                setLoading(false);
            }
        };

        runCompare();
    }, [lectureIds]);

    return (
        <div className="flex-1 flex flex-col h-full bg-[var(--surface)] overflow-y-auto border-l border-[var(--border)]">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between sticky top-0 bg-[var(--surface)] z-10">
                <div className="flex items-center gap-2">
                    <GitCompare size={18} className="text-[var(--accent)]" />
                    <h3 className="font-medium text-[var(--text-primary)]">Lecture Comparison</h3>
                </div>
                <button
                    onClick={onClose}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                    Close
                </button>
            </div>

            <div className="p-6 flex-1">
                {loading && (
                    <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] space-y-4">
                        <Loader2 size={24} className="animate-spin text-[var(--accent)]" />
                        <p className="text-sm animate-pulse">Comparing {lectureIds.length} lectures...</p>
                    </div>
                )}

                {error && !loading && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
                        {error}
                    </div>
                )}

                {result && !loading && (
                    <div className="space-y-8 animate-in fade-in duration-500 max-w-3xl mx-auto">
                        <Section 
                            title="Common Topics" 
                            icon={<CheckCircle2 size={18} className="text-green-500" />}
                            items={result.commonTopics}
                            bgColor="bg-green-500/10"
                            borderColor="border-green-500/20"
                        />
                        <Section 
                            title="Key Differences" 
                            icon={<GitCompare size={18} className="text-blue-500" />}
                            items={result.differences}
                            bgColor="bg-blue-500/10"
                            borderColor="border-blue-500/20"
                        />
                        <Section 
                            title="Missing / Unexplained Concepts" 
                            icon={<XCircle size={18} className="text-orange-500" />}
                            items={result.missingConcepts}
                            bgColor="bg-orange-500/10"
                            borderColor="border-orange-500/20"
                            emptyMessage="No missing concepts detected."
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

function Section({ title, icon, items, bgColor, borderColor, emptyMessage = "None" }: { title: string, icon: React.ReactNode, items: string[], bgColor: string, borderColor: string, emptyMessage?: string }) {
    return (
        <div className="space-y-4">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                {icon}
                {title}
            </h4>
            {(!items || items.length === 0) ? (
                <div className="text-sm text-[var(--text-muted)] italic pl-7">{emptyMessage}</div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {items.map((item, i) => (
                        <div key={i} className={cn("p-4 rounded-xl border flex items-start gap-3", bgColor, borderColor)}>
                            <div className="mt-0.5"><FileQuestion size={14} className="text-[var(--text-muted)] opacity-50" /></div>
                            <span className="text-sm text-[var(--text-primary)] leading-relaxed">{item}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
