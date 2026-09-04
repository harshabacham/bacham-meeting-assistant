import { useState, useEffect } from 'react';
import { BachamPlugin } from '@/core/integrations/types';
import * as LucideIcons from 'lucide-react';
import { 
  Loader2, CheckCircle2, XCircle, Settings2, PlugZap, 
  Link as LinkIcon, Unlink, ExternalLink, BookOpen, 
  ChevronDown, ChevronUp, ShieldCheck, Compass
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { openUrl } from '@tauri-apps/plugin-opener';

interface IntegrationCardProps {
  plugin: BachamPlugin;
}

export function IntegrationCard({ plugin }: IntegrationCardProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  
  const Icon = (LucideIcons as any)[plugin.manifest.icon || 'PlugZap'] || PlugZap;

  useEffect(() => {
    if (plugin.auth?.isConnected) {
      plugin.auth.isConnected().then(setIsConnected);
    }
  }, [plugin]);

  const handleConnectClick = () => {
    if (plugin.auth?.type === 'api_key') {
      setIsSetupOpen(true);
      setShowInstructions(true);
    } else {
      executeConnection();
    }
  };

  const executeConnection = async (credentials?: any) => {
    if (!plugin.auth?.authenticate) return;
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      await plugin.auth.authenticate(credentials);
      setIsConnected(true);
      setIsSetupOpen(false);
      setFormValues({});
    } catch (e: any) {
      console.error(e);
      setAuthError(e.message || 'Authentication failed');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDisconnect = async () => {
    if (!plugin.auth?.disconnect) return;
    await plugin.auth.disconnect();
    setIsConnected(false);
  };

  const guide = plugin.manifest.setupGuide;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="relative overflow-hidden bg-surface/50 backdrop-blur-xl border border-border/60 hover:border-primary/40 rounded-2xl p-5 flex flex-col gap-3 shadow-xl group transition-all duration-300 h-full hover:shadow-primary/10"
    >
      {/* Subtle inner glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative z-10 flex flex-col h-full">
        {/* Header: Icon, Name, Author, Status */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-background/80 border border-border/60 flex items-center justify-center shrink-0 shadow-inner">
              <Icon size={16} className="text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground tracking-tight">{plugin.manifest.name}</h3>
              <p className="text-[11px] text-muted-foreground">{plugin.manifest.author}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {plugin.auth?.type === 'none' ? (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
                <CheckCircle2 size={11} /> Ready
              </div>
            ) : isConnected ? (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
                <CheckCircle2 size={11} /> Connected
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground text-[10px] font-semibold border border-border/60">
                <XCircle size={11} /> Disconnected
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground/90 leading-relaxed mt-1">
          {plugin.manifest.description}
        </p>

        {/* Setup Form for API Keys / Credentials */}
        {isSetupOpen && !isConnected && (
          <div className="mt-3 pt-3 border-t border-border/40 space-y-3">
            {authError && (
              <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-2.5 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <p className="text-xs text-red-400 font-medium leading-tight">{authError}</p>
              </div>
            )}

            {plugin.auth?.fields ? (
              <div className="space-y-3">
                {plugin.auth.fields.map(field => (
                  <div key={field.id} className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground/90 flex items-center justify-between">
                      <span>{field.label}</span>
                    </label>
                    <input 
                      type={field.type || 'text'}
                      placeholder={field.placeholder || ''}
                      value={formValues[field.id] || ''}
                      onChange={(e) => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                      className="w-full bg-background/80 border border-border/60 rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all font-mono"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground/90">API Secret Key</label>
                <input 
                  type="password"
                  placeholder="Paste your secret key..."
                  value={formValues.apiKey || ''}
                  onChange={(e) => setFormValues({ apiKey: e.target.value })}
                  className="w-full bg-background/80 border border-border/60 rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all font-mono"
                />
              </div>
            )}
            
            <div className="flex items-center gap-2 pt-1">
              <button 
                onClick={() => setIsSetupOpen(false)}
                className="flex-1 flex items-center justify-center px-3 py-1.5 rounded-xl bg-surface-hover text-muted-foreground text-xs font-medium hover:text-foreground transition-colors border border-border/40">
                Cancel
              </button>
              <button 
                onClick={() => executeConnection(plugin.auth?.fields ? formValues : formValues.apiKey)}
                disabled={Object.keys(formValues).length === 0 || isAuthenticating}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50 cursor-pointer">
                {isAuthenticating ? <Loader2 size={12} className="animate-spin" /> : 'Save & Connect'}
              </button>
            </div>
          </div>
        )}

        {/* Instructions Toggle Button (Always Available) */}
        {guide && (
          <div className="mt-3 pt-2.5 border-t border-border/30">
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-surface-hover/60 hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-all text-xs font-medium border border-border/30 group/inst"
            >
              <span className="flex items-center gap-2 text-[11px]">
                <BookOpen size={13} className="text-primary group-hover/inst:scale-110 transition-transform" />
                <span className="font-semibold text-foreground/80">
                  {showInstructions ? 'Hide Instructions' : 'How to Connect & Use'}
                </span>
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>{showInstructions ? 'Close' : 'View Guide'}</span>
                {showInstructions ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </span>
            </button>

            {/* Expandable Step-by-Step Instructions Accordion */}
            <AnimatePresence>
              {showInstructions && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2.5 bg-background/60 border border-border/50 rounded-xl p-3.5 space-y-3">
                    {/* Portal Header Link */}
                    <div className="flex items-center justify-between pb-2 border-b border-border/30">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-foreground">Step-by-Step Setup</span>
                      </div>
                      {guide.url && (
                        <button 
                          onClick={() => openUrl(guide.url as string)}
                          className="text-[10px] bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-1 rounded-lg border border-primary/25 flex items-center gap-1.5 font-semibold transition-all hover:shadow-sm"
                          title="Open external setup console in your browser"
                        >
                          <span>{guide.urlLabel || 'Get Credentials'}</span>
                          <ExternalLink size={10} />
                        </button>
                      )}
                    </div>

                    {/* Step List */}
                    <ol className="space-y-2 text-[11px] text-muted-foreground leading-relaxed">
                      {guide.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className="w-4 h-4 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-primary/25">
                            {i + 1}
                          </span>
                          <span className="flex-1 text-foreground/80">{step}</span>
                        </li>
                      ))}
                    </ol>

                    {/* Where to Use Badge */}
                    {guide.whereToUse && (
                      <div className="pt-2 border-t border-border/30 flex items-start gap-2 text-[10px] text-muted-foreground">
                        <Compass size={12} className="text-primary shrink-0 mt-0.5" />
                        <span><strong className="text-foreground/90 font-semibold">Where to use in Bacham:</strong> {guide.whereToUse}</span>
                      </div>
                    )}

                    {/* Security or Format Note */}
                    {guide.note && (
                      <div className="bg-primary/5 border border-primary/15 rounded-lg p-2 flex items-start gap-2 text-[10px] text-muted-foreground">
                        <ShieldCheck size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-tight">{guide.note}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Action Buttons: Connect / Disconnect / Settings */}
        {!isSetupOpen && (
          <div className="flex items-center gap-2 mt-auto pt-3 border-t border-border/30">
            {plugin.auth?.type !== 'none' && !isConnected && (
              <button 
                onClick={handleConnectClick}
                disabled={isAuthenticating}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50 cursor-pointer">
                {isAuthenticating ? <Loader2 size={12} className="animate-spin" /> : <LinkIcon size={12} />} 
                {isAuthenticating ? 'Connecting...' : 'Connect'}
              </button>
            )}
            {plugin.auth?.type !== 'none' && isConnected && (
              <button 
                onClick={handleDisconnect}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-surface-hover text-muted-foreground text-xs font-semibold hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all border border-border/40">
                <Unlink size={12} /> Disconnect
              </button>
            )}
            {plugin.auth?.type === 'none' && (
              <div className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/5 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                <CheckCircle2 size={12} /> System Ready
              </div>
            )}
            {isConnected && plugin.components?.SettingsCard && (
              <button 
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className="p-2 rounded-xl bg-surface-hover text-muted-foreground hover:text-foreground transition-all border border-border/40 hover:border-border"
                title="Integration Settings">
                <Settings2 size={14} />
              </button>
            )}
          </div>
        )}

        {/* Plugin Settings Card */}
        {isSettingsOpen && plugin.components?.SettingsCard && (
          <div className="mt-3 pt-3 border-t border-border/30">
            <plugin.components.SettingsCard plugin={plugin} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

