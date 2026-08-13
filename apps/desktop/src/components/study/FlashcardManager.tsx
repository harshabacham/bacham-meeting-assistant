import { useState, useEffect } from 'react';
import { TauriClient, Flashcard } from '@/infrastructure/tauri-client';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { cn } from '@/components';
import { useConfirmStore } from '@/components/ui/ConfirmProvider';

interface Props {
    lectureId: string;
    onUpdate: () => void;
}

export function FlashcardManager({ lectureId, onUpdate }: Props) {
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showConfirm } = useConfirmStore();
    
    // Editing state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editQ, setEditQ] = useState('');
    const [editA, setEditA] = useState('');
    
    // Creating state
    const [isCreating, setIsCreating] = useState(false);
    const [newQ, setNewQ] = useState('');
    const [newA, setNewA] = useState('');
    const [newDiff, setNewDiff] = useState('medium');

    const loadCards = async () => {
        setIsLoading(true);
        const cards = await TauriClient.listFlashcards(lectureId);
        setFlashcards(cards);
        setIsLoading(false);
    };

    useEffect(() => {
        loadCards();
    }, [lectureId]);

    const handleCreate = async () => {
        if (!newQ.trim() || !newA.trim()) return;
        await TauriClient.createFlashcard(lectureId, newQ, newA, newDiff);
        setIsCreating(false);
        setNewQ('');
        setNewA('');
        await loadCards();
        onUpdate();
    };

    const handleUpdate = async (id: string) => {
        if (!editQ.trim() || !editA.trim()) return;
        await TauriClient.updateFlashcard(id, editQ, editA);
        setEditingId(null);
        await loadCards();
        onUpdate();
    };

    const handleDelete = async (id: string) => {
        const ok = await showConfirm('Are you sure you want to delete this flashcard?');
        if (!ok) return;
        await TauriClient.deleteFlashcard(id);
        await loadCards();
        onUpdate();
    };

    const startEdit = (card: Flashcard) => {
        setEditingId(card.id);
        setEditQ(card.question);
        setEditA(card.answer);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-32">
                <div className="shimmer w-8 h-8 rounded-full" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    Deck Manager ({flashcards.length})
                </h3>
                <button
                    className="btn btn-primary"
                    style={{ padding: '6px 12px', fontSize: 12 }}
                    onClick={() => setIsCreating(true)}
                    disabled={isCreating}
                >
                    <Plus size={14} /> Add Card
                </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pb-6">
                {isCreating && (
                    <div className="card p-4 lime-glow">
                        <input
                            className="input-field mb-2"
                            placeholder="Question"
                            value={newQ}
                            onChange={e => setNewQ(e.target.value)}
                            autoFocus
                        />
                        <textarea
                            className="input-field mb-3 min-h-[80px]"
                            placeholder="Answer"
                            value={newA}
                            onChange={e => setNewA(e.target.value)}
                        />
                        <div className="flex justify-between items-center">
                            <select 
                                className="input-field w-auto py-1.5 text-xs bg-transparent border-[var(--border)] text-[var(--text-primary)] rounded" 
                                value={newDiff} 
                                onChange={e => setNewDiff(e.target.value)}
                            >
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                            </select>
                            <div className="flex gap-2">
                                <button className="btn btn-ghost text-xs py-1.5" onClick={() => setIsCreating(false)}>
                                    Cancel
                                </button>
                                <button className="btn btn-primary text-xs py-1.5" onClick={handleCreate}>
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {flashcards.map(card => (
                    <div key={card.id} className="card p-4 transition-colors hover:border-[var(--border-accent)]">
                        {editingId === card.id ? (
                            <>
                                <input
                                    className="input-field mb-2 text-sm"
                                    value={editQ}
                                    onChange={e => setEditQ(e.target.value)}
                                />
                                <textarea
                                    className="input-field mb-3 min-h-[80px] text-sm"
                                    value={editA}
                                    onChange={e => setEditA(e.target.value)}
                                />
                                <div className="flex justify-end gap-2">
                                    <button className="btn btn-ghost text-xs py-1" onClick={() => setEditingId(null)}>
                                        <X size={14} />
                                    </button>
                                    <button className="btn btn-primary text-xs py-1" onClick={() => handleUpdate(card.id)}>
                                        <Save size={14} /> Save
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex justify-between items-start mb-2 gap-4">
                                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                                        {card.question}
                                    </p>
                                    <div className="flex gap-1 flex-shrink-0">
                                        <button className="p-1.5 rounded hover:bg-[var(--overlay-10)] text-[var(--text-secondary)] transition-colors" onClick={() => startEdit(card)}>
                                            <Edit2 size={14} />
                                        </button>
                                        <button className="p-1.5 rounded hover:bg-[rgba(255,77,77,0.15)] text-[var(--destructive)] transition-colors" onClick={() => handleDelete(card.id)}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                                    {card.answer}
                                </p>
                                <div className="mt-3 flex items-center gap-2">
                                    <span className={cn(
                                        'px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider',
                                        card.difficulty === 'easy' ? 'bg-success-dim text-success' :
                                        card.difficulty === 'hard' ? 'bg-destructive/10 text-destructive' :
                                        'bg-[var(--accent-dim)] text-[var(--accent)]'
                                    )}>
                                        {card.difficulty}
                                    </span>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                        Ease: {card.easeFactor.toFixed(1)} • Interval: {card.intervalDays}d
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                ))}

                {flashcards.length === 0 && !isCreating && (
                    <div className="text-center py-8">
                        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No flashcards in this deck yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
