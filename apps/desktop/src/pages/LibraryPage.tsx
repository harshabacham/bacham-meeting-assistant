import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { convertFileSrc } from '@tauri-apps/api/core';
import { TauriClient } from '@/infrastructure/tauri-client';
import { useLectureStore } from '@/shared/stores/lectureStore';
import { useFolderStore } from '@/shared/stores/folderStore';
import { useToast } from '@/components/ui/ToastProvider';
import { useConfirmStore } from '@/components/ui/ConfirmProvider';
import { MultiSelectBar } from '@/components/library/MultiSelectBar';
import { FilterPanel } from '@/components/library/FilterPanel';
import { FolderDashboard } from '@/components/library/FolderDashboard';
import { LecturePropertiesPanel } from '@/components/library/LecturePropertiesPanel';
import { KnowledgeGraphView } from '@/components/library/KnowledgeGraphView';
import { FilterQuery } from '@/infrastructure/tauri-client';
import {
    Search, Grid3X3, List, Clock, BookOpen, Tag, Bookmark,
    Trash2, Filter, Archive, GripVertical, Sparkles, MoreHorizontal, FolderPlus, Upload, Plus, ExternalLink, FolderInput, Network,
    Folder, Check, X, ChevronRight
} from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from '@/components/ui/dropdown-menu';
import { cn, Button } from '@/components';
import { AnimatePresence, motion } from 'framer-motion';
import { AddLecturesDialog } from '@/components/library/AddLecturesDialog';

type ViewMode = 'grid' | 'list' | 'graph';
type SortMode = 'recent' | 'title' | 'duration';

import { QuickLookPreview } from '@/components/QuickLookPreview';
import { Lecture } from '@/shared/types';
import { useLearningContext } from '@/shared/hooks/useLearningContext';

export function LibraryPage() {
    const { lectures, trash, fetchLectures, fetchTrash, trashLectures, restoreLectures, emptyTrash, setFavorite, setArchived, hardDeleteLectures, systemView, selectedFolderId, setSelectedFolderId, moveLectures } = useLectureStore();
    const { folders, fetchFolders } = useFolderStore();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { showToast } = useToast();
    const { showConfirm } = useConfirmStore();

    useLearningContext({
        type: 'library',
        title: 'Lecture Library',
        subtitle: `${lectures.length} Total Saved Lectures`,
    });
    const currentView = searchParams.get('view');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [sortMode, setSortMode] = useState<SortMode>('recent');
    const [query, setQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
    const [groupByCourse] = useState(false);
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [currentFilter, setCurrentFilter] = useState<FilterQuery | null>(null);
    const [showProperties, setShowProperties] = useState(false);
    const [showFolderDashboard, setShowFolderDashboard] = useState(true);
    const [quickLookLecture, setQuickLookLecture] = useState<Lecture | null>(null);
    const [isAddingToFolder, setIsAddingToFolder] = useState(false);
    const [batchMoveFolderDialogOpen, setBatchMoveFolderDialogOpen] = useState(false);

    useEffect(() => {
        fetchFolders();
    }, [fetchFolders]);

    useEffect(() => {
        setShowFolderDashboard(true);
    }, [selectedFolderId]);

    useEffect(() => { 
        if (systemView === 'all') {
            const baseFilter = currentFilter ? JSON.parse(JSON.stringify(currentFilter)) : { matchType: 'All', conditions: [] };
            
            if (!baseFilter.conditions.some((c: any) => c.field === 'isArchived')) {
                baseFilter.conditions.push({ field: 'isArchived', operator: 'is_false', value: true });
            }

            if (selectedFolderId) {
                baseFilter.conditions = baseFilter.conditions.filter((c: any) => c.field !== 'folderId');
                baseFilter.conditions.push({ field: 'folderId', operator: 'equals', value: selectedFolderId });
            }
            fetchLectures(JSON.stringify(baseFilter));
        } else if (systemView === 'trash') {
            fetchTrash();
        } else if (systemView === 'archive') {
            fetchLectures(JSON.stringify({ matchType: 'All', conditions: [{ field: 'isArchived', operator: 'is_true', value: true }] }));
        }
    }, [fetchLectures, currentFilter, systemView, selectedFolderId]);

    const sourceLectures = systemView === 'trash' ? trash : lectures;
    const filtered = sourceLectures
        .filter(l => {
            if (systemView === 'all') {
                if (l.isArchived) return false;
                if (selectedFolderId && l.folderId !== selectedFolderId) return false;
            } else if (systemView === 'archive') {
                if (!l.isArchived) return false;
            }
            
            // View filters
            if (currentView === 'bookmarks' && !l.isFavorite) return false;

            if (!query) return true;
            const q = query.toLowerCase();
            return l.title.toLowerCase().includes(q) ||
                   (l.course || '').toLowerCase().includes(q) ||
                   (l.teacher || '').toLowerCase().includes(q);
        })
        .sort((a, b) => {
            if (sortMode === 'title') return a.title.localeCompare(b.title);
            if (sortMode === 'duration') return b.durationMs - a.durationMs;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });

    const groups = groupByCourse
        ? filtered.reduce((acc, l) => {
            const course = l.course || l.subject || 'Uncategorized';
            const existing = acc.find(g => g.label === course);
            if (existing) existing.items.push(l);
            else acc.push({ label: course, items: [l] });
            return acc;
        }, [] as {label: string, items: typeof filtered}[])
        : [{ label: '', items: filtered }];

    // Sort groups alphabetically
    if (groupByCourse) {
        groups.sort((a, b) => {
            if (a.label === 'Uncategorized') return 1;
            if (b.label === 'Uncategorized') return -1;
            return a.label.localeCompare(b.label);
        });
    }

    const toggleSelect = useCallback((id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.shiftKey && lastSelectedId) {
            const currentIndex = filtered.findIndex(l => l.id === id);
            const lastIndex = filtered.findIndex(l => l.id === lastSelectedId);
            
            if (currentIndex !== -1 && lastIndex !== -1) {
                const start = Math.min(currentIndex, lastIndex);
                const end = Math.max(currentIndex, lastIndex);
                
                const idsInRange = filtered.slice(start, end + 1).map(l => l.id);
                
                setSelectedIds(prev => {
                    const next = new Set(prev);
                    idsInRange.forEach(rangeId => next.add(rangeId));
                    return next;
                });
                setLastSelectedId(id);
                return;
            }
        }

        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            if (next.size === 1) setShowProperties(true);
            return next;
        });
        setLastSelectedId(id);
    }, [filtered, lastSelectedId]);

    const handleDelete = async () => {
        const idsToDelete = [...selectedIds];
        await trashLectures(idsToDelete);
        setSelectedIds(new Set());
        showToast(`${idsToDelete.length} lectures moved to trash.`, 'info', {
            label: 'Undo',
            onClick: async () => {
                await restoreLectures(idsToDelete);
            }
        });
    };

    const handleHardDelete = async () => {
        const idsToDelete = [...selectedIds];
        if (await showConfirm(`Are you sure you want to permanently delete ${idsToDelete.length} lectures? This cannot be undone.`)) {
            await hardDeleteLectures(idsToDelete);
            setSelectedIds(new Set());
        }
    };

    const handleBatchArchive = async () => {
        const idsToArchive = [...selectedIds];
        await setArchived(idsToArchive, true);
        setSelectedIds(new Set());
    };

    const handleDeleteSingle = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await trashLectures([id]);
        showToast(`Lecture moved to trash.`, 'info', {
            label: 'Undo',
            onClick: async () => {
                await restoreLectures([id]);
            }
        });
    };

    const handleToggleFavorite = async (id: string, isFavorite: boolean, e: React.MouseEvent) => {
        e.stopPropagation();
        await setFavorite([id], !isFavorite);
    };

    const handleToggleArchive = async (id: string, isArchived: boolean, e: React.MouseEvent) => {
        e.stopPropagation();
        await setArchived([id], !isArchived);
    };

    const handleMoveToFolder = async (folderId: string | null, lectureIds: string[]) => {
        try {
            await moveLectures(lectureIds, folderId);
            setSelectedIds(new Set());
            showToast(folderId ? `Moved ${lectureIds.length} meeting${lectureIds.length === 1 ? '' : 's'} to folder.` : `Removed from folder.`, 'success');
        } catch (err: any) {
            showToast(`Failed to move: ${err.message || err}`, 'error');
        }
    };

    const isShowingDashboard = Boolean(selectedFolderId && systemView === 'all' && !query && showFolderDashboard);

    return (
        <div className="flex flex-col h-full w-full min-w-0" style={{ background: 'var(--bg)' }}>
            {/* Toolbar */}
            {!isShowingDashboard && (
            <div className="flex items-center gap-3 pl-6 pr-[140px] py-4 border-b border-border/50 shrink-0">
                <div className="flex items-center gap-2 mr-2">
                    {selectedFolderId && !showFolderDashboard && !query && (
                        <button 
                            onClick={() => setShowFolderDashboard(true)}
                            className="p-1 hover:bg-surface-hover rounded text-muted-foreground transition-colors mr-1"
                            title="Back to Dashboard"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                        </button>
                    )}
                    <h1 className="text-xl font-bold text-foreground capitalize">
                        {currentView || (systemView === 'all' ? 'Library' : systemView)}
                    </h1>
                </div>

                {/* Search */}
                <div className="flex-1 max-w-md relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        className="input-field pl-9"
                        placeholder="Search lectures, courses, teachers…"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 ml-auto">
                    {systemView === 'trash' && (
                        <button
                            onClick={async () => {
                                if (await showConfirm('Are you sure you want to permanently delete all trashed lectures?')) {
                                    await emptyTrash();
                                }
                            }}
                            className="btn btn-secondary text-destructive hover:bg-destructive/10 px-3 py-1.5"
                            title="Empty Trash"
                        >
                            <Trash2 size={14} /> Empty Trash
                        </button>
                    )}
                    
                    {/* Filter Toggle */}
                    <button
                        onClick={() => setShowFilterPanel(f => !f)}
                        className={cn('btn', showFilterPanel ? 'btn-primary' : 'btn-secondary', currentFilter && currentFilter.conditions.length > 0 ? 'text-[var(--accent)]' : '')}
                        style={{ padding: '6px 10px' }}
                        title="Smart Filters"
                    >
                        <Filter size={14} />
                    </button>
                    
                    {/* Sort */}
                    <select
                        className="input-field text-xs py-1.5 pl-3 pr-7 w-auto"
                        value={sortMode}
                        onChange={e => setSortMode(e.target.value as SortMode)}
                    >
                        <option value="recent">Recent</option>
                        <option value="title">Title</option>
                        <option value="duration">Duration</option>
                    </select>

                    {/* View mode */}
                    <div className="flex rounded-lg overflow-hidden border border-border">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn("px-3 py-1.5 transition-colors", viewMode === 'grid' ? "bg-primary/10 text-primary" : "bg-transparent text-muted-foreground")}
                        >
                            <Grid3X3 size={14} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn("px-3 py-1.5 transition-colors", viewMode === 'list' ? "bg-primary/10 text-primary" : "bg-transparent text-muted-foreground")}
                        >
                            <List size={14} />
                        </button>
                        <button
                            onClick={() => setViewMode('graph')}
                            className={cn("px-3 py-1.5 transition-colors", viewMode === 'graph' ? "bg-primary/10 text-primary" : "bg-transparent text-muted-foreground")}
                        >
                            <Network size={14} />
                        </button>
                    </div>

                    {/* Add Meetings Button when in a folder */}
                    {selectedFolderId && (
                        <Button 
                            variant="outline"
                            onClick={() => setIsAddingToFolder(true)}
                            className="font-semibold text-xs flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface-hover border-border/80 text-foreground"
                        >
                            <Plus size={14} className="text-primary" /> Add Meetings
                        </Button>
                    )}

                    {/* New Actions Overflow Menu */}
                    {systemView !== 'trash' && systemView !== 'archive' && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button className="ml-1 font-semibold text-xs flex items-center gap-1.5 px-3 py-1.5">
                                    <Plus size={14} /> New
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 z-50">
                                <DropdownMenuItem className="cursor-pointer font-medium text-foreground" onClick={async () => {
                                    const name = window.prompt("Enter new folder name:");
                                    if (name?.trim()) {
                                        try {
                                            await useFolderStore.getState().createFolder(name.trim());
                                        } catch (e: any) { showToast("Error: " + e.message, 'error'); }
                                    }
                                }}>
                                    <FolderPlus size={14} className="mr-2" /> New Folder
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer font-medium text-foreground" onClick={async () => {
                                    try {
                                        const src = await (window as any).__TAURI__.dialog.open({ filters: [{ name: 'BACHAM Bundle', extensions: ['bacham'] }] });
                                        if (src && !Array.isArray(src)) {
                                            await useFolderStore.getState().importFolder(src);
                                        }
                                    } catch (e: any) { showToast("Import error: " + e.message, 'error'); }
                                }}>
                                    <Upload size={14} className="mr-2" /> Import
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="cursor-pointer font-medium text-primary" onClick={() => {
                                    showToast("AI Organize started in background!");
                                }}>
                                    <Sparkles size={14} className="mr-2" /> AI Organize
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>
            )}

            {/* Filter Panel */}
            {!isShowingDashboard && showFilterPanel && (
                <FilterPanel 
                    currentFilter={currentFilter}
                    onChange={setCurrentFilter}
                />
            )}

            {/* Content */}
            {isShowingDashboard ? (
                <div className="flex-1 overflow-hidden relative">
                    <FolderDashboard folderId={selectedFolderId!} onBack={() => setSelectedFolderId(null)} onViewAll={() => setShowFolderDashboard(false)} />
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto min-h-0 bg-[var(--bg)] p-4 sm:p-6" onClick={() => setSelectedIds(new Set())}>
                {viewMode === 'graph' ? (
                    <KnowledgeGraphView />
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-4">
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ y: -2 }}
                            transition={{ type: "spring", stiffness: 300, damping: 22 }}
                            className="relative max-w-md w-full overflow-hidden rounded-3xl border border-border/50 bg-surface/30 p-8 text-center backdrop-blur-xl shadow-xl hover:border-primary/30 group transition-all duration-300"
                        >
                            {/* Inner radial glow on hover */}
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                            
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-surface-raised border border-border/80 text-muted-foreground/80 group-hover:text-primary group-hover:border-primary/20 group-hover:bg-primary/5 transition-all duration-300 shadow-inner mb-5">
                                    {selectedFolderId ? <Folder size={22} className="text-primary" /> : <BookOpen size={22} className="group-hover:scale-110 transition-transform duration-300" />}
                                </div>
                                <h3 className="font-bold text-foreground text-base tracking-tight mb-2">
                                    {query ? 'No results found' : 
                                     selectedFolderId ? 'No meetings in this folder yet' :
                                     ['pinned', 'collections'].includes(currentView || '') ? 'Coming Soon' : 
                                     currentView === 'bookmarks' ? 'No bookmarks yet' : 'No lectures yet'}
                                </h3>
                                <p className="text-muted-foreground text-xs leading-relaxed max-w-[280px] mx-auto mb-4">
                                    {query ? `No lectures match "${query}"` : 
                                     selectedFolderId ? 'Add existing meetings or recordings to this folder to organize them.' :
                                     ['pinned', 'collections'].includes(currentView || '') ? `The ${currentView} feature is scheduled for Phase 2.` : 
                                     currentView === 'bookmarks' ? 'Star a lecture to see it here' : 'Start recording from the Chrome extension'}
                                </p>
                                {selectedFolderId && !query && (
                                    <Button 
                                        onClick={() => setIsAddingToFolder(true)}
                                        className="gap-1.5 font-semibold text-xs mt-1 px-3.5 py-2"
                                    >
                                        <Plus size={14} /> Add Meetings to Folder
                                    </Button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                ) : (
                    groups.map(group => (
                        <div key={group.label || 'all'} className="mb-8">
                            {groupByCourse && group.label && (
                                <div className="flex items-center gap-2 mb-4">
                                    <Tag size={12} className="text-primary" />
                                    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        {group.label}
                                    </h2>
                                    <span className="text-xs text-muted-foreground">({group.items.length})</span>
                                </div>
                            )}

                            {viewMode === 'grid' ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {group.items.map(lecture => (
                                        <LectureGridCard
                                            key={lecture.id}
                                            lecture={lecture}
                                            isSelected={selectedIds.has(lecture.id)}
                                            onSelect={toggleSelect}
                                            onDelete={(e: React.MouseEvent) => handleDeleteSingle(lecture.id, e)}
                                            onToggleFavorite={(e: React.MouseEvent) => handleToggleFavorite(lecture.id, lecture.isFavorite, e)}
                                            onToggleArchive={(e: React.MouseEvent) => handleToggleArchive(lecture.id, lecture.isArchived, e)}
                                            onMoveToFolder={(folderId: string | null) => handleMoveToFolder(folderId, [lecture.id])}
                                            folders={folders}
                                            onClick={() => navigate(`/lectures/${lecture.id}`)}
                                            onDragStart={(e: React.DragEvent) => {
                                                const ids = selectedIds.has(lecture.id) ? Array.from(selectedIds) : [lecture.id];
                                                const payload = JSON.stringify(ids);
                                                e.dataTransfer.setData('application/x-lecture-ids', payload);
                                                e.dataTransfer.setData('text/plain', `lectures:${payload}`);
                                                e.dataTransfer.effectAllowed = 'move';
                                            }}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {group.items.map(lecture => (
                                        <LectureListRow
                                            key={lecture.id}
                                            lecture={lecture}
                                            isSelected={selectedIds.has(lecture.id)}
                                            onSelect={toggleSelect}
                                            onDelete={(e: React.MouseEvent) => handleDeleteSingle(lecture.id, e)}
                                            onToggleFavorite={(e: React.MouseEvent) => handleToggleFavorite(lecture.id, lecture.isFavorite, e)}
                                            onToggleArchive={(e: React.MouseEvent) => handleToggleArchive(lecture.id, lecture.isArchived, e)}
                                            onMoveToFolder={(folderId: string | null) => handleMoveToFolder(folderId, [lecture.id])}
                                            folders={folders}
                                            onClick={() => navigate(`/lectures/${lecture.id}`)}
                                            onDragStart={(e: React.DragEvent) => {
                                                const ids = selectedIds.has(lecture.id) ? Array.from(selectedIds) : [lecture.id];
                                                const payload = JSON.stringify(ids);
                                                e.dataTransfer.setData('application/x-lecture-ids', payload);
                                                e.dataTransfer.setData('text/plain', `lectures:${payload}`);
                                                e.dataTransfer.effectAllowed = 'move';
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
            )}
            {quickLookLecture && (
                <QuickLookPreview
                    lecture={quickLookLecture}
                    onClose={() => setQuickLookLecture(null)}
                />
            )}

            {/* Properties Panel */}
            <AnimatePresence>
                {showProperties && selectedIds.size === 1 && (
                    <LecturePropertiesPanel
                        lectureId={Array.from(selectedIds)[0]}
                        onClose={() => setShowProperties(false)}
                    />
                )}
            </AnimatePresence>
            
            {/* Multi-select action bar */}
            <MultiSelectBar
                selectedCount={selectedIds.size}
                onDelete={handleDelete}
                onHardDelete={handleHardDelete}
                onDuplicate={undefined}
                onMerge={undefined}
                onArchive={systemView !== 'trash' ? handleBatchArchive : undefined}
                onMoveToFolder={systemView !== 'trash' ? () => setBatchMoveFolderDialogOpen(true) : undefined}
                onRestore={systemView === 'trash' ? async () => {
                    await restoreLectures([...selectedIds]);
                    setSelectedIds(new Set());
                } : undefined}
                onClear={() => setSelectedIds(new Set())}
                mode={systemView === 'trash' ? 'trash' : 'library'}
            />

            {isAddingToFolder && selectedFolderId && (
                <AddLecturesDialog 
                    isOpen={isAddingToFolder}
                    onClose={() => setIsAddingToFolder(false)}
                    folderId={selectedFolderId}
                    onSuccess={() => {
                        fetchLectures();
                    }}
                />
            )}

            {batchMoveFolderDialogOpen && (
                <BatchMoveFolderDialog 
                    isOpen={batchMoveFolderDialogOpen}
                    onClose={() => setBatchMoveFolderDialogOpen(false)}
                    selectedCount={selectedIds.size}
                    folders={folders}
                    onSelectFolder={(folderId) => handleMoveToFolder(folderId, Array.from(selectedIds))}
                />
            )}
        </div>
    );
}

// ─── Grid Card ───────────────────────────────────────────────────────────────
const LectureGridCard = React.memo(function LectureGridCard({ lecture, isSelected, onSelect: _onSelect, onDelete, onToggleFavorite, onToggleArchive, onClick, onDragStart, onMoveToFolder, folders = [] }: any) {
    const mins = Math.round((lecture.durationMs ?? 0) / 60000);
    const dateStr = new Date(lecture.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
    });

    return (
        <div
            className={cn(
                'group relative flex flex-col text-left bg-surface hover:bg-surface-hover border rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-full',
                isSelected ? 'border-primary ring-1 ring-primary shadow-sm bg-primary/5' : 'border-border/60 hover:border-border'
            )}
            onClick={onClick}
            draggable={true}
            onDragStart={(e) => {
                if ((e.target as HTMLElement).closest('button, input, .no-drag')) {
                    e.preventDefault();
                    return;
                }
                onDragStart(e);
            }}
        >
            <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground leading-snug line-clamp-2">
                        {lecture.title || "Untitled Lecture"}
                    </p>
                </div>

                <div className="no-drag shrink-0 flex items-center gap-1">
                    {lecture.isFavorite && (
                        <Bookmark size={14} className="text-primary fill-primary" />
                    )}
                    <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-surface-raised transition-colors text-muted-foreground hover:text-foreground no-drag outline-none focus:opacity-100">
                                    <MoreHorizontal size={14} />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 no-drag z-50">
                                <DropdownMenuLabel className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Open</DropdownMenuLabel>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick(e); }} className="cursor-pointer">
                                    <ExternalLink size={14} className="mr-2 text-muted-foreground" /> Open Lecture
                                </DropdownMenuItem>
                                
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Organize</DropdownMenuLabel>
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger className="cursor-pointer">
                                        <FolderInput size={14} className="mr-2 text-muted-foreground" /> Move to Folder
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent className="max-h-60 overflow-y-auto w-52">
                                        {lecture.folderId && (
                                            <>
                                                <DropdownMenuItem 
                                                    onClick={(e) => { e.stopPropagation(); onMoveToFolder(null); }}
                                                    className="cursor-pointer text-muted-foreground hover:text-foreground"
                                                >
                                                    <X size={14} className="mr-2" /> Remove from folder (Root)
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                            </>
                                        )}
                                        {folders.length === 0 && (
                                            <DropdownMenuItem disabled>No folders</DropdownMenuItem>
                                        )}
                                        {folders.map((f: any) => {
                                            const isCurrent = lecture.folderId === f.id;
                                            return (
                                                <DropdownMenuItem 
                                                    key={f.id} 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        if (!isCurrent) onMoveToFolder(f.id); 
                                                    }}
                                                    className={cn("cursor-pointer flex items-center justify-between", isCurrent && "font-semibold text-primary")}
                                                >
                                                    <span className="flex items-center gap-1.5 truncate">
                                                        {f.icon ? <span>{f.icon}</span> : <Folder size={13} className="text-muted-foreground shrink-0" />}
                                                        <span className="truncate">{f.name}</span>
                                                    </span>
                                                    {isCurrent && <Check size={13} className="text-primary ml-2 shrink-0" />}
                                                </DropdownMenuItem>
                                            );
                                        })}
                                    </DropdownMenuSubContent>
                                </DropdownMenuSub>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleFavorite(e); }} className="cursor-pointer">
                                    <Bookmark size={14} className={cn("mr-2", lecture.isFavorite ? "fill-primary text-primary" : "text-muted-foreground")} /> {lecture.isFavorite ? "Remove Bookmark" : "Bookmark"}
                                </DropdownMenuItem>
                                
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Manage</DropdownMenuLabel>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleArchive(e); }} className="cursor-pointer">
                                    <Archive size={14} className="mr-2 text-muted-foreground" /> {lecture.isArchived ? "Unarchive" : "Archive"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(e); }} className="cursor-pointer text-destructive focus:text-destructive">
                                    <Trash2 size={14} className="mr-2" /> Move to Trash
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            <div className="mt-auto flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap pt-2">
                {mins > 0 && (
                    <span className="flex items-center gap-1">
                        <Clock size={11} aria-hidden="true" />
                        {mins}m
                    </span>
                )}
                <span>{dateStr}</span>
                {(lecture.course || lecture.subject) && (
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-surface-raised text-muted-foreground truncate max-w-[68px]">
                        {lecture.course || lecture.subject}
                    </span>
                )}
            </div>
            
            {lecture.status === 'RECORDING' && (
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 text-[10px] font-bold text-destructive">
                    <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse"/> Recording
                </div>
            )}
        </div>
    );
});

// ─── List Row ─────────────────────────────────────────────────────────────────
const LectureListRow = React.memo(function LectureListRow({ lecture, isSelected, onSelect: _onSelect, onDelete, onToggleFavorite, onToggleArchive, onClick, onDragStart, onMoveToFolder, folders = [] }: any) {
    const durationMin = Math.round(lecture.durationMs / 60000);
    const [thumbnail, setThumbnail] = useState<string | null>(null);

    useEffect(() => {
        TauriClient.getScreenshots(lecture.id).then((shots: any) => {
            if (shots && shots.length > 0) {
                setThumbnail(convertFileSrc(shots[0].filePath));
            }
        });
    }, [lecture.id]);

    return (
        <div
            className={cn('group relative flex items-center px-4 py-2.5 cursor-pointer rounded-xl transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:-translate-y-0.5', 
                isSelected ? 'bg-primary/5 ring-1 ring-primary shadow-sm' : 'bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-border/60 hover:border-border'
            )}
            onClick={onClick}
            draggable={true}
            onDragStart={(e) => {
                if ((e.target as HTMLElement).closest('button, input, .no-drag')) {
                    e.preventDefault();
                    return;
                }
                onDragStart(e);
            }}
        >
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground z-10" title="Drag to organize">
                <GripVertical size={14} />
            </div>

            <div className="flex-1 min-w-0 pr-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 border border-border/5 bg-surface-raised">
                    {thumbnail ? (
                        <img src={thumbnail} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="Thumbnail" />
                    ) : (
                        <BookOpen size={14} className="text-muted-foreground/50 transition-transform duration-500 group-hover:scale-110" />
                    )}
                </div>
                <div className="flex flex-col min-w-0">
                    <p className="font-semibold truncate text-[13px] text-foreground tracking-tight">
                        {lecture.title || "Untitled Lecture"}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                        {lecture.subject || lecture.course || "No Subject"}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-8 flex-shrink-0 text-[12px] text-muted-foreground relative font-medium">
                <div className="w-24 flex items-center gap-1">
                    {lecture.status === 'RECORDING' ? (
                        <span className="text-destructive flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse"/> Recording</span>
                    ) : (
                        <span className="text-primary flex items-center gap-1.5"><Sparkles size={12}/> Ready</span>
                    )}
                </div>

                {lecture.deletedAt ? (
                    <span className="flex items-center gap-1 text-destructive w-24 justify-end">
                        <Trash2 size={12} />
                        {Math.max(0, 30 - Math.floor((Date.now() - new Date(lecture.deletedAt).getTime()) / (1000 * 60 * 60 * 24)))}d left
                    </span>
                ) : (
                    <>
                        <span className="w-12 text-right">{durationMin > 0 ? `${durationMin}m` : '—'}</span>
                        <span className="w-20 text-right">{new Date(lecture.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </>
                )}
                
                <div className="absolute right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-10 bg-background/90 backdrop-blur-xl rounded-lg px-2 py-1.5 border border-border/50 shadow-sm no-drag">
                    <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="p-1 rounded-md transition-colors hover:bg-surface-hover text-muted-foreground hover:text-foreground no-drag focus:opacity-100" title="More Actions">
                                    <MoreHorizontal size={14} />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 no-drag z-50">
                                <DropdownMenuLabel className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Open</DropdownMenuLabel>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick(e); }} className="cursor-pointer">
                                    <ExternalLink size={14} className="mr-2 text-muted-foreground" /> Open Lecture
                                </DropdownMenuItem>
                                
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Organize</DropdownMenuLabel>
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger className="cursor-pointer">
                                        <FolderInput size={14} className="mr-2 text-muted-foreground" /> Move to Folder
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent className="max-h-60 overflow-y-auto w-52">
                                        {lecture.folderId && (
                                            <>
                                                <DropdownMenuItem 
                                                    onClick={(e) => { e.stopPropagation(); onMoveToFolder(null); }}
                                                    className="cursor-pointer text-muted-foreground hover:text-foreground"
                                                >
                                                    <X size={14} className="mr-2" /> Remove from folder (Root)
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                            </>
                                        )}
                                        {folders.length === 0 && (
                                            <DropdownMenuItem disabled>No folders</DropdownMenuItem>
                                        )}
                                        {folders.map((f: any) => {
                                            const isCurrent = lecture.folderId === f.id;
                                            return (
                                                <DropdownMenuItem 
                                                    key={f.id} 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        if (!isCurrent) onMoveToFolder(f.id); 
                                                    }}
                                                    className={cn("cursor-pointer flex items-center justify-between", isCurrent && "font-semibold text-primary")}
                                                >
                                                    <span className="flex items-center gap-1.5 truncate">
                                                        {f.icon ? <span>{f.icon}</span> : <Folder size={13} className="text-muted-foreground shrink-0" />}
                                                        <span className="truncate">{f.name}</span>
                                                    </span>
                                                    {isCurrent && <Check size={13} className="text-primary ml-2 shrink-0" />}
                                                </DropdownMenuItem>
                                            );
                                        })}
                                    </DropdownMenuSubContent>
                                </DropdownMenuSub>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleFavorite(e); }} className="cursor-pointer">
                                    <Bookmark size={14} className={cn("mr-2", lecture.isFavorite ? "fill-primary text-primary" : "text-muted-foreground")} /> {lecture.isFavorite ? "Remove Bookmark" : "Bookmark"}
                                </DropdownMenuItem>
                                
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Manage</DropdownMenuLabel>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleArchive(e); }} className="cursor-pointer">
                                    <Archive size={14} className="mr-2 text-muted-foreground" /> {lecture.isArchived ? "Unarchive" : "Archive"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(e); }} className="cursor-pointer text-destructive focus:text-destructive">
                                    <Trash2 size={14} className="mr-2" /> Move to Trash
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
        </div>
    );
});

function BatchMoveFolderDialog({
    isOpen,
    onClose,
    selectedCount,
    folders,
    onSelectFolder,
}: {
    isOpen: boolean;
    onClose: () => void;
    selectedCount: number;
    folders: any[];
    onSelectFolder: (folderId: string | null) => void;
}) {
    const [search, setSearch] = useState('');
    if (!isOpen) return null;

    const filtered = folders.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between p-4 border-b border-border bg-surface/50">
                    <div>
                        <h3 className="text-base font-semibold text-foreground">Move to Folder</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Move {selectedCount} selected meeting{selectedCount === 1 ? '' : 's'}</p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded hover:bg-surface-hover text-muted-foreground transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-3 border-b border-border">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input 
                            autoFocus
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search folders…"
                            className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    <button
                        onClick={() => { onSelectFolder(null); onClose(); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors text-left"
                    >
                        <div className="w-6 h-6 rounded-md bg-surface-raised flex items-center justify-center text-muted-foreground">
                            <X size={12} />
                        </div>
                        <span>Remove from folder (Move to Root)</span>
                    </button>

                    {filtered.length === 0 ? (
                        <div className="text-center py-8 text-xs text-muted-foreground">
                            {search ? 'No matching folders found' : 'No folders available'}
                        </div>
                    ) : (
                        filtered.map(f => (
                            <button
                                key={f.id}
                                onClick={() => { onSelectFolder(f.id); onClose(); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-surface-hover transition-colors text-left group"
                            >
                                <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                    {f.icon ? <span>{f.icon}</span> : <Folder size={12} />}
                                </div>
                                <span className="truncate flex-1">{f.name}</span>
                                <ChevronRight size={13} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        ))
                    )}
                </div>

                <div className="p-3 border-t border-border bg-surface/50 flex justify-end">
                    <Button variant="ghost" onClick={onClose} className="text-xs px-3 py-1.5">Cancel</Button>
                </div>
            </div>
        </div>
    );
}
