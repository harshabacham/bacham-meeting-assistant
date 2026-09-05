import { useEffect, useState, useCallback } from 'react';
import { useFolderStore } from '@/shared/stores/folderStore';
import { FolderDashboard as IFolderDashboard, Lecture } from '@/shared/types';
import { Button, Card, EmptyState, Loader, cn } from '@/components';
import { HardDrive, BrainCircuit, LayoutList, CheckCircle, PenTool, Sparkles, Folder as FolderIcon, Play, Plus, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TauriClient } from '@/infrastructure/tauri-client';
import { useToast } from '@/components/ui/ToastProvider';
import { FolderSettingsDialog } from './FolderSettingsDialog';
import { AddLecturesDialog } from './AddLecturesDialog';

interface Props {
    folderId: string;
    onBack?: () => void;
    onViewAll?: () => void;
}

export function FolderDashboard({ folderId, onBack, onViewAll }: Props) {
    const { showToast } = useToast();
    const { getFolderDashboard } = useFolderStore();
    const [dashboard, setDashboard] = useState<IFolderDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isAddingLectures, setIsAddingLectures] = useState(false);
    const navigate = useNavigate();

    const refreshDashboard = useCallback(() => {
        getFolderDashboard(folderId)
            .then(data => {
                setDashboard(data);
            })
            .catch(console.error);
    }, [folderId, getFolderDashboard]);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        getFolderDashboard(folderId)
            .then(data => {
                if (mounted) {
                    setDashboard(data);
                    setLoading(false);
                    setError(null);
                }
            })
            .catch(err => {
                if (mounted) {
                    setError(err.message || 'Failed to load folder dashboard');
                    setLoading(false);
                }
            });
        return () => { mounted = false; };
    }, [folderId, getFolderDashboard, isEditing]);

    if (loading) {
        return <div className="flex items-center justify-center h-full"><Loader className="w-8 h-8 text-primary" /></div>;
    }

    if (error || !dashboard) {
        return (
            <div className="p-8">
                <EmptyState icon={FolderIcon} title="Folder not found" description={error || "Could not load folder dashboard."} />
                {onBack && <Button onClick={onBack} className="mt-4">Go Back</Button>}
            </div>
        );
    }

    const { folder, recentLectures, recentNotes } = dashboard;
    const uniqueLectures = (recentLectures || []).filter((lec, idx, arr) => arr.findIndex(l => l.id === lec.id) === idx);
    const uniqueNotes = (recentNotes || []).filter((note, idx, arr) => arr.findIndex(n => n.id === note.id) === idx);

    const folderColor = folder.color || 'bg-primary/20 text-primary';

    return (
        <div className="flex flex-col h-full overflow-y-auto bg-[var(--bg)]">
            {isEditing && <FolderSettingsDialog folder={folder} onClose={() => setIsEditing(false)} />}
            
            <div className="max-w-4xl mx-auto w-full px-8 py-12">
                {/* Header Section */}
                <div className="flex items-start justify-between mb-8">
                    <div className="flex gap-5">
                        <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-border/50", folderColor, !folder.color && "bg-primary/10 text-primary")}>
                            {folder.icon ? <span>{folder.icon}</span> : <FolderIcon size={28} />}
                        </div>
                        <div>
                            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{folder.name}</h1>
                            {folder.description && (
                                <p className="text-muted-foreground mt-1.5 text-base leading-relaxed">{folder.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-3 text-xs font-medium text-muted-foreground">
                                {folder.subject && <span className="bg-surface px-2.5 py-1 rounded-md border border-border/50">{folder.subject}</span>}
                                {folder.semester && <span className="bg-surface px-2.5 py-1 rounded-md border border-border/50">{folder.semester}</span>}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            disabled={isRefreshing}
                            onClick={async () => {
                                setIsRefreshing(true);
                                try {
                                    await refreshDashboard();
                                    showToast("Folder refreshed", "success");
                                } finally {
                                    setTimeout(() => setIsRefreshing(false), 500);
                                }
                            }}
                            className="gap-1.5 px-3 py-1.5 text-xs bg-surface hover:bg-surface-hover border-border/60 font-medium cursor-pointer"
                            title="Refresh folder content"
                        >
                            <RefreshCw size={13} className={cn(isRefreshing && "animate-spin text-primary")} />
                            <span>Refresh</span>
                        </Button>
                    </div>
                </div>

                {/* Quick Actions Row */}
                <div className="flex flex-wrap items-center gap-3 mb-12 pb-8 border-b border-border/40">
                    <Button 
                        variant="outline" 
                        className="gap-2 font-medium bg-surface hover:bg-surface-hover border-border/60"
                        onClick={async () => {
                            try {
                                await TauriClient.runStudyAction("summary", { folder: folder.id });
                                showToast("Study Guide generation started in background.", 'success'); 
                            } catch(err: any) { showToast("Error: " + err.message, 'error'); }
                        }}
                    >
                        <BrainCircuit size={14} className="text-primary" /> Generate Study Guide
                    </Button>
                    <Button 
                        variant="outline" 
                        className="gap-2 font-medium bg-surface hover:bg-surface-hover border-border/60"
                        onClick={async () => {
                            try {
                                await TauriClient.runStudyAction("flashcards", { folder: folder.id });
                                showToast("Flashcards generation started in background.", 'success'); 
                            } catch(err: any) { showToast("Error: " + err.message, 'error'); }
                        }}
                    >
                        <Sparkles size={14} className="text-accent" /> Generate Flashcards
                    </Button>
                    <Button 
                        variant="outline" 
                        className="gap-2 font-medium bg-surface hover:bg-surface-hover border-border/60"
                        onClick={async () => {
                            try {
                                await TauriClient.runStudyAction("quiz", { folder: folder.id });
                                showToast("Quiz generation started in background.", 'success'); 
                            } catch(err: any) { showToast("Error: " + err.message, 'error'); }
                        }}
                    >
                        <CheckCircle size={14} className="text-destructive" /> Generate Quiz
                    </Button>
                    <div className="w-px h-6 bg-border/60 mx-1"></div>
                    <Button 
                        variant="default" 
                        className="gap-2 font-medium"
                        onClick={async () => {
                            try {
                                const { documentDir } = await import('@tauri-apps/api/path');
                                const docsDir = await documentDir();
                                const safeName = folder.name.replace(/[^a-z0-9]/gi, '_').slice(0, 60);
                                const dest = `${docsDir}\\BACHAM\\Data\\exports\\${safeName}_CramSheet.html`;
                                await TauriClient.exportFolderCramSheet(folder.id, dest);
                                showToast(`Cram Sheet Exported!\nSaved to:\n${dest}`, 'success');
                            } catch(err: any) { showToast("Export Error: " + err.message, 'error'); }
                        }}
                    >
                        <HardDrive size={14} className="text-white" /> Export Cram Sheet
                    </Button>
                </div>

                <div className="space-y-12">
                    {/* Recent Lectures / Meetings */}
                    <section>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-medium text-foreground flex items-center gap-2">
                                <Play size={18} className="text-primary/80" /> 
                                Recent Meetings
                            </h2>
                            <div className="flex items-center gap-2">
                                <Button 
                                    variant="outline" 
                                    className="gap-1.5 text-xs font-semibold px-3 py-1.5 bg-surface hover:bg-surface-hover border-border/80"
                                    onClick={() => setIsAddingLectures(true)}
                                >
                                    <Plus size={14} className="text-primary" /> Add Meetings
                                </Button>
                                {uniqueLectures.length > 0 && (
                                    <Button variant="ghost" className="text-xs px-2.5 py-1 text-muted-foreground hover:text-foreground" onClick={onViewAll}>
                                        View All
                                    </Button>
                                )}
                            </div>
                        </div>
                        
                        {uniqueLectures.length === 0 ? (
                            <div className="p-8 border border-dashed border-border/60 rounded-xl flex flex-col items-center justify-center text-center bg-surface/30">
                                <LayoutList className="mb-3 opacity-40 text-primary" size={28} />
                                <p className="text-sm font-semibold text-foreground">No meetings in this folder yet</p>
                                <p className="text-xs text-muted-foreground mt-1 mb-4 max-w-sm">
                                    Move existing meetings or recordings into this folder to organize them in one place.
                                </p>
                                <Button 
                                    className="gap-1.5 font-semibold text-xs px-3.5 py-2"
                                    onClick={() => setIsAddingLectures(true)}
                                >
                                    <Plus size={14} /> Add Meetings to Folder
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {uniqueLectures.map((lecture: Lecture) => (
                                    <div 
                                        key={lecture.id}
                                        onClick={() => navigate(`/lectures/${lecture.id}`)}
                                        className="group p-3 border border-transparent rounded-lg hover:bg-surface-hover hover:border-border/50 transition-all cursor-pointer flex items-center gap-4"
                                    >
                                        <div className="w-16 h-10 bg-surface rounded flex items-center justify-center text-muted-foreground/50 shrink-0 group-hover:text-primary/70 transition-colors">
                                            <Play size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium text-sm text-foreground truncate">{lecture.title}</h3>
                                            <p className="text-xs text-muted-foreground mt-0.5">{Math.round(lecture.durationMs / 60000)} min</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                    
                    {/* Notes Section */}
                    <section>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-medium text-foreground flex items-center gap-2">
                                <PenTool size={18} className="text-primary/80" /> 
                                Folder Notes
                            </h2>
                            <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => navigate('/notes')}>New Note</Button>
                        </div>
                        
                        {uniqueNotes.length === 0 ? (
                            <div className="p-8 border border-dashed border-border/60 rounded-xl flex flex-col items-center justify-center text-muted-foreground bg-surface/30">
                                <PenTool className="mb-3 opacity-40" size={28} />
                                <p className="text-sm">Create study plans or scratchpad notes for this folder.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {uniqueNotes.map((note: any) => (
                                    <div key={note.id} onClick={() => navigate('/notes')}>
                                        <Card className="p-4 flex flex-col hover:border-primary/40 cursor-pointer transition-colors bg-surface/50 border-border/40 shadow-sm">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="p-2 bg-primary/10 text-primary rounded-md">
                                                <PenTool size={14} />
                                            </div>
                                            <ChevronRight className="text-muted-foreground/50" size={16} />
                                        </div>
                                        <h4 className="font-medium text-sm text-foreground">{note.title || 'Untitled Note'}</h4>
                                        <p className="text-xs text-muted-foreground mt-1">Updated {new Date(note.updatedAt).toLocaleDateString()}</p>
                                    </Card>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </div>

            {isAddingLectures && (
                <AddLecturesDialog 
                    isOpen={isAddingLectures}
                    onClose={() => setIsAddingLectures(false)}
                    folderId={folder.id}
                    onSuccess={refreshDashboard}
                />
            )}
        </div>
    );
}

function ChevronRight({ className, size }: { className?: string; size?: number }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="m9 18 6-6-6-6"/>
        </svg>
    );
}
