import { useState, useEffect } from 'react';

import { TauriClient } from '@/infrastructure/tauri-client';
import { Loader2 } from 'lucide-react';

export function OllamaSettingsCard() {
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch user's configured Ollama URL (or default)
      const providers = await TauriClient.listProviders();
      const ollamaConfig = providers.find(p => p.provider === 'ollama');
      
      if (ollamaConfig?.defaultModel) {
        setSelectedModel(ollamaConfig.defaultModel);
      }

      // We can't directly fetch from http://localhost:11434/api/tags due to browser CORS in some contexts,
      // but inside Tauri it often works. If it fails, we fall back to generic list.
      try {
        const url = 'http://localhost:11434'; // We could parse from config if we had a generic way
        const res = await fetch(`${url}/api/tags`);
        if (!res.ok) throw new Error('Failed to fetch from Ollama API');
        const data = await res.json();
        const modelNames = data.models.map((m: any) => m.name);
        setModels(modelNames);
        
        if (!ollamaConfig?.defaultModel && modelNames.length > 0) {
          setSelectedModel(modelNames[0]);
        }
      } catch (e) {
        console.warn('Could not fetch models from Ollama directly via fetch', e);
        // Fallback placeholder models just in case
        if (models.length === 0) {
          setModels(['llama3.1', 'mistral', 'llava', 'phi3']);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedModel) return;
    setIsSaving(true);
    try {
      await TauriClient.saveProviderConfig({
        provider: 'ollama',
        enabled: true,
        defaultModel: selectedModel,
      });
    } catch (e: any) {
      setError(e.message || 'Failed to save model preference');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="animate-spin text-muted-foreground" size={16} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
          <p className="text-xs text-red-500 font-medium leading-tight">{error}</p>
        </div>
      )}
      
      <div>
        <label className="text-[11px] font-medium text-foreground mb-1 block">
          Default Model
        </label>
        <select 
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="w-full bg-background/60 border border-border/50 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-colors"
        >
          {models.map(model => (
            <option key={model} value={model}>{model}</option>
          ))}
        </select>
        <p className="text-[10px] text-muted-foreground mt-1">
          Select the local model you want to use for text generation and chat.
        </p>
      </div>

      <button 
        onClick={handleSave}
        disabled={isSaving || !selectedModel}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-hover text-foreground text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-50 border border-border/50"
      >
        {isSaving ? <Loader2 size={12} className="animate-spin" /> : 'Save Preferences'}
      </button>
    </div>
  );
}
