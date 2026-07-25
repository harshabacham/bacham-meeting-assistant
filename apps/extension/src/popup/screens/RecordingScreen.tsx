import React, { useState, useEffect } from 'react';
import type { Session } from '@/shared/types';
import { Square, Pause, Wifi, WifiOff } from 'lucide-react';
import { useConnection } from '@/shared/hooks/useConnection';
import logo from '@/assets/logo.png';

interface RecordingScreenProps {
  readonly session: Session;
  readonly onPause: () => Promise<void>;
  readonly onStop: () => Promise<void>;
  readonly isLoading: boolean;
  readonly optimisticStart?: number | undefined;
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

const bars = [0, 0.12, 0.24, 0.18, 0.06, 0.3, 0.12, 0.22, 0.08];

export function RecordingScreen({ session, onPause, onStop, isLoading, optimisticStart }: RecordingScreenProps): React.ReactElement {
  const { connectionStatus } = useConnection();
  const isConnected = connectionStatus === 'connected';

  const startMs = optimisticStart ?? new Date(session.startedAt).getTime();
  const [elapsed, setElapsed] = useState(() => Math.max(0, Date.now() - startMs - session.pausedDurationMs));

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.max(0, Date.now() - startMs - session.pausedDurationMs));
    }, 1000);
    return () => clearInterval(interval);
  }, [startMs, session.pausedDurationMs]);

  return (
    <div className="flex flex-col bg-[var(--bg)] min-h-[480px]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--separator)] bg-[var(--bg)]">
        <div className="flex items-center gap-3">
          <img src={logo} alt="BACHAM" className="w-7 h-7 rounded-md object-cover" />
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)]">
            <span className="w-2 h-2 rounded-full bg-[var(--recording)]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--recording)]">
              REC
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Connection pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)]">
            {isConnected
              ? <Wifi size={10} className="text-[var(--success)]" />
              : <WifiOff size={10} className="text-[var(--text-muted)]" />
            }
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-5 py-6">
        {/* Timer */}
        <div className="text-center flex flex-col items-center">
          <div className="font-mono font-bold tabular-nums text-[var(--text-primary)]" style={{
            fontSize: 56,
            letterSpacing: '-0.04em',
            lineHeight: 1,
          }}>
            {formatTime(elapsed)}
          </div>
          <div className="mt-2 text-[11px] font-bold text-[var(--text-secondary)] tracking-widest uppercase">
            Session Time
          </div>
        </div>

        {/* Waveform */}
        <div className="flex items-center gap-1 h-8 my-2">
          {bars.map((delay, i) => (
            <div key={i} style={{
              width: 4,
              height: 28,
              borderRadius: 99,
              background: 'var(--recording)',
              opacity: 0.6 + (i % 3) * 0.13,
              animation: `waveform 0.9s ease-in-out infinite`,
              animationDelay: `${delay}s`,
            }} />
          ))}
        </div>

        {/* Tab info */}
        <div className="w-full p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
          {session.courseLabel && (
            <div className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[var(--surface-3)] text-[var(--text-primary)] border border-[var(--border-strong)] mb-2">
              {session.courseLabel}
            </div>
          )}
          <p className="text-[13px] font-bold truncate text-[var(--text-primary)]" title={session.tabTitle}>
            {session.tabTitle || "Recording Screen"}
          </p>
          <p className="text-[11px] mt-1 truncate text-[var(--text-secondary)]" title={session.tabUrl}>
            {session.tabUrl || "Entire Desktop"}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="px-5 pb-5 pt-3 flex gap-3 bg-[var(--bg)] border-t border-[var(--separator)]">
        <button
          onClick={() => void onPause()}
          disabled={isLoading}
          className="flex-1 py-3.5 rounded-lg font-bold text-[13px] flex items-center justify-center gap-2 bg-[var(--surface)] border border-[var(--border-strong)] text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-colors"
        >
          <Pause size={14} />
          Pause
        </button>
        <button
          onClick={() => void onStop()}
          disabled={isLoading}
          className="flex-1 py-3.5 rounded-lg font-bold text-[13px] flex items-center justify-center gap-2 bg-[var(--recording)] text-white hover:opacity-90 transition-opacity border border-transparent"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Square size={14} fill="currentColor" />
              Stop Recording
            </>
          )}
        </button>
      </div>
    </div>
  );
}
