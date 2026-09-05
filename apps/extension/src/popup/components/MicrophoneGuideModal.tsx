import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Mic,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  Radio,
} from 'lucide-react';

export interface MicrophoneGuideModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onPermissionGranted?: () => void;
}

// ─── Visual Mini Mockup 1: "If you see a popup" ───
function PopupMockup(): React.ReactElement {
  return (
    <div className="w-[112px] h-[88px] rounded-xl bg-[#F0F2F5] text-[#1F2328] p-1.5 shadow-sm border border-black/10 flex flex-col justify-between shrink-0 select-none overflow-hidden relative">
      {/* Browser Tab Header */}
      <div className="flex items-center gap-1 mb-1 pb-1 border-b border-black/5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#FF5F56]" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#FFBD2E]" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#27C93F]" />
        <div className="ml-1 h-2 flex-1 bg-white rounded-xs flex items-center px-1">
          <span className="w-1 h-1 rounded-full bg-black/30 mr-0.5" />
          <span className="text-[5.5px] text-black/50 font-mono scale-[0.8] origin-left">meet...</span>
        </div>
      </div>

      {/* Chrome Permission Dialog Box */}
      <div className="bg-white rounded-lg p-1.5 shadow-md border border-black/5 flex-1 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-0.5">
            <span className="text-[7px]">🎙️</span>
            <span className="text-[6.5px] font-bold text-gray-800 leading-none">Use microphone</span>
          </div>
          <span className="text-[6px] text-gray-400">✕</span>
        </div>

        {/* Buttons */}
        <div className="space-y-0.5 mt-0.5">
          <div className="px-1 py-0.5 rounded bg-[#BAFF29] border border-[#a3e622] text-[5.5px] font-extrabold text-[#0A0A0C] text-center shadow-xs">
            Allow while visiting
          </div>
          <div className="px-1 py-0.5 rounded bg-gray-100 text-[5px] text-gray-500 text-center">
            Allow this time
          </div>
        </div>
      </div>

      {/* Cursor arrow pointing to 'Allow' */}
      <div className="absolute bottom-3 right-1.5 drop-shadow-md pointer-events-none">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="black" stroke="white" strokeWidth="1.5">
          <path d="M3 3l7 18 3-7 7-3L3 3z" />
        </svg>
      </div>
    </div>
  );
}

// ─── Visual Mini Mockup 2: "If there's no popup" ───
function BlockedMockup(): React.ReactElement {
  return (
    <div className="w-[112px] h-[88px] rounded-xl bg-[#F0F2F5] text-[#1F2328] p-1.5 shadow-sm border border-black/10 flex flex-col justify-between shrink-0 select-none overflow-hidden relative">
      {/* Browser Header with URL & blocked mic */}
      <div className="flex items-center gap-1 mb-1 pb-1 border-b border-black/5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#FF5F56]" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#FFBD2E]" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#27C93F]" />
        <div className="ml-1 h-2.5 flex-1 bg-white rounded-xs flex items-center justify-between px-1 border border-black/5">
          <span className="text-[5px] text-black/50 font-mono scale-[0.8] origin-left">chrome://...</span>
          <span className="text-[6.5px] text-red-500 font-bold">🎙✕</span>
        </div>
      </div>

      {/* Blocked Dropdown */}
      <div className="bg-white rounded-lg p-1.5 shadow-md border border-black/5 flex-1 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[6.5px] font-bold text-red-600">Microphone blocked</span>
          <span className="text-[6px] text-gray-400">✕</span>
        </div>

        <div className="space-y-0.5 mt-0.5">
          <div className="flex items-center gap-1 text-[5.5px] font-bold text-gray-800">
            <span className="w-1.5 h-1.5 rounded-full bg-[#BAFF29] border border-black/30 flex items-center justify-center shrink-0" />
            <span className="truncate">Always allow...</span>
          </div>
          <div className="flex items-center gap-1 text-[5.5px] text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full border border-gray-300 shrink-0" />
            <span className="truncate">Continue blocking</span>
          </div>
        </div>

        <div className="mt-0.5 flex justify-end">
          <span className="px-1.5 py-0.5 rounded bg-blue-600 text-[5px] font-bold text-white">Done</span>
        </div>
      </div>

      {/* Cursor arrow pointing to address bar mic */}
      <div className="absolute top-2 right-2 drop-shadow-md pointer-events-none">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="black" stroke="white" strokeWidth="1.5">
          <path d="M3 3l7 18 3-7 7-3L3 3z" />
        </svg>
      </div>
    </div>
  );
}

// ─── Visual Mini Mockup 3: "If you don't see the microphone icon" ───
function RefreshMockup(): React.ReactElement {
  return (
    <div className="w-[112px] h-[88px] rounded-xl bg-[#F0F2F5] text-[#1F2328] p-1.5 shadow-sm border border-black/10 flex flex-col justify-between shrink-0 select-none overflow-hidden relative">
      {/* Browser Tab Header */}
      <div className="flex items-center gap-1 mb-1 pb-1 border-b border-black/5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#FF5F56]" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#FFBD2E]" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#27C93F]" />
        <div className="ml-1 px-1 py-0.5 bg-white rounded-t text-[5px] font-bold text-gray-700 flex items-center gap-0.5">
          <span>BACHAM</span>
          <span className="text-[4.5px] text-gray-400">✕</span>
        </div>
      </div>

      {/* Address Bar with Refresh Button */}
      <div className="bg-white rounded-lg p-2 shadow-md border border-black/5 flex-1 flex flex-col justify-center items-center text-center">
        <div className="w-full flex items-center gap-1 px-1 py-0.5 rounded bg-gray-100 border border-black/5 mb-1">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500/20 text-blue-600 flex items-center justify-center text-[7px] font-bold">
            ↻
          </span>
          <span className="text-[5.5px] text-gray-500 font-mono truncate">meet.google.com</span>
          <span className="text-[7px] text-gray-600 ml-auto">🎙</span>
        </div>
        <span className="text-[6.5px] font-semibold text-gray-600">Refresh & click mic</span>
      </div>

      {/* Cursor arrow pointing to refresh icon */}
      <div className="absolute top-7 left-3.5 drop-shadow-md pointer-events-none">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="black" stroke="white" strokeWidth="1.5">
          <path d="M3 3l7 18 3-7 7-3L3 3z" />
        </svg>
      </div>
    </div>
  );
}

export function MicrophoneGuideModal({
  isOpen,
  onClose,
  onPermissionGranted,
}: MicrophoneGuideModalProps): React.ReactElement | null {
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [isTesting, setIsTesting] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);

  // Query microphone permission state on mount & react to changes
  useEffect(() => {
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then((status) => {
          setPermissionState(status.state);
          status.onchange = () => {
            setPermissionState(status.state);
            if (status.state === 'granted') {
              onPermissionGranted?.();
            }
          };
        })
        .catch(() => {});
    }
  }, [onPermissionGranted]);

  // Interactive Live Microphone Test with Web Audio API
  const handleTestMic = async () => {
    try {
      setIsTesting(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionState('granted');
      onPermissionGranted?.();

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const interval = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setVolumeLevel(Math.min(100, Math.round((avg / 128) * 100)));
      }, 50);

      setTimeout(() => {
        clearInterval(interval);
        stream.getTracks().forEach((track) => track.stop());
        audioCtx.close().catch(() => {});
        setIsTesting(false);
        setVolumeLevel(0);
      }, 5000);
    } catch {
      setPermissionState('denied');
      setIsTesting(false);
      setVolumeLevel(0);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/75 backdrop-blur-md z-50 flex flex-col justify-end"
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="bg-[#141517] rounded-t-3xl p-5 border-t border-white/10 shadow-2xl space-y-4 text-white max-h-[92vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-1 border-b border-white/8">
              <h2 className="text-[17px] font-extrabold text-white tracking-tight">
                Microphone Permission Guide
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white cursor-pointer transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Top Status & Live Test Bar */}
            <div className="p-3 rounded-2xl bg-[#1A1C20] border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold text-white/60">Status:</span>
                  {permissionState === 'granted' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
                      <CheckCircle2 size={12} />
                      Allowed & Ready
                    </span>
                  ) : permissionState === 'denied' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[11px] font-bold">
                      <AlertTriangle size={12} />
                      Blocked by Chrome
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] font-bold">
                      <Radio size={12} />
                      Permission Needed
                    </span>
                  )}
                </div>

                <button
                  onClick={handleTestMic}
                  disabled={isTesting}
                  className={`px-3 py-1.5 rounded-xl font-bold text-[11.5px] flex items-center gap-1.5 transition-all cursor-pointer ${
                    isTesting
                      ? 'bg-[#BAFF29] text-[#0A0A0C] shadow-[0_0_12px_rgba(186,255,41,0.35)]'
                      : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                  }`}
                >
                  <Mic size={13} className={isTesting ? 'animate-bounce' : ''} />
                  <span>{isTesting ? `Listening (${volumeLevel}%)` : 'Test Microphone'}</span>
                </button>
              </div>

              {/* Live Equalizer Voice Bar (Active during test) */}
              {isTesting && (
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#BAFF29] to-emerald-400 rounded-full"
                    style={{ width: `${volumeLevel}%` }}
                    transition={{ duration: 0.05 }}
                  />
                </div>
              )}
            </div>

            {/* ─── 3 Clean Visual Guide Cards (Matching Sider Sample) ─── */}
            <div className="space-y-3">
              {/* Card 1: If you see a popup */}
              <div className="p-3.5 rounded-2xl bg-[#1A1C20] border border-white/8 flex items-center gap-3.5 shadow-xs">
                <PopupMockup />
                <div className="space-y-1">
                  <h3 className="text-[13.5px] font-bold text-white leading-snug">
                    If you see a popup
                  </h3>
                  <p className="text-[11.5px] text-white/70 leading-snug">
                    Click &ldquo;Allow while visiting the site&rdquo; to enable speech-to-text.
                  </p>
                  <p className="text-[10.5px] text-[#BAFF29]/90 font-medium pt-0.5 leading-snug">
                    💡 Tip: Avoid selecting devices with &ldquo;virtual&rdquo; in their names.
                  </p>
                </div>
              </div>

              {/* Card 2: If there's no popup */}
              <div className="p-3.5 rounded-2xl bg-[#1A1C20] border border-white/8 flex items-center gap-3.5 shadow-xs">
                <BlockedMockup />
                <div className="space-y-1">
                  <h3 className="text-[13.5px] font-bold text-white leading-snug">
                    If there&rsquo;s no popup
                  </h3>
                  <p className="text-[11.5px] text-white/70 leading-snug">
                    Click the microphone icon in the address bar, select &ldquo;Always allow...&rdquo; and click &ldquo;Done&rdquo;.
                  </p>
                </div>
              </div>

              {/* Card 3: If you don't see the microphone icon */}
              <div className="p-3.5 rounded-2xl bg-[#1A1C20] border border-white/8 flex items-center gap-3.5 shadow-xs">
                <RefreshMockup />
                <div className="space-y-1">
                  <h3 className="text-[13.5px] font-bold text-white leading-snug">
                    If you don&rsquo;t see the microphone icon
                  </h3>
                  <p className="text-[11.5px] text-white/70 leading-snug">
                    Refresh the page, then click the microphone icon in the address bar and select &ldquo;Always allow...&rdquo;.
                  </p>
                </div>
              </div>

              {/* Card 4: Meeting Audio Participants Tip */}
              <div className="p-3 rounded-2xl bg-[#141517] border border-white/8 flex items-start gap-3 shadow-xs">
                <div className="w-7 h-7 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Volume2 size={14} />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-[12.5px] font-bold text-white">
                    Recording Other People? (Google Meet / Zoom)
                  </h4>
                  <p className="text-[11px] text-white/60 leading-snug">
                    When Chrome opens the screen sharing window, make sure to check:
                  </p>
                  <div className="mt-1 px-2.5 py-1 rounded-md bg-black/50 border border-white/10 text-[10.5px] font-mono text-[#BAFF29] font-bold inline-block">
                    ☑ Also share tab audio / Share system audio
                  </div>
                </div>
              </div>
            </div>

            {/* Done / Close CTA */}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-[#BAFF29] hover:bg-[#a3e622] text-[#0A0A0C] font-bold text-[13px] shadow-[0_2px_12px_rgba(186,255,41,0.25)] transition-all cursor-pointer"
            >
              Got It, Let&rsquo;s Record
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
