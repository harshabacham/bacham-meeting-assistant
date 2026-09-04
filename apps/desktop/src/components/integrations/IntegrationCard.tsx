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

const BRAND_THEMES: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  'bacham.slack': { bg: 'bg-[#4A154B]/15', text: 'text-[#E01E5A]', border: 'border-[#4A154B]/30', glow: 'from-[#4A154B]/15' },
  'bacham.notion': { bg: 'bg-zinc-500/15', text: 'text-zinc-200', border: 'border-zinc-500/30', glow: 'from-zinc-500/15' },
  'bacham.google-calendar': { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', glow: 'from-blue-500/15' },
  'bacham.localfolder': { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30', glow: 'from-purple-500/15' },
  'bacham.gmail': { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', glow: 'from-red-500/15' },
  'bacham.google-drive': { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', glow: 'from-emerald-500/15' },
  'bacham.openai': { bg: 'bg-teal-500/15', text: 'text-teal-400', border: 'border-teal-500/30', glow: 'from-teal-500/15' },
  'bacham.anthropic': { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', glow: 'from-amber-500/15' },
  'bacham.gemini': { bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/30', glow: 'from-indigo-500/15' },
  'bacham.grok': { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30', glow: 'from-rose-500/15' },
  'bacham.ollama': { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30', glow: 'from-cyan-500/15' },
  'bacham.lmstudio': { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30', glow: 'from-orange-500/15' },
  'bacham.openrouter': { bg: 'bg-blue-600/15', text: 'text-blue-400', border: 'border-blue-600/30', glow: 'from-blue-600/15' },
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
    bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20', glow: 'from-primary/10' 
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
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -3 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className="relative overflow-hidden bg-surface/50 backdrop-blur-xl border border-border/70 hover:border-border rounded-3xl p-5 flex flex-col justify-between gap-3.5 shadow-xl group transition-all duration-300 h-full hover:shadow-2xl"
      >
        {/* Brand Glow Effect */}
        <div className={`absolute inset-0 bg-gradient-to-br ${brand.glow} via-transparent to-transparent pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity duration-500`} />
        
        <div className="relative z-10 flex flex-col gap-3">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl ${brand.bg} border ${brand.border} flex items-center justify-center shrink-0 shadow-inner transition-transform group-hover:scale-105 duration-300`}>
                <Icon size={18} className={brand.text} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground tracking-tight">{plugin.manifest.name}</h3>
                  {isActiveAi && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 text-[10px] font-bold border border-violet-500/25">
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
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20 shadow-sm">
                  <CheckCircle2 size={11} /> Ready
                </div>
              ) : isConnected ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/25 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Connected
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/60 text-muted-foreground text-[10px] font-medium border border-border/60">
                  <XCircle size={11} /> Not Connected
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {plugin.manifest.description}
          </p>

          {/* Workflow surface tag */}
          {guide?.whereToUse && (
            <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground/80">
              <Compass size={12} className="text-primary shrink-0" />
              <span className="truncate">{guide.whereToUse}</span>
            </div>
          )}

          {/* Expandable Step-by-Step Instructions Accordion */}
          {guide && (
            <div className="pt-1 border-t border-border/30">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowInstructions(!showInstructions);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-surface-raised/40 hover:bg-surface-raised text-muted-foreground hover:text-foreground transition-all text-xs font-medium border border-border/40 group/guide"
              >
                <span className="flex items-center gap-2 text-[11px]">
                  <BookOpen size={13} className="text-primary group-hover/guide:scale-110 transition-transform" />
                  <span className="font-semibold text-foreground/80">
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
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2.5 bg-background/80 border border-border/60 rounded-2xl p-3.5 space-y-3 shadow-inner">
                      <div className="flex items-center justify-between pb-2 border-b border-border/40">
                        <span className="text-[11px] font-bold text-foreground">Step-by-Step Instructions</span>
                        {guide.url && (
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openUrl(guide.url as string);
                            }}
                            className="text-[10px] bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-1 rounded-lg border border-primary/25 flex items-center gap-1.5 font-bold transition-all"
                            title="Open external portal"
                          >
                            <span>{guide.urlLabel || 'Get Token'}</span>
                            <ExternalLink size={10} />
                          </button>
                        )}
                      </div>

                      <ol className="space-y-2 text-[11px] text-muted-foreground leading-relaxed">
                        {guide.steps.map((step, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <span className="w-4 h-4 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-primary/25">
                              {i + 1}
                            </span>
                            <span className="flex-1 text-foreground/85">{step}</span>
                          </li>
                        ))}
                      </ol>

                      {guide.note && (
                        <div className="bg-primary/5 border border-primary/15 rounded-xl p-2.5 flex items-start gap-2 text-[10.5px] text-muted-foreground">
                          <ShieldCheck size={13} className="text-emerald-400 shrink-0 mt-0.5" />
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
        <div className="relative z-10 flex items-center gap-2 pt-3 border-t border-border/40 mt-auto">
          {plugin.auth?.type !== 'none' && !isConnected && (
            <button 
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-md cursor-pointer"
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
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-surface-raised border border-border text-foreground text-xs font-semibold hover:bg-surface-hover transition-all"
              >
                <Settings2 size={13} />
                <span>Configure</span>
              </button>

              {isAiProvider && !isActiveAi && (
                <button
                  type="button"
                  onClick={handleSetActiveAi}
                  className="px-3 py-2 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-bold hover:bg-violet-500/25 transition-all flex items-center gap-1.5"
                  title="Make this your active AI inference model"
                >
                  <Sparkles size={12} />
                  <span>Set Active</span>
                </button>
              )}

              <button 
                type="button"
                onClick={handleDisconnect}
                className="p-2 rounded-xl text-muted-foreground hover:text-red-400 hover:bg-red-500/10 border border-border/40 transition-all"
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
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-surface-raised border border-border/60 text-foreground text-xs font-semibold hover:bg-surface-hover transition-all"
            >
              <Check size={13} className="text-emerald-400" />
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
      </motion.div>

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
