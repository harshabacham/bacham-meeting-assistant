import { useState, useEffect } from 'react';
import { BachamPlugin } from '@/core/integrations/types';
import { Loader2, CheckCircle2, XCircle, Settings2, PlugZap, Link, Unlink, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

interface IntegrationCardProps {
  plugin: BachamPlugin;
}

export function IntegrationCard({ plugin }: IntegrationCardProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (plugin.auth?.isConnected) {
      plugin.auth.isConnected().then(setIsConnected);
    }
  }, [plugin]);

  const handleConnectClick = () => {
    if (plugin.auth?.type === 'api_key') {
      setIsSetupOpen(true);
    } else {
      executeConnection();
    }
  };

  const executeConnection = async (credentials?: any) => {
    if (!plugin.auth?.authenticate) return;
    setIsAuthenticating(true);
    try {
      await plugin.auth.authenticate(credentials);
      setIsConnected(true);
      setIsSetupOpen(false);
      setApiKey('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDisconnect = async () => {
    if (!plugin.auth?.disconnect) return;
    await plugin.auth.disconnect();
    setIsConnected(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="relative overflow-hidden bg-surface/40 backdrop-blur-xl border border-border/50 hover:border-primary/40 rounded-2xl p-5 flex flex-col gap-3 shadow-2xl group transition-all duration-300 h-full hover:shadow-primary/20"
    >
      {/* Subtle inner glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative z-10 flex flex-col h-full">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* A dummy icon placeholder, in a real system we might expose icon from manifest */}
          <div className="w-8 h-8 rounded-lg bg-background border border-border/50 flex items-center justify-center shrink-0">
            <PlugZap size={14} className="text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{plugin.manifest.name}</h3>
            <p className="text-[11px] text-muted-foreground">{plugin.manifest.author}</p>
          </div>
        </div>
        
        {plugin.auth?.type !== 'none' && (
          <div className="flex items-center gap-2">
            {isConnected ? (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-medium border border-emerald-500/20">
                <CheckCircle2 size={10} /> Connected
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50 text-muted-foreground text-[10px] font-medium border border-border/50">
                <XCircle size={10} /> Disconnected
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground/80 leading-relaxed line-clamp-2">
        {plugin.manifest.description}
      </p>

      {/* Setup Form for API Keys */}
      {isSetupOpen && !isConnected && (
        <div className="mt-2 pt-3 border-t border-border/30 space-y-4">
          
          {plugin.manifest.setupGuide && (
            <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary">Setup Guide</span>
                {plugin.manifest.setupGuide.url && (
                  <button 
                    onClick={() => window.open(plugin.manifest.setupGuide!.url, '_blank')}
                    className="text-[10px] bg-primary text-primary-foreground px-2 py-1 rounded hover:bg-primary/90 flex items-center gap-1 shadow-sm transition-colors">
                    {plugin.manifest.setupGuide.urlLabel || 'Get Token'} <ExternalLink size={10} />
                  </button>
                )}
              </div>
              <ol className="list-decimal list-inside text-[11px] text-muted-foreground space-y-1.5 ml-1">
                {plugin.manifest.setupGuide.steps.map((step, i) => (
                  <li key={i} className="pl-1">{step}</li>
                ))}
              </ol>
            </div>
          )}

          <div>
            <label className="text-[11px] font-medium text-foreground">API Token Required</label>
            <p className="text-[10px] text-muted-foreground mb-2">Paste your secure integration token below.</p>
            <input 
              type="password"
              placeholder="Paste your token here..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-background/60 border border-border/50 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsSetupOpen(false)}
              className="flex-1 flex items-center justify-center px-3 py-1.5 rounded-lg bg-surface-hover text-muted-foreground text-xs font-medium hover:text-foreground transition-colors border border-transparent">
              Cancel
            </button>
            <button 
              onClick={() => executeConnection(apiKey)}
              disabled={!apiKey || isAuthenticating}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {isAuthenticating ? <Loader2 size={12} className="animate-spin" /> : 'Save Token'}
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!isSetupOpen && (
        <div className="flex items-center gap-2 mt-2 pt-3 border-t border-border/30">
          {plugin.auth?.type !== 'none' && !isConnected && (
            <button 
              onClick={handleConnectClick}
              disabled={isAuthenticating}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {isAuthenticating ? <Loader2 size={12} className="animate-spin" /> : <Link size={12} />} 
              {isAuthenticating ? 'Connecting...' : 'Connect'}
            </button>
          )}
          {plugin.auth?.type !== 'none' && isConnected && (
            <button 
              onClick={handleDisconnect}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-hover text-muted-foreground text-xs font-medium hover:text-foreground transition-colors border border-transparent hover:border-border/50">
              <Unlink size={12} /> Disconnect
            </button>
          )}
          {isConnected && plugin.components?.SettingsCard && (
            <button 
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="p-1.5 rounded-lg bg-surface-hover text-muted-foreground hover:text-foreground transition-colors border border-transparent hover:border-border/50">
              <Settings2 size={14} />
            </button>
          )}
        </div>
      )}

      {isSettingsOpen && plugin.components?.SettingsCard && (
        <div className="mt-2 pt-3 border-t border-border/30">
          <plugin.components.SettingsCard plugin={plugin} />
        </div>
        )}
      </div>
    </motion.div>
  );
}
