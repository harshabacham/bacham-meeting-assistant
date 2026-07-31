import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppMode = 'student' | 'professional';

interface ModeState {
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
}

export const useModeStore = create<ModeState>()(
  persist(
    (set) => ({
      appMode: 'professional', // Default to professional
      setAppMode: (mode) => set({ appMode: mode }),
    }),
    {
      name: 'bacham-mode-storage',
    }
  )
);
