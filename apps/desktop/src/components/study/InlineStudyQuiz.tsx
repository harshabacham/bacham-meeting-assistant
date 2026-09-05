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

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

const MOCK_FLASHCARDS: Flashcard[] = [
  {
    id: 'f1',
    front: 'What is the main advantage of the Bento Grid layout?',
    back: 'It creates a highly structured, premium visual hierarchy that is easy to scan.'
  },
  {
    id: 'f2',
    front: 'How is token consumption minimized?',
    back: 'By requiring explicit user interaction to trigger generation, instead of doing it automatically.'
  },
  {
    id: 'f3',
    front: 'Which UI effect provides a feeling of depth?',
    back: 'Glassmorphic backdrop blurs and subtle inset shadows.'
  }
];

type QuizState = 'idle' | 'generating' | 'active_quiz' | 'active_flashcards' | 'finished';

export const InlineStudyQuiz: React.FC<Props> = ({ lectureId: _lectureId }) => {
  const [quizState, setQuizState] = useState<QuizState>('idle');
  const [studyMode, setStudyMode] = useState<'quiz' | 'flashcards'>('quiz');
  
  // Quiz State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [score, setScore] = useState(0);

  // Flashcard State
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isFlipped, setIsFlipped] = useState(false);

  const handleGenerate = (mode: 'quiz' | 'flashcards') => {
    setStudyMode(mode);
    setQuizState('generating');
    
    // Mock the backend generation delay (e.g. 2 seconds)
    setTimeout(() => {
      if (mode === 'quiz') {
        setQuestions(MOCK_QUESTIONS);
        setCurrentIndex(0);
        setScore(0);
        setSelectedAnswer(null);
        setIsAnswerRevealed(false);
        setQuizState('active_quiz');
      } else {
        setFlashcards(MOCK_FLASHCARDS);
        setCurrentIndex(0);
        setIsFlipped(false);
        setQuizState('active_flashcards');
      }
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

  const handleNextCard = () => {
    if (currentIndex < flashcards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentIndex(c => c + 1);
      }, 150); // wait for flip animation before changing text
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
            className="group relative flex flex-col sm:flex-row items-center justify-between p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-sm transition-all"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent)]/5 to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center gap-4 mb-4 sm:mb-0">
              <div className="p-2.5 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-[var(--text-primary)] tracking-wide">Test Your Knowledge</h3>
                <p className="text-[12px] font-medium text-[var(--text-muted)] mt-0.5">
                  Turn this summary into a quick interactive study session.
                </p>
              </div>
            </div>
            <div className="relative z-10 flex items-center gap-3 w-full sm:w-auto">
              <button 
                onClick={() => handleGenerate('flashcards')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-[12px] font-bold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                Flashcards
              </button>
              <button 
                onClick={() => handleGenerate('quiz')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-[12px] font-bold hover:opacity-90 shadow-sm hover:shadow transition-all"
              >
                Take a Quiz <ChevronRight size={14} />
              </button>
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
            <p className="text-[13px] font-medium text-[var(--text-primary)]">AI is generating your {studyMode}...</p>
            <p className="text-[11px] font-medium text-[var(--text-muted)] mt-1">Extracting key concepts (≈ 50 tokens)</p>
          </motion.div>
        )}

        {/* ACTIVE QUIZ STATE */}
        {quizState === 'active_quiz' && questions.length > 0 && (
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

        {/* ACTIVE FLASHCARDS STATE */}
        {quizState === 'active_flashcards' && flashcards.length > 0 && (
          <motion.div
            key="active_flashcards"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex flex-col rounded-2xl bg-[var(--surface-raised)]/30 backdrop-blur-xl border border-[var(--border)]/50 shadow-sm overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]/40 bg-[var(--surface-raised)]/20">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-[var(--accent)]" />
                <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Flashcards</span>
              </div>
              <span className="text-[12px] font-bold text-[var(--text-muted)]">
                {currentIndex + 1} / {flashcards.length}
              </span>
            </div>

            {/* Flashcard Body */}
            <div className="p-6 flex flex-col items-center justify-center min-h-[300px]" style={{ perspective: '1000px' }}>
              <motion.div
                className="relative w-full max-w-lg aspect-[3/2] cursor-pointer"
                style={{ transformStyle: 'preserve-3d' }}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                onClick={() => setIsFlipped(!isFlipped)}
              >
                {/* Front */}
                <div 
                  className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-8 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-md text-center"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <p className="text-[16px] font-medium text-[var(--text-primary)] leading-relaxed">
                    {flashcards[currentIndex].front}
                  </p>
                  <p className="absolute bottom-4 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                    Click to flip
                  </p>
                </div>

                {/* Back */}
                <div 
                  className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-8 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border-accent)] shadow-md text-center"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <p className="text-[15px] font-medium text-[var(--text-primary)] leading-relaxed text-emerald-500 dark:text-emerald-400">
                    {flashcards[currentIndex].back}
                  </p>
                </div>
              </motion.div>
              
              {/* Footer Actions */}
              <AnimatePresence>
                {isFlipped && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 flex gap-3"
                  >
                    <button
                      onClick={handleNextCard}
                      className="px-6 py-2.5 rounded-xl bg-[var(--accent)] text-white text-[13px] font-bold shadow-md hover:shadow-lg transition-all"
                    >
                      {currentIndex < flashcards.length - 1 ? 'Next Card' : 'Finish'}
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
            {studyMode === 'quiz' && (
              <>
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-5 border border-emerald-500/20">
                  <span className="text-2xl font-black text-emerald-500">{score}/{questions.length}</span>
                </div>
                <h2 className="text-[18px] font-bold text-[var(--text-primary)] mb-2">Quiz Complete!</h2>
                <p className="text-[13px] text-[var(--text-muted)] max-w-sm mb-6">
                  You correctly answered {score} out of {questions.length} questions.
                </p>
              </>
            )}
            
            {studyMode === 'flashcards' && (
              <>
                <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-5 border border-blue-500/20">
                  <Sparkles className="text-blue-500" size={28} />
                </div>
                <h2 className="text-[18px] font-bold text-[var(--text-primary)] mb-2">Review Complete!</h2>
                <p className="text-[13px] text-[var(--text-muted)] max-w-sm mb-6">
                  You reviewed all {flashcards.length} flashcards. Great job!
                </p>
              </>
            )}

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
