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
    icon: 'Cpu',
    category: 'AI Providers',
    permissions: ['Local Network Access'],
    author: 'Bacham',
    setupGuide: {
      url: 'https://ollama.com/download',
      urlLabel: 'Download Ollama',
      steps: [
        'Download and install Ollama from ollama.com/download for Windows, macOS, or Linux.',
        'Open your Terminal (Mac/Linux) or Command Prompt / PowerShell (Windows).',
        'Download your preferred model by running: ollama run llama3.1 (or ollama run mistral, qwen2.5, phi3).',
        'Keep Ollama running in the background. It listens locally on http://localhost:11434.',
        'Enter your local Ollama address below (default: http://localhost:11434) and click "Connect".',
        'Click the Gear icon ⚙️ to select which downloaded local model to use for meeting intelligence!'
      ],
      whereToUse: '100% Private Offline AI Summaries, Decision Analysis & Live Intelligence',
      note: 'Zero cost, completely offline. No API key needed and zero data ever leaves your computer.'
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
