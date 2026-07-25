import { useState, useEffect, useRef, useCallback } from 'react';
import { QuizQuestion, QuizAnswer, QuizResult } from '@/infrastructure/tauri-client';
import { CheckCircle, XCircle, Clock, Trophy, ArrowRight, X } from 'lucide-react';
import { cn } from '@/components';
import { motion, AnimatePresence } from 'framer-motion';

interface QuizRunnerProps {
    questions: QuizQuestion[];
    mode: 'practice' | 'exam';
    timeLimitSeconds?: number;
    onSubmit: (answers: QuizAnswer[]) => Promise<QuizResult>;
    onClose?: () => void;
}

export function QuizRunner({ questions, mode, timeLimitSeconds, onSubmit, onClose }: QuizRunnerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [showFeedback, setShowFeedback] = useState(false);
    const [result, setResult] = useState<QuizResult | null>(null);
    const [timeLeft, setTimeLeft] = useState<number | null>(timeLimitSeconds || null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const currentQuestion = questions[currentIndex];

    // Timer
    useEffect(() => {
        if (!timeLimitSeconds) return;
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev === null || prev <= 1) {
                    clearInterval(timerRef.current!);
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current!);
    }, [timeLimitSeconds]);

    const handleAnswer = useCallback((answer: string) => {
        if (showFeedback) return;
        setSelectedAnswer(answer);

        if (mode === 'practice') {
            setShowFeedback(true);
            setAnswers(prev => ({ ...prev, [currentQuestion.id]: answer }));
        }
    }, [showFeedback, mode, currentQuestion]);

    const handleNext = useCallback(() => {
        if (mode === 'exam' && selectedAnswer) {
            setAnswers(prev => ({ ...prev, [currentQuestion.id]: selectedAnswer }));
        }

        if (currentIndex < questions.length - 1) {
            setCurrentIndex(i => i + 1);
            setSelectedAnswer(null);
            setShowFeedback(false);
        } else {
            handleSubmit();
        }
    }, [mode, selectedAnswer, currentIndex, questions.length, currentQuestion]);

    const handleSubmit = useCallback(async () => {
        clearInterval(timerRef.current!);
        if (isSubmitting) return;
        setIsSubmitting(true);

        const finalAnswers: QuizAnswer[] = questions.map(q => ({
            quizId: q.id,
            submittedAnswer: answers[q.id] || (selectedAnswer && q.id === currentQuestion?.id ? selectedAnswer : ''),
        }));

        const result = await onSubmit(finalAnswers);
        setResult(result);
        setIsSubmitting(false);
    }, [isSubmitting, questions, answers, selectedAnswer, currentQuestion, onSubmit]);

    // Results screen
    if (result) {
        return (
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-16 gap-8 max-w-2xl mx-auto w-full"
            >
                <div
                    className="w-32 h-32 rounded-full flex items-center justify-center shadow-2xl relative"
                    style={{
                        background: result.scorePct >= 70 ? 'rgba(166,255,0,0.1)' : 'rgba(255,77,77,0.1)',
                        border: `2px solid ${result.scorePct >= 70 ? 'var(--accent)' : '#FF4D4D'}`,
                        boxShadow: `0 0 60px ${result.scorePct >= 70 ? 'rgba(166,255,0,0.2)' : 'rgba(255,77,77,0.2)'}`
                    }}
                >
                    <Trophy size={48} color={result.scorePct >= 70 ? 'var(--accent)' : '#FF4D4D'} />
                </div>
                <div className="text-center">
                    <p className="text-6xl font-bold mb-2" style={{ color: result.scorePct >= 70 ? 'var(--accent)' : '#FF4D4D' }}>
                        {Math.round(result.scorePct)}%
                    </p>
                    <p className="text-neutral-400 text-lg">
                        {result.correct} of {result.total} correct
                    </p>
                </div>

                <div className="w-full space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {result.answers.map((a, i) => (
                        <div
                            key={a.quizId}
                            className={cn(
                                "flex items-start gap-4 p-5 rounded-2xl border",
                                a.isCorrect ? "bg-[#4DFF91]/5 border-[#4DFF91]/20" : "bg-[#FF4D4D]/5 border-[#FF4D4D]/20"
                            )}
                        >
                            {a.isCorrect
                                ? <CheckCircle size={20} className="text-[#4DFF91] flex-shrink-0 mt-0.5" />
                                : <XCircle size={20} className="text-[#FF4D4D] flex-shrink-0 mt-0.5" />
                            }
                            <div className="flex-1">
                                <p className="font-medium text-white text-base mb-2">
                                    <span className="text-neutral-500 mr-2">Q{i + 1}</span>
                                    {questions.find(q => q.id === a.quizId)?.question}
                                </p>
                                {!a.isCorrect && (
                                    <p className="text-neutral-400 text-sm bg-black/40 p-3 rounded-xl border border-white/5 inline-block mt-2">
                                        Correct: <span className="text-white font-medium ml-1">{a.correctAnswer}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <button 
                    className="w-full max-w-sm py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-white font-medium transition-colors border border-white/10"
                    onClick={onClose}
                >
                    Return to Dashboard
                </button>
            </motion.div>
        );
    }

    if (!currentQuestion) return null;

    let options: string[] = [];
    try { options = JSON.parse(currentQuestion.options || '[]'); } catch { options = []; }


    return (
        <div className="flex flex-col max-w-3xl mx-auto w-full h-full py-6 pb-12">
            {/* Header & Progress */}
            <div className="flex flex-col gap-6 mb-8">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors text-neutral-400 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                        <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-medium text-[var(--accent)] uppercase tracking-widest">
                            {mode === 'exam' ? 'Exam Mode' : 'Practice Mode'}
                        </span>
                        <span className="text-neutral-500 font-medium text-sm">
                            Question {currentIndex + 1} of {questions.length}
                        </span>
                    </div>
                    {timeLeft !== null && (
                        <div className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-full border",
                            timeLeft < 30 ? "bg-[#FF4D4D]/10 border-[#FF4D4D]/30 text-[#FF4D4D]" : "bg-white/5 border-white/10 text-neutral-300"
                        )}>
                            <Clock size={16} />
                            <span className="font-mono font-medium">
                                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                            </span>
                        </div>
                    )}
                </div>

                {/* Progress bar */}
                <div className="flex gap-2 w-full px-2">
                    {questions.map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                "h-1.5 rounded-full flex-1 transition-colors duration-500",
                                i < currentIndex ? "bg-[var(--accent)]" :
                                i === currentIndex ? "bg-[var(--accent)]/40" : "bg-white/10"
                            )}
                        />
                    ))}
                </div>
            </div>

            {/* Question Container */}
            <div className="flex-1 flex flex-col justify-center">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentQuestion.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="w-full flex flex-col gap-8"
                    >
                        {/* Question Text */}
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 shadow-xl backdrop-blur-md">
                            <p className="text-xs text-neutral-500 font-bold uppercase tracking-[0.2em] mb-6">
                                {currentQuestion.type.replace('_', ' ')} · Level {currentQuestion.difficulty}
                            </p>
                            <h2 className="text-2xl md:text-3xl font-medium text-white leading-relaxed">
                                {currentQuestion.question}
                            </h2>
                        </div>

                        {/* Options */}
                        {options.length > 0 && (
                            <div className="grid gap-3">
                                {options.map((option, i) => {
                                    const letter = String.fromCharCode(65 + i);
                                    const isSelected = selectedAnswer === option;
                                    const isCorrect = option === currentQuestion.answerKey;
                                    
                                    let stateClasses = "bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20";
                                    let iconContent = null;

                                    if (showFeedback && mode === 'practice') {
                                        if (isCorrect) {
                                            stateClasses = "bg-[#4DFF91]/10 border-[#4DFF91]/40 text-[#4DFF91]";
                                            iconContent = <CheckCircle size={20} className="text-[#4DFF91]" />;
                                        } else if (isSelected && !isCorrect) {
                                            stateClasses = "bg-[#FF4D4D]/10 border-[#FF4D4D]/40 text-[#FF4D4D]";
                                            iconContent = <XCircle size={20} className="text-[#FF4D4D]" />;
                                        } else {
                                            stateClasses = "bg-white/5 border-white/5 text-neutral-500 opacity-50";
                                        }
                                    } else if (isSelected) {
                                        stateClasses = "bg-[var(--accent)]/10 border-[var(--accent)]/50 text-[var(--accent)]";
                                    }

                                    return (
                                        <button
                                            key={option}
                                            onClick={() => handleAnswer(option)}
                                            disabled={showFeedback}
                                            className={cn(
                                                "w-full text-left flex items-center gap-4 p-5 rounded-2xl border transition-all duration-200 group outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                                                stateClasses,
                                                showFeedback && "cursor-default"
                                            )}
                                        >
                                            <span className={cn(
                                                "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold transition-colors",
                                                isSelected || (showFeedback && isCorrect) ? "bg-current/20" : "bg-white/10 group-hover:bg-white/20 text-neutral-400"
                                            )}>
                                                {letter}
                                            </span>
                                            <span className="flex-1 text-lg font-medium">{option}</span>
                                            {iconContent && <div className="pl-4">{iconContent}</div>}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Text Input */}
                        {options.length === 0 && (
                            <input
                                className="w-full bg-white/5 border border-white/10 p-6 rounded-2xl text-xl text-white outline-none focus:border-[var(--accent)]/50 transition-colors placeholder:text-neutral-600"
                                placeholder="Type your answer here..."
                                value={selectedAnswer || ''}
                                onChange={e => setSelectedAnswer(e.target.value)}
                                disabled={showFeedback}
                            />
                        )}
                        
                        {/* Feedback Banner */}
                        <AnimatePresence>
                            {showFeedback && mode === 'practice' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={cn(
                                        "p-6 rounded-2xl border flex items-start gap-4",
                                        selectedAnswer === currentQuestion.answerKey 
                                            ? "bg-[#4DFF91]/10 border-[#4DFF91]/30" 
                                            : "bg-[#FF4D4D]/10 border-[#FF4D4D]/30"
                                    )}
                                >
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold uppercase tracking-wider mb-2 opacity-80" style={{ color: selectedAnswer === currentQuestion.answerKey ? '#4DFF91' : '#FF4D4D' }}>
                                            {selectedAnswer === currentQuestion.answerKey ? 'Correct!' : 'Incorrect'}
                                        </p>
                                        <p className="text-white text-lg">
                                            The correct answer is: <span className="font-bold">{currentQuestion.answerKey}</span>
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Footer Action */}
            <div className="mt-8 flex justify-end">
                <button
                    className="px-8 py-4 bg-[var(--accent)] hover:bg-[#bbf045] disabled:opacity-50 disabled:hover:bg-[var(--accent)] text-black font-bold rounded-2xl transition-all flex items-center gap-3 text-lg"
                    onClick={handleNext}
                    disabled={!selectedAnswer && options.length > 0}
                >
                    {currentIndex < questions.length - 1 ? (
                        <>Next Question <ArrowRight size={20} /></>
                    ) : (
                        'Submit Quiz'
                    )}
                </button>
            </div>
        </div>
    );
}
