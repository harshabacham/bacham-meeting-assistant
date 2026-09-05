import { useState, useEffect } from 'react';
import { TauriClient } from '@/infrastructure/tauri-client';
import { useLectureStore } from '@/shared/stores/lectureStore';
import { MultiSelectBar } from '@/components/library/MultiSelectBar';
import { Trash2, RotateCcw, BookOpen, RefreshCw } from 'lucide-react';

export function TrashPage() {
    const [trashedLectures, setTrashedLectures] = useState<any[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isEmptying, setIsEmptying] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [confirmEmpty, setConfirmEmpty] = useState(false);
    const { fetchLectures } = useLectureStore();

    const loadTrash = async () => {
        const items = await TauriClient.listTrash();
        setTrashedLectures(items);
    };

    useEffect(() => { loadTrash(); }, []);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleRestore = async () => {
        await TauriClient.restoreLectures([...selectedIds]);
        setSelectedIds(new Set());
        await loadTrash();
        fetchLectures();
    };

    const handleRestoreAll = async () => {
        const all = trashedLectures.map(l => l.id);
        await TauriClient.restoreLectures(all);
        await loadTrash();
        fetchLectures();
    };

    const handleEmptyTrash = async () => {
        if (!confirmEmpty) {
            setConfirmEmpty(true);
            setTimeout(() => setConfirmEmpty(false), 3000);
            return;
        }
        setIsEmptying(true);
        await TauriClient.emptyTrash();
        await loadTrash();
        fetchLectures();
        setIsEmptying(false);
        setConfirmEmpty(false);
        setSelectedIds(new Set());
    };

    return (
        <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'var(--border)', flexShrink: 0 }}>
                <div className="flex items-center gap-3">
                    <Trash2 size={18} style={{ color: 'var(--text-muted)' }} />
                    <div>
                        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Trash</h1>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                            {trashedLectures.length} lecture{trashedLectures.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        className="btn btn-secondary"
                        onClick={async () => {
                            setIsRefreshing(true);
                            try {
                                await loadTrash();
                            } finally {
                                setTimeout(() => setIsRefreshing(false), 500);
                            }
                        }}
                        disabled={isRefreshing}
                        style={{ fontSize: 12 }}
                        title="Refresh Trash"
                    >
                        <RefreshCw size={13} className={isRefreshing ? "animate-spin text-primary" : ""} />
                        <span>Refresh</span>
                    </button>

                    {trashedLectures.length > 0 && (
                        <>
                            <button className="btn btn-secondary" onClick={handleRestoreAll} style={{ fontSize: 12 }}>
                                <RotateCcw size={13} />
                                Restore all
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleEmptyTrash}
                                disabled={isEmptying}
                                style={{ fontSize: 12 }}
                            >
                                <Trash2 size={13} />
                                {confirmEmpty ? '⚠ Click again to confirm' : 'Empty Trash'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
                {trashedLectures.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-4">
                        <div
                            className="w-16 h-16 rounded-full flex items-center justify-center"
                            style={{ background: 'var(--overlay-04)', border: '1px solid var(--border)' }}
                        >
                            <Trash2 size={24} style={{ color: 'var(--text-muted)' }} />
                        </div>
                        <div className="text-center">
                            <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 16 }}>Trash is empty</p>
                            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                                Deleted lectures appear here before being permanently removed.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {trashedLectures.map(lecture => {
                            const daysDeleted = lecture.deletedAt
                                ? Math.floor((Date.now() - lecture.deletedAt) / (1000 * 60 * 60 * 24))
                                : 0;

                            return (
                                <div
                                    key={lecture.id}
                                    className="flex items-center gap-4 px-4 py-3 rounded-xl border cursor-pointer transition-all"
                                    style={{
                                        background: selectedIds.has(lecture.id) ? 'rgba(255,77,77,0.05)' : 'transparent',
                                        borderColor: selectedIds.has(lecture.id) ? 'rgba(255,77,77,0.3)' : 'var(--border)',
                                    }}
                                    onClick={() => toggleSelect(lecture.id)}
                                >
                                    {/* Checkbox */}
                                    <div
                                        className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                                        style={{
                                            background: selectedIds.has(lecture.id) ? 'var(--destructive)' : 'var(--overlay-06)',
                                            border: `1px solid ${selectedIds.has(lecture.id) ? 'var(--destructive)' : 'var(--border)'}`,
                                        }}
                                    >
                                        {selectedIds.has(lecture.id) && (
                                            <span style={{ fontSize: 8, color: 'white', fontWeight: 700 }}>✓</span>
                                        )}
                                    </div>

                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--overlay-04)' }}>
                                        <BookOpen size={16} style={{ color: 'var(--text-muted)' }} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate" style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                                            {lecture.title}
                                        </p>
                                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                            {lecture.course && `${lecture.course} · `}
                                            Deleted {daysDeleted === 0 ? 'today' : `${daysDeleted}d ago`}
                                        </p>
                                    </div>

                                    {/* Quick restore */}
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            await TauriClient.restoreLectures([lecture.id]);
                                            await loadTrash();
                                            fetchLectures();
                                        }}
                                        className="btn btn-secondary"
                                        style={{ fontSize: 11, padding: '5px 10px' }}
                                    >
                                        <RotateCcw size={12} />
                                        Restore
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Multi-select bar */}
            <MultiSelectBar
                selectedCount={selectedIds.size}
                onDelete={handleEmptyTrash}
                onRestore={handleRestore}
                onClear={() => setSelectedIds(new Set())}
                mode="trash"
            />
        </div>
    );
}
