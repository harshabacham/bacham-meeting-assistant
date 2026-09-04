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
    setupGuide: {
      url: 'https://console.cloud.google.com/apis/credentials',
      urlLabel: 'Google Cloud Credentials',
      steps: [
        'Open console.cloud.google.com and select your Google Cloud project.',
        'Navigate to "APIs & Services" > "Enabled APIs & services" and ensure "Google Drive API" is enabled.',
        'Go to "Credentials" and generate an OAuth 2.0 Access Token or Service Account Key with drive.file scope.',
        'Paste the access token below and click "Save Setup".',
        'You can now backup meeting transcripts and audio recordings directly to Google Drive.'
      ],
      whereToUse: 'Notes Editor ("Share & Export" > Backup to Google Drive)',
      note: 'Requires drive.file scope so Bacham can only upload files it creates, preserving full account security.'
    }
  },
  auth: {
    type: 'api_key',
    fields: [
      { id: 'token', label: 'Google Drive Access Token', placeholder: 'ya29....', type: 'password' }
    ],
    authenticate: async (credentials?: any) => {
      const token = (typeof credentials === 'string' ? credentials : credentials?.token)?.trim();
      if (!token) throw new Error("API token is required"); 
      await AuthManager.setToken(PLUGIN_ID, token);
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
