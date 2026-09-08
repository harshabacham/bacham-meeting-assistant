import { useState, useEffect, useMemo, useCallback } from 'react';
import { TauriClient, Flashcard, QuizQuestion } from '@/infrastructure/tauri-client';
import { invoke } from '@tauri-apps/api/core';
import { 
    Sparkles, Plus, Edit2, Trash2, ChevronLeft, ChevronRight, 
    RotateCcw, Check, X, Search, Layers, BookOpen, 
    HelpCircle, ArrowRight, CheckCircle2
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

interface QuizAnswerState {
    choiceIndex?: number;
    textInput?: string;
    isSubmitted?: boolean;
    isRevealed?: boolean;
    isCorrect?: boolean;
}

// Helper: Check if a multiple choice / true-false option is correct
function checkOptionCorrect(quiz: QuizQuestion, optText: string, optIndex: number): boolean {
    if (!quiz.answerKey) return false;
    const key = String(quiz.answerKey).trim();
    const keyLower = key.toLowerCase();
    const optLower = optText.trim().toLowerCase();

    // 1. Direct text match
    if (optLower === keyLower) return true;

    // 2. Numeric index match (e.g. answerKey is "1" and optIndex is 1)
    if (key === String(optIndex)) return true;

    // 3. Letter match (e.g. answerKey is "A", "B", "C", "D" or "a)", "b)")
    const cleanLetter = keyLower.replace(/[^a-d]/g, '');
    if (cleanLetter.length === 1) {
        const letterIndex = cleanLetter.charCodeAt(0) - 97;
        if (letterIndex === optIndex) return true;
    }

    // 4. Explicit correct_answer_index ONLY if actually defined as a valid number
    const explicitIdx = (quiz as any).correct_answer_index ?? (quiz as any).correctAnswerIndex;
    if (typeof explicitIdx === 'number' && explicitIdx === optIndex) return true;

    return false;
}

// Helper: Resolve effective options for any quiz question
function getQuizOptions(quiz: QuizQuestion): string[] {
    let opts: string[] = [];
    try {
        const rawOptions = (quiz as any).options;
        if (typeof rawOptions === 'string') {
            const parsed = JSON.parse(rawOptions);
            if (Array.isArray(parsed)) {
                opts = parsed.filter(Boolean).map(String);
            }
        } else if (Array.isArray(rawOptions)) {
            opts = (rawOptions as any[]).filter(Boolean).map(String);
        }
    } catch {
        opts = [];
    }

    // If options array is populated, return it
    if (opts.length > 0) return opts;

    // If it's a True/False question or the answer is True/False, provide standard True/False options
    const keyLower = String(quiz.answerKey || '').trim().toLowerCase();
    const isTrueFalse = quiz.type === 'true_false' || keyLower === 'true' || keyLower === 'false';
    if (isTrueFalse) {
        return ['True', 'False'];
    }

    return [];
}

// Helper: Badge label for question type
function getQuestionBadge(quiz: QuizQuestion, options: string[]): string {
    if (options.length > 0) {
        const keyLower = String(quiz.answerKey || '').trim().toLowerCase();
        if (quiz.type === 'true_false' || keyLower === 'true' || keyLower === 'false') {
            return 'True / False';
        }
        return 'Multiple Choice';
    }
    switch (quiz.type) {
        case 'fill_blank': return 'Fill in the Blank';
        case 'short_answer': return 'Short Answer';
        case 'code': return 'Code Output';
        case 'formula': return 'Formula';
        default: return 'Question';
    }
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

    // Primary data
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [quizzes, setQuizzes] = useState<QuizQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Navigation: primary tab ('flashcards' | 'quiz') and sub-view ('practice' | 'deck')
    const [activeTab, setActiveTab] = useState<'flashcards' | 'quiz'>(initialQuizId ? 'quiz' : 'flashcards');
    const [cardViewMode, setCardViewMode] = useState<'practice' | 'deck'>('practice');

    // Practice Deck state
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
    const [isReviewing, setIsReviewing] = useState(false);
    const [sessionCompleted, setSessionCompleted] = useState(false);

    // AI Generation states
    const [isGeneratingCards, setIsGeneratingCards] = useState(false);
    const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

    // Deck List & Creation / Editing states
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreatingCard, setIsCreatingCard] = useState(false);
    const [newQuestion, setNewQuestion] = useState('');
    const [newAnswer, setNewAnswer] = useState('');
    const [newDifficulty, setNewDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

    const [editingCardId, setEditingCardId] = useState<string | null>(null);
    const [editQuestion, setEditQuestion] = useState('');
    const [editAnswer, setEditAnswer] = useState('');

    // Interactive Quiz State
    const [quizAnswers, setQuizAnswers] = useState<Record<string, QuizAnswerState>>({});
    const [textInputs, setTextInputs] = useState<Record<string, string>>({});

    // Source material check
    const hasNotes = Boolean(noteContent && noteContent.trim().length > 0);
    const hasTranscript = Boolean(rawTranscript && rawTranscript.trim().length > 0);
    const hasSourceMaterial = hasNotes || hasTranscript;

    // Load data from Tauri IPC
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

    // Focus on initialCardId
    useEffect(() => {
        if (!initialCardId || flashcards.length === 0) return;
        const targetIdx = flashcards.findIndex(c => String(c.id) === String(initialCardId));
        if (targetIdx !== -1) {
            setCurrentIndex(targetIdx);
            setIsAnswerRevealed(false);
            setSessionCompleted(false);
            setActiveTab('flashcards');
            setCardViewMode('practice');
        }
    }, [initialCardId, flashcards]);

    // Focus on initialQuizId
    useEffect(() => {
        if (!initialQuizId || quizzes.length === 0) return;
        setActiveTab('quiz');
        setTimeout(() => {
            const el = document.getElementById(`quiz-question-${initialQuizId}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 150);
    }, [initialQuizId, quizzes]);

    const currentCard = flashcards[currentIndex] || null;

    // Filtered flashcards for Deck view
    const filteredCards = useMemo(() => {
        if (!searchQuery.trim()) return flashcards;
        const q = searchQuery.toLowerCase();
        return flashcards.filter(c => 
            c.question.toLowerCase().includes(q) || 
            c.answer.toLowerCase().includes(q)
        );
    }, [flashcards, searchQuery]);

    // Handle SM-2 Flashcard Review
    const handleReview = useCallback(async (rating: number) => {
        if (!currentCard || isReviewing) return;
        setIsReviewing(true);
        try {
            await TauriClient.reviewFlashcard(currentCard.id, rating);
            
            // Advance to next card or complete deck
            if (currentIndex < flashcards.length - 1) {
                setCurrentIndex(prev => prev + 1);
                setIsAnswerRevealed(false);
            } else {
                setSessionCompleted(true);
            }
        } catch (err) {
            console.error('Failed to review card', err);
            showToast('Failed to record review', 'error');
        } finally {
            setIsReviewing(false);
        }
    }, [currentCard, isReviewing, currentIndex, flashcards.length, showToast]);

    // Keyboard Shortcuts for Practice Mode
    useEffect(() => {
        if (activeTab !== 'flashcards' || cardViewMode !== 'practice' || !currentCard || sessionCompleted) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

            if (e.code === 'Space') {
                e.preventDefault();
                setIsAnswerRevealed(prev => !prev);
            } else if (e.code === 'ArrowRight' && currentIndex < flashcards.length - 1) {
                e.preventDefault();
                setIsAnswerRevealed(false);
                setCurrentIndex(i => i + 1);
            } else if (e.code === 'ArrowLeft' && currentIndex > 0) {
                e.preventDefault();
                setIsAnswerRevealed(false);
                setCurrentIndex(i => i - 1);
            } else if (isAnswerRevealed) {
                if (e.key === '1') handleReview(1); // Review Again
                else if (e.key === '2') handleReview(2); // Hard
                else if (e.key === '3') handleReview(4); // Got It
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeTab, cardViewMode, currentCard, sessionCompleted, currentIndex, flashcards.length, isAnswerRevealed, handleReview]);

    // AI Generation Handlers
    const handleGenerateFlashcards = async () => {
        const textToUse = rawTranscript || noteContent || '';
        if (!textToUse.trim()) {
            showToast('Note content or transcript is required to generate cards.', 'error');
            return;
        }

        setIsGeneratingCards(true);
        try {
            await TauriClient.generateFlashcards(noteId, textToUse);
            showToast('Flashcards generated successfully!', 'success');
            await loadStudyData();
            setActiveTab('flashcards');
            setCardViewMode('practice');
            setCurrentIndex(0);
            setIsAnswerRevealed(false);
            setSessionCompleted(false);
        } catch (err: any) {
            console.error('Failed to generate flashcards', err);
            showToast(`Generation failed: ${err.message || err}`, 'error');
        } finally {
            setIsGeneratingCards(false);
        }
    };

    const handleGenerateQuiz = async () => {
        const textToUse = rawTranscript || noteContent || '';
        if (!textToUse.trim()) {
            showToast('Note content or transcript is required to generate a quiz.', 'error');
            return;
        }

        setIsGeneratingQuiz(true);
        try {
            await invoke('quiz_generate', { lectureId: noteId, transcript: textToUse });
            showToast('Quiz questions generated successfully!', 'success');
            await loadStudyData();
            setQuizAnswers({});
            setTextInputs({});
            setActiveTab('quiz');
        } catch (err: any) {
            console.error('Failed to generate quiz', err);
            showToast(`Quiz generation failed: ${err.message || err}`, 'error');
        } finally {
            setIsGeneratingQuiz(false);
        }
    };

    // Card CRUD
    const handleCreateCard = async () => {
        if (!newQuestion.trim() || !newAnswer.trim()) {
            showToast('Question and answer are both required.', 'error');
            return;
        }
        try {
            await TauriClient.createFlashcard(noteId, newQuestion.trim(), newAnswer.trim(), newDifficulty);
            setIsCreatingCard(false);
            setNewQuestion('');
            setNewAnswer('');
            showToast('Flashcard created', 'success');
            await loadStudyData();
        } catch (err: any) {
            showToast(`Failed to create card: ${err.message || err}`, 'error');
        }
    };

    const handleSaveEdit = async (id: string) => {
        if (!editQuestion.trim() || !editAnswer.trim()) return;
        try {
            await TauriClient.updateFlashcard(id, editQuestion.trim(), editAnswer.trim());
            setEditingCardId(null);
            showToast('Flashcard updated', 'success');
            await loadStudyData();
        } catch (err: any) {
            showToast(`Update failed: ${err.message || err}`, 'error');
        }
    };

    const handleDeleteCard = async (id: string) => {
        const ok = await showConfirm('Permanently delete this flashcard?');
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

    // Quiz Handlers
    const handleSelectQuizOption = (questionKey: string, quiz: QuizQuestion, optIndex: number, options: string[]) => {
        const isCorrect = checkOptionCorrect(quiz, options[optIndex], optIndex);
        setQuizAnswers(prev => ({
            ...prev,
            [questionKey]: {
                choiceIndex: optIndex,
                isSubmitted: true,
                isCorrect
            }
        }));
    };

    const handleTextSubmit = (questionKey: string, quiz: QuizQuestion) => {
        const input = (textInputs[questionKey] || '').trim();
        if (!input) return;

        const userVal = input.toLowerCase();
        const targetVal = String(quiz.answerKey || '').trim().toLowerCase();

        // Exact match or contains key words
        const isCorrect = userVal === targetVal || 
            (targetVal.length > 3 && (userVal.includes(targetVal) || targetVal.includes(userVal)));

        setQuizAnswers(prev => ({
            ...prev,
            [questionKey]: {
                textInput: input,
                isSubmitted: true,
                isCorrect
            }
        }));
    };

    const handleRevealAnswer = (questionKey: string) => {
        setQuizAnswers(prev => ({
            ...prev,
            [questionKey]: {
                ...(prev[questionKey] || {}),
                isRevealed: true
            }
        }));
    };

    const handleResetSingle = (questionKey: string) => {
        setQuizAnswers(prev => {
            const next = { ...prev };
            delete next[questionKey];
            return next;
        });
        setTextInputs(prev => {
            const next = { ...prev };
            delete next[questionKey];
            return next;
        });
    };

    // Quiz Score Calculation
    const quizStats = useMemo(() => {
        let answeredCount = 0;
        let correctCount = 0;

        quizzes.forEach((q, idx) => {
            const key = q.id || String(idx);
            const state = quizAnswers[key];
            if (state?.isSubmitted) {
                answeredCount++;
                if (state.isCorrect) correctCount++;
            }
        });

        return {
            answered: answeredCount,
            correct: correctCount,
            total: quizzes.length,
            pct: answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0
        };
    }, [quizzes, quizAnswers]);

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg)] text-[var(--text-primary)]">
            {/* ── Minimalist Clean Header ───────────────────────────────────── */}
            <header className="flex items-center justify-between px-6 py-3 border-b border-[#E5E4DC] dark:border-white/10 bg-white/50 dark:bg-[#18191B]/50 backdrop-blur-md shrink-0">
                {/* Left: Tab Segmented Control */}
                <div className="flex items-center gap-1 bg-[#F4F3EE] dark:bg-white/[0.06] p-1 rounded-xl border border-[#E5E4DC] dark:border-white/10">
                    <button
                        type="button"
                        onClick={() => setActiveTab('flashcards')}
                        className={cn(
                            "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                            activeTab === 'flashcards'
                                ? "bg-white dark:bg-[#18191B] text-[var(--text-primary)] shadow-sm font-semibold"
                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        )}
                    >
                        <Layers size={13} className="opacity-70" />
                        <span>Flashcards</span>
                        {flashcards.length > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-black/5 dark:bg-white/10 text-[var(--text-secondary)]">
                                {flashcards.length}
                            </span>
                        )}
                    </button>

                    {(hasSourceMaterial || quizzes.length > 0) && (
                        <button
                            type="button"
                            onClick={() => setActiveTab('quiz')}
                            className={cn(
                                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                                activeTab === 'quiz'
                                    ? "bg-white dark:bg-[#18191B] text-[var(--text-primary)] shadow-sm font-semibold"
                                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        )}
                        >
                            <HelpCircle size={13} className="opacity-70" />
                            <span>Quiz</span>
                            {quizzes.length > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-black/5 dark:bg-white/10 text-[var(--text-secondary)]">
                                    {quizzes.length}
                                </span>
                            )}
                        </button>
                    )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    {activeTab === 'flashcards' && flashcards.length > 0 && (
                        <div className="flex items-center gap-0.5 bg-[#F4F3EE] dark:bg-white/[0.06] p-0.5 rounded-lg border border-[#E5E4DC] dark:border-white/10 mr-1">
                            <button
                                type="button"
                                onClick={() => setCardViewMode('practice')}
                                className={cn(
                                    "px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer",
                                    cardViewMode === 'practice'
                                        ? "bg-white dark:bg-[#18191B] text-[var(--text-primary)] shadow-2xs font-semibold"
                                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                )}
                                title="Focused study practice"
                            >
                                Practice
                            </button>
                            <button
                                type="button"
                                onClick={() => setCardViewMode('deck')}
                                className={cn(
                                    "px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer",
                                    cardViewMode === 'deck'
                                        ? "bg-white dark:bg-[#18191B] text-[var(--text-primary)] shadow-2xs font-semibold"
                                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                )}
                                title="View and manage all cards"
                            >
                                All Cards
                            </button>
                        </div>
                    )}

                    {activeTab === 'flashcards' && (
                        <button
                            type="button"
                            onClick={() => {
                                setIsCreatingCard(true);
                                setCardViewMode('deck');
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#E5E4DC] dark:border-white/10 hover:bg-[#F4F3EE] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                        >
                            <Plus size={13} />
                            <span>Add Card</span>
                        </button>
                    )}

                    {hasSourceMaterial && (
                        <button
                            type="button"
                            onClick={activeTab === 'flashcards' ? handleGenerateFlashcards : handleGenerateQuiz}
                            disabled={isGeneratingCards || isGeneratingQuiz}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[#1F2023] hover:bg-[#2C2E33] dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                        >
                            <Sparkles size={12} className={cn((isGeneratingCards || isGeneratingQuiz) && "animate-spin")} />
                            <span>
                                {activeTab === 'flashcards'
                                    ? (isGeneratingCards ? 'Generating...' : 'AI Flashcards')
                                    : (isGeneratingQuiz ? 'Generating...' : 'AI Quiz')}
                            </span>
                        </button>
                    )}
                </div>
            </header>

            {/* ── Main Study Workspace Body ─────────────────────────────────── */}
            <main className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center my-auto py-20 gap-3">
                        <div className="w-6 h-6 border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-[var(--text-muted)] font-medium">Loading study materials...</span>
                    </div>
                ) : activeTab === 'flashcards' ? (
                    /* ══════════════════════════════════════════════════════════ */
                    /* FLASHCARDS SECTION                                         */
                    /* ══════════════════════════════════════════════════════════ */
                    flashcards.length === 0 ? (
                        /* Empty Flashcards State */
                        <div className="flex flex-col items-center justify-center my-auto py-16 px-8 max-w-md text-center rounded-2xl border border-[#E5E4DC] dark:border-white/10 bg-white dark:bg-[#18191B] shadow-sm">
                            <div className="w-12 h-12 rounded-2xl bg-[#F4F3EE] dark:bg-white/[0.06] flex items-center justify-center text-[var(--text-muted)] mb-4">
                                <BookOpen size={22} />
                            </div>
                            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1.5">
                                No flashcards yet
                            </h3>
                            <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-6">
                                {hasSourceMaterial
                                    ? "Generate active-recall flashcards from this note's transcript and notes, or create custom cards manually."
                                    : "Take notes or record a meeting first to automatically generate AI study materials."}
                            </p>
                            <div className="flex items-center gap-2">
                                {hasSourceMaterial && (
                                    <button
                                        type="button"
                                        onClick={handleGenerateFlashcards}
                                        disabled={isGeneratingCards}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-[#1F2023] hover:bg-[#2C2E33] dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                                    >
                                        <Sparkles size={13} className={cn(isGeneratingCards && "animate-spin")} />
                                        <span>{isGeneratingCards ? 'Generating...' : 'Generate with AI'}</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCreatingCard(true);
                                        setCardViewMode('deck');
                                    }}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium border border-[#E5E4DC] dark:border-white/10 hover:bg-[#F4F3EE] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                                >
                                    <Plus size={13} />
                                    <span>Create Card</span>
                                </button>
                            </div>
                        </div>
                    ) : cardViewMode === 'practice' ? (
                        /* ── Practice Session ────────────────────────────────── */
                        sessionCompleted ? (
                            /* Completed Session Screen */
                            <div className="flex flex-col items-center justify-center my-auto py-16 px-8 max-w-md text-center rounded-2xl border border-[#E5E4DC] dark:border-white/10 bg-white dark:bg-[#18191B] shadow-sm">
                                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                                    <CheckCircle2 size={24} />
                                </div>
                                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                                    Deck Complete!
                                </h3>
                                <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-6">
                                    You've reviewed all {flashcards.length} cards in this study deck.
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCurrentIndex(0);
                                            setIsAnswerRevealed(false);
                                            setSessionCompleted(false);
                                        }}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-[#1F2023] hover:bg-[#2C2E33] dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 transition-all cursor-pointer shadow-xs"
                                    >
                                        <RotateCcw size={13} />
                                        <span>Study Again</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCardViewMode('deck')}
                                        className="px-4 py-2 rounded-xl text-xs font-medium border border-[#E5E4DC] dark:border-white/10 hover:bg-[#F4F3EE] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                                    >
                                        View All Cards
                                    </button>
                                </div>
                            </div>
                        ) : currentCard ? (
                            /* Active Card Surface */
                            <div className="w-full max-w-xl flex flex-col items-center gap-6 my-auto">
                                {/* Sleek Progress Line & Header */}
                                <div className="w-full flex flex-col gap-2">
                                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                                        <span className="font-medium text-[var(--text-secondary)]">
                                            Card {currentIndex + 1} of {flashcards.length}
                                        </span>
                                        {initialCardId && String(currentCard.id) === String(initialCardId) && (
                                            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                                                Matching Search
                                            </span>
                                        )}
                                    </div>
                                    <div className="w-full h-1 bg-[#E5E4DC] dark:bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-[var(--text-primary)] transition-all duration-300 rounded-full"
                                            style={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Minimalist Study Card */}
                                <div 
                                    onClick={() => !isAnswerRevealed && setIsAnswerRevealed(true)}
                                    className={cn(
                                        "w-full rounded-2xl border border-[#E5E4DC] dark:border-white/10 bg-white dark:bg-[#18191B] p-8 sm:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] flex flex-col justify-between min-h-[340px] transition-all",
                                        !isAnswerRevealed ? "cursor-pointer hover:border-[#D0CEBE] dark:hover:border-white/20" : ""
                                    )}
                                >
                                    {/* Question Section */}
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                                            <span>Question</span>
                                            {!isAnswerRevealed && (
                                                <span className="text-[10px] font-normal normal-case tracking-normal opacity-60">
                                                    Click or Space to reveal
                                                </span>
                                            )}
                                        </div>
                                        <h2 className="text-lg sm:text-xl font-medium text-[var(--text-primary)] leading-snug">
                                            {currentCard.question}
                                        </h2>
                                    </div>

                                    {/* Answer Section */}
                                    {isAnswerRevealed ? (
                                        <div className="flex flex-col gap-4 pt-6 mt-6 border-t border-[#E5E4DC] dark:border-white/10 animate-fade-in">
                                            <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                                Answer
                                            </div>
                                            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                                                {currentCard.answer}
                                            </p>

                                            {/* Recall Rating Actions */}
                                            <div className="flex flex-col gap-2 pt-4 mt-2">
                                                <span className="text-[11px] text-center text-[var(--text-muted)]">
                                                    How well did you know this?
                                                </span>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); handleReview(1); }}
                                                        disabled={isReviewing}
                                                        className="flex flex-col items-center justify-center py-2 px-3 rounded-xl border border-[#E5E4DC] dark:border-white/10 hover:bg-rose-500/10 hover:border-rose-500/30 text-[var(--text-primary)] hover:text-rose-600 dark:hover:text-rose-400 transition-all cursor-pointer text-xs"
                                                    >
                                                        <span className="font-semibold">Again</span>
                                                        <span className="text-[10px] opacity-60">Key 1</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); handleReview(2); }}
                                                        disabled={isReviewing}
                                                        className="flex flex-col items-center justify-center py-2 px-3 rounded-xl border border-[#E5E4DC] dark:border-white/10 hover:bg-amber-500/10 hover:border-amber-500/30 text-[var(--text-primary)] hover:text-amber-600 dark:hover:text-amber-400 transition-all cursor-pointer text-xs"
                                                    >
                                                        <span className="font-semibold">Hard</span>
                                                        <span className="text-[10px] opacity-60">Key 2</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); handleReview(4); }}
                                                        disabled={isReviewing}
                                                        className="flex flex-col items-center justify-center py-2 px-3 rounded-xl border border-[#E5E4DC] dark:border-white/10 hover:bg-emerald-500/10 hover:border-emerald-500/30 text-[var(--text-primary)] hover:text-emerald-600 dark:hover:text-emerald-400 transition-all cursor-pointer text-xs"
                                                    >
                                                        <span className="font-semibold">Got It</span>
                                                        <span className="text-[10px] opacity-60">Key 3</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex justify-center pt-8">
                                            <button
                                                type="button"
                                                onClick={() => setIsAnswerRevealed(true)}
                                                className="px-5 py-2.5 rounded-xl text-xs font-medium bg-[#F4F3EE] dark:bg-white/[0.06] border border-[#E5E4DC] dark:border-white/10 hover:bg-[#EAE8DF] dark:hover:bg-white/10 text-[var(--text-primary)] transition-colors cursor-pointer flex items-center gap-2"
                                            >
                                                <span>Reveal Answer</span>
                                                <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-white dark:bg-[#18191B] border border-[#E5E4DC] dark:border-white/10">Space</kbd>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Navigation Bar */}
                                <div className="w-full flex items-center justify-between text-xs text-[var(--text-muted)] px-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsAnswerRevealed(false);
                                            setCurrentIndex(i => Math.max(0, i - 1));
                                        }}
                                        disabled={currentIndex === 0}
                                        className="flex items-center gap-1 py-1.5 px-2.5 rounded-lg hover:bg-[#F4F3EE] dark:hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                    >
                                        <ChevronLeft size={14} />
                                        <span>Previous</span>
                                    </button>

                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditingCardId(currentCard.id);
                                                setEditQuestion(currentCard.question);
                                                setEditAnswer(currentCard.answer);
                                                setCardViewMode('deck');
                                            }}
                                            className="hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors cursor-pointer"
                                        >
                                            <Edit2 size={12} />
                                            <span>Edit</span>
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (currentIndex < flashcards.length - 1) {
                                                setIsAnswerRevealed(false);
                                                setCurrentIndex(i => i + 1);
                                            } else {
                                                setSessionCompleted(true);
                                            }
                                        }}
                                        className="flex items-center gap-1 py-1.5 px-2.5 rounded-lg hover:bg-[#F4F3EE] dark:hover:bg-white/[0.06] cursor-pointer transition-colors"
                                    >
                                        <span>{currentIndex === flashcards.length - 1 ? 'Finish' : 'Next'}</span>
                                        <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        ) : null
                    ) : (
                        /* ── Deck Management View ────────────────────────────── */
                        <div className="w-full max-w-3xl flex flex-col gap-5">
                            {/* Search bar */}
                            <div className="flex items-center justify-between gap-3">
                                <div className="relative flex-1 max-w-sm">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                    <input
                                        type="text"
                                        placeholder="Search flashcards..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white dark:bg-[#18191B] border border-[#E5E4DC] dark:border-white/10 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)] transition-colors"
                                    />
                                </div>
                                <span className="text-xs text-[var(--text-muted)]">
                                    {filteredCards.length} of {flashcards.length} cards
                                </span>
                            </div>

                            {/* Inline Add Card Drawer */}
                            {isCreatingCard && (
                                <div className="p-5 rounded-2xl border border-[#E5E4DC] dark:border-white/10 bg-white dark:bg-[#18191B] shadow-sm flex flex-col gap-4 animate-fade-in">
                                    <div className="flex items-center justify-between pb-2 border-b border-[#E5E4DC] dark:border-white/10">
                                        <h4 className="text-xs font-semibold text-[var(--text-primary)]">
                                            New Flashcard
                                        </h4>
                                        <button
                                            type="button"
                                            onClick={() => setIsCreatingCard(false)}
                                            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[11px] font-medium text-[var(--text-secondary)]">Question</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. What were the 3 action items agreed upon?"
                                            value={newQuestion}
                                            onChange={e => setNewQuestion(e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl bg-[#F4F3EE] dark:bg-white/[0.04] border border-[#E5E4DC] dark:border-white/10 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]"
                                            autoFocus
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[11px] font-medium text-[var(--text-secondary)]">Answer</label>
                                        <textarea
                                            placeholder="Enter the concise answer..."
                                            value={newAnswer}
                                            onChange={e => setNewAnswer(e.target.value)}
                                            rows={3}
                                            className="w-full px-3 py-2 rounded-xl bg-[#F4F3EE] dark:bg-white/[0.04] border border-[#E5E4DC] dark:border-white/10 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)] resize-none"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between pt-1">
                                        <div className="flex items-center gap-1.5">
                                            {(['easy', 'medium', 'hard'] as const).map(d => (
                                                <button
                                                    key={d}
                                                    type="button"
                                                    onClick={() => setNewDifficulty(d)}
                                                    className={cn(
                                                        "px-2.5 py-0.5 rounded-md text-[10px] font-medium capitalize border transition-all cursor-pointer",
                                                        newDifficulty === d
                                                            ? "bg-[var(--text-primary)] text-[var(--bg)] border-transparent"
                                                            : "border-[#E5E4DC] dark:border-white/10 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                                    )}
                                                >
                                                    {d}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setIsCreatingCard(false)}
                                                className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleCreateCard}
                                                className="px-3.5 py-1.5 rounded-lg bg-[#1F2023] hover:bg-[#2C2E33] dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 text-xs font-medium cursor-pointer shadow-2xs"
                                            >
                                                Save Card
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Card Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-8">
                                {filteredCards.map((card, idx) => {
                                    const isEditing = editingCardId === card.id;

                                    return (
                                        <div
                                            key={card.id}
                                            className="p-4 rounded-xl border border-[#E5E4DC] dark:border-white/10 bg-white dark:bg-[#18191B] shadow-2xs flex flex-col justify-between gap-3 group"
                                        >
                                            {isEditing ? (
                                                <div className="flex flex-col gap-2.5">
                                                    <input
                                                        type="text"
                                                        value={editQuestion}
                                                        onChange={e => setEditQuestion(e.target.value)}
                                                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#F4F3EE] dark:bg-white/[0.04] border border-[#E5E4DC] dark:border-white/10 text-xs text-[var(--text-primary)]"
                                                    />
                                                    <textarea
                                                        value={editAnswer}
                                                        onChange={e => setEditAnswer(e.target.value)}
                                                        rows={3}
                                                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#F4F3EE] dark:bg-white/[0.04] border border-[#E5E4DC] dark:border-white/10 text-xs text-[var(--text-primary)] resize-none"
                                                    />
                                                    <div className="flex justify-end gap-2 pt-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingCardId(null)}
                                                            className="px-2.5 py-1 text-xs text-[var(--text-muted)] cursor-pointer"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSaveEdit(card.id)}
                                                            className="px-3 py-1 bg-[var(--text-primary)] text-[var(--bg)] text-xs font-medium rounded-lg cursor-pointer"
                                                        >
                                                            Save
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex flex-col gap-2">
                                                        <h4 className="text-xs font-medium text-[var(--text-primary)] leading-snug">
                                                            {card.question}
                                                        </h4>
                                                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-3">
                                                            {card.answer}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center justify-between pt-2 border-t border-[#E5E4DC]/60 dark:border-white/5 text-[11px] text-[var(--text-muted)]">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setCurrentIndex(idx);
                                                                setIsAnswerRevealed(false);
                                                                setSessionCompleted(false);
                                                                setCardViewMode('practice');
                                                            }}
                                                            className="text-[var(--text-primary)] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                                                        >
                                                            <span>Practice</span>
                                                            <ArrowRight size={11} />
                                                        </button>

                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditingCardId(card.id);
                                                                    setEditQuestion(card.question);
                                                                    setEditAnswer(card.answer);
                                                                }}
                                                                className="p-1 rounded hover:bg-[#F4F3EE] dark:hover:bg-white/[0.06] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                                                                title="Edit"
                                                            >
                                                                <Edit2 size={12} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteCard(card.id)}
                                                                className="p-1 rounded hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-500 cursor-pointer"
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
                    )
                ) : (
                    /* ══════════════════════════════════════════════════════════ */
                    /* INTERACTIVE QUIZ SECTION                                   */
                    /* ══════════════════════════════════════════════════════════ */
                    <div className="w-full max-w-2xl flex flex-col gap-6 my-auto">
                        {quizzes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center my-auto py-16 px-8 max-w-md text-center rounded-2xl border border-[#E5E4DC] dark:border-white/10 bg-white dark:bg-[#18191B] shadow-sm mx-auto">
                                <div className="w-12 h-12 rounded-2xl bg-[#F4F3EE] dark:bg-white/[0.06] flex items-center justify-center text-[var(--text-muted)] mb-4">
                                    <HelpCircle size={22} />
                                </div>
                                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1.5">
                                    No quiz questions yet
                                </h3>
                                <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-6">
                                    {hasSourceMaterial
                                        ? "Generate quiz questions based on this note's discussion to test your knowledge retention."
                                        : "Take notes or record a meeting first to generate quizzes."}
                                </p>
                                {hasSourceMaterial && (
                                    <button
                                        type="button"
                                        onClick={handleGenerateQuiz}
                                        disabled={isGeneratingQuiz}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-[#1F2023] hover:bg-[#2C2E33] dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                                    >
                                        <Sparkles size={13} className={cn(isGeneratingQuiz && "animate-spin")} />
                                        <span>{isGeneratingQuiz ? 'Generating Quiz...' : 'Generate Quiz with AI'}</span>
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-6 pb-12">
                                {/* Quiz Progress & Stats */}
                                <div className="flex items-center justify-between px-1 text-xs text-[var(--text-muted)]">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-[var(--text-primary)]">
                                            {quizStats.answered} of {quizStats.total} answered
                                        </span>
                                        {quizStats.answered > 0 && (
                                            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                {quizStats.correct}/{quizStats.answered} Correct ({quizStats.pct}%)
                                            </span>
                                        )}
                                    </div>
                                    {quizStats.answered > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setQuizAnswers({});
                                                setTextInputs({});
                                            }}
                                            className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                                        >
                                            <RotateCcw size={12} />
                                            <span>Reset</span>
                                        </button>
                                    )}
                                </div>

                                {/* Questions List */}
                                <div className="flex flex-col gap-4">
                                    {quizzes.map((quiz, qIdx) => {
                                        const questionKey = quiz.id || String(qIdx);
                                        const userState = quizAnswers[questionKey];
                                        const isAnswered = userState?.isSubmitted || userState?.isRevealed;
                                        const options = getQuizOptions(quiz);
                                        const badge = getQuestionBadge(quiz, options);

                                        return (
                                            <div
                                                key={quiz.id || qIdx}
                                                id={`quiz-question-${quiz.id}`}
                                                className="p-6 rounded-2xl border border-[#E5E4DC] dark:border-white/10 bg-white dark:bg-[#18191B] shadow-2xs flex flex-col gap-4"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-start gap-2.5">
                                                        <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-[#F4F3EE] dark:bg-white/[0.06] text-[var(--text-muted)] shrink-0">
                                                            Q{qIdx + 1}
                                                        </span>
                                                        <h3 className="text-sm sm:text-base font-medium text-[var(--text-primary)] leading-snug whitespace-pre-wrap">
                                                            {quiz.question}
                                                        </h3>
                                                    </div>
                                                    <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-md bg-[#F4F3EE] dark:bg-white/[0.04] text-[var(--text-muted)] shrink-0">
                                                        {badge}
                                                    </span>
                                                </div>

                                                {/* Choice Questions (MCQ / True-False) */}
                                                {options.length > 0 ? (
                                                    <div className="flex flex-col gap-2 pt-1">
                                                        {options.map((opt: string, optIdx: number) => {
                                                            const isCorrectOption = checkOptionCorrect(quiz, opt, optIdx);
                                                            const isSelected = userState?.choiceIndex === optIdx;

                                                            let optionStyle = "border-[#E5E4DC] dark:border-white/10 hover:bg-[#F4F3EE] dark:hover:bg-white/[0.04] text-[var(--text-primary)]";
                                                            if (isAnswered) {
                                                                if (isCorrectOption) {
                                                                    optionStyle = "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-medium";
                                                                } else if (isSelected) {
                                                                    optionStyle = "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300";
                                                                } else {
                                                                    optionStyle = "opacity-50 border-[#E5E4DC] dark:border-white/10 text-[var(--text-muted)]";
                                                                }
                                                            }

                                                            return (
                                                                <button
                                                                    key={optIdx}
                                                                    type="button"
                                                                    onClick={() => !isAnswered && handleSelectQuizOption(questionKey, quiz, optIdx, options)}
                                                                    disabled={isAnswered}
                                                                    className={cn(
                                                                        "w-full text-left px-4 py-3 rounded-xl border text-xs leading-relaxed flex items-center justify-between transition-all cursor-pointer",
                                                                        optionStyle
                                                                    )}
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="w-5 h-5 rounded-full border border-current/30 flex items-center justify-center text-[10px] font-mono shrink-0">
                                                                            {String.fromCharCode(65 + optIdx)}
                                                                        </span>
                                                                        <span>{opt}</span>
                                                                    </div>

                                                                    {isAnswered && (
                                                                        isCorrectOption ? (
                                                                            <Check size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                                                        ) : isSelected ? (
                                                                            <X size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
                                                                        ) : null
                                                                    )}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    /* Text Questions (Fill in the Blank / Short Answer / Code) */
                                                    <div className="flex flex-col gap-3 pt-1">
                                                        {!isAnswered ? (
                                                            <form
                                                                onSubmit={(e) => {
                                                                    e.preventDefault();
                                                                    handleTextSubmit(questionKey, quiz);
                                                                }}
                                                                className="flex flex-col sm:flex-row gap-2"
                                                            >
                                                                <input
                                                                    type="text"
                                                                    placeholder={quiz.type === 'fill_blank' ? "Type the missing word(s)..." : "Type your answer..."}
                                                                    value={textInputs[questionKey] || ''}
                                                                    onChange={(e) => setTextInputs(prev => ({ ...prev, [questionKey]: e.target.value }))}
                                                                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#F4F3EE] dark:bg-white/[0.04] border border-[#E5E4DC] dark:border-white/10 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]"
                                                                    autoFocus={qIdx === 0}
                                                                />
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        type="submit"
                                                                        disabled={!textInputs[questionKey]?.trim()}
                                                                        className="px-4 py-2.5 rounded-xl text-xs font-medium bg-[#1F2023] hover:bg-[#2C2E33] dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 transition-all cursor-pointer disabled:opacity-40 shadow-xs"
                                                                    >
                                                                        Check Answer
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRevealAnswer(questionKey)}
                                                                        className="px-3 py-2.5 rounded-xl text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[#F4F3EE] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                                                                    >
                                                                        Show Answer
                                                                    </button>
                                                                </div>
                                                            </form>
                                                        ) : (
                                                            <div className="flex flex-col gap-2.5 animate-fade-in">
                                                                {userState?.textInput && (
                                                                    <div className={cn(
                                                                        "flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs",
                                                                        userState.isCorrect
                                                                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-medium"
                                                                            : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
                                                                    )}>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="opacity-70">Your answer:</span>
                                                                            <span className="font-semibold">{userState.textInput}</span>
                                                                        </div>
                                                                        {userState.isCorrect ? (
                                                                            <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                                                                                <Check size={13} />
                                                                                Correct
                                                                            </span>
                                                                        ) : (
                                                                            <span className="flex items-center gap-1 font-medium text-rose-600 dark:text-rose-400">
                                                                                <X size={13} />
                                                                                Incorrect
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* Answer Display */}
                                                                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F4F3EE] dark:bg-white/[0.04] border border-[#E5E4DC] dark:border-white/10 text-xs">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[var(--text-muted)]">Expected Answer:</span>
                                                                        <span className="font-semibold text-[var(--text-primary)]">{quiz.answerKey}</span>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleResetSingle(questionKey)}
                                                                        className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] underline cursor-pointer"
                                                                    >
                                                                        Try Again
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Explanation if Available and Answered */}
                                                {isAnswered && (quiz as any).explanation && (
                                                    <div className="p-3 rounded-xl bg-[#F4F3EE] dark:bg-white/[0.04] border border-[#E5E4DC] dark:border-white/10 text-xs text-[var(--text-secondary)] leading-relaxed mt-1 animate-fade-in">
                                                        <span className="font-semibold text-[var(--text-primary)] mr-1">Explanation:</span>
                                                        {(quiz as any).explanation}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
