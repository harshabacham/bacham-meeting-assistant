import { BachamPlugin } from '@/core/integrations/types';
import { AuthManager } from '@/core/integrations/AuthManager';
import { invoke } from '@tauri-apps/api/core';

const PLUGIN_ID = 'bacham.localfolder';

const LocalFolderPlugin: BachamPlugin = {
  manifest: {
    id: PLUGIN_ID,
    name: 'Local Folder Export',
    version: '1.0.0',
    description: 'Save meeting notes as Markdown files to an Obsidian vault or local folder on your computer.',
    icon: 'HardDrive',
    category: 'Storage',
    permissions: ['Local File Access'],
    author: 'Bacham',
    setupGuide: {
      steps: [
        'Enter the full folder path where you want notes saved (e.g. C:\\Users\\Name\\Documents\\ObsidianVault).',
        'Click "Save Setup" to connect the destination folder.',
        'You can now export any meeting directly into this folder with a single click.'
      ]
    }
  },
  auth: {
    type: 'api_key',
    fields: [
      { 
        id: 'folderPath', 
        label: 'Obsidian Vault or Notes Directory Path', 
        placeholder: 'e.g. C:\\Users\\Name\\Documents\\Notes', 
        type: 'text' 
      }
    ],
    authenticate: async (credentials?: any) => {
      const path = (typeof credentials === 'string' ? credentials : credentials?.folderPath)?.trim();
      if (!path) throw new Error('Folder path is required');
      await AuthManager.setToken(PLUGIN_ID, path);
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
      const targetPath = await AuthManager.getToken(PLUGIN_ID);
      if (!targetPath) throw new Error('Local folder path is not configured. Please connect in Settings.');

      try {
        const title = data.title || 'untitled_meeting';
        const safeTitle = title.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_').toLowerCase();
        const filename = `${safeTitle || 'note'}.md`;
        
        const cleanFolder = targetPath.replace(/[\\/]+$/, '');
        const filePath = `${cleanFolder}/${filename}`;
        const content = data.content || data.summary || '# Untitled Meeting Note';

        await invoke('save_text_file', { path: filePath, content });
        return { status: 'success', message: `Saved to ${filename}` };
      } catch (e: any) {
        console.error('Local folder export failed', e);
        const msg = typeof e === 'string' ? e : e?.message || 'Failed to save file.';
        throw new Error(`Failed to save file: ${msg}`);
      }
    }
  }
};

export default LocalFolderPlugin;
