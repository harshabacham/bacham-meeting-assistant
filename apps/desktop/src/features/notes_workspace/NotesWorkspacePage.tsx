import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { NotesEditor } from './components/NotesEditor';
import { NotesDashboard } from './components/NotesDashboard';
import { TauriClient } from '@/infrastructure/tauri-client';
import { useLearningContext } from '@/shared/hooks/useLearningContext';
import { useLectureStore } from '@/shared/stores/lectureStore';

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
    const [localFolderId, setLocalFolderId] = useState<string | null>(null);

    const storeFolderId = useLectureStore(state => state.selectedFolderId);
    const setStoreFolderId = useLectureStore(state => state.setSelectedFolderId);

    const activeFolderId = localFolderId !== null ? localFolderId : storeFolderId;

    const handleSelectFolder = useCallback((folderId: string | null) => {
        setLocalFolderId(folderId);
        setStoreFolderId(folderId);
        setActiveNoteId(null);
    }, [setStoreFolderId]);

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
                const folderTag = n.tags?.find((t: string) => t.startsWith('folder:'));
                const folderId = folderTag ? folderTag.replace('folder:', '') : null;
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
                return {
                    id: lec.id,
                    title: lec.title || 'Untitled Meeting',
                    content: savedDraft,
                    summary: lec.summary || undefined,
                    updatedAt: new Date(lec.updatedAt || Date.now()).getTime(),
                    createdAt: new Date(lec.createdAt || Date.now()).getTime(),
                    isPinned: false,
                    tags: ['meeting', ...(lec.courseLabel ? [lec.courseLabel] : [])],
                    folderId: lec.folderId || null,
                    isMeeting: true,
                    meetingDurationMs: lec.durationMs,
                };
            });

            const combined = [...regularNotes, ...meetingNotes].sort((a, b) => b.updatedAt - a.updatedAt);
            setNotes(combined);
        }).catch(e => console.error('Failed to fetch unified workspace notes', e));
    }, []);

    useEffect(() => {
        refreshWorkspaceData();
    }, [refreshWorkspaceData]);

    useEffect(() => {
        if (queryNoteId && notes.length > 0 && activeNoteId !== queryNoteId) {
            const noteExists = notes.some(n => n.id === queryNoteId);
            if (noteExists) {
                setActiveNoteId(queryNoteId);
            }
        }
    }, [queryNoteId, notes, activeNoteId]);

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

    // Filter lectures by active folder
    const displayLectures = useMemo(() => {
        if (!activeFolderId) return lectures;
        return lectures.filter(l => l.folderId === activeFolderId);
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
                    />
                ) : (
                    <NotesDashboard
                        notes={activeFolderId ? notes.filter(n => n.folderId === activeFolderId) : notes}
                        folders={folders}
                        activeFolderId={activeFolderId}
                        onSelectFolder={handleSelectFolder}
                        lectures={displayLectures}
                        onCreateNote={handleCreateNote}
                        onSelectNote={setActiveNoteId}
                    />
                )}
            </div>
        </div>
    );
}
