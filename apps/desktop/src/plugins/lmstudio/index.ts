import { BachamPlugin } from '@/core/integrations/types';
import { AuthManager } from '@/core/integrations/AuthManager';
import { LMStudioSettingsCard } from './LMStudioSettingsCard';

const PLUGIN_ID = 'bacham.lmstudio';

const LMStudioPlugin: BachamPlugin = {
  manifest: {
    id: PLUGIN_ID,
    name: 'LM Studio',
    version: '1.0.0',
    description: 'Use local LM Studio models for private, offline meeting summaries.',
    icon: 'HardDrive',
    category: 'AI Providers',
    permissions: ['Local Network Access'],
    author: 'Bacham',
    setupGuide: {
      url: 'https://lmstudio.ai/',
      urlLabel: 'Download LM Studio',
      steps: [
        'Download and install LM Studio from lmstudio.ai for your OS.',
        'In LM Studio, search and download any model (e.g. Llama 3.1 8B, Qwen 2.5, Mistral).',
        'Click the "Local Server" tab (↔️ icon in the left sidebar of LM Studio).',
        'Select your downloaded model from the dropdown at the top and click the green "Start Server" button.',
        'Paste the server URL below (default: http://localhost:1234/v1) and click "Connect".',
        'Click the Gear icon ⚙️ to test your local server and confirm your active model!'
      ],
      whereToUse: 'Private Offline AI Summaries with GPU acceleration (100% Local)',
      note: 'Zero cost, 100% private. Works completely offline without an internet connection.'
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
  },
  components: {
    SettingsCard: LMStudioSettingsCard
  }
};

export default LMStudioPlugin;
