import { useState, useEffect } from 'react';
import { BachamPlugin } from '@/core/integrations/types';
import * as LucideIcons from 'lucide-react';
import { 
  CheckCircle2, XCircle, Settings2, PlugZap, 
  Unlink, ExternalLink, BookOpen, 
  ChevronDown, ChevronUp, ShieldCheck, Compass, Sparkles,
  Check, Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { useToast } from '@/components/ui/ToastProvider';
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  
  const { settings, updateSettings } = useSettingsStore();
  const { showToast } = useToast();

  const Icon = (LucideIcons as any)[plugin.manifest.icon || 'PlugZap'] || PlugZap;
  const guide = plugin.manifest.setupGuide;
  const brand = BRAND_THEMES[plugin.manifest.id] || { 
    bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' 
  };

  const isAiProvider = plugin.manifest.category === 'AI Providers';
  const isActiveAi = isAiProvider && settings?.aiProvider === plugin.manifest.id;

  const checkConnection = async () => {
    if (plugin.auth?.isConnected) {
      const conn = await plugin.auth.isConnected();
      setIsConnected(conn);
    }
  };

  useEffect(() => {
    checkConnection();
  }, [plugin]);

  const handleDisconnect = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!plugin.auth?.disconnect) return;
    await plugin.auth.disconnect();
    setIsConnected(false);
    showToast(`${plugin.manifest.name} disconnected.`, 'info');
    onStatusChange?.();
  };

  const handleSetActiveAi = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateSettings({ aiProvider: plugin.manifest.id });
      showToast(`${plugin.manifest.name} set as primary AI engine!`, 'success');
    } catch {
      showToast('Failed to set active AI.', 'error');
    }
  };

  return (
    <>
      <div 
        className="relative bg-surface border border-border hover:border-foreground/20 rounded-2xl p-5 flex flex-col justify-between gap-3.5 transition-all duration-200 shadow-sm hover:shadow-md h-full group"
      >
        <div className="relative z-10 flex flex-col gap-3">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${brand.bg} border ${brand.border} flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105 duration-200`}>
                <Icon size={18} className={brand.text} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground tracking-tight">{plugin.manifest.name}</h3>
                  {isActiveAi && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[10px] font-bold border border-violet-500/20">
                      <Sparkles size={10} /> Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground font-medium">{plugin.manifest.category}</p>
              </div>
            </div>
            
            {/* Status Badge */}
            <div>
              {plugin.auth?.type === 'none' ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20 shadow-sm">
                  <CheckCircle2 size={11} /> Ready
                </div>
              ) : isConnected ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                  Connected
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-surface-raised text-muted-foreground text-[10px] font-medium border border-border">
                  <XCircle size={11} /> Not Connected
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-muted-foreground leading-relaxed">
            {plugin.manifest.description}
          </p>

          {/* Workflow surface tag */}
          {guide?.whereToUse && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-surface-raised border border-border px-2.5 py-1 rounded-lg self-start max-w-full">
              <Compass size={12} className="text-primary shrink-0" />
              <span className="truncate">{guide.whereToUse}</span>
            </div>
          )}

          {/* Expandable Step-by-Step Instructions Accordion */}
          {guide && (
            <div className="pt-1 border-t border-border">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowInstructions(!showInstructions);
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-surface-raised hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors text-xs font-medium border border-border cursor-pointer"
              >
                <span className="flex items-center gap-2 text-[11px]">
                  <BookOpen size={13} className="text-primary" />
                  <span className="font-semibold text-foreground">
                    {showInstructions ? 'Hide Setup Guide' : 'How to Connect'}
                  </span>
                </span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span>{showInstructions ? 'Close' : 'View'}</span>
                  {showInstructions ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </span>
              </button>

              <AnimatePresence>
                {showInstructions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2.5 bg-background border border-border rounded-xl p-3.5 space-y-3 shadow-sm">
                      <div className="flex items-center justify-between pb-2 border-b border-border">
                        <span className="text-[11px] font-bold text-foreground">Step-by-Step Instructions</span>
                        {guide.url && (
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openUrl(guide.url as string);
                            }}
                            className="text-[10px] bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-1 rounded-lg border border-primary/25 flex items-center gap-1.5 font-bold transition-colors cursor-pointer"
                            title="Open external developer portal"
                          >
                            <span>{guide.urlLabel || 'Get Token'}</span>
                            <ExternalLink size={10} />
                          </button>
                        )}
                      </div>

                      <ol className="space-y-2 text-[11px] text-muted-foreground leading-relaxed">
                        {guide.steps.map((step, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-primary/20">
                              {i + 1}
                            </span>
                            <span className="flex-1 text-foreground">{step}</span>
                          </li>
                        ))}
                      </ol>

                      {guide.note && (
                        <div className="bg-primary/5 border border-primary/15 rounded-xl p-2.5 flex items-start gap-2 text-[10.5px] text-muted-foreground">
                          <ShieldCheck size={13} className="text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                          <span className="leading-tight">{guide.note}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Action Buttons Row */}
        <div className="relative z-10 flex items-center gap-2 pt-3 border-t border-border mt-auto">
          {plugin.auth?.type !== 'none' && !isConnected && (
            <button 
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:brightness-105 active:scale-[0.98] transition-all shadow-sm cursor-pointer"
            >
              <Play size={12} fill="currentColor" />
              <span>Connect</span>
            </button>
          )}

          {plugin.auth?.type !== 'none' && isConnected && (
            <>
              <button 
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-surface-raised border border-border text-foreground text-xs font-semibold hover:bg-surface-hover transition-colors cursor-pointer"
              >
                <Settings2 size={13} />
                <span>Configure</span>
              </button>

              {isAiProvider && !isActiveAi && (
                <button
                  type="button"
                  onClick={handleSetActiveAi}
                  className="px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-600 dark:text-violet-400 text-xs font-bold hover:bg-violet-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Make this your active AI inference model"
                >
                  <Sparkles size={12} />
                  <span>Set Active</span>
                </button>
              )}

              <button 
                type="button"
                onClick={handleDisconnect}
                className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-border transition-colors cursor-pointer"
                title="Disconnect integration"
              >
                <Unlink size={14} />
              </button>
            </>
          )}

          {plugin.auth?.type === 'none' && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-surface-raised border border-border text-foreground text-xs font-semibold hover:bg-surface-hover transition-colors cursor-pointer"
            >
              <Check size={13} className="text-emerald-500 dark:text-emerald-400" />
              <span>View Details</span>
            </button>
          )}

          {isConnected && plugin.components?.SettingsCard && (
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsSettingsOpen(!isSettingsOpen);
              }}
              className="p-2 rounded-xl bg-surface-raised border border-border/50 text-muted-foreground hover:text-foreground transition-all"
              title="Advanced Settings"
            >
              <Settings2 size={14} />
            </button>
          )}
        </div>

        {/* In-Card Plugin Settings Component */}
        {isSettingsOpen && plugin.components?.SettingsCard && (
          <div className="relative z-10 mt-3 pt-3 border-t border-border/40">
            <plugin.components.SettingsCard plugin={plugin} />
          </div>
        )}
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
