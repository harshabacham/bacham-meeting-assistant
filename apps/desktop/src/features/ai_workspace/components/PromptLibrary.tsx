import { useState, useEffect } from 'react';
import { TauriClient } from '@/infrastructure/tauri-client';
import { Bot, Plus, X, Trash2, Star, Save } from 'lucide-react';
import { cn } from '@/components';
import { useConfirmStore } from '@/components/ui/ConfirmProvider';

export interface SavedPrompt {
    id: string;
    name: string;
    body: string;
    category?: string;
    isFavorite: boolean;
    isBuiltin: boolean;
    createdAt: string;
    updatedAt: string;
}

interface PromptLibraryProps {
    onClose: () => void;
    onSelectPrompt: (promptBody: string) => void;
}

export function PromptLibrary({ onClose, onSelectPrompt }: PromptLibraryProps) {
    const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingPrompt, setEditingPrompt] = useState<SavedPrompt | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const { showConfirm } = useConfirmStore();
    
    // Form state
    const [formName, setFormName] = useState('');
    const [formBody, setFormBody] = useState('');
    const [formCategory, setFormCategory] = useState('');

    const loadPrompts = async () => {
        try {
            setLoading(true);
            const data = await TauriClient.listPrompts();
            setPrompts(data as any);
        } catch (e) {
            console.error('Failed to load prompts', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPrompts();
    }, []);

    const handleSave = async () => {
        if (!formName.trim() || !formBody.trim()) return;

        try {
            if (isCreating) {
                await TauriClient.createPrompt(formName, formBody, formCategory || undefined);
            } else if (editingPrompt) {
                await TauriClient.updatePrompt(editingPrompt.id, formName, formBody, formCategory || undefined);
            }
            await loadPrompts();
            setIsCreating(false);
            setEditingPrompt(null);
        } catch (e) {
            console.error('Failed to save prompt', e);
        }
    };

    const handleDelete = async (id: string) => {
        const ok = await showConfirm('Are you sure you want to delete this prompt?');
        if (!ok) return;
        try {
            await TauriClient.deletePrompt(id);
            await loadPrompts();
        } catch (e) {
            console.error('Failed to delete prompt', e);
        }
    };

    const handleToggleFavorite = async (prompt: SavedPrompt) => {
        try {
            await TauriClient.togglePromptFavorite(prompt.id, !prompt.isFavorite);
            await loadPrompts();
        } catch (e) {
            console.error('Failed to toggle favorite', e);
        }
    };

    const startEditing = (p: SavedPrompt) => {
        setEditingPrompt(p);
        setIsCreating(false);
        setFormName(p.name);
        setFormBody(p.body);
        setFormCategory(p.category || '');
    };

    const startCreating = () => {
        setIsCreating(true);
        setEditingPrompt(null);
        setFormName('');
        setFormBody('');
        setFormCategory('');
    };

    const cancelEditing = () => {
        setIsCreating(false);
        setEditingPrompt(null);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--glass-bg)] backdrop-blur-sm p-6">
            <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-2xl w-full max-w-3xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
                <div className="h-14 border-b border-[var(--border)] flex items-center justify-between px-6 bg-[var(--overlay-02)]">
                    <div className="flex items-center gap-2">
                        <Bot size={18} className="text-[var(--accent)]" />
                        <h2 className="font-semibold text-[var(--text-primary)]">Prompt Library</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-[var(--surface-highlight)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar / List */}
                    <div className="w-1/3 border-r border-[var(--border)] flex flex-col bg-[rgba(0,0,0,0.1)]">
                        <div className="p-4 border-b border-[var(--border)]">
                            <button
                                onClick={startCreating}
                                className="w-full flex items-center justify-center gap-2 py-2 bg-[var(--accent)] text-foreground rounded-lg hover:bg-[var(--accent-hover)] transition-colors text-sm font-medium"
                            >
                                <Plus size={16} />
                                New Prompt
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {loading ? (
                                <div className="p-4 text-center text-sm text-[var(--text-muted)]">Loading...</div>
                            ) : prompts.length === 0 ? (
                                <div className="p-4 text-center text-sm text-[var(--text-muted)]">No prompts saved.</div>
                            ) : (
                                prompts.map(p => (
                                    <div
                                        key={p.id}
                                        className={cn(
                                            "p-3 rounded-xl cursor-pointer group border border-transparent transition-all",
                                            (editingPrompt?.id === p.id) 
                                                ? "bg-[var(--surface-highlight)] border-[var(--border)]" 
                                                : "hover:bg-[var(--surface-highlight)]"
                                        )}
                                        onClick={() => {
                                            if (p.isBuiltin) {
                                                // Just select it
                                                onSelectPrompt(p.body);
                                                onClose();
                                            } else {
                                                startEditing(p);
                                            }
                                        }}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm text-[var(--text-primary)] truncate">{p.name}</div>
                                                <div className="text-[11px] text-[var(--text-muted)] mt-1 truncate">
                                                    {p.category || 'Uncategorized'}
                                                </div>
                                            </div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleToggleFavorite(p); }}
                                                className={cn("p-1 rounded-md transition-colors", p.isFavorite ? "text-yellow-400" : "text-[var(--text-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--text-primary)]")}
                                            >
                                                <Star size={14} fill={p.isFavorite ? "currentColor" : "none"} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Main Content / Editor */}
                    <div className="flex-1 flex flex-col bg-[var(--surface)] relative">
                        {isCreating || editingPrompt ? (
                            <div className="flex-1 flex flex-col p-6 overflow-y-auto animate-in fade-in duration-300">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-medium text-[var(--text-primary)]">
                                        {isCreating ? 'Create Prompt' : 'Edit Prompt'}
                                    </h3>
                                    {editingPrompt && !editingPrompt.isBuiltin && (
                                        <button 
                                            onClick={() => handleDelete(editingPrompt.id)}
                                            className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                            title="Delete Prompt"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Name</label>
                                        <input
                                            type="text"
                                            value={formName}
                                            onChange={e => setFormName(e.target.value)}
                                            disabled={editingPrompt?.isBuiltin}
                                            className="w-full bg-[var(--surface-highlight)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                                            placeholder="E.g., Summarize Code"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Category</label>
                                        <input
                                            type="text"
                                            value={formCategory}
                                            onChange={e => setFormCategory(e.target.value)}
                                            disabled={editingPrompt?.isBuiltin}
                                            className="w-full bg-[var(--surface-highlight)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                                            placeholder="E.g., Programming"
                                        />
                                    </div>
                                    <div className="flex-1 flex flex-col min-h-[200px]">
                                        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Prompt Body</label>
                                        <textarea
                                            value={formBody}
                                            onChange={e => setFormBody(e.target.value)}
                                            disabled={editingPrompt?.isBuiltin}
                                            className="w-full flex-1 bg-[var(--surface-highlight)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-none font-mono"
                                            placeholder="Enter your prompt template here..."
                                        />
                                    </div>
                                </div>

                                {!editingPrompt?.isBuiltin && (
                                    <div className="mt-6 flex justify-end gap-3">
                                        <button
                                            onClick={cancelEditing}
                                            className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-highlight)] transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            disabled={!formName.trim() || !formBody.trim()}
                                            className="px-4 py-2 rounded-lg bg-[var(--accent)] text-foreground text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            <Save size={16} />
                                            Save
                                        </button>
                                    </div>
                                )}
                                
                                {editingPrompt && (
                                    <div className="mt-auto pt-6 border-t border-[var(--border)]">
                                        <button
                                            onClick={() => {
                                                onSelectPrompt(editingPrompt.body);
                                                onClose();
                                            }}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--accent)]/10 text-[var(--accent)] rounded-xl hover:bg-[var(--accent)]/20 transition-colors font-medium"
                                        >
                                            Use this prompt
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)]">
                                <Bot size={48} className="opacity-20 mb-4" />
                                <p>Select a prompt to edit or create a new one.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
