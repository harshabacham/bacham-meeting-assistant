import { create } from 'zustand';
import { TauriClient } from '@/infrastructure/tauri-client';
import type { Settings, UpdateSettingsInput } from '@/shared/types';

interface SettingsState {
  settings: Settings | null;
  isLoading: boolean;
  
  fetchSettings: () => Promise<void>;
  updateSettings: (input: UpdateSettingsInput) => Promise<void>;
  setApiKey: (key: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {
    theme: 'dark',
    accentColor: 'lime',
    language: 'en',
    spokenLanguage: 'auto',
    storageRootPath: '',
    smartSearchEnabled: false,
    aiProvider: 'gemini',
    aiMaxRetries: 5,
    workspacePanelSizes: [20, 55, 25],
    geminiApiKeySet: false,
    speakerMapping: {},
    autoExportMarkdown: false,
    markdownExportPath: '',
    transcriptionEngine: 'gemini',
    autoStartRecording: true,
  },
  isLoading: false,

  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      const settings = await TauriClient.getSettings();
      set({ settings, isLoading: false });
    } catch (error) {
      console.error(error);
      set({ isLoading: false });
    }
  },

  updateSettings: async (input: UpdateSettingsInput) => {
    const previous = get().settings;
    if (!previous) return;
    
    // Optimistic update
    set({ settings: { ...previous, ...input } });
    try {
      await TauriClient.updateSettings(input);
    } catch (error) {
      // Rollback
      set({ settings: previous });
      console.error("Failed to update settings:", error);
      TauriClient.writeLog('ERROR', 'SettingsStore', String(error));
      throw error;
    }
  },

  setApiKey: async (key: string) => {
    try {
      await TauriClient.setApiKey(key);
      const settings = get().settings;
      if (settings) {
        set({ settings: { ...settings, geminiApiKeySet: true } });
      }
    } catch (error) {
      TauriClient.writeLog('ERROR', 'SettingsStore', String(error));
      throw error;
    }
  }
}));
