import React from 'react';
import { AlertCircle, RotateCcw, Trash2 } from 'lucide-react';
import logo from '@/assets/logo.png';

interface ErrorScreenProps {
  readonly errorMessage: string;
  readonly onReset: () => Promise<void>;
  readonly onDiscard: () => Promise<void>;
  readonly isLoading: boolean;
}

export function ErrorScreen({ errorMessage, onReset, onDiscard, isLoading }: ErrorScreenProps): React.ReactElement {
  return (
    <div className="flex flex-col animate-slide-up" style={{ background: 'var(--bg)', minHeight: 360 }}>
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3.5" style={{ borderBottom: '1px solid var(--separator)' }}>
        <img src={logo} alt="BACHAM" className="w-6 h-6 rounded-md object-cover" />
        <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>BACHAM</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-5 text-center py-8">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{
          background: 'var(--destructive-dim)',
          border: '1px solid rgba(255,69,58,0.2)',
        }}>
          <AlertCircle size={22} style={{ color: 'var(--destructive)' }} />
        </div>
        <div className="space-y-1.5 max-w-xs">
          <h2 className="text-[16px] font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Something went wrong
          </h2>
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }} role="alert">
            {errorMessage}
          </p>
        </div>
      </div>

      <div className="px-4 pb-5 pt-2 space-y-2" style={{ borderTop: '1px solid var(--separator)' }}>
        <button
          id="reset-session-btn"
          onClick={() => void onReset()}
          disabled={isLoading}
          className="btn-apple w-full gap-2"
          style={{
            height: 44,
            background: 'var(--accent)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 590,
            opacity: isLoading ? 0.7 : 1,
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}>
          {isLoading
            ? <div className="w-4 h-4 border-2 rounded-full border-white/30 border-t-white" style={{ animation: 'spin 0.75s linear infinite' }} />
            : <RotateCcw size={13} />
          }
          Reset & Try Again
        </button>
        <button
          id="discard-session-btn"
          onClick={() => void onDiscard()}
          disabled={isLoading}
          className="btn-apple w-full gap-2"
          style={{
            height: 38,
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            fontSize: 12,
            fontWeight: 500,
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--destructive)'; e.currentTarget.style.borderColor = 'rgba(255,69,58,0.3)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
          <Trash2 size={12} />
          Discard Session
        </button>
      </div>
    </div>
  );
}
