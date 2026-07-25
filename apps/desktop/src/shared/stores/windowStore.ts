import { create } from 'zustand';
import { TauriClient } from '@/infrastructure/tauri-client';

interface WindowState {
  isMaximized: boolean;
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
}

export const useWindowStore = create<WindowState>((set) => ({
  isMaximized: false,
  
  minimize: async () => {
    await TauriClient.minimize();
  },
  maximize: async () => {
    await TauriClient.maximize();
    set((state) => ({ isMaximized: !state.isMaximized }));
  },
  close: async () => {
    await TauriClient.close();
  }
}));
