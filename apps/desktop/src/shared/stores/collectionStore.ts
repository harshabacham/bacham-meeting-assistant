import { create } from 'zustand';
import { CollectionWithCount, CreateCollectionInput } from '../types';
import { TauriClient } from '../../infrastructure/tauri-client';

interface CollectionState {
    collections: CollectionWithCount[];
    isLoading: boolean;
    error: string | null;
    
    fetchCollections: () => Promise<void>;
    createCollection: (input: CreateCollectionInput) => Promise<void>;
    addLecturesToCollection: (collectionId: string, lectureIds: string[]) => Promise<void>;
    removeLecturesFromCollection: (collectionId: string, lectureIds: string[]) => Promise<void>;
    removeCollection: (collectionId: string) => Promise<void>;
}

export const useCollectionStore = create<CollectionState>((set, get) => ({
    collections: [],
    isLoading: false,
    error: null,
    
    fetchCollections: async () => {
        set({ isLoading: true, error: null });
        try {
            const collections = await TauriClient.listCollections();
            set({ collections, isLoading: false });
        } catch (e: any) {
            set({ error: e.message || 'Failed to fetch collections', isLoading: false });
        }
    },
    
    createCollection: async (input) => {
        try {
            await TauriClient.createCollection(input);
            await get().fetchCollections();
        } catch (e: any) {
            set({ error: e.message || 'Failed to create collection' });
            throw e;
        }
    },
    
    addLecturesToCollection: async (collectionId, lectureIds) => {
        if (!lectureIds.length) return;
        try {
            await TauriClient.addLecturesToCollection(collectionId, lectureIds);
            await get().fetchCollections(); // Refresh counts
        } catch (e: any) {
            set({ error: e.message || 'Failed to add lectures' });
            throw e;
        }
    },
    
    removeLecturesFromCollection: async (collectionId, lectureIds) => {
        if (!lectureIds.length) return;
        try {
            await TauriClient.removeLecturesFromCollection(collectionId, lectureIds);
            await get().fetchCollections(); // Refresh counts
        } catch (e: any) {
            set({ error: e.message || 'Failed to remove lectures' });
            throw e;
        }
    },
    
    removeCollection: async (collectionId) => {
        try {
            await TauriClient.deleteCollection(collectionId);
            await get().fetchCollections();
        } catch (e: any) {
            set({ error: e.message || 'Failed to delete collection' });
            throw e;
        }
    }
}));
