import { BachamPlugin } from '@/core/integrations/types';
import { AuthManager } from '@/core/integrations/AuthManager';
import { OllamaSettingsCard } from './OllamaSettingsCard';

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
        'Download and install Ollama from ollama.com',
        'Open your Terminal (Mac/Linux) or Command Prompt (Windows)',
        'Type `ollama run llama3.1` (or another model) and press Enter to download it',
        'Keep Ollama running in the background',
        'Enter your local Ollama URL below (usually http://localhost:11434)',
        'Click Connect, then click the Gear icon ⚙️ to select your downloaded model'
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
  },
  components: {
    SettingsCard: OllamaSettingsCard
  }
};

export default OllamaPlugin;
