import { BachamPlugin } from '@/core/integrations/types';
import { AuthManager } from '@/core/integrations/AuthManager';

const PLUGIN_ID = 'bacham.anthropic';

const AnthropicPlugin: BachamPlugin = {
  manifest: {
    id: PLUGIN_ID,
    name: 'Anthropic Claude',
    version: '1.0.0',
    description: 'Use Anthropic Claude 3 models for generating highly accurate meeting summaries.',
    icon: 'Brain',
    category: 'AI Providers',
    permissions: ['AI Inference'],
    author: 'Bacham',
    setupGuide: {
      url: 'https://console.anthropic.com/settings/keys',
      urlLabel: 'Get API Key',
      steps: [
        'Open the Anthropic Console.',
        'Navigate to Settings > API Keys.',
        'Create a new API Key and paste it below.'
      ]
    }
  },
  auth: {
    type: 'api_key',
    authenticate: async (token?: string) => {
      if (!token) throw new Error('API token is required');
      
      // Structural validation for Anthropic API Keys (e.g. sk-ant-api03-...)
      if (!/^sk-ant-[a-zA-Z0-9\-_]{50,}$/.test(token)) {
        throw new Error('Invalid Anthropic API Key format. Must start with sk-ant-');
      }
      
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

export default AnthropicPlugin;
