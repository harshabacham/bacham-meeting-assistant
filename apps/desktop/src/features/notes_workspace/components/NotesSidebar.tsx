import { Search, Plus, Pin, Trash2, Copy, MoreVertical, FileText, Folder as FolderIcon, FolderPlus, Layers, Edit2, Video } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/components';
import { useConfirmStore } from '@/components/ui/ConfirmProvider';
import { Note } from '../NotesWorkspacePage';

interface NotesSidebarProps {
    notes: Note[];
    folders?: any[];
    activeNoteId: string | null;
    activeFolderId?: string | null;
    onSelectFolder?: (folderId: string | null) => void;
    onCreateFolder?: (name: string) => void;
    onRenameFolder?: (folderId: string, name: string) => void;
    onDeleteFolder?: (folderId: string) => void;
    onSelectNote: (id: string | null) => void;
    onCreateNote: () => void;
    onDeleteNote: (id: string) => void;
    onTogglePin: (id: string) => void;
    onDuplicateNote: (id: string) => void;
}

export function NotesSidebar({
    notes,
    folders = [],
    activeNoteId,
    activeFolderId = null,
    onSelectFolder,
    onCreateFolder,
    onRenameFolder,
    onDeleteFolder,
    onSelectNote,
    onCreateNote,
    onDeleteNote,
    onTogglePin,
    onDuplicateNote,
}: NotesSidebarProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTag, setActiveTag] = useState<string | null>(null);
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
    const [renamingName, setRenamingName] = useState('');

    const allTags = Array.from(new Set(notes.flatMap(n => n.tags.filter(t => !t.startsWith('folder:')))));

    const filtered = notes.filter(n => {
        const matchesFolder = !activeFolderId || n.folderId === activeFolderId;
        const q = searchQuery.toLowerCase();
        const matchesSearch = !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.tags.some(t => t.toLowerCase().includes(q));
        const matchesTag = !activeTag || n.tags.includes(activeTag);
        return matchesFolder && matchesSearch && matchesTag;
    });

    const pinned = filtered.filter(n => n.isPinned);
    const unpinned = filtered.filter(n => !n.isPinned);

    const handleAddFolderSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newFolderName.trim() && onCreateFolder) {
            onCreateFolder(newFolderName.trim());
            setNewFolderName('');
            setIsCreatingFolder(false);
        }
    };

    const handleRenameSubmit = (folderId: string) => {
        if (renamingName.trim() && onRenameFolder) {
            onRenameFolder(folderId, renamingName.trim());
        }
        setRenamingFolderId(null);
        setRenamingName('');
    };

    return (
        <div className="flex flex-col h-full w-[272px] overflow-hidden bg-[var(--surface)] text-[var(--text-primary)] border-r border-[var(--border)]">
            
            {/* Header */}
            <div className="px-4 pt-4 pb-3 flex items-center justify-between shrink-0 border-b border-[var(--border)]/40">
                <button onClick={() => onSelectNote(null)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <div className="w-7 h-7 rounded-lg bg-[var(--accent-dim)] border border-[var(--border-accent)] flex items-center justify-center">
                        <FileText size={14} className="text-[var(--accent)]" />
                    </div>
                    <span className="text-sm font-bold text-[var(--text-primary)]">Notes</span>
                </button>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsCreatingFolder(v => !v)}
                        className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                        title="New Folder"
                    >
                        <FolderPlus size={15} />
                    </button>
                    <button
                        onClick={onCreateNote}
                        className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                        title="New Note (Ctrl+N)"
                    >
                        <Plus size={16} />
                    </button>
                </div>
            </div>

            {/* Create Folder Inline Prompt */}
            {isCreatingFolder && (
                <form onSubmit={handleAddFolderSubmit} className="px-3 py-2 border-b border-[var(--border)] shrink-0 bg-[var(--surface-hover)]">
                    <div className="flex items-center gap-1.5">
                        <FolderIcon size={13} className="text-[var(--accent)] shrink-0" />
                        <input
                            type="text"
                            value={newFolderName}
                            onChange={e => setNewFolderName(e.target.value)}
                            onKeyDown={e => e.key === 'Escape' && setIsCreatingFolder(false)}
                            placeholder="Folder name..."
                            autoFocus
                            className="w-full bg-[var(--bg)] border border-[var(--border-accent)] rounded px-2 py-1 text-xs text-[var(--text-primary)] outline-none"
                        />
                    </div>
                </form>
            )}

            {/* Folders List Section */}
            <div className="px-3 py-2 shrink-0 border-b border-[var(--border)]/40 space-y-1">
                <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider px-1 mb-1">
                    Folders
                </div>
                <button
                    onClick={() => onSelectFolder && onSelectFolder(null)}
                    className={cn(
                        'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                        activeFolderId === null
                            ? 'bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]'
                            : 'text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                    )}
                >
                    <div className="flex items-center gap-2">
                        <Layers size={13} className="text-[var(--accent)]" />
                        <span>All Notes</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] font-bold">{notes.length}</span>
                </button>

                {folders.map(f => {
                    const folderNoteCount = notes.filter(n => n.folderId === f.id).length;
                    const isRenaming = renamingFolderId === f.id;

                    if (isRenaming) {
                        return (
                            <form key={f.id} onSubmit={(e) => { e.preventDefault(); handleRenameSubmit(f.id); }} className="px-2 py-1">
                                <input
                                    type="text"
                                    value={renamingName}
                                    onChange={e => setRenamingName(e.target.value)}
                                    onBlur={() => handleRenameSubmit(f.id)}
                                    onKeyDown={e => e.key === 'Escape' && setRenamingFolderId(null)}
                                    autoFocus
                                    className="w-full bg-[var(--bg)] border border-[var(--border-accent)] rounded px-2 py-1 text-xs text-[var(--text-primary)] outline-none"
                                />
                            </form>
                        );
                    }

                    return (
                        <FolderItem
                            key={f.id}
                            folder={f}
                            count={folderNoteCount}
                            isActive={activeFolderId === f.id}
                            onSelect={() => onSelectFolder && onSelectFolder(f.id)}
                            onStartRename={() => { setRenamingFolderId(f.id); setRenamingName(f.name); }}
                            onDelete={() => onDeleteFolder && onDeleteFolder(f.id)}
                        />
                    );
                })}
            </div>

            {/* Search */}
            <div className="px-3 pt-3 pb-2 shrink-0">
                <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                        type="text"
                        placeholder="Search notes, tags..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 focus:outline-none focus:border-[var(--border-accent)] transition-colors"
                    />
                </div>
            </div>

            {/* Tag Filter Pills */}
            {allTags.length > 0 && (
                <div className="px-3 pb-2 shrink-0 flex gap-1.5 flex-wrap">
                    <button
                        onClick={() => setActiveTag(null)}
                        className={cn(
                            'text-[10px] px-2 py-0.5 rounded-full border font-semibold transition-all',
                            !activeTag
                                ? 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-accent)]'
                                : 'text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--border-accent)] hover:text-[var(--accent)]'
                        )}
                    >
                        All
                    </button>
                    {allTags.map(tag => (
                        <button
                            key={tag}
                            onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                            className={cn(
                                'text-[10px] px-2 py-0.5 rounded-full border font-semibold transition-all',
                                activeTag === tag
                                    ? 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-accent)]'
                                    : 'text-[var(--text-muted)] border-[var(--border)]/50 hover:border-[var(--border-accent)] hover:text-[var(--accent)]'
                            )}
                        >
                            #{tag}
                        </button>
                    ))}
                </div>
            )}

            {/* Note List */}
            <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-3">
                {filtered.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                        <FileText size={28} className="text-[var(--text-muted)]/30" />
                        <p className="text-xs text-[var(--text-muted)] font-medium">
                            {searchQuery ? 'No notes match your search.' : 'No notes in this folder.'}
                        </p>
                    </div>
                )}

                {pinned.length > 0 && (
                    <div>
                        <div className="px-2 py-1 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5 mb-1">
                            <Pin size={9} /> Pinned
                        </div>
                        <div className="space-y-0.5">
                            {pinned.map(note => (
                                <NoteItem
                                    key={note.id}
                                    note={note}
                                    isActive={note.id === activeNoteId}
                                    onSelect={() => onSelectNote(note.id)}
                                    onTogglePin={() => onTogglePin(note.id)}
                                    onDuplicate={() => onDuplicateNote(note.id)}
                                    onDelete={() => onDeleteNote(note.id)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {unpinned.length > 0 && (
                    <div>
                        {pinned.length > 0 && (
                            <div className="px-2 py-1 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                                Notes
                            </div>
                        )}
                        <div className="space-y-0.5">
                            {unpinned.map(note => (
                                <NoteItem
                                    key={note.id}
                                    note={note}
                                    isActive={note.id === activeNoteId}
                                    onSelect={() => onSelectNote(note.id)}
                                    onTogglePin={() => onTogglePin(note.id)}
                                    onDuplicate={() => onDuplicateNote(note.id)}
                                    onDelete={() => onDeleteNote(note.id)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Count */}
            <div className="px-4 py-2 border-t border-[var(--border)] shrink-0 flex items-center">
                <span className="text-[10px] text-[var(--text-muted)] font-medium whitespace-nowrap truncate w-full">
                    {filtered.length} note{filtered.length !== 1 ? 's' : ''}
                    {activeTag ? ` · #${activeTag}` : ''}
                </span>
            </div>
        </div>
    );
}

function FolderItem({ folder, count, isActive, onSelect, onStartRename, onDelete }: {
    folder: any;
    count: number;
    isActive: boolean;
    onSelect: () => void;
    onStartRename: () => void;
    onDelete: () => void;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuOpen) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuOpen]);

    return (
        <div className="relative group">
            <button
                onClick={onSelect}
                className={cn(
                    'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                    isActive
                        ? 'bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]'
                        : 'text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                )}
            >
                <div className="flex items-center gap-2 truncate pr-6">
                    <FolderIcon size={13} className="text-[var(--text-muted)] shrink-0" />
                    <span className="truncate">{folder.name}</span>
                </div>
                <span className="text-[10px] text-[var(--text-muted)] font-bold shrink-0">{count}</span>
            </button>

            <div className="absolute right-2 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity" ref={menuRef}>
                <button
                    onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
                    className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors"
                >
                    <MoreVertical size={11} />
                </button>

                {menuOpen && (
                    <div className="absolute right-0 top-5 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl py-1 w-32 animate-in fade-in zoom-in-95 duration-100">
                        <button
                            onClick={() => { onStartRename(); setMenuOpen(false); }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                        >
                            <Edit2 size={11} /> Rename
                        </button>
                        <div className="my-1 border-t border-[var(--border)]" />
                        <button
                            onClick={async () => {
                                const ok = await useConfirmStore.getState().showConfirm(`Delete folder "${folder.name}"?`);
                                if (ok) { onDelete(); setMenuOpen(false); }
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-[var(--destructive)] hover:bg-[var(--destructive-dim)]"
                        >
                            <Trash2 size={11} /> Delete
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function NoteItem({ note, isActive, onSelect, onTogglePin, onDuplicate, onDelete }: {
    note: Note;
    isActive: boolean;
    onSelect: () => void;
    onTogglePin: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuOpen) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuOpen]);

    const snippet = note.content
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 70) || '—';

    const userTags = note.tags.filter(t => !t.startsWith('folder:'));

    const dateStr = (() => {
        const diff = Date.now() - note.updatedAt;
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    })();

    return (
        <div className="relative group">
            <button
                onClick={onSelect}
                className={cn(
                    'w-full text-left px-3 py-2.5 rounded-xl transition-all border outline-none',
                    isActive
                        ? 'bg-[var(--accent-dim)] border-[var(--border-accent)]'
                        : 'border-transparent hover:bg-[var(--surface-hover)] hover:border-[var(--border)]/50'
                )}
            >
                <div className="flex flex-col gap-1 pr-6">
                    <div className="flex items-center gap-1.5 min-w-0">
                        {note.isPinned && <Pin size={10} className="text-[var(--accent)] shrink-0 fill-[var(--accent)]" />}
                        {note.isMeeting && <Video size={11} className="text-[var(--text-muted)] shrink-0" />}
                        <span className={cn(
                            'text-[13px] font-bold truncate',
                            isActive ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'
                        )}>  
                            {note.title}
                        </span>
                    </div>
                    <span className="text-[11px] text-[var(--text-muted)] line-clamp-1">{snippet}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-semibold text-[var(--text-muted)] shrink-0">{dateStr}</span>
                        {note.isMeeting && (
                            <span className="text-[9px] font-medium px-1.5 py-0.5 bg-[var(--surface-raised)] border border-[var(--border)]/60 text-[var(--text-secondary)] rounded-md">Meeting</span>
                        )}
                        {userTags.slice(0, 2).map(t => (
                            <span key={t} className="text-[9px] font-bold px-1.5 py-0.5 bg-[var(--accent-dim)] text-[var(--accent)] rounded">#{t}</span>
                        ))}
                    </div>
                </div>
            </button>

            {/* Context Menu Trigger */}
            <div className="absolute right-2 top-2.5 opacity-0 group-hover:opacity-100 transition-opacity" ref={menuRef}>
                <button
                    onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
                    className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                >
                    <MoreVertical size={12} />
                </button>

                {menuOpen && (
                    <div className="absolute right-0 top-6 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl py-1 w-40 animate-in fade-in zoom-in-95 duration-100">
                        <ContextMenuItem onClick={() => { onTogglePin(); setMenuOpen(false); }}>
                            <Pin size={12} className={note.isPinned ? 'fill-[var(--accent)] text-[var(--accent)]' : ''} />
                            {note.isPinned ? 'Unpin' : 'Pin Note'}
                        </ContextMenuItem>
                        <ContextMenuItem onClick={() => { onDuplicate(); setMenuOpen(false); }}>
                            <Copy size={12} /> Duplicate
                        </ContextMenuItem>
                        <div className="my-1 border-t border-[var(--border)]" />
                        <ContextMenuItem
                            onClick={async () => {
                                const ok = await useConfirmStore.getState().showConfirm('Delete this note?');
                                if (ok) { onDelete(); setMenuOpen(false); }
                            }}
                            danger
                        >
                            <Trash2 size={12} /> Delete
                        </ContextMenuItem>
                    </div>
                )}
            </div>
        </div>
    );
}

function ContextMenuItem({ children, onClick, danger }: {
    children: React.ReactNode;
    onClick: () => void;
    danger?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] font-semibold transition-colors text-left',
                danger
                    ? 'text-[var(--destructive)] hover:bg-[var(--destructive-dim)]'
                    : 'text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
            )}
        >
            {children}
        </button>
    );
}
