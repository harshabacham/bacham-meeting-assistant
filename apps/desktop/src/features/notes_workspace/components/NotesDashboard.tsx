import React, { useState, useMemo } from 'react';
import { Note } from '../NotesWorkspacePage';
import { 
    Folder, CheckSquare, FileText, Plus, Sparkles, Calendar, Lock, 
    Video, ArrowRight, Link2, X, BookOpen 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AgenticAiChat, AiRecipe } from './AgenticAiChat';
import { useCalendarStore } from '@/shared/stores/calendarStore';

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
        prompt: (folderName: string) => `Extract every single pending action item, todo, task, and deadline mentioned across the notes in "${folderName}". Present them as a bulleted checklist grouped by note title.`,
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
    onSelectFolder?: (folderId: string | null) => void;
    lectures?: any[];
    onCreateNote: () => void;
    onSelectNote: (id: string | null) => void;
}

export function NotesDashboard({ 
    notes, 
    folders = [], 
    activeFolderId = null,
    onSelectFolder,
    lectures = [], 
    onCreateNote, 
    onSelectNote 
}: NotesDashboardProps) {
    const navigate = useNavigate();
    const [searchQuery] = useState('');
    const [activeTab] = useState<'notes' | 'files'>('notes');
    const [filterMode] = useState<'all' | 'todos' | 'projects'>('all');
    
    // Calendar Integration
    const calendarEvents = useCalendarStore(state => state.events);
    const isCalendarConnected = useCalendarStore(state => state.isConnected);
    const todayEvents = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        return calendarEvents.filter((event: any) => {
            if (!event.dateStr) return false;
            const eventDate = new Date(event.dateStr);
            return eventDate >= today && eventDate < tomorrow;
        }).slice(0, 5);
    }, [calendarEvents]);

    // Integrations Modal State
    const [integrationsOpen, setIntegrationsOpen] = useState(false);

    const activeFolder = useMemo(() => {
        if (activeFolderId && folders.length > 0) {
            return folders.find(f => f.id === activeFolderId) || null;
        }
        return null;
    }, [activeFolderId, folders]);

    const activeFolderName = activeFolder ? activeFolder.name : 'My notes';

    // Filter notes
    const filteredNotes = useMemo(() => {
        let result = [...notes];

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
            <div className="flex-1 overflow-y-auto pb-32">
                {/* Minimal Top Control Bar */}
                <div className="h-12 shrink-0 flex items-center justify-between pl-6 pr-[140px] sticky top-0 bg-[var(--bg)] z-20">
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => onSelectFolder && onSelectFolder(null)}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                        title="All Folders"
                    >
                        <Folder size={14} />
                    </button>
                </div>
                {/* New Note Button — always visible */}
                <button
                    onClick={onCreateNote}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--text-primary)] text-[var(--bg)] text-xs font-semibold hover:opacity-90 active:scale-95 transition-all shadow-sm"
                    title="Create a new note"
                >
                    <Plus size={13} />
                    New Note
                </button>
            </div>

            {/* Main Content Area */}
            <div className="max-w-3xl w-full mx-auto px-6 pt-12 pb-32 flex-1 flex flex-col">
                
                {/* Minimal Header */}
                <div className="flex flex-col items-center justify-center pb-10 text-center">
                    <div className="mb-3 text-[var(--text-muted)]">
                        <Lock size={14} className="fill-current opacity-60" />
                    </div>
                    <h1 className="text-[32px] font-serif font-medium text-[var(--text-primary)] tracking-tight mb-2">
                        {activeFolderName}
                    </h1>
                    <p className="text-[13px] text-[var(--text-muted)] mb-4">
                        Notes from all of your private folders.
                    </p>
                    <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)]">
                        <Lock size={10} className="opacity-60" />
                        <span>Your private notes and folders · {folders.length} folder{folders.length !== 1 ? 's' : ''}</span>
                    </div>
                </div>

                {/* Dashboard AI Chat */}

                <div className="w-full flex justify-center mb-16 relative">
                    <AgenticAiChat 
                        contextName={activeFolderName} 
                        contextText={filteredNotes.slice(0, 15).map(n => `Title: ${n.title}\nContent: ${n.content.replace(/<[^>]+>/g, ' ')}`).join('\n---\n')}
                        recipes={DASHBOARD_RECIPES}
                        position="relative"
                    />
                </div>

                {/* Main Content Area */}
                {activeTab === 'notes' ? (
                    <div className="flex flex-col">
                        {filteredNotes.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 px-4">
                                <div className="flex flex-col items-center">
                                    <h3 className="font-medium text-[var(--text-primary)] text-sm mb-1">
                                        {searchQuery || filterMode !== 'all' ? 'No Actionable Notes' : 'No Notes Found'}
                                    </h3>
                                    <p className="text-[var(--text-muted)] text-xs text-center max-w-[250px] mb-6">
                                        {searchQuery || filterMode !== 'all' ? 'Try adjusting your search query or filter settings.' : 'Start writing to keep track of key insights and takeaways.'}
                                    </p>
                                    <button 
                                        onClick={onCreateNote} 
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--text-primary)] text-[var(--bg)] text-xs font-medium hover:opacity-90 transition-colors shadow-sm"
                                    >
                                        <Plus size={14} /> Create note
                                    </button>
                                </div>
                            </div>
                        )}

                        {filteredNotes.length > 0 && <div className="h-px bg-[var(--border)] w-full my-6"></div>}

                        {filteredNotes.map((note, idx) => {
                            const date = new Date(note.updatedAt);
                            const today = new Date();
                            const yesterday = new Date(today);
                            yesterday.setDate(yesterday.getDate() - 1);

                            let dateLabel: string;
                            if (date.toDateString() === today.toDateString()) {
                                dateLabel = `Today`;
                            } else if (date.toDateString() === yesterday.toDateString()) {
                                dateLabel = `Yesterday`;
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
                                        <div className="text-[11px] font-medium text-[var(--text-muted)] mt-6 mb-3 first:mt-0 px-2">
                                            {dateLabel}
                                        </div>
                                    )}

                                    <div 
                                        onClick={() => onSelectNote(note.id)}
                                        className="group flex items-center justify-between p-2.5 -mx-2.5 rounded-xl hover:bg-[var(--surface-hover)] cursor-pointer transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 rounded-lg bg-[var(--surface-hover)] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
                                                <FileText size={16} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[13px] font-medium text-[var(--text-primary)]">
                                                    {note.title || 'Untitled Note'}
                                                </span>
                                                <span className="text-[11px] text-[var(--text-muted)] mt-0.5">Me</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <span className="text-[11px] text-[var(--text-muted)] font-medium">
                                                {timeString}
                                            </span>
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col space-y-2">
                        {lectures.length === 0 ? (
                            <div className="text-center py-16 text-sm text-[var(--text-muted)] italic">
                                No files or recordings in this folder yet.
                            </div>
                        ) : (
                            lectures.map((item: any) => (
                                <div 
                                    key={item.id}
                                    onClick={() => navigate(`/lectures/${item.id}`)}
                                    className="flex items-center justify-between p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-accent)] transition-colors cursor-pointer group"
                                >
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <div className="p-2 rounded-xl bg-[var(--surface-hover)] text-[var(--text-primary)]">
                                            <Video size={16} />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-bold text-[var(--text-primary)] truncate">{item.title}</span>
                                            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-0.5">
                                                {item.courseLabel && <span>{item.courseLabel}</span>}
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={10} />
                                                    {new Date(item.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <ArrowRight size={14} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] group-hover:translate-x-1 transition-all shrink-0" />
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            </div>

            {/* Integrations Modal */}
            {integrationsOpen && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[var(--surface)] border border-[var(--border-accent)] rounded-2xl p-6 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
                            <div className="flex items-center gap-2 font-bold text-sm text-[var(--text-primary)]">
                                <Link2 size={16} className="text-[var(--accent)]" />
                                <span>Workspace Integrations</span>
                            </div>
                            <button onClick={() => setIntegrationsOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <BookOpen size={16} className="text-[var(--accent)]" />
                                    <div>
                                        <div className="text-xs font-bold text-[var(--text-primary)]">Notion & Markdown</div>
                                        <div className="text-[10px] text-[var(--text-muted)]">Sync and export notes to Notion</div>
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">Connected</span>
                            </div>

                            <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <Calendar size={16} className="text-[var(--accent)]" />
                                    <div>
                                        <div className="text-xs font-bold text-[var(--text-primary)]">Calendar & Meetings</div>
                                        <div className="text-[10px] text-[var(--text-muted)]">Link recordings to calendar events</div>
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">Active</span>
                            </div>

                            <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <FileText size={16} className="text-[var(--accent)]" />
                                    <div>
                                        <div className="text-xs font-bold text-[var(--text-primary)]">SQLite Database</div>
                                        <div className="text-[10px] text-[var(--text-muted)]">{notes.length} notes stored locally</div>
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">Local DB</span>
                            </div>
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
