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
    FileText, CheckSquare, Edit3, Mic, ArrowLeft, RefreshCw, Wand2, List
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LiveTranscriptPanel } from './LiveTranscriptPanel';
import { TauriClient } from '@/infrastructure/tauri-client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { convertFileSrc } from '@tauri-apps/api/core';

const StructuredSummaryViewer = ({ summaryString }: { summaryString: string }) => {
    try {
        const data = JSON.parse(summaryString);
        if (data && (data.executive_summary || data.discussion_points || data.key_takeaways)) {
            return (
                <div className="space-y-6">
                    {data.executive_summary && (
                        <div>
                            <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                                <Sparkles size={16} className="text-[var(--accent)]" />
                                Executive Summary
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                {data.executive_summary}
                            </p>
                        </div>
                    )}
                    {data.key_takeaways && data.key_takeaways.length > 0 && (
                        <div className="pt-2 border-t border-[var(--border)]">
                            <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                                <CheckSquare size={16} className="text-green-500" />
                                Key Takeaways
                            </h3>
                            <ul className="space-y-2">
                                {data.key_takeaways.map((takeaway: string, idx: number) => (
                                    <li key={idx} className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
                                        <span className="leading-relaxed">{takeaway}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {data.discussion_points && data.discussion_points.length > 0 && (
                        <div className="pt-2 border-t border-[var(--border)]">
                            <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                                <List size={16} className="text-blue-500" />
                                Discussion Points
                            </h3>
                            <div className="space-y-4">
                                {data.discussion_points.map((point: any, idx: number) => (
                                    <div key={idx} className="bg-black/5 dark:bg-white/5 rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="font-semibold text-sm text-[var(--text-primary)]">{point.topic}</span>
                                            <span className="text-xs font-medium text-[var(--text-muted)] bg-[var(--surface)] px-1.5 py-0.5 rounded border border-[var(--border)]">
                                                {point.timestamp}
                                            </span>
                                        </div>
                                        <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                                            {point.details}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {data.crm_metadata && (data.crm_metadata.action_items?.length > 0 || data.crm_metadata.key_decisions?.length > 0) && (
                        <div className="pt-2 border-t border-[var(--border)] grid grid-cols-2 gap-4">
                            {data.crm_metadata.action_items?.length > 0 && (
                                <div>
                                    <h4 className="text-[13px] font-semibold text-[var(--text-primary)] mb-2">Action Items</h4>
                                    <ul className="space-y-1.5">
                                        {data.crm_metadata.action_items.map((item: string, idx: number) => (
                                            <li key={idx} className="flex items-start gap-2 text-[13px] text-[var(--text-secondary)]">
                                                <div className="mt-1.5 w-1 h-1 rounded-full bg-red-500 shrink-0" />
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {data.crm_metadata.key_decisions?.length > 0 && (
                                <div>
                                    <h4 className="text-[13px] font-semibold text-[var(--text-primary)] mb-2">Key Decisions</h4>
                                    <ul className="space-y-1.5">
                                        {data.crm_metadata.key_decisions.map((item: string, idx: number) => (
                                            <li key={idx} className="flex items-start gap-2 text-[13px] text-[var(--text-secondary)]">
                                                <div className="mt-1.5 w-1 h-1 rounded-full bg-orange-500 shrink-0" />
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );
        }
    } catch (e) {
        // Not a JSON string, fallback to markdown
    }
    
    // Fallback to markdown
    return (
        <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none prose-headings:text-[var(--text-primary)] prose-headings:font-semibold prose-strong:text-[var(--text-primary)] prose-strong:font-bold prose-a:text-[var(--accent)] prose-p:my-2 prose-ul:my-2 prose-li:my-0.5">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {summaryString}
            </ReactMarkdown>
        </div>
    );
};

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
        prompt: (noteTitle: string) => `Analyze "${noteTitle}" and extract every single concrete action item and commitment. Format output cleanly as:
## 📋 Action Items & Deliverables
For each item, format as a markdown checklist with owner and due date if mentioned:
- [ ] **<Imperative Task>** — @<Owner> (Due: <Deadline>)
  > 💬 Context: "<Brief verbatim quote or reference>"

Group tasks by category:
1. 🚀 Immediate Next Steps
2. ✉️ Follow-ups & Emails
3. 💻 Dev & Specs
4. 📅 Scheduling & Meetings`,
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

        // If it's a meeting and we don't have the data locally, fetch it from backend
        if (note.isMeeting) {
            if (!storedTranscript) {
                TauriClient.getTranscript(note.id).then(t => {
                    if (t) {
                        setRawTranscript(t);
                        onUpdate({ transcript: t });
                    }
                }).catch(console.error);
            }
            if (!storedSummary) {
                TauriClient.getSummary(note.id).then(s => {
                    if (s) {
                        setAiSummary(s);
                        onUpdate({ summary: s });
                    }
                }).catch(console.error);
            }
        }
    }, [note.id, note.isMeeting, note.transcript, note.summary]);


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
                class: 'bacham-editor-content outline-none min-h-[400px] text-[14.5px] leading-relaxed text-[var(--text-primary)]',
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

    // ── AI Multilingual Synthesis Engine ─────────────────────────────────────
    const handleGenerateSummary = async (transcriptOverride?: string) => {
        const textToSummarize = transcriptOverride || rawTranscript || (editor ? editor.getText() : '');
        if (!textToSummarize.trim()) return;

        setIsGeneratingSummary(true);
        try {
            const prompt = `You are an executive meeting assistant and expert multilingual translator. Analyze the following meeting content/transcript (which may be in English, Hindi, Telugu, Tamil, Spanish, French, German, Japanese, or mixed code-switching like Hinglish):

Meeting Title: "${note.title || 'Untitled Meeting'}"
Meeting Text:
${textToSummarize}

Instructions:
- If the text is in another language or mixed (e.g. Hindi, Telugu, Spanish), understand the full context accurately.
- Provide a structured, polished executive summary with clear English headings and rich bilingual context where applicable:

Structure your response with:
## ✨ Executive Overview
(A concise, high-impact 2-3 paragraph synthesis of core themes, discussions, and outcomes)

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
            <div class="my-4 p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm leading-relaxed shadow-xs">
                ${aiSummary.replace(/\n/g, '<br/>')}
            </div>
        `);
        setViewMode('notes');
    };

    const [isPolishingTranscript, setIsPolishingTranscript] = useState(false);

    const handlePolishTranscript = async () => {
        if (!rawTranscript.trim() || isPolishingTranscript) return;
        setIsPolishingTranscript(true);
        try {
            const prompt = `You are a professional multilingual audio transcript editor. Clean and polish the following verbatim transcript:
1. Preserve original languages (Hindi, Telugu, Tamil, Spanish, French, German, Japanese, English, or mixed Hinglish/code-switching).
2. Fix sentence boundaries, capitalize proper nouns, remove speech stutters, and format into clean dialogue.
3. Keep the authentic verbatim meaning 100% accurate.

Raw Transcript:
${rawTranscript}

Return only the polished transcript text:`;

            const polished = await TauriClient.sendGlobalMemoryChat(prompt, []);
            if (polished) {
                setRawTranscript(polished);
                localStorage.setItem(`transcript_${note.id}`, polished);
                onUpdate({ transcript: polished });
            }
        } catch (err) {
            console.error("Failed to polish transcript", err);
        } finally {
            setIsPolishingTranscript(false);
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

            {/* ── Top Navigation Bar (Matches Dashboard Header Bar Aesthetic) ────── */}
            <div data-tauri-drag-region="false" className="w-full h-14 shrink-0 flex items-center justify-between px-2 sticky top-0 bg-[var(--bg)] z-[100] border-b border-[var(--border)] pointer-events-auto select-none">
                <div data-tauri-drag-region="false" className="flex-1 flex items-center justify-start gap-2 pl-12">
                    <button
                        data-tauri-drag-region="false"
                        type="button"
                        onClick={() => {
                            if (onBack) onBack();
                            else navigate('/');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border border-[var(--border)] text-xs font-medium shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                        title="Back to Notes"
                    >
                        <ArrowLeft size={13} />
                        <span>Notes</span>
                    </button>
                </div>

                {/* ── 3-WAY TOP MODE SWITCHER: Summary | Notes | Transcript ──────────────── */}
                <div data-tauri-drag-region="false" className="flex-none flex items-center p-1 rounded-lg bg-[var(--surface)] border border-[var(--border)] shadow-xs pointer-events-auto gap-1">
                    {/* 1. Summary Button */}
                    <button
                        data-tauri-drag-region="false"
                        type="button"
                        onClick={() => setViewMode('summary')}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer",
                            viewMode === 'summary'
                                ? "bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-xs border border-[var(--border)] font-semibold"
                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] font-medium"
                        )}
                    >
                        <Sparkles size={12} className={viewMode === 'summary' ? "text-[var(--accent)]" : "opacity-70"} />
                        <span>Summary</span>
                        {aiSummary && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />}
                    </button>

                    {/* 2. Notes Button */}
                    <button
                        data-tauri-drag-region="false"
                        type="button"
                        onClick={() => setViewMode('notes')}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer",
                            viewMode === 'notes'
                                ? "bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-xs border border-[var(--border)] font-semibold"
                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] font-medium"
                        )}
                    >
                        <FileText size={12} className={viewMode === 'notes' ? "text-[var(--accent)]" : "opacity-70"} />
                        <span>Notes</span>
                    </button>

                    {/* 3. Transcript Button */}
                    <button
                        data-tauri-drag-region="false"
                        type="button"
                        onClick={() => setViewMode('transcript')}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer",
                            viewMode === 'transcript'
                                ? "bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-xs border border-[var(--border)] font-semibold"
                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] font-medium"
                        )}
                    >
                        <Mic size={12} className={viewMode === 'transcript' ? "text-[var(--accent)]" : "opacity-70"} />
                        <span>Transcript</span>
                        {rawTranscript && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />}
                    </button>
                </div>

                {/* Right Action Controls */}
                <div data-tauri-drag-region="false" className="flex-1 flex items-center justify-end gap-2 pr-20">
                    {/* Primary Record Button (Matches Dashboard Start Recording CTA) */}
                    <button
                        data-tauri-drag-region="false"
                        type="button"
                        onClick={() => setIsTranscriptOpen(!isTranscriptOpen)}
                        className={cn(
                            "px-3.5 py-1.5 text-xs font-semibold rounded-md shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                            isTranscriptOpen
                                ? "bg-[var(--destructive)] hover:opacity-90 text-white shadow-[0_0_12px_rgba(239,68,68,0.4)] animate-pulse"
                                : "bg-[var(--text-primary)] hover:bg-[var(--text-secondary)] text-[var(--bg)]"
                        )}
                        title="Record Meeting & Live Transcription"
                    >
                        <Mic size={13} />
                        <span>{isTranscriptOpen ? 'Recording...' : 'Record'}</span>
                    </button>

                    <div className="h-4 w-px bg-[var(--border)] mx-0.5" />

                    <div className="flex items-center gap-1 text-[var(--text-muted)]">
                        <button
                            type="button"
                            onClick={handleCopyMarkdown}
                            className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors border border-transparent hover:border-[var(--border)] cursor-pointer"
                            title="Copy note markdown"
                        >
                            {copied ? <Check size={14} className="text-[var(--accent)]" /> : <Copy size={14} />}
                        </button>
                        <button
                            type="button"
                            onClick={handleExportFile}
                            className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors border border-transparent hover:border-[var(--border)] cursor-pointer"
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
                    <div className="max-w-3xl mx-auto px-8 py-8 pb-48 flex flex-col gap-6">
                        {/* Summary Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border)]">
                            <div>
                                <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)] select-none mb-1">
                                    AI Intelligence
                                </p>
                                <h1 className="text-[24px] font-semibold text-[var(--text-primary)] tracking-tight leading-tight flex items-center gap-2">
                                    <span>Executive Summary</span>
                                    {isGeneratingSummary && <RefreshCw size={15} className="animate-spin text-[var(--accent)]" />}
                                </h1>
                                <p className="text-xs text-[var(--text-secondary)] mt-1">
                                    Synthesized with Google Gemini from your note content and transcripts.
                                </p>
                            </div>

                            {/* Summary Action CTAs */}
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => handleGenerateSummary()}
                                    disabled={isGeneratingSummary}
                                    className="px-3.5 py-1.5 bg-[var(--text-primary)] hover:bg-[var(--text-secondary)] text-[var(--bg)] text-xs font-semibold rounded-md shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    <RefreshCw size={12} className={isGeneratingSummary ? "animate-spin" : ""} />
                                    <span>{isGeneratingSummary ? 'Synthesizing...' : 'Re-generate'}</span>
                                </button>

                                {aiSummary && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={handleCopySummary}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all shadow-xs cursor-pointer"
                                            title="Copy Summary"
                                        >
                                            {summaryCopied ? <Check size={13} className="text-[var(--accent)]" /> : <Copy size={13} />}
                                            <span>{summaryCopied ? 'Copied' : 'Copy'}</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleInsertSummaryToNotes}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-medium text-[var(--accent)] hover:underline transition-all shadow-xs cursor-pointer"
                                            title="Insert into Custom Notes"
                                        >
                                            <Plus size={13} />
                                            <span>Insert to Notes</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Summary Content Card */}
                        {aiSummary ? (
                            <div className="text-sm text-[var(--text-primary)] leading-relaxed font-sans max-w-none">
                                <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                                    <StructuredSummaryViewer summaryString={aiSummary} />
                                </div>
                            </div>
                        ) : (
                            /* Empty Summary State (Dashboard Empty Style) */
                            <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-xl bg-[var(--surface)] border border-dashed border-[var(--border)]">
                                <div className="p-3.5 rounded-xl bg-[var(--accent-dim)] text-[var(--accent)] mb-3 shadow-xs">
                                    <Sparkles size={24} />
                                </div>
                                <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-1">
                                    No executive summary generated yet
                                </h3>
                                <p className="text-xs text-[var(--text-muted)] max-w-sm mb-5 leading-relaxed">
                                    Generate an AI-powered executive summary, discussion highlights, decisions, and action items directly from this note.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => handleGenerateSummary()}
                                    disabled={isGeneratingSummary}
                                    className="px-4 py-2 bg-[var(--text-primary)] hover:bg-[var(--text-secondary)] text-[var(--bg)] text-xs font-semibold rounded-md shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all flex items-center gap-2 cursor-pointer"
                                >
                                    <Sparkles size={13} className={isGeneratingSummary ? "animate-spin" : ""} />
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
                            ? 'max-w-3xl mx-auto px-8 pt-8'
                            : 'max-w-3xl mx-auto px-8 pt-6',
                    )}>
                        {/* Note Title */}
                        <div className="mb-4">
                            <input
                                type="text"
                                value={note.title}
                                onChange={handleTitleChange}
                                placeholder="Untitled Note"
                                className="w-full bg-transparent text-[28px] sm:text-[32px] font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/40 focus:outline-none tracking-tight leading-tight"
                            />
                        </div>

                        {/* Metadata Row */}
                        <div className="flex flex-wrap items-center gap-2 mb-8 text-xs">
                            {/* Date Picker Pill */}
                            <div className="relative" ref={dateMenuRef}>
                                <MetaPill onClick={() => setDateMenuOpen(v => !v)}>
                                    <CalendarIcon size={12} className="text-[var(--text-muted)]" />
                                    <span>{note.eventDate || new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                    <ChevronDown size={10} className="text-[var(--text-muted)] opacity-60" />
                                </MetaPill>
                                {dateMenuOpen && (
                                    <div className="absolute top-9 left-0 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-xl py-1 w-40">
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
                                    <div className="absolute top-9 left-0 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-xl py-1 w-48 max-h-56 overflow-y-auto">
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
                                                <Folder size={12} className="text-[var(--accent)] shrink-0" />
                                                <span className="truncate">{f.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Tag Pills */}
                            {note.tags.filter(t => !t.startsWith('folder:')).map(tag => (
                                <MetaPill key={tag} onClick={() => handleRemoveTag(tag)}>
                                    <Hash size={11} className="text-[var(--accent)]" />
                                    <span>{tag}</span>
                                    <X size={10} className="text-[var(--text-muted)] hover:text-[var(--destructive)] transition-colors ml-0.5" />
                                </MetaPill>
                            ))}

                            {/* Add Tag */}
                            {isAddingTag ? (
                                <div className="flex items-center gap-1 px-2.5 py-1 bg-[var(--surface)] border border-[var(--border)] rounded-md text-xs">
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
                                    className="flex items-center gap-1 px-2.5 py-1 border border-dashed border-[var(--border)] rounded-md text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors cursor-pointer"
                                >
                                    <Plus size={11} /> Tag
                                </button>
                            )}
                        </div>

                        {/* Floating Selection Quick Toolbar */}
                        {selectionMenu && (
                            <div 
                                style={{ position: 'fixed', left: `${selectionMenu.x}px`, top: `${selectionMenu.y}px`, transform: 'translateX(-50%)' }}
                                className="fixed z-50 flex items-center gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2 py-1 shadow-xl"
                            >
                                <button
                                    type="button"
                                    onClick={() => editor.chain().focus().toggleBold().run()}
                                    className={cn("p-1.5 rounded text-xs transition-colors cursor-pointer", editor.isActive('bold') ? "bg-[var(--surface-hover)] text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]")}
                                    title="Bold"
                                >
                                    <Bold size={13} />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => editor.chain().focus().toggleItalic().run()}
                                    className={cn("p-1.5 rounded text-xs transition-colors cursor-pointer", editor.isActive('italic') ? "bg-[var(--surface-hover)] text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]")}
                                    title="Italic"
                                >
                                    <Italic size={13} />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => editor.chain().focus().toggleStrike().run()}
                                    className={cn("p-1.5 rounded-lg text-xs transition-colors cursor-pointer", editor.isActive('strike') ? "bg-[var(--surface-hover)] text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]")}
                                    title="Strikethrough"
                                >
                                    <Strikethrough size={13} />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => editor.chain().focus().toggleCode().run()}
                                    className={cn("p-1.5 rounded text-xs font-mono font-bold transition-colors cursor-pointer", editor.isActive('code') ? "bg-[var(--surface-hover)] text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]")}
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
                    <div className={cn(
                        "mx-auto px-8 py-8 pb-48 flex flex-col gap-6",
                        note.isMeeting && note.videoPath ? "max-w-6xl" : "max-w-3xl"
                    )}>
                        {/* Transcript Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border)]">
                            <div>
                                <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)] select-none mb-1">
                                    Audio Recording
                                </p>
                                <h1 className="text-[24px] font-semibold text-[var(--text-primary)] tracking-tight leading-tight">
                                    Verbatim Meeting Transcript
                                </h1>
                                <p className="text-xs text-[var(--text-secondary)] mt-1">
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
                                        className="px-3.5 py-1.5 bg-[var(--text-primary)] hover:bg-[var(--text-secondary)] text-[var(--bg)] text-xs font-semibold rounded-md shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                        title="Generate notes and action items using AI"
                                    >
                                        <Sparkles size={13} className={isGeneratingSummary ? "animate-spin" : ""} />
                                        <span>{isGeneratingSummary ? 'Synthesizing...' : 'Synthesize Summary'}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handlePolishTranscript}
                                        disabled={isPolishingTranscript}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-medium text-[var(--text-primary)] transition-all shadow-xs cursor-pointer disabled:opacity-50"
                                        title="Clean up speech errors and punctuate transcript with AI"
                                    >
                                        <Wand2 size={13} className={isPolishingTranscript ? "animate-spin text-[var(--accent)]" : "text-[var(--accent)]"} />
                                        <span>{isPolishingTranscript ? 'Polishing...' : 'AI Polish'}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleCopyTranscript}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all shadow-xs cursor-pointer"
                                        title="Copy full transcript"
                                    >
                                        {transcriptCopied ? <Check size={13} className="text-[var(--accent)]" /> : <Copy size={13} />}
                                        <span>{transcriptCopied ? 'Copied' : 'Copy'}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleExportTranscriptFile}
                                        className="p-1.5 rounded-md bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all shadow-xs cursor-pointer"
                                        title="Export transcript as text file"
                                    >
                                        <Download size={13} />
                                    </button>
                                </div>
                            ) : null}
                        </div>

                        {note.isMeeting && note.videoPath ? (
                            <div className="flex flex-col lg:flex-row gap-8 items-start">
                                {/* Left Column: Sticky Video */}
                                <div className="w-full lg:w-1/2 lg:sticky lg:top-0">
                                    <div className="relative rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 border border-[var(--border)] shadow-sm">
                                        <video 
                                            src={convertFileSrc(note.videoPath)} 
                                            controls 
                                            className="w-full aspect-video object-contain bg-black"
                                            controlsList="nodownload"
                                        />
                                    </div>
                                </div>

                                {/* Right Column: Transcript */}
                                <div className="w-full lg:w-1/2 flex flex-col gap-4">
                                    {/* Search Bar if transcript exists */}
                                    {rawTranscript ? (
                                        <div className="relative">
                                            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                            <input
                                                type="text"
                                                value={transcriptSearch}
                                                onChange={e => setTranscriptSearch(e.target.value)}
                                                placeholder="Search in transcript..."
                                                className="w-full pl-9 pr-4 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)] shadow-xs"
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
                                        <div className="space-y-3">
                                            {filteredTranscriptLines.length > 0 ? (
                                                filteredTranscriptLines.map((line, idx) => (
                                                    <div 
                                                        key={idx} 
                                                        className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_1px_4px_rgba(0,0,0,0.04)] flex flex-col gap-1.5 transition-all hover:bg-[var(--surface-hover)]"
                                                    >
                                                        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-medium">
                                                            <div className="flex items-center gap-1.5 text-[var(--accent)] font-semibold">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                                                                <span>Speaker {Math.floor(idx / 3) + 1}</span>
                                                            </div>
                                                            <span className="tabular-nums">{`00:${(idx * 8).toString().padStart(2, '0')}`}</span>
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
                                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-xl bg-[var(--surface)] border border-dashed border-[var(--border)]">
                                            <div className="p-3.5 rounded-xl bg-[var(--accent-dim)] text-[var(--accent)] mb-3 shadow-xs">
                                                <Mic size={24} />
                                            </div>
                                            <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-1">
                                                No transcript recorded yet
                                            </h3>
                                            <p className="text-xs text-[var(--text-muted)] max-w-sm mb-5 leading-relaxed">
                                                Start recording during your meeting or lecture. Real-time transcription will automatically save here alongside your notes.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => setIsTranscriptOpen(true)}
                                                className="px-4 py-2 bg-[var(--text-primary)] hover:bg-[var(--text-secondary)] text-[var(--bg)] text-xs font-semibold rounded-md shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all flex items-center gap-2 cursor-pointer"
                                            >
                                                <Mic size={13} />
                                                <span>Start Recording</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Search Bar if transcript exists */}
                                {rawTranscript ? (
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                        <input
                                            type="text"
                                            value={transcriptSearch}
                                            onChange={e => setTranscriptSearch(e.target.value)}
                                            placeholder="Search in transcript..."
                                            className="w-full pl-9 pr-4 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)] shadow-xs"
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
                                    <div className="space-y-3">
                                        {filteredTranscriptLines.length > 0 ? (
                                            filteredTranscriptLines.map((line, idx) => (
                                                <div 
                                                    key={idx} 
                                                    className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_1px_4px_rgba(0,0,0,0.04)] flex flex-col gap-1.5 transition-all hover:bg-[var(--surface-hover)]"
                                                >
                                                    <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-medium">
                                                        <div className="flex items-center gap-1.5 text-[var(--accent)] font-semibold">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                                                            <span>Speaker {Math.floor(idx / 3) + 1}</span>
                                                        </div>
                                                        <span className="tabular-nums">{`00:${(idx * 8).toString().padStart(2, '0')}`}</span>
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
                                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-xl bg-[var(--surface)] border border-dashed border-[var(--border)]">
                                        <div className="p-3.5 rounded-xl bg-[var(--accent-dim)] text-[var(--accent)] mb-3 shadow-xs">
                                            <Mic size={24} />
                                        </div>
                                        <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-1">
                                            No transcript recorded yet
                                        </h3>
                                        <p className="text-xs text-[var(--text-muted)] max-w-sm mb-5 leading-relaxed">
                                            Start recording during your meeting or lecture. Real-time transcription will automatically save here alongside your notes.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setIsTranscriptOpen(true)}
                                            className="px-4 py-2 bg-[var(--text-primary)] hover:bg-[var(--text-secondary)] text-[var(--bg)] text-xs font-semibold rounded-md shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all flex items-center gap-2 cursor-pointer"
                                        >
                                            <Mic size={13} />
                                            <span>Start Recording</span>
                                        </button>
                                    </div>
                                )}
                            </>
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
                                <div class="my-3 p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm leading-relaxed shadow-xs">
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
                onInsertQuote={(quoteText) => {
                    if (editor) {
                        editor.commands.focus();
                        editor.commands.insertContent(`
                            <blockquote><p><em>"${quoteText}"</em></p></blockquote><p></p>
                        `);
                    }
                }}
            />
        </div>
    );
}

function MetaPill({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
    return (
        <button 
            type="button"
            onClick={onClick}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded-md text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
            {children}
        </button>
    );
}
