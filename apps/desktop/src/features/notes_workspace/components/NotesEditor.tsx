import React, { useRef, useEffect, useState } from 'react';
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
    FileText, CheckSquare, Edit3, Mic, ArrowLeft, RefreshCw, Wand2, List,
    MoreHorizontal, Bookmark, Trash2, VideoOff, Share2, Zap
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TauriClient, Screenshot } from '@/infrastructure/tauri-client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { ExportPdfDialog } from './ExportPdfDialog';
import { ExportPushDialog } from '@/components/workspace/ExportPushDialog';
import { StudyWorkspaceView } from './StudyWorkspaceView';

export function parseTimestampToSeconds(ts: string): number | null {
    if (!ts) return null;
    const clean = ts.trim().replace(/^\[|\]$/g, '');
    const match = clean.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!match) return null;
    if (match[3] !== undefined) {
        const hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const seconds = parseInt(match[3], 10);
        return hours * 3600 + minutes * 60 + seconds;
    } else {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        return minutes * 60 + seconds;
    }
}

export function extractTimestamp(raw: string): { timestamp: string | null; cleanText: string } {
    if (!raw) return { timestamp: null, cleanText: '' };
    const bracketMatch = raw.match(/\[(\d{1,2}:\d{2}(?::\d{2})?)\]/);
    if (bracketMatch) {
        return {
            timestamp: bracketMatch[1],
            cleanText: raw.replace(bracketMatch[0], '').trim()
        };
    }
    const leadingMatch = raw.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\b/);
    if (leadingMatch) {
        return {
            timestamp: leadingMatch[1],
            cleanText: raw.replace(leadingMatch[0], '').trim()
        };
    }
    return { timestamp: null, cleanText: raw };
}

function renderNodesWithTimestamps(node: React.ReactNode, onSeek?: (ts: string) => void): React.ReactNode {
    if (typeof node === 'string') {
        const tsRegex = /\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g;
        if (!tsRegex.test(node)) return node;

        const parts: React.ReactNode[] = [];
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        tsRegex.lastIndex = 0;
        while ((match = tsRegex.exec(node)) !== null) {
            if (match.index > lastIndex) {
                parts.push(node.slice(lastIndex, match.index));
            }
            const ts = match[1];
            parts.push(
                <button
                    key={`${ts}-${match.index}`}
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onSeek?.(ts);
                    }}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-1 rounded text-[11px] font-mono font-semibold bg-[var(--accent-dim)] text-[var(--accent)] hover:bg-[var(--accent)]/25 border border-[var(--accent)]/30 cursor-pointer align-middle transition-all hover:scale-105 active:scale-95 shadow-2xs"
                    title={`Jump to ${ts} in recording`}
                >
                    <span>⏱</span>
                    <span>{ts}</span>
                </button>
            );
            lastIndex = tsRegex.lastIndex;
        }
        if (lastIndex < node.length) {
            parts.push(node.slice(lastIndex));
        }
        return parts;
    }

    if (Array.isArray(node)) {
        return React.Children.map(node, (child) => renderNodesWithTimestamps(child, onSeek));
    }

    if (React.isValidElement(node)) {
        const elementProps = node.props as { children?: React.ReactNode };
        if (elementProps && elementProps.children) {
            return React.cloneElement(node, {
                ...elementProps,
                children: renderNodesWithTimestamps(elementProps.children, onSeek),
            } as any);
        }
    }

    return node;
}

const StructuredSummaryViewer = ({ summaryString, onSeek }: { summaryString: string; onSeek?: (ts: string) => void }) => {
    try {
        const data = JSON.parse(summaryString);
        if (data && (data.executive_summary || data.discussion_points || data.key_takeaways || data.crm_metadata)) {
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
                                            {point.timestamp && (
                                                <button
                                                    type="button"
                                                    onClick={() => onSeek?.(point.timestamp)}
                                                    className="inline-flex items-center gap-1 text-xs font-mono font-medium text-[var(--accent)] bg-[var(--accent-dim)] hover:bg-[var(--accent)]/20 px-2 py-0.5 rounded-md border border-[var(--accent)]/30 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                                                    title={`Jump to ${point.timestamp} in recording`}
                                                >
                                                    <span>⏱</span>
                                                    <span>{point.timestamp}</span>
                                                </button>
                                            )}
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
                        <div className="pt-4 border-t border-[var(--border)] grid grid-cols-1 md:grid-cols-2 gap-6">
                            {data.crm_metadata.action_items?.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-[14px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                        <CheckSquare size={15} className="text-emerald-500" />
                                        <span>Action Items</span>
                                        <span className="text-xs font-normal text-[var(--text-muted)] bg-[var(--surface-muted)] px-1.5 py-0.5 rounded-full">
                                            {data.crm_metadata.action_items.length}
                                        </span>
                                    </h4>
                                    <div className="space-y-2">
                                        {data.crm_metadata.action_items.map((rawItem: any, idx: number) => {
                                            const isObj = typeof rawItem === 'object' && rawItem !== null;
                                            const task = isObj ? (rawItem.task || '') : String(rawItem);
                                            const owner = isObj ? (rawItem.owner || '') : '';
                                            const dueDate = isObj ? (rawItem.due_date || rawItem.dueDate || '') : '';
                                            const priority = isObj ? (rawItem.priority || '') : '';

                                            const objTs = isObj ? (rawItem.timestamp || rawItem.timestamp_hint) : null;
                                            const { timestamp: extractedTs, cleanText } = extractTimestamp(task);
                                            const timestamp = objTs || extractedTs;
                                            const displayTask = isObj ? task : cleanText;

                                            return (
                                                <div 
                                                    key={idx} 
                                                    className="group flex flex-col gap-1.5 p-2.5 rounded-lg bg-black/5 dark:bg-white/5 border border-[var(--border)] hover:border-[var(--accent)]/40 transition-all"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex items-start gap-2 min-w-0">
                                                            <div className="mt-1 w-2 h-2 rounded-full bg-emerald-500 shrink-0 group-hover:scale-125 transition-transform" />
                                                            <span className="text-[13px] font-medium text-[var(--text-primary)] leading-snug break-words">
                                                                {displayTask}
                                                            </span>
                                                        </div>
                                                        {timestamp && (
                                                            <button
                                                                type="button"
                                                                onClick={() => onSeek?.(timestamp)}
                                                                className="shrink-0 inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-[var(--accent)] bg-[var(--accent-dim)] hover:bg-[var(--accent)]/25 px-2 py-0.5 rounded-md border border-[var(--accent)]/30 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                                                                title={`Jump to ${timestamp} in recording`}
                                                            >
                                                                <span>⏱</span>
                                                                <span>{timestamp}</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                    {(owner || dueDate || priority) && (
                                                        <div className="flex items-center gap-2 pl-4 text-[11px] text-[var(--text-muted)]">
                                                            {owner && (
                                                                <span className="bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded font-medium text-[var(--text-secondary)]">
                                                                    @{owner}
                                                                </span>
                                                            )}
                                                            {dueDate && (
                                                                <span className="text-[var(--text-muted)]">
                                                                    Due: {dueDate}
                                                                </span>
                                                            )}
                                                            {priority && (
                                                                <span className={cn(
                                                                    "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                                                                    priority === 'urgent' ? 'bg-red-500/10 text-red-500' :
                                                                    priority === 'high' ? 'bg-orange-500/10 text-orange-500' :
                                                                    'bg-blue-500/10 text-blue-500'
                                                                )}>
                                                                    {priority}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            {data.crm_metadata.key_decisions?.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-[14px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                        <Sparkles size={15} className="text-amber-500" />
                                        <span>Key Decisions</span>
                                        <span className="text-xs font-normal text-[var(--text-muted)] bg-[var(--surface-muted)] px-1.5 py-0.5 rounded-full">
                                            {data.crm_metadata.key_decisions.length}
                                        </span>
                                    </h4>
                                    <div className="space-y-2">
                                        {data.crm_metadata.key_decisions.map((rawDecision: any, idx: number) => {
                                            const text = typeof rawDecision === 'string' ? rawDecision : (rawDecision.decision || rawDecision.text || '');
                                            const { timestamp, cleanText } = extractTimestamp(text);
                                            return (
                                                <div 
                                                    key={idx}
                                                    className="flex items-start justify-between gap-2 p-2.5 rounded-lg bg-black/5 dark:bg-white/5 border border-[var(--border)]"
                                                >
                                                    <div className="flex items-start gap-2 min-w-0">
                                                        <div className="mt-1 w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                                                        <span className="text-[13px] text-[var(--text-secondary)] leading-snug">
                                                            {cleanText}
                                                        </span>
                                                    </div>
                                                    {timestamp && (
                                                        <button
                                                            type="button"
                                                            onClick={() => onSeek?.(timestamp)}
                                                            className="shrink-0 inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-[var(--accent)] bg-[var(--accent-dim)] hover:bg-[var(--accent)]/25 px-2 py-0.5 rounded-md border border-[var(--accent)]/30 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                                                            title={`Jump to ${timestamp} in recording`}
                                                        >
                                                            <span>⏱</span>
                                                            <span>{timestamp}</span>
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
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
            <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                    li: ({ children, ...props }) => (
                        <li {...props}>{renderNodesWithTimestamps(children, onSeek)}</li>
                    ),
                    p: ({ children, ...props }) => (
                        <p {...props}>{renderNodesWithTimestamps(children, onSeek)}</p>
                    )
                }}
            >
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
For each item, format as a markdown checklist with exact transcript timestamp [MM:SS], owner, and due date:
- [ ] [MM:SS] **<Imperative Task>** — @<Owner> (Due: <Deadline>)
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
    onDelete?: () => void;
    onDeleteVideo?: () => void;
}

export function NotesEditor({ note, folders = [], folderName = 'All Notes', focusMode = false, onBack, onUpdate, onDelete, onDeleteVideo }: NotesEditorProps) {
    const navigate = useNavigate();
    const [isAddingTag, setIsAddingTag] = useState(false);
    const [tagInput, setTagInput] = useState('');
    const [folderMenuOpen, setFolderMenuOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [dateMenuOpen, setDateMenuOpen] = useState(false);
    const [selectionMenu, setSelectionMenu] = useState<{ x: number; y: number } | null>(null);
    const [moreMenuOpen, setMoreMenuOpen] = useState(false);
    const [isExportPdfOpen, setIsExportPdfOpen] = useState(false);
    const [isExportPushOpen, setIsExportPushOpen] = useState(false);

    const folderMenuRef = useRef<HTMLDivElement>(null);
    const dateMenuRef = useRef<HTMLDivElement>(null);
    const moreMenuRef = useRef<HTMLDivElement>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);

    // Close menus when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (folderMenuRef.current && !folderMenuRef.current.contains(e.target as Node)) setFolderMenuOpen(false);
            if (dateMenuRef.current && !dateMenuRef.current.contains(e.target as Node)) setDateMenuOpen(false);
            if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) setMoreMenuOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── 5-WAY VIEW MODES: 'summary' | 'notes' | 'transcript' | 'study' | 'chat' ──────────────
    type ViewMode = 'summary' | 'notes' | 'transcript' | 'study' | 'chat';
    const [searchParams] = useSearchParams();
    const queryTab = searchParams.get('tab');
    const queryCardId = searchParams.get('cardId');
    const queryQuizId = searchParams.get('quizId');

    const [rawTranscript, setRawTranscript] = useState<string>(() => note.transcript || localStorage.getItem(`transcript_${note.id}`) || '');
    const [aiSummary, setAiSummary] = useState<string>(() => note.summary || localStorage.getItem(`summary_${note.id}`) || '');
    const [notePlainText, setNotePlainText] = useState<string>(() => {
        const direct = note.content ? note.content.replace(/<[^>]+>/g, '').trim() : '';
        const savedDraft = localStorage.getItem(`user_notes_draft_${note.id}`) || '';
        const draftText = savedDraft ? savedDraft.replace(/<[^>]+>/g, '').trim() : '';
        return direct || draftText || '';
    });
    const [flashcardCount, setFlashcardCount] = useState<number>(0);
    const [quizCount, setQuizCount] = useState<number>(0);

    useEffect(() => {
        if (note.id) {
            TauriClient.listFlashcards(note.id)
                .then(cards => setFlashcardCount(cards ? cards.length : 0))
                .catch(() => setFlashcardCount(0));
            TauriClient.listQuizQuestions(note.id)
                .then(quizzes => setQuizCount(quizzes ? quizzes.length : 0))
                .catch(() => setQuizCount(0));
        }
    }, [note.id]);

    const hasTranscript = Boolean(rawTranscript && rawTranscript.trim().length > 0);
    const hasNotes = Boolean(notePlainText && notePlainText.trim().length > 0);
    // Don't give option for quiz or flashcards until they have any one of transcript or notes (or existing cards)
    const hasStudyMaterial = hasTranscript || hasNotes || flashcardCount > 0 || quizCount > 0;

    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        const hasInitialSource = Boolean(
            (note.transcript && note.transcript.trim().length > 0) ||
            (localStorage.getItem(`transcript_${note.id}`)?.trim()) ||
            (note.content && note.content.replace(/<[^>]+>/g, '').trim().length > 0) ||
            (localStorage.getItem(`user_notes_draft_${note.id}`)?.trim())
        );
        if (hasInitialSource && (queryTab === 'study' || queryTab === 'flashcards' || queryTab === 'quiz' || queryCardId || queryQuizId)) return 'study';
        if (queryTab === 'transcript') return 'transcript';
        if (queryTab === 'notes') return 'notes';
        if (queryTab === 'chat') return 'chat';
        if (note.isMeeting) return 'summary';
        return 'notes';
    });

    useEffect(() => {
        if (!hasStudyMaterial && viewMode === 'study') {
            setViewMode(note.isMeeting ? 'summary' : 'notes');
        }
    }, [hasStudyMaterial, viewMode, note.isMeeting]);

    useEffect(() => {
        if (hasStudyMaterial && (queryTab === 'study' || queryTab === 'flashcards' || queryTab === 'quiz' || queryCardId || queryQuizId)) {
            setViewMode('study');
        } else if (queryTab === 'transcript') {
            setViewMode('transcript');
        } else if (queryTab === 'notes') {
            setViewMode('notes');
        } else if (queryTab === 'chat') {
            setViewMode('chat');
        } else if (queryTab === 'summary') {
            setViewMode('summary');
        }
    }, [queryTab, queryCardId, queryQuizId, hasStudyMaterial]);

    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [transcriptSearch, setTranscriptSearch] = useState<string>('');
    const [transcriptCopied, setTranscriptCopied] = useState(false);
    const [summaryCopied, setSummaryCopied] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        if (note.content) {
            const text = note.content.replace(/<[^>]+>/g, '').trim();
            if (text) setNotePlainText(text);
        }
    }, [note.content]);

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
            // Always fetch saved notes from database for meetings if note content is not yet in editor
            TauriClient.getNotes(note.id).then(dbNotes => {
                if (dbNotes && dbNotes.trim()) {
                    const plain = dbNotes.replace(/<[^>]+>/g, '').trim();
                    if (plain) setNotePlainText(plain);
                    onUpdate({ content: dbNotes });
                    localStorage.setItem(`user_notes_draft_${note.id}`, dbNotes);
                    if (editor && (!editor.getText().trim() || editor.getHTML() === '<p></p>')) {
                        editor.commands.setContent(dbNotes);
                    }
                }
            }).catch(console.error);
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
            const plain = editor.getText().trim();
            setNotePlainText(plain);
            onUpdate({ content: html });
        },
        editorProps: {
            attributes: {
                class: 'bacham-editor-content outline-none border-none focus:outline-none focus:border-none focus:ring-0 min-h-[400px] text-[14.5px] leading-relaxed text-[var(--text-primary)]',
                spellcheck: 'true',
            },
        },
    });

    const noteIdRef = useRef(note.id);
    const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (note.isMeeting && note.id) {
            TauriClient.getScreenshots(note.id).then(setScreenshots).catch(console.error);
        }
    }, [note.id, note.isMeeting]);

    useEffect(() => {
        if (!editor) return;
        if (note.id !== noteIdRef.current) {
            noteIdRef.current = note.id;
            if (note.content) {
                editor.commands.setContent(note.content);
            } else if (note.isMeeting) {
                TauriClient.getNotes(note.id).then(dbNotes => {
                    if (dbNotes && dbNotes.trim()) {
                        editor.commands.setContent(dbNotes);
                        onUpdate({ content: dbNotes });
                        localStorage.setItem(`user_notes_draft_${note.id}`, dbNotes);
                    } else {
                        editor.commands.setContent('');
                    }
                }).catch(() => editor.commands.setContent(''));
            } else {
                editor.commands.setContent('');
            }
        }
    }, [note.id, note.content, note.isMeeting, editor, onUpdate]);

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

    // Listen for live notes from the extension
    useEffect(() => {
        if (!editor) return;
        const unlistenPromise = listen<{ text: string; lectureId?: string }>('live_note', (event) => {
            if (event.payload?.text) {
                if (event.payload.lectureId && event.payload.lectureId !== note.id) return;
                editor.commands.focus('end');
                editor.commands.insertContent(`
                    <ul data-type="taskList">
                        <li data-type="taskItem" data-checked="false">
                            <label><input type="checkbox"><span></span></label>
                            <div><p>${event.payload.text}</p></div>
                        </li>
                    </ul>
                `);
                // Persist new note content immediately so it's not lost
                setTimeout(() => {
                    const html = editor.getHTML();
                    onUpdate({ content: html });
                    localStorage.setItem(`user_notes_draft_${note.id}`, html);
                }, 50);
            }
        });

        return () => {
            unlistenPromise.then(unlisten => unlisten());
        };
    }, [editor, note.id, onUpdate]);

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

    const handleRefreshNote = async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            if (note.isMeeting) {
                const [t, s, dbNotes] = await Promise.all([
                    TauriClient.getTranscript(note.id).catch(() => null),
                    TauriClient.getSummary(note.id).catch(() => null),
                    TauriClient.getNotes(note.id).catch(() => null),
                ]);
                if (t) {
                    setRawTranscript(t);
                    localStorage.setItem(`transcript_${note.id}`, t);
                    onUpdate({ transcript: t });
                }
                if (s) {
                    setAiSummary(s);
                    localStorage.setItem(`summary_${note.id}`, s);
                    onUpdate({ summary: s });
                }
                if (dbNotes && dbNotes.trim()) {
                    onUpdate({ content: dbNotes });
                    localStorage.setItem(`user_notes_draft_${note.id}`, dbNotes);
                    if (editor) {
                        editor.commands.setContent(dbNotes);
                    }
                }
            } else {
                const fetchedNotes = await TauriClient.getWorkspaceNotes().catch(() => []);
                const freshNote = (fetchedNotes || []).find((n: any) => n.id === note.id);
                if (freshNote) {
                    const savedSummary = localStorage.getItem(`summary_${note.id}`) || freshNote.summary || undefined;
                    const savedTranscript = localStorage.getItem(`transcript_${note.id}`) || freshNote.transcript || undefined;
                    if (freshNote.content && editor) {
                        editor.commands.setContent(freshNote.content);
                    }
                    if (savedSummary) {
                        setAiSummary(savedSummary);
                    }
                    if (savedTranscript) {
                        setRawTranscript(savedTranscript);
                    }
                    onUpdate({
                        title: freshNote.title,
                        content: freshNote.content,
                        summary: savedSummary,
                        transcript: savedTranscript,
                        tags: freshNote.tags,
                    });
                }
            }
        } catch (err) {
            console.error('Failed to refresh note:', err);
        } finally {
            setTimeout(() => setIsRefreshing(false), 500);
        }
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

    // ── AI Multilingual Synthesis Engine ─────────────────────────────────────
    const handleGenerateSummary = async (transcriptOverride?: string) => {
        const textToSummarize = transcriptOverride || rawTranscript || (editor ? editor.getText() : '');
        if (!textToSummarize.trim()) return;

        setIsGeneratingSummary(true);
        try {
            const systemInstruction = `You are an executive meeting assistant and expert multilingual translator. Analyze the following meeting content/transcript (which may be in English, Hindi, Telugu, Tamil, Spanish, French, German, Japanese, or mixed code-switching like Hinglish).
If screenshots/slides are provided, incorporate their visual information into your summary.`;
            
            const prompt = `Meeting Title: "${note.title || 'Untitled Meeting'}"
Meeting Text:
${textToSummarize}

Instructions:
- If the text is in another language or mixed (e.g. Hindi, Telugu, Spanish), understand the full context accurately.
- Provide a structured, polished executive summary with clear English headings and rich bilingual context where applicable.
- If visual slides/screenshots are provided, explicitly mention key diagrams or data shown in them.

Structure your response with:
## ✨ Executive Overview
(A concise, high-impact 2-3 paragraph synthesis of core themes, discussions, and outcomes)

## 🎯 Key Takeaways & Discussion Highlights
(Bulleted actionable insights, core discussion topics, and important context)

## 📋 Action Items & Deliverables
(Specific checkboxes or tasks. You MUST include the exact transcript timestamp [MM:SS] when each task was committed or discussed, in format:
- [ ] [MM:SS] **<Task>** — @<Owner> (Due: <Deadline>))

## 💡 Strategic Decisions & Next Steps
(Decisions finalized and agreed milestones)`;

            let response = '';
            if (note.isMeeting && note.id) {
                // Multimodal endpoint fetches screenshots from DB automatically
                response = await TauriClient.generateMultimodalSummary(note.id, prompt, systemInstruction);
            } else {
                const combinedPrompt = `${systemInstruction}\n\n${prompt}`;
                response = await TauriClient.sendGlobalMemoryChat(combinedPrompt, []);
            }
            
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

    const handleCopyTranscript = async () => {
        if (!rawTranscript) return;
        try {
            const plainText = rawTranscript
                .split('\n')
                .map(l => l.replace(/^\[.*?\]:\s*/, '').trim())
                .filter(Boolean)
                .join('\n\n');
            await navigator.clipboard.writeText(plainText);
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

    const handleSeekToTimestamp = (timestampStr: string) => {
        const secs = parseTimestampToSeconds(timestampStr);
        if (secs === null) return;

        // Switch to transcript view so user sees player and transcript context
        setViewMode('transcript');

        // Play the video at the given timestamp
        setTimeout(() => {
            if (videoRef.current) {
                videoRef.current.currentTime = secs;
                videoRef.current.play().catch(() => {});
                videoRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 150);

        // Filter or highlight transcript matching the timestamp
        if (rawTranscript) {
            setTranscriptSearch(timestampStr);
        }
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
        const plainText = rawTranscript
            .split('\n')
            .map(l => l.replace(/^\[.*?\]:\s*/, '').trim())
            .filter(Boolean)
            .join('\n\n');
        const blob = new Blob([plainText], { type: 'text/plain' });
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

    // Filtered transcript lines - clean any synthetic legacy speaker tags
    const filteredTranscriptLines = (rawTranscript || '')
        .split('\n')
        .map(l => l.replace(/^\[.*?\]:\s*/, '').trim())
        .filter(l => Boolean(l) && (!transcriptSearch.trim() || l.toLowerCase().includes(transcriptSearch.toLowerCase())));

    const transcriptWordCount = (rawTranscript || '').split(/\s+/).filter(Boolean).length;
    const estimatedMinutes = Math.max(1, Math.round(transcriptWordCount / 140));

    return (
        <div className="flex flex-col h-full bg-[var(--bg)] overflow-hidden relative text-[var(--text-primary)] font-sans">

            {/* ── Top Navigation Bar (Matches Dashboard Header Bar Aesthetic) ────── */}
            <div data-tauri-drag-region="false" className="w-full h-14 shrink-0 flex items-center justify-between px-2 sm:px-3 sticky top-0 bg-[var(--bg)] z-[100] border-b border-[var(--border)] pointer-events-auto select-none gap-2">
                <div data-tauri-drag-region="false" className="flex items-center justify-start gap-2 pl-10 sm:pl-12 shrink-0 min-w-0">
                    <button
                        data-tauri-drag-region="false"
                        type="button"
                        onClick={() => {
                            if (onBack) onBack();
                            else navigate('/');
                        }}
                        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border border-[var(--border)] text-xs font-medium shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] shrink-0"
                        title="Back to Notes"
                    >
                        <ArrowLeft size={13} className="shrink-0" />
                        <span className="hidden sm:inline">Notes</span>
                    </button>
                </div>

                {/* ── 3-WAY TOP MODE SWITCHER: Summary | Notes | Transcript | Chat ──────────────── */}
                <div data-tauri-drag-region="false" className="flex-none flex items-center p-0.5 sm:p-1 rounded-lg bg-[var(--surface)] border border-[var(--border)] shadow-xs pointer-events-auto gap-0.5 sm:gap-1">
                    {/* 1. Summary Button */}
                    <button
                        data-tauri-drag-region="false"
                        type="button"
                        onClick={() => setViewMode('summary')}
                        className={cn(
                            "relative flex items-center gap-1.5 px-2 sm:px-2.5 xl:px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer",
                            viewMode === 'summary'
                                ? "bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-xs border border-[var(--border)] font-semibold"
                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] font-medium"
                        )}
                        title="AI Summary"
                    >
                        <div className="absolute inset-0 z-10" />
                        <Sparkles size={12} className={cn("shrink-0 relative z-0", viewMode === 'summary' ? "text-[var(--accent)]" : "opacity-70")} />
                        <span className={cn("relative z-0", viewMode === 'summary' ? "inline" : "hidden xl:inline")}>Summary</span>
                        {aiSummary && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0 relative z-0" />}
                    </button>

                    {/* 2. Notes Button */}
                    <button
                        data-tauri-drag-region="false"
                        type="button"
                        onClick={() => setViewMode('notes')}
                        className={cn(
                            "relative flex items-center gap-1.5 px-2 sm:px-2.5 xl:px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer",
                            viewMode === 'notes'
                                ? "bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-xs border border-[var(--border)] font-semibold"
                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] font-medium"
                        )}
                        title="Editor Notes"
                    >
                        <div className="absolute inset-0 z-10" />
                        <FileText size={12} className={cn("shrink-0 relative z-0", viewMode === 'notes' ? "text-[var(--accent)]" : "opacity-70")} />
                        <span className={cn("relative z-0", viewMode === 'notes' ? "inline" : "hidden xl:inline")}>Notes</span>
                    </button>

                    {/* 3. Transcript Button */}
                    <button
                        data-tauri-drag-region="false"
                        type="button"
                        onClick={() => setViewMode('transcript')}
                        className={cn(
                            "relative flex items-center gap-1.5 px-2 sm:px-2.5 xl:px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer",
                            viewMode === 'transcript'
                                ? "bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-xs border border-[var(--border)] font-semibold"
                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] font-medium"
                        )}
                        title="Verbatim Transcript"
                    >
                        <div className="absolute inset-0 z-10" />
                        <Mic size={12} className={cn("shrink-0 relative z-0", viewMode === 'transcript' ? "text-[var(--accent)]" : "opacity-70")} />
                        <span className={cn("relative z-0", viewMode === 'transcript' ? "inline" : "hidden xl:inline")}>Transcript</span>
                        {rawTranscript && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0 relative z-0" />}
                    </button>

                    {/* 4. Study / Flashcards Button - only available if transcript or notes exist */}
                    {hasStudyMaterial && (
                        <button
                            data-tauri-drag-region="false"
                            type="button"
                            onClick={() => setViewMode('study')}
                            className={cn(
                                "relative flex items-center gap-1.5 px-2 sm:px-2.5 xl:px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer",
                                viewMode === 'study'
                                    ? "bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-xs border border-[var(--border)] font-semibold"
                                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] font-medium"
                            )}
                            title="Flashcards & Active Recall"
                        >
                            <div className="absolute inset-0 z-10" />
                            <Zap size={12} className={cn("shrink-0 relative z-0", viewMode === 'study' ? "text-yellow-400" : "opacity-70")} />
                            <span className={cn("relative z-0", viewMode === 'study' ? "inline" : "hidden xl:inline")}>Study</span>
                            {(flashcardCount > 0 || quizCount > 0) && (
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0 relative z-0" />
                            )}
                        </button>
                    )}

                    {/* 5. Chat Button */}
                    <button
                        data-tauri-drag-region="false"
                        type="button"
                        onClick={() => setViewMode('chat')}
                        className={cn(
                            "relative flex items-center gap-1.5 px-2 sm:px-2.5 xl:px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer",
                            viewMode === 'chat'
                                ? "bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-xs border border-[var(--border)] font-semibold"
                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] font-medium"
                        )}
                        title="AI Chat"
                    >
                        <div className="absolute inset-0 z-10" />
                        <Sparkles size={12} className={cn("shrink-0 relative z-0", viewMode === 'chat' ? "text-[var(--accent)]" : "opacity-70")} />
                        <span className={cn("relative z-0", viewMode === 'chat' ? "inline" : "hidden xl:inline")}>Chat</span>
                    </button>
                </div>

                {/* Right Action Controls */}
                <div data-tauri-drag-region="false" className="flex items-center justify-end gap-1 sm:gap-1.5 pr-[100px] min-w-0 shrink-0">
                    {/* Primary Record Button (Matches Dashboard Start Recording CTA) */}
                    <button
                        data-tauri-drag-region="false"
                        type="button"
                        onClick={async () => {
                            try {
                                await invoke('trigger_extension_recording');
                            } catch(e) {
                                console.error('Failed to trigger recording', e);
                                alert(`Failed to start recording: ${e}\n\nPlease make sure the BACHAM browser extension is installed and active.`);
                            }
                        }}
                        className="px-2 sm:px-3.5 py-1.5 text-xs font-semibold rounded-md shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] bg-[var(--text-primary)] hover:bg-[var(--text-secondary)] text-[var(--bg)] shrink-0"
                        title="Record Meeting in Browser Extension"
                    >
                        <Mic size={13} className="shrink-0" />
                        <span className="hidden sm:inline">Record</span>
                    </button>

                    <div className="h-4 w-px bg-[var(--border)] mx-0.5 shrink-0" />

                    <div className="flex items-center gap-0.5 sm:gap-1 text-[var(--text-muted)] shrink-0">
                        <button
                            type="button"
                            onClick={handleRefreshNote}
                            disabled={isRefreshing}
                            className="hidden md:flex p-1.5 rounded-md hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors border border-transparent hover:border-[var(--border)] cursor-pointer shrink-0"
                            title="Refresh note, transcript & summary"
                        >
                            <RefreshCw size={14} className={cn(isRefreshing && "animate-spin text-[var(--accent)]")} />
                        </button>
                        <button
                            type="button"
                            onClick={handleCopyMarkdown}
                            className="hidden md:flex p-1.5 rounded-md hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors border border-transparent hover:border-[var(--border)] cursor-pointer shrink-0"
                            title="Copy note markdown"
                        >
                            {copied ? <Check size={14} className="text-[var(--accent)]" /> : <Copy size={14} />}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsExportPdfOpen(true)}
                            className="hidden lg:flex p-1.5 rounded-md hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors border border-transparent hover:border-[var(--border)] cursor-pointer shrink-0"
                            title="Export as PDF"
                        >
                            <Download size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsExportPushOpen(true)}
                            className="hidden lg:flex p-1.5 rounded-md hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors border border-transparent hover:border-[var(--border)] cursor-pointer shrink-0"
                            title="Push to Integrations (Slack, Notion, Local Folder, Email)"
                        >
                            <Share2 size={14} />
                        </button>

                        <div className="relative" ref={moreMenuRef}>
                            <button
                                type="button"
                                onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                                className={cn(
                                    "p-1.5 rounded-md hover:bg-[var(--surface-hover)] transition-colors border border-transparent hover:border-[var(--border)] cursor-pointer",
                                    moreMenuOpen ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border-[var(--border)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                )}
                                title="More options"
                            >
                                <MoreHorizontal size={14} />
                            </button>
                            {moreMenuOpen && (
                                <div className="absolute top-9 right-0 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl py-1.5 w-48">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMoreMenuOpen(false);
                                            handleRefreshNote();
                                        }}
                                        className="md:hidden w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors text-left"
                                    >
                                        <RefreshCw size={13} className={cn(isRefreshing && "animate-spin text-[var(--accent)]")} />
                                        <span>Refresh Note</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMoreMenuOpen(false);
                                            handleCopyMarkdown();
                                        }}
                                        className="md:hidden w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors text-left"
                                    >
                                        <Copy size={13} />
                                        <span>Copy Markdown</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onUpdate({ isPinned: !note.isPinned });
                                            setMoreMenuOpen(false);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors text-left"
                                    >
                                        <Bookmark size={13} className={note.isPinned ? "fill-current" : ""} />
                                        <span>{note.isPinned ? 'Remove Bookmark' : 'Bookmark'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMoreMenuOpen(false);
                                            setViewMode('notes');
                                            setTimeout(() => {
                                                if (titleInputRef.current) {
                                                    titleInputRef.current.focus();
                                                    titleInputRef.current.select();
                                                }
                                            }, 50);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors text-left"
                                    >
                                        <Edit3 size={13} />
                                        <span>Rename</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMoreMenuOpen(false);
                                            setIsExportPdfOpen(true);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors text-left"
                                    >
                                        <FileText size={13} className="text-red-500" />
                                        <span>Export as PDF</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMoreMenuOpen(false);
                                            setIsExportPushOpen(true);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors text-left"
                                    >
                                        <Share2 size={13} className="text-indigo-400" />
                                        <span>Push to Integrations...</span>
                                    </button>
                                    <div className="h-px w-full bg-[var(--border)] my-1 opacity-50" />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMoreMenuOpen(false);
                                            if (onDelete && confirm('Are you sure you want to delete this?')) {
                                                onDelete();
                                            }
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] font-medium text-red-500 hover:bg-red-500/10 transition-colors text-left"
                                    >
                                        <Trash2 size={13} />
                                        <span>Delete</span>
                                    </button>
                                    {note.videoPath && onDeleteVideo && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setMoreMenuOpen(false);
                                                if (confirm('Are you sure you want to delete the video? Your notes and transcript will be kept.')) {
                                                    onDeleteVideo();
                                                }
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] font-medium text-orange-500 hover:bg-orange-500/10 transition-colors text-left"
                                        >
                                            <VideoOff size={13} />
                                            <span>Delete Video</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>


            {/* ════════════════════════════════════════════════════════════════════════════ */}
            {/* VIEW 1: ✨ SUMMARY MODE CANVAS                                              */}
            {/* ════════════════════════════════════════════════════════════════════════════ */}
            {viewMode === 'summary' && (
                <div className="flex-1 overflow-y-auto scroll-smooth ai-selectable">
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
                                    <StructuredSummaryViewer summaryString={aiSummary} onSeek={handleSeekToTimestamp} />
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
                                ref={titleInputRef}
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
                        <div className="prose prose-neutral dark:prose-invert max-w-none border-none outline-none focus:ring-0">
                            <EditorContent editor={editor} className="border-none outline-none" />
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════════════ */}
            {/* VIEW 3: 🎙️ TRANSCRIPT CANVAS                                                */}
            {/* ════════════════════════════════════════════════════════════════════════════ */}
            {viewMode === 'transcript' && (
                <div className="flex-1 overflow-y-auto scroll-smooth ai-selectable">
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
                                        onClick={handleRefreshNote}
                                        disabled={isRefreshing}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all shadow-xs cursor-pointer"
                                        title="Reload transcript from database"
                                    >
                                        <RefreshCw size={13} className={cn(isRefreshing && "animate-spin text-[var(--accent)]")} />
                                        <span>Refresh</span>
                                    </button>

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
                            ) : (
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleRefreshNote}
                                        disabled={isRefreshing}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all shadow-xs cursor-pointer"
                                        title="Reload transcript from database"
                                    >
                                        <RefreshCw size={13} className={cn(isRefreshing && "animate-spin text-[var(--accent)]")} />
                                        <span>Refresh</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {note.isMeeting && note.videoPath ? (
                            <div className="flex flex-col lg:flex-row gap-8 items-start">
                                {/* Left Column: Sticky Video */}
                                <div className="w-full lg:w-1/2 lg:sticky lg:top-0">
                                    <div className="relative rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 border border-[var(--border)] shadow-sm">
                                        <video 
                                            ref={videoRef}
                                            src={convertFileSrc(note.videoPath)} 
                                            controls 
                                            className="w-full aspect-video object-contain bg-black"
                                            controlsList="nodownload"
                                        />
                                    </div>
                                    
                                    {/* Horizontal Screenshot Gallery */}
                                    {screenshots.length > 0 && (
                                        <div className="mt-4 pb-2 w-full overflow-x-auto flex gap-3 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-[var(--border)] scrollbar-track-transparent">
                                            {screenshots.map((s) => {
                                                // Calculate relative timestamp for the badge
                                                const timeInSec = Math.max(0, Math.floor((s.capturedAt - note.createdAt) / 1000));
                                                const mins = Math.floor(timeInSec / 60);
                                                const secs = timeInSec % 60;
                                                const timeString = `${mins}:${secs.toString().padStart(2, '0')}`;
                                                
                                                return (
                                                    <div 
                                                        key={s.id} 
                                                        onClick={() => {
                                                            if (videoRef.current) {
                                                                videoRef.current.currentTime = timeInSec;
                                                                videoRef.current.play().catch(() => {});
                                                            }
                                                        }}
                                                        className="snap-start shrink-0 w-32 aspect-video bg-black/5 dark:bg-white/5 rounded-lg overflow-hidden border border-[var(--border)] hover:border-[var(--accent)] transition-all cursor-pointer relative group"
                                                        title={`Jump to ${timeString}`}
                                                    >
                                                        <img 
                                                            src={convertFileSrc(s.filePath)} 
                                                            alt={`Snapshot at ${timeString}`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm shadow-sm group-hover:bg-[var(--accent)] transition-colors">
                                                            {timeString}
                                                        </div>
                                                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (confirm('Delete this screenshot?')) {
                                                                        TauriClient.deleteScreenshot(s.id).catch(console.error);
                                                                        setScreenshots(prev => prev.filter(x => x.id !== s.id));
                                                                    }
                                                                }}
                                                                className="p-1 bg-black/40 hover:bg-red-500/80 text-white rounded-md backdrop-blur-sm shadow-sm transition-colors cursor-pointer"
                                                                title="Delete Screenshot"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
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
                                                        className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-all hover:bg-[var(--surface-hover)]"
                                                    >
                                                        <p className="text-xs text-[var(--text-primary)] leading-relaxed font-sans select-text whitespace-pre-wrap">
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
                                                onClick={async () => {
                                                    await open('https://app.bacham.com/record');
                                                }}
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
                                                    className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-all hover:bg-[var(--surface-hover)]"
                                                >
                                                    <p className="text-xs text-[var(--text-primary)] leading-relaxed font-sans select-text whitespace-pre-wrap">
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
                                            onClick={async () => {
                                                try {
                                                    await invoke('trigger_extension_recording');
                                                } catch(e) {
                                                    console.error('Failed to trigger recording', e);
                                                    alert(`Failed to start recording: ${e}\n\nPlease make sure the BACHAM browser extension is installed and active.`);
                                                }
                                            }}
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

            {/* ════════════════════════════════════════════════════════════════════════════ */}
            {/* VIEW 4: ✨ AI CHAT CANVAS                                                   */}
            {/* ════════════════════════════════════════════════════════════════════════════ */}
            {viewMode === 'chat' && (
                <div className="flex-1 overflow-hidden flex flex-col relative h-full">
                    <AgenticAiChat 
                        contextName={note.title || 'Untitled Note'} 
                        contextText={note.content.replace(/<[^>]+>/g, ' ')}
                        recipes={NOTE_RECIPES}
                        position="tab"
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
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════════════ */}
            {/* VIEW 5: ⚡ ACTIVE RECALL & STUDY (FLASHCARDS & QUIZ)                         */}
            {/* ════════════════════════════════════════════════════════════════════════════ */}
            {viewMode === 'study' && hasStudyMaterial && (
                <StudyWorkspaceView
                    noteId={note.id}
                    noteTitle={note.title}
                    initialCardId={queryCardId}
                    initialQuizId={queryQuizId}
                    rawTranscript={rawTranscript}
                    noteContent={notePlainText || (editor ? editor.getText() : note.content)}
                    onSeekToTimestamp={handleSeekToTimestamp}
                />
            )}

            {/* Export as PDF Dialog Modal */}
            <ExportPdfDialog
                isOpen={isExportPdfOpen}
                onClose={() => setIsExportPdfOpen(false)}
                note={note}
                folderName={folderName}
                summary={aiSummary}
                transcript={rawTranscript}
                screenshots={screenshots}
            />

            {/* Push to Integrations Dialog Modal */}
            <ExportPushDialog
                isOpen={isExportPushOpen}
                onClose={() => setIsExportPushOpen(false)}
                lectureId={note.id}
                lectureTitle={note.title || 'Untitled Note'}
                summary={aiSummary || note.content.replace(/<[^>]+>/g, ' ').slice(0, 1000)}
                artifacts={{
                    lecture_intelligence: {
                        action_items: (() => {
                            const items: Array<{ task: string; owner?: string; due_date?: string }> = [];
                            const combined = (note.content || '').replace(/<[^>]+>/g, '\n') + '\n' + (aiSummary || '');
                            const lines = combined.split('\n');
                            for (const l of lines) {
                                const clean = l.trim();
                                if (clean.startsWith('[ ]') || clean.startsWith('- [ ]') || clean.startsWith('* [ ]')) {
                                    items.push({ task: clean.replace(/^(\[ \]|-\s*\[ \]|[*]\s*\[ \])\s*/, '') });
                                }
                            }
                            return items;
                        })(),
                        key_decisions: [],
                        key_questions: []
                    }
                }}
                transcript={rawTranscript}
            />

            {/* Live Transcript Panel has been removed to rely on browser extension */}
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
