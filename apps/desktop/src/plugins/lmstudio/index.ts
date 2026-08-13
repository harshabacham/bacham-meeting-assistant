import { BachamPlugin } from '@/core/integrations/types';
import { AuthManager } from '@/core/integrations/AuthManager';

const PLUGIN_ID = 'bacham.lmstudio';

const LMStudioPlugin: BachamPlugin = {
  manifest: {
    id: PLUGIN_ID,
    name: 'LM Studio',
    version: '1.0.0',
    description: 'Use local LM Studio models for private, offline meeting summaries.',
    category: 'AI Providers',
    permissions: ['Local Network Access'],
    author: 'Bacham',
    setupGuide: {
      url: 'https://lmstudio.ai/',
      urlLabel: 'Download LM Studio',
      steps: [
        'Open LM Studio and start the Local Server.',
        'Enter the Local Server URL (default: http://localhost:1234/v1)',
        'Click Save.'
      ]
    }
  },
  auth: {
    type: 'api_key',
    authenticate: async (token?: string) => {
      if (!token) throw new Error('Server URL is required');
      await AuthManager.setToken(PLUGIN_ID, token);
    },
    disconnect: async () => {
      await AuthManager.removeToken(PLUGIN_ID);
    },
    isConnected: async () => {
      return await AuthManager.isAuthenticated(PLUGIN_ID);
    }
  }
};

export default LMStudioPlugin;
