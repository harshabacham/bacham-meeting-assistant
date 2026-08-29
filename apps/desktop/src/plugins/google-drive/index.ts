import { BachamPlugin } from '@/core/integrations/types';
import { AuthManager } from '@/core/integrations/AuthManager';

const PLUGIN_ID = 'bacham.google-drive';

const GoogleDrivePlugin: BachamPlugin = {
  manifest: {
    id: PLUGIN_ID,
    name: 'Google Drive',
    version: '1.0.0',
    description: 'Import PDFs/Docs and export meeting transcripts directly to a Google Drive folder.',
    icon: 'HardDrive',
    category: 'Storage',
    permissions: ['Read Files', 'Write Files'],
    author: 'Bacham',
  },
  auth: {
    type: 'api_key',
    authenticate: async (token?: string) => {
      if (!token) throw new Error("API token is required"); await AuthManager.setToken(PLUGIN_ID, token);
    },
    disconnect: async () => {
      await AuthManager.removeToken(PLUGIN_ID);
    },
    isConnected: async () => {
      return await AuthManager.isAuthenticated(PLUGIN_ID);
    }
  },
  actions: {
    export: async (data: any) => {
      const token = await AuthManager.getToken(PLUGIN_ID);
      if (!token) throw new Error('Google Drive API Token not configured.');

      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const res: any = await invoke('execute_integration', {
          input: {
            pluginId: PLUGIN_ID,
            action: 'export',
            payload: data,
            authToken: token
          }
        });
        
        return { status: 'success', message: res.message || 'Uploaded to Google Drive.' };
      } catch (e: any) {
        console.error("Google Drive export error", e);
        return { status: 'error', message: e || 'Failed to upload to Google Drive.' };
      }
    }
  }
};
export default GoogleDrivePlugin;
