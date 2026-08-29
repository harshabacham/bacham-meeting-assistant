import { useNavigation } from '@/app/providers';
import { Video, Sparkles, CheckSquare, History, Settings } from 'lucide-react';
import type { ScreenName } from '@/app/providers';

export function BottomNavigation() {
  const { currentScreen, navigate } = useNavigation();

  const navItems = [
    {
      id: 'capture',
      screens: ['idle', 'recording', 'paused', 'permission', 'connecting', 'error'] as ScreenName[],
      label: 'REC Note',
      icon: Video,
    },
    {
      id: 'copilot',
      screens: ['copilot'] as ScreenName[],
      label: 'Copilot',
      icon: Sparkles,
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
    <nav className="flex items-center justify-around bg-white border-t border-slate-100 px-2 py-1.5 relative z-20 shrink-0 shadow-sm">
      {navItems.map((item) => {
        const isActive = item.screens.includes(currentScreen);
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.screens[0])}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 ${
              isActive
                ? 'text-[#7C3AED] bg-[#F3E8FF] font-bold shadow-xs'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 font-medium'
            }`}
          >
            <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} className="mb-0.5" />
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
