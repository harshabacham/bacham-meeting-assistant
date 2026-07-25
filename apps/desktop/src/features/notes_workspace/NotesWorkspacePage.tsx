import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/components';
import { NotesSidebar } from './components/NotesSidebar';
import { NotesEditor } from './components/NotesEditor';
import { NotesContextPanel } from './components/NotesContextPanel';
import { SidebarOpen, SidebarClose, PanelRight, PanelRightClose, Edit3, FileText, Maximize2, Minimize2 } from 'lucide-react';
import { TauriClient } from '@/infrastructure/tauri-client';
import { useLearningContext } from '@/shared/hooks/useLearningContext';

export interface Note {
    id: string;
    title: string;
    content: string; // HTML from TipTap
    updatedAt: number;
    createdAt: number;
    isPinned: boolean;
    tags: string[];
}

export function NotesWorkspacePage() {
    const [notes, setNotes] = useState<Note[]>([]);
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [contextOpen, setContextOpen] = useState(true);
    const [focusMode, setFocusMode] = useState(false);

    const activeNote = notes.find(n => n.id === activeNoteId) || null;

    useLearningContext({
        type: 'notes',
        title: activeNote?.title || 'Notes Workspace',
        noteId: activeNoteId || undefined,
        subtitle: activeNote ? `Editing: ${activeNote.title}` : 'Notes Editor',
    });

    useEffect(() => {
        let mounted = true;
        const fetchNotes = async () => {
            try {
                const fetched = await TauriClient.getWorkspaceNotes();
                if (!mounted) return;
                setNotes(fetched);
                if (fetched.length > 0 && !activeNoteId) {
                    setActiveNoteId(fetched[0].id);
                }
            } catch (e) {
                console.error("Failed to fetch workspace notes", e);
            }
        };
        fetchNotes();
        return () => { mounted = false; };
    }, []);

    const handleUpdateNote = useCallback(async (id: string, patch: Partial<Note>) => {
        // Optimistic update
        setNotes(prev => prev.map(n => n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n));
        
        try {
            await TauriClient.updateWorkspaceNote(
                id, 
                patch.title, 
                patch.content, 
                patch.isPinned, 
                patch.tags
            );
        } catch (e) {
            console.error("Failed to update note", e);
            // In a real app we might revert the optimistic update here
        }
    }, []);

    const handleCreateNote = useCallback(async () => {
        try {
            const newNote = await TauriClient.createWorkspaceNote('Untitled Note', '');
            setNotes(prev => [newNote, ...prev]);
            setActiveNoteId(newNote.id);
        } catch (e) {
            console.error("Failed to create note", e);
        }
    }, []);

    const handleDeleteNote = useCallback(async (id: string) => {
        setNotes(prev => {
            const updated = prev.filter(n => n.id !== id);
            if (activeNoteId === id) {
                setActiveNoteId(updated.length > 0 ? updated[0].id : null);
            }
            return updated;
        });
        
        try {
            await TauriClient.deleteWorkspaceNote(id);
        } catch (e) {
            console.error("Failed to delete note", e);
        }
    }, [activeNoteId]);

    const handleTogglePin = useCallback(async (id: string) => {
        const note = notes.find(n => n.id === id);
        if (!note) return;
        
        const newPinned = !note.isPinned;
        // Optimistic update with re-sort
        setNotes(prev => {
            const updated = prev.map(n => n.id === id ? { ...n, isPinned: newPinned } : n);
            return updated.sort((a, b) => {
                if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                return b.updatedAt - a.updatedAt;
            });
        });
        
        try {
            await TauriClient.updateWorkspaceNote(id, undefined, undefined, newPinned);
        } catch (e) {
            console.error("Failed to toggle pin", e);
        }
    }, [notes]);

    const handleDuplicateNote = useCallback(async (id: string) => {
        const src = notes.find(n => n.id === id);
        if (!src) return;
        
        try {
            const dup = await TauriClient.createWorkspaceNote(src.title + ' (Copy)', src.content);
            if (src.tags.length > 0) {
                await TauriClient.updateWorkspaceNote(dup.id, undefined, undefined, undefined, src.tags);
                dup.tags = src.tags;
            }
            setNotes(prev => [dup, ...prev]);
            setActiveNoteId(dup.id);
        } catch (e) {
            console.error("Failed to duplicate note", e);
        }
    }, [notes]);

    const handleAddTag = useCallback(async (id: string, tag: string) => {
        const note = notes.find(n => n.id === id);
        if (!note || note.tags.includes(tag)) return;
        
        const newTags = [...note.tags, tag];
        setNotes(prev => prev.map(n => n.id === id ? { ...n, tags: newTags } : n));
        
        try {
            await TauriClient.updateWorkspaceNote(id, undefined, undefined, undefined, newTags);
        } catch (e) {
            console.error("Failed to add tag", e);
        }
    }, [notes]);

    const handleRemoveTag = useCallback(async (id: string, tag: string) => {
        const note = notes.find(n => n.id === id);
        if (!note) return;
        
        const newTags = note.tags.filter(t => t !== tag);
        setNotes(prev => prev.map(n => n.id === id ? { ...n, tags: newTags } : n));
        
        try {
            await TauriClient.updateWorkspaceNote(id, undefined, undefined, undefined, newTags);
        } catch (e) {
            console.error("Failed to remove tag", e);
        }
    }, [notes]);

    return (
        <div className="flex h-full w-full bg-[var(--bg)] overflow-hidden text-[var(--text-primary)]">

            {/* ── Left Sidebar ───────────────────────────────────────────── */}
            {!focusMode && (
                <div className={cn(
                    'shrink-0 h-full border-r border-[var(--border)] bg-[var(--surface)] transition-all duration-300 overflow-hidden',
                    sidebarOpen ? 'w-[272px]' : 'w-0 border-none'
                )}>
                    {sidebarOpen && (
                        <NotesSidebar
                            notes={notes}
                            activeNoteId={activeNoteId}
                            onSelectNote={id => setActiveNoteId(id)}
                            onCreateNote={handleCreateNote}
                            onDeleteNote={handleDeleteNote}
                            onTogglePin={handleTogglePin}
                            onDuplicateNote={handleDuplicateNote}
                        />
                    )}
                </div>
            )}

            {/* ── Main Editor Column ─────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0 h-full relative">

                {/* Topbar */}
                {!focusMode ? (
                    <div className="h-11 shrink-0 border-b border-[var(--border)]/60 flex items-center px-4 gap-2 bg-[var(--bg)]/80 backdrop-blur-sm z-10">
                        <button
                            onClick={() => setSidebarOpen(v => !v)}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                            title={sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
                        >
                            {sidebarOpen ? <SidebarClose size={16} /> : <SidebarOpen size={16} />}
                        </button>

                        {activeNote && (
                            <>
                                <div className="h-4 w-px bg-[var(--border)]/50 mx-1" />
                                <FileText size={13} className="text-[var(--accent)] shrink-0" />
                                <span className="text-sm font-semibold text-[var(--text-primary)] truncate flex-1 min-w-0">
                                    {activeNote.title}
                                </span>
                            </>
                        )}

                        <div className="ml-auto flex items-center gap-1">
                            <button
                                onClick={() => setFocusMode(true)}
                                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                                title="Focus Mode"
                            >
                                <Maximize2 size={14} />
                            </button>
                            <button
                                onClick={() => setContextOpen(v => !v)}
                                className={cn('p-1.5 rounded-lg transition-colors',
                                    contextOpen
                                        ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
                                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]')}
                                title="Toggle Info Panel"
                            >
                                {contextOpen ? <PanelRightClose size={15} /> : <PanelRight size={15} />}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Focus mode exit bar — fades in on hover */
                    <div className="h-11 shrink-0 flex items-center justify-end px-4 bg-[var(--bg)]/80 backdrop-blur-sm z-10 opacity-0 hover:opacity-100 transition-opacity duration-500">
                        <button
                            onClick={() => setFocusMode(false)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface)]"
                        >
                            <Minimize2 size={13} />
                            Exit Focus
                        </button>
                    </div>
                )}

                {/* Editor */}
                <div className="flex-1 overflow-hidden relative bg-[var(--bg)]">
                    {activeNote ? (
                        <NotesEditor
                            key={activeNote.id}
                            note={activeNote}
                            focusMode={focusMode}
                            onUpdate={(patch) => handleUpdateNote(activeNote.id, patch)}
                        />
                    ) : (
                        <EmptyState onCreate={handleCreateNote} />
                    )}
                </div>
            </div>

            {/* ── Right Context Panel ────────────────────────────────────── */}
            {!focusMode && contextOpen && activeNote && (
                <div className="w-[264px] shrink-0 border-l border-[var(--border)] bg-[var(--surface)] flex flex-col h-full overflow-hidden">
                    <NotesContextPanel
                        note={activeNote}
                        onClose={() => setContextOpen(false)}
                        onAddTag={(tag) => handleAddTag(activeNote.id, tag)}
                        onRemoveTag={(tag) => handleRemoveTag(activeNote.id, tag)}
                    />
                </div>
            )}
        </div>
    );
}

import { ContextEmptyState } from '@/components/ui/ContextEmptyState';

function EmptyState({ onCreate }: { onCreate: () => void }) {
    return (
        <ContextEmptyState
            icon={<Edit3 size={28} />}
            title="No notes yet."
            description="Capture important ideas, formulas, and insights while learning."
            primaryAction={{
                label: "Create Note",
                onClick: onCreate
            }}
        />
    );
}
