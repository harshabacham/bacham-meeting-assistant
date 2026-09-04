import { BachamPlugin } from '@/core/integrations/types';
import { AuthManager } from '@/core/integrations/AuthManager';

const PLUGIN_ID = 'bacham.grok';

const GrokPlugin: BachamPlugin = {
  manifest: {
    id: PLUGIN_ID,
    name: 'Grok (xAI)',
    version: '1.0.0',
    description: 'Use xAI Grok models for generating fast and accurate meeting summaries.',
    icon: 'BrainCircuit',
    category: 'AI Providers',
    permissions: ['AI Inference'],
    author: 'Bacham',
    setupGuide: {
      url: 'https://console.x.ai/',
      urlLabel: 'xAI Console Keys',
      steps: [
        'Open console.x.ai and sign in with your X (Twitter) or Google account.',
        'Navigate to the "API Keys" section and click "+ Create API Key".',
        'Copy your generated secret key (starts with xai-).',
        'Ensure you have credit balance available under Billing & Invoices.',
        'Paste the key below and click "Connect". Then select Grok in Settings > AI & General.'
      ],
      whereToUse: 'AI Meeting Summaries & Fast Intelligence (Grok-2 & Grok-2-mini)',
      note: 'Expected format: starts with xai-... Token is encrypted locally with AES-GCM.'
    }
  },
  auth: {
    type: 'api_key',
    authenticate: async (token?: string) => {
      if (!token) throw new Error('API token is required');
      
      // xAI API keys typically start with xai-
      if (!token.startsWith('xai-')) {
        throw new Error('Invalid Grok API Key format. Must start with xai-');
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

export default GrokPlugin;
