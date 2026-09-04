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
      url: 'https://www.notion.so/profile/integrations',
      urlLabel: 'Notion Integrations Portal',
      steps: [
        'Open notion.so/profile/integrations (or notion.so/my-integrations) and click "+ New integration".',
        'Name your integration "Bacham" and click Submit. Copy the "Internal Integration Secret" (starts with secret_ or ntn_).',
        'In Notion, go to the page or database where you want meeting notes and tasks exported.',
        'CRITICAL STEP: Click the "..." (three dots) in the top right corner of that Notion page, select "Connect to" (or "Add connections"), and choose "Bacham". Without this step, Notion will return a 404 error.',
        'Copy the Page ID from the URL bar: it is the 32-character hexadecimal string at the end of the URL (e.g. if URL is notion.so/My-Page-3b1a2c3d4e5f60718293a4b5c6d7e8f9, the Page ID is 3b1a2c3d4e5f60718293a4b5c6d7e8f9).',
        'Paste your Secret and Page ID below and click "Save Setup".'
      ],
      whereToUse: 'Tasks Page ("Sync Tasks" button) & Notes Editor ("Share & Export" > Send to Notion)',
      note: 'Tip: If Notion ever reports "Object not found", re-check Step 4 to make sure the "Bacham" integration connection is granted to that exact page.'
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
