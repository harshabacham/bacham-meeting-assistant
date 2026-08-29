import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { StartSessionIntent } from '@/shared/types';
import { useConnection } from '@/shared/hooks/useConnection';
import { useCapture } from '@/shared/hooks/useCapture';
import {
  Mic,
  Video,
  AlertCircle,
  Wifi,
  WifiOff,
  AppWindow,
  Image as ImageIcon,
  ShieldCheck,
  Monitor,
  Layers,
  Volume2,
  Sparkles,
  Zap,
} from 'lucide-react';
import { MascotAvatar, MascotMood } from '@/content/components/MascotAvatar';

interface IdleScreenProps {
  readonly onStart: (intent: StartSessionIntent) => Promise<void>;
  readonly isLoading: boolean;
  readonly onOpenApp?: () => void;
}

export function IdleScreen({ onStart, isLoading, onOpenApp }: IdleScreenProps): React.ReactElement {
  const [courseLabel, setCourseLabel] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [hasStoredConsent, setHasStoredConsent] = useState(false);
  const [mascotMood, setMascotMood] = useState<MascotMood>('happy');

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
    setMascotMood('thinking');
    setTimeout(() => setMascotMood('happy'), 1000);

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

    setMascotMood('recording');

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
      setMascotMood('happy');
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
      setMascotMood('happy');
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
    <div className="flex flex-col h-full bg-[var(--bg)] font-sans select-none overflow-y-auto">
      {/* 🤖 Cartoon Mascot Top Hero Header */}
      <div className="px-5 pt-5 pb-4 border-b border-[var(--separator)] bg-gradient-to-b from-indigo-950/40 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MascotAvatar mood={mascotMood} size={44} />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[16px] font-extrabold tracking-tight text-white flex items-center gap-1.5">
                  <span>Bacham Copilot</span>
                </h1>
                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-sm">
                  AI 1.5
                </span>
              </div>
              <p className="text-[11px] text-indigo-300/80 font-semibold mt-0.5">
                Local-First Meeting Intelligence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Connection pill */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10.5px] font-bold backdrop-blur-md ${
                isConnected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
              title={isConnected ? 'Connected to local desktop app' : 'Desktop app offline'}
            >
              {isConnected ? <Wifi size={12} className="animate-pulse" /> : <WifiOff size={12} />}
              <span>{isConnected ? 'Bridge Ready' : 'App Offline'}</span>
            </div>

            {onOpenApp && (
              <button
                onClick={onOpenApp}
                title="Open Desktop App"
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all active:scale-95"
              >
                <AppWindow size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Speech Bubble Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-2.5 rounded-2xl bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-transparent border border-indigo-500/20 text-[11.5px] text-slate-200 font-medium flex items-center gap-2 shadow-inner"
        >
          <Sparkles size={14} className="text-indigo-400 shrink-0" />
          <span>Select capture source & start your AI meeting assistant! 🚀</span>
        </motion.div>
      </div>

      {/* Main Form Body */}
      <div className="flex-1 px-5 py-4 space-y-4">
        {/* Offline Warning */}
        {!isConnected && (
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200">
            <AlertCircle size={17} className="mt-0.5 shrink-0 text-rose-400" />
            <div className="flex-1">
              <p className="text-[12px] font-bold text-white">Companion App Disconnected</p>
              <p className="text-[11px] text-rose-200/80 mt-0.5 mb-2 leading-relaxed">
                Please launch the BACHAM desktop application on your computer.
              </p>
              <button
                onClick={() => chrome.runtime.sendMessage({ type: 'RETRY_CONNECTION' })}
                className="text-[10.5px] font-extrabold uppercase tracking-wider bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-white px-3 py-1.5 rounded-xl transition-all"
              >
                Retry Connection
              </button>
            </div>
          </div>
        )}

        {/* Capture Mode Selector (Segmented 3D Cards) */}
        <div className="space-y-1.5">
          <label className="text-[10.5px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1">
            <Zap size={11} className="text-indigo-400" />
            <span>Capture Target</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'tab', label: 'Current Tab', desc: 'Browser tab', icon: Layers },
              { id: 'screen', label: 'Screen / Win', desc: 'Presentation', icon: Monitor },
              { id: 'audio', label: 'Audio Only', desc: 'Voice note', icon: Volume2 },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = currentMode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCaptureMode(item.id as any)}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-200 text-center relative overflow-hidden ${
                    isActive
                      ? 'bg-gradient-to-b from-indigo-500/25 to-purple-500/15 border-indigo-500 text-white shadow-lg shadow-indigo-500/20 scale-[1.02]'
                      : 'bg-slate-800/40 border-white/10 text-slate-400 hover:text-white hover:bg-slate-800/70 hover:border-white/20'
                  }`}
                >
                  <Icon size={18} className={`mb-1.5 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span className="text-[11.5px] font-bold leading-tight">{item.label}</span>
                  <span className="text-[9.5px] text-slate-400 mt-0.5">{item.desc}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activePill"
                      className="absolute inset-0 bg-indigo-500/10 pointer-events-none rounded-2xl"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Meeting Title / Subject Input */}
        <div className="space-y-1.5">
          <label className="text-[10.5px] font-extrabold uppercase text-slate-400 tracking-wider">
            Meeting Subject / Title
          </label>
          <input
            type="text"
            placeholder="e.g. Q3 Roadmap, Engineering Sync..."
            value={courseLabel}
            onChange={(e) => setCourseLabel(e.target.value)}
            className="w-full px-3.5 py-2.5 text-[12.5px] rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 focus:bg-slate-800/80 transition-all"
          />
        </div>

        {/* Audio & Video Controls (Glassmorphic Card) */}
        <div className="space-y-1.5">
          <label className="text-[10.5px] font-extrabold uppercase text-slate-400 tracking-wider">
            Audio & Snapshots
          </label>
          <div className="flex flex-col rounded-2xl bg-slate-800/40 border border-white/10 overflow-hidden backdrop-blur-md">
            {/* Microphone Mix Toggle */}
            <div className="flex items-center justify-between p-3 border-b border-white/10 hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${captureConfig.includeMicrophone ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700/40 text-slate-500'}`}>
                  <Mic size={16} />
                </div>
                <div>
                  <span className="text-[12px] font-bold text-white block leading-tight">Include Microphone</span>
                  <span className="text-[10px] text-slate-400">Mix your voice with meeting audio</span>
                </div>
              </div>
              <button
                onClick={() => updateConfig({ ...captureConfig, includeMicrophone: !captureConfig.includeMicrophone })}
                className="toggle-switch"
                data-state={captureConfig.includeMicrophone ? 'checked' : 'unchecked'}
              >
                <span className="toggle-switch-thumb" />
              </button>
            </div>

            {/* Screenshots / Slides Toggle */}
            {currentMode !== 'audio' && (
              <div className="flex flex-col">
                <div className="flex items-center justify-between p-3 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${captureConfig.screenshotIntervalMs ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-700/40 text-slate-500'}`}>
                      <ImageIcon size={16} />
                    </div>
                    <div>
                      <span className="text-[12px] font-bold text-white block leading-tight">Auto Slide Snapshots</span>
                      <span className="text-[10px] text-slate-400">Visual context for AI summary reel</span>
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
                    data-state={!!captureConfig.screenshotIntervalMs ? 'checked' : 'unchecked'}
                  >
                    <span className="toggle-switch-thumb" />
                  </button>
                </div>

                {!!captureConfig.screenshotIntervalMs && (
                  <div className="px-4 py-2.5 bg-slate-900/60 flex items-center justify-between border-t border-white/5">
                    <span className="text-[11px] text-slate-300 font-medium">Snapshot Interval</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="5"
                        step="5"
                        value={Math.floor(captureConfig.screenshotIntervalMs / 1000)}
                        onChange={(e) => {
                          const seconds = Math.max(5, Number(e.target.value));
                          void updateConfig({ ...captureConfig, screenshotIntervalMs: seconds * 1000 });
                        }}
                        className="w-14 px-2 py-1 bg-slate-800 border border-white/10 rounded-lg text-[11px] font-bold text-white focus:outline-none focus:border-indigo-500 text-center"
                      />
                      <span className="text-[11px] text-slate-400">sec</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Consent Checkbox */}
        <div className="p-3 rounded-2xl bg-slate-800/30 border border-white/10 flex items-start gap-2.5">
          <input
            type="checkbox"
            id="consent-checkbox"
            checked={consentAccepted}
            onChange={(e) => setConsentAccepted(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-white/20 text-indigo-600 focus:ring-indigo-500 bg-slate-800 cursor-pointer"
          />
          <label
            htmlFor="consent-checkbox"
            className="text-[11px] text-slate-300 leading-relaxed cursor-pointer select-none font-medium"
          >
            I am responsible for informing meeting participants and obtaining consent where required by law.
          </label>
        </div>

        {/* Local-only Privacy Guarantee Badge */}
        <div className="flex items-center justify-center gap-2 py-1 text-[10.5px] text-slate-400 font-semibold">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>100% Local & Private Transport (127.0.0.1)</span>
        </div>
      </div>

      {/* Hero Action Button */}
      <div className="p-4 border-t border-[var(--separator)] bg-slate-900/80 backdrop-blur-xl">
        <motion.button
          whileHover={{ scale: canStart && !isLoading ? 1.02 : 1 }}
          whileTap={{ scale: canStart && !isLoading ? 0.98 : 1 }}
          onClick={handleStart}
          disabled={!canStart || isLoading}
          className={`w-full py-3.5 rounded-2xl font-black text-[13.5px] flex items-center justify-center gap-2 shadow-xl transition-all ${
            canStart
              ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-indigo-500/30 cursor-pointer'
              : 'bg-slate-800 border border-white/10 text-slate-500 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Video size={17} />
              <span>Start Private Capture</span>
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}
