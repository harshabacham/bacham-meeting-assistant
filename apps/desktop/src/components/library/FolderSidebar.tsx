import { useState, useEffect } from 'react';
import { useFolderStore } from '@/shared/stores/folderStore';
import { useLectureStore } from '@/shared/stores/lectureStore';
import { useCollectionStore } from '@/shared/stores/collectionStore';
import { Folder as FolderIcon, ChevronRight, Plus, MoreVertical, Trash2, Edit2, LayoutList, Archive, Settings, Lock, Upload, Hash, BrainCircuit, Sparkles } from 'lucide-react';
import { cn, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components';
import { useToast } from '@/components/ui/ToastProvider';
import { TauriClient } from '@/infrastructure/tauri-client';
import { FolderSettingsDialog } from './FolderSettingsDialog';
import { useConfirmStore } from '@/components/ui/ConfirmProvider';

interface FolderSidebarProps {
    systemView: 'all' | 'trash' | 'archive';
    setSystemView: (view: 'all' | 'trash' | 'archive') => void;
    selectedFolderId?: string | null;
    onSelectFolder?: (id: string) => void;
}

function SystemViewDropZone({
    isActive, onClick, icon: Icon, label, onDropLectures
}: {
    view: 'all' | 'trash' | 'archive', isActive: boolean, onClick: () => void, icon: any, label: string, onDropLectures?: (ids: string[]) => void
}) {
    const [isDragOver, setIsDragOver] = useState(false);
    
    return (
        <button 
            onClick={onClick}
            onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
            onDragOver={(e) => {
                const types = Array.from(e.dataTransfer.types || []).map(t => t.toLowerCase());
                if (types.includes('application/x-lecture-ids') || types.includes('text/plain')) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'move';
                    if (!isDragOver) setIsDragOver(true);
                }
            }}
            onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOver(false);
            }}
            onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOver(false);
                let draggedLectureIds = e.dataTransfer.getData('application/x-lecture-ids');
                if (!draggedLectureIds) {
                    const textPlain = e.dataTransfer.getData('text/plain');
                    if (textPlain && textPlain.startsWith('lectures:')) {
                        draggedLectureIds = textPlain.substring('lectures:'.length);
                    }
                }
                if (draggedLectureIds && onDropLectures) {
                    try {
                        const ids = JSON.parse(draggedLectureIds) as string[];
                        onDropLectures(ids);
                    } catch (err) {}
                }
            }}
            className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all duration-200 border", 
                isActive ? "bg-accent/10 text-accent font-medium border-transparent" : "text-muted-foreground hover:bg-surface-hover hover:text-foreground border-transparent",
                isDragOver && "border-primary bg-primary/10 text-primary scale-[1.02] shadow-sm"
            )}
        >
            <Icon size={16} /> {label}
        </button>
    );
}

export function FolderSidebar({ systemView, setSystemView, selectedFolderId, onSelectFolder }: FolderSidebarProps) {
    const { showToast } = useToast();
    const { folderTree, fetchFolders, createFolder } = useFolderStore();
    const { fetchCollections } = useCollectionStore();
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');

    useEffect(() => {
        fetchFolders();
        fetchCollections();
    }, [fetchFolders, fetchCollections]);

    useEffect(() => {
        const handleCreate = () => setIsCreating(true);
        window.addEventListener('trigger-create-folder', handleCreate);
        return () => window.removeEventListener('trigger-create-folder', handleCreate);
    }, []);

    const handleCreateRoot = async () => {
        if (!newName.trim()) {
            setIsCreating(false);
            return;
        }
        try {
            await createFolder(newName.trim(), undefined, undefined);
        } catch (err: any) {
            showToast(`Create folder error: ${err.message || err}`, 'error');
            console.error(err);
        }
        setNewName('');
        setIsCreating(false);
    };


    return (
        <div className="w-[240px] bg-surface border-r border-border/50 flex flex-col h-full shrink-0">
            <div className="p-3 space-y-1 border-b border-border/50">
                <SystemViewDropZone
                    view="all"
                    isActive={systemView === 'all'}
                    onClick={() => setSystemView('all')}
                    icon={LayoutList}
                    label="All Lectures"
                    onDropLectures={async (ids) => {
                        await useLectureStore.getState().moveLectures(ids, null);
                    }}
                />
                <SystemViewDropZone
                    view="archive"
                    isActive={systemView === 'archive'}
                    onClick={() => setSystemView('archive')}
                    icon={Archive}
                    label="Archive"
                    onDropLectures={async (ids) => {
                        await useLectureStore.getState().setArchived(ids, true);
                    }}
                />
            </div>
            
            <div className="px-4 py-4 border-b border-border/50 flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Folders</span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={async () => {
                            const src = await (window as any).__TAURI__.dialog.open({
                                filters: [{ name: 'BACHAM Bundle', extensions: ['bacham'] }]
                            });
                            if (src && !Array.isArray(src)) {
                                try {
                                    await useFolderStore.getState().importFolder(src);
                                } catch (err: any) {
                                    showToast(`Import error: ${err.message}`, 'error');
                                }
                            }
                        }}
                        className="p-1 hover:bg-surface-hover rounded text-muted-foreground hover:text-foreground transition-colors"
                        title="Import Folder"
                    >
                        <Upload size={16} />
                    </button>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="p-1 hover:bg-surface-hover rounded text-muted-foreground hover:text-foreground transition-colors"
                        title="New Folder"
                    >
                        <Plus size={16} />
                    </button>
                </div>
            </div>
            
            <div 
                className="flex-1 overflow-y-auto py-2 px-2 space-y-1"
                onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const types = Array.from(e.dataTransfer.types || []).map(t => t.toLowerCase());
                    if (types.includes('application/x-folder-id') || types.includes('text/plain')) {
                        e.dataTransfer.dropEffect = 'move';
                    }
                }}
                onDrop={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    let draggedFolderId = e.dataTransfer.getData('application/x-folder-id');
                    let draggedLectureIds = e.dataTransfer.getData('application/x-lecture-ids');
                    
                    if (!draggedLectureIds && !draggedFolderId) {
                        const textPlain = e.dataTransfer.getData('text/plain');
                        if (textPlain && textPlain.startsWith('lectures:')) {
                            draggedLectureIds = textPlain.substring('lectures:'.length);
                        } else if (textPlain && textPlain.startsWith('folder:')) {
                            draggedFolderId = textPlain.substring('folder:'.length);
                        }
                    }

                    if (draggedFolderId) {
                        try {
                            const { moveFolder } = useFolderStore.getState();
                            await moveFolder(draggedFolderId, null);
                        } catch (err: any) {
                            showToast(`Root drop folder error: ${err.message || err}`, 'error');
                            console.error(err);
                        }
                    } else if (draggedLectureIds) {
                        try {
                            const ids = JSON.parse(draggedLectureIds) as string[];
                            await useLectureStore.getState().moveLectures(ids, null);
                        } catch (err: any) {
                            showToast(`Root drop lecture error: ${err.message || err}`, 'error');
                            console.error(err);
                        }
                    }
                }}
            >
                {isCreating && (
                    <div className="px-2 py-1">
                        <input 
                            autoFocus
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            onBlur={handleCreateRoot}
                            onKeyDown={e => e.key === 'Enter' && handleCreateRoot()}
                            className="input-field text-sm w-full py-1 px-2 h-7"
                            placeholder="Folder name..."
                        />
                    </div>
                )}
                
                {folderTree.map(node => (
                    <FolderNode 
                        key={node.folder.id} 
                        node={node} 
                        selectedFolderId={selectedFolderId}
                        onSelectFolder={onSelectFolder}
                    />
                ))}

            </div>
        </div>
    );
}

function FolderNode({ 
    node, 
    depth = 0,
    selectedFolderId,
    onSelectFolder 
}: { 
    node: import('@/shared/types').FolderTreeNode; 
    depth?: number;
    selectedFolderId?: string | null;
    onSelectFolder?: (id: string) => void;
}) {
    const { showToast } = useToast();
    const folder = node.folder;
    const children = node.children;
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const { moveFolder, deleteFolder, updateFolder } = useFolderStore();
    const { fetchLectures } = useLectureStore();

    // Context menu states
    const [_isMenuOpen, setIsMenuOpen] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [editName, setEditName] = useState(folder.name);

    const handleDragStart = (e: React.DragEvent) => {
        e.stopPropagation();
        e.dataTransfer.setData('application/x-folder-id', folder.id);
        e.dataTransfer.setData('text/plain', `folder:${folder.id}`);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        const types = Array.from(e.dataTransfer.types || []).map(t => t.toLowerCase());
        const hasFolder = types.includes('application/x-folder-id') || types.includes('text/plain');
        const hasLectures = types.includes('application/x-lecture-ids') || types.includes('text/plain');
        
        if (hasLectures) {
            e.dataTransfer.dropEffect = 'move';
            if (!isDragOver) setIsDragOver(true);
        } else if (hasFolder) {
            if (depth === 0) {
                e.dataTransfer.dropEffect = 'move';
                if (!isDragOver) setIsDragOver(true);
            } else {
                e.dataTransfer.dropEffect = 'none';
                setIsDragOver(false);
            }
        }
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        let draggedFolderId = e.dataTransfer.getData('application/x-folder-id');
        let draggedLectureIds = e.dataTransfer.getData('application/x-lecture-ids');
        
        if (!draggedLectureIds && !draggedFolderId) {
            const textPlain = e.dataTransfer.getData('text/plain');
            if (textPlain && textPlain.startsWith('lectures:')) {
                draggedLectureIds = textPlain.substring('lectures:'.length);
            } else if (textPlain && textPlain.startsWith('folder:')) {
                draggedFolderId = textPlain.substring('folder:'.length);
            }
        }

        if (draggedFolderId && draggedFolderId !== folder.id) {
            if (depth > 0) {
                showToast("Only one level of folder nesting is permitted.", 'error');
                return;
            }
            try {
                await moveFolder(draggedFolderId, folder.id);
                setIsExpanded(true);
            } catch (err: any) {
                showToast(`Folder move error: ${err.message || err}`, 'error');
                console.error(err);
            }
        } else if (draggedLectureIds) {
            try {
                const ids = JSON.parse(draggedLectureIds) as string[];
                await useLectureStore.getState().moveLectures(ids, folder.id);
            } catch (err: any) {
                showToast(`Lecture move error: ${err.message || err}`, 'error');
                console.error(err);
            }
        }
    };

    const handleRename = async () => {
        if (editName.trim() && editName !== folder.name) {
            await updateFolder(folder.id, editName.trim());
        }
        setIsRenaming(false);
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const ok = await useConfirmStore.getState().showConfirm(`Delete folder "${folder.name}"? Contents will move to parent.`);
        if (ok) {
            await deleteFolder(folder.id);
            fetchLectures();
        }
        setIsMenuOpen(false);
    };

    return (
        <div className="select-none">
            <div 
                draggable
                onDragStart={handleDragStart}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
                className={cn(
                    "flex items-center group py-1.5 pr-2 rounded-md transition-colors cursor-pointer text-sm",
                    isDragOver ? "bg-primary/10 border border-primary text-primary" : 
                    selectedFolderId === folder.id ? "bg-accent/10 text-accent font-medium border-transparent" : 
                    "text-muted-foreground hover:bg-surface-hover hover:text-foreground border-transparent"
                )}
                onClick={() => onSelectFolder?.(folder.id)}
            >
                <div className="w-4 h-4 flex items-center justify-center shrink-0 mr-1.5 cursor-pointer z-10" onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}>
                    {children.length > 0 && (
                        <ChevronRight size={14} className={cn("pointer-events-none transition-transform duration-200", isExpanded && "rotate-90")} />
                    )}
                </div>
                
                {folder.icon ? (
                    <span className="mr-2 shrink-0 pointer-events-none flex items-center justify-center w-4 h-4 text-sm">{folder.icon}</span>
                ) : (
                    <FolderIcon size={14} className="mr-2 opacity-70 shrink-0 pointer-events-none" style={{ color: folder.color || 'inherit' }} />
                )}
                
                {isRenaming ? (
                    <input 
                        autoFocus
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onBlur={handleRename}
                        onKeyDown={e => e.key === 'Enter' && handleRename()}
                        onClick={e => e.stopPropagation()}
                        className="bg-background border border-border px-1 py-0.5 rounded text-xs w-full z-10 relative"
                    />
                ) : (
                    <>
                        <span className="truncate flex-1 pointer-events-none">{folder.name}</span>
                        {folder.isLocked && <Lock size={12} className="text-muted-foreground mx-1 pointer-events-none" />}
                    </>
                )}

                <div className="opacity-0 group-hover:opacity-100 flex items-center ml-auto shrink-0 relative z-10" onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="p-1 hover:bg-background rounded outline-none">
                                <MoreVertical size={14} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent 
                            align="start" 
                            className="w-48 rounded-xl border border-border/50 bg-surface/95 p-1 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in-0 zoom-in-95"
                            sideOffset={5}
                        >
                            <DropdownMenuItem className="cursor-pointer font-medium text-xs py-2 text-foreground flex items-center gap-2" onClick={(e) => { e.stopPropagation(); setIsRenaming(true); }}>
                                <Edit2 size={12} /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer font-medium text-xs py-2 text-primary flex items-center gap-2" onClick={async (e) => { 
                                e.stopPropagation(); 
                                try {
                                    await TauriClient.runStudyAction("summary", { folder: folder.id });
                                    showToast("Study Guide generation started in background.", 'success'); 
                                } catch(err: any) { showToast("Error: " + err.message, 'error'); }
                            }}>
                                <BrainCircuit size={12} /> Study Guide
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer font-medium text-xs py-2 text-accent flex items-center gap-2" onClick={async (e) => { 
                                e.stopPropagation(); 
                                try {
                                    await TauriClient.runStudyAction("cheatSheet", { folder: folder.id });
                                    showToast("Cheat Sheet generation started in background.", 'success'); 
                                } catch(err: any) { showToast("Error: " + err.message, 'error'); }
                            }}>
                                <Sparkles size={12} /> Cheat Sheet
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer font-medium text-xs py-2 text-foreground flex items-center gap-2" onClick={(e) => { e.stopPropagation(); setIsSettingsOpen(true); }}>
                                <Settings size={12} /> Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer font-medium text-xs py-2 text-destructive flex items-center gap-2" onClick={handleDelete}>
                                <Trash2 size={12} /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            
            {children.length > 0 && (
                <div 
                    className={cn(
                        "overflow-hidden transition-all duration-300 ease-in-out",
                        isExpanded ? "max-h-[1000px] opacity-100 mt-0.5" : "max-h-0 opacity-0 mt-0"
                    )}
                >
                    {children.map(child => (
                        <FolderNode 
                            key={child.folder.id} 
                            node={child} 
                            depth={depth + 1}
                            selectedFolderId={selectedFolderId}
                            onSelectFolder={onSelectFolder}
                        />
                    ))}
                </div>
            )}
            
            {isSettingsOpen && (
                <FolderSettingsDialog folder={folder} onClose={() => setIsSettingsOpen(false)} />
            )}
        </div>
    );
}

export function CollectionNode({ collection, onAddLectures }: { collection: any, onAddLectures: (cId: string, lIds: string[]) => Promise<void> }) {
    const [isDragOver, setIsDragOver] = useState(false);
    const { removeCollection, fetchCollections } = useCollectionStore();
    const { showToast } = useToast();

    // Context menu states
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const types = Array.from(e.dataTransfer.types || []).map(t => t.toLowerCase());
        const hasLectures = types.includes('application/x-lecture-ids') || types.includes('text/plain');
        if (hasLectures) {
            e.dataTransfer.dropEffect = 'move';
            if (!isDragOver) setIsDragOver(true);
        } else {
            e.dataTransfer.dropEffect = 'none';
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        let draggedLectureIds = e.dataTransfer.getData('application/x-lecture-ids');
        if (!draggedLectureIds) {
            const textPlain = e.dataTransfer.getData('text/plain');
            if (textPlain && textPlain.startsWith('lectures:')) {
                draggedLectureIds = textPlain.substring('lectures:'.length);
            }
        }

        if (draggedLectureIds) {
            try {
                const ids = JSON.parse(draggedLectureIds) as string[];
                await onAddLectures(collection.id, ids);
            } catch (err: any) {
                showToast(`Add to collection error: ${err.message || err}`, 'error');
                console.error(err);
            }
        }
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const ok = await useConfirmStore.getState().showConfirm(`Delete collection "${collection.name}"? Lectures will not be deleted.`);
        if (ok) {
            await removeCollection(collection.id);
            fetchCollections();
        }
        setIsMenuOpen(false);
    };

    return (
        <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
                "flex items-center group py-1.5 px-2 ml-4 rounded-md transition-colors cursor-pointer text-sm",
                isDragOver ? "bg-primary/10 border border-primary text-primary" : "text-muted-foreground hover:bg-surface-hover hover:text-foreground border-transparent"
            )}
        >
            <Hash size={14} className="mr-2 opacity-70 shrink-0 pointer-events-none" style={{ color: collection.color || 'inherit' }} />
            
            <span className="truncate flex-1 pointer-events-none">{collection.name}</span>
            <span className="text-xs text-muted-foreground mr-2 pointer-events-none">{collection.lectureCount}</span>

            <div className="opacity-0 group-hover:opacity-100 flex items-center shrink-0 relative z-10">
                <button 
                    className="p-1 hover:bg-background rounded"
                    onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                >
                    <MoreVertical size={14} />
                </button>
                {isMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-md shadow-lg z-50 p-1 min-w-[120px]">
                        <button 
                            className="w-full text-left px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded flex items-center gap-2"
                            onClick={handleDelete}
                        >
                            <Trash2 size={12} /> Delete
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
