import { BachamPlugin } from '@/core/integrations/types';
import { AuthManager } from '@/core/integrations/AuthManager';

const PLUGIN_ID = 'bacham.openrouter';

const OpenRouterPlugin: BachamPlugin = {
  manifest: {
    id: PLUGIN_ID,
    name: 'OpenRouter',
    version: '1.0.0',
    description: 'Use OpenRouter to access hundreds of open-source and proprietary models globally.',
    icon: 'Network',
    category: 'AI Providers',
    permissions: ['AI Inference'],
    author: 'Bacham',
    setupGuide: {
      url: 'https://openrouter.ai/keys',
      urlLabel: 'OpenRouter API Keys',
      steps: [
        'Open openrouter.ai/keys and sign in or create an account.',
        'Click "Create Key", name it "Bacham Meeting Assistant", and copy your generated key.',
        'Add credits to your OpenRouter balance via credit card or crypto (supports flexible pay-as-you-go).',
        'Paste your key below (starts with sk-or-v1-) and click "Connect".',
        'Access 200+ top AI models (DeepSeek R1/V3, Claude 3.5 Sonnet, GPT-4o, Llama 3.3) through one single key!'
      ],
      whereToUse: 'AI Meeting Summaries, Global Multi-Model Access & Automatic Fallback',
      note: 'Expected format: starts with sk-or-v1-... Encrypted locally with AES-GCM.'
    }
  },
  auth: {
    type: 'api_key',
    authenticate: async (token?: string) => {
      if (!token) throw new Error('API token is required');
      
      const trimmed = token.trim();
      if (!trimmed.startsWith('sk-or-v1-')) {
        throw new Error('Invalid OpenRouter API Key format. Must start with sk-or-v1-');
      }

      try {
        const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
          headers: { 'Authorization': `Bearer ${trimmed}` }
        });
        if (!response.ok) {
          throw new Error('Invalid OpenRouter API Key. Please check your credentials.');
        }
      } catch (e: any) {
        throw new Error(e.message || 'Invalid API Key');
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

export default OpenRouterPlugin;
