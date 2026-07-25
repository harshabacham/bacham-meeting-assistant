import { create } from 'zustand';
import { TauriClient } from '@/infrastructure/tauri-client';
import type { DbHealth, ConnectionStatus } from '@/shared/types';

interface AppState {
  dbHealth: DbHealth | null;
  nativeStatus: ConnectionStatus;
  isReady: boolean;
  
  initialize: () => Promise<void>;
  checkNativeStatus: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  dbHealth: null,
  nativeStatus: 'disconnected',
  isReady: false,

  initialize: async () => {
    try {
      const health = await TauriClient.getDbHealth();
      set({ dbHealth: health, isReady: true });
      
      // Start polling native messaging status
      get().checkNativeStatus();
      setInterval(() => {
        get().checkNativeStatus();
      }, 2000);
      
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
