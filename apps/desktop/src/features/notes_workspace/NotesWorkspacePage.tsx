import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { NotesEditor } from './components/NotesEditor';
import { NotesDashboard } from './components/NotesDashboard';
import { TauriClient } from '@/infrastructure/tauri-client';
import { useLearningContext } from '@/shared/hooks/useLearningContext';
import { useLectureStore } from '@/shared/stores/lectureStore';
import { useToast } from '@/components/ui/ToastProvider';

export interface Note {
    id: string;
    title: string;
    content: string; // HTML from TipTap
    summary?: string; // AI Generated Summary
    transcript?: string; // Verbatim raw transcript
    updatedAt: number;
    createdAt: number;
    isPinned: boolean;
    tags: string[];
    folderId?: string | null;
    eventTime?: string;
    eventDate?: string;
    isMeeting?: boolean;
    meetingDurationMs?: number;
    videoPath?: string;
}

export function NotesWorkspacePage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const eventTitle = searchParams.get('eventTitle');
    const eventTime = searchParams.get('eventTime');
    const eventDate = searchParams.get('eventDate');
    const eventFolderId = searchParams.get('folderId');
    const queryNoteId = searchParams.get('noteId');


    const [notes, setNotes] = useState<Note[]>([]);
    const [folders, setFolders] = useState<any[]>([]);
    const [lectures, setLectures] = useState<any[]>([]);
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
    const paramFolderId = searchParams.get('folderId');
    const storeFolderId = useLectureStore(state => state.selectedFolderId);
    const setStoreFolderId = useLectureStore(state => state.setSelectedFolderId);

    // URL parameter folderId is the single source of truth for active folder in Notes workspace
    const activeFolderId = paramFolderId || null;

    useEffect(() => {
        if (paramFolderId) {
            if (paramFolderId !== storeFolderId) {
                setStoreFolderId(paramFolderId);
            }
        } else {
            // Main notes page (no folderId in URL): clear storeFolderId
            if (storeFolderId !== null) {
                setStoreFolderId(null);
            }
        }
    }, [paramFolderId, storeFolderId, setStoreFolderId]);

    const handleSelectFolder = useCallback((folderId: string | null) => {
        setStoreFolderId(folderId);
        setActiveNoteId(null);
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (folderId) next.set('folderId', folderId);
            else next.delete('folderId');
            return next;
        }, { replace: true });
    }, [setStoreFolderId, setSearchParams]);

    const notesRef = useRef<Note[]>(notes);
    useEffect(() => { notesRef.current = notes; }, [notes]);

    const updateTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    const activeNote = notes.find(n => n.id === activeNoteId) || null;
    const activeFolder = folders.find(f => f.id === activeFolderId) || null;

    useLearningContext({
        type: 'notes',
        title: activeNote?.title || 'Notes Workspace',
        noteId: activeNoteId || undefined,
        subtitle: activeNote ? `Editing: ${activeNote.title}` : (activeFolder ? `Folder: ${activeFolder.name}` : 'Notes'),
    });

    // ── Fetch workspace data ──────────────────────────────────────────────────────────
    const refreshWorkspaceData = useCallback(() => {
        return Promise.all([
            TauriClient.getWorkspaceNotes().catch(() => []),
            TauriClient.listFolders().catch(() => []),
            TauriClient.listLectures().catch(() => []),
        ]).then(([fetchedNotes, fetchedFolders, fetchedLectures]) => {
            setFolders(fetchedFolders || []);
            setLectures(fetchedLectures || []);

            const regularNotes: Note[] = (fetchedNotes || []).map((n: any) => {
                const folderTag = n.tags?.find((t: string) => typeof t === 'string' && t.startsWith('folder:'));
                const folderId = n.folderId || (n as any).folder_id || (folderTag ? folderTag.replace('folder:', '') : null);
                const savedSummary = localStorage.getItem(`summary_${n.id}`) || n.summary || undefined;
                const savedTranscript = localStorage.getItem(`transcript_${n.id}`) || n.transcript || undefined;
                return {
                    ...n,
                    folderId,
                    summary: savedSummary,
                    transcript: savedTranscript,
                    isMeeting: false,
                };
            });

            // Convert lectures to Meeting Notes so they connect seamlessly across the app
            const meetingNotes: Note[] = (fetchedLectures || []).map((lec: any) => {
                const savedDraft = localStorage.getItem(`user_notes_draft_${lec.id}`) || '';
                const lecFolderId = lec.folderId || (lec as any).folder_id || null;
                return {
                    id: lec.id,
                    title: lec.title || 'Untitled Meeting',
                    content: savedDraft,
                    summary: lec.summary || undefined,
                    updatedAt: new Date(lec.updatedAt || Date.now()).getTime(),
                    createdAt: new Date(lec.createdAt || Date.now()).getTime(),
                    isPinned: false,
                    tags: ['meeting', ...(lec.courseLabel ? [lec.courseLabel] : [])],
                    folderId: lecFolderId,
                    isMeeting: true,
                    meetingDurationMs: lec.durationMs,
                    transcript: lec.transcript || undefined,
                    videoPath: lec.videoPath || undefined,
                };
            });

            const combined = [...regularNotes, ...meetingNotes].sort((a, b) => b.updatedAt - a.updatedAt);
            const seenIds = new Set<string>();
            const uniqueNotes: Note[] = [];
            for (const n of combined) {
                if (!n || !n.id || seenIds.has(n.id)) continue;
                seenIds.add(n.id);
                uniqueNotes.push(n);
            }
            setNotes(uniqueNotes);
        }).catch(e => console.error('Failed to fetch unified workspace notes', e));
    }, []);

    const { showToast } = useToast();

    const handleManualRefresh = useCallback(async () => {
        try {
            await refreshWorkspaceData();
            showToast('Notes & workspace refreshed', 'success');
        } catch (err: any) {
            showToast(`Refresh failed: ${err?.message || err}`, 'error');
        }
    }, [refreshWorkspaceData, showToast]);

    useEffect(() => {
        refreshWorkspaceData();
    }, [refreshWorkspaceData]);

    useEffect(() => {
        if (queryNoteId) {
            if (notes.length > 0) {
                const note = notes.find(n => 
                    String(n.id) === String(queryNoteId) || 
                    String(n.id).toLowerCase() === String(queryNoteId).toLowerCase()
                );
                if (note) {
                    if (activeNoteId !== note.id) {
                        setActiveNoteId(note.id);
                    }
                } else {
                    refreshWorkspaceData();
                }
            }
        } else {
            // When queryNoteId is cleared/absent in URL, clear activeNoteId so dashboard or folder view shows
            if (activeNoteId !== null) {
                setActiveNoteId(null);
            }
        }
    }, [queryNoteId, notes, activeNoteId, refreshWorkspaceData]);

    // Open or create calendar event note if query params are present
    const createdEventRef = useRef<string | null>(null);
    useEffect(() => {
        if (!eventTitle || createdEventRef.current === eventTitle) return;
        createdEventRef.current = eventTitle;

        const cleanTitle = eventTitle.endsWith('📅') ? eventTitle : `${eventTitle} 📅`;
        const targetFolder = eventFolderId || activeFolderId || null;
        const initialTags = targetFolder ? [`folder:${targetFolder}`] : [];

        const existing = notes.find(n => n.title.toLowerCase().includes(eventTitle.toLowerCase()));
        
        if (existing) {
            if (targetFolder && existing.folderId !== targetFolder) {
                const updatedTags = [...existing.tags.filter(t => !t.startsWith('folder:')), `folder:${targetFolder}`];
                TauriClient.updateWorkspaceNote(existing.id, undefined, undefined, undefined, updatedTags).catch(() => {});
                setNotes(prev => prev.map(n => n.id === existing.id ? { ...n, folderId: targetFolder, tags: updatedTags } : n));
            }
            setActiveNoteId(existing.id);
        } else {
            TauriClient.createWorkspaceNote(cleanTitle, '')
                .then(async newNote => {
                    if (initialTags.length > 0) {
                        await TauriClient.updateWorkspaceNote(newNote.id, undefined, undefined, undefined, initialTags).catch(() => {});
                    }
                    const noteObj: Note = {
                        ...newNote,
                        title: cleanTitle,
                        content: '',
                        eventTime: eventTime || '12:00 PM',
                        eventDate: eventDate || 'Friday',
                        tags: initialTags,
                        folderId: targetFolder,
                    };
                    setNotes(prev => [noteObj, ...prev]);
                    setActiveNoteId(newNote.id);
                })
                .catch(console.error);
        }
    }, [eventTitle, eventTime, eventDate, eventFolderId, activeFolderId, notes]);

    // Filter notes and lectures by active folder
    const displayNotes = useMemo(() => {
        if (!activeFolderId) return notes;
        return notes.filter(n => {
            if (n.folderId === activeFolderId) return true;
            if (n.tags && n.tags.some((t: string) => typeof t === 'string' && (t === `folder:${activeFolderId}` || t.toLowerCase() === `folder:${activeFolderId.toLowerCase()}`))) return true;
            return false;
        });
    }, [notes, activeFolderId]);

    const displayLectures = useMemo(() => {
        if (!activeFolderId) return lectures;
        return lectures.filter(l => (l.folderId || (l as any).folder_id) === activeFolderId);
    }, [lectures, activeFolderId]);

    // ── CRUD handlers ────────────────────────────────────────────────────────
    const handleUpdateNote = useCallback((id: string, patch: Partial<Note>) => {
        setNotes(prev => prev.map(n => {
            if (n.id !== id) return n;
            
            let updatedTags = patch.tags ?? n.tags;
            let updatedFolderId = patch.folderId !== undefined ? patch.folderId : n.folderId;

            // Handle folder tag encoding
            if (patch.folderId !== undefined) {
                const cleanTags = updatedTags.filter((t: string) => !t.startsWith('folder:'));
                if (patch.folderId) {
                    updatedTags = [...cleanTags, `folder:${patch.folderId}`];
                } else {
                    updatedTags = cleanTags;
                }
            }

            return {
                ...n,
                ...patch,
                tags: updatedTags,
                folderId: updatedFolderId,
                updatedAt: Date.now(),
            };
        }));

        // Debounce database write
        const existingTimer = updateTimers.current.get(id);
        if (existingTimer) clearTimeout(existingTimer);

        const timer = setTimeout(async () => {
            try {
                const currentNote = notesRef.current.find((n: Note) => n.id === id);
                if (currentNote) {
                    if (currentNote.isMeeting) {
                        await TauriClient.updateNotes(id, currentNote.content);
                        localStorage.setItem(`user_notes_draft_${id}`, currentNote.content);
                        if (patch.title) {
                            await TauriClient.updateLecture({ id, title: currentNote.title });
                        }
                        if (patch.folderId !== undefined) {
                            await TauriClient.moveLectures([id], patch.folderId);
                            useLectureStore.getState().fetchLectures();
                        }
                    } else {
                        await TauriClient.updateWorkspaceNote(
                            id, 
                            currentNote.title, 
                            currentNote.content, 
                            currentNote.isPinned, 
                            currentNote.tags
                        );
                    }
                }
            } catch (e) {
                console.error('Failed to update note in database', e);
            } finally {
                updateTimers.current.delete(id);
            }
        }, 400);

        updateTimers.current.set(id, timer);
    }, []);

    const handleCreateNote = useCallback(async () => {
        try {
            const initialTags = activeFolderId ? [`folder:${activeFolderId}`] : [];
            const newNote = await TauriClient.createWorkspaceNote('Untitled Note', '');
            if (initialTags.length > 0) {
                await TauriClient.updateWorkspaceNote(newNote.id, undefined, undefined, undefined, initialTags);
            }
            const noteObj: Note = {
                ...newNote,
                tags: initialTags,
                folderId: activeFolderId,
            };
            setNotes(prev => [noteObj, ...prev]);
            setActiveNoteId(newNote.id);
        } catch (e) {
            console.error('Failed to create note', e);
        }
    }, [activeFolderId]);

    const handleDeleteNote = useCallback((id: string) => {
        handleUpdateNote(id, { tags: [...(notes.find(n => n.id === id)?.tags || []), 'system:trash'] });
        if (activeNoteId === id) setActiveNoteId(null);
    }, [activeNoteId, notes, handleUpdateNote]);

    const handleHardDeleteNote = useCallback(async (id: string) => {
        try {
            await TauriClient.deleteWorkspaceNote(id);
            setNotes(prev => prev.filter(n => n.id !== id));
            if (activeNoteId === id) setActiveNoteId(null);
        } catch (e) {
            console.error('Failed to hard delete note', e);
        }
    }, [activeNoteId]);

    const handleRestoreNote = useCallback((id: string) => {
        const note = notes.find(n => n.id === id);
        if (note) {
            handleUpdateNote(id, { tags: note.tags.filter(t => t !== 'system:trash') });
        }
    }, [notes, handleUpdateNote]);

    const handleDeleteLecture = useCallback(async (id: string) => {
        try {
            await TauriClient.deleteLectures([id]);
            // Refresh workspace data to hide deleted lecture from dashboard if it was there
            refreshWorkspaceData();
        } catch (e) {
            console.error('Failed to trash lecture', e);
        }
    }, [refreshWorkspaceData]);

    const handleRestoreLecture = useCallback(async (id: string) => {
        try {
            await TauriClient.restoreLectures([id]);
            refreshWorkspaceData();
        } catch (e) {
            console.error('Failed to restore lecture', e);
        }
    }, [refreshWorkspaceData]);

    const handleHardDeleteLecture = useCallback(async (id: string) => {
        try {
            await TauriClient.hardDeleteLectures([id]);
            refreshWorkspaceData();
        } catch (e) {
            console.error('Failed to hard delete lecture', e);
        }
    }, [refreshWorkspaceData]);

    const handleDeleteVideo = useCallback(async (id: string) => {
        try {
            await TauriClient.deleteVideoAsset(id);
            refreshWorkspaceData();
        } catch (e) {
            console.error('Failed to delete video', e);
        }
    }, [refreshWorkspaceData]);

    const activeNoteFolderName = activeNote?.folderId 
        ? folders.find(f => f.id === activeNote.folderId)?.name || 'Folder'
        : (activeFolder?.name || 'All Notes');

    return (
        <div className="flex h-full w-full bg-[var(--bg)] overflow-hidden text-[var(--text-primary)]">
            <div className="flex-1 flex flex-col min-w-0 h-full relative">
                {activeNote ? (
                    <NotesEditor
                        key={activeNote.id}
                        note={activeNote}
                        folders={folders}
                        folderName={activeNoteFolderName}
                        onBack={() => {
                            setActiveNoteId(null);
                            setSearchParams(new URLSearchParams());
                            refreshWorkspaceData();
                        }}
                        onUpdate={(patch) => handleUpdateNote(activeNote.id, patch)}
                        onDelete={() => {
                            if (activeNote.isMeeting) {
                                handleDeleteLecture(activeNote.id);
                            } else {
                                handleDeleteNote(activeNote.id);
                            }
                            setActiveNoteId(null);
                            setSearchParams(new URLSearchParams());
                        }}
                        onDeleteVideo={() => {
                            handleDeleteVideo(activeNote.id);
                        }}
                    />
                ) : (
                    <NotesDashboard
                        notes={displayNotes}
                        folders={folders}
                        activeFolderId={activeFolderId}
                        onSelectFolder={handleSelectFolder}
                        lectures={displayLectures}
                        onCreateNote={handleCreateNote}
                        onSelectNote={setActiveNoteId}
                        onUpdateNote={handleUpdateNote}
                        onDeleteNote={handleDeleteNote}
                        onHardDeleteNote={handleHardDeleteNote}
                        onRestoreNote={handleRestoreNote}
                        onDeleteLecture={handleDeleteLecture}
                        onRestoreLecture={handleRestoreLecture}
                        onHardDeleteLecture={handleHardDeleteLecture}
                        onRefreshWorkspace={handleManualRefresh}
                    />
                )}
            </div>
        </div>
    );
}
