import { useState, useEffect } from 'react';

import { TauriClient } from '@/infrastructure/tauri-client';
import { Loader2, ChevronDown } from 'lucide-react';
import { AuthManager } from '@/core/integrations/AuthManager';

export function LMStudioSettingsCard() {
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
      const providers = await TauriClient.listProviders();
      const config = providers.find(p => p.provider === 'lmstudio');
      
      if (config?.defaultModel) {
        setSelectedModel(config.defaultModel);
      }

      // Fetch models from LM Studio URL
      try {
        const token = await AuthManager.getToken('bacham.lmstudio');
        let baseUrl = token || 'http://localhost:1234/v1';
        baseUrl = baseUrl.replace(/\/chat\/completions$/, ''); // Just in case user pasted full endpoint

        const res = await fetch(`${baseUrl}/models`);
        if (!res.ok) throw new Error('Failed to fetch from LM Studio API');
        const data = await res.json();
        
        // OpenAI compatible /v1/models response
        const modelNames = data.data.map((m: any) => m.id);
        setModels(modelNames);
        
        if (!config?.defaultModel && modelNames.length > 0) {
          setSelectedModel(modelNames[0]);
        }
      } catch (e) {
        console.warn('Could not fetch models from LM Studio', e);
        if (models.length === 0) {
          setModels(['local-model']);
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
        provider: 'lmstudio',
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
        <label className="text-[11px] font-medium text-foreground mb-1.5 block">
          Default Model
        </label>
        <div className="relative">
          <select 
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full appearance-none bg-surface-raised hover:bg-surface-hover border border-border rounded-xl pl-3.5 pr-9 py-2 text-xs font-semibold text-foreground focus:outline-none focus:border-primary transition-colors cursor-pointer shadow-sm"
          >
            {models.map(model => (
              <option key={model} value={model} className="bg-surface text-foreground py-1">{model}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          Select the model currently loaded in your LM Studio server.
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
