import { create } from 'zustand';
import { TauriClient } from '@/infrastructure/tauri-client';
import type { DbHealth, ConnectionStatus } from '@/shared/types';

interface AppState {
  dbHealth: DbHealth | null;
  nativeStatus: ConnectionStatus;
  isReady: boolean;
  
  activeMeetingId: string | null;
  isMeetingSidebarOpen: boolean;
  
  initialize: () => Promise<void>;
  checkNativeStatus: () => Promise<void>;
  setActiveMeetingId: (id: string | null) => void;
  setMeetingSidebarOpen: (isOpen: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  dbHealth: null,
  nativeStatus: 'disconnected',
  isReady: false,
  activeMeetingId: null,
  isMeetingSidebarOpen: false,

  setActiveMeetingId: (id) => set({ activeMeetingId: id }),
  setMeetingSidebarOpen: (isOpen) => set({ isMeetingSidebarOpen: isOpen }),

  initialize: async () => {
    try {
      const health = await TauriClient.getDbHealth();
      set({ dbHealth: health, isReady: true });
      
      // Start polling native messaging status
      get().checkNativeStatus();
      if (!(window as any).__nativeStatusInterval) {
        (window as any).__nativeStatusInterval = setInterval(() => {
          get().checkNativeStatus();
        }, 2000);
      }
      
    } catch (error) {
      console.error('Failed to initialize app', error);
      TauriClient.writeLog('ERROR', 'AppStore', String(error));
      set({ isReady: true }); // Still ready so we can show error boundary
    }
  },

  checkNativeStatus: async () => {
    try {
      const status = (await TauriClient.checkNativeStatus()) as ConnectionStatus;
      set({ nativeStatus: status });
    } catch (e) {
      set({ nativeStatus: 'disconnected' });
    }
  }
}));
