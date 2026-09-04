import { useState, useEffect, useMemo } from 'react';
import { useLectureStore } from '@/shared/stores/lectureStore';
import { useFolderStore } from '@/shared/stores/folderStore';
import { X, Search, Check, Video, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/components';
import { useToast } from '@/components/ui/ToastProvider';
import { motion, AnimatePresence } from 'framer-motion';

interface AddLecturesDialogProps {
    isOpen: boolean;
    onClose: () => void;
    folderId: string;
    onSuccess?: () => void;
}

function formatDuration(ms?: number): string {
    if (!ms || ms <= 0) return '';
    const totalSecs = Math.floor(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${Math.max(1, minutes)}m`;
}

function formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
        return '';
    }
}

export function AddLecturesDialog({ isOpen, onClose, folderId, onSuccess }: AddLecturesDialogProps) {
    const { lectures, moveLectures } = useLectureStore();
    const { folders } = useFolderStore();
    const [query, setQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);
    const { showToast } = useToast();

    // Map folder id to folder name for quick lookup
    const folderMap = useMemo(() => {
        const map = new Map<string, string>();
        for (const f of folders) {
            if (f.id) map.set(f.id, f.name);
        }
        return map;
    }, [folders]);

    const targetFolderName = useMemo(() => {
        return folderMap.get(folderId) || 'Folder';
    }, [folderMap, folderId]);

    // Deduplicate and filter lectures:
    // 1. Must have valid id and not already processed (deduplicate)
    // 2. Must NOT already be in the target folder
    // 3. Must NOT be archived or deleted
    // 4. Deduplicate items that have identical titles and durations
    const availableLectures = useMemo(() => {
        const seenIds = new Set<string>();
        const seenSignatures = new Set<string>();
        const result: typeof lectures = [];

        for (const l of lectures) {
            if (!l || !l.id || seenIds.has(l.id)) continue;

            // Check if already in target folder
            const inThisFolder = l.folderId === folderId || (folderId && String(l.folderId) === String(folderId));
            if (inThisFolder) continue;

            // Exclude archived or deleted
            if (l.isArchived || l.trashedAt) continue;

            // Deduplicate items with identical title & date to prevent clutter
            const cleanTitle = (l.title || '').trim().toLowerCase();
            const signature = `${cleanTitle}_${l.durationMs || 0}`;
            if (cleanTitle && seenSignatures.has(signature)) continue;

            seenIds.add(l.id);
            if (cleanTitle) seenSignatures.add(signature);
            result.push(l);
        }

        return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [lectures, folderId]);

    const filtered = useMemo(() => {
        if (!query.trim()) return availableLectures;
        const q = query.toLowerCase().trim();
        return availableLectures.filter(l => 
            (l.title || '').toLowerCase().includes(q) || 
            (l.course || '').toLowerCase().includes(q) || 
            (l.subject || '').toLowerCase().includes(q)
        );
    }, [availableLectures, query]);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIds(new Set());
            useLectureStore.getState().fetchLectures();
            useFolderStore.getState().fetchFolders();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleToggle = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleToggleAll = () => {
        if (selectedIds.size === filtered.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filtered.map(l => l.id)));
        }
    };

    const handleSave = async () => {
        if (selectedIds.size === 0) {
            onClose();
            return;
        }
        setIsSaving(true);
        try {
            await moveLectures(Array.from(selectedIds), folderId);
            showToast(`Added ${selectedIds.size} meeting${selectedIds.size === 1 ? '' : 's'} to ${targetFolderName}.`, 'success');
            onSuccess?.();
            onClose();
        } catch (err: any) {
            showToast(`Error adding meetings: ${err.message || err}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div 
                    initial={{ scale: 0.96, opacity: 0, y: 8 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.96, opacity: 0, y: 8 }}
                    transition={{ type: "spring", duration: 0.2, bounce: 0 }}
                    className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-lg max-h-[82vh] flex flex-col overflow-hidden text-[var(--text-primary)]"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <Video size={15} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-sm font-semibold text-[var(--text-primary)] truncate">Add Meetings</h2>
                                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-muted)] truncate max-w-[150px]">
                                        {targetFolderName}
                                    </span>
                                </div>
                                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Select meetings to organize into this folder</p>
                            </div>
                        </div>
                        <button 
                            type="button"
                            onClick={onClose} 
                            className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors shrink-0"
                        >
                            <X size={15} />
                        </button>
                    </div>

                    {/* Search & Bulk Select Bar */}
                    <div className="px-5 py-2.5 border-b border-[var(--border)] bg-[var(--surface)]/50 shrink-0 flex items-center gap-2.5">
                        <div className="relative flex-1">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                            <input
                                autoFocus
                                placeholder="Search by title or topic…"
                                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl pl-8 pr-8 py-1.5 text-xs outline-none focus:border-[var(--border-accent)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors shadow-2xs"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                            />
                            {query && (
                                <button
                                    type="button"
                                    onClick={() => setQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                        {filtered.length > 0 && (
                            <button
                                type="button"
                                onClick={handleToggleAll}
                                className="text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] px-2.5 py-1.5 rounded-lg transition-colors shrink-0"
                            >
                                {allSelected ? 'Deselect all' : 'Select all'}
                            </button>
                        )}
                    </div>

                    {/* Meetings List */}
                    <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5">
                        {filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-14 text-center">
                                <div className="w-10 h-10 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] mb-2.5">
                                    <Video size={18} />
                                </div>
                                <p className="text-xs font-semibold text-[var(--text-primary)]">
                                    {query ? 'No matching meetings' : 'No available meetings'}
                                </p>
                                <p className="text-[11px] text-[var(--text-muted)] mt-1 max-w-[240px]">
                                    {query 
                                        ? 'Try a different search term.' 
                                        : 'All meetings are already organized in this folder or no recordings exist.'}
                                </p>
                            </div>
                        ) : (
                            filtered.map(lecture => {
                                const isSelected = selectedIds.has(lecture.id);
                                const durationStr = formatDuration(lecture.durationMs);
                                const dateStr = formatDate(lecture.createdAt);
                                const currentFolder = lecture.folderId ? folderMap.get(lecture.folderId) : null;

                                return (
                                    <div 
                                        key={lecture.id}
                                        onClick={() => handleToggle(lecture.id)}
                                        className={cn(
                                            "flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all group select-none",
                                            isSelected 
                                                ? "bg-[var(--surface-raised)] border-[var(--border-accent)] shadow-2xs" 
                                                : "bg-[var(--bg)] border-[var(--border)]/70 hover:border-[var(--border)] hover:bg-[var(--surface-hover)]"
                                        )}
                                    >
                                        <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                                            <div className={cn(
                                                "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors border",
                                                isSelected 
                                                    ? "bg-primary/10 border-primary/30 text-primary" 
                                                    : "bg-[var(--surface-raised)] border-[var(--border)] text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
                                            )}>
                                                <Video size={13} />
                                            </div>
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="font-medium text-xs text-[var(--text-primary)] truncate">
                                                    {lecture.title || 'Untitled Meeting'}
                                                </span>
                                                <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] mt-0.5">
                                                    {dateStr && <span>{dateStr}</span>}
                                                    {durationStr && (
                                                        <>
                                                            <span>·</span>
                                                            <span>{durationStr}</span>
                                                        </>
                                                    )}
                                                    {currentFolder && (
                                                        <>
                                                            <span>·</span>
                                                            <span className="px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[9px] text-[var(--text-secondary)] truncate max-w-[100px]">
                                                                in {currentFolder}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "w-4 h-4 rounded-md flex items-center justify-center border transition-all duration-150 shrink-0",
                                            isSelected 
                                                ? "bg-[var(--text-primary)] border-[var(--text-primary)] text-[var(--bg)] shadow-xs" 
                                                : "border-[var(--border)] bg-[var(--surface)] text-transparent group-hover:border-[var(--text-muted)]"
                                        )}>
                                            <Check size={11} strokeWidth={3} />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-3 border-t border-[var(--border)] bg-[var(--surface)] shrink-0 flex justify-between items-center">
                        <span className="text-xs text-[var(--text-muted)] font-medium">
                            {selectedIds.size > 0 ? (
                                <span><strong className="text-[var(--text-primary)] font-bold">{selectedIds.size}</strong> selected</span>
                            ) : (
                                <span>{filtered.length} available</span>
                            )}
                        </span>
                        <div className="flex items-center gap-2">
                            <button 
                                type="button"
                                onClick={onClose} 
                                className="px-3.5 py-1.5 text-xs font-medium rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                type="button"
                                onClick={handleSave} 
                                disabled={selectedIds.size === 0 || isSaving}
                                className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-[var(--text-primary)] text-[var(--bg)] hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center gap-1.5 shadow-xs"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 size={12} className="animate-spin" />
                                        <span>Adding...</span>
                                    </>
                                ) : (
                                    <>
                                        <Plus size={12} />
                                        <span>{selectedIds.size > 0 ? `Add (${selectedIds.size})` : 'Add to Folder'}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                </motion.div>
            </div>
        </AnimatePresence>
    );
}
