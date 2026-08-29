import React, { useState, useEffect } from 'react';
import type { StartSessionIntent } from '@/shared/types';
import { useConnection } from '@/shared/hooks/useConnection';
import { useCapture } from '@/shared/hooks/useCapture';
import { Mic, Video, AlertCircle, Wifi, WifiOff, AppWindow, Image as ImageIcon, ShieldCheck, Monitor, Layers, Volume2 } from 'lucide-react';
import logo from '@/assets/logo.png';

interface IdleScreenProps {
  readonly onStart: (intent: StartSessionIntent) => Promise<void>;
  readonly isLoading: boolean;
  readonly onOpenApp?: () => void;
}

export function IdleScreen({ onStart, isLoading, onOpenApp }: IdleScreenProps): React.ReactElement {
  const [courseLabel, setCourseLabel] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [hasStoredConsent, setHasStoredConsent] = useState(false);

  const { connectionStatus } = useConnection();
  const { captureConfig, updateConfig } = useCapture();

  // Load persistent consent state
  useEffect(() => {
    chrome.storage.local.get(['privacy_consent_accepted'], (res) => {
      if (res.privacy_consent_accepted) {
        setConsentAccepted(true);
        setHasStoredConsent(true);
      }
    });
  }, []);

  const currentMode = captureConfig.captureMode ?? (captureConfig.video ? 'tab' : 'audio');

  const setCaptureMode = (mode: 'tab' | 'screen' | 'audio') => {
    if (mode === 'audio') {
      void updateConfig({
        ...captureConfig,
        captureMode: 'audio',
        audio: true,
        video: false,
      });
    } else if (mode === 'screen') {
      void updateConfig({
        ...captureConfig,
        captureMode: 'screen',
        audio: true,
        video: true,
      });
    } else {
      void updateConfig({
        ...captureConfig,
        captureMode: 'tab',
        audio: true,
        video: true,
      });
    }
  };

  const handleStart = async (): Promise<void> => {
    if (!consentAccepted) return;

    // Save consent
    if (!hasStoredConsent) {
      void chrome.storage.local.set({ privacy_consent_accepted: true });
      setHasStoredConsent(true);
    }

    const isAudioOnly = currentMode === 'audio';
    const isScreen = currentMode === 'screen';

    // 1. Get the target tab
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab?.id) {
      return;
    }

    let streamId: string | undefined;
    let streamHasAudio = true;

    if (isScreen) {
      const res = await new Promise<{ id?: string; hasAudio?: boolean }>((resolve) => {
        chrome.desktopCapture.chooseDesktopMedia(['screen', 'window', 'tab', 'audio'], tab, (id, opts) => {
          if (chrome.runtime.lastError || !id) {
            resolve({});
          } else {
            resolve({ id, hasAudio: opts?.canRequestAudioTrack });
          }
        });
      });
      streamId = res.id;
      streamHasAudio = res.hasAudio ?? false;
    } else {
      streamId = await new Promise<string | undefined>((resolve) => {
        chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id }, (id) => {
          if (chrome.runtime.lastError || !id) {
            resolve(undefined);
          } else {
            resolve(id);
          }
        });
      });
    }

    if (!streamId) {
      return; // User canceled or capture failed
    }

    const intent: StartSessionIntent = {
      captureAudio: true,
      captureVideo: !isAudioOnly,
      includeMicrophone: !!captureConfig.includeMicrophone,
      captureMode: currentMode,
      streamId,
      streamHasAudio,
      ...(captureConfig.screenshotIntervalMs !== undefined && !isAudioOnly
        ? { screenshotIntervalMs: captureConfig.screenshotIntervalMs }
        : {}),
      ...(courseLabel.trim() ? { courseLabel: courseLabel.trim() } : {}),
    };
    await onStart(intent);
  };

  const isConnected = connectionStatus === 'connected';
  const canStart = isConnected && consentAccepted;

  return (
    <div className="flex flex-col bg-[var(--bg)] min-h-[480px]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--separator)] bg-[var(--bg)]">
        <div className="flex items-center gap-3">
          <img src={logo} alt="BACHAM" className="w-7 h-7 rounded-md object-cover" />
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[14px] font-bold text-[var(--text-primary)] tracking-tight leading-none">BACHAM</p>
              <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-[var(--surface-hover)] text-[var(--text-secondary)] border border-[var(--border)] uppercase">Local</span>
            </div>
            <p className="text-[10px] mt-0.5 font-medium text-[var(--text-secondary)] uppercase">Capture Bridge</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Connection pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)]" title={isConnected ? 'Connected to local desktop app' : 'Desktop app disconnected'}>
            {isConnected
              ? <Wifi size={11} className="text-[var(--success)]" />
              : <WifiOff size={11} className="text-[var(--text-muted)]" />
            }
            <span className="text-[10px] font-semibold text-[var(--text-secondary)]">
              {isConnected ? 'Ready' : 'Offline'}
            </span>
          </div>
          {onOpenApp && (
            <button
              onClick={onOpenApp}
              title="Open Desktop App"
              className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] border border-transparent transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <AppWindow size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-5 py-5 space-y-5 overflow-y-auto">
        {/* Offline Warning */}
        {!isConnected && (
          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-[var(--warning)]" />
            <div className="flex-1">
              <p className="text-[12px] font-bold text-[var(--text-primary)]">Desktop App Disconnected</p>
              <p className="text-[11px] mt-0.5 text-[var(--text-secondary)] mb-2">
                Please launch the BACHAM desktop application to start recording.
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

        {/* Capture Mode Selector */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase text-[var(--text-secondary)] tracking-wide">
            Capture Target
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
            <button
              type="button"
              onClick={() => setCaptureMode('tab')}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-md text-[11px] font-bold transition-all ${
                currentMode === 'tab'
                  ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              <Layers size={14} className="mb-1" />
              <span>Current Tab</span>
            </button>

            <button
              type="button"
              onClick={() => setCaptureMode('screen')}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-md text-[11px] font-bold transition-all ${
                currentMode === 'screen'
                  ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              <Monitor size={14} className="mb-1" />
              <span>Screen / Window</span>
            </button>

            <button
              type="button"
              onClick={() => setCaptureMode('audio')}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-md text-[11px] font-bold transition-all ${
                currentMode === 'audio'
                  ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              <Volume2 size={14} className="mb-1" />
              <span>Audio Only</span>
            </button>
          </div>
        </div>

        {/* Course / Meeting Label Input */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase text-[var(--text-secondary)] tracking-wide">
            Meeting Title / Subject
          </label>
          <input
            type="text"
            placeholder="e.g. System Design, Product Sync..."
            value={courseLabel}
            onChange={e => setCourseLabel(e.target.value)}
            className="w-full px-3.5 py-2.5 text-[13px] rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>

        {/* Audio & Video Options */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase text-[var(--text-secondary)] tracking-wide">
            Audio & Snapshots
          </label>
          <div className="flex flex-col rounded-lg bg-[var(--bg)] border border-[var(--border)] overflow-hidden">
            {/* Microphone Toggle */}
            <div className="flex items-center justify-between p-3 border-b border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition-colors">
              <div className="flex items-center gap-2.5">
                <Mic size={15} className={captureConfig.includeMicrophone ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'} />
                <div>
                  <span className="text-[12px] font-bold text-[var(--text-primary)] block leading-tight">Include Microphone</span>
                  <span className="text-[10px] text-[var(--text-secondary)]">Mix your voice with meeting audio</span>
                </div>
              </div>
              <button 
                onClick={() => updateConfig({ ...captureConfig, includeMicrophone: !captureConfig.includeMicrophone })} 
                className="toggle-switch" 
                data-state={captureConfig.includeMicrophone ? "checked" : "unchecked"}
              >
                <span className="toggle-switch-thumb"></span>
              </button>
            </div>

            {/* Screenshots Toggle (only if not audio only) */}
            {currentMode !== 'audio' && (
              <div className="flex flex-col">
                <div className="flex items-center justify-between p-3 bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition-colors">
                  <div className="flex items-center gap-2.5">
                    <ImageIcon size={15} className={!!captureConfig.screenshotIntervalMs ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'} />
                    <div>
                      <span className="text-[12px] font-bold text-[var(--text-primary)] block leading-tight">Capture Snapshots</span>
                      <span className="text-[10px] text-[var(--text-secondary)]">Extract visual context for AI summaries</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      if (captureConfig.screenshotIntervalMs !== undefined) {
                        const { screenshotIntervalMs: _, ...rest } = captureConfig;
                        void updateConfig(rest);
                      } else {
                        void updateConfig({ ...captureConfig, screenshotIntervalMs: 30000 });
                      }
                    }} 
                    className="toggle-switch" 
                    data-state={!!captureConfig.screenshotIntervalMs ? "checked" : "unchecked"}
                  >
                    <span className="toggle-switch-thumb"></span>
                  </button>
                </div>
                
                {!!captureConfig.screenshotIntervalMs && (
                  <div className="px-10 py-2 pb-3 bg-[var(--surface)] flex items-center gap-2 border-t border-[var(--border)]/50">
                    <span className="text-[11px] text-[var(--text-secondary)]">Every</span>
                    <input
                      type="number"
                      min="5"
                      step="5"
                      value={Math.floor(captureConfig.screenshotIntervalMs / 1000)}
                      onChange={(e) => {
                        const seconds = Math.max(5, Number(e.target.value));
                        void updateConfig({ ...captureConfig, screenshotIntervalMs: seconds * 1000 });
                      }}
                      className="w-14 px-2 py-0.5 bg-[var(--bg)] border border-[var(--separator)] rounded text-[11px] font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] text-center"
                    />
                    <span className="text-[11px] text-[var(--text-secondary)]">seconds</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Consent Checkbox */}
        <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-start gap-2.5">
          <input
            type="checkbox"
            id="consent-checkbox"
            checked={consentAccepted}
            onChange={(e) => setConsentAccepted(e.target.checked)}
            className="mt-0.5 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
          />
          <label htmlFor="consent-checkbox" className="text-[11px] text-[var(--text-secondary)] leading-relaxed cursor-pointer select-none">
            I am responsible for informing meeting participants and obtaining consent where required by law.
          </label>
        </div>

        {/* Privacy Note */}
        <div className="flex items-center gap-2 px-1 text-[11px] text-[var(--text-muted)]">
          <ShieldCheck size={14} className="shrink-0 text-[var(--success)]" />
          <span>Local only — 100% private to your computer (127.0.0.1)</span>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="px-5 pb-5 pt-3 bg-[var(--bg)] border-t border-[var(--separator)]">
        <button
          onClick={handleStart}
          disabled={!canStart || isLoading}
          className={`w-full py-3 rounded-lg font-bold text-[13px] flex items-center justify-center gap-2 transition-colors ${
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
              <span>Start Private Capture</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
