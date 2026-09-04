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
      urlLabel: 'OpenAI API Keys',
      steps: [
        'Open platform.openai.com/api-keys and log in or create an account.',
        'Click "+ Create new secret key", name it "Bacham Meeting Assistant", and copy your secret key.',
        'Important: Verify your account has billing credits under Settings > Billing (requires min $5 credit balance).',
        'Paste your secret key below (starts with sk-proj- or sk-) and click "Connect".',
        'Once connected, go to Settings > AI & General to choose GPT-4o as your Active Inference Engine.'
      ],
      whereToUse: 'AI Meeting Summaries, Live Copilot, Action Item Detection & Meeting Questions',
      note: 'Expected format: starts with sk-proj- or sk-. Token is encrypted locally with AES-GCM.'
    }
  },
  auth: {
    type: 'api_key',
    authenticate: async (token?: string) => {
      if (!token) throw new Error('API token is required');
      
      const trimmed = token.trim();
      if (!trimmed.startsWith('sk-') || trimmed.length < 20) {
        throw new Error('Invalid OpenAI API Key format. Must start with "sk-".');
      }
      
      await AuthManager.setToken(PLUGIN_ID, trimmed);
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
