import React, { useState, useEffect } from 'react';
import type { Session } from '@/shared/types';
import { Square, Pause, Wifi, WifiOff, Sparkles, Loader2, X, ChevronDown, MicOff, AlertCircle } from 'lucide-react';
import { useConnection } from '@/shared/hooks/useConnection';
import { MessageType } from '@/shared/types';
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

type CatchUpState = 'idle' | 'loading' | 'done' | 'error';

export function RecordingScreen({ session, onPause, onStop, isLoading, optimisticStart }: RecordingScreenProps): React.ReactElement {
  const { connectionStatus } = useConnection();
  const isConnected = connectionStatus === 'connected';

  const startMs = optimisticStart ?? new Date(session.startedAt).getTime();
  const [elapsed, setElapsed] = useState(() => Math.max(0, Date.now() - startMs - session.pausedDurationMs));
  const [catchUpState, setCatchUpState] = useState<CatchUpState>('idle');
  const [catchUpSummary, setCatchUpSummary] = useState<string | null>(null);
  const [catchUpError, setCatchUpError] = useState<string | null>(null);
  const [showCatchUp, setShowCatchUp] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Listen for mute-state changes from the content script
  useEffect(() => {
    const listener = (msg: unknown) => {
      if (
        typeof msg === 'object' && msg !== null &&
        (msg as Record<string, unknown>)['type'] === MessageType.MUTE_STATE_CHANGE
      ) {
        const payload = (msg as Record<string, unknown>)['payload'] as { muted: boolean };
        setIsMuted(payload?.muted ?? false);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.max(0, Date.now() - startMs - session.pausedDurationMs));
    }, 1000);
    return () => clearInterval(interval);
  }, [startMs, session.pausedDurationMs]);

  const [note, setNote] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Load saved note on mount
  useEffect(() => {
    chrome.storage.local.get(`note_${session.id}`, (res) => {
      if (res[`note_${session.id}`]) {
        setNote(res[`note_${session.id}`]);
      }
    });
  }, [session.id]);

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setNote(text);
    setIsTyping(true);
    
    // Save locally
    chrome.storage.local.set({ [`note_${session.id}`]: text });
    
    // Send to background to forward to desktop
    chrome.runtime.sendMessage({
      type: MessageType.LIVE_NOTE,
      payload: { text },
      sessionId: session.id
    }).catch(() => {});
  };

  useEffect(() => {
    if (isTyping) {
      const timeout = setTimeout(() => setIsTyping(false), 1000);
      return () => clearTimeout(timeout);
    }
  }, [note, isTyping]);

  const handleCatchUp = async () => {
    setCatchUpState('loading');
    setCatchUpSummary(null);
    setCatchUpError(null);
    setShowCatchUp(true);

    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.CATCHUP_REQUEST,
      }) as { success: boolean; data?: { summary: string }; error?: string };

      if (response.success && response.data?.summary) {
        setCatchUpSummary(response.data.summary);
        setCatchUpState('done');
      } else {
        setCatchUpError(response.error ?? 'Unknown error');
        setCatchUpState('error');
      }
    } catch (e) {
      setCatchUpError(String(e));
      setCatchUpState('error');
    }
  };

  const closeCatchUp = () => {
    setShowCatchUp(false);
    setCatchUpState('idle');
    setCatchUpSummary(null);
    setCatchUpError(null);
  };

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
          {/* Mute indicator */}
          {isMuted && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30">
              <MicOff size={10} className="text-amber-400" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400">Paused</span>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center gap-5 px-5 py-5">
        {/* Timer */}
        <div className="text-center flex flex-col items-center">
          <div className="font-mono font-bold tabular-nums text-[var(--text-primary)]" style={{
            fontSize: 52,
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
        <div className="flex items-center gap-1 h-8">
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

        {/* Screen capture warning */}
        {(session.captureMode === 'screen' || session.captureMode === 'walkthrough') && (
          <div className="w-full p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-amber-500">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <div className="text-[11px] font-medium leading-relaxed">
              <strong>Screen capture active.</strong> All system audio (including other tabs, music, etc.) will be recorded. For clean meeting notes, use Tab Capture instead.
            </div>
          </div>
        )}


        {/* ⚡ Catch Me Up Button */}
        <button
          onClick={() => void handleCatchUp()}
          disabled={catchUpState === 'loading'}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 12,
            border: '1px solid rgba(139, 92, 246, 0.35)',
            background: catchUpState === 'loading'
              ? 'rgba(139, 92, 246, 0.08)'
              : 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%)',
            color: '#a78bfa',
            cursor: catchUpState === 'loading' ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontSize: 13,
            fontWeight: 700,
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(8px)',
          }}
          onMouseOver={e => {
            if (catchUpState !== 'loading') {
              (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(99, 102, 241, 0.25) 100%)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(139, 92, 246, 0.6)';
            }
          }}
          onMouseOut={e => {
            if (catchUpState !== 'loading') {
              (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(139, 92, 246, 0.35)';
            }
          }}
        >
          {catchUpState === 'loading' ? (
            <>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              Analyzing conversation...
            </>
          ) : (
            <>
              <Sparkles size={14} />
              ⚡ Catch Me Up
            </>
          )}
        </button>

        {/* Notes Section */}
        <div className="w-full mt-2 flex flex-col flex-1 relative min-h-[160px]">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Live Notes</span>
            {note && (
              <span className={`text-[10px] font-medium transition-opacity duration-300 ${isTyping ? 'text-[var(--text-muted)]' : 'text-[var(--success)]'}`}>
                {isTyping ? 'Saving...' : 'Saved'}
              </span>
            )}
          </div>
          <textarea
            value={note}
            onChange={handleNoteChange}
            placeholder="Type your meeting notes here... They will be saved to your lecture automatically."
            className="flex-1 w-full p-3 text-[13px] rounded-xl bg-[var(--surface-2)] border border-[var(--border)] focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6]/30 transition-all resize-none text-[var(--text-primary)] placeholder-[var(--text-muted)]"
            style={{ outline: 'none' }}
          />
        </div>

        {/* Catch Me Up Result Card */}
        {showCatchUp && catchUpState !== 'idle' && catchUpState !== 'loading' && (
          <div style={{
            width: '100%',
            borderRadius: 12,
            border: catchUpState === 'error'
              ? '1px solid rgba(239, 68, 68, 0.3)'
              : '1px solid rgba(139, 92, 246, 0.3)',
            background: catchUpState === 'error'
              ? 'rgba(239, 68, 68, 0.06)'
              : 'rgba(139, 92, 246, 0.06)',
            overflow: 'hidden',
            animation: 'fadeSlideIn 0.3s ease',
          }}>
            {/* Card header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={12} style={{ color: '#a78bfa' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Meeting Summary
                </span>
              </div>
              <button
                onClick={closeCatchUp}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}
              >
                <X size={12} />
              </button>
            </div>

            {/* Card body */}
            <div style={{ padding: '12px 14px' }}>
              {catchUpState === 'error' ? (
                <p style={{ fontSize: 12, color: '#f87171', lineHeight: 1.6, margin: 0 }}>
                  {catchUpError}
                </p>
              ) : (
                <p style={{
                  fontSize: 12,
                  color: 'var(--text-primary)',
                  lineHeight: 1.7,
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                }}>
                  {catchUpSummary}
                </p>
              )}
            </div>

            {/* Refresh button */}
            {catchUpState === 'done' && (
              <div style={{ padding: '0 14px 10px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => void handleCatchUp()}
                  style={{
                    background: 'rgba(139, 92, 246, 0.1)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: 8,
                    color: '#a78bfa',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '4px 10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <ChevronDown size={10} />
                  Update
                </button>
              </div>
            )}
          </div>
        )}
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

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
