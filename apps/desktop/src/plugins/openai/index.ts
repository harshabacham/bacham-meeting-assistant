import { BachamPlugin } from '@/core/integrations/types';
import { AuthManager } from '@/core/integrations/AuthManager';

const PLUGIN_ID = 'bacham.openai';

const OpenAIPlugin: BachamPlugin = {
  manifest: {
    id: PLUGIN_ID,
    name: 'OpenAI',
    version: '1.0.0',
    description: 'Use OpenAI models (GPT-4o, GPT-3.5) for generating meeting summaries.',
    icon: 'Bot',
    category: 'AI Providers',
    permissions: ['AI Inference'],
    author: 'Bacham',
    setupGuide: {
      url: 'https://platform.openai.com/api-keys',
      urlLabel: 'Get API Key',
      steps: [
        'Open the OpenAI Developer Platform.',
        'Navigate to the API Keys section.',
        'Create a new secret key and paste it below.'
      ]
    }
  },
  auth: {
    type: 'api_key',
    authenticate: async (token?: string) => {
      if (!token) throw new Error('API token is required');
      
      // Validate the token by hitting the models endpoint
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        throw new Error('Invalid OpenAI API Key');
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

export default OpenAIPlugin;
