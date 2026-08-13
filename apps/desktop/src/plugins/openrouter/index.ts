import { BachamPlugin } from '@/core/integrations/types';
import { AuthManager } from '@/core/integrations/AuthManager';

const PLUGIN_ID = 'bacham.openrouter';

const OpenRouterPlugin: BachamPlugin = {
  manifest: {
    id: PLUGIN_ID,
    name: 'OpenRouter',
    version: '1.0.0',
    description: 'Use OpenRouter to access hundreds of open-source and proprietary models globally.',
    category: 'AI Providers',
    permissions: ['AI Inference'],
    author: 'Bacham',
    setupGuide: {
      url: 'https://openrouter.ai/keys',
      urlLabel: 'Get API Key',
      steps: [
        'Open OpenRouter and log in.',
        'Navigate to the Keys section.',
        'Generate a new API Key and paste it below.'
      ]
    }
  },
  auth: {
    type: 'api_key',
    authenticate: async (token?: string) => {
      if (!token) throw new Error('API token is required');
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

export default OpenRouterPlugin;
