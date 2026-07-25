import { useState } from 'react';
import { X, BrainCircuit, Sparkles, Hash, FileText, BookOpen, PenTool, CheckSquare, Clock } from 'lucide-react';
import { Note } from '../NotesWorkspacePage';

interface NotesContextPanelProps {
    note: Note;
    onClose: () => void;
    onAddTag: (tag: string) => void;
    onRemoveTag: (tag: string) => void;
}

const AI_ACTIONS = [
    { icon: Sparkles,    label: 'Summarize Note',    description: 'Get a clean summary' },
    { icon: BrainCircuit, label: 'Generate Flashcards', description: 'Q&A cards for revision' },
    { icon: CheckSquare, label: 'Generate Quiz',     description: 'Test your understanding' },
    { icon: PenTool,     label: 'Improve Writing',   description: 'Fix grammar & clarity' },
    { icon: BookOpen,    label: 'Explain Simply',    description: 'Simplify for recall' },
    { icon: FileText,    label: 'Create Cheat Sheet',description: 'Compact one-page reference' },
];

export function NotesContextPanel({ note, onClose, onAddTag, onRemoveTag }: NotesContextPanelProps) {
    const [tagInput, setTagInput] = useState('');

    const handleAddTag = () => {
        const tag = tagInput.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        if (tag && !note.tags.includes(tag)) {
            onAddTag(tag);
            setTagInput('');
        }
    };

    const modifiedDate = new Date(note.updatedAt).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const createdDate = new Date(note.createdAt).toLocaleDateString(undefined, {
        weekday: 'short', month: 'short', day: 'numeric',
    });

    return (
        <div className="flex flex-col h-full w-[264px] bg-[var(--surface)]">

            {/* Header */}
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <FileText size={14} className="text-[var(--accent)]" />
                    <span className="text-xs font-bold text-[var(--text-primary)]">Note Info</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                >
                    <X size={14} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">

                {/* Dates */}
                <div className="px-4 py-3 border-b border-[var(--border)]/50 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 shrink-0">
                            <Clock size={11} className="text-[var(--text-muted)]" />
                            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Modified</span>
                        </div>
                        <span className="text-[11px] text-[var(--text-primary)] font-medium text-right">{modifiedDate}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 shrink-0">
                            <FileText size={11} className="text-[var(--text-muted)]" />
                            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Created</span>
                        </div>
                        <span className="text-[11px] text-[var(--text-primary)] font-medium text-right">{createdDate}</span>
                    </div>
                </div>

                {/* Tags */}
                <div className="px-4 py-3 border-b border-[var(--border)]/50">
                    <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Tags</div>
                    <div className="flex flex-wrap gap-1.5 mb-2 min-h-[20px]">
                        {note.tags.length === 0 && (
                            <span className="text-[11px] text-[var(--text-muted)]/50 italic">No tags yet</span>
                        )}
                        {note.tags.map(tag => (
                            <div
                                key={tag}
                                className="flex items-center gap-1 px-2 py-0.5 bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] rounded-full text-[10px] font-bold"
                            >
                                <Hash size={9} />{tag}
                                <button
                                    onClick={() => onRemoveTag(tag)}
                                    className="text-[var(--accent)]/50 hover:text-[var(--accent)] transition-colors ml-0.5 leading-none font-bold"
                                    title="Remove tag"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-1">
                        <input
                            type="text"
                            value={tagInput}
                            onChange={e => setTagInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleAddTag(); }}
                            placeholder="Add tag..."
                            className="flex-1 min-w-0 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-[11px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 focus:outline-none focus:border-[var(--border-accent)] transition-colors"
                        />
                        <button
                            type="button"
                            onClick={handleAddTag}
                            disabled={!tagInput.trim()}
                            className="px-2.5 py-1.5 bg-[var(--accent-dim)] hover:bg-[var(--accent)]/20 text-[var(--accent)] text-[11px] font-bold rounded-lg border border-[var(--border-accent)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            Add
                        </button>
                    </div>
                </div>

                {/* AI Actions */}
                <div className="px-4 py-3">
                    <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">AI Actions</div>
                    <div className="flex flex-col gap-1">
                        {AI_ACTIONS.map(({ icon: Icon, label, description }) => (
                            <button
                                key={label}
                                title={description}
                                className="flex items-center gap-2.5 px-3 py-2 bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--border-accent)] hover:bg-[var(--accent-dim)] rounded-xl text-left transition-all group"
                            >
                                <Icon size={13} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors shrink-0" />
                                <div className="min-w-0">
                                    <div className="text-[12px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">{label}</div>
                                    <div className="text-[10px] text-[var(--text-muted)] truncate">{description}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
