import React, { useState } from 'react';
import type { StartSessionIntent, CaptureConfig } from '@/shared/types';
import { useConnection } from '@/shared/hooks/useConnection';
import { useCapture } from '@/shared/hooks/useCapture';
import { Mic, Video, Camera, AlertCircle, Wifi, WifiOff, AppWindow, Image as ImageIcon } from 'lucide-react';
import logo from '@/assets/logo.png';

interface IdleScreenProps {
  readonly onStart: (intent: StartSessionIntent) => Promise<void>;
  readonly isLoading: boolean;
  readonly onOpenApp?: () => void;
}

export function IdleScreen({ onStart, isLoading, onOpenApp }: IdleScreenProps): React.ReactElement {
  const [courseLabel, setCourseLabel] = useState('');
  const { connectionStatus } = useConnection();
  const { captureConfig, updateConfig } = useCapture();

  const handleStart = async (): Promise<void> => {
    const intent: StartSessionIntent = {
      captureAudio: captureConfig.audio,
      captureVideo: captureConfig.video,
      ...(captureConfig.captureMode !== undefined ? { captureMode: captureConfig.captureMode } : {}),
      ...(captureConfig.screenshotIntervalMs !== undefined ? { screenshotIntervalMs: captureConfig.screenshotIntervalMs } : {}),
      ...(courseLabel.trim() ? { courseLabel: courseLabel.trim() } : {}),
    };
    await onStart(intent);
  };

  const toggle = (key: keyof CaptureConfig) => {
    if (key === 'screenshotIntervalMs') {
      if (captureConfig.screenshotIntervalMs !== undefined) {
        const { screenshotIntervalMs: _r, ...rest } = captureConfig;
        void _r;
        void updateConfig(rest);
      } else {
        void updateConfig({ ...captureConfig, screenshotIntervalMs: 30000 });
      }
    } else {
      void updateConfig({ ...captureConfig, [key]: !captureConfig[key] });
    }
  };

  const isConnected = connectionStatus === 'connected';
  const canStart = isConnected && (captureConfig.audio || captureConfig.video || captureConfig.screenshotIntervalMs !== undefined);
  return (
    <div className="flex flex-col bg-[var(--bg)] min-h-[480px]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--separator)] bg-[var(--bg)]">
        <div className="flex items-center gap-3">
          <img src={logo} alt="BACHAM" className="w-7 h-7 rounded-md object-cover" />
          <div>
            <p className="text-[14px] font-bold text-[var(--text-primary)] tracking-tight leading-none">BACHAM</p>
            <p className="text-[10px] mt-0.5 font-medium text-[var(--text-secondary)] uppercase">Capture</p>
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
          {onOpenApp && (
            <button
              onClick={onOpenApp}
              title="Open Workspace"
              className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] border border-transparent transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <AppWindow size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-5 py-6 space-y-6 overflow-y-auto">
        {/* Offline Warning */}
        {!isConnected && (
          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-[var(--warning)]" />
            <div className="flex-1">
              <p className="text-[12px] font-bold text-[var(--text-primary)]">Desktop App Disconnected</p>
              <p className="text-[11px] mt-0.5 text-[var(--text-secondary)] mb-2">
                Please open the BACHAM app to enable recording.
              </p>
              <button 
                onClick={() => chrome.runtime.sendMessage({ type: 'RETRY_CONNECTION' })}
                className="text-[10px] font-bold uppercase tracking-wider bg-[var(--bg)] px-3 py-1.5 rounded-md hover:bg-[var(--surface-hover)] border border-[var(--border)] transition-colors text-[var(--text-primary)]"
              >
                Retry Connection
              </button>
            </div>
          </div>
        )}

        {/* Course Label Input */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase text-[var(--text-secondary)] tracking-wide">
            Session Context
          </label>
          <input
            type="text"
            placeholder="e.g. System Design..."
            value={courseLabel}
            onChange={e => setCourseLabel(e.target.value)}
            className="w-full px-4 py-3 text-[13px] rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>

        {/* Toggles List */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase text-[var(--text-secondary)] tracking-wide">
            Capture Sources
          </label>
          <div className="flex flex-col rounded-lg bg-[var(--bg)] border border-[var(--border)] overflow-hidden">
            {/* Audio Toggle */}
            <div className="flex items-center justify-between p-3.5 border-b border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition-colors">
              <div className="flex items-center gap-3">
                <Mic size={16} className={captureConfig.audio ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'} />
                <span className="text-[13px] font-bold text-[var(--text-primary)]">Audio</span>
              </div>
              <button 
                onClick={() => toggle('audio')} 
                className="toggle-switch" 
                data-state={captureConfig.audio ? "checked" : "unchecked"}
              >
                <span className="toggle-switch-thumb"></span>
              </button>
            </div>

            {/* Video Toggle */}
            <div className="flex items-center justify-between p-3.5 border-b border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition-colors">
              <div className="flex items-center gap-3">
                <Camera size={16} className={captureConfig.video ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'} />
                <span className="text-[13px] font-bold text-[var(--text-primary)]">Video</span>
              </div>
              <button 
                onClick={() => toggle('video')} 
                className="toggle-switch" 
                data-state={captureConfig.video ? "checked" : "unchecked"}
              >
                <span className="toggle-switch-thumb"></span>
              </button>
            </div>

            {/* Screenshots Toggle */}
            <div className="flex flex-col border-b border-[var(--separator)]">
              <div className="flex items-center justify-between p-3.5 bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition-colors">
                <div className="flex items-center gap-3">
                  <ImageIcon size={16} className={!!captureConfig.screenshotIntervalMs ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'} />
                  <span className="text-[13px] font-bold text-[var(--text-primary)]">Screenshots</span>
                </div>
                <button 
                  onClick={() => toggle('screenshotIntervalMs')} 
                  className="toggle-switch" 
                  data-state={!!captureConfig.screenshotIntervalMs ? "checked" : "unchecked"}
                >
                  <span className="toggle-switch-thumb"></span>
                </button>
              </div>
              
              {!!captureConfig.screenshotIntervalMs && (
                <div className="px-11 py-2 pb-4 bg-[var(--surface)] flex items-center gap-2">
                  <span className="text-[12px] text-[var(--text-muted)]">Take a screenshot every</span>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={Math.floor(captureConfig.screenshotIntervalMs / 1000)}
                    onChange={(e) => {
                      const seconds = Math.max(5, Number(e.target.value));
                      void updateConfig({ ...captureConfig, screenshotIntervalMs: seconds * 1000 });
                    }}
                    className="w-16 px-2 py-1 bg-[var(--bg)] border border-[var(--separator)] rounded text-[12px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                  <span className="text-[12px] text-[var(--text-muted)]">seconds</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="px-5 pb-5 pt-3 bg-[var(--bg)] border-t border-[var(--separator)]">
        <button
          onClick={handleStart}
          disabled={!canStart || isLoading}
          className={`w-full py-3.5 rounded-lg font-bold text-[14px] flex items-center justify-center gap-2 transition-colors ${
            canStart 
              ? 'bg-[var(--accent)] text-[var(--accent-text)] hover:bg-[var(--accent-hover)]' 
              : 'bg-[var(--surface)] text-[var(--text-muted)] cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-[var(--accent-text)]/30 border-t-[var(--accent-text)] rounded-full animate-spin" />
          ) : (
            <>
              <Video size={16} />
              <span>Start Recording</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
