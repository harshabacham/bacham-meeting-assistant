import React from 'react';
import logo from '@/assets/logo.png';

export function ConnectingScreen(): React.ReactElement {
  return (
    <div className="flex flex-col h-full animate-fade-in" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <img src={logo} alt="BACHAM" className="w-7 h-7 rounded-lg object-cover" />
        <p className="text-[14px] font-bold" style={{ color: 'var(--text-primary)' }}>BACHAM</p>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center gap-5">
        {/* Spinner ring */}
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-2 border-transparent"
            style={{ borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite' }} />
          <div className="absolute inset-2 rounded-full" style={{ background: 'var(--accent-dim)' }} />
          <img src={logo} alt="" className="absolute inset-3 rounded object-cover" />
        </div>
        <div className="text-center">
          <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Waiting for selection…</p>
          <p className="text-[12px] mt-1 px-4" style={{ color: 'var(--text-muted)' }}>Please select a tab or screen in the native browser pop-up to begin.</p>
        </div>
      </div>
    </div>
  );
}
