import { useNavigation } from '@/app/providers';
import { Video, FileText, History, Settings } from 'lucide-react';
import type { ScreenName } from '@/app/providers';

export function BottomNavigation() {
  const { currentScreen, navigate } = useNavigation();

  const navItems = [
    {
      id: 'capture',
      screens: ['idle', 'recording', 'paused', 'permission', 'connecting'] as ScreenName[],
      label: 'Capture',
      icon: Video,
    },
    {
      id: 'notes',
      screens: ['notes'] as ScreenName[],
      label: 'Notes',
      icon: FileText,
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
    }
  ];

  return (
    <nav className="flex items-center justify-around bg-[var(--surface-2)] border-t border-[var(--separator)] p-2 relative z-20 backdrop-blur-xl shrink-0">
      {navItems.map((item) => {
        const isActive = item.screens.includes(currentScreen);
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.screens[0])}
            className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all duration-300 ${
              isActive
                ? 'text-[var(--accent-text)] bg-[var(--accent)] shadow-md'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
            }`}
          >
            <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className="mb-1" />
            <span className="text-[10px] font-semibold tracking-wide">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
