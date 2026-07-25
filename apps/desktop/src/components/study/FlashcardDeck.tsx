import { useState, useCallback } from 'react';
import { Flashcard } from '@/infrastructure/tauri-client';
import { CheckCircle, XCircle, Clock, Zap } from 'lucide-react';

const RATING_CONFIG = [
    { rating: 0, label: 'Again', sublabel: '< 1 min', color: '#FF4D4D', Icon: XCircle },
    { rating: 2, label: 'Hard', sublabel: '~2 days', color: '#FFB84D', Icon: Clock },
    { rating: 3, label: 'Good', sublabel: '~6 days', color: '#4DFF91', Icon: CheckCircle },
    { rating: 5, label: 'Easy', sublabel: '~10 days', color: 'var(--accent)', Icon: Zap },
];

interface FlashcardDeckProps {
    cards: Flashcard[];
    onReview: (id: string, rating: number) => Promise<void>;
    onComplete?: () => void;
}

export function FlashcardDeck({ cards, onReview, onComplete }: FlashcardDeckProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isReviewing, setIsReviewing] = useState(false);
    const [reviewed, setReviewed] = useState<Set<string>>(new Set());

    const currentCard = cards[currentIndex];
    const progress = reviewed.size / cards.length;

    const handleFlip = useCallback(() => {
        setIsFlipped(f => !f);
    }, []);

    const handleRate = useCallback(async (rating: number) => {
        if (!currentCard || isReviewing) return;
        setIsReviewing(true);

        await onReview(currentCard.id, rating);
        setReviewed(prev => new Set([...prev, currentCard.id]));
        setIsFlipped(false);

        await new Promise(r => setTimeout(r, 120)); // brief pause for animation

        if (currentIndex < cards.length - 1) {
            setCurrentIndex(i => i + 1);
        } else {
            onComplete?.();
        }
        setIsReviewing(false);
    }, [currentCard, isReviewing, currentIndex, cards.length, onReview, onComplete]);

    if (cards.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-4 animate-fade-in">
                <div
                    className="w-16 h-16 rounded-full flex items-center justify-center bg-white/5 border border-[var(--accent)]/20 shadow-[0_0_30px_rgba(166,255,0,0.1)]"
                >
                    <Zap size={24} className="text-[var(--accent)]" />
                </div>
                <div className="text-center">
                    <h3 className="font-semibold text-white text-lg">
                        All caught up!
                    </h3>
                    <p className="text-neutral-400 text-sm mt-1">
                        No flashcards due for review right now.
                    </p>
                </div>
            </div>
        );
    }

    if (!currentCard) return null;

    return (
        <div className="flex flex-col gap-8 w-full max-w-2xl mx-auto py-8">
            {/* Progress & Badge */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-neutral-400 font-medium text-sm">{reviewed.size} / {cards.length} reviewed</span>
                    <div className="h-2 w-32 bg-white/5 rounded-full overflow-hidden border border-white/10">
                        <div
                            className="h-full bg-[var(--accent)] transition-all duration-500 rounded-full"
                            style={{ width: `${progress * 100}%` }}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-medium text-neutral-300">
                        Level {currentCard.difficulty}
                    </span>
                </div>
            </div>

            {/* Flashcard Component */}
            <div
                className="relative w-full h-[400px] perspective-1000 cursor-pointer group"
                onClick={handleFlip}
            >
                <div 
                    className={`w-full h-full transition-all duration-500 preserve-3d relative ${isFlipped ? 'rotate-y-180' : ''}`}
                >
                    {/* Front */}
                    <div className="absolute inset-0 backface-hidden bg-white/5 border border-white/10 rounded-[2rem] p-10 flex flex-col items-center justify-center text-center hover:border-white/20 transition-colors shadow-2xl">
                        <p className="text-sm font-semibold text-neutral-500 uppercase tracking-widest mb-6">Question</p>
                        <h3 className="text-2xl md:text-3xl font-medium text-white leading-relaxed">
                            {currentCard.question}
                        </h3>
                        <p className="absolute bottom-6 text-sm text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity">Click anywhere to flip</p>
                    </div>

                    {/* Back */}
                    <div className="absolute inset-0 backface-hidden rotate-y-180 bg-[var(--accent)]/5 border border-[var(--accent)]/20 rounded-[2rem] p-10 flex flex-col items-center justify-center text-center shadow-[0_0_50px_rgba(166,255,0,0.05)]">
                        <p className="text-sm font-semibold text-[var(--accent)] uppercase tracking-widest mb-6">Answer</p>
                        <p className="text-xl md:text-2xl text-white leading-relaxed">
                            {currentCard.answer}
                        </p>
                    </div>
                </div>
            </div>

            {/* Action Bar (Ratings) */}
            <div className={`transition-all duration-300 ${isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                <div className="grid grid-cols-4 gap-3">
                    {RATING_CONFIG.map(({ rating, label, sublabel, color, Icon }) => (
                        <button
                            key={rating}
                            disabled={isReviewing}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRate(rating);
                            }}
                            className="group relative flex flex-col items-center gap-2 p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ 
                                borderColor: `color-mix(in srgb, ${color} 20%, transparent)`,
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = color}
                            onMouseLeave={e => e.currentTarget.style.borderColor = `color-mix(in srgb, ${color} 20%, transparent)`}
                        >
                            <Icon size={24} style={{ color }} className="opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                            <div className="text-center">
                                <span className="block text-sm font-semibold text-white">{label}</span>
                                <span className="block text-xs text-neutral-500 mt-1">{sublabel}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
