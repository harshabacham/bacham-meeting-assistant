import { create } from 'zustand';
import { Lecture, DashboardSummary } from '../types';
import { TauriClient } from '../../infrastructure/tauri-client';

interface LectureState {
    lectures: Lecture[];
    trash: Lecture[];
    dashboardSummary: DashboardSummary | null;
    isLoading: boolean;
    error: string | null;
    
    // UI State for Library & Sidebar
    systemView: 'all' | 'trash' | 'archive';
    selectedFolderId: string | null;
    setSystemView: (view: 'all' | 'trash' | 'archive') => void;
    setSelectedFolderId: (id: string | null) => void;
    
    fetchLectures: (filterJson?: string) => Promise<void>;
    fetchDashboardSummary: () => Promise<void>;
    
    // Trash / Delete
    fetchTrash: () => Promise<void>;
    trashLectures: (ids: string[]) => Promise<void>;
    hardDeleteLectures: (ids: string[]) => Promise<void>;
    restoreLectures: (ids: string[]) => Promise<void>;
    emptyTrash: () => Promise<void>;
    
    // Organization (Optimistic Updates)
    setFavorite: (ids: string[], favorite: boolean) => Promise<void>;
    setPinned: (ids: string[], pinned: boolean) => Promise<void>;
    setArchived: (ids: string[], archived: boolean) => Promise<void>;
    moveLectures: (ids: string[], targetFolderId: string | null) => Promise<void>;
}

export const useLectureStore = create<LectureState>((set, get) => ({
    lectures: [],
    trash: [],
    dashboardSummary: null,
    isLoading: false,
    error: null,
    
    systemView: 'all',
    selectedFolderId: null,
    setSystemView: (view) => set({ systemView: view }),
    setSelectedFolderId: (id) => set({ selectedFolderId: id }),
    
    fetchLectures: async (filterJson?: string) => {
        set({ isLoading: true });
        try {
            const lectures = await TauriClient.listLectures(filterJson);
            set({ lectures, isLoading: false, error: null });
        } catch (e: any) {
            set({ error: e.toString(), isLoading: false });
        }
    },
    
    fetchDashboardSummary: async () => {
        set({ isLoading: true });
        try {
            const summary = await TauriClient.getDashboardSummary();
            set({ dashboardSummary: summary, isLoading: false, error: null });
        } catch (e: any) {
            set({ error: e.toString(), isLoading: false });
        }
    },
    
    fetchTrash: async () => {
        set({ isLoading: true });
        try {
            const trash = await TauriClient.listTrash();
            set({ trash, isLoading: false, error: null });
        } catch (e: any) {
            set({ error: e.toString(), isLoading: false });
        }
    },
    
    trashLectures: async (ids: string[]) => {
        try {
            await TauriClient.deleteLectures(ids);
            set((state) => ({
                lectures: state.lectures.filter(l => !ids.includes(l.id))
            }));
            await get().fetchTrash();
        } catch (e) {
            console.error(e);
        }
    },
    
    hardDeleteLectures: async (ids: string[]) => {
        try {
            await TauriClient.hardDeleteLectures(ids);
            set((state) => ({
                trash: state.trash.filter(l => !ids.includes(l.id))
            }));
        } catch (e) {
            console.error(e);
        }
    },
    
    restoreLectures: async (ids: string[]) => {
        try {
            await TauriClient.restoreLectures(ids);
            set((state) => ({
                trash: state.trash.filter(l => !ids.includes(l.id))
            }));
            await get().fetchLectures();
        } catch (e) {
            console.error(e);
        }
    },
    
    emptyTrash: async () => {
        try {
            await TauriClient.emptyTrash();
            set({ trash: [] });
        } catch (e) {
            console.error(e);
        }
    },
    
    setFavorite: async (ids: string[], favorite: boolean) => {
        set((state) => ({
            lectures: state.lectures.map(l => ids.includes(l.id) ? { ...l, isFavorite: favorite } : l)
        }));
        try {
            await TauriClient.setFavorite(ids, favorite);
        } catch (e) {
            console.error(e);
            await get().fetchLectures(); // Revert on failure
        }
    },
    
    setPinned: async (ids: string[], pinned: boolean) => {
        set((state) => ({
            lectures: state.lectures.map(l => ids.includes(l.id) ? { ...l, isPinned: pinned } : l)
        }));
        try {
            await TauriClient.setPinned(ids, pinned);
        } catch (e) {
            console.error(e);
            await get().fetchLectures();
        }
    },
    
    setArchived: async (ids: string[], archived: boolean) => {
        set((state) => ({
            lectures: state.lectures.map(l => ids.includes(l.id) ? { ...l, isArchived: archived } : l)
        }));
        try {
            await TauriClient.setArchived(ids, archived);
        } catch (e) {
            console.error(e);
            await get().fetchLectures();
        }
    },
    
    moveLectures: async (ids: string[], targetFolderId: string | null) => {
        set((state) => ({
            lectures: state.lectures.map(l => ids.includes(l.id) ? { ...l, folderId: targetFolderId } : l)
        }));
        try {
            await TauriClient.moveLectures(ids, targetFolderId);
            await get().fetchLectures();
        } catch (e) {
            console.error("Failed to move lectures:", e);
            await get().fetchLectures();
            throw e;
        }
    }
}));
