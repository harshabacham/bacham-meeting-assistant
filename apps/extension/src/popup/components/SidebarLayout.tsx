import React from 'react';

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  return (
    <div className="flex flex-col h-screen w-full bg-white text-slate-900 font-sans overflow-hidden">
      {/* Full Height Main Screen (Clean Sider.ai Layout without bottom bar) */}
      <main className="flex-1 overflow-hidden relative flex flex-col">
        {children}
      </main>
    </div>
  );
}
