import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Search as SearchIcon, FileText, BrainCircuit, Play, BookOpen, Clock, Command, Terminal, Tags, Sparkles, History
} from 'lucide-react';
import { useSearchStore } from '@/features/search/searchStore';
import { UniversalSearchResult, TauriClient } from '@/infrastructure/tauri-client';
import { SmoothInput } from '@/components/ui/skiper-ui/skiper106';

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
                    navigate('/settings'); 
                    break;
                case 'cmd_record':
                    // Open capture overlay or navigate to record page
                    navigate('/record');
                    break;
                case 'cmd_library':
                    navigate('/');
                    break;
                case 'cmd_gen_flashcards':
                case 'cmd_gen_quiz':
                    // Hand off to study workspace
                    navigate('/study');
                    break;
            }
        } else if (result.parentLectureId) {
            navigate(`/lectures/${result.parentLectureId}`);
        } else if (result.entityType === 'lecture') {
            navigate(`/lectures/${result.entityId}`);
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
            case 'lecture': return <Play size={16} className="text-primary" />;
            case 'transcript': return <FileText size={16} className="text-muted-foreground" />;
            case 'summary': return <BrainCircuit size={16} className="text-accent" />;
            case 'timeline': return <Clock size={16} className="text-warning" />;
            case 'flashcard': return <BookOpen size={16} className="text-blue-400" />;
            case 'command': return <Terminal size={16} className="text-green-400" />;
            case 'tag': return <Tags size={16} className="text-purple-400" />;
            default: return <BookOpen size={16} className="text-muted-foreground" />;
        }
    };

    const flatResults = results?.bestOverall || [];

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
            <div className="absolute inset-0 bg-[var(--glass-bg)] backdrop-blur-sm" onClick={close} />
            <div className="relative w-full max-w-2xl bg-surface border border-border/60 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
                
                {/* Search Input */}
                <div className="flex items-center px-4 py-3 border-b border-border/50 bg-surface/50">
                    <SearchIcon size={20} className="text-muted-foreground mr-3" />
                    <SmoothInput
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search across your knowledge & visual concepts..."
                        className="flex-1 bg-transparent border-none outline-none text-foreground text-[16px] placeholder:text-muted-foreground/50 w-full"
                        wrapperClassName="flex-1 max-w-full p-0 bg-transparent rounded-none focus-within:outline-none focus-within:ring-0 shadow-none border-none outline-none ring-0 has-[:focus-visible]:outline-none"
                    />
                    {query.trim().length > 0 && !aiMode && flatResults.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded cursor-pointer hover:bg-indigo-500/20 transition-colors" onClick={handleAskAi}>
                            <Sparkles size={12} /> <Command size={12} /> Enter to Smart Search
                        </div>
                    )}
                </div>

                {/* Filters Row */}
                {!aiMode && (
                    <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-surface-hover overflow-x-auto no-scrollbar">
                        {ENTITY_FILTERS.map(f => {
                            const isActive = (filters.entityTypes?.[0] === f.value) || (!filters.entityTypes && !f.value);
                            return (
                                <button
                                    key={f.label}
                                    onClick={() => setFilters({ entityTypes: f.value ? [f.value] : undefined })}
                                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
                                        isActive 
                                        ? 'bg-primary/20 text-primary border border-primary/30' 
                                        : 'bg-surface border border-border/50 text-muted-foreground hover:bg-surface-hover hover:text-foreground'
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
                            <div className="flex items-center gap-2 mb-4 text-accent font-medium">
                                <Sparkles size={16} />
                                AI Summary
                            </div>
                            <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                                {aiResponse}
                                {isAiLoading && <span className="animate-pulse">...</span>}
                            </div>
                            <button onClick={() => setAiMode(false)} className="mt-6 text-xs text-muted-foreground hover:text-foreground transition-colors">
                                ← Back to search results
                            </button>
                        </div>
                    ) : !query.trim() ? (
                        <div className="py-4">
                            {history.length > 0 ? (
                                <div className="space-y-1">
                                    <div className="px-3 pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent Searches</div>
                                    {history.map((item) => (
                                        <div key={item.id} onClick={() => handleSuggestionClick(item.query)} className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-surface-hover text-foreground transition-colors">
                                            <History size={14} className="text-muted-foreground" />
                                            <span className="text-sm">{item.query}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-8 text-center text-muted-foreground">
                                    <Command size={32} className="mx-auto mb-3 opacity-20" />
                                    <p>Type to search your library, transcripts, and visual concepts (e.g. diagrams)</p>
                                </div>
                            )}
                        </div>
                    ) : flatResults.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                            <p>No results found for "{query}"</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {suggestions.length > 0 && (
                                <div className="px-2 pt-2 pb-1 border-b border-border/50">
                                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Suggestions</div>
                                    <div className="flex flex-wrap gap-2">
                                        {suggestions.map((s, i) => (
                                            <div key={i} onClick={() => handleSuggestionClick(s.text)} className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-surface-hover text-foreground rounded-md border border-border/60 cursor-pointer hover:bg-primary/20 hover:text-primary hover:border-primary/30 transition-all">
                                                {s.suggestionType === 'history' ? <History size={12} /> : <SearchIcon size={12} />}
                                                {s.text}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="space-y-1">
                                {flatResults.map((result, index) => (
                                    <div
                                        key={`${result.entityType}-${result.entityId}-${index}`}
                                        onClick={() => handleSelect(result)}
                                        className={`flex items-start gap-4 p-3 rounded-xl cursor-pointer transition-colors ${
                                            index === selectedResultIndex ? 'bg-primary/10 text-primary' : 'hover:bg-surface-hover text-foreground'
                                        }`}
                                    >
                                        <div className="mt-1 shrink-0">
                                            {getIcon(result.entityType)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm truncate">{result.title || 'Untitled'}</span>
                                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border/50 shrink-0">
                                                    {result.entityType}
                                                </span>
                                            </div>
                                            {result.bodySnippet && (
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed" 
                                                   dangerouslySetInnerHTML={{ __html: result.bodySnippet.replace(/<b>/g, '<span class="text-primary font-bold">').replace(/<\/b>/g, '</span>') }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Footer Footer */}
                <div className="px-4 py-2 border-t border-border/50 bg-[var(--glass-bg)] flex items-center justify-between text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-surface rounded border border-border/50">↑</kbd><kbd className="px-1.5 py-0.5 bg-surface rounded border border-border/50">↓</kbd> Navigate</span>
                        <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-surface rounded border border-border/50">↵</kbd> Open</span>
                        {!aiMode && <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-surface rounded border border-border/50">⌘</kbd><kbd className="px-1.5 py-0.5 bg-surface rounded border border-border/50">↵</kbd> Ask AI</span>}
                    </div>
                    <span>BACHAM Universal Search</span>
                </div>
            </div>
        </div>
    );
}
