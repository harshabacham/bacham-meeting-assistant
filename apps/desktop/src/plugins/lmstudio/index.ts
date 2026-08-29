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
    category: 'AI Providers',
    permissions: ['Local Network Access'],
    author: 'Bacham',
    setupGuide: {
      url: 'https://lmstudio.ai/',
      urlLabel: 'Download LM Studio',
      steps: [
        'Download and install LM Studio from lmstudio.ai',
        'Open LM Studio and search for a model (e.g., Llama 3) to download',
        'Click the "Local Server" tab (↔️ icon) on the left sidebar',
        'Select your downloaded model from the top dropdown',
        'Click the green "Start Server" button',
        'Copy the server URL (usually http://localhost:1234/v1) and paste it below',
        'Click Connect, then click the Gear icon ⚙️ to confirm your model'
      ]
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
