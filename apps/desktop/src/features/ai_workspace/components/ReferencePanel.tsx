import { X, Play, FileText, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';
import { MessageReference } from '../types';
import { useNavigate } from 'react-router-dom';

interface ReferencePanelProps {
    reference: MessageReference;
    onClose: () => void;
}

export function ReferencePanel({ reference, onClose }: ReferencePanelProps) {
    const navigate = useNavigate();

    const handleJumpToVideo = () => {
        if (reference.lectureId && reference.timestampSeconds !== undefined) {
            navigate(`/lectures/${reference.lectureId}?t=${reference.timestampSeconds}`);
        }
    };

    const getIcon = () => {
        switch (reference.refType) {
            case 'transcript': return <Play size={18} className="text-[var(--accent)]" />;
            case 'screenshot': return <ImageIcon size={18} className="text-[var(--accent)]" />;
            case 'note': return <FileText size={18} className="text-[var(--accent)]" />;
            default: return <LinkIcon size={18} className="text-[var(--accent)]" />;
        }
    };

    const getTitle = () => {
        switch (reference.refType) {
            case 'transcript': return 'Transcript Reference';
            case 'screenshot': return 'Screenshot Reference';
            case 'note': return 'Note Reference';
            default: return 'Source Reference';
        }
    };

    return (
        <div className="w-[320px] shrink-0 border-l border-[var(--border)] bg-[var(--surface-raised)] flex flex-col h-full animate-in slide-in-from-right-8 duration-200">
            {/* Header */}
            <div className="h-14 border-b border-[var(--border)] px-4 flex items-center justify-between bg-[var(--overlay-02)] shrink-0">
                <div className="flex items-center gap-2 text-[var(--text-primary)] font-medium text-sm">
                    {getIcon()}
                    {getTitle()}
                </div>
                <button 
                    onClick={onClose}
                    className="p-1.5 rounded-md hover:bg-[var(--surface-highlight)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {reference.refType === 'transcript' && (
                    <div className="flex flex-col gap-3">
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 text-sm text-[var(--text-secondary)] leading-relaxed italic">
                            "{reference.excerpt}"
                        </div>
                        <button 
                            onClick={handleJumpToVideo}
                            className="flex items-center justify-center gap-2 w-full py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-foreground rounded-lg text-sm font-medium transition-colors shadow-sm"
                        >
                            <Play size={14} />
                            Jump to Video ({formatTime(reference.timestampSeconds || 0)})
                        </button>
                    </div>
                )}

                {reference.refType === 'screenshot' && (
                    <div className="flex flex-col gap-3">
                        {/* We would load the actual image here, but for now we just show placeholder if no path, or the excerpt if it contains the path. */}
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 aspect-video flex items-center justify-center text-[var(--text-muted)]">
                            <ImageIcon size={32} className="opacity-50" />
                        </div>
                        <p className="text-xs text-[var(--text-muted)] text-center">Screenshot captured from video</p>
                        {reference.excerpt && (
                            <p className="text-sm text-[var(--text-secondary)]">{reference.excerpt}</p>
                        )}
                    </div>
                )}

                {reference.refType === 'note' && (
                    <div className="flex flex-col gap-3">
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 text-sm text-[var(--text-secondary)] leading-relaxed">
                            {reference.excerpt}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}
