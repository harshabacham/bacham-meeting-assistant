import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Search, 
    Folder, 
    FileText, 
    Plus, 
    MoreHorizontal,
    Edit3,
    Trash2,
    Check,
    X,
    Filter,
    Calendar,
    ArrowRight,
    CheckSquare,
    Sparkles,
    Video,
    BookOpen,
    RefreshCw
} from 'lucide-react';
import { cn } from '@/components';
import { Note } from '../NotesWorkspacePage';
import { AgenticAiChat, AiRecipe } from './AgenticAiChat';
import { TauriClient } from '@/infrastructure/tauri-client';

const DASHBOARD_RECIPES: AiRecipe[] = [
    {
        id: 'summary',
        shortTitle: 'Summarize folder',
        title: 'Executive Folder Summary',
        icon: FileText,
        prompt: (folderName: string) => `Provide a comprehensive executive summary of all notes in the folder "${folderName}". Format with clear headers: 1) Executive Overview, 2) Key Decisions & Highlights, 3) Important Context.`,
    },
    {
        id: 'todos',
        shortTitle: 'List recent todos',
        title: 'Extract Action Items & Todos',
        icon: CheckSquare,
        prompt: (folderName: string) => `Extract all pending action items, deliverables, and follow-ups across the notes in "${folderName}". Format with markdown checkboxes \`- [ ]\`, explicit owners (@<Name>), and deadlines. Group them into Immediate Priorities, Follow-ups, and Open Deliverables.`,
    },
    {
        id: 'insights',
        shortTitle: 'Key Insights',
        title: 'Key Insights & Q&A',
        icon: Sparkles,
        prompt: (folderName: string) => `Identify and summarize the top 5 strategic insights, key learnings, and resolved questions from the notes in "${folderName}".`,
    }
];

interface NotesDashboardProps {
    notes: Note[];
    folders?: any[];
    activeFolderId?: string | null;
    onSelectFolder?: (id: string | null) => void;
    lectures: any[];
    onCreateNote: () => void;
    onSelectNote: (id: string) => void;
    onUpdateNote?: (id: string, patch: Partial<Note>) => void;
    onDeleteNote?: (id: string) => void;
    onHardDeleteNote?: (id: string) => void;
    onRestoreNote?: (id: string) => void;
    onDeleteLecture?: (id: string) => void;
    onRestoreLecture?: (id: string) => void;
    onHardDeleteLecture?: (id: string) => void;
}

export function NotesDashboard({ 
    notes, 
    folders = [], 
    activeFolderId = null,
    onSelectFolder,
    lectures, 
    onCreateNote, 
    onSelectNote,
    onUpdateNote,
    onDeleteNote,
    onHardDeleteNote,
    onRestoreNote,
    onDeleteLecture,
    onRestoreLecture,
    onHardDeleteLecture
}: NotesDashboardProps) {
    const navigate = useNavigate();
    const [searchQuery] = useState('');
    const [activeTab] = useState<'notes' | 'files'>('notes');
    const [filterMode] = useState<'all' | 'todos' | 'projects'>('all');
    const [integrationsOpen, setIntegrationsOpen] = useState(false);
    const [isViewingAll, setIsViewingAll] = useState(false);

    const [trashedLectures, setTrashedLectures] = useState<any[]>([]);

    useEffect(() => {
        if (activeFolderId === 'system:trash') {
            TauriClient.listTrash().then(res => setTrashedLectures(res || [])).catch(console.error);
        } else {
            setTrashedLectures([]);
        }
    }, [activeFolderId]);

    // Hover Menu & Rename States
    const [activeNoteMenu, setActiveNoteMenu] = useState<string | null>(null);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');

    // Close menu when clicking outside
    const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setActiveNoteMenu(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const activeFolder = useMemo(() => {
        if (activeFolderId === 'system:trash') {
            return { id: 'system:trash', name: 'Trash', icon: <Trash2 size={13} /> };
        }
        if (activeFolderId && folders.length > 0) {
            return folders.find(f => f.id === activeFolderId) || null;
        }
        return null;
    }, [activeFolderId, folders]);

    const activeFolderName = activeFolder ? activeFolder.name : 'My notes';
    const isTrashView = activeFolderId === 'system:trash';

    const filteredNotes = useMemo(() => {
        let result = [...notes];

        if (isTrashView) {
            result = result.filter(n => n.tags?.includes('system:trash'));
        } else {
            result = result.filter(n => !n.tags?.includes('system:trash'));
        }

        if (filterMode === 'todos') {
            result = result.filter(n => {
                const c = n.content.toLowerCase();
                return c.includes('data-type="taskitem"') || c.includes('[ ]') || c.includes('[x]') || c.includes('todo') || c.includes('task');
            });
        } else if (filterMode === 'projects') {
            result = result.filter(n => {
                const text = (n.title + ' ' + n.content + ' ' + n.tags.join(' ')).toLowerCase();
                return text.includes('project') || text.includes('wip') || text.includes('in-flight') || text.includes('draft');
            });
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(n => 
                n.title.toLowerCase().includes(q) || 
                n.content.toLowerCase().includes(q) || 
                n.tags.some(t => t.toLowerCase().includes(q))
            );
        }

        return result.sort((a, b) => b.updatedAt - a.updatedAt);
    }, [notes, filterMode, searchQuery]);

    return (
        <div className="flex-1 flex flex-col h-full bg-[var(--bg)] text-[var(--text-primary)] overflow-hidden font-sans relative selection:bg-[var(--surface-hover)]">

            {/* Sticky top bar - added pr-[140px] to prevent overlapping with window controls */}
            <div className="h-11 shrink-0 flex items-center justify-between pl-5 pr-[140px] sticky top-0 bg-[var(--bg)] z-20 border-b border-[var(--border)]/40">
                <div className="flex items-center gap-1.5 min-w-0">
                    {activeFolderId && activeFolder ? (
                        <>
                            <button 
                                onClick={() => onSelectFolder && onSelectFolder(null)}
                                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors shrink-0"
                                title="All Notes"
                            >
                                <Folder size={13} />
                            </button>
                            <span className="text-[var(--text-muted)] text-xs shrink-0">/</span>
                            <span className="text-xs font-medium text-[var(--text-primary)] truncate flex items-center gap-1">
                                {activeFolder.icon && <span>{activeFolder.icon}</span>}
                                {activeFolder.name}
                            </span>
                            <button 
                                onClick={() => onSelectFolder && onSelectFolder(null)}
                                className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors shrink-0"
                                title="Clear folder"
                            >
                                <X size={11} />
                            </button>
                        </>
                    ) : (
                        <span className="text-xs font-medium text-[var(--text-muted)]">All Notes</span>
                    )}
                </div>
                {!isTrashView && (
                    <button
                        onClick={onCreateNote}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--text-primary)] text-[var(--bg)] text-xs font-semibold hover:opacity-90 active:scale-95 transition-all"
                    >
                        <Plus size={12} />
                        New Note
                    </button>
                )}
            </div>

            {/* AI Chat - Uncoupled from scroll container to sit fixed at bottom */}
            <AgenticAiChat 
                contextName={activeFolderName} 
                contextText={filteredNotes.slice(0, 15).map(n => `Title: ${n.title}\nContent: ${n.content.replace(/<[^>]+>/g, ' ')}`).join('\n---\n')}
                recipes={DASHBOARD_RECIPES}
                placeholder="Ask AI about your notes..."
            />

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto pb-32">
                <div className="max-w-2xl w-full mx-auto px-6 py-8 flex flex-col gap-6">

                    {/* Page header */}
                    <div className="text-center pt-2">
                        <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight mb-1">
                            {activeFolderName}
                        </h1>
                        <p className="text-[12px] text-[var(--text-muted)]">
                            {activeFolderId
                                ? `${filteredNotes.length} note${filteredNotes.length !== 1 ? 's' : ''} in this folder`
                                : `${filteredNotes.length} note${filteredNotes.length !== 1 ? 's' : ''} · ${folders.length} folder${folders.length !== 1 ? 's' : ''}`
                            }
                        </p>
                    </div>



                    {/* Notes list */}
                    {activeTab === 'notes' && (
                        <div className="flex flex-col">
                            {filteredNotes.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <h3 className="font-medium text-[var(--text-primary)] text-sm mb-1.5">
                                        {searchQuery || filterMode !== 'all' ? 'No Matching Notes' : 'No Notes Yet'}
                                    </h3>
                                    <p className="text-[var(--text-muted)] text-xs max-w-[220px] mb-5">
                                        {isTrashView ? 'No items in trash.' : (searchQuery || filterMode !== 'all'
                                            ? 'Try adjusting your search or filter.'
                                            : 'Start writing to capture your thoughts.')}
                                    </p>
                                    {!isTrashView && (
                                        <button 
                                            onClick={onCreateNote} 
                                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--text-primary)] text-[var(--bg)] text-xs font-medium hover:opacity-90 transition-colors"
                                        >
                                            <Plus size={13} /> Create note
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="h-px bg-[var(--border)]/50 w-full mb-2" />
                                    {(isViewingAll ? filteredNotes : filteredNotes.slice(0, 5)).map((note, idx) => {
                                        const date = new Date(note.updatedAt);
                                        const today = new Date();
                                        const yesterday = new Date(today);
                                        yesterday.setDate(yesterday.getDate() - 1);

                                        let dateLabel: string;
                                        if (date.toDateString() === today.toDateString()) {
                                            dateLabel = 'Today';
                                        } else if (date.toDateString() === yesterday.toDateString()) {
                                            dateLabel = 'Yesterday';
                                        } else {
                                            dateLabel = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                                        }

                                        const timeString = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                                        let showHeader = true;
                                        if (idx > 0) {
                                            const prev = new Date(filteredNotes[idx - 1].updatedAt);
                                            if (prev.toDateString() === date.toDateString()) showHeader = false;
                                        }

                                        return (
                                            <React.Fragment key={note.id}>
                                                {showHeader && (
                                                    <div className="text-[11px] font-medium text-[var(--text-muted)] mt-5 mb-2 first:mt-0 px-1">
                                                        {dateLabel}
                                                    </div>
                                                )}
                                                <div 
                                                    onClick={(e) => {
                                                        // Prevent navigating if clicking on menu or editing
                                                        if (editingNoteId === note.id) return;
                                                        onSelectNote(note.id);
                                                    }}
                                                    className="group flex items-center justify-between p-2.5 -mx-2.5 rounded-xl hover:bg-[var(--surface-hover)] cursor-pointer transition-colors relative"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
                                                        <div className="shrink-0 p-1.5 rounded-lg bg-[var(--surface-hover)] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
                                                            <FileText size={14} />
                                                        </div>
                                                        <div className="flex flex-col min-w-0 flex-1">
                                                            {editingNoteId === note.id ? (
                                                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                                    <input 
                                                                        type="text" 
                                                                        autoFocus
                                                                        value={editingTitle}
                                                                        onChange={e => setEditingTitle(e.target.value)}
                                                                        onKeyDown={e => {
                                                                            if (e.key === 'Enter') {
                                                                                if (editingTitle.trim() && onUpdateNote) onUpdateNote(note.id, { title: editingTitle.trim() });
                                                                                setEditingNoteId(null);
                                                                            } else if (e.key === 'Escape') {
                                                                                setEditingNoteId(null);
                                                                            }
                                                                        }}
                                                                        className="bg-[var(--bg)] border border-[var(--accent)] rounded px-1.5 py-0.5 text-[13px] font-medium text-[var(--text-primary)] outline-none w-full max-w-[200px]"
                                                                    />
                                                                    <button onClick={() => {
                                                                        if (editingTitle.trim() && onUpdateNote) onUpdateNote(note.id, { title: editingTitle.trim() });
                                                                        setEditingNoteId(null);
                                                                    }} className="p-1 hover:bg-[var(--surface-hover)] rounded text-green-500">
                                                                        <Check size={14} />
                                                                    </button>
                                                                    <button onClick={() => setEditingNoteId(null)} className="p-1 hover:bg-[var(--surface-hover)] rounded text-[var(--text-muted)] hover:text-red-500">
                                                                        <X size={14} />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <span className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                                                                        {note.title || 'Untitled Note'}
                                                                    </span>
                                                                    <span className="text-[11px] text-[var(--text-muted)]">Me</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {/* Hover Menu Button */}
                                                        <div className="relative flex items-center" onClick={e => e.stopPropagation()} ref={activeNoteMenu === note.id ? menuRef : null}>
                                                            <button
                                                                onClick={() => setActiveNoteMenu(activeNoteMenu === note.id ? null : note.id)}
                                                                className={cn(
                                                                    "p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-all",
                                                                    activeNoteMenu === note.id ? "opacity-100 bg-[var(--surface-raised)] text-[var(--text-primary)]" : "opacity-0 group-hover:opacity-100"
                                                                )}
                                                            >
                                                                <MoreHorizontal size={14} />
                                                            </button>

                                                            {activeNoteMenu === note.id && (
                                                                <div className="absolute top-8 right-0 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg py-1 w-36 overflow-hidden">
                                                                    {!isTrashView ? (
                                                                        <>
                                                                            <button
                                                                                onClick={() => {
                                                                                    setEditingNoteId(note.id);
                                                                                    setEditingTitle(note.title || 'Untitled Note');
                                                                                    setActiveNoteMenu(null);
                                                                                }}
                                                                                className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                                                                            >
                                                                                <Edit3 size={13} className="text-[var(--text-muted)]" />
                                                                                <span>Rename</span>
                                                                            </button>
                                                                            <div className="h-px w-full bg-[var(--border)] my-0.5 opacity-50" />
                                                                            <button
                                                                                onClick={() => {
                                                                                    if (note.isMeeting) {
                                                                                        if (onDeleteLecture) onDeleteLecture(note.id);
                                                                                    } else {
                                                                                        if (onDeleteNote) onDeleteNote(note.id);
                                                                                    }
                                                                                    setActiveNoteMenu(null);
                                                                                }}
                                                                                className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-red-500 hover:bg-red-500/10 transition-colors"
                                                                            >
                                                                                <Trash2 size={13} />
                                                                                <span>Delete</span>
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <button
                                                                                onClick={() => {
                                                                                    if (note.isMeeting) {
                                                                                        if (onRestoreLecture) onRestoreLecture(note.id);
                                                                                    } else {
                                                                                        if (onRestoreNote) onRestoreNote(note.id);
                                                                                    }
                                                                                    setActiveNoteMenu(null);
                                                                                }}
                                                                                className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                                                                            >
                                                                                <RefreshCw size={13} className="text-[var(--text-muted)]" />
                                                                                <span>Restore</span>
                                                                            </button>
                                                                            <div className="h-px w-full bg-[var(--border)] my-0.5 opacity-50" />
                                                                            <button
                                                                                onClick={() => {
                                                                                    if (note.isMeeting) {
                                                                                        if (onHardDeleteLecture) onHardDeleteLecture(note.id);
                                                                                    } else {
                                                                                        if (onHardDeleteNote) onHardDeleteNote(note.id);
                                                                                    }
                                                                                    setActiveNoteMenu(null);
                                                                                }}
                                                                                className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-red-500 hover:bg-red-500/10 transition-colors"
                                                                            >
                                                                                <Trash2 size={13} />
                                                                                <span>Delete Forever</span>
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                        
                                                        {/* Time */}
                                                        <span className="text-[11px] text-[var(--text-muted)] font-medium w-16 text-right">
                                                            {timeString}
                                                        </span>
                                                    </div>
                                                </div>
                                            </React.Fragment>
                                        );
                                    })}
                                    
                                    {!isViewingAll && filteredNotes.length > 5 && (
                                        <div className="mt-4 flex justify-center">
                                            <button 
                                                onClick={() => setIsViewingAll(true)}
                                                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-[var(--border)] transition-colors"
                                            >
                                                View all {filteredNotes.length} notes
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                    
                    {/* Trashed Lectures Section */}
                    {isTrashView && trashedLectures.length > 0 && (
                        <div className="flex flex-col mt-8">
                            <div className="h-px bg-[var(--border)]/50 w-full mb-4" />
                            <h3 className="text-[13px] font-semibold text-[var(--text-muted)] mb-3 px-1">Trashed Recordings</h3>
                            <div className="flex flex-col gap-2">
                                {trashedLectures.map((item: any) => (
                                    <div 
                                        key={item.id}
                                        className="group flex items-center justify-between p-2.5 -mx-2.5 rounded-xl hover:bg-[var(--surface-hover)] transition-colors relative"
                                    >
                                        <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
                                            <div className="shrink-0 p-1.5 rounded-lg bg-[var(--surface-hover)] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
                                                <Video size={14} />
                                            </div>
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="text-[13px] font-medium text-[var(--text-primary)] truncate">{item.title}</span>
                                                <span className="text-[11px] text-[var(--text-muted)]">Recording</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <div className="relative flex items-center" onClick={e => e.stopPropagation()}>
                                                <button
                                                    onClick={() => setActiveNoteMenu(activeNoteMenu === item.id ? null : item.id)}
                                                    className={cn(
                                                        "p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-all",
                                                        activeNoteMenu === item.id ? "opacity-100 bg-[var(--surface-raised)] text-[var(--text-primary)]" : "opacity-0 group-hover:opacity-100"
                                                    )}
                                                >
                                                    <MoreHorizontal size={14} />
                                                </button>
                                                {activeNoteMenu === item.id && (
                                                    <div className="absolute top-8 right-0 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg py-1 w-36 overflow-hidden">
                                                        <button
                                                            onClick={() => {
                                                                if (onRestoreLecture) onRestoreLecture(item.id);
                                                                setActiveNoteMenu(null);
                                                            }}
                                                            className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                                                        >
                                                            <RefreshCw size={13} className="text-[var(--text-muted)]" />
                                                            <span>Restore</span>
                                                        </button>
                                                        <div className="h-px w-full bg-[var(--border)] my-0.5 opacity-50" />
                                                        <button
                                                            onClick={() => {
                                                                if (onHardDeleteLecture) onHardDeleteLecture(item.id);
                                                                setActiveNoteMenu(null);
                                                            }}
                                                            className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-red-500 hover:bg-red-500/10 transition-colors"
                                                        >
                                                            <Trash2 size={13} />
                                                            <span>Delete Forever</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {activeTab !== 'notes' && (
                        <div className="flex flex-col gap-2">
                            {lectures.length === 0 ? (
                                <div className="text-center py-16 text-sm text-[var(--text-muted)] italic">
                                    No recordings in this folder yet.
                                </div>
                            ) : (
                                lectures.map((item: any) => (
                                    <div 
                                        key={item.id}
                                        onClick={() => navigate(`/lectures/${item.id}`)}
                                        className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-accent)] transition-colors cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="p-2 rounded-lg bg-[var(--surface-hover)] text-[var(--text-primary)] shrink-0">
                                                <Video size={14} />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-medium text-[var(--text-primary)] truncate">{item.title}</span>
                                                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-0.5">
                                                    {item.courseLabel && <span>{item.courseLabel}</span>}
                                                    <span className="flex items-center gap-1">
                                                        <Calendar size={10} />
                                                        {new Date(item.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <ArrowRight size={13} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] group-hover:translate-x-1 transition-all shrink-0 ml-3" />
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    <div className="h-8" />
                </div>
            </div>

            {/* Integrations Modal */}
            {integrationsOpen && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[var(--surface)] border border-[var(--border-accent)] rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
                            <span className="font-bold text-sm text-[var(--text-primary)]">Workspace Integrations</span>
                            <button onClick={() => setIntegrationsOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="space-y-3 mb-6">
                            {[
                                { icon: BookOpen, label: 'Notion & Markdown', sub: 'Sync and export notes to Notion', badge: 'Connected' },
                                { icon: Calendar, label: 'Calendar & Meetings', sub: 'Link recordings to calendar events', badge: 'Active' },
                                { icon: FileText, label: 'SQLite Database', sub: `${notes.length} notes stored locally`, badge: 'Local DB' },
                            ].map(({ icon: Icon, label, sub, badge }) => (
                                <div key={label} className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <Icon size={16} className="text-[var(--accent)]" />
                                        <div>
                                            <div className="text-xs font-bold text-[var(--text-primary)]">{label}</div>
                                            <div className="text-[10px] text-[var(--text-muted)]">{sub}</div>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">{badge}</span>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => setIntegrationsOpen(false)}
                            className="w-full py-2 rounded-xl bg-[var(--text-primary)] text-[var(--bg)] text-xs font-bold hover:opacity-90 transition-opacity"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

