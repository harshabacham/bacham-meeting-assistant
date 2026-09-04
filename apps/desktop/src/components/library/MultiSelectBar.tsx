import React from 'react';
import { Trash2, RotateCcw, Archive, FolderInput, Download, X } from 'lucide-react';

interface MultiSelectBarProps {
    selectedCount: number;
    onDelete: () => void;
    onHardDelete?: () => void;
    onRestore?: () => void;
    onArchive?: () => void;
    onMoveToFolder?: (e: React.MouseEvent) => void;
    onExport?: () => void;
    onClear: () => void;
    mode?: 'library' | 'trash';
    confirmHardDelete?: boolean;
}

export function MultiSelectBar({
    selectedCount,
    onDelete,
    onHardDelete,
    onRestore,
    onArchive,
    onMoveToFolder,
    onExport,
    onClear,
    mode = 'library',
    confirmHardDelete = false,
}: MultiSelectBarProps) {
    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 p-1.5 pl-3.5 bg-[var(--surface)]/95 backdrop-blur-xl border border-[var(--border)] rounded-2xl shadow-2xl text-[var(--text-primary)] animate-in fade-in slide-in-from-bottom-4 duration-200 select-none">
            {/* Count */}
            <div className="flex items-center gap-2 pr-3 border-r border-[var(--border)] shrink-0">
                <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-md bg-[var(--text-primary)] text-[var(--bg)] font-bold text-xs shadow-2xs">
                    {selectedCount}
                </span>
                <span className="text-xs text-[var(--text-muted)] font-medium">
                    selected
                </span>
            </div>

            {/* Actions */}
            {mode === 'trash' ? (
                <>
                    <button
                        type="button"
                        onClick={onRestore}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                    >
                        <RotateCcw size={14} />
                        <span>Restore</span>
                    </button>
                    <button
                        type="button"
                        onClick={onHardDelete || onDelete}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                    >
                        <Trash2 size={14} />
                        <span>{confirmHardDelete ? 'Confirm Delete' : 'Delete forever'}</span>
                    </button>
                </>
            ) : (
                <>
                    {onMoveToFolder && (
                        <button
                            type="button"
                            onClick={onMoveToFolder}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                        >
                            <FolderInput size={14} className="text-primary" />
                            <span>Move to folder</span>
                        </button>
                    )}
                    {onExport && (
                        <button
                            type="button"
                            onClick={onExport}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                        >
                            <Download size={14} className="text-primary" />
                            <span>Export</span>
                        </button>
                    )}
                    {onArchive && (
                        <button
                            type="button"
                            onClick={onArchive}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                        >
                            <Archive size={14} />
                            <span>Archive</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onDelete}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                    >
                        <Trash2 size={14} />
                        <span>Move to trash</span>
                    </button>
                </>
            )}

            {/* Clear selection */}
            <div className="pl-1.5 border-l border-[var(--border)] shrink-0">
                <button
                    type="button"
                    onClick={onClear}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                    title="Deselect all"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
}
