import { useRef, useEffect, useState, useMemo } from 'react';
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
    FileText, CheckSquare, Edit3, Mic, ArrowLeft, RefreshCw, Wand2,
    Globe, Pause, Play, Square
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { TauriClient } from '@/infrastructure/tauri-client';

export interface TranscriptEntry {
    id: string;
    text: string;
    speaker: string;
    timestamp: string;
    timeMs: number;
}

export const MULTILINGUAL_LANGUAGES = [
    { code: 'auto', label: 'Multi (Auto)', bcp: 'en-US', flag: '🌐' },
    { code: 'english', label: 'English (Global)', bcp: 'en-US', flag: '🇺🇸' },
    { code: 'english-in', label: 'English (India)', bcp: 'en-IN', flag: '🇮🇳' },
    { code: 'hindi', label: 'Hindi (हिंदी)', bcp: 'hi-IN', flag: '🇮🇳' },
    { code: 'telugu', label: 'Telugu (తెలుగు)', bcp: 'te-IN', flag: '🇮🇳' },
    { code: 'tamil', label: 'Tamil (தமிழ்)', bcp: 'ta-IN', flag: '🇮🇳' },
    { code: 'kannada', label: 'Kannada (ಕನ್ನಡ)', bcp: 'kn-IN', flag: '🇮🇳' },
    { code: 'malayalam', label: 'Malayalam (മലയാളം)', bcp: 'ml-IN', flag: '🇮🇳' },
    { code: 'marathi', label: 'Marathi (मराठी)', bcp: 'mr-IN', flag: '🇮🇳' },
    { code: 'bengali', label: 'Bengali (বাংলা)', bcp: 'bn-IN', flag: '🇮🇳' },
    { code: 'gujarati', label: 'Gujarati (ગુજરાતી)', bcp: 'gu-IN', flag: '🇮🇳' },
    { code: 'punjabi', label: 'Punjabi (ਪੰਜਾਬੀ)', bcp: 'pa-IN', flag: '🇮🇳' },
    { code: 'spanish', label: 'Spanish (Español)', bcp: 'es-ES', flag: '🇪🇸' },
    { code: 'french', label: 'French (Français)', bcp: 'fr-FR', flag: '🇫🇷' },
    { code: 'german', label: 'German (Deutsch)', bcp: 'de-DE', flag: '🇩🇪' },
    { code: 'japanese', label: 'Japanese (日本語)', bcp: 'ja-JP', flag: '🇯🇵' },
    { code: 'chinese', label: 'Chinese (中文)', bcp: 'zh-CN', flag: '🇨🇳' },
    { code: 'arabic', label: 'Arabic (العربية)', bcp: 'ar-SA', flag: '🇸🇦' },
    { code: 'russian', label: 'Russian (Русский)', bcp: 'ru-RU', flag: '🇷🇺' },
    { code: 'portuguese', label: 'Portuguese (Português)', bcp: 'pt-PT', flag: '🇵🇹' },
    { code: 'italian', label: 'Italian (Italiano)', bcp: 'it-IT', flag: '🇮🇹' },
    { code: 'korean', label: 'Korean (한국어)', bcp: 'ko-KR', flag: '🇰🇷' },
];

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
    const [copied, setCopied] = useState(false);
    const [dateMenuOpen, setDateMenuOpen] = useState(false);
    const [selectionMenu, setSelectionMenu] = useState<{ x: number; y: number } | null>(null);

    const folderMenuRef = useRef<HTMLDivElement>(null);
    const dateMenuRef = useRef<HTMLDivElement>(null);
    const langMenuRef = useRef<HTMLDivElement>(null);

    // ── 3-WAY VIEW MODES: 'summary' | 'notes' | 'transcript' ──────────────────────
    const [viewMode, setViewMode] = useState<'summary' | 'notes' | 'transcript'>('summary');
    const [rawTranscript, setRawTranscript] = useState<string>(() => note.transcript || localStorage.getItem(`transcript_${note.id}`) || '');
    const [aiSummary, setAiSummary] = useState<string>(() => note.summary || localStorage.getItem(`summary_${note.id}`) || '');
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [transcriptSearch, setTranscriptSearch] = useState<string>('');
    const [transcriptCopied, setTranscriptCopied] = useState(false);
    const [summaryCopied, setSummaryCopied] = useState(false);
    const [isPolishingTranscript, setIsPolishingTranscript] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);

    // ── Studio-Grade Live Recording Engine State ─────────────────────────────
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [interimText, setInterimText] = useState('');
    const [selectedLanguage, setSelectedLanguage] = useState('auto');
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const [langSearch, setLangSearch] = useState('');

    const speechRecRef = useRef<any>(null);
    const recordingRef = useRef<boolean>(false);
    const isPausedRef = useRef<boolean>(false);

    useEffect(() => {
        recordingRef.current = isRecording;
        isPausedRef.current = isPaused;
    }, [isRecording, isPaused]);

    // Parse transcript lines into structured entries
    const transcriptEntries = useMemo<TranscriptEntry[]>(() => {
        if (!rawTranscript.trim()) return [];
        return rawTranscript.split('\n').filter(Boolean).map((line, idx) => {
            const match = line.match(/^\[(.*?)\]\s*(Speaker\s*\d+:)?\s*(.*)$/i);
            if (match) {
                return {
                    id: `entry-${idx}`,
                    timestamp: match[1] || `00:${(idx * 8).toString().padStart(2, '0')}`,
                    speaker: match[2]?.replace(':', '') || `Speaker ${Math.floor(idx / 3) + 1}`,
                    text: match[3] || line,
                    timeMs: Date.now()
                };
            }
            return {
                id: `entry-${idx}`,
                timestamp: `00:${(idx * 8).toString().padStart(2, '0')}`,
                speaker: `Speaker ${Math.floor(idx / 3) + 1}`,
                text: line,
                timeMs: Date.now()
            };
        });
    }, [rawTranscript]);

    useEffect(() => {
        const storedTranscript = note.transcript || localStorage.getItem(`transcript_${note.id}`) || '';
        const storedSummary = note.summary || localStorage.getItem(`summary_${note.id}`) || '';
        setRawTranscript(storedTranscript);
        setAiSummary(storedSummary);
    }, [note.id, note.transcript, note.summary]);

    // Timer during active recording
    useEffect(() => {
        if (!isRecording || isPaused) return;
        const interval = setInterval(() => {
            setRecordingTime(t => t + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [isRecording, isPaused]);

    const formatTimer = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // ── Live Speech Recognition Engine (Google Neural + Whisper Fallback) ──────
    const startAudioRecording = async () => {
        setIsRecording(true);
        setIsPaused(false);
        setRecordingTime(0);
        setInterimText('');

        try {
            await TauriClient.startNativeRecording();
        } catch (err) {
            console.warn("Native capture start warning:", err);
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            try {
                const recognition = new SpeechRecognition();
                const targetLang = MULTILINGUAL_LANGUAGES.find(l => l.code === selectedLanguage);
                recognition.lang = targetLang?.bcp || 'en-US';
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.maxAlternatives = 1;

                recognition.onresult = (event: any) => {
                    if (!recordingRef.current || isPausedRef.current) return;
                    let interim = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        const transcript = event.results[i][0].transcript;
                        if (event.results[i].isFinal) {
                            const trimmed = transcript.trim();
                            if (trimmed) {
                                setRawTranscript(prev => {
                                    const updated = prev ? `${prev}\n${trimmed}` : trimmed;
                                    localStorage.setItem(`transcript_${note.id}`, updated);
                                    onUpdate({ transcript: updated });
                                    return updated;
                                });
                                setInterimText('');
                            }
                        } else {
                            interim += transcript;
                        }
                    }
                    if (interim) {
                        setInterimText(interim);
                    }
                };

                recognition.onend = () => {
                    if (recordingRef.current && !isPausedRef.current) {
                        try { recognition.start(); } catch (_) {}
                    }
                };

                recognition.start();
                speechRecRef.current = recognition;
            } catch (err) {
                console.warn("SpeechRecognition init error:", err);
            }
        }
    };

    const stopAudioRecording = async () => {
        setIsRecording(false);
        setIsPaused(false);
        setInterimText('');

        if (speechRecRef.current) {
            try { speechRecRef.current.stop(); } catch (_) {}
            speechRecRef.current = null;
        }

        try {
            await TauriClient.stopNativeRecording();
        } catch (err) {
            console.error("Stop native recording failed:", err);
        }
    };

    const togglePauseRecording = () => {
        if (isPaused) {
            setIsPaused(false);
            if (speechRecRef.current) {
                try { speechRecRef.current.start(); } catch (_) {}
            }
        } else {
            setIsPaused(true);
            if (speechRecRef.current) {
                try { speechRecRef.current.stop(); } catch (_) {}
            }
        }
    };

    const handleLanguageChange = (langCode: string) => {
        setSelectedLanguage(langCode);
        setIsLangMenuOpen(false);
        if (speechRecRef.current) {
            try {
                speechRecRef.current.stop();
                const target = MULTILINGUAL_LANGUAGES.find(l => l.code === langCode);
                speechRecRef.current.lang = target?.bcp || 'en-US';
                if (isRecording && !isPaused) {
                    speechRecRef.current.start();
                }
            } catch (_) {}
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (speechRecRef.current) {
                try { speechRecRef.current.stop(); } catch (_) {}
            }
            TauriClient.stopNativeRecording().catch(console.error);
        };
    }, []);

    // ── Editor Setup ────────────────────────────────────────────────────────
    const editor = useEditor({
        extensions: [
            StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
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

    // Floating Selection Menu Position
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
            if (isLangMenuOpen && langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
                setIsLangMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [folderMenuOpen, dateMenuOpen, isLangMenuOpen]);

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
        try {
            await navigator.clipboard.writeText(title + bodyText);
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

    const handlePolishTranscript = async () => {
        if (!rawTranscript.trim() || isPolishingTranscript) return;
        setIsPolishingTranscript(true);
        try {
            const prompt = `You are an expert multilingual audio transcriber and linguist. Clean and polish the following verbatim transcript: correct minor speech recognition artifacts, fix punctuation, capitalization, proper nouns, and format into readable dialogue without altering any facts or spoken meaning:

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

    const handleTranslateTranscript = async () => {
        if (!rawTranscript.trim() || isTranslating) return;
        setIsTranslating(true);
        try {
            const prompt = `Translate and format this transcript into clear, professional English while preserving speaker dialogue and context:

Raw Transcript:
${rawTranscript}

Return only the English translated dialogue:`;

            const translated = await TauriClient.sendGlobalMemoryChat(prompt, []);
            if (translated) {
                setRawTranscript(translated);
                localStorage.setItem(`transcript_${note.id}`, translated);
                onUpdate({ transcript: translated });
            }
        } catch (err) {
            console.error("Failed to translate transcript", err);
        } finally {
            setIsTranslating(false);
        }
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

    // Filtered transcript lines for search
    const filteredTranscriptEntries = transcriptEntries.filter(
        entry => !transcriptSearch.trim() || entry.text.toLowerCase().includes(transcriptSearch.toLowerCase())
    );

    const transcriptWordCount = (rawTranscript || '').split(/\s+/).filter(Boolean).length;
    const estimatedMinutes = Math.max(1, Math.round(transcriptWordCount / 140));
    const activeLangObj = MULTILINGUAL_LANGUAGES.find(l => l.code === selectedLanguage) || MULTILINGUAL_LANGUAGES[0];

    const filteredLanguages = MULTILINGUAL_LANGUAGES.filter(
        l => !langSearch.trim() || l.label.toLowerCase().includes(langSearch.toLowerCase()) || l.code.toLowerCase().includes(langSearch.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-[var(--bg)] overflow-hidden relative text-[var(--text-primary)] font-sans">

            {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
            <div data-tauri-drag-region="false" className="h-14 shrink-0 flex items-center justify-between pl-16 pr-28 sticky top-0 bg-[var(--bg)] z-[100] border-b border-[var(--border)] pointer-events-auto select-none">
                <div data-tauri-drag-region="false" className="flex items-center gap-2">
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
                <div data-tauri-drag-region="false" className="flex items-center p-1 rounded-lg bg-[var(--surface)] border border-[var(--border)] shadow-xs pointer-events-auto gap-1">
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
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer relative",
                            viewMode === 'transcript'
                                ? "bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-xs border border-[var(--border)] font-semibold"
                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] font-medium"
                        )}
                    >
                        <Mic size={12} className={cn(isRecording ? "text-emerald-500 animate-pulse" : (viewMode === 'transcript' ? "text-[var(--accent)]" : "opacity-70"))} />
                        <span>Transcript</span>
                        {isRecording ? (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        ) : rawTranscript ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                        ) : null}
                    </button>
                </div>

                {/* Right Action Controls */}
                <div data-tauri-drag-region="false" className="flex items-center gap-2 pointer-events-auto">
                    {/* Record CTA Toggle */}
                    <button
                        data-tauri-drag-region="false"
                        type="button"
                        onClick={isRecording ? stopAudioRecording : startAudioRecording}
                        className={cn(
                            "px-3.5 py-1.5 text-xs font-semibold rounded-md shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                            isRecording
                                ? "bg-red-500/90 hover:bg-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.4)]"
                                : "bg-[var(--text-primary)] hover:bg-[var(--text-secondary)] text-[var(--bg)]"
                        )}
                        title={isRecording ? "Stop Live Recording" : "Start Live Multilingual Recording"}
                    >
                        {isRecording ? (
                            <>
                                <Square size={11} className="fill-current" />
                                <span>Stop ({formatTimer(recordingTime)})</span>
                            </>
                        ) : (
                            <>
                                <Mic size={13} />
                                <span>Record</span>
                            </>
                        )}
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
                            <div className="text-sm text-[var(--text-primary)] leading-relaxed font-sans prose prose-neutral dark:prose-invert max-w-none">
                                <div 
                                    className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-4"
                                    dangerouslySetInnerHTML={{ 
                                        __html: aiSummary
                                            .replace(/^## (.*$)/gim, '<h3 class="text-[15px] font-semibold text-[var(--text-primary)] mt-4 mb-2 pb-1 border-b border-[var(--border)]">$1</h3>')
                                            .replace(/^### (.*$)/gim, '<h4 class="text-[13.5px] font-medium text-[var(--text-primary)] mt-3 mb-1">$1</h4>')
                                            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-[var(--text-primary)]">$1</strong>')
                                            .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc text-xs text-[var(--text-secondary)]">$1</li>')
                                            .replace(/\n/g, '<br/>')
                                    }} 
                                />
                            </div>
                        ) : (
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
            {/* VIEW 3: 🎙️ STUDIO-GRADE MULTILINGUAL LIVE TRANSCRIPT CANVAS                 */}
            {/* ════════════════════════════════════════════════════════════════════════════ */}
            {viewMode === 'transcript' && (
                <div className="flex-1 overflow-y-auto scroll-smooth">
                    <div className="max-w-3xl mx-auto px-8 py-8 pb-48 flex flex-col gap-6">
                        
                        {/* Live Recording Ribbon (When Active) */}
                        {isRecording && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between shadow-xs"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                                    <div>
                                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                            Live Multilingual Audio Stream Active ({activeLangObj.label})
                                        </p>
                                        <p className="text-[11px] text-[var(--text-muted)]">
                                            Real-time Google Neural Speech Engine capturing speaker dialogue
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                        {formatTimer(recordingTime)}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={togglePauseRecording}
                                        className="p-1.5 rounded-md bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs text-[var(--text-primary)] cursor-pointer"
                                        title={isPaused ? "Resume" : "Pause"}
                                    >
                                        {isPaused ? <Play size={12} /> : <Pause size={12} />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={stopAudioRecording}
                                        className="px-2.5 py-1 rounded-md bg-red-500 hover:bg-red-600 text-white text-xs font-medium cursor-pointer"
                                    >
                                        Finish
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Transcript Canvas Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border)]">
                            <div>
                                <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)] select-none mb-1 flex items-center gap-1.5">
                                    <span>Audio Intelligence</span>
                                    <span>•</span>
                                    <span className="text-[var(--accent)]">{activeLangObj.flag} {activeLangObj.label}</span>
                                </p>
                                <h1 className="text-[24px] font-semibold text-[var(--text-primary)] tracking-tight leading-tight">
                                    Verbatim Meeting Transcript
                                </h1>
                                <p className="text-xs text-[var(--text-secondary)] mt-1">
                                    {rawTranscript ? `${transcriptWordCount} words • ~${estimatedMinutes} min speech context` : 'No audio recording attached yet'}
                                </p>
                            </div>

                            {/* Transcript Canvas Actions */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {/* Language Switcher Dropdown */}
                                <div className="relative" ref={langMenuRef}>
                                    <button
                                        type="button"
                                        onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-medium text-[var(--text-primary)] shadow-xs transition-all cursor-pointer"
                                        title="Select Speech Recognition Language"
                                    >
                                        <span>{activeLangObj.flag}</span>
                                        <span className="max-w-[80px] truncate">{activeLangObj.label.split(' ')[0]}</span>
                                        <ChevronDown size={11} className="opacity-60" />
                                    </button>

                                    {isLangMenuOpen && (
                                        <div className="absolute right-0 top-9 w-60 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl p-2 z-50 max-h-72 flex flex-col gap-1 overflow-hidden">
                                            <div className="px-2 pb-2 border-b border-[var(--border)]">
                                                <input
                                                    type="text"
                                                    value={langSearch}
                                                    onChange={e => setLangSearch(e.target.value)}
                                                    placeholder="Search language..."
                                                    className="w-full px-2 py-1 text-xs bg-[var(--bg)] border border-[var(--border)] rounded-md outline-none text-[var(--text-primary)]"
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="overflow-y-auto max-h-52 space-y-0.5">
                                                {filteredLanguages.map(lang => (
                                                    <button
                                                        type="button"
                                                        key={lang.code}
                                                        onClick={() => handleLanguageChange(lang.code)}
                                                        className={cn(
                                                            "w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center justify-between cursor-pointer",
                                                            selectedLanguage === lang.code 
                                                                ? "text-[var(--accent)] bg-[var(--surface-hover)] font-semibold" 
                                                                : "text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                                                        )}
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <span>{lang.flag}</span>
                                                            <span>{lang.label}</span>
                                                        </span>
                                                        {selectedLanguage === lang.code && <Check size={12} />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {rawTranscript ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => handleGenerateSummary()}
                                            disabled={isGeneratingSummary}
                                            className="px-3.5 py-1.5 bg-[var(--text-primary)] hover:bg-[var(--text-secondary)] text-[var(--bg)] text-xs font-semibold rounded-md shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                            title="Generate structured summary from transcript"
                                        >
                                            <Sparkles size={13} className={isGeneratingSummary ? "animate-spin" : ""} />
                                            <span>{isGeneratingSummary ? 'Synthesizing...' : 'Synthesize Summary'}</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handlePolishTranscript}
                                            disabled={isPolishingTranscript}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-medium text-[var(--text-primary)] transition-all shadow-xs cursor-pointer disabled:opacity-50"
                                            title="Clean up speech errors, proper nouns, and format with AI"
                                        >
                                            <Wand2 size={13} className={isPolishingTranscript ? "animate-spin text-[var(--accent)]" : "text-[var(--accent)]"} />
                                            <span>{isPolishingTranscript ? 'Polishing...' : 'AI Polish'}</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleTranslateTranscript}
                                            disabled={isTranslating}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-medium text-[var(--text-primary)] transition-all shadow-xs cursor-pointer disabled:opacity-50"
                                            title="Translate transcript into clean English"
                                        >
                                            <Globe size={13} className={isTranslating ? "animate-spin text-[var(--accent)]" : "text-[var(--accent)]"} />
                                            <span>{isTranslating ? 'Translating...' : 'Translate'}</span>
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
                                    </>
                                ) : null}
                            </div>
                        </div>

                        {/* Transcript Search Bar */}
                        {rawTranscript ? (
                            <div className="relative">
                                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                <input
                                    type="text"
                                    value={transcriptSearch}
                                    onChange={e => setTranscriptSearch(e.target.value)}
                                    placeholder="Search in spoken transcript..."
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

                        {/* Transcript Stream Timeline */}
                        {rawTranscript || interimText ? (
                            <div className="space-y-3">
                                {filteredTranscriptEntries.length > 0 ? (
                                    filteredTranscriptEntries.map((entry) => (
                                        <div 
                                            key={entry.id} 
                                            className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_1px_4px_rgba(0,0,0,0.04)] flex flex-col gap-1.5 transition-all hover:bg-[var(--surface-hover)]"
                                        >
                                            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-medium">
                                                <div className="flex items-center gap-1.5 text-[var(--accent)] font-semibold">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                                                    <span>{entry.speaker}</span>
                                                </div>
                                                <span className="tabular-nums font-mono">{entry.timestamp}</span>
                                            </div>
                                            <p className="text-xs text-[var(--text-primary)] leading-relaxed font-sans">
                                                {entry.text}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12 text-xs text-[var(--text-muted)]">
                                        No transcript lines matching "{transcriptSearch}".
                                    </div>
                                )}

                                {/* Real-time Live Interim Preview */}
                                {interimText && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] border-dashed shadow-xs flex flex-col gap-1"
                                    >
                                        <div className="flex items-center gap-1.5 text-[11px] text-[var(--accent)] font-semibold">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-ping" />
                                            <span>Listening...</span>
                                        </div>
                                        <p className="text-xs text-[var(--text-muted)] italic leading-relaxed">
                                            {interimText} <span className="animate-pulse text-[var(--accent)] font-bold">|</span>
                                        </p>
                                    </motion.div>
                                )}
                            </div>
                        ) : (
                            /* Clean Empty State */
                            <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-xl bg-[var(--surface)] border border-dashed border-[var(--border)]">
                                <div className="p-4 rounded-xl bg-[var(--accent-dim)] text-[var(--accent)] mb-3 shadow-xs">
                                    <Mic size={26} />
                                </div>
                                <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">
                                    No transcript recorded yet
                                </h3>
                                <p className="text-xs text-[var(--text-muted)] max-w-sm mb-6 leading-relaxed">
                                    Record your meeting, interview, or lecture. Real-time multilingual speech recognition will transcribe and format dialogue live here.
                                </p>
                                <button
                                    type="button"
                                    onClick={startAudioRecording}
                                    className="px-5 py-2.5 bg-[var(--text-primary)] hover:bg-[var(--text-secondary)] text-[var(--bg)] text-xs font-semibold rounded-md shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all flex items-center gap-2 cursor-pointer"
                                >
                                    <Mic size={14} />
                                    <span>Start Live Multilingual Recording</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Compact Floating Recording Dock (When recording in Notes or Summary mode) ── */}
            {isRecording && viewMode !== 'transcript' && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-2xl backdrop-blur-xl"
                >
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                        <span className="text-xs font-semibold text-[var(--text-primary)]">
                            Recording ({activeLangObj.flag} {activeLangObj.label.split(' ')[0]})
                        </span>
                        <span className="text-xs font-mono font-bold text-emerald-500 tabular-nums">
                            {formatTimer(recordingTime)}
                        </span>
                    </div>

                    <div className="h-4 w-px bg-[var(--border)]" />

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setViewMode('transcript')}
                            className="px-3 py-1 text-xs font-medium rounded-full bg-[var(--surface-hover)] text-[var(--accent)] hover:underline cursor-pointer"
                        >
                            View Live Transcript
                        </button>
                        <button
                            type="button"
                            onClick={stopAudioRecording}
                            className="px-3 py-1 text-xs font-semibold rounded-full bg-red-500 hover:bg-red-600 text-white cursor-pointer"
                        >
                            Stop
                        </button>
                    </div>
                </motion.div>
            )}

            {/* AI Assistant Chat Dock */}
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
