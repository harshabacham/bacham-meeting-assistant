import React from 'react';
import { BottomNavigation } from './BottomNavigation';

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  return (
    <div className="flex flex-col h-screen w-full bg-[var(--bg)] text-[var(--text-primary)] font-sans overflow-hidden">
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-elevated)] to-[var(--bg)] opacity-50 pointer-events-none" />
        <div className="relative z-10 min-h-full flex flex-col">
          {children}
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}

