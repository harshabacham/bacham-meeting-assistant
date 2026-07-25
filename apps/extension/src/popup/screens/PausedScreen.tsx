import React from 'react';
import type { Session } from '@/shared/types';
import { Play, Square } from 'lucide-react';
import logo from '@/assets/logo.png';

interface PausedScreenProps {
  readonly session: Session;
  readonly onResume: () => Promise<void>;
  readonly onStop: () => Promise<void>;
  readonly isLoading: boolean;
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function PausedScreen({ session, onResume, onStop, isLoading }: PausedScreenProps): React.ReactElement {
  const elapsed = Math.max(0, Date.now() - new Date(session.startedAt).getTime() - session.pausedDurationMs);

  return (
    <div className="flex flex-col animate-slide-up" style={{ background: 'var(--bg)', minHeight: 400 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3.5" style={{ borderBottom: '1px solid var(--separator)' }}>
        <div className="flex items-center gap-2">
          <img src={logo} alt="BACHAM" className="w-6 h-6 rounded-md object-cover" />
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{
            background: 'var(--warning-dim)',
            border: '1px solid rgba(255,159,10,0.2)',
          }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--warning)' }} />
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--warning)' }}>
              Paused
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-5 py-8">
        {/* Timer — dimmed when paused */}
        <div className="text-center">
          <div className="font-mono font-bold tabular-nums" style={{
            fontSize: 56,
            color: 'var(--text-primary)',
            letterSpacing: '-0.04em',
            lineHeight: 1,
            opacity: 0.35,
          }}>
            {formatTime(elapsed)}
          </div>
          <p className="text-[11px] mt-1.5 font-medium" style={{ color: 'var(--warning)' }}>Recording paused</p>
        </div>

        {/* Session info card */}
        <div className="w-full glass-card px-3.5 py-3">
          {session.courseLabel && (
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 truncate" style={{ color: 'var(--warning)' }}>
              {session.courseLabel}
            </p>
          )}
          <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {session.tabTitle}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 pb-5 pt-2 flex gap-2" style={{ borderTop: '1px solid var(--separator)' }}>
        <button
          id="resume-btn"
          onClick={() => void onResume()}
          disabled={isLoading}
          className="btn-apple gap-1.5"
          style={{
            flex: 2,
            height: 44,
            background: 'var(--accent)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 590,
            boxShadow: '0 0 20px rgba(10,132,255,0.3)',
            opacity: isLoading ? 0.7 : 1,
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={e => { if (!isLoading) e.currentTarget.style.boxShadow = '0 0 28px rgba(10,132,255,0.5)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 20px rgba(10,132,255,0.3)'; }}>
          {isLoading
            ? <div className="w-4 h-4 border-2 rounded-full border-white/30 border-t-white" style={{ animation: 'spin 0.75s linear infinite' }} />
            : <Play size={13} style={{ fill: '#fff', strokeWidth: 0 }} />
          }
          Resume
        </button>
        <button
          id="stop-from-paused-btn"
          onClick={() => void onStop()}
          disabled={isLoading}
          className="btn-apple flex-1 gap-1.5"
          style={{
            height: 44,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            fontSize: 13,
            fontWeight: 500,
            opacity: isLoading ? 0.5 : 1,
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}>
          <Square size={12} />
          Stop
        </button>
      </div>
    </div>
  );
}
