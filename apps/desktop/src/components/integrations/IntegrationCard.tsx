import { useState, useEffect } from 'react';
import { BachamPlugin } from '@/core/integrations/types';
import * as LucideIcons from 'lucide-react';
import { PlugZap, Sparkles, ArrowRight } from 'lucide-react';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { ConnectIntegrationModal } from './ConnectIntegrationModal';

interface IntegrationCardProps {
  plugin: BachamPlugin;
  onStatusChange?: () => void;
}

const BRAND_THEMES: Record<string, { bg: string; text: string; border: string }> = {
  'bacham.slack': { bg: 'bg-[#4A154B]/10 dark:bg-[#4A154B]/20', text: 'text-[#E01E5A]', border: 'border-[#4A154B]/30' },
  'bacham.notion': { bg: 'bg-muted', text: 'text-foreground', border: 'border-border' },
  'bacham.google-calendar': { bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30' },
  'bacham.localfolder': { bg: 'bg-purple-500/10 dark:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/30' },
  'bacham.gmail': { bg: 'bg-red-500/10 dark:bg-red-500/20', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/30' },
  'bacham.google-drive': { bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30' },
  'bacham.openai': { bg: 'bg-teal-500/10 dark:bg-teal-500/20', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-500/30' },
  'bacham.anthropic': { bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30' },
  'bacham.gemini': { bg: 'bg-indigo-500/10 dark:bg-indigo-500/20', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/30' },
  'bacham.grok': { bg: 'bg-rose-500/10 dark:bg-rose-500/20', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/30' },
  'bacham.ollama': { bg: 'bg-cyan-500/10 dark:bg-cyan-500/20', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-500/30' },
  'bacham.lmstudio': { bg: 'bg-orange-500/10 dark:bg-orange-500/20', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500/30' },
  'bacham.openrouter': { bg: 'bg-blue-600/10 dark:bg-blue-600/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-600/30' },
};

const CLEAN_TITLES: Record<string, string> = {
  'bacham.gemini': 'Google Gemini',
  'bacham.anthropic': 'Anthropic Claude',
  'bacham.openai': 'OpenAI (ChatGPT)',
  'bacham.grok': 'xAI Grok',
  'bacham.ollama': 'Ollama (Offline)',
  'bacham.lmstudio': 'LM Studio (Local)',
  'bacham.openrouter': 'OpenRouter',
  'bacham.google-calendar': 'Google Calendar',
  'bacham.google-drive': 'Google Drive',
  'bacham.gmail': 'Gmail & Email',
  'bacham.notion': 'Notion',
  'bacham.localfolder': 'Local Markdown Vault',
  'bacham.slack': 'Slack',
};

const CLEAN_DESCRIPTIONS: Record<string, string> = {
  'bacham.gemini': 'Gemini 2.0 Flash & Pro models for cloud transcription and meeting summaries.',
  'bacham.anthropic': 'Claude 3.5 Sonnet & Haiku models for deep reasoning and meeting notes.',
  'bacham.openai': 'GPT-4o & GPT-4o mini inference for summaries and action items.',
  'bacham.grok': 'Fast, accurate real-time Grok reasoning models for meeting intelligence.',
  'bacham.ollama': '100% private, on-device local models (Llama 3, Mistral, Gemma).',
  'bacham.lmstudio': 'Run private offline inference via local LM Studio server.',
  'bacham.openrouter': 'Unified gateway to hundreds of open-source and proprietary models.',
  'bacham.google-calendar': 'Auto-detect scheduled meetings and sync your calendar events.',
  'bacham.google-drive': 'Directly upload and backup recordings and notes to Google Drive.',
  'bacham.gmail': 'Send meeting recaps, action items, and notes via Gmail or email client.',
  'bacham.notion': 'Export notes, summaries, and action item databases to Notion.',
  'bacham.localfolder': 'Auto-save notes as structured Markdown into Obsidian or local vault.',
  'bacham.slack': 'Share meeting recaps and action items directly to Slack channels.',
};

const CATEGORY_LABELS: Record<string, string> = {
  'AI Providers': 'AI Model',
  'Calendar': 'Calendar Sync',
  'Communication': 'Email & Messaging',
  'Storage': 'Cloud & Local Storage',
  'Notes': 'Workspace & Notes',
};

export function IntegrationCard({ plugin, onStatusChange }: IntegrationCardProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { settings } = useSettingsStore();

  const Icon = (LucideIcons as any)[plugin.manifest.icon || 'PlugZap'] || PlugZap;
  const brand = BRAND_THEMES[plugin.manifest.id] || { 
    bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' 
  };

  const isAiProvider = plugin.manifest.category === 'AI Providers';
  const isActiveAi = isAiProvider && settings?.aiProvider === plugin.manifest.id;
  const isNoAuth = plugin.auth?.type === 'none';

  const title = CLEAN_TITLES[plugin.manifest.id] || plugin.manifest.name;
  const description = CLEAN_DESCRIPTIONS[plugin.manifest.id] || plugin.manifest.description;
  const categoryLabel = CATEGORY_LABELS[plugin.manifest.category] || plugin.manifest.category;

  const checkConnection = async () => {
    if (plugin.auth?.isConnected) {
      try {
        const conn = await plugin.auth.isConnected();
        setIsConnected(conn);
      } catch {
        setIsConnected(false);
      }
    }
  };

  useEffect(() => {
    checkConnection();
  }, [plugin]);

  return (
    <>
      <div 
        onClick={() => setIsModalOpen(true)}
        className="group relative bg-surface border border-border hover:border-foreground/20 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer hover:bg-surface-raised/40"
      >
        <div>
          {/* Top Row: Brand Icon & High-Signal Status Badges Only */}
          <div className="flex items-center justify-between mb-4">
            <div className={`w-10 h-10 rounded-xl ${brand.bg} border ${brand.border} flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 duration-200 shadow-sm`}>
              <Icon size={19} className={brand.text} />
            </div>

            {/* Status indicators (uncluttered: only shows when actually connected / active / built-in) */}
            <div className="flex items-center gap-1.5 shrink-0">
              {isActiveAi && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[10px] font-bold border border-violet-500/20">
                  <Sparkles size={10} /> Active Engine
                </span>
              )}
              {isNoAuth ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-raised text-muted-foreground text-[10px] font-medium border border-border">
                  Built-in
                </span>
              ) : isConnected ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                  Connected
                </span>
              ) : null}
            </div>
          </div>

          {/* Title - Full Width, Clean, Never Truncates */}
          <h3 className="text-sm font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
            {title}
          </h3>

          {/* Crisp, Scannable 2-Line Description (No clumsy filler text) */}
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Clean Footer Row: Clean Category on Left, Clear Action on Right */}
        <div className="pt-3.5 mt-4 border-t border-border flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground">
            {categoryLabel}
          </span>

          <div className={`flex items-center gap-1 text-xs font-semibold transition-all ${
            isConnected || isNoAuth
              ? 'text-muted-foreground group-hover:text-foreground'
              : 'text-primary group-hover:translate-x-0.5'
          }`}>
            <span>{isNoAuth ? 'Configure' : isConnected ? 'Configure' : 'Connect'}</span>
            <ArrowRight size={12} />
          </div>
        </div>
      </div>

      {/* Dedicated Connect Modal */}
      <ConnectIntegrationModal
        plugin={plugin}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStatusChange={() => {
          checkConnection();
          onStatusChange?.();
        }}
      />
    </>
  );
}
