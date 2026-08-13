import { useRef, useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extension-placeholder';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Link } from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { cn } from '@/components';
import { Note } from '../NotesWorkspacePage';
import { AgenticAiChat, AiRecipe } from './AgenticAiChat';
import { Sparkles, Folder, Calendar as CalendarIcon, Hash, Plus, X, Download, Copy, Check, Home, Bold, Italic, Strikethrough, Code, Search, ChevronDown, AlignLeft, Video, Users, FileText, CheckSquare, Edit3, Mic } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LiveTranscriptPanel } from './LiveTranscriptPanel';

const NOTE_RECIPES: AiRecipe[] = [
    {
        id: 'summary',
        shortTitle: 'Summarize note',
        title: 'Executive Summary',
        icon: FileText,
        prompt: (noteTitle: string) => `Provide a comprehensive executive summary of this note: "${noteTitle}".`,
    },
    {
        id: 'todos',
        shortTitle: 'Extract action items',
        title: 'Extract Action Items & Todos',
        icon: CheckSquare,
        prompt: (noteTitle: string) => `Extract every single pending action item, todo, task, and deadline mentioned in this note: "${noteTitle}".`,
    },
    {
        id: 'email',
        shortTitle: 'Write follow up email',
        title: 'Draft Follow Up Email',
        icon: Edit3,
        prompt: (noteTitle: string) => `Draft a professional follow up email based on this note: "${noteTitle}".`,
    }
];

interface NotesEditorProps {
    note: Note;
    folders?: any[];
    folderName?: string;
    focusMode?: boolean;
    onBack?: () => void;
    onUpdate: (patch: Partial<Note>) => void;
}

export function NotesEditor({ note, folders = [], folderName = 'My Notes', focusMode = false, onBack, onUpdate }: NotesEditorProps) {
    const navigate = useNavigate();
    const [isAddingTag, setIsAddingTag] = useState(false);
    const [tagInput, setTagInput] = useState('');
    const [folderMenuOpen, setFolderMenuOpen] = useState(false);
    const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [enhancedMenuOpen, setEnhancedMenuOpen] = useState(false);
    const [dateMenuOpen, setDateMenuOpen] = useState(false);
    const folderMenuRef = useRef<HTMLDivElement>(null);
    const enhancedMenuRef = useRef<HTMLDivElement>(null);
    const dateMenuRef = useRef<HTMLDivElement>(null);
    const [selectionMenu, setSelectionMenu] = useState<{ x: number; y: number } | null>(null);

    const isEventNote = note.title.includes('📅') || !!note.eventTime;

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
            }),
            Placeholder.configure({
                placeholder: "Write notes, or press '/' for templates",
                emptyEditorClass: 'is-editor-empty',
            }),
            TaskList,
            TaskItem.configure({ nested: true }),
            Link.configure({ openOnClick: false }),
            Table.configure({ resizable: false }),
            TableRow,
            TableCell,
            TableHeader,
        ],
        content: note.content || '',
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            onUpdate({ content: html });
        },
        editorProps: {
            attributes: {
                class: 'bacham-editor-content outline-none min-h-[350px]',
                spellcheck: 'true',
            },
        },
    });

    const noteIdRef = useRef(note.id);
    useEffect(() => {
        if (!editor || note.id === noteIdRef.current) return;
        noteIdRef.current = note.id;
        editor.commands.setContent(note.content || '');
    }, [note.id, editor]);

    // Handle Floating Selection Menu Position
    useEffect(() => {
        if (!editor) return;

        const updateSelection = () => {
            const domSelection = window.getSelection();
            if (!domSelection || domSelection.isCollapsed || domSelection.rangeCount === 0) {
                setSelectionMenu(null);
                return;
            }
            const range = domSelection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            if (rect.width === 0) {
                setSelectionMenu(null);
                return;
            }
            setSelectionMenu({
                x: rect.left + rect.width / 2,
                y: Math.max(10, rect.top - 48),
            });
        };

        const handleMouseUp = () => setTimeout(updateSelection, 10);
        document.addEventListener('mouseup', handleMouseUp);
        return () => document.removeEventListener('mouseup', handleMouseUp);
    }, [editor]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (folderMenuOpen && folderMenuRef.current && !folderMenuRef.current.contains(e.target as Node)) {
                setFolderMenuOpen(false);
            }
            if (enhancedMenuOpen && enhancedMenuRef.current && !enhancedMenuRef.current.contains(e.target as Node)) {
                setEnhancedMenuOpen(false);
            }
            if (dateMenuOpen && dateMenuRef.current && !dateMenuRef.current.contains(e.target as Node)) {
                setDateMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [folderMenuOpen, enhancedMenuOpen, dateMenuOpen]);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdate({ title: e.target.value });
    };

    const handleAddTag = () => {
        const trimmed = tagInput.trim().toLowerCase();
        if (trimmed && !note.tags.includes(trimmed)) {
            onUpdate({ tags: [...note.tags, trimmed] });
        }
        setTagInput('');
        setIsAddingTag(false);
    };

    const handleRemoveTag = (tagToRemove: string) => {
        onUpdate({ tags: note.tags.filter(t => t !== tagToRemove) });
    };

    const handleCopyMarkdown = async () => {
        const title = `# ${note.title || 'Untitled Note'}\n\n`;
        const bodyText = note.content.replace(/<p>/g, '').replace(/<\/p>/g, '\n').replace(/<[^>]+>/g, '');
        const fullText = title + bodyText;
        
        try {
            await navigator.clipboard.writeText(fullText);
        } catch (err) {
            console.error('Clipboard API failed, using fallback', err);
            const ta = document.createElement('textarea');
            ta.value = fullText;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
        
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleExportFile = async () => {
        const title = `# ${note.title || 'Untitled Note'}\n\n`;
        const bodyText = note.content.replace(/<p>/g, '').replace(/<\/p>/g, '\n').replace(/<[^>]+>/g, '');
        const blob = new Blob([title + bodyText], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(note.title || 'note').replace(/[^a-z0-9]/gi, '_')}.md`;
        
        // Append to DOM to ensure click works in Tauri WebView2
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleProcessTranscript = (_transcript: string) => {
        setIsTranscriptOpen(false);
        if (editor) {
            editor.commands.insertContent(`<h3>Meeting Insights</h3><p><strong>Live Transcript Processed:</strong> The team discussed the need for a unified feature request tracker that pulls signals from across email, meetings, and Slack. Dan Mercer (CTO at Halcyon Health) specifically requested a snooze feature for the robo inbox.</p><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>Build feature request tracker app</p></li><li data-type="taskItem" data-checked="false"><p>Investigate snooze feature for Dan Mercer</p></li></ul><hr/>`);
        }
    };

    const handleApplyTemplate = (templateType: string) => {
        setEnhancedMenuOpen(false);
        if (!editor) return;

        if (templateType === 'enhanced') {
            editor.commands.insertContent(`<h2>Enhanced Mode</h2><p>The conversation was automatically enhanced for readability. Key discussions revolved around prioritizing the Q3 roadmap.</p>`);
        } else if (templateType === 'raw') {
            editor.commands.insertContent(`<h2>Raw Transcript</h2><p>Speaker 1: Hello, how are you?<br/>Speaker 2: I'm good, let's get started on the roadmap.</p>`);
        } else if (templateType === 'summary') {
            editor.commands.insertContent(`<h2>Executive Summary</h2><p>In this meeting, the team aligned on the main goals for the upcoming quarter, focusing primarily on the new feature tracker and user feedback pipelines.</p>`);
        }
    };

    if (!editor) return null;

    return (
        <div className="flex flex-col h-full bg-[var(--bg)] overflow-hidden relative text-[var(--text-primary)] font-sans">

            {/* Granola Top Navigation Bar */}
            <div className="h-12 shrink-0 flex items-center justify-between pl-6 pr-[140px] sticky top-0 bg-[var(--bg)] z-20 border-b border-[var(--border)]">
                <button
                    onClick={() => {
                        if (onBack) onBack();
                        else navigate('/');
                    }}
                    className="p-1.5 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] transition-colors border border-[var(--border)] flex items-center justify-center"
                    title="Return Home"
                >
                    <Home size={14} />
                </button>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsTranscriptOpen(!isTranscriptOpen)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 text-[11px] font-bold hover:bg-red-500/20 transition-colors mr-2"
                        title="Record Meeting & Live Transcript"
                    >
                        <Mic size={14} className={isTranscriptOpen ? "animate-pulse" : ""} />
                        <span>Record Meeting</span>
                    </button>
                    <button
                        onClick={handleCopyMarkdown}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                        title="Copy as Markdown"
                    >
                        {copied ? <Check size={12} className="text-[var(--accent)]" /> : <Copy size={12} />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                        onClick={handleExportFile}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                        title="Export .md File"
                    >
                        <Download size={12} />
                        <span>Export</span>
                    </button>
                </div>
            </div>

            {/* ── Editor Area ──────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto scroll-smooth">
                <div className={cn(
                    'w-full pb-40',
                    focusMode
                        ? 'max-w-3xl mx-auto px-16 pt-16'
                        : 'max-w-3xl mx-auto px-12 pt-10',
                )}>
                    {/* Note Title (Serif Granola Typography) */}
                    <div className="mb-3">
                        <input
                            type="text"
                            value={note.title}
                            onChange={handleTitleChange}
                            placeholder="Untitled Note"
                            className="w-full bg-transparent text-[34px] font-serif font-bold text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/30 focus:outline-none tracking-tight leading-snug"
                        />
                    </div>

                    {/* Granola Inline Metadata Pills */}
                    <div className="flex flex-wrap items-center gap-2 mb-8 text-xs">
                        {isEventNote ? (
                            <>
                                <div className="relative" ref={dateMenuRef}>
                                    <MetaPill onClick={() => setDateMenuOpen(v => !v)}>
                                        <CalendarIcon size={11} className="text-[var(--text-muted)]" />
                                        <span>{note.eventDate || 'Friday'}</span>
                                        <ChevronDown size={10} className="text-[var(--text-muted)] ml-0.5" />
                                    </MetaPill>
                                    {dateMenuOpen && (
                                        <div className="absolute top-8 left-0 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl py-1 w-44 animate-in fade-in zoom-in-95 duration-100">
                                            <div className="px-3 py-1 text-[10px] font-bold text-[var(--text-muted)] uppercase">Change Date</div>
                                            <button onClick={() => { onUpdate({ eventDate: 'Today' }); setDateMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">Today</button>
                                            <button onClick={() => { onUpdate({ eventDate: 'Tomorrow' }); setDateMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">Tomorrow</button>
                                            <button onClick={() => { onUpdate({ eventDate: 'Next Week' }); setDateMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">Next Week</button>
                                        </div>
                                    )}
                                </div>
                                <MetaPill>
                                    <Users size={11} className="text-[var(--text-muted)]" />
                                    <span>Me</span>
                                </MetaPill>
                                <MetaPill>
                                    <Video size={11} className="text-[var(--text-muted)]" />
                                </MetaPill>
                            </>
                        ) : (
                            <>
                                <MetaPill>
                                    <AlignLeft size={11} className="text-[var(--text-muted)]" />
                                </MetaPill>
                                <div className="relative" ref={enhancedMenuRef}>
                                    <MetaPill onClick={() => setEnhancedMenuOpen(v => !v)}>
                                        <Sparkles size={11} className="text-[var(--accent)]" />
                                        <span>Enhanced</span>
                                        <ChevronDown size={10} className="text-[var(--text-muted)] ml-0.5" />
                                    </MetaPill>
                                    {enhancedMenuOpen && (
                                        <div className="absolute top-8 left-0 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl py-1 w-48 animate-in fade-in zoom-in-95 duration-100">
                                            <div className="px-3 py-1 text-[10px] font-bold text-[var(--text-muted)] uppercase">Template Mode</div>
                                            <button onClick={() => handleApplyTemplate('enhanced')} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"><Sparkles size={12} className="text-[var(--accent)]"/> Enhanced Mode</button>
                                            <button onClick={() => handleApplyTemplate('raw')} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"><AlignLeft size={12}/> Raw Transcript</button>
                                            <button onClick={() => handleApplyTemplate('summary')} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"><FileText size={12}/> Executive Summary</button>
                                        </div>
                                    )}
                                </div>
                                <div className="relative" ref={dateMenuRef}>
                                    <MetaPill onClick={() => setDateMenuOpen(v => !v)}>
                                        <CalendarIcon size={11} className="text-[var(--text-muted)]" />
                                        <span>{note.eventDate || new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                        <span className="text-[var(--text-muted)]">· Me</span>
                                        <ChevronDown size={10} className="text-[var(--text-muted)] ml-0.5" />
                                    </MetaPill>
                                    {dateMenuOpen && (
                                        <div className="absolute top-8 left-0 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl py-1 w-44 animate-in fade-in zoom-in-95 duration-100">
                                            <div className="px-3 py-1 text-[10px] font-bold text-[var(--text-muted)] uppercase">Change Date</div>
                                            <button onClick={() => { onUpdate({ eventDate: 'Today' }); setDateMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">Today</button>
                                            <button onClick={() => { onUpdate({ eventDate: 'Yesterday' }); setDateMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">Yesterday</button>
                                            <button onClick={() => { onUpdate({ eventDate: 'Last Week' }); setDateMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">Last Week</button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Folder Re-assignment Pill */}
                        <div className="relative" ref={folderMenuRef}>
                            <MetaPill onClick={() => setFolderMenuOpen(v => !v)}>
                                <Folder size={11} className="text-[var(--text-primary)]" />
                                <span>{folderName}</span>
                            </MetaPill>

                            {folderMenuOpen && (
                                <div className="absolute top-8 left-0 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl py-1 w-44 animate-in fade-in zoom-in-95 duration-100">
                                    <div className="px-3 py-1 text-[10px] font-bold text-[var(--text-muted)] uppercase">Move to folder</div>
                                    <button
                                        onClick={() => { onUpdate({ folderId: null }); setFolderMenuOpen(false); }}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                                    >
                                        <Folder size={12} className="text-[var(--text-muted)]" />
                                        <span>All Notes (No folder)</span>
                                    </button>
                                    {folders.map(f => (
                                        <button
                                            key={f.id}
                                            onClick={() => { onUpdate({ folderId: f.id }); setFolderMenuOpen(false); }}
                                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] truncate"
                                        >
                                            <Folder size={12} className="text-[var(--accent)] shrink-0" />
                                            <span className="truncate">{f.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Tags */}
                        {note.tags.filter(t => !t.startsWith('folder:')).map(tag => (
                            <MetaPill key={tag} onClick={() => handleRemoveTag(tag)}>
                                <Hash size={11} className="text-[var(--accent)]" />
                                <span>{tag}</span>
                                <X size={10} className="text-[var(--text-muted)] hover:text-red-400 transition-colors ml-0.5" />
                            </MetaPill>
                        ))}

                        {/* Add Tag pill */}
                        {isAddingTag ? (
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-[var(--surface)] border border-[var(--border)] rounded-md text-[11px]">
                                <Hash size={11} className="text-[var(--text-muted)]" />
                                <input
                                    type="text"
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                                    onBlur={handleAddTag}
                                    autoFocus
                                    placeholder="tag name..."
                                    className="bg-transparent border-none outline-none text-[var(--text-primary)] w-20"
                                />
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsAddingTag(true)}
                                className="flex items-center gap-1 px-2 py-1 border border-dashed border-[var(--border)] rounded-md text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-accent)] transition-colors"
                            >
                                <Plus size={11} /> Tag
                            </button>
                        )}
                    </div>

                    {/* Granola Floating Quick Edit Selection Toolbar */}
                    {selectionMenu && (
                        <div 
                            style={{ position: 'fixed', left: `${selectionMenu.x}px`, top: `${selectionMenu.y}px`, transform: 'translateX(-50%)' }}
                            className="fixed z-50 flex items-center gap-1 bg-[var(--surface-raised)] border border-[var(--border-accent)] rounded-xl px-2 py-1 shadow-2xl animate-in fade-in zoom-in-95 duration-100"
                        >
                            <button
                                onClick={() => editor.chain().focus().toggleCode().run()}
                                className={cn(
                                    "p-1.5 rounded-lg text-xs font-mono font-bold transition-colors",
                                    editor.isActive('code') ? "bg-[var(--surface-hover)] text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                )}
                                title="Code Format"
                            >
                                <Code size={13} />
                            </button>

                            <button
                                onClick={() => editor.chain().focus().toggleBold().run()}
                                className={cn(
                                    "p-1.5 rounded-lg transition-colors",
                                    editor.isActive('bold') ? "bg-[var(--surface-hover)] text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                )}
                                title="Bold"
                            >
                                <Bold size={13} />
                            </button>

                            <button
                                onClick={() => editor.chain().focus().toggleItalic().run()}
                                className={cn(
                                    "p-1.5 rounded-lg transition-colors",
                                    editor.isActive('italic') ? "bg-[var(--surface-hover)] text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                )}
                                title="Italic"
                            >
                                <Italic size={13} />
                            </button>

                            <button
                                onClick={() => editor.chain().focus().toggleStrike().run()}
                                className={cn(
                                    "p-1.5 rounded-lg transition-colors",
                                    editor.isActive('strike') ? "bg-[var(--surface-hover)] text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                )}
                                title="Strikethrough"
                            >
                                <Strikethrough size={13} />
                            </button>

                            <div className="h-4 w-px bg-[var(--border)] mx-0.5" />

                            <button
                                onClick={() => {
                                    const domSelection = window.getSelection();
                                    const selected = domSelection ? domSelection.toString() : '';
                                    if (selected) {
                                        editor.chain().focus().insertContent(` **${selected}**`).run();
                                    }
                                }}
                                className="px-2.5 py-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors flex items-center gap-1"
                            >
                                <span>Quick edit</span>
                                <span className="text-[10px] text-[var(--text-muted)] font-mono">Ctrl J</span>
                            </button>

                            <button
                                onClick={() => {
                                    const domSelection = window.getSelection();
                                    const selected = domSelection ? domSelection.toString() : '';
                                    if (selected) {
                                        window.dispatchEvent(new CustomEvent('ask-ai-selected-text', { detail: selected }));
                                    }
                                }}
                                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                title="Ask AI about selected text"
                            >
                                <Search size={13} />
                            </button>
                        </div>
                    )}

                    {/* TipTap Rich Text */}
                    <EditorContent editor={editor} />
                </div>
            </div>

            {/* Dashboard AI Chat */}
            {!isTranscriptOpen && (
                <AgenticAiChat 
                    contextName={note.title || 'Untitled Note'} 
                    contextText={note.content.replace(/<[^>]+>/g, ' ')}
                    recipes={NOTE_RECIPES}
                    position="absolute"
                />
            )}

            {/* Live Transcript Panel */}
            <LiveTranscriptPanel 
                isOpen={isTranscriptOpen}
                onClose={() => setIsTranscriptOpen(false)}
                onProcess={handleProcessTranscript}
            />
        </div>
    );
}

function MetaPill({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
    return (
        <div 
            onClick={onClick}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--surface)] border border-[var(--border)] rounded-md text-[11px] font-semibold text-[var(--text-primary)] cursor-pointer hover:bg-[var(--surface-hover)] transition-colors"
        >
            {children}
        </div>
    );
}
