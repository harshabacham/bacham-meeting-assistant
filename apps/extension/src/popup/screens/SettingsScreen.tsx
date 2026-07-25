import React, { useState } from 'react';
import { useConnection } from '@/shared/hooks/useConnection';
import { ArrowLeft, ExternalLink, Trash2, Pencil, Check, X } from 'lucide-react';
import { APP_NAME, NATIVE_HOST_NAME } from '@/shared/constants/app';
import { MessageType } from '@/shared/types';
import { sendToBackground } from '@/infrastructure/browser/runtime';
import logo from '@/assets/logo.png';

interface SettingsScreenProps {
  readonly version: string;
  readonly onBack: () => void;
  readonly onOpenApp?: () => void;
}

interface StoredSession {
  id: string;
  tabTitle: string;
  courseLabel?: string;
  startedAt: string;
  state: string;
}

export function SettingsScreen({ version, onBack, onOpenApp }: SettingsScreenProps): React.ReactElement {
  const { connectionStatus, pendingQueueSize } = useConnection();
  const [sessions, setSessions] = useState<StoredSession[]>(() => []);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  React.useEffect(() => {
    chrome.storage.local.get(['recentSessions'], result => {
      if (result.recentSessions) setSessions(result.recentSessions);
    });
  }, []);

  const handleDelete = async (sessionId: string) => {
    await sendToBackground({ type: MessageType.SEND_DELETE_LECTURE, payload: { lectureId: sessionId } });
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    chrome.storage.local.get(['recentSessions'], result => {
      const updated = (result.recentSessions ?? []).filter((s: StoredSession) => s.id !== sessionId);
      chrome.storage.local.set({ recentSessions: updated });
    });
  };

  const handleRename = async (sessionId: string, newTitle: string) => {
    if (!newTitle.trim()) { setRenaming(null); return; }
    await sendToBackground({ type: MessageType.SEND_RENAME_LECTURE, payload: { lectureId: sessionId, newTitle: newTitle.trim() } });
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, tabTitle: newTitle.trim() } : s));
    setRenaming(null);
  };

  const isConnected = connectionStatus === 'connected';

  return (
    <div className="flex flex-col animate-slide-up" style={{ background: 'var(--bg)', minHeight: 480 }}>
      {/* Header — iOS-style back navigation */}
      <div className="flex items-center gap-3 px-3 pt-4 pb-3.5" style={{ borderBottom: '1px solid var(--separator)' }}>
        <button
          onClick={onBack}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors -ml-1"
          style={{ color: 'var(--accent-text)', background: 'transparent' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
          <ArrowLeft size={15} style={{ strokeWidth: 2.5 }} />
          <span className="text-[14px] font-medium" style={{ letterSpacing: '-0.01em' }}>Back</span>
        </button>
        <span className="flex-1 text-center text-[15px] font-semibold -ml-10" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Settings
        </span>
        <button
          onClick={onOpenApp}
          className="flex items-center gap-1 text-[13px] font-medium transition-colors"
          style={{ color: 'var(--accent-text)' }}>
          App <ExternalLink size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

        {/* About */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div className="flex items-center px-4 py-3.5">
            <img src={logo} alt="BACHAM" className="w-9 h-9 rounded-xl object-cover mr-3.5 flex-shrink-0" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }} />
            <div className="flex-1">
              <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{APP_NAME}</p>
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Version {version}</p>
            </div>
          </div>
        </div>

        {/* Connection */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider px-1" style={{ color: 'var(--text-muted)' }}>
            Desktop App
          </p>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
            <div className="flex items-center px-4 py-3">
              {/* Status indicator */}
              <div className="w-2 h-2 rounded-full mr-3 flex-shrink-0" style={{
                background: isConnected ? 'var(--success)' : 'var(--destructive)',
                boxShadow: isConnected ? '0 0 6px var(--success)' : 'none',
              }} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium" style={{ color: isConnected ? 'var(--success)' : 'var(--text-secondary)' }}>
                  {isConnected ? 'Connected' : 'Not connected'}
                </p>
                <p className="text-[10px] mt-0.5 font-mono truncate" style={{ color: 'var(--text-muted)' }}>
                  {NATIVE_HOST_NAME}
                </p>
              </div>
              {pendingQueueSize > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0" style={{
                  background: 'var(--warning-dim)',
                  color: 'var(--warning)',
                }}>
                  {pendingQueueSize} queued
                </span>
              )}
            </div>
            {!isConnected && (
              <>
                <div style={{ height: 1, background: 'var(--separator)', marginLeft: 48 }} />
                <div className="px-4 py-2.5">
                  <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    Open the BACHAM Desktop App to establish a connection.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Recent Sessions */}
        {sessions.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider px-1" style={{ color: 'var(--text-muted)' }}>
              Recent Sessions
            </p>
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
              {sessions.slice(0, 5).map((s, idx) => (
                <div key={s.id}>
                  {idx > 0 && <div style={{ height: 1, background: 'var(--separator)', marginLeft: 16 }} />}
                  <div className="px-4 py-3">
                    {renaming === s.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') void handleRename(s.id, renameValue);
                            if (e.key === 'Escape') setRenaming(null);
                          }}
                          className="flex-1 text-[12px] px-2.5 py-1.5 rounded-lg outline-none"
                          style={{ background: 'var(--surface-2)', border: '1px solid var(--border-accent)', color: 'var(--text-primary)' }}
                        />
                        <button onClick={() => void handleRename(s.id, renameValue)} className="p-1.5 rounded-lg" style={{ color: 'var(--accent-text)', background: 'var(--accent-dim)' }}>
                          <Check size={12} />
                        </button>
                        <button onClick={() => setRenaming(null)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)', background: 'var(--surface-2)' }}>
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[12.5px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{s.tabTitle}</p>
                          {s.courseLabel && (
                            <p className="text-[10.5px] mt-0.5 truncate" style={{ color: 'var(--accent-text)' }}>{s.courseLabel}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => { setRenaming(s.id); setRenameValue(s.tabTitle); }}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: 'var(--text-muted)' }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--surface-2)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}>
                            <Pencil size={11} />
                          </button>
                          <button
                            onClick={() => void handleDelete(s.id)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: 'var(--text-muted)' }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'var(--destructive)'; e.currentTarget.style.background = 'var(--destructive-dim)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}>
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Privacy */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider px-1" style={{ color: 'var(--text-muted)' }}>
            Privacy
          </p>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
            {['All data stays on your device', 'No cloud uploads or tracking', 'Sent only to Desktop App locally'].map((text, idx) => (
              <div key={text}>
                {idx > 0 && <div style={{ height: 1, background: 'var(--separator)', marginLeft: 44 }} />}
                <div className="flex items-center px-4 py-3 gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--success-dim)' }}>
                    <Check size={10} style={{ color: 'var(--success)', strokeWidth: 2.5 }} />
                  </div>
                  <span className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
