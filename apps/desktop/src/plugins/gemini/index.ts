import { BachamPlugin } from '@/core/integrations/types';
import { AuthManager } from '@/core/integrations/AuthManager';

const PLUGIN_ID = 'bacham.gemini';

const GeminiPlugin: BachamPlugin = {
  manifest: {
    id: PLUGIN_ID,
    name: 'Google Gemini',
    version: '1.0.0',
    description: 'Use Google Gemini models for generating meeting summaries and extracting intelligence.',
    icon: 'Sparkles',
    category: 'AI Providers',
    permissions: ['AI Inference'],
    author: 'Bacham',
    setupGuide: {
      url: 'https://aistudio.google.com/app/apikey',
      urlLabel: 'Get API Key',
      steps: [
        'Open Google AI Studio.',
        'Click "Create API Key".',
        'Copy your API key and paste it below.'
      ]
    }
  },
  auth: {
    type: 'api_key',
    authenticate: async (token?: string) => {
      if (!token) throw new Error('API token is required');
      
      // Basic validation just to ensure it's not purely whitespace
      if (token.trim().length < 10) {
        throw new Error('API token appears too short or invalid.');
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

export default GeminiPlugin;
