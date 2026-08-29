import { BachamPlugin } from '@/core/integrations/types';
import { AuthManager } from '@/core/integrations/AuthManager';
import { invoke } from '@tauri-apps/api/core';

const PLUGIN_ID = 'bacham.slack';

const SlackPlugin: BachamPlugin = {
  manifest: {
    id: PLUGIN_ID,
    name: 'Slack',
    version: '1.0.0',
    description: 'Push meeting summaries and key decisions directly to your team\'s Slack channels.',
    icon: 'Hash',
    category: 'Communication',
    permissions: ['Send Messages', 'Read Channels'],
    author: 'Bacham',
    setupGuide: {
      url: 'https://api.slack.com/messaging/webhooks',
      urlLabel: 'Slack API',
      steps: [
        'Create an Incoming Webhook in your Slack Workspace.',
        'Copy the Webhook URL.',
        'Paste the URL below and click Save.'
      ]
    }
  },
  auth: {
    type: 'api_key',
    fields: [
      { id: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://hooks.slack.com/services/...', type: 'password' }
    ],
    authenticate: async (credentials?: any) => {
      const token = credentials?.webhookUrl;
      if (!token) throw new Error('Webhook URL is required');
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
      const webhookUrl = await AuthManager.getToken(PLUGIN_ID);
      if (!webhookUrl) throw new Error('Slack Webhook URL not configured.');

      try {
        const res: any = await invoke('execute_integration', {
          input: {
            pluginId: PLUGIN_ID,
            action: 'export',
            payload: data,
            authToken: webhookUrl
          }
        });
        
        return { status: 'success', message: res.message || 'Sent to Slack channel.' };
      } catch (e: any) {
        console.error("Slack export error", e);
        return { status: 'error', message: e || 'Failed to send to Slack.' };
      }
    }
  }
};

export default SlackPlugin;
