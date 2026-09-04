import React from 'react';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { 
  Sun, Moon, Monitor, Globe, 
  Calendar, Check, SlidersHorizontal
} from 'lucide-react';

export const GeneralSettingsTab: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();

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
                onClick={() => updateSettings({ theme: theme.id })}
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

          <select
            value={settings?.language || 'en'}
            onChange={(e) => updateSettings({ language: e.target.value })}
            className="w-48 bg-surface-raised border border-border rounded-xl px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-primary transition-all cursor-pointer"
          >
            {languages.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.label}</option>
            ))}
          </select>
        </div>

        {/* Spoken Language */}
        <div className="pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <label className="text-xs font-semibold text-foreground block">Default Spoken Meeting Language</label>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Setting this accurately improves transcription and AI reasoning speed
            </p>
          </div>

          <select
            value={settings?.spokenLanguage || 'auto'}
            onChange={(e) => updateSettings({ spokenLanguage: e.target.value })}
            className="w-48 bg-surface-raised border border-border rounded-xl px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-primary transition-all cursor-pointer"
          >
            {spokenLanguages.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
