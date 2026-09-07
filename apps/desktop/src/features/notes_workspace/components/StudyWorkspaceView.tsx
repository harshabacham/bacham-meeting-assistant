import { useState, useEffect, useMemo, useCallback } from 'react';
import { TauriClient, Flashcard, QuizQuestion } from '@/infrastructure/tauri-client';
import { invoke } from '@tauri-apps/api/core';
import { 
    Zap, BookOpen, CheckCircle, RefreshCw, ChevronLeft, ChevronRight, 
    Plus, Edit2, Trash2, Sparkles, HelpCircle, Search, Layers, X, ArrowRight
} from 'lucide-react';
import { cn } from '@/components';
import { useConfirmStore } from '@/components/ui/ConfirmProvider';
import { useToast } from '@/components/ui/ToastProvider';

interface StudyWorkspaceViewProps {
    noteId: string;
    noteTitle?: string;
    initialCardId?: string | null;
    initialQuizId?: string | null;
    rawTranscript?: string;
    noteContent?: string;
    onSeekToTimestamp?: (ts: string) => void;
}

export function StudyWorkspaceView({
    noteId,
    noteTitle: _noteTitle,
    initialCardId,
    initialQuizId,
    rawTranscript,
    noteContent,
}: StudyWorkspaceViewProps) {
    const { showToast } = useToast();
    const { showConfirm } = useConfirmStore();

    // Data states
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [quizzes, setQuizzes] = useState<QuizQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [subTab, setSubTab] = useState<'deck' | 'list' | 'quiz'>(initialQuizId ? 'quiz' : 'deck');

    // Deck practice states
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isReviewing, setIsReviewing] = useState(false);

    // AI Generation states
    const [isGeneratingCards, setIsGeneratingCards] = useState(false);
    const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

    // Card List / Creation / Editing states
    const [searchFilter, setSearchFilter] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [newQuestion, setNewQuestion] = useState('');
    const [newAnswer, setNewAnswer] = useState('');
    const [newDifficulty, setNewDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editQuestion, setEditQuestion] = useState('');
    const [editAnswer, setEditAnswer] = useState('');
    const [, setEditDifficulty] = useState<string>('medium');
    const [, setReviewedCount] = useState<number>(0);

    // Load flashcards and quizzes
    const loadStudyData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [cards, quizList] = await Promise.all([
                TauriClient.listFlashcards(noteId).catch(() => []),
                TauriClient.listQuizQuestions(noteId).catch(() => []),
            ]);
            setFlashcards(cards || []);
            setQuizzes(quizList || []);
        } catch (err) {
            console.error('Failed to load study data', err);
        } finally {
            setIsLoading(false);
        }
    }, [noteId]);

    useEffect(() => {
        loadStudyData();
    }, [loadStudyData]);

    // Focus on initialCardId when provided
    useEffect(() => {
        if (!initialCardId || flashcards.length === 0) return;
        const targetIdx = flashcards.findIndex(c => String(c.id) === String(initialCardId));
        if (targetIdx !== -1) {
            setCurrentIndex(targetIdx);
            setIsFlipped(false);
            setSubTab('deck');
        }
    }, [initialCardId, flashcards]);

    // Focus on initialQuizId when provided
    useEffect(() => {
        if (!initialQuizId || quizzes.length === 0) return;
        setSubTab('quiz');
        setTimeout(() => {
            const el = document.getElementById(`quiz-item-${initialQuizId}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    }, [initialQuizId, quizzes]);

    // Current flashcard in deck
    const currentCard = flashcards[currentIndex] || null;

    // Filtered flashcards for list view
    const filteredCards = useMemo(() => {
        if (!searchFilter.trim()) return flashcards;
        const q = searchFilter.toLowerCase();
        return flashcards.filter(c => 
            c.question.toLowerCase().includes(q) || 
            c.answer.toLowerCase().includes(q)
        );
    }, [flashcards, searchFilter]);

    // Flip toggle
    const handleFlip = useCallback(() => {
        setIsFlipped(prev => !prev);
    }, []);

    // SM-2 Review Handler
    const handleReview = async (rating: number) => {
        if (!currentCard || isReviewing) return;
        setIsReviewing(true);
        try {
            await TauriClient.reviewFlashcard(currentCard.id, rating);
            setReviewedCount((c: number) => c + 1);
            showToast(`Recorded review (${rating >= 3 ? 'Mastered' : 'Needs practice'})`, 'success');
            
            // Brief animation flip reset
            setIsFlipped(false);
            setTimeout(() => {
                if (currentIndex < flashcards.length - 1) {
                    setCurrentIndex(i => i + 1);
                } else {
                    showToast('🎉 You finished reviewing this deck!', 'success');
                }
                setIsReviewing(false);
            }, 150);
        } catch (err: any) {
            console.error('Review failed', err);
            setIsReviewing(false);
        }
    };

    // Keyboard shortcuts for deck practice
    useEffect(() => {
        if (subTab !== 'deck' || !currentCard) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if inside an input or textarea
            const target = e.target as HTMLElement;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

            if (e.code === 'Space') {
                e.preventDefault();
                handleFlip();
            } else if (e.code === 'ArrowRight' && currentIndex < flashcards.length - 1) {
                e.preventDefault();
                setIsFlipped(false);
                setCurrentIndex(i => i + 1);
            } else if (e.code === 'ArrowLeft' && currentIndex > 0) {
                e.preventDefault();
                setIsFlipped(false);
                setCurrentIndex(i => i - 1);
            } else if (isFlipped) {
                if (e.key === '1') handleReview(0);
                else if (e.key === '2') handleReview(2);
                else if (e.key === '3') handleReview(3);
                else if (e.key === '4') handleReview(5);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [subTab, currentCard, currentIndex, flashcards.length, isFlipped, handleFlip]);

    // AI Generate Flashcards
    const handleGenerateFlashcards = async () => {
        const textToUse = rawTranscript || noteContent || '';
        if (!textToUse.trim()) {
            showToast('Note content or transcript is required to generate flashcards.', 'error');
            return;
        }

        setIsGeneratingCards(true);
        try {
            await TauriClient.generateFlashcards(noteId, textToUse);
            showToast('Generated flashcards successfully!', 'success');
            await loadStudyData();
            setSubTab('deck');
        } catch (err: any) {
            console.error('Failed to generate flashcards', err);
            showToast(`Generation failed: ${err.message || err}`, 'error');
        } finally {
            setIsGeneratingCards(false);
        }
    };

    // AI Generate Quiz
    const handleGenerateQuiz = async () => {
        const textToUse = rawTranscript || noteContent || '';
        if (!textToUse.trim()) {
            showToast('Note content or transcript is required to generate a quiz.', 'error');
            return;
        }

        setIsGeneratingQuiz(true);
        try {
            await invoke('quiz_generate', { lectureId: noteId, transcript: textToUse });
            showToast('Generated quiz questions successfully!', 'success');
            await loadStudyData();
            setSubTab('quiz');
        } catch (err: any) {
            console.error('Failed to generate quiz', err);
            showToast(`Quiz generation failed: ${err.message || err}`, 'error');
        } finally {
            setIsGeneratingQuiz(false);
        }
    };

    // Manual Card Creation
    const handleCreateCard = async () => {
        if (!newQuestion.trim() || !newAnswer.trim()) {
            showToast('Both Question and Answer are required.', 'error');
            return;
        }
        try {
            await TauriClient.createFlashcard(noteId, newQuestion.trim(), newAnswer.trim(), newDifficulty);
            setIsCreating(false);
            setNewQuestion('');
            setNewAnswer('');
            showToast('Flashcard created!', 'success');
            await loadStudyData();
        } catch (err: any) {
            showToast(`Failed to create card: ${err.message || err}`, 'error');
        }
    };

    // Card Update
    const handleSaveEdit = async (id: string) => {
        if (!editQuestion.trim() || !editAnswer.trim()) return;
        try {
            await TauriClient.updateFlashcard(id, editQuestion.trim(), editAnswer.trim());
            setEditingId(null);
            showToast('Flashcard updated!', 'success');
            await loadStudyData();
        } catch (err: any) {
            showToast(`Update failed: ${err.message || err}`, 'error');
        }
    };

    // Card Delete
    const handleDeleteCard = async (id: string) => {
        const ok = await showConfirm('Delete this flashcard permanently?');
        if (!ok) return;
        try {
            await TauriClient.deleteFlashcard(id);
            showToast('Flashcard deleted', 'success');
            await loadStudyData();
            if (currentIndex >= flashcards.length - 1 && currentIndex > 0) {
                setCurrentIndex(i => i - 1);
            }
        } catch (err: any) {
            showToast(`Delete failed: ${err.message || err}`, 'error');
        }
    };

    const getDifficultyColor = (diff: string) => {
        switch (diff?.toLowerCase()) {
            case 'easy': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
            case 'hard': return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
            default: return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg)] text-[var(--text-primary)]">
            {/* ── Subheader / Study Navigation ──────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-b border-[var(--border)] bg-[var(--surface-raised)]/60 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-yellow-400/15 text-yellow-400">
                        <Zap size={15} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
                                Study & Active Recall
                            </h2>
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)]">
                                {flashcards.length} cards
                            </span>
                        </div>
                    </div>
                </div>

                {/* SubTab Switcher */}
                <div className="flex items-center gap-1 bg-[var(--surface)] p-1 rounded-lg border border-[var(--border)] shadow-2xs">
                    <button
                        type="button"
                        onClick={() => setSubTab('deck')}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer",
                            subTab === 'deck'
                                ? "bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-xs border border-[var(--border)] font-semibold"
                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        )}
                    >
                        <Layers size={13} />
                        <span>Practice Deck</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setSubTab('list')}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer",
                            subTab === 'list'
                                ? "bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-xs border border-[var(--border)] font-semibold"
                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        )}
                    >
                        <BookOpen size={13} />
                        <span>All Cards ({flashcards.length})</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setSubTab('quiz')}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer",
                            subTab === 'quiz'
                                ? "bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-xs border border-[var(--border)] font-semibold"
                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        )}
                    >
                        <HelpCircle size={13} />
                        <span>Quiz ({quizzes.length})</span>
                    </button>
                </div>

                {/* Study Action Buttons */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsCreating(true)}
                        className="px-2.5 py-1.5 rounded-md bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                        <Plus size={13} />
                        <span className="hidden sm:inline">Add Card</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleGenerateFlashcards}
                        disabled={isGeneratingCards}
                        className="px-3 py-1.5 rounded-md bg-[var(--text-primary)] hover:bg-[var(--text-secondary)] text-[var(--bg)] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                    >
                        <Sparkles size={13} className={isGeneratingCards ? "animate-spin" : "text-yellow-400"} />
                        <span>{isGeneratingCards ? 'Generating...' : 'AI Generate'}</span>
                    </button>
                </div>
            </div>

            {/* ── Main Content Area ────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center my-auto py-16 gap-3">
                        <RefreshCw size={24} className="animate-spin text-yellow-400" />
                        <span className="text-xs text-[var(--text-muted)] font-medium">Loading study deck...</span>
                    </div>
                ) : flashcards.length === 0 && subTab !== 'quiz' ? (
                    /* Empty Deck State */
                    <div className="flex flex-col items-center justify-center my-auto py-16 px-6 max-w-md text-center rounded-2xl bg-[var(--surface)] border border-dashed border-[var(--border)]">
                        <div className="p-4 rounded-2xl bg-yellow-400/10 text-yellow-400 mb-4 shadow-sm">
                            <Zap size={28} />
                        </div>
                        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1.5">
                            No flashcards for this note yet
                        </h3>
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-6">
                            Convert core concepts, facts, or discussions from this meeting into interactive flashcards for active recall.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2.5 w-full justify-center">
                            <button
                                type="button"
                                onClick={handleGenerateFlashcards}
                                disabled={isGeneratingCards}
                                className="px-4 py-2 rounded-lg bg-[var(--text-primary)] hover:bg-[var(--text-secondary)] text-[var(--bg)] text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                            >
                                <Sparkles size={14} className={isGeneratingCards ? "animate-spin" : "text-yellow-400"} />
                                <span>{isGeneratingCards ? 'Generating Deck...' : '✨ Generate with AI'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => { setIsCreating(true); setSubTab('list'); }}
                                className="px-4 py-2 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-[var(--surface-raised)] transition-colors cursor-pointer"
                            >
                                <Plus size={14} />
                                <span>Add Custom Card</span>
                            </button>
                        </div>
                    </div>
                ) : subTab === 'deck' && currentCard ? (
                    /* ══════════════════════════════════════════════════════════ */
                    /* 1. INTERACTIVE 3D FLASHCARD DECK                           */
                    /* ══════════════════════════════════════════════════════════ */
                    <div className="w-full max-w-2xl flex flex-col items-center gap-6 my-auto">
                        {/* Top Indicator Bar */}
                        <div className="w-full flex items-center justify-between text-xs text-[var(--text-muted)] px-1">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-[var(--text-primary)]">
                                    Card {currentIndex + 1} of {flashcards.length}
                                </span>
                                {initialCardId && String(currentCard.id) === String(initialCardId) && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 animate-pulse">
                                        📍 Matching Search Result
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-wider", getDifficultyColor(currentCard.difficulty))}>
                                    {currentCard.difficulty || 'medium'}
                                </span>
                                {currentCard.lastReviewedAt && (
                                    <span className="text-[11px] opacity-70">
                                        Last: {new Date(currentCard.lastReviewedAt).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 bg-[var(--surface)] rounded-full overflow-hidden border border-[var(--border)]">
                            <div 
                                className="h-full bg-yellow-400 transition-all duration-300"
                                style={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
                            />
                        </div>

                        {/* 3D Flip Card */}
                        <div 
                            onClick={handleFlip}
                            className={cn(
                                "flashcard w-full min-h-[320px] sm:min-h-[360px] select-none transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]",
                                isFlipped && "flipped"
                            )}
                            role="button"
                            tabIndex={0}
                            title="Click or press Space to flip card"
                        >
                            <div className="flashcard-inner relative w-full h-full min-h-[320px] sm:min-h-[360px]">
                                {/* ── FRONT FACE: QUESTION ──────────────── */}
                                <div className="flashcard-face flex flex-col justify-between p-8 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-lg hover:border-[var(--border-accent)] transition-colors">
                                    <div className="w-full flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] pb-2 border-b border-[var(--border)]/60">
                                        <div className="flex items-center gap-1.5 text-yellow-400">
                                            <HelpCircle size={14} />
                                            <span>Question</span>
                                        </div>
                                        <span className="text-[10px] opacity-60">Click to flip ↷</span>
                                    </div>

                                    <div className="my-auto py-6 text-center">
                                        <h3 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)] leading-snug tracking-tight">
                                            {currentCard.question}
                                        </h3>
                                    </div>

                                    <div className="w-full flex items-center justify-center text-[11px] text-[var(--text-muted)] pt-2 border-t border-[var(--border)]/60 gap-1.5">
                                        <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-[var(--surface-raised)] border border-[var(--border)]">Space</kbd>
                                        <span>or click card to reveal answer</span>
                                    </div>
                                </div>

                                {/* ── BACK FACE: ANSWER ─────────────────── */}
                                <div className="flashcard-face flashcard-back flex flex-col justify-between p-8 rounded-2xl bg-[var(--surface-raised)] border-2 border-yellow-400/40 shadow-xl">
                                    <div className="w-full flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] pb-2 border-b border-[var(--border)]/60">
                                        <div className="flex items-center gap-1.5 text-emerald-400">
                                            <CheckCircle size={14} />
                                            <span>Answer</span>
                                        </div>
                                        <span className="text-[10px] opacity-60">Click to flip back</span>
                                    </div>

                                    <div className="my-auto py-6 text-center">
                                        <p className="text-base sm:text-lg text-[var(--text-primary)] leading-relaxed font-medium">
                                            {currentCard.answer}
                                        </p>
                                    </div>

                                    <div className="w-full flex items-center justify-center text-[11px] text-[var(--text-muted)] pt-2 border-t border-[var(--border)]/60">
                                        <span>Rate your recall below to adjust spaced repetition</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Controls Bottom Row */}
                        <div className="w-full flex flex-col gap-4">
                            {/* SM-2 Spaced Repetition Buttons (Visible when flipped) */}
                            {isFlipped ? (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 animate-fade-in">
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleReview(0); }}
                                        disabled={isReviewing}
                                        className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
                                    >
                                        <span className="text-xs font-bold">Again (1)</span>
                                        <span className="text-[10px] opacity-75">&lt; 1 min</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleReview(2); }}
                                        disabled={isReviewing}
                                        className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
                                    >
                                        <span className="text-xs font-bold">Hard (2)</span>
                                        <span className="text-[10px] opacity-75">~2 days</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleReview(3); }}
                                        disabled={isReviewing}
                                        className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
                                    >
                                        <span className="text-xs font-bold">Good (3)</span>
                                        <span className="text-[10px] opacity-75">~6 days</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleReview(5); }}
                                        disabled={isReviewing}
                                        className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
                                    >
                                        <span className="text-xs font-bold">Easy (4)</span>
                                        <span className="text-[10px] opacity-75">~10 days</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-3">
                                    <button
                                        type="button"
                                        onClick={handleFlip}
                                        className="px-6 py-2.5 rounded-xl bg-[var(--text-primary)] hover:bg-[var(--text-secondary)] text-[var(--bg)] font-semibold text-xs shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-2"
                                    >
                                        <RefreshCw size={14} />
                                        <span>Reveal Answer (Space)</span>
                                    </button>
                                </div>
                            )}

                            {/* Deck Navigation Buttons */}
                            <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
                                <button
                                    type="button"
                                    onClick={() => { setIsFlipped(false); setCurrentIndex(i => Math.max(0, i - 1)); }}
                                    disabled={currentIndex === 0}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-md hover:bg-[var(--surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                >
                                    <ChevronLeft size={14} />
                                    <span>Previous</span>
                                </button>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingId(currentCard.id);
                                            setEditQuestion(currentCard.question);
                                            setEditAnswer(currentCard.answer);
                                            setEditDifficulty(currentCard.difficulty || 'medium');
                                            setSubTab('list');
                                        }}
                                        className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors"
                                    >
                                        <Edit2 size={12} />
                                        <span>Edit Card</span>
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => { setIsFlipped(false); setCurrentIndex(i => Math.min(flashcards.length - 1, i + 1)); }}
                                    disabled={currentIndex === flashcards.length - 1}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-md hover:bg-[var(--surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                >
                                    <span>Next</span>
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : subTab === 'list' ? (
                    /* ══════════════════════════════════════════════════════════ */
                    /* 2. ALL FLASHCARDS (LIBRARY & INLINE MANAGEMENT)            */
                    /* ══════════════════════════════════════════════════════════ */
                    <div className="w-full max-w-4xl flex flex-col gap-4">
                        {/* Search & Filter bar */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
                            <div className="relative w-full sm:w-72">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                <input
                                    type="text"
                                    placeholder="Search flashcards in this deck..."
                                    value={searchFilter}
                                    onChange={e => setSearchFilter(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-yellow-400/50"
                                />
                            </div>
                            <div className="text-xs text-[var(--text-muted)]">
                                Showing {filteredCards.length} of {flashcards.length} cards
                            </div>
                        </div>

                        {/* Inline Create Form */}
                        {isCreating && (
                            <div className="p-5 rounded-xl bg-[var(--surface)] border-2 border-yellow-400/40 shadow-md flex flex-col gap-3.5 animate-fade-in">
                                <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                                    <h4 className="text-xs font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Plus size={14} />
                                        <span>New Flashcard</span>
                                    </h4>
                                    <button 
                                        type="button" 
                                        onClick={() => setIsCreating(false)} 
                                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                                        Question / Prompt
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. What are the 3 core principles agreed in the sync?"
                                        value={newQuestion}
                                        onChange={e => setNewQuestion(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-yellow-400/50"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                                        Answer / Recall Details
                                    </label>
                                    <textarea
                                        placeholder="Enter the complete, clear answer..."
                                        value={newAnswer}
                                        onChange={e => setNewAnswer(e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-yellow-400/50 leading-relaxed resize-none"
                                    />
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] text-[var(--text-muted)] font-medium">Difficulty:</span>
                                        {(['easy', 'medium', 'hard'] as const).map(d => (
                                            <button
                                                key={d}
                                                type="button"
                                                onClick={() => setNewDifficulty(d)}
                                                className={cn(
                                                    "px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase border transition-all cursor-pointer",
                                                    newDifficulty === d
                                                        ? getDifficultyColor(d) + " font-bold scale-105"
                                                        : "opacity-40 border-transparent hover:opacity-75"
                                                )}
                                            >
                                                {d}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsCreating(false)}
                                            className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCreateCard}
                                            className="px-4 py-1.5 rounded-md bg-yellow-400 text-black font-semibold text-xs shadow-xs hover:bg-yellow-300 transition-colors"
                                        >
                                            Save Card
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Cards List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pb-12">
                            {filteredCards.map((card, idx) => {
                                const isMatchingSearch = initialCardId && String(card.id) === String(initialCardId);
                                const isEditing = editingId === card.id;

                                return (
                                    <div
                                        key={card.id}
                                        className={cn(
                                            "p-4 rounded-xl bg-[var(--surface)] border transition-all flex flex-col justify-between gap-3 relative group",
                                            isMatchingSearch 
                                                ? "border-yellow-400 ring-2 ring-yellow-400/20 shadow-md bg-yellow-400/[0.03]" 
                                                : "border-[var(--border)] hover:border-[var(--border-accent)]"
                                        )}
                                    >
                                        {isMatchingSearch && (
                                            <div className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-yellow-400 text-black text-[10px] font-bold shadow-xs">
                                                📍 Search Result
                                            </div>
                                        )}

                                        {isEditing ? (
                                            <div className="flex flex-col gap-2.5">
                                                <input
                                                    type="text"
                                                    value={editQuestion}
                                                    onChange={e => setEditQuestion(e.target.value)}
                                                    className="w-full px-2.5 py-1.5 rounded bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text-primary)]"
                                                />
                                                <textarea
                                                    value={editAnswer}
                                                    onChange={e => setEditAnswer(e.target.value)}
                                                    rows={3}
                                                    className="w-full px-2.5 py-1.5 rounded bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text-primary)] resize-none"
                                                />
                                                <div className="flex justify-end gap-2 pt-1">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setEditingId(null)} 
                                                        className="px-2.5 py-1 text-xs text-[var(--text-muted)]"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleSaveEdit(card.id)} 
                                                        className="px-3 py-1 bg-yellow-400 text-black text-xs font-bold rounded"
                                                    >
                                                        Save
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div>
                                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                                        <span className="text-[11px] font-bold text-yellow-400">Q:</span>
                                                        <span className={cn("px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border", getDifficultyColor(card.difficulty))}>
                                                            {card.difficulty || 'medium'}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-xs font-semibold text-[var(--text-primary)] leading-snug mb-3">
                                                        {card.question}
                                                    </h4>
                                                    <div className="text-[11px] font-bold text-emerald-400 mb-0.5">A:</div>
                                                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed bg-[var(--surface-raised)] p-2.5 rounded-lg border border-[var(--border)]/50">
                                                        {card.answer}
                                                    </p>
                                                </div>

                                                <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]/40 text-[11px] text-[var(--text-muted)]">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setCurrentIndex(idx);
                                                            setIsFlipped(false);
                                                            setSubTab('deck');
                                                        }}
                                                        className="text-yellow-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                                                    >
                                                        <span>Practice This Card</span>
                                                        <ArrowRight size={11} />
                                                    </button>

                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditingId(card.id);
                                                                setEditQuestion(card.question);
                                                                setEditAnswer(card.answer);
                                                                setEditDifficulty(card.difficulty || 'medium');
                                                            }}
                                                            className="p-1 rounded hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                                            title="Edit"
                                                        >
                                                            <Edit2 size={12} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteCard(card.id)}
                                                            className="p-1 rounded hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-400"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    /* ══════════════════════════════════════════════════════════ */
                    /* 3. INTERACTIVE QUIZ MODE                                   */
                    /* ══════════════════════════════════════════════════════════ */
                    <div className="w-full max-w-2xl flex flex-col items-center gap-6 my-auto">
                        {quizzes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center my-auto py-16 px-6 max-w-md text-center rounded-2xl bg-[var(--surface)] border border-dashed border-[var(--border)]">
                                <div className="p-4 rounded-2xl bg-green-400/10 text-green-400 mb-4 shadow-sm">
                                    <HelpCircle size={28} />
                                </div>
                                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1.5">
                                    No quiz questions generated yet
                                </h3>
                                <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-6">
                                    Generate multiple-choice quiz questions from this meeting note to test your knowledge retention.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleGenerateQuiz}
                                    disabled={isGeneratingQuiz}
                                    className="px-4 py-2 rounded-lg bg-[var(--text-primary)] hover:bg-[var(--text-secondary)] text-[var(--bg)] text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                                >
                                    <Sparkles size={14} className={isGeneratingQuiz ? "animate-spin" : "text-green-400"} />
                                    <span>{isGeneratingQuiz ? 'Generating Quiz...' : '✨ Generate Quiz with AI'}</span>
                                </button>
                            </div>
                        ) : (
                            <div className="w-full flex flex-col gap-4">
                                {quizzes.map((quiz, qIdx) => {
                                    const isMatchingQuiz = initialQuizId && String(quiz.id) === String(initialQuizId);
                                    let options: string[] = [];
                                    try {
                                        options = typeof quiz.options === 'string' ? JSON.parse(quiz.options) : (quiz.options || []);
                                    } catch {
                                        options = [];
                                    }

                                    return (
                                        <div 
                                            key={quiz.id || qIdx}
                                            id={`quiz-item-${quiz.id}`}
                                            className={cn(
                                                "p-6 rounded-2xl bg-[var(--surface)] border shadow-sm flex flex-col gap-4 relative",
                                                isMatchingQuiz 
                                                    ? "border-green-400 ring-2 ring-green-400/20 bg-green-400/[0.02]" 
                                                    : "border-[var(--border)]"
                                            )}
                                        >
                                            {isMatchingQuiz && (
                                                <div className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-green-400 text-black text-[10px] font-bold shadow-xs">
                                                    📍 Quiz Search Result
                                                </div>
                                            )}

                                            <div className="flex items-start gap-2">
                                                <span className="text-xs font-bold text-green-400 bg-green-400/15 px-2 py-0.5 rounded">
                                                    Q{qIdx + 1}
                                                </span>
                                                <h3 className="text-sm sm:text-base font-semibold text-[var(--text-primary)] leading-snug">
                                                    {quiz.question}
                                                </h3>
                                            </div>

                                            {/* Options */}
                                            <div className="flex flex-col gap-2 pt-2">
                                                {options.map((opt: string, optIdx: number) => {
                                                    const isCorrect = (quiz.answerKey && opt.trim().toLowerCase() === quiz.answerKey.trim().toLowerCase()) ||
                                                        String(optIdx) === String(quiz.answerKey) ||
                                                        optIdx === ((quiz as any).correct_answer_index ?? (quiz as any).correctAnswerIndex ?? 0);
                                                    return (
                                                        <div 
                                                            key={optIdx}
                                                            className={cn(
                                                                "px-3.5 py-2.5 rounded-xl border text-xs leading-relaxed flex items-center justify-between",
                                                                isCorrect 
                                                                    ? "bg-green-500/10 border-green-500/30 text-green-300 font-medium" 
                                                                    : "bg-[var(--surface-raised)] border-[var(--border)] text-[var(--text-secondary)]"
                                                            )}
                                                        >
                                                            <span>{opt}</span>
                                                            {isCorrect && (
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-green-400 shrink-0 ml-2">
                                                                    Correct Answer
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {(quiz as any).explanation && (
                                                <div className="p-3 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] text-[11px] text-[var(--text-secondary)] leading-relaxed">
                                                    <span className="font-semibold text-[var(--text-primary)] mr-1">Explanation:</span>
                                                    {(quiz as any).explanation}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
