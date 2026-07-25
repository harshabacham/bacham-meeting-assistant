import { Trash2, RotateCcw, Copy, Merge, Archive } from 'lucide-react';

interface MultiSelectBarProps {
    selectedCount: number;
    onDelete: () => void;
    onHardDelete?: () => void;
    onRestore?: () => void;
    onDuplicate?: () => void;
    onMerge?: () => void;
    onArchive?: () => void;
    onMoveToFolder?: (e: React.MouseEvent) => void;
    onClear: () => void;
    mode?: 'library' | 'trash';
}

export function MultiSelectBar({
    selectedCount,
    onDelete,
    onHardDelete,
    onRestore,
    onDuplicate,
    onMerge,
    onArchive,
    onMoveToFolder,
    onClear,
    mode = 'library',
}: MultiSelectBarProps) {
    if (selectedCount === 0) return null;

    return (
        <div className="floating-bar">
            {/* Count */}
            <div className="flex items-center gap-2 pr-3 border-r" style={{ borderColor: 'var(--overlay-10)' }}>
                <span
                    className="flex items-center justify-center rounded-lg font-bold"
                    style={{
                        width: 26, height: 26,
                        background: 'var(--accent)',
                        color: 'var(--color-black)',
                        fontSize: 13,
                    }}
                >
                    {selectedCount}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    selected
                </span>
            </div>

            {/* Actions */}
            {mode === 'trash' ? (
                <>
                    <button
                        onClick={onRestore}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
                        style={{ fontSize: 13, color: '#4DFF91', background: 'rgba(77,255,145,0.1)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(77,255,145,0.2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(77,255,145,0.1)')}
                    >
                        <RotateCcw size={14} />
                        Restore
                    </button>
                    <button
                        onClick={onHardDelete || onDelete}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
                        style={{ fontSize: 13, color: 'var(--destructive)', background: 'rgba(255,77,77,0.1)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,77,77,0.2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,77,77,0.1)')}
                    >
                        <Trash2 size={14} />
                        Delete permanently
                    </button>
                </>
            ) : (
                <>
                    {onDuplicate && selectedCount === 1 && (
                        <button
                            onClick={onDuplicate}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
                            style={{ fontSize: 13, color: 'var(--text-secondary)', background: 'transparent' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--overlay-06)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                            <Copy size={14} />
                            Duplicate
                        </button>
                    )}
                    {onMerge && selectedCount === 2 && (
                        <button
                            onClick={onMerge}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
                            style={{ fontSize: 13, color: 'var(--accent)', background: 'var(--accent-dim)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(166,255,0,0.2)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent-dim)')}
                        >
                            <Merge size={14} />
                            Merge
                        </button>
                    )}
                    {onArchive && (
                        <button
                            onClick={onArchive}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
                            style={{ fontSize: 13, color: 'var(--text-secondary)', background: 'transparent' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--overlay-06)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                            <Archive size={14} />
                            Archive
                        </button>
                    )}
                    {onMoveToFolder && (
                        <button
                            onClick={onMoveToFolder}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
                            style={{ fontSize: 13, color: 'var(--text-secondary)', background: 'transparent' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--overlay-06)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-folder-input"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-1.2-1.8A2 2 0 0 0 7.55 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/><path d="M2 14h10"/><path d="m9 11 3 3-3 3"/></svg>
                            Move to folder
                        </button>
                    )}
                    <button
                        onClick={onDelete}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
                        style={{ fontSize: 13, color: 'var(--destructive)', background: 'rgba(255,77,77,0.1)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,77,77,0.2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,77,77,0.1)')}
                    >
                        <Trash2 size={14} />
                        Move to trash
                    </button>
                </>
            )}

            {/* Clear selection */}
            <div className="pl-3 border-l" style={{ borderColor: 'var(--overlay-10)' }}>
                <button
                    onClick={onClear}
                    style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                    ✕
                </button>
            </div>
        </div>
    );
}
