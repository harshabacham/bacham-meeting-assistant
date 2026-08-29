import { useNavigation } from '@/app/providers';
import { Video, Sparkles, CheckSquare, History, Settings } from 'lucide-react';
import type { ScreenName } from '@/app/providers';

export function BottomNavigation() {
  const { currentScreen, navigate } = useNavigation();

  const navItems = [
    {
      id: 'copilot',
      screens: ['copilot'] as ScreenName[],
      label: 'Copilot',
      icon: Sparkles,
    },
    {
      id: 'capture',
      screens: ['idle', 'recording', 'paused', 'permission', 'connecting', 'error'] as ScreenName[],
      label: 'Capture',
      icon: Video,
    },
    {
      id: 'notes',
      screens: ['notes'] as ScreenName[],
      label: 'Notes',
      icon: CheckSquare,
    },
    {
      id: 'history',
      screens: ['history'] as ScreenName[],
      label: 'History',
      icon: History,
    },
    {
      id: 'settings',
      screens: ['settings'] as ScreenName[],
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <nav className="flex items-center justify-around bg-[var(--surface-2)]/90 border-t border-[var(--separator)] px-1 py-1.5 relative z-20 backdrop-blur-2xl shrink-0">
      {navItems.map((item) => {
        const isActive = item.screens.includes(currentScreen);
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.screens[0])}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 ${
              isActive
                ? 'text-indigo-400 bg-indigo-500/15 shadow-sm scale-105'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
            }`}
          >
            <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} className="mb-0.5" />
            <span className="text-[9.5px] font-bold tracking-tight">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
