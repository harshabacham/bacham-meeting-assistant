import React from 'react';
import { ShieldCheck, Mic, MonitorPlay } from 'lucide-react';
import logo from '@/assets/logo.png';

interface PermissionRequestScreenProps {
  readonly onRequest: () => Promise<boolean>;
  readonly isRequesting: boolean;
}

export function PermissionRequestScreen({ onRequest, isRequesting }: PermissionRequestScreenProps): React.ReactElement {
  return (
    <div className="flex flex-col h-full animate-slide-up" style={{ background: 'var(--bg)' }}>
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <img src={logo} alt="BACHAM" className="w-7 h-7 rounded-lg object-cover" />
        <p className="text-[14px] font-bold" style={{ color: 'var(--text-primary)' }}>BACHAM</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-5 text-center">
        {isRequesting ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
            <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Waiting for permission…</p>
          </div>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-accent)' }}>
              <ShieldCheck size={28} style={{ color: 'var(--accent)' }} />
            </div>
            <div className="space-y-2 max-w-xs">
              <h2 className="text-[16px] font-bold" style={{ color: 'var(--text-primary)' }}>Permissions Required</h2>
              <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                BACHAM needs these permissions to capture your lecture:
              </p>
            </div>
            <div className="w-full space-y-2">
              {[
                { icon: Mic, label: 'Tab Audio Capture', desc: 'Record audio from the active browser tab' },
                { icon: MonitorPlay, label: 'Tab Capture', desc: 'Record video and screenshots of the active tab' },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-3 p-3 rounded-xl text-left" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-dim)' }}>
                    <Icon size={13} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              No data is sent to any server. All content goes only to your BACHAM Desktop App.
            </p>
          </>
        )}
      </div>

      {!isRequesting && (
        <div className="px-4 pb-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            id="grant-permissions-btn"
            onClick={() => void onRequest()}
            className="w-full flex items-center justify-center gap-2 rounded-xl font-semibold text-[14px]"
            style={{
              height: 46,
              background: 'var(--accent)',
              color: '#000',
              border: 'none',
              boxShadow: '0 0 20px rgba(166,255,0,0.15)',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 32px rgba(166,255,0,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 20px rgba(166,255,0,0.15)'; }}
          >
            <ShieldCheck size={16} />
            Grant Permissions
          </button>
        </div>
      )}
    </div>
  );
}
