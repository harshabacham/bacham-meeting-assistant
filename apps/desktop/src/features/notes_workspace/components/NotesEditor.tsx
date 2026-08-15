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
import { 
    Sparkles, Folder, Calendar as CalendarIcon, Hash, Plus, X, Download, 
    Copy, Check, Bold, Italic, Strikethrough, Code, Search, ChevronDown, 
    FileText, CheckSquare, Edit3, Mic, ArrowLeft, RefreshCw, Layers, 
    CheckCircle2, ListFilter, ArrowUpRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LiveTranscriptPanel } from './LiveTranscriptPanel';
import { TauriClient } from '@/infrastructure/tauri-client';

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
    const [dateMenuOpen, setDateMenuOpen] = useState(false);
    const [selectionMenu, setSelectionMenu] = useState<{ x: number; y: number } | null>(null);

    const folderMenuRef = useRef<HTMLDivElement>(null);
    const dateMenuRef = useRef<HTMLDivElement>(null);

    // ── 3-WAY VIEW MODES: 'summary' | 'notes' | 'transcript' ──────────────────────
    const [viewMode, setViewMode] = useState<'summary' | 'notes' | 'transcript'>('summary');
    const [rawTranscript, setRawTranscript] = useState<string>(() => note.transcript || localStorage.getItem(`transcript_${note.id}`) || '');
    const [aiSummary, setAiSummary] = useState<string>(() => note.summary || localStorage.getItem(`summary_${note.id}`) || '');
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [transcriptSearch, setTranscriptSearch] = useState<string>('');
    const [transcriptCopied, setTranscriptCopied] = useState(false);
    const [summaryCopied, setSummaryCopied] = useState(false);

    useEffect(() => {
        const storedTranscript = note.transcript || localStorage.getItem(`transcript_${note.id}`) || '';
        const storedSummary = note.summary || localStorage.getItem(`summary_${note.id}`) || '';
        setRawTranscript(storedTranscript);
        setAiSummary(storedSummary);
    }, [note.id, note.transcript, note.summary]);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
            }),
            Placeholder.configure({
                placeholder: "Write custom notes, thoughts, or agenda items...",
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
            if (dateMenuOpen && dateMenuRef.current && !dateMenuRef.current.contains(e.target as Node)) {
                setDateMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [folderMenuOpen, dateMenuOpen]);

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
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Clipboard API failed', err);
        }
    };

    const handleExportFile = () => {
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

    // ── AI Synthesis Engine ───────────────────────────────────────────────────
    const handleGenerateSummary = async (transcriptOverride?: string) => {
        const textToSummarize = transcriptOverride || rawTranscript || (editor ? editor.getText() : '');
        if (!textToSummarize.trim()) return;

        setIsGeneratingSummary(true);
        try {
            const prompt = `You are a world-class executive meeting assistant. Analyze the following meeting content/transcript and provide a polished, comprehensive structured summary in clean markdown format:

Meeting Title: "${note.title || 'Untitled Meeting'}"
Meeting Text:
${textToSummarize}

Structure your response with:
## ✨ Executive Overview
(A concise, high-impact 2-3 paragraph synthesis of key themes and outcomes)

## 🎯 Key Takeaways & Discussion Highlights
(Bulleted actionable insights, core discussion topics, and important context)

## 📋 Action Items & Deliverables
(Specific checkboxes or tasks with owners or timelines mentioned)

## 💡 Strategic Decisions & Next Steps
(Decisions finalized and agreed milestones)`;

            const response = await TauriClient.sendGlobalMemoryChat(prompt, []);
            setAiSummary(response);
            localStorage.setItem(`summary_${note.id}`, response);
            onUpdate({ summary: response });
            setViewMode('summary');
        } catch (err) {
            console.error('Failed to generate summary', err);
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    const handleProcessTranscript = (transcript: string) => {
        setIsTranscriptOpen(false);
        setRawTranscript(transcript);
        localStorage.setItem(`transcript_${note.id}`, transcript);
        onUpdate({ transcript });

        // Trigger AI summary generation immediately
        handleGenerateSummary(transcript);
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

    const handleCopySummary = async () => {
        if (!aiSummary) return;
        try {
            await navigator.clipboard.writeText(aiSummary);
            setSummaryCopied(true);
            setTimeout(() => setSummaryCopied(false), 2000);
        } catch (err) {
            console.error('Clipboard copy failed', err);
        }
    };

    const handleInsertSummaryToNotes = () => {
        if (!editor || !aiSummary) return;
        editor.commands.insertContent(`
            <div class="my-4 p-4 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border)] text-sm leading-relaxed">
                ${aiSummary.replace(/\n/g, '<br/>')}
            </div>
        `);
        setViewMode('notes');
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

    if (!editor) return null;

    // Filtered transcript lines
    const filteredTranscriptLines = (rawTranscript || '')
        .split('\n')
        .map(l => l.trim())
        .filter(l => Boolean(l) && (!transcriptSearch.trim() || l.toLowerCase().includes(transcriptSearch.toLowerCase())));

    const transcriptWordCount = (rawTranscript || '').split(/\s+/).filter(Boolean).length;
    const estimatedMinutes = Math.max(1, Math.round(transcriptWordCount / 140));

    return (
        <div className="flex flex-col h-full bg-[var(--bg)] overflow-hidden relative text-[var(--text-primary)] font-sans">

            {/* Minimal Top Header */}
            <div className="h-14 shrink-0 flex items-center justify-between pl-16 pr-24 sticky top-0 bg-[var(--bg)] z-30 border-b border-[var(--border)]/40 pointer-events-auto">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            if (onBack) onBack();
                            else navigate('/');
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border border-[var(--border)] text-xs font-medium shadow-sm cursor-pointer"
                        title="Back to Notes"
                    >
                        <ArrowLeft size={13} />
                        <span>Notes</span>
                    </button>
                </div>

                {/* ── 3-WAY TOP MODE SWITCHER: Summary | Notes | Transcript ──────────────── */}
                <div className="flex items-center p-1 rounded-full bg-[var(--surface-raised)] dark:bg-[#1c1c1a] border border-[var(--border)] shadow-sm pointer-events-auto gap-0.5">
                    {/* 1. Summary Button */}
                    <button
                        type="button"
                        onClick={() => setViewMode('summary')}
                        className={cn(
                            "flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs transition-all cursor-pointer",
                            viewMode === 'summary'
                                ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border)] font-bold text-emerald-600 dark:text-emerald-400"
                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium"
                        )}
                    >
                        <Sparkles size={12} className={viewMode === 'summary' ? "text-emerald-500" : ""} />
                        <span>Summary</span>
                        {aiSummary && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    </button>

                    {/* 2. Notes Button */}
                    <button
                        type="button"
                        onClick={() => setViewMode('notes')}
                        className={cn(
                            "flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs transition-all cursor-pointer",
                            viewMode === 'notes'
                                ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border)] font-bold text-emerald-600 dark:text-emerald-400"
                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium"
                        )}
                    >
                        <FileText size={12} className={viewMode === 'notes' ? "text-emerald-500" : ""} />
                        <span>Notes</span>
                    </button>

                    {/* 3. Transcript Button */}
                    <button
                        type="button"
                        onClick={() => setViewMode('transcript')}
                        className={cn(
                            "flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs transition-all cursor-pointer",
                            viewMode === 'transcript'
                                ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border)] font-bold text-emerald-600 dark:text-emerald-400"
                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium"
                        )}
                    >
                        <Mic size={12} className={viewMode === 'transcript' ? "text-emerald-500" : ""} />
                        <span>Transcript</span>
                        {rawTranscript && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    </button>
                </div>

                {/* Right Action Icons */}
                <div className="flex items-center gap-2 pointer-events-auto">
                    {/* Record Meeting Action Button */}
                    <button
                        type="button"
                        onClick={() => setIsTranscriptOpen(!isTranscriptOpen)}
                        className={cn(
                            "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all cursor-pointer",
                            isTranscriptOpen
                                ? "bg-red-500 hover:bg-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.4)]"
                                : "bg-[#3d5a22] hover:bg-[#344d1d] text-white"
                        )}
                        title="Record Meeting & Live Transcription"
                    >
                        <Mic size={13} className={isTranscriptOpen ? "animate-pulse" : ""} />
                        <span>{isTranscriptOpen ? 'Recording...' : 'Record'}</span>
                    </button>

                    <div className="h-4 w-px bg-[var(--border)] mx-0.5" />

                    <div className="flex items-center gap-1 text-[var(--text-muted)]">
                        <button
                            type="button"
                            onClick={handleCopyMarkdown}
                            className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors border border-transparent hover:border-[var(--border)] cursor-pointer"
                            title="Copy note markdown"
                        >
                            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                        <button
                            type="button"
                            onClick={handleExportFile}
                            className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors border border-transparent hover:border-[var(--border)] cursor-pointer"
                            title="Export markdown file"
                        >
                            <Download size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════════════════ */}
            {/* VIEW 1: ✨ SUMMARY MODE CANVAS                                              */}
            {/* ════════════════════════════════════════════════════════════════════════════ */}
            {viewMode === 'summary' && (
                <div className="flex-1 overflow-y-auto scroll-smooth">
                    <div className="max-w-3xl mx-auto px-8 pt-6 pb-48">
                        {/* Summary Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border)] mb-8">
                            <div>
                                <h1 className="text-2xl font-serif text-[var(--text-primary)] font-normal tracking-tight flex items-center gap-2">
                                    <span>AI Meeting Summary</span>
                                    {isGeneratingSummary && <RefreshCw size={16} className="animate-spin text-emerald-500" />}
                                </h1>
                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                    Synthesized with Google Gemini from your meeting notes & transcripts.
                                </p>
                            </div>

                            {/* Summary Actions */}
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => handleGenerateSummary()}
                                    disabled={isGeneratingSummary}
                                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                                >
                                    <RefreshCw size={12} className={isGeneratingSummary ? "animate-spin" : ""} />
                                    <span>{isGeneratingSummary ? 'Synthesizing...' : 'Re-generate'}</span>
                                </button>

                                {aiSummary && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={handleCopySummary}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all shadow-sm cursor-pointer"
                                            title="Copy Summary"
                                        >
                                            {summaryCopied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                                            <span>{summaryCopied ? 'Copied' : 'Copy'}</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleInsertSummaryToNotes}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-all shadow-sm cursor-pointer"
                                            title="Insert into Custom Notes"
                                        >
                                            <Plus size={13} />
                                            <span>Insert to Notes</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Summary Content */}
                        {aiSummary ? (
                            <div className="space-y-6 text-sm text-[var(--text-primary)] leading-relaxed font-sans prose prose-neutral dark:prose-invert max-w-none">
                                <div 
                                    className="p-6 rounded-3xl bg-[var(--surface-raised)] dark:bg-[#181816] border border-[var(--border)] shadow-xs space-y-4"
                                    dangerouslySetInnerHTML={{ 
                                        __html: aiSummary
                                            .replace(/^## (.*$)/gim, '<h3 class="text-base font-bold text-[var(--text-primary)] mt-4 mb-2 pb-1 border-b border-[var(--border)]/50">$1</h3>')
                                            .replace(/^### (.*$)/gim, '<h4 class="text-sm font-semibold text-[var(--text-primary)] mt-3 mb-1">$1</h4>')
                                            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-[var(--text-primary)]">$1</strong>')
                                            .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc text-xs text-[var(--text-primary)]">$1</li>')
                                            .replace(/\n/g, '<br/>')
                                    }} 
                                />
                            </div>
                        ) : (
                            /* Empty Summary State */
                            <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-3xl bg-[var(--surface-raised)] dark:bg-[#181816] border border-dashed border-[var(--border)]">
                                <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-500 mb-4 shadow-sm">
                                    <Sparkles size={32} />
                                </div>
                                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                                    No summary generated yet
                                </h3>
                                <p className="text-xs text-[var(--text-muted)] max-w-sm mb-6 leading-relaxed">
                                    Generate an AI-powered executive summary, discussion highlights, decisions, and action items directly from this note.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => handleGenerateSummary()}
                                    disabled={isGeneratingSummary}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
                                >
                                    <Sparkles size={14} className={isGeneratingSummary ? "animate-spin" : ""} />
                                    <span>{isGeneratingSummary ? 'Synthesizing...' : 'Generate AI Summary'}</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════════════ */}
            {/* VIEW 2: 📝 CUSTOM NOTES CANVAS                                              */}
            {/* ════════════════════════════════════════════════════════════════════════════ */}
            {viewMode === 'notes' && (
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
                                        <button type="button" onClick={() => { onUpdate({ eventDate: 'Today' }); setDateMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">Today</button>
                                        <button type="button" onClick={() => { onUpdate({ eventDate: 'Yesterday' }); setDateMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">Yesterday</button>
                                        <button type="button" onClick={() => { onUpdate({ eventDate: 'Last Week' }); setDateMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">Last Week</button>
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
                                            type="button"
                                            onClick={() => { onUpdate({ folderId: null }); setFolderMenuOpen(false); }}
                                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                                        >
                                            <Folder size={12} className="text-[var(--text-muted)]" />
                                            <span>All Notes</span>
                                        </button>
                                        {folders.map(f => (
                                            <button
                                                type="button"
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
                                    type="button"
                                    onClick={() => setIsAddingTag(true)}
                                    className="flex items-center gap-1 px-2.5 py-1 border border-dashed border-[var(--border)] rounded-full text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors cursor-pointer"
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
                                    type="button"
                                    onClick={() => editor.chain().focus().toggleBold().run()}
                                    className={cn("p-1.5 rounded-lg text-xs transition-colors cursor-pointer", editor.isActive('bold') ? "bg-[var(--surface-hover)] text-emerald-500" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]")}
                                    title="Bold"
                                >
                                    <Bold size={13} />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => editor.chain().focus().toggleItalic().run()}
                                    className={cn("p-1.5 rounded-lg text-xs transition-colors cursor-pointer", editor.isActive('italic') ? "bg-[var(--surface-hover)] text-emerald-500" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]")}
                                    title="Italic"
                                >
                                    <Italic size={13} />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => editor.chain().focus().toggleStrike().run()}
                                    className={cn("p-1.5 rounded-lg text-xs transition-colors cursor-pointer", editor.isActive('strike') ? "bg-[var(--surface-hover)] text-emerald-500" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]")}
                                    title="Strikethrough"
                                >
                                    <Strikethrough size={13} />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => editor.chain().focus().toggleCode().run()}
                                    className={cn("p-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer", editor.isActive('code') ? "bg-[var(--surface-hover)] text-emerald-500" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]")}
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
            )}

            {/* ════════════════════════════════════════════════════════════════════════════ */}
            {/* VIEW 3: 🎙️ TRANSCRIPT CANVAS                                                */}
            {/* ════════════════════════════════════════════════════════════════════════════ */}
            {viewMode === 'transcript' && (
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
                                        type="button"
                                        onClick={() => handleGenerateSummary()}
                                        disabled={isGeneratingSummary}
                                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                                        title="Generate notes and action items using AI"
                                    >
                                        <Sparkles size={13} className={isGeneratingSummary ? "animate-spin" : ""} />
                                        <span>{isGeneratingSummary ? 'Synthesizing...' : 'Synthesize Summary'}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleCopyTranscript}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all shadow-sm cursor-pointer"
                                        title="Copy full transcript"
                                    >
                                        {transcriptCopied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                                        <span>{transcriptCopied ? 'Copied' : 'Copy'}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleExportTranscriptFile}
                                        className="p-1.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all shadow-sm cursor-pointer"
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
                                        type="button"
                                        onClick={() => setTranscriptSearch('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
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
                                    type="button"
                                    onClick={() => setIsTranscriptOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#3d5a22] hover:bg-[#344d1d] text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
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
            type="button"
            onClick={onClick}
            className="flex items-center gap-1.5 px-3 py-1 bg-[var(--surface)] border border-[var(--border)] rounded-full text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-all shadow-sm cursor-pointer"
        >
            {children}
        </button>
    );
}
