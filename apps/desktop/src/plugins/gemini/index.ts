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
      urlLabel: 'Google AI Studio',
      steps: [
        'Open aistudio.google.com/app/apikey and sign in with your Google account.',
        'Click "Create API Key" and select an existing Google Cloud project (or create a new one in 1 click).',
        'Copy your key (starts with AIzaSy...). Google AI Studio offers a free tier with zero initial cost!',
        'Paste the key below and click "Connect".',
        'Gemini powers high-speed Cloud Transcription, Semantic Smart Search, and ultra-fast meeting summarization.'
      ],
      whereToUse: 'Transcription Engine, Semantic Smart Search & AI Summaries (Gemini 1.5 Flash/Pro)',
      note: 'Expected format: starts with AIzaSy... Generous free tier provided by Google AI Studio.'
    }
  },
  auth: {
    type: 'api_key',
    authenticate: async (token?: string) => {
      if (!token) throw new Error('API token is required');
      
      const trimmed = token.trim();
      if (trimmed.length < 10) {
        throw new Error('API token appears too short or invalid.');
      }
      
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${trimmed}`);
        if (!response.ok) {
          throw new Error('Invalid Google Gemini API Key. Please check your credentials.');
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

export default GeminiPlugin;
