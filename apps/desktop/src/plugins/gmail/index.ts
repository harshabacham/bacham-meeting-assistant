import { BachamPlugin } from '@/core/integrations/types';
import { AuthManager } from '@/core/integrations/AuthManager';

const PLUGIN_ID = 'bacham.gmail';

const GmailPlugin: BachamPlugin = {
  manifest: {
    id: PLUGIN_ID,
    name: 'Gmail',
    version: '1.0.0',
    description: 'Email meeting summaries and action items automatically to participants.',
    category: 'Communication',
    permissions: ['Send Email'],
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
      if (!token) throw new Error('Gmail API Token not configured.');

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
        
        return { status: 'success', message: res.message || 'Email sent successfully.' };
      } catch (e: any) {
        console.error("Gmail export error", e);
        return { status: 'error', message: e || 'Failed to send Email.' };
      }
    }
  }
};
export default GmailPlugin;
