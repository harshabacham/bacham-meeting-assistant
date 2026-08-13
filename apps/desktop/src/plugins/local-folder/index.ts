import { BachamPlugin } from '@/core/integrations/types';
import { AuthManager } from '@/core/integrations/AuthManager';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';

const PLUGIN_ID = 'bacham.localfolder';

const LocalFolderPlugin: BachamPlugin = {
  manifest: {
    id: PLUGIN_ID,
    name: 'Local Folder Export',
    version: '1.0.0',
    description: 'Save meeting notes as Markdown files to a specific folder on your computer.',
    category: 'Storage',
    permissions: ['Local File Access'],
    author: 'Bacham',
    setupGuide: {
      steps: [
        'Copy the absolute path to your desired folder (e.g., C:\\Users\\Name\\Desktop\\Meetings).',
        'Paste the path below and click Save.'
      ]
    }
  },
  auth: {
    type: 'api_key',
    authenticate: async (token?: string) => {
      if (!token) throw new Error('Path is required');
      await AuthManager.setToken(PLUGIN_ID, token.trim());
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
      if (!targetPath) throw new Error('Folder path not configured.');

      try {
        const filename = `${data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
        const filePath = await join(targetPath, filename);
        await writeTextFile(filePath, data.content);
        return { status: 'success', message: `Saved to ${filename}` };
      } catch (e: any) {
        throw new Error(`Failed to save file: ${e.message}`);
      }
    }
  }
};

export default LocalFolderPlugin;
