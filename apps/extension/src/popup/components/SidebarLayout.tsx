import React from 'react';
import { BottomNavigation } from './BottomNavigation';
import { useSession } from '@/shared/hooks/useSession';

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const { sessionState } = useSession();
  const isRecordingActive = sessionState === 'recording' || sessionState === 'paused';

  return (
    <div className="flex flex-col h-screen w-full bg-white text-slate-900 font-sans overflow-hidden">
      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative flex flex-col">
        {children}
      </main>

      {/* Bottom Navigation (Hidden during active recording like Sider.ai) */}
      {!isRecordingActive && <BottomNavigation />}
    </div>
  );
}
