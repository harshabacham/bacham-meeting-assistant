import { BachamPlugin } from '@/core/integrations/types';
import { AuthManager } from '@/core/integrations/AuthManager';
import { invoke } from '@tauri-apps/api/core';

const PLUGIN_ID = 'bacham.notion';

interface NotionCredentials {
  token: string;
  pageId: string;
}

const NotionPlugin: BachamPlugin = {
  manifest: {
    id: PLUGIN_ID,
    name: 'Notion',
    version: '1.0.0',
    description: 'Export meeting notes, summaries, and action items directly to your Notion workspace.',
    icon: 'BookOpen',
    category: 'Notes',
    permissions: ['Create Pages', 'Write Content'],
    author: 'Bacham',
    setupGuide: {
      url: 'https://www.notion.so/my-integrations',
      urlLabel: 'Notion Integrations',
      steps: [
        'Open notion.so/my-integrations and click "+ New integration".',
        'Name your integration "Bacham" and copy the Internal Integration Secret.',
        'Open the Notion page where you want to export notes, click "..." in the top right, select "Connect to", and choose "Bacham".',
        'Copy the Page ID from your Notion page URL (the 32-character string at the end of the URL).',
        'Paste your Secret and Page ID below and click Save.'
      ]
    }
  },
  auth: {
    type: 'api_key',
    fields: [
      { id: 'token', label: 'Internal Integration Secret', placeholder: 'secret_...', type: 'password' },
      { id: 'pageId', label: 'Target Notion Page ID', placeholder: 'e.g. 1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d', type: 'text' }
    ],
    authenticate: async (credentials?: any) => {
      const token = credentials?.token?.trim();
      const pageId = credentials?.pageId?.trim();

      if (!token) throw new Error('Notion Integration Secret is required (starts with secret_)');
      if (!pageId) throw new Error('Target Notion Page ID is required');

      // Strip hyphens if present in pageId to ensure Notion API compatibility
      const cleanPageId = pageId.replace(/-/g, '');
      if (cleanPageId.length < 32) {
        throw new Error('Notion Page ID must be a valid 32-character identifier');
      }

      await AuthManager.setToken(PLUGIN_ID, JSON.stringify({ token, pageId: cleanPageId }));
    },
    disconnect: async () => {
      await AuthManager.removeToken(PLUGIN_ID);
    },
    isConnected: async () => {
      const raw = await AuthManager.getToken(PLUGIN_ID);
      if (!raw) return false;
      try {
        const parsed = JSON.parse(raw);
        return Boolean(parsed.token && parsed.pageId);
      } catch {
        return false;
      }
    }
  },
  actions: {
    export: async (data: any) => {
      const raw = await AuthManager.getToken(PLUGIN_ID);
      if (!raw) throw new Error('Notion integration is not configured. Please connect in Settings.');

      let creds: NotionCredentials;
      try {
        creds = JSON.parse(raw);
      } catch {
        throw new Error('Invalid Notion configuration. Please reconnect in Settings.');
      }

      const title = data.title || 'Untitled Meeting Note';
      const content = data.content || data.summary || 'No content provided.';

      try {
        await invoke('push_task_to_notion', {
          input: {
            token: creds.token,
            pageId: creds.pageId,
            title,
            content
          }
        });

        return { status: 'success', message: `Exported "${title}" to Notion successfully!` };
      } catch (e: any) {
        console.error('Notion export error', e);
        const errMsg = typeof e === 'string' ? e : e?.message || 'Failed to export to Notion.';
        return { status: 'error', message: errMsg };
      }
    }
  }
};

export default NotionPlugin;
