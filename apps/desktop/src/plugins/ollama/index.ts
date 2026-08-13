import { BachamPlugin } from '@/core/integrations/types';
import { AuthManager } from '@/core/integrations/AuthManager';

const PLUGIN_ID = 'bacham.ollama';

const OllamaPlugin: BachamPlugin = {
  manifest: {
    id: PLUGIN_ID,
    name: 'Ollama',
    version: '1.0.0',
    description: 'Use local Ollama models (Llama 3, Mistral) for private, offline meeting summaries.',
    category: 'AI Providers',
    permissions: ['Local Network Access'],
    author: 'Bacham',
    setupGuide: {
      url: 'https://ollama.com/',
      urlLabel: 'Download Ollama',
      steps: [
        'Ensure Ollama is running on your machine.',
        'Enter your Ollama URL (default: http://localhost:11434)',
        'Click Save.'
      ]
    }
  },
  auth: {
    type: 'api_key',
    authenticate: async (token?: string) => {
      if (!token) throw new Error('Ollama URL is required');
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

export default OllamaPlugin;
