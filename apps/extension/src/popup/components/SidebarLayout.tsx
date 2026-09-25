import React from 'react';

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  return (
    <div className="flex flex-col h-full w-full bg-[var(--bg)] text-[var(--text-primary)] font-sans overflow-hidden">
      {/* Full Height Main Screen — BACHAM Theme */}
      <main className="flex-1 overflow-hidden relative flex flex-col bg-[var(--bg)] text-[var(--text-primary)]">
        {children}
      </main>
    </div>
  );
}
