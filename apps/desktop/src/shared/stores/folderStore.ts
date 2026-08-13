import { create } from 'zustand';
import { TauriClient } from '@/infrastructure/tauri-client';
import { Folder, FolderTreeNode } from '@/shared/types';

interface FolderState {
    folders: Folder[];
    folderTree: FolderTreeNode[];
    isLoading: boolean;
    error: string | null;
    fetchFolders: () => Promise<void>;
    createFolder: (name: string, parentId?: string, color?: string, icon?: string, description?: string) => Promise<void>;
    updateFolder: (id: string, name?: string, color?: string, icon?: string, description?: string) => Promise<void>;
    moveFolder: (id: string, newParentId: string | null) => Promise<void>;
    deleteFolder: (id: string) => Promise<void>;
    lockFolder: (id: string, passcode: string) => Promise<void>;
    unlockFolder: (id: string, passcode: string) => Promise<boolean>;
    exportFolder: (id: string, dest: string, options: { includeMedia: boolean, includeStudyMaterials: boolean }) => Promise<void>;
    importFolder: (src: string) => Promise<void>;
    getFolderDashboard: (id: string) => Promise<import('@/shared/types').FolderDashboard>;
}

export const useFolderStore = create<FolderState>((set, get) => ({
    folders: [],
    folderTree: [],
    isLoading: false,
    error: null,
    
    fetchFolders: async () => {
        set({ isLoading: true, error: null });
        try {
            const [folders, folderTree] = await Promise.all([
                TauriClient.listFolders(),
                TauriClient.getFolderTree()
            ]);
            set({ folders, folderTree, isLoading: false });
        } catch (e: any) {
            set({ error: e.message || 'Failed to fetch folders', isLoading: false });
        }
    },
    
    createFolder: async (name, parentId, color, icon, description) => {
        try {
            await TauriClient.createFolder(name, parentId, color, icon, undefined, description);
            await get().fetchFolders();
        } catch (e: any) {
            set({ error: e.message });
            throw e;
        }
    },
    
    updateFolder: async (id, name, color, icon, description) => {
        try {
            await TauriClient.updateFolder(id, name, color, icon, undefined, description);
            // Ignore sortOrder for now as it's handled via reorderFolders
            await get().fetchFolders();
        } catch (e: any) {
            set({ error: e.message });
            throw e;
        }
    },
    
    moveFolder: async (id, newParentId) => {
        try {
            await TauriClient.moveFolder(id, newParentId);
            // Ignore newSortOrder for now as it's handled via reorderFolders
            await get().fetchFolders();
        } catch (e: any) {
            set({ error: e.message });
            throw e;
        }
    },
    
    deleteFolder: async (id) => {
        try {
            await TauriClient.trashFolder(id);
            await get().fetchFolders();
        } catch (e: any) {
            set({ error: e.message });
            throw e;
        }
    },

    lockFolder: async (id, passcode) => {
        try {
            await TauriClient.lockFolder(id, passcode);
            await get().fetchFolders();
        } catch (e: any) {
            set({ error: e.message });
            throw e;
        }
    },

    unlockFolder: async (id, passcode) => {
        try {
            const success = await TauriClient.unlockFolder(id, passcode);
            if (success) {
                await get().fetchFolders();
            }
            return success;
        } catch (e: any) {
            set({ error: e.message });
            throw e;
        }
    },

    exportFolder: async (id, dest, options) => {
        try {
            await TauriClient.exportFolder(id, dest, options);
        } catch (e: any) {
            set({ error: e.message });
            throw e;
        }
    },

    importFolder: async (src) => {
        try {
            await TauriClient.importFolder(src);
            await get().fetchFolders();
        } catch (e: any) {
            set({ error: e.message });
            throw e;
        }
    },
    
    getFolderDashboard: async (id) => {
        try {
            return await TauriClient.getFolderDashboard(id);
        } catch (e: any) {
            set({ error: e.message });
            throw e;
        }
    }
}));
