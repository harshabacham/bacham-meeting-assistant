import React from 'react';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { pluginManager } from '@/core/integrations/PluginManager';
import { 
  BrainCircuit, HardDrive, Sparkles, Search, 
  ArrowRight, Zap, CheckCircle2, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AISettingsTab: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const navigate = useNavigate();

  const aiPlugins = pluginManager.getPlugins().filter(p => p.manifest.category === 'AI Providers');

  return (
    <div className="space-y-6 w-full max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">AI & Intelligence</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure inference models, transcription engines, and semantic intelligence for meetings.
        </p>
      </div>

      {/* Primary Inference Engine Card */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-500 border border-violet-500/20">
              <BrainCircuit size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Primary Inference Engine</h3>
              <p className="text-xs text-muted-foreground">Select which AI generates meeting summaries, key decisions, and action items</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/settings?tab=integrations')}
            className="text-[11px] text-primary hover:underline flex items-center gap-1 font-semibold cursor-pointer"
          >
            <span>Manage Keys</span>
            <ArrowRight size={12} />
          </button>
        </div>

        {/* AI Engines Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {aiPlugins.map((plugin) => {
            const isSelected = settings?.aiProvider === plugin.manifest.id;
            const isOffline = plugin.manifest.id === 'bacham.ollama' || plugin.manifest.id === 'bacham.lmstudio';

            return (
              <div
                key={plugin.manifest.id}
                onClick={() => updateSettings({ aiProvider: plugin.manifest.id })}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-primary/5 border-primary shadow-sm ring-1 ring-primary/30'
                    : 'bg-surface-raised border-border hover:border-foreground/20 hover:bg-surface-hover'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-foreground">{plugin.manifest.name}</h4>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {isOffline ? '100% Local / Offline' : 'Cloud LLM'}
                    </span>
                  </div>

                  {isSelected ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                      <CheckCircle2 size={11} /> Active
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">Select</span>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                  {plugin.manifest.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transcription Engine Selection */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-border">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
            <Zap size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Speech-to-Text Transcription Engine</h3>
            <p className="text-xs text-muted-foreground">Choose between cloud-accelerated transcription or on-device local Whisper</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Cloud: Gemini */}
          <div 
            onClick={() => updateSettings({ transcriptionEngine: 'gemini' })}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
              settings?.transcriptionEngine === 'gemini' || !settings?.transcriptionEngine
                ? 'bg-primary/5 border-primary shadow-sm ring-1 ring-primary/30'
                : 'bg-surface-raised border-border hover:border-foreground/20 hover:bg-surface-hover'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-primary" />
                  <h4 className="text-xs font-bold text-foreground">Gemini Cloud API</h4>
                </div>
                {(settings?.transcriptionEngine === 'gemini' || !settings?.transcriptionEngine) && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-primary">
                    <CheckCircle2 size={12} /> Active
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                Ultra-fast cloud processing with automatic punctuation, speaker diarization, and multilingual accuracy.
              </p>
            </div>
            <div className="text-[10px] font-semibold text-primary/80 pt-1">
              ⚡ Recommended for fast turnarounds
            </div>
          </div>

          {/* Local: Whisper.cpp */}
          <div 
            onClick={() => updateSettings({ transcriptionEngine: 'whisper' })}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
              settings?.transcriptionEngine === 'whisper'
                ? 'bg-primary/5 border-primary shadow-sm ring-1 ring-primary/30'
                : 'bg-surface-raised border-border hover:border-foreground/20 hover:bg-surface-hover'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive size={16} className="text-emerald-500" />
                  <h4 className="text-xs font-bold text-foreground">Whisper.cpp (Local Offline)</h4>
                </div>
                {settings?.transcriptionEngine === 'whisper' && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-primary">
                    <CheckCircle2 size={12} /> Active
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                Runs completely on your device using optimized CPU/GPU quantized models. Zero audio leaves your computer.
              </p>
            </div>
            <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 pt-1">
              🔒 100% Private on-device processing
            </div>
          </div>
        </div>
      </div>

      {/* Semantic Search & Embeddings */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Search size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Smart Semantic Search</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Index meeting transcripts using vector embeddings so you can search by concepts rather than exact words
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={settings?.smartSearchEnabled ?? false}
              onChange={(e) => updateSettings({ smartSearchEnabled: e.target.checked })}
            />
            <div className="w-11 h-6 bg-surface-raised border border-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
          </label>
        </div>

        {/* Network Resilience */}
        <div className="pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-bold text-foreground">Network Resilience & Retries</h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Maximum retry attempts when processing cloud AI requests over unstable connections
            </p>
          </div>

          <div className="relative w-40 shrink-0">
            <select 
              value={settings?.aiMaxRetries || 5}
              onChange={(e) => updateSettings({ aiMaxRetries: parseInt(e.target.value) })}
              className="w-full bg-surface-raised border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-primary transition-all appearance-none cursor-pointer font-medium"
            >
              <option value={1}>1 (Strict - Fast fail)</option>
              <option value={3}>3 (Balanced)</option>
              <option value={5}>5 (Resilient - Recommended)</option>
              <option value={10}>10 (High persistence)</option>
            </select>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
};
