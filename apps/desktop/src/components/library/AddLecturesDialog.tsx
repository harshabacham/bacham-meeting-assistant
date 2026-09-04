import { useState, useEffect } from 'react';
import { useLectureStore } from '@/shared/stores/lectureStore';
import { X, Search, Check } from 'lucide-react';
import { cn } from '@/components';
import { useToast } from '@/components/ui/ToastProvider';

interface AddLecturesDialogProps {
    isOpen: boolean;
    onClose: () => void;
    folderId: string;
    onSuccess?: () => void;
}

export function AddLecturesDialog({ isOpen, onClose, folderId, onSuccess }: AddLecturesDialogProps) {
    const { lectures, moveLectures } = useLectureStore();
    const [query, setQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);
    const { showToast } = useToast();

    // Filter lectures that are NOT in the current folder and not archived
    const availableLectures = lectures.filter(l => l.folderId !== folderId && !l.isArchived);

    const filtered = availableLectures.filter(l => {
        if (!query) return true;
        const q = query.toLowerCase();
        return (l.title || '').toLowerCase().includes(q) || (l.course || '').toLowerCase().includes(q) || (l.subject || '').toLowerCase().includes(q);
    });

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIds(new Set());
            useLectureStore.getState().fetchLectures();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleToggle = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleSave = async () => {
        if (selectedIds.size === 0) {
            onClose();
            return;
        }
        setIsSaving(true);
        try {
            await moveLectures(Array.from(selectedIds), folderId);
            showToast(`Added ${selectedIds.size} meeting${selectedIds.size === 1 ? '' : 's'} to folder.`, 'success');
            onSuccess?.();
            onClose();
        } catch (err: any) {
            showToast(`Error adding meetings: ${err.message || err}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[var(--glass-bg)] backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                
                <div className="flex items-center justify-between p-4 border-b border-border bg-surface/50">
                    <h2 className="text-lg font-semibold text-foreground">Add Meetings to Folder</h2>
                    <button onClick={onClose} className="p-1 rounded hover:bg-surface-hover text-muted-foreground transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-4 border-b border-border bg-surface">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            autoFocus
                            placeholder="Search meetings by title, subject, course..."
                            className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none focus:border-accent transition-colors text-foreground placeholder:text-muted-foreground shadow-inner"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                            <p className="mb-2">No available meetings found.</p>
                            {query && <p className="text-xs">Try a different search term.</p>}
                        </div>
                    ) : (
                        filtered.map(lecture => {
                            const isSelected = selectedIds.has(lecture.id);
                            return (
                                <div 
                                    key={lecture.id}
                                    onClick={() => handleToggle(lecture.id)}
                                    className={cn(
                                        "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all duration-200",
                                        isSelected 
                                            ? "border-accent bg-accent/10 shadow-[0_0_10px_rgba(166,255,0,0.1)]" 
                                            : "border-border bg-background hover:border-border-hover hover:bg-surface-hover"
                                    )}
                                >
                                    <div className="flex-1 min-w-0 pr-4">
                                        <p className="font-medium text-sm text-foreground truncate">{lecture.title}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-muted-foreground">{new Date(lecture.createdAt).toLocaleDateString()}</span>
                                            {lecture.course && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border text-muted-foreground">
                                                    {lecture.course}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "w-5 h-5 rounded-full flex items-center justify-center border transition-colors",
                                        isSelected ? "bg-accent border-accent text-background" : "border-muted-foreground/30 text-transparent"
                                    )}>
                                        <Check size={12} strokeWidth={3} />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-4 border-t border-border bg-surface/50 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                        {selectedIds.size} selected
                    </span>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-surface-hover transition-colors">
                            Cancel
                        </button>
                        <button 
                            onClick={handleSave} 
                            disabled={selectedIds.size === 0 || isSaving}
                            className="px-4 py-2 text-sm font-semibold rounded-lg bg-accent text-background hover:bg-[#b5ff33] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_15px_rgba(166,255,0,0.3)] hover:shadow-[0_0_20px_rgba(166,255,0,0.5)]"
                        >
                            {isSaving ? "Adding..." : "Add to Folder"}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
