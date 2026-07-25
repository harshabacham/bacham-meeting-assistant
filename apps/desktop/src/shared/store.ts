import { create } from 'zustand';
import type { Lecture, Settings } from './types';
import { TauriClient } from '@/infrastructure/tauri-client';

interface AppState {
  lectures: Lecture[];
  settings: Settings | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchLectures: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: Settings) => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  lectures: [],
  settings: null,
  isLoading: false,
  error: null,

  fetchLectures: async () => {
    set({ isLoading: true, error: null });
    try {
      const lectures = await TauriClient.listLectures();
      set({ lectures, isLoading: false });
    } catch (e: any) {
      set({ error: e.message || 'Failed to fetch lectures', isLoading: false });
    }
  },

  fetchSettings: async () => {
    try {
      const settings = await TauriClient.getSettings();
      set({ settings });
    } catch (e: any) {
      console.error('Failed to fetch settings', e);
    }
  },

  updateSettings: async (settings: Settings) => {
    try {
      await TauriClient.updateSettings(settings);
      set({ settings });
    } catch (e: any) {
      set({ error: e.message || 'Failed to update settings' });
    }
  },

  setSettings: (s: Settings) => set({ settings: s }),
}));
