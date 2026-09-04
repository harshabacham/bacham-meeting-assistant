import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, CheckCircle2, XCircle, ChevronRight, RotateCcw } from 'lucide-react';

interface Props {
  lectureId?: string;
}

interface Question {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

// Mocked questions for the UI prototype
const MOCK_QUESTIONS: Question[] = [
  {
    id: 'q1',
    question: 'What is the primary benefit of the Bento Grid layout discussed?',
    options: [
      'It allows for more text density on a single page.',
      'It creates a highly structured, premium visual hierarchy.',
      'It reduces the amount of CSS required.',
      'It automatically supports legacy browsers.'
    ],
    correctIndex: 1,
  },
  {
    id: 'q2',
    question: 'How is token consumption minimized in the Inline Study Quiz flow?',
    options: [
      'By using a cheaper LLM model for generation.',
      'By caching all previous meetings aggressively.',
      'By requiring explicit user interaction to trigger generation.',
      'By only generating quizzes for meetings under 10 minutes.'
    ],
    correctIndex: 2,
  },
  {
    id: 'q3',
    question: 'Which visual effect is used to make the UI feel deeply integrated?',
    options: [
      'Solid drop shadows',
      'Glassmorphic backdrop blurs',
      'Bright neon borders',
      'Flat minimalist colors'
    ],
    correctIndex: 1,
  }
];

type QuizState = 'idle' | 'generating' | 'active' | 'finished';

export const InlineStudyQuiz: React.FC<Props> = ({ lectureId }) => {
  const [quizState, setQuizState] = useState<QuizState>('idle');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [score, setScore] = useState(0);

  const handleGenerate = () => {
    setQuizState('generating');
    
    // Mock the backend generation delay (e.g. 2 seconds)
    setTimeout(() => {
      setQuestions(MOCK_QUESTIONS);
      setCurrentIndex(0);
      setScore(0);
      setSelectedAnswer(null);
      setIsAnswerRevealed(false);
      setQuizState('active');
    }, 2000);
  };

  const handleSelectAnswer = (index: number) => {
    if (isAnswerRevealed) return;
    
    setSelectedAnswer(index);
    setIsAnswerRevealed(true);
    
    if (index === questions[currentIndex].correctIndex) {
      setScore(s => s + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(c => c + 1);
      setSelectedAnswer(null);
      setIsAnswerRevealed(false);
    } else {
      setQuizState('finished');
    }
  };

  const handleReset = () => {
    setQuizState('idle');
  };

  return (
    <div className="mt-8 font-sans">
      <AnimatePresence mode="wait">
        
        {/* IDLE STATE */}
        {quizState === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="group relative flex items-center justify-between p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer"
            onClick={handleGenerate}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent)]/5 to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-[var(--text-primary)] tracking-wide">Test Your Knowledge</h3>
                <p className="text-[12px] font-medium text-[var(--text-muted)] mt-0.5">
                  Turn this summary into a quick interactive quiz.
                </p>
              </div>
            </div>
            <div className="relative z-10">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors flex items-center gap-1.5">
                Generate <ChevronRight size={14} />
              </span>
            </div>
          </motion.div>
        )}

        {/* GENERATING STATE */}
        {quizState === 'generating' && (
          <motion.div
            key="generating"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex flex-col items-center justify-center py-12 rounded-2xl bg-[var(--surface-raised)]/30 backdrop-blur-xl border border-[var(--border)]/50 shadow-sm"
          >
            <Loader2 size={24} className="text-[var(--accent)] animate-spin mb-4" />
            <p className="text-[13px] font-medium text-[var(--text-primary)]">AI is analyzing the summary...</p>
            <p className="text-[11px] font-medium text-[var(--text-muted)] mt-1">Extracting key concepts (≈ 50 tokens)</p>
          </motion.div>
        )}

        {/* ACTIVE STATE */}
        {quizState === 'active' && questions.length > 0 && (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex flex-col rounded-2xl bg-[var(--surface-raised)]/30 backdrop-blur-xl border border-[var(--border)]/50 shadow-sm overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]/40 bg-[var(--surface-raised)]/20">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-[var(--accent)]" />
                <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Study Mode</span>
              </div>
              <span className="text-[12px] font-bold text-[var(--text-muted)]">
                {currentIndex + 1} / {questions.length}
              </span>
            </div>

            {/* Question Body */}
            <div className="p-6">
              <h3 className="text-[16px] font-medium text-[var(--text-primary)] leading-relaxed mb-6">
                {questions[currentIndex].question}
              </h3>

              <div className="flex flex-col gap-3">
                {questions[currentIndex].options.map((option, idx) => {
                  const isCorrectAnswer = questions[currentIndex].correctIndex === idx;
                  const isSelected = selectedAnswer === idx;
                  
                  let stateClasses = "bg-[var(--surface)] border-[var(--border)]/50 hover:border-[var(--border-accent)] text-[var(--text-primary)]";
                  
                  if (isAnswerRevealed) {
                    if (isCorrectAnswer) {
                      stateClasses = "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400";
                    } else if (isSelected) {
                      stateClasses = "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400";
                    } else {
                      stateClasses = "bg-[var(--surface)]/50 border-[var(--border)]/20 text-[var(--text-muted)] opacity-50";
                    }
                  }

                  return (
                    <motion.button
                      key={idx}
                      whileHover={!isAnswerRevealed ? { scale: 1.01 } : {}}
                      whileTap={!isAnswerRevealed ? { scale: 0.99 } : {}}
                      onClick={() => handleSelectAnswer(idx)}
                      disabled={isAnswerRevealed}
                      className={`relative flex items-center justify-between w-full p-4 rounded-xl border text-left text-[14px] font-medium transition-all ${stateClasses}`}
                    >
                      <span className="pr-8">{option}</span>
                      
                      {isAnswerRevealed && isCorrectAnswer && (
                        <CheckCircle2 size={16} className="absolute right-4 text-emerald-500" />
                      )}
                      {isAnswerRevealed && isSelected && !isCorrectAnswer && (
                        <XCircle size={16} className="absolute right-4 text-red-500" />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Footer Actions */}
              <AnimatePresence>
                {isAnswerRevealed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                    className="flex justify-end overflow-hidden"
                  >
                    <button
                      onClick={handleNextQuestion}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-[13px] font-bold shadow-md hover:shadow-lg transition-all"
                    >
                      {currentIndex < questions.length - 1 ? 'Next Question' : 'View Results'}
                      <ChevronRight size={16} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* FINISHED STATE */}
        {quizState === 'finished' && (
          <motion.div
            key="finished"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-10 px-6 rounded-2xl bg-[var(--surface-raised)]/30 backdrop-blur-xl border border-[var(--border)]/50 shadow-sm text-center"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-5 border border-emerald-500/20">
              <span className="text-2xl font-black text-emerald-500">{score}/{questions.length}</span>
            </div>
            <h2 className="text-[18px] font-bold text-[var(--text-primary)] mb-2">Quiz Complete!</h2>
            <p className="text-[13px] text-[var(--text-muted)] max-w-sm mb-6">
              You correctly answered {score} out of {questions.length} questions.
            </p>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[13px] font-bold transition-all hover:bg-[var(--surface-hover)]"
            >
              <RotateCcw size={14} /> Close Quiz
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};
