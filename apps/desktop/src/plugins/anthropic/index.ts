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
      urlLabel: 'Anthropic Console Keys',
      steps: [
        'Open console.anthropic.com/settings/keys and sign in with your Anthropic account.',
        'Click "Create Key", label it "Bacham Meeting Assistant", and copy your secret key.',
        'Check Plans & Billing to make sure you have active credits deposited.',
        'Paste the key below (starts with sk-ant-api03-) and click "Connect".',
        'Set Claude as your active AI engine in Settings > AI & General to enjoy nuanced, high-fidelity meeting summaries.'
      ],
      whereToUse: 'AI Meeting Summaries, Complex Decision Analysis & Meeting Synthesis',
      note: 'Expected format: starts with sk-ant-api03-. Claude 3.5 Sonnet is supported.'
    }
  },
  auth: {
    type: 'api_key',
    authenticate: async (token?: string) => {
      if (!token) throw new Error('API token is required');
      
      const trimmed = token.trim();
      if (!trimmed.startsWith('sk-ant-') || trimmed.length < 20) {
        throw new Error('Invalid Anthropic API Key format. Must start with sk-ant-');
      }
      
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'GET',
          headers: { 'x-api-key': trimmed, 'anthropic-version': '2023-06-01' }
        });
        if (response.status === 401 || response.status === 403) {
          throw new Error('Invalid Anthropic API Key. Please check your credentials.');
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

export default AnthropicPlugin;
