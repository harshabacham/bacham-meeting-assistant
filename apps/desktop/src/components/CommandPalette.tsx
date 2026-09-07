import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Search as SearchIcon, FileText, BrainCircuit, Play, BookOpen, Clock, Command, Terminal, Tags, Sparkles, History,
    MessageSquareHeart, X
} from 'lucide-react';
import { useSearchStore } from '@/features/search/searchStore';
import { UniversalSearchResult, TauriClient } from '@/infrastructure/tauri-client';
import { useFeedbackStore } from '@/shared/stores/feedbackStore';

const ENTITY_FILTERS = [
    { label: 'All', value: undefined },
    { label: 'Lectures', value: 'lecture' },
    { label: 'Transcripts', value: 'transcript' },
    { label: 'Notes', value: 'note' },
    { label: 'Flashcards', value: 'flashcard' },
    { label: 'Quizzes', value: 'quiz' },
    { label: 'Commands', value: 'command' },
];

export function CommandPalette() {
    const { 
        isOpen, query, results, selectedResultIndex, suggestions, history,
        setQuery, open, close, navigateResults, filters, setFilters 
    } = useSearchStore();
    
    const navigate = useNavigate();
    const { openModal: openFeedbackModal } = useFeedbackStore();

    // RAG AI State
    const [aiMode, setAiMode] = useState(false);
    const [aiResponse, setAiResponse] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    
    // Global shortcut to open
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                if (isOpen) close();
                else open();
            }
            if (e.key === 'Escape' && isOpen) {
                if (aiMode) {
                    setAiMode(false);
                    setAiResponse('');
                } else {
                    close();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, open, close, aiMode]);

    // Listen to AI streaming
    useEffect(() => {
        if (!isOpen) return;
        const unlisten = TauriClient.onSearchSummaryChunk((event) => {
            setAiResponse(prev => prev + event.chunk);
            setIsAiLoading(false);
        });
        return () => {
            unlisten.then(fn => fn());
        };
    }, [isOpen]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                navigateResults('down');
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                navigateResults('up');
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (e.metaKey || e.ctrlKey) {
                    handleAskAi();
                } else if (results && results.bestOverall.length > 0 && selectedResultIndex >= 0) {
                    handleSelect(results.bestOverall[selectedResultIndex]);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, results, selectedResultIndex, navigateResults, query]);

    const handleSelect = (result: UniversalSearchResult) => {
        close();
        if (result.entityType === 'command') {
            switch (result.entityId) {
                case 'cmd_settings': 
                    navigate('/settings'); 
                    break;
                case 'cmd_theme': 
                    navigate('/settings?tab=appearance'); 
                    break;
                case 'cmd_integrations':
                    navigate('/settings?tab=integrations');
                    break;
                case 'cmd_record':
                    navigate('/copilot');
                    break;
                case 'cmd_library':
                case 'cmd_notes':
                    navigate('/notes');
                    break;
                case 'cmd_tasks':
                    navigate('/tasks');
                    break;
                case 'cmd_ai':
                    navigate('/ai');
                    break;
                case 'cmd_trash':
                    navigate('/trash');
                    break;
                case 'cmd_gen_flashcards':
                case 'cmd_gen_quiz':
                    navigate('/ai');
                    break;
                case 'cmd_feedback':
                    openFeedbackModal('general');
                    break;
                case 'cmd_bug':
                    openFeedbackModal('bug');
                    break;
                case 'cmd_suggestion':
                    openFeedbackModal('suggestion');
                    break;
                default:
                    navigate('/notes');
                    break;
            }
        } else if (result.entityType === 'folder' || result.entityType === 'collection') {
            navigate(`/notes?folderId=${encodeURIComponent(result.entityId)}`);
        } else if (result.entityType === 'task' || result.entityType === 'action_item') {
            const queryParam = result.title ? `&q=${encodeURIComponent(result.title)}` : '';
            navigate(`/tasks?taskId=${encodeURIComponent(result.entityId)}${queryParam}`);
        } else if (result.entityType === 'conversation' || result.entityType === 'message') {
            navigate('/ai');
        } else if (result.entityType === 'note') {
            const targetNoteId = result.entityId || result.parentLectureId;
            if (targetNoteId) {
                navigate(`/notes?noteId=${encodeURIComponent(targetNoteId)}&tab=notes`);
            } else {
                navigate('/notes');
            }
        } else if (result.entityType === 'lecture') {
            navigate(`/notes?noteId=${encodeURIComponent(result.entityId)}`);
        } else if (result.entityType === 'flashcard') {
            const targetId = result.parentLectureId || result.entityId;
            const cardId = result.entityId;
            if (targetId) {
                navigate(`/notes?noteId=${encodeURIComponent(targetId)}&tab=study&cardId=${encodeURIComponent(cardId)}`);
            } else {
                navigate('/notes');
            }
        } else if (result.entityType === 'quiz') {
            const targetId = result.parentLectureId || result.entityId;
            const quizId = result.entityId;
            if (targetId) {
                navigate(`/notes?noteId=${encodeURIComponent(targetId)}&tab=study&quizId=${encodeURIComponent(quizId)}`);
            } else {
                navigate('/notes');
            }
        } else if (result.entityType === 'transcript') {
            const targetId = result.parentLectureId || result.entityId;
            if (targetId) {
                navigate(`/notes?noteId=${encodeURIComponent(targetId)}&tab=transcript`);
            } else {
                navigate('/notes');
            }
        } else if (result.entityType === 'summary' || result.entityType === 'artifact') {
            const targetId = result.parentLectureId || result.entityId;
            if (targetId) {
                navigate(`/notes?noteId=${encodeURIComponent(targetId)}&tab=summary`);
            } else {
                navigate('/notes');
            }
        } else {
            // Fallback for any other indexed entity
            const targetId = result.entityId || result.parentLectureId;
            if (targetId) {
                navigate(`/notes?noteId=${encodeURIComponent(targetId)}`);
            } else {
                navigate('/notes');
            }
        }
    };

    const handleSuggestionClick = (text: string) => {
        setQuery(text);
    };

    const handleAskAi = async () => {
        if (!query.trim()) return;
        setAiMode(true);
        setIsAiLoading(true);
        setAiResponse('');
        try {
            const res = await TauriClient.semanticSearch(query);
            if (res.lectureId) {
                setAiResponse(`**Found match!**\n\n${res.answer}\n\n[Open Lecture](#/lectures/${res.lectureId}?t=${res.timestampMs || 0})`);
            } else {
                setAiResponse(res.answer);
            }
        } catch (e) {
            setAiResponse("Failed to perform semantic search.");
        } finally {
            setIsAiLoading(false);
        }
    };

    if (!isOpen) return null;

    const getIcon = (type: string) => {
        switch (type) {
            case 'lecture': return <Play size={15} className="text-violet-400" />;
            case 'transcript': return <FileText size={15} className="text-neutral-400" />;
            case 'summary': return <BrainCircuit size={15} className="text-amber-400" />;
            case 'timeline': return <Clock size={15} className="text-sky-400" />;
            case 'flashcard': return <BookOpen size={15} className="text-blue-400" />;
            case 'command': return <Terminal size={15} className="text-emerald-400" />;
            case 'tag': return <Tags size={15} className="text-purple-400" />;
            default: return <BookOpen size={15} className="text-neutral-400" />;
        }
    };

    const flatResults = results?.bestOverall || [];

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh] px-4 selection:bg-neutral-800 selection:text-white">
            <div 
                className="absolute inset-0 bg-black/65 backdrop-blur-sm transition-opacity" 
                onClick={close} 
            />
            <div className="relative w-full max-w-2xl bg-[#18181b]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.06)] overflow-hidden transition-all">
                
                {/* Search Input */}
                <div className="flex items-center px-4 py-3.5 border-b border-white/10 bg-transparent">
                    <SearchIcon size={18} className="text-neutral-400 shrink-0 mr-3 pointer-events-none" />
                    <input
                        autoFocus
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search across your knowledge & visual concepts..."
                        className="flex-1 bg-transparent border-0 outline-none ring-0 focus:outline-none focus:ring-0 text-white text-[15px] placeholder:text-neutral-500 w-full"
                        style={{ boxShadow: 'none' }}
                    />
                    {query.trim().length > 0 && (
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                            <button 
                                type="button"
                                onClick={() => setQuery('')}
                                className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                title="Clear search"
                            >
                                <X size={14} />
                            </button>
                            {!aiMode && flatResults.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleAskAi}
                                    className="flex items-center gap-1.5 text-xs text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-1 rounded-lg hover:bg-indigo-500/25 transition-all cursor-pointer font-medium"
                                >
                                    <Sparkles size={12} className="text-indigo-400" />
                                    <span>Ask AI</span>
                                    <kbd className="text-[10px] text-indigo-300/80 font-mono">⌘↵</kbd>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Filters Row */}
                {!aiMode && (
                    <div className="flex items-center gap-1.5 px-4 py-2 border-b border-white/[0.06] bg-black/20 overflow-x-auto no-scrollbar">
                        {ENTITY_FILTERS.map(f => {
                            const isActive = (filters.entityTypes?.[0] === f.value) || (!filters.entityTypes && !f.value);
                            return (
                                <button
                                    key={f.label}
                                    type="button"
                                    onClick={() => setFilters({ entityTypes: f.value ? [f.value] : undefined })}
                                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                                        isActive 
                                        ? 'bg-white/15 text-white border border-white/20 shadow-xs' 
                                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5 border border-transparent'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Results / AI Area */}
                <div className="max-h-[50vh] overflow-y-auto p-2">
                    {aiMode ? (
                        <div className="p-4">
                            <div className="flex items-center gap-2 mb-3 text-indigo-400 font-medium text-sm">
                                <Sparkles size={16} />
                                <span>AI Summary</span>
                            </div>
                            <div className="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap font-sans bg-black/30 p-4 rounded-xl border border-white/5">
                                {aiResponse}
                                {isAiLoading && <span className="inline-block animate-pulse ml-1 text-indigo-400">...</span>}
                            </div>
                            <button 
                                type="button"
                                onClick={() => setAiMode(false)} 
                                className="mt-4 inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
                            >
                                ← Back to search results
                            </button>
                        </div>
                    ) : !query.trim() ? (
                        <div className="py-2 px-1">
                            {history.length > 0 ? (
                                <div className="space-y-0.5">
                                    <div className="px-3 pb-1.5 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Recent Searches</div>
                                    {history.map((item) => (
                                        <div 
                                            key={item.id} 
                                            onClick={() => handleSuggestionClick(item.query)} 
                                            className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer hover:bg-white/[0.06] text-neutral-300 hover:text-white transition-colors"
                                        >
                                            <History size={14} className="text-neutral-500 shrink-0" />
                                            <span className="text-sm">{item.query}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-10 text-center text-neutral-400">
                                    <Command size={28} className="mx-auto mb-3 text-neutral-600 stroke-[1.5]" />
                                    <p className="text-sm font-medium text-neutral-300">Quick Search & Navigation</p>
                                    <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                                        Type keywords to search across lectures, transcripts, notes, or invoke commands.
                                    </p>
                                    <div className="mt-5 flex justify-center">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                close();
                                                openFeedbackModal();
                                            }}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs bg-white/[0.04] hover:bg-white/[0.08] text-neutral-400 hover:text-neutral-200 border border-white/10 transition-all cursor-pointer"
                                        >
                                            <MessageSquareHeart size={13} className="text-rose-400" />
                                            <span>Share Feedback or Report Bug</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : flatResults.length === 0 ? (
                        <div className="py-12 text-center text-neutral-500 text-sm">
                            No results found for &ldquo;<span className="text-neutral-300">{query}</span>&rdquo;
                        </div>
                    ) : (
                        <div className="space-y-3 p-1">
                            {suggestions.length > 0 && (
                                <div className="px-2 pt-1 pb-2 border-b border-white/[0.06]">
                                    <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">Suggestions</div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {suggestions.map((s, i) => (
                                            <button 
                                                key={i} 
                                                type="button"
                                                onClick={() => handleSuggestionClick(s.text)} 
                                                className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-white/[0.04] text-neutral-300 rounded-lg border border-white/[0.08] cursor-pointer hover:bg-white/[0.08] hover:text-white transition-all"
                                            >
                                                {s.suggestionType === 'history' ? <History size={12} className="text-neutral-500" /> : <SearchIcon size={12} className="text-neutral-500" />}
                                                <span>{s.text}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="space-y-1">
                                {flatResults.map((result, index) => (
                                    <div
                                        key={`${result.entityType}-${result.entityId}-${index}`}
                                        onClick={() => handleSelect(result)}
                                        className={`flex items-start gap-3.5 p-2.5 rounded-xl cursor-pointer transition-all ${
                                            index === selectedResultIndex 
                                            ? 'bg-white/[0.09] text-white border border-white/10 shadow-xs' 
                                            : 'hover:bg-white/[0.04] text-neutral-300 border border-transparent'
                                        }`}
                                    >
                                        <div className="mt-1 shrink-0 p-1.5 rounded-lg bg-white/[0.04]">
                                            {getIcon(result.entityType)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm text-white truncate">{result.title || 'Untitled'}</span>
                                                <span className="text-[10px] font-medium tracking-wide uppercase text-neutral-400 bg-white/[0.05] px-1.5 py-0.5 rounded border border-white/[0.08] shrink-0">
                                                    {result.entityType}
                                                </span>
                                            </div>
                                            {result.bodySnippet && (
                                                <p className="text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed" 
                                                   dangerouslySetInnerHTML={{ __html: result.bodySnippet.replace(/<b>/g, '<span class="text-indigo-300 font-semibold underline underline-offset-2">').replace(/<\/b>/g, '</span>') }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-white/10 bg-black/25 flex items-center justify-between text-[11px] text-neutral-400">
                    <div className="flex items-center gap-3.5">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-white/[0.08] rounded border border-white/10 text-[10px] font-mono text-neutral-300 shadow-xs">↑</kbd>
                            <kbd className="px-1.5 py-0.5 bg-white/[0.08] rounded border border-white/10 text-[10px] font-mono text-neutral-300 shadow-xs">↓</kbd>
                            <span className="ml-1 text-neutral-400">Navigate</span>
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-white/[0.08] rounded border border-white/10 text-[10px] font-mono text-neutral-300 shadow-xs">↵</kbd>
                            <span className="ml-1 text-neutral-400">Open</span>
                        </span>
                        {!aiMode && (
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-white/[0.08] rounded border border-white/10 text-[10px] font-mono text-neutral-300 shadow-xs">⌘</kbd>
                                <kbd className="px-1.5 py-0.5 bg-white/[0.08] rounded border border-white/10 text-[10px] font-mono text-neutral-300 shadow-xs">↵</kbd>
                                <span className="ml-1 text-neutral-400">Ask AI</span>
                            </span>
                        )}
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-white/[0.08] rounded border border-white/10 text-[10px] font-mono text-neutral-300 shadow-xs">esc</kbd>
                            <span className="ml-1 text-neutral-400">Close</span>
                        </span>
                    </div>
                    <span className="text-[10px] tracking-wide text-neutral-500 font-medium">BACHAM Universal Search</span>
                </div>
            </div>
        </div>
    );
}
