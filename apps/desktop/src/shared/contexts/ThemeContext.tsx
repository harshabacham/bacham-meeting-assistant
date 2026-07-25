import { createContext, useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore';

export const ThemeContext = createContext(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettingsStore();

  useEffect(() => {
    if (!settings) return;
    
    const root = window.document.documentElement;
    const isDark = settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    root.classList.remove('light', 'dark');
    root.classList.add(isDark ? 'dark' : 'light');
    
    // Apply Accent Color
    const accentColors: Record<string, { hex: string, dim: string, border: string }> = {
      blue:   { hex: '#3B82F6', dim: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.4)' },
      purple: { hex: '#8B5CF6', dim: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.4)' },
      orange: { hex: '#F97316', dim: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.4)' },
    };

    if (settings.accentColor === 'lime' || !accentColors[settings.accentColor]) {
      // Let globals.css handle the default (lime) accent color for both dark and light modes
      root.style.removeProperty('--accent');
      root.style.removeProperty('--accent-dim');
      root.style.removeProperty('--border-accent');
      root.style.removeProperty('--accent-glow');
      root.style.removeProperty('--shadow-lime');
    } else {
      const color = accentColors[settings.accentColor];
      root.style.setProperty('--accent', color.hex);
      root.style.setProperty('--accent-dim', color.dim);
      root.style.setProperty('--border-accent', color.border);
      root.style.setProperty('--accent-glow', color.hex + '40');
      root.style.setProperty('--shadow-lime', `0 0 20px ${color.dim}`);
    }
  }, [settings?.theme, settings?.accentColor]);

  return <ThemeContext.Provider value={null}>{children}</ThemeContext.Provider>;
}
