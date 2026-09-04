import { useState, useEffect } from 'react';
import { BachamPlugin } from '@/core/integrations/types';
import * as LucideIcons from 'lucide-react';
import { CheckCircle2, PlugZap, Sparkles, ArrowRight } from 'lucide-react';
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

export function IntegrationCard({ plugin, onStatusChange }: IntegrationCardProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { settings } = useSettingsStore();

  const Icon = (LucideIcons as any)[plugin.manifest.icon || 'PlugZap'] || PlugZap;
  const guide = plugin.manifest.setupGuide;
  const brand = BRAND_THEMES[plugin.manifest.id] || { 
    bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' 
  };

  const isAiProvider = plugin.manifest.category === 'AI Providers';
  const isActiveAi = isAiProvider && settings?.aiProvider === plugin.manifest.id;
  const isNoAuth = plugin.auth?.type === 'none';

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
        className="group relative bg-surface border border-border hover:border-foreground/20 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer min-h-[180px]"
      >
        <div className="space-y-3">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-xl ${brand.bg} border ${brand.border} flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 duration-200`}>
                <Icon size={18} className={brand.text} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-foreground tracking-tight truncate">
                    {plugin.manifest.name}
                  </h3>
                  {isActiveAi && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[9px] font-bold border border-violet-500/20 shrink-0">
                      <Sparkles size={9} /> Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground font-medium truncate">
                  {plugin.manifest.category}
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="shrink-0">
              {isNoAuth ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
                  <CheckCircle2 size={11} /> Built-in
                </span>
              ) : isConnected ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-surface-raised text-muted-foreground text-[10px] font-medium border border-border">
                  Not connected
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {plugin.manifest.description}
          </p>
        </div>

        {/* Footer Row */}
        <div className="pt-3 border-t border-border flex items-center justify-between gap-2 mt-auto">
          {guide?.whereToUse ? (
            <span className="text-[10px] text-muted-foreground truncate max-w-[140px]" title={guide.whereToUse}>
              {guide.whereToUse}
            </span>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-1 text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
            <span>{isNoAuth ? 'Details' : isConnected ? 'Configure' : 'Connect'}</span>
            <ArrowRight size={13} />
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
