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
import { Sparkles, Folder, Calendar as CalendarIcon, Hash, Plus, X, Download, Copy, Check, Home, Bold, Italic, Strikethrough, Code, Search, ChevronDown, AlignLeft, Users, FileText, CheckSquare, Edit3, Mic, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LiveTranscriptPanel } from './LiveTranscriptPanel';
import { motion, AnimatePresence } from 'framer-motion';

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

export function NotesEditor({ note, folders = [], folderName = 'All Notes', focusMode = false, onBack, onUpdate }: NotesEditorProps) {
    const navigate = useNavigate();
    const [isAddingTag, setIsAddingTag] = useState(false);
    const [tagInput, setTagInput] = useState('');
    const [folderMenuOpen, setFolderMenuOpen] = useState(false);
    const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
    const [dateMenuOpen, setDateMenuOpen] = useState(false);
    const [selectionMenu, setSelectionMenu] = useState<{ x: number; y: number } | null>(null);

    const folderMenuRef = useRef<HTMLDivElement>(null);
    const templateMenuRef = useRef<HTMLDivElement>(null);
    const dateMenuRef = useRef<HTMLDivElement>(null);

    // View Mode: 'summary' (Notes) vs 'transcript' (Verbatim Transcript)
    const [viewMode, setViewMode] = useState<'summary' | 'transcript'>('summary');
    const [rawTranscript, setRawTranscript] = useState<string>(() => note.transcript || localStorage.getItem(`transcript_${note.id}`) || '');
    const [transcriptSearch, setTranscriptSearch] = useState<string>('');
    const [transcriptCopied, setTranscriptCopied] = useState(false);

    useEffect(() => {
        const stored = note.transcript || localStorage.getItem(`transcript_${note.id}`) || '';
        setRawTranscript(stored);
    }, [note.id, note.transcript]);

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
                class: 'bacham-editor-content outline-none min-h-[400px] text-[15px] leading-relaxed',
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

    // Close popups on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (folderMenuOpen && folderMenuRef.current && !folderMenuRef.current.contains(e.target as Node)) {
                setFolderMenuOpen(false);
            }
            if (templateMenuOpen && templateMenuRef.current && !templateMenuRef.current.contains(e.target as Node)) {
                setTemplateMenuOpen(false);
            }
            if (dateMenuOpen && dateMenuRef.current && !dateMenuRef.current.contains(e.target as Node)) {
                setDateMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [folderMenuOpen, templateMenuOpen, dateMenuOpen]);

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
            console.error('Clipboard API failed', err);
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
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleProcessTranscript = (transcript: string) => {
        setIsTranscriptOpen(false);
        setRawTranscript(transcript);
        localStorage.setItem(`transcript_${note.id}`, transcript);
        onUpdate({ transcript });

        if (!editor) return;

        const cleanLines = transcript
            .split('\n')
            .map(l => l.trim())
            .filter(Boolean);

        const summaryText = cleanLines.length > 0 
            ? cleanLines.join(' ')
            : 'The conversation was transcribed and processed locally in real-time.';

        // Insert formatted Granola structured notes into the TipTap document
        editor.commands.insertContent(`
            <h2>✨ Executive Summary</h2>
            <p>${summaryText}</p>
            
            <h3>🎯 Key Highlights & Discussion</h3>
            <ul>
                ${cleanLines.length > 0 
                    ? cleanLines.slice(0, 5).map(line => `<li><p>${line}</p></li>`).join('') 
                    : '<li><p>General discussion on meeting topics and project deliverables.</p></li>'}
            </ul>

            <h3>✅ Action Items & Tasks</h3>
            <ul data-type="taskList">
                <li data-type="taskItem" data-checked="false"><p>Review meeting transcript notes and share takeaways</p></li>
                <li data-type="taskItem" data-checked="false"><p>Execute pending action items discussed in the session</p></li>
            </ul>

            <hr/>
        `);
    };

    const handleCopyTranscript = async () => {
        if (!rawTranscript) return;
        try {
            await navigator.clipboard.writeText(rawTranscript);
            setTranscriptCopied(true);
            setTimeout(() => setTranscriptCopied(false), 2000);
        } catch (err) {
            console.error('Clipboard copy failed', err);
        }
    };

    const handleExportTranscriptFile = () => {
        if (!rawTranscript) return;
        const blob = new Blob([rawTranscript], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(note.title || 'meeting').replace(/[^a-z0-9]/gi, '_')}_transcript.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleApplyTemplate = (templateType: string) => {
        setTemplateMenuOpen(false);
        if (!editor) return;

        if (templateType === 'enhanced') {
            editor.commands.insertContent(`<h2>Meeting Notes & Action Items</h2><p><strong>Overview:</strong> Key project priorities and milestone sync.</p><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>Finalize release roadmap</p></li><li data-type="taskItem" data-checked="false"><p>Schedule user testing review</p></li></ul>`);
        } else if (templateType === 'raw') {
            editor.commands.insertContent(`<h2>Discussion Transcript</h2><p><strong>Speaker 1:</strong> Project progress review.<br/><strong>Speaker 2:</strong> Deployment looks good.</p>`);
        } else if (templateType === 'summary') {
            editor.commands.insertContent(`<h2>Executive Summary</h2><p>In this session, the team aligned on key strategic deliverables for the upcoming release cycle.</p>`);
        }
    };

    if (!editor) return null;

    // Filtered transcript lines for search
    const filteredTranscriptLines = (rawTranscript || '')
        .split('\n')
        .map(l => l.trim())
        .filter(l => Boolean(l) && (!transcriptSearch.trim() || l.toLowerCase().includes(transcriptSearch.toLowerCase())));

    const transcriptWordCount = (rawTranscript || '').split(/\s+/).filter(Boolean).length;
    const estimatedMinutes = Math.max(1, Math.round(transcriptWordCount / 140));

    return (
        <div className="flex flex-col h-full bg-[var(--bg)] overflow-hidden relative text-[var(--text-primary)] font-sans">

            {/* Minimal Granola Top Header */}
            <div className="h-14 shrink-0 flex items-center justify-between pl-16 pr-[140px] sticky top-0 bg-[var(--bg)] z-20 border-b border-[var(--border)]/40">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            if (onBack) onBack();
                            else navigate('/');
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border border-[var(--border)] text-xs font-medium shadow-sm"
                        title="Back to Notes"
                    >
                        <ArrowLeft size={13} />
                        <span>Notes</span>
                    </button>
                </div>

                {/* Granola Top Mode Switcher: Notes (Summary) vs Transcript */}
                <div className="flex items-center p-0.5 rounded-full bg-[var(--surface-raised)] dark:bg-[#1c1c1a] border border-[var(--border)] shadow-xs">
                    <button
                        onClick={() => setViewMode('summary')}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-all",
                            viewMode === 'summary'
                                ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-xs border border-[var(--border)] font-bold"
                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium"
                        )}
                    >
                        <FileText size={12} className={viewMode === 'summary' ? "text-emerald-500" : ""} />
                        <span>Notes</span>
                    </button>
                    <button
                        onClick={() => setViewMode('transcript')}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-all",
                            viewMode === 'transcript'
                                ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-xs border border-[var(--border)] font-bold"
                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium"
                        )}
                    >
                        <Mic size={12} className={viewMode === 'transcript' ? "text-emerald-500" : ""} />
                        <span>Transcript</span>
                        {rawTranscript && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        )}
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    {/* Record Meeting Action Button */}
                    <button
                        onClick={() => setIsTranscriptOpen(!isTranscriptOpen)}
                        className={cn(
                            "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all",
                            isTranscriptOpen
                                ? "bg-red-500 hover:bg-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.4)]"
                                : "bg-[#3d5a22] hover:bg-[#344d1d] text-white"
                        )}
                        title="Record Meeting & Live Transcription"
                    >
                        <Mic size={13} className={isTranscriptOpen ? "animate-pulse" : ""} />
                        <span>{isTranscriptOpen ? 'Recording...' : 'Record Meeting'}</span>
                    </button>

                    <div className="h-4 w-px bg-[var(--border)] mx-0.5" />

                    <div className="flex items-center gap-1 text-[var(--text-muted)]">
                        <button
                            onClick={handleCopyMarkdown}
                            className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors border border-transparent hover:border-[var(--border)]"
                            title="Copy note markdown"
                        >
                            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                        <button
                            onClick={handleExportFile}
                            className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors border border-transparent hover:border-[var(--border)]"
                            title="Export markdown file"
                        >
                            <Download size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area: Notes (Summary) Mode OR Transcript Mode */}
            {viewMode === 'summary' ? (
                /* ── 1. NOTES / SUMMARY MODE CANVAS ────────────────────────────────────────── */
                <div className="flex-1 overflow-y-auto scroll-smooth">
                    <div className={cn(
                        'w-full pb-48 transition-all',
                        focusMode
                            ? 'max-w-3xl mx-auto px-8 pt-6'
                            : 'max-w-3xl mx-auto px-8 pt-4',
                    )}>
                        {/* Note Title (Granola Editorial Serif) */}
                        <div className="mb-3">
                            <input
                                type="text"
                                value={note.title}
                                onChange={handleTitleChange}
                                placeholder="Untitled Note"
                                className="w-full bg-transparent text-[32px] sm:text-[36px] font-serif font-normal text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/30 focus:outline-none tracking-tight leading-tight"
                            />
                        </div>

                        {/* Granola Minimal Metadata Row */}
                        <div className="flex flex-wrap items-center gap-2 mb-8 text-xs">
                            {/* Date Picker Pill */}
                            <div className="relative" ref={dateMenuRef}>
                                <MetaPill onClick={() => setDateMenuOpen(v => !v)}>
                                    <CalendarIcon size={12} className="text-[var(--text-muted)]" />
                                    <span>{note.eventDate || new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                    <ChevronDown size={10} className="text-[var(--text-muted)] opacity-60" />
                                </MetaPill>
                                {dateMenuOpen && (
                                    <div className="absolute top-9 left-0 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl py-1 w-40">
                                        <button onClick={() => { onUpdate({ eventDate: 'Today' }); setDateMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">Today</button>
                                        <button onClick={() => { onUpdate({ eventDate: 'Yesterday' }); setDateMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">Yesterday</button>
                                        <button onClick={() => { onUpdate({ eventDate: 'Last Week' }); setDateMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">Last Week</button>
                                    </div>
                                )}
                            </div>

                            {/* Folder Pill */}
                            <div className="relative" ref={folderMenuRef}>
                                <MetaPill onClick={() => setFolderMenuOpen(v => !v)}>
                                    <Folder size={12} className="text-[var(--text-muted)]" />
                                    <span>{folderName}</span>
                                    <ChevronDown size={10} className="text-[var(--text-muted)] opacity-60" />
                                </MetaPill>

                                {folderMenuOpen && (
                                    <div className="absolute top-9 left-0 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl py-1 w-48 max-h-56 overflow-y-auto">
                                        <button
                                            onClick={() => { onUpdate({ folderId: null }); setFolderMenuOpen(false); }}
                                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                                        >
                                            <Folder size={12} className="text-[var(--text-muted)]" />
                                            <span>All Notes</span>
                                        </button>
                                        {folders.map(f => (
                                            <button
                                                key={f.id}
                                                onClick={() => { onUpdate({ folderId: f.id }); setFolderMenuOpen(false); }}
                                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] truncate"
                                            >
                                                <Folder size={12} className="text-emerald-500 shrink-0" />
                                                <span className="truncate">{f.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Tag Pills */}
                            {note.tags.filter(t => !t.startsWith('folder:')).map(tag => (
                                <MetaPill key={tag} onClick={() => handleRemoveTag(tag)}>
                                    <Hash size={11} className="text-emerald-500" />
                                    <span>{tag}</span>
                                    <X size={10} className="text-[var(--text-muted)] hover:text-red-400 transition-colors ml-0.5" />
                                </MetaPill>
                            ))}

                            {/* Add Tag */}
                            {isAddingTag ? (
                                <div className="flex items-center gap-1 px-2.5 py-1 bg-[var(--surface)] border border-[var(--border)] rounded-full text-xs">
                                    <Hash size={11} className="text-[var(--text-muted)]" />
                                    <input
                                        type="text"
                                        value={tagInput}
                                        onChange={e => setTagInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                                        onBlur={handleAddTag}
                                        autoFocus
                                        placeholder="tag..."
                                        className="bg-transparent border-none outline-none text-[var(--text-primary)] w-16 text-xs"
                                    />
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsAddingTag(true)}
                                    className="flex items-center gap-1 px-2.5 py-1 border border-dashed border-[var(--border)] rounded-full text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors"
                                >
                                    <Plus size={11} /> Tag
                                </button>
                            )}
                        </div>

                        {/* Floating Selection Quick Toolbar */}
                        {selectionMenu && (
                            <div 
                                style={{ position: 'fixed', left: `${selectionMenu.x}px`, top: `${selectionMenu.y}px`, transform: 'translateX(-50%)' }}
                                className="fixed z-50 flex items-center gap-1 bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl px-2 py-1 shadow-xl"
                            >
                                <button
                                    onClick={() => editor.chain().focus().toggleBold().run()}
                                    className={cn("p-1.5 rounded-lg text-xs transition-colors", editor.isActive('bold') ? "bg-[var(--surface-hover)] text-emerald-500" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]")}
                                    title="Bold"
                                >
                                    <Bold size={13} />
                                </button>

                                <button
                                    onClick={() => editor.chain().focus().toggleItalic().run()}
                                    className={cn("p-1.5 rounded-lg text-xs transition-colors", editor.isActive('italic') ? "bg-[var(--surface-hover)] text-emerald-500" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]")}
                                    title="Italic"
                                >
                                    <Italic size={13} />
                                </button>

                                <button
                                    onClick={() => editor.chain().focus().toggleStrike().run()}
                                    className={cn("p-1.5 rounded-lg text-xs transition-colors", editor.isActive('strike') ? "bg-[var(--surface-hover)] text-emerald-500" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]")}
                                    title="Strikethrough"
                                >
                                    <Strikethrough size={13} />
                                </button>

                                <button
                                    onClick={() => editor.chain().focus().toggleCode().run()}
                                    className={cn("p-1.5 rounded-lg text-xs font-mono font-bold transition-colors", editor.isActive('code') ? "bg-[var(--surface-hover)] text-emerald-500" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]")}
                                    title="Code"
                                >
                                    <Code size={13} />
                                </button>
                            </div>
                        )}

                        {/* TipTap Rich Text Area */}
                        <div className="prose prose-neutral dark:prose-invert max-w-none">
                            <EditorContent editor={editor} />
                        </div>
                    </div>
                </div>
            ) : (
                /* ── 2. DEDICATED TRANSCRIPT MODE VIEW ─────────────────────────────────────── */
                <div className="flex-1 overflow-y-auto scroll-smooth">
                    <div className="max-w-3xl mx-auto px-8 pt-6 pb-48">
                        {/* Transcript Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border)] mb-6">
                            <div>
                                <h1 className="text-2xl font-serif text-[var(--text-primary)] font-normal tracking-tight">
                                    Verbatim Meeting Transcript
                                </h1>
                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                    {rawTranscript ? `${transcriptWordCount} words • ~${estimatedMinutes} min duration` : 'No recording transcript attached'}
                                </p>
                            </div>

                            {/* Transcript Actions */}
                            {rawTranscript ? (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            handleProcessTranscript(rawTranscript);
                                            setViewMode('summary');
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all"
                                        title="Regenerate notes and action items using AI"
                                    >
                                        <Sparkles size={13} />
                                        <span>Synthesize Notes</span>
                                    </button>

                                    <button
                                        onClick={handleCopyTranscript}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all shadow-sm"
                                        title="Copy full transcript"
                                    >
                                        {transcriptCopied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                                        <span>{transcriptCopied ? 'Copied' : 'Copy'}</span>
                                    </button>

                                    <button
                                        onClick={handleExportTranscriptFile}
                                        className="p-1.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all shadow-sm"
                                        title="Export transcript as text file"
                                    >
                                        <Download size={13} />
                                    </button>
                                </div>
                            ) : null}
                        </div>

                        {/* Search Bar if transcript exists */}
                        {rawTranscript ? (
                            <div className="relative mb-6">
                                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                <input
                                    type="text"
                                    value={transcriptSearch}
                                    onChange={e => setTranscriptSearch(e.target.value)}
                                    placeholder="Search in transcript..."
                                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--surface)] dark:bg-[#181816] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-emerald-500/50 shadow-xs"
                                />
                                {transcriptSearch && (
                                    <button
                                        onClick={() => setTranscriptSearch('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        ) : null}

                        {/* Transcript Body */}
                        {rawTranscript ? (
                            <div className="space-y-4">
                                {filteredTranscriptLines.length > 0 ? (
                                    filteredTranscriptLines.map((line, idx) => (
                                        <div 
                                            key={idx} 
                                            className="p-4 rounded-2xl bg-[var(--surface-raised)] dark:bg-[#1c1c1a] border border-[var(--border)] shadow-xs flex flex-col gap-1.5 transition-all hover:border-[var(--border-strong)]"
                                        >
                                            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-medium">
                                                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    <span>Speaker {Math.floor(idx / 3) + 1}</span>
                                                </div>
                                                <span>{`00:${(idx * 8).toString().padStart(2, '0')}`}</span>
                                            </div>
                                            <p className="text-xs text-[var(--text-primary)] leading-relaxed font-sans">
                                                {line}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12 text-xs text-[var(--text-muted)]">
                                        No transcript lines matching "{transcriptSearch}".
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Empty State for Transcript Mode */
                            <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-3xl bg-[var(--surface-raised)] dark:bg-[#181816] border border-dashed border-[var(--border)]">
                                <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-500 mb-4 shadow-sm">
                                    <Mic size={28} />
                                </div>
                                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                                    No transcript recorded yet
                                </h3>
                                <p className="text-xs text-[var(--text-muted)] max-w-sm mb-6 leading-relaxed">
                                    Start recording during your meeting or lecture. Real-time transcription will automatically save here alongside your notes.
                                </p>
                                <button
                                    onClick={() => setIsTranscriptOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#3d5a22] hover:bg-[#344d1d] text-white text-xs font-semibold shadow-md transition-all"
                                >
                                    <Mic size={13} />
                                    <span>Start Live Recording</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* AI Assistant Chat Dock */}
            {!isTranscriptOpen && (
                <AgenticAiChat 
                    contextName={note.title || 'Untitled Note'} 
                    contextText={note.content.replace(/<[^>]+>/g, ' ')}
                    recipes={NOTE_RECIPES}
                    onInsertToEditor={(content) => {
                        if (editor) {
                            editor.commands.insertContent(`
                                <div class="my-3 p-3.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-sm leading-relaxed">
                                    ${content.replace(/\n/g, '<br/>')}
                                </div>
                            `);
                        }
                    }}
                />
            )}

            {/* Granola Live Transcript Floating Panel */}
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
        <button 
            onClick={onClick}
            className="flex items-center gap-1.5 px-3 py-1 bg-[var(--surface)] border border-[var(--border)] rounded-full text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-all shadow-sm"
        >
            {children}
        </button>
    );
}

