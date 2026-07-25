import { useState, useEffect } from 'react';
import { TauriClient, Flashcard } from '@/infrastructure/tauri-client';
import { BrainCircuit, Loader2, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { Button, EmptyState } from '@/components';
import { motion, AnimatePresence } from 'framer-motion';

interface FlashcardsTabProps {
  lectureId: string;
  transcript: string | null;
}

export function FlashcardsTab({ lectureId, transcript }: FlashcardsTabProps) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const loadFlashcards = async () => {
    try {
      setIsLoading(true);
      const cards = await TauriClient.listFlashcards(lectureId);
      setFlashcards(cards);
    } catch (e: any) {
      setError(e.message || 'Failed to load flashcards');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFlashcards();
  }, [lectureId]);

  const handleGenerate = async () => {
    if (!transcript) {
      setError('Cannot generate flashcards without a transcript.');
      return;
    }
    try {
      setIsGenerating(true);
      setError(null);
      await TauriClient.generateFlashcards(lectureId, transcript);
      await loadFlashcards();
    } catch (e: any) {
      setError(e.message || 'Failed to generate flashcards');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(c => c + 1), 150);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(c => c - 1), 150);
    }
  };

  const handleRate = async (rating: number) => {
    try {
      await TauriClient.reviewFlashcard(flashcards[currentIndex].id, rating);
      handleNext();
    } catch (e: any) {
      console.error('Failed to rate flashcard:', e);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-muted-foreground w-8 h-8" />
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="p-8 h-full max-w-2xl mx-auto flex flex-col justify-center">
        <EmptyState
          icon={BrainCircuit}
          title="No Flashcards Yet"
          description="Generate AI-powered flashcards from your lecture transcript to test your knowledge."
        />
        {error && <p className="text-destructive text-sm mt-4 text-center">{error}</p>}
        <div className="mt-6 flex justify-center">
          <Button onClick={handleGenerate} disabled={isGenerating || !transcript} className="gap-2">
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
            {isGenerating ? 'Generating...' : 'Generate Flashcards'}
          </Button>
        </div>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];

  return (
    <div className="p-4 sm:p-8 h-full flex flex-col items-center bg-[var(--bg)]">
      <div className="w-full max-w-3xl flex items-center justify-between mb-8">
        <h2 className="text-xl font-bold font-serif">Study Mode</h2>
        <span className="text-sm text-muted-foreground font-medium">
          Card {currentIndex + 1} of {flashcards.length}
        </span>
      </div>

      <div className="flex-1 w-full max-w-3xl flex flex-col items-center justify-center relative min-h-[400px]" style={{ perspective: 1000 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex + (isFlipped ? '-back' : '-front')}
            initial={{ rotateY: isFlipped ? -90 : 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: isFlipped ? 90 : -90, opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setIsFlipped(!isFlipped)}
            className="absolute inset-0 cursor-pointer"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div className={`w-full h-full flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border ${isFlipped ? 'bg-primary/5 border-primary/20' : 'bg-surface border-border'} shadow-lg transition-colors`}>
              <span className="absolute top-6 left-6 text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                {isFlipped ? 'Answer' : 'Question'}
              </span>
              <p className="text-2xl sm:text-3xl font-medium leading-relaxed text-foreground">
                {isFlipped ? currentCard.answer : currentCard.question}
              </p>
              
              {!isFlipped && (
                <div className="absolute bottom-6 text-sm text-muted-foreground flex items-center gap-2">
                  <RotateCcw size={14} /> Click to flip
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-12 flex flex-col items-center gap-6 w-full max-w-3xl">
        <AnimatePresence>
          {isFlipped && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 w-full justify-center"
            >
              <Button variant="outline" className="border-red-500/20 text-red-500 hover:bg-red-500/10 flex-1 max-w-[140px]" onClick={(e) => { e.stopPropagation(); handleRate(1); }}>
                Hard
              </Button>
              <Button variant="outline" className="border-orange-500/20 text-orange-500 hover:bg-orange-500/10 flex-1 max-w-[140px]" onClick={(e) => { e.stopPropagation(); handleRate(2); }}>
                Good
              </Button>
              <Button variant="outline" className="border-green-500/20 text-green-500 hover:bg-green-500/10 flex-1 max-w-[140px]" onClick={(e) => { e.stopPropagation(); handleRate(3); }}>
                Easy
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" onClick={handlePrev} disabled={currentIndex === 0} className="gap-2">
            <ChevronLeft size={16} /> Previous
          </Button>
          <Button variant="ghost" onClick={handleNext} disabled={currentIndex === flashcards.length - 1} className="gap-2">
            Next <ChevronRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
