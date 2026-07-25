import { useState, useEffect } from 'react';
import { TauriClient, QuizQuestion } from '@/infrastructure/tauri-client';
import { CheckSquare, Loader2, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import { Button, EmptyState } from '@/components';
import { motion, AnimatePresence } from 'framer-motion';

interface QuizTabProps {
  lectureId: string;
  transcript: string | null;
}

export function QuizTab({ lectureId, transcript }: QuizTabProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const loadQuestions = async () => {
    try {
      setIsLoading(true);
      const data = await TauriClient.listQuizQuestions(lectureId);
      setQuestions(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load quiz');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [lectureId]);

  const handleGenerate = async () => {
    if (!transcript) {
      setError('Cannot generate quiz without a transcript.');
      return;
    }
    try {
      setIsGenerating(true);
      setError(null);
      await TauriClient.generateQuiz(lectureId, transcript);
      await loadQuestions();
    } catch (e: any) {
      setError(e.message || 'Failed to generate quiz');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectOption = (questionId: string, option: string) => {
    if (revealed[questionId]) return;
    setSelectedAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const handleCheckAnswer = (questionId: string) => {
    if (!selectedAnswers[questionId]) return;
    setRevealed(prev => ({ ...prev, [questionId]: true }));
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-muted-foreground w-8 h-8" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="p-8 h-full max-w-2xl mx-auto flex flex-col justify-center">
        <EmptyState
          icon={CheckSquare}
          title="No Quiz Available"
          description="Generate a multiple-choice practice quiz from your lecture content."
        />
        {error && <p className="text-destructive text-sm mt-4 text-center">{error}</p>}
        <div className="mt-6 flex justify-center">
          <Button onClick={handleGenerate} disabled={isGenerating || !transcript} className="gap-2">
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
            {isGenerating ? 'Generating...' : 'Generate Quiz'}
          </Button>
        </div>
      </div>
    );
  }

  const score = Object.keys(revealed).filter(
    id => selectedAnswers[id] === questions.find(q => q.id === id)?.answerKey
  ).length;

  return (
    <div className="p-4 sm:p-8 h-full overflow-y-auto bg-[var(--bg)]">
      <div className="max-w-3xl mx-auto flex flex-col gap-8 pb-12">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold font-serif">Practice Quiz</h2>
          <div className="text-sm font-medium bg-surface px-4 py-2 rounded-full border border-border">
            Score: <span className="text-primary">{score}</span> / {Object.keys(revealed).length}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {questions.map((q, index) => {
            const options: string[] = q.options ? JSON.parse(q.options) : [];
            const isRevealed = revealed[q.id];
            const selected = selectedAnswers[q.id];
            const isCorrect = selected === q.answerKey;

            return (
              <div key={q.id} className="bg-surface rounded-xl border border-border p-6 shadow-sm flex flex-col gap-5">
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                    {index + 1}
                  </div>
                  <h3 className="text-lg font-medium text-foreground pt-1 leading-relaxed">
                    {q.question}
                  </h3>
                </div>

                <div className="pl-12 flex flex-col gap-3">
                  {options.map((opt, i) => {
                    const isSelected = selected === opt;
                    const isCorrectOption = opt === q.answerKey;
                    
                    let bgClass = "bg-background hover:bg-surface-hover border-border";
                    if (isRevealed) {
                      if (isCorrectOption) bgClass = "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400";
                      else if (isSelected && !isCorrectOption) bgClass = "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400";
                      else bgClass = "bg-background border-border opacity-50";
                    } else if (isSelected) {
                      bgClass = "bg-[var(--accent-dim)] border-[var(--accent)] text-foreground";
                    }

                    return (
                      <button
                        key={i}
                        onClick={() => handleSelectOption(q.id, opt)}
                        disabled={isRevealed}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-colors flex items-center justify-between ${bgClass}`}
                      >
                        <span className="font-medium text-sm sm:text-base leading-relaxed">{opt}</span>
                        {isRevealed && isCorrectOption && <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 ml-3" />}
                        {isRevealed && isSelected && !isCorrectOption && <XCircle className="w-5 h-5 text-red-500 shrink-0 ml-3" />}
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {!isRevealed && selected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="pl-12 pt-2"
                    >
                      <Button onClick={() => handleCheckAnswer(q.id)} className="w-full sm:w-auto gap-2">
                        Check Answer <ChevronRight size={16} />
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {isRevealed && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`pl-12 py-3 px-4 rounded-lg text-sm font-medium border ${isCorrect ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'}`}
                  >
                    {isCorrect ? 'Correct! Well done.' : `Incorrect. The correct answer was: ${q.answerKey}`}
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
