import React from 'react';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { useAnimatedTheme } from '@/components/ui/animated-theme-toggler';
import { 
  Sun, Moon, Monitor, Globe, 
  Calendar, Check, SlidersHorizontal, ChevronDown, Power, Chrome, ExternalLink
} from 'lucide-react';
import { TauriClient } from '@/infrastructure/tauri-client';
import { enable as enableAutostart, disable as disableAutostart, isEnabled as isAutostartEnabled } from '@tauri-apps/plugin-autostart';

export const GeneralSettingsTab: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();

  const [autostartEnabled, setAutostartEnabled] = React.useState(false);
  const [isLoadingAutostart, setIsLoadingAutostart] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;
    isAutostartEnabled()
      .then((enabled) => {
        if (isMounted) {
          setAutostartEnabled(enabled);
          setIsLoadingAutostart(false);
        }
      })
      .catch((err) => {
        console.warn("Could not check autostart status:", err);
        if (isMounted) setIsLoadingAutostart(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const [isExtensionConnected, setIsExtensionConnected] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;
    TauriClient.isExtensionConnected()
      .then((connected) => {
        if (isMounted) setIsExtensionConnected(connected);
      })
      .catch(() => {
        if (isMounted) setIsExtensionConnected(false);
      });

    let unlisten: (() => void) | undefined;
    TauriClient.onExtensionStatusChanged((connected) => {
      if (isMounted) setIsExtensionConnected(connected);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      isMounted = false;
      if (unlisten) unlisten();
    };
  }, []);

  const handleOpenExtensionDocs = async () => {
    const url = 'https://github.com/harshabacham/bacham-meeting-assistant#browser-extension';
    try {
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(url);
    } catch {
      window.open(url, '_blank');
    }
  };

  const handleToggleAutostart = async (checked: boolean) => {
    setAutostartEnabled(checked);
    try {
      if (checked) {
        await enableAutostart();
      } else {
        await disableAutostart();
      }
    } catch (err) {
      console.error("Failed to toggle system autostart:", err);
      // Revert if failed
      setAutostartEnabled(!checked);
    }
  };

  const { setTheme } = useAnimatedTheme({
    theme: (settings?.theme as any) || 'dark',
    onThemeChange: (newTheme) => updateSettings({ theme: newTheme })
  });

  const themes = [
    { id: 'dark', label: 'Dark Mode', icon: Moon, desc: 'High-contrast dark palette' },
    { id: 'light', label: 'Light Mode', icon: Sun, desc: 'Clean, bright workspace' },
    { id: 'system', label: 'System Sync', icon: Monitor, desc: 'Match OS appearance' },
  ];

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
    { code: 'ja', label: '日本語' },
    { code: 'hi', label: 'हिन्दी' },
  ];

  const spokenLanguages = [
    { code: 'auto', label: 'Auto-Detect Language' },
    { code: 'en-US', label: 'English (US)' },
    { code: 'en-GB', label: 'English (UK)' },
    { code: 'es', label: 'Spanish' },
    { code: 'fr', label: 'French' },
    { code: 'de', label: 'German' },
    { code: 'it', label: 'Italian' },
    { code: 'pt', label: 'Portuguese' },
    { code: 'nl', label: 'Dutch' },
    { code: 'ja', label: 'Japanese' },
    { code: 'zh', label: 'Mandarin Chinese' },
    { code: 'ru', label: 'Russian' },
    { code: 'hi', label: 'Hindi' },
    { code: 'ko', label: 'Korean' },
  ];

  return (
    <div className="space-y-6 w-full max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">General Preferences</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure application appearance, meeting auto-recording, and localization settings.
        </p>
      </div>

      {/* Appearance & Themes */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-border">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
            <SlidersHorizontal size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Application Theme</h3>
            <p className="text-xs text-muted-foreground">Select your preferred color scheme across all windows and overlays</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {themes.map((theme) => {
            const isSelected = settings?.theme === theme.id || (!settings?.theme && theme.id === 'system');
            return (
              <div
                key={theme.id}
                onClick={(e) => setTheme(theme.id as any, e)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-primary/5 border-primary shadow-sm ring-1 ring-primary/30'
                    : 'bg-surface-raised border-border hover:border-foreground/20 hover:bg-surface-hover'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-foreground">
                    <theme.icon size={16} />
                  </div>
                  {isSelected && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-primary">
                      <Check size={12} /> Active
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-foreground">{theme.label}</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{theme.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bulletproof Auto-Recording */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <Calendar size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Bulletproof Auto-Record</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automatically start recording when a scheduled calendar meeting starts or when browser extension detects a meeting
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={settings?.autoStartRecording ?? true}
              onChange={(e) => updateSettings({ autoStartRecording: e.target.checked })}
            />
            <div className="w-11 h-6 bg-surface-raised border border-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
          </label>
        </div>
      </div>

      {/* System Startup & Background */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Power size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Launch on System Startup</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automatically start Bacham quietly in the system tray when Windows boots so meetings are never missed
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              disabled={isLoadingAutostart}
              checked={autostartEnabled}
              onChange={(e) => handleToggleAutostart(e.target.checked)}
            />
            <div className="w-11 h-6 bg-surface-raised border border-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner disabled:opacity-50"></div>
          </label>
        </div>
      </div>

      {/* Browser Extension Companion */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Chrome size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">Browser Extension Companion</h3>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                  isExtensionConnected
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    : 'bg-surface-raised text-muted-foreground border-border'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    isExtensionConnected ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40'
                  }`} />
                  {isExtensionConnected ? 'Connected (ws://127.0.0.1:1421)' : 'Not Connected'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Captures Google Meet, Zoom web audio, and active browser tab notes directly into your local database.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenExtensionDocs}
            className="px-3.5 py-1.5 rounded-xl border border-border bg-surface-raised hover:bg-surface-hover hover:border-foreground/20 text-xs font-semibold text-foreground transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <span>{isExtensionConnected ? 'Companion Docs' : 'Install Extension'}</span>
            <ExternalLink size={13} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Localization & Languages */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2.5 pb-3 border-b border-border">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
            <Globe size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Global Localization</h3>
            <p className="text-xs text-muted-foreground">Select your interface language and spoken meeting acoustics</p>
          </div>
        </div>

        {/* UI Language */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <label className="text-xs font-semibold text-foreground block">App Interface Language</label>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Controls menus, labels, toolbars, and system dialogues
            </p>
          </div>

          <div className="relative w-52 shrink-0">
            <select
              value={settings?.language || 'en'}
              onChange={(e) => updateSettings({ language: e.target.value })}
              className="w-full appearance-none bg-surface-raised hover:bg-surface-hover border border-border focus:border-primary rounded-xl pl-3.5 pr-9 py-2 text-xs font-semibold text-foreground outline-none transition-all cursor-pointer shadow-sm"
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code} className="bg-surface text-foreground py-1">
                  {lang.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Spoken Language */}
        <div className="pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <label className="text-xs font-semibold text-foreground block">Default Spoken Meeting Language</label>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Setting this accurately improves transcription and AI reasoning speed
            </p>
          </div>

          <div className="relative w-52 shrink-0">
            <select
              value={settings?.spokenLanguage || 'auto'}
              onChange={(e) => updateSettings({ spokenLanguage: e.target.value })}
              className="w-full appearance-none bg-surface-raised hover:bg-surface-hover border border-border focus:border-primary rounded-xl pl-3.5 pr-9 py-2 text-xs font-semibold text-foreground outline-none transition-all cursor-pointer shadow-sm"
            >
              {spokenLanguages.map(lang => (
                <option key={lang.code} value={lang.code} className="bg-surface text-foreground py-1">
                  {lang.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
};
