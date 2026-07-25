import { LectureArtifact } from '@/infrastructure/tauri-client';
import { BrainCircuit, Clock, Code, List, FileText } from 'lucide-react';

interface ArtifactViewerProps {
    artifact: LectureArtifact | null;
    isLoading: boolean;
    error: string | null;
}

export function ArtifactViewer({ artifact, isLoading, error }: ArtifactViewerProps) {
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
                <BrainCircuit size={32} className="text-[var(--accent)] animate-pulse" />
                <div className="text-center">
                    <p className="text-sm font-medium text-[var(--text-primary)]">Generating Intelligence...</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">Analyzing lecture context</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-3 px-6 text-center">
                <div className="w-12 h-12 rounded-full bg-[rgba(255,77,77,0.1)] border border-[rgba(255,77,77,0.2)] flex items-center justify-center text-[var(--destructive)]">
                    !
                </div>
                <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">Failed to load artifact</p>
                    <p className="text-xs text-[var(--destructive)] mt-1">{error}</p>
                </div>
            </div>
        );
    }

    if (!artifact) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-3 opacity-60">
                <FileText size={32} className="text-[var(--text-muted)]" />
                <p className="text-sm text-[var(--text-muted)]">No artifact selected</p>
            </div>
        );
    }

    const renderContent = () => {
        try {
            if (artifact.artifactType === 'summary') {
                return (
                    <div className="prose prose-sm prose-invert max-w-none text-[var(--text-primary)] whitespace-pre-wrap">
                        {artifact.contentJson}
                    </div>
                );
            }

            // For JSON artifacts
            const data = JSON.parse(artifact.contentJson);
            
            return (
                <pre className="p-4 rounded-xl bg-[var(--overlay-02)] border border-[var(--border)] overflow-x-auto text-[12px] text-[var(--text-secondary)] font-mono leading-relaxed">
                    {JSON.stringify(data, null, 2)}
                </pre>
            );
        } catch (e) {
            return (
                <div className="whitespace-pre-wrap text-[13px] text-[var(--text-primary)]">
                    {artifact.contentJson}
                </div>
            );
        }
    };

    return (
        <div className="flex flex-col h-full bg-[var(--bg)]">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent)] border border-[var(--border-accent)]">
                        {getArtifactIcon(artifact.artifactType)}
                    </div>
                    <div>
                        <h3 className="text-[14px] font-semibold text-[var(--text-primary)] capitalize">
                            {artifact.artifactType.replace('_', ' ')}
                        </h3>
                        <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                            <Clock size={10} />
                            Generated {new Date(artifact.generatedAt).toLocaleString()}
                        </p>
                    </div>
                </div>
                <div className="px-2 py-1 rounded bg-[var(--overlay-06)] border border-[var(--border)] text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">
                    {artifact.modelUsed}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-[75ch] mx-auto">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}

function getArtifactIcon(type: string) {
    if (type.includes('code')) return <Code size={16} />;
    if (type.includes('list') || type.includes('outline')) return <List size={16} />;
    if (type === 'summary') return <FileText size={16} />;
    return <BrainCircuit size={16} />;
}
