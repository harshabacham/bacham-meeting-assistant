import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Mic,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  Radio,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export interface MicrophoneGuideModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onPermissionGranted?: () => void;
}

// ─── Visual Mockup 1: "If you see a popup" (Full-Width, High-Res & Crisp) ───
function PopupMockupFull(): React.ReactElement {
  return (
    <div className="w-full rounded-2xl bg-[#18191C] border border-white/10 p-2.5 shadow-md flex flex-col select-none overflow-hidden relative">
      {/* Browser Tab Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/8">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#FF5F56]" />
          <span className="w-2 h-2 rounded-full bg-[#FFBD2E]" />
          <span className="w-2 h-2 rounded-full bg-[#27C93F]" />
        </div>
        <div className="flex-1 max-w-[190px] mx-auto h-5 bg-black/40 rounded-md flex items-center px-2 border border-white/5">
          <span className="text-[10px] text-white/40 font-mono">🔒 meet.google.com</span>
        </div>
        <span className="w-6" />
      </div>

      {/* Chrome Native Permission Dialog Box */}
      <div className="bg-white rounded-xl p-3 shadow-xl border border-black/10 text-gray-900 mx-auto w-full max-w-[280px]">
        <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px]">🎙️</span>
            <span className="text-[11px] font-bold text-gray-900">meet.google.com wants to</span>
          </div>
          <span className="text-[11px] text-gray-400">✕</span>
        </div>

        <div className="py-1">
          <span className="text-[10.5px] text-gray-600 font-medium">Use your microphone</span>
        </div>

        {/* Buttons */}
        <div className="space-y-1.5 pt-1">
          <div className="px-3 py-1.5 rounded-lg bg-[#BAFF29] border border-[#a3e622] text-[11px] font-extrabold text-[#0A0A0C] text-center shadow-xs flex items-center justify-center gap-1">
            <span>Allow while visiting the site</span>
          </div>
          <div className="flex gap-1.5">
            <div className="flex-1 py-1 rounded-lg bg-gray-100 text-[10px] text-gray-500 font-medium text-center">
              Allow this time
            </div>
            <div className="flex-1 py-1 rounded-lg bg-gray-100 text-[10px] text-gray-500 font-medium text-center">
              Never allow
            </div>
          </div>
        </div>
      </div>

      {/* Hand Cursor pointer pointing to 'Allow while visiting' */}
      <div className="absolute bottom-6 right-8 drop-shadow-lg pointer-events-none animate-pulse">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="black" stroke="white" strokeWidth="1.5">
          <path d="M3 3l7 18 3-7 7-3L3 3z" />
        </svg>
      </div>
    </div>
  );
}

// ─── Visual Mockup 2: "If there's no popup (Blocked)" ───
function BlockedMockupFull(): React.ReactElement {
  return (
    <div className="w-full rounded-2xl bg-[#18191C] border border-white/10 p-2.5 shadow-md flex flex-col select-none overflow-hidden relative">
      {/* Browser Tab Header with Blocked Mic Icon */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/8">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#FF5F56]" />
          <span className="w-2 h-2 rounded-full bg-[#FFBD2E]" />
          <span className="w-2 h-2 rounded-full bg-[#27C93F]" />
        </div>
        <div className="flex-1 max-w-[200px] mx-auto h-5 bg-black/40 rounded-md flex items-center justify-between px-2 border border-red-500/30">
          <span className="text-[10px] text-white/40 font-mono">🔒 meet.google.com</span>
          <span className="text-[11px] text-red-500 font-bold flex items-center gap-0.5">
            🎙️<span className="text-red-400 font-black">✕</span>
          </span>
        </div>
        <span className="w-6" />
      </div>

      {/* Chrome Blocked Dropdown Menu */}
      <div className="bg-white rounded-xl p-3 shadow-xl border border-black/10 text-gray-900 mx-auto w-full max-w-[280px]">
        <div className="flex items-center justify-between pb-1 border-b border-gray-100">
          <span className="text-[11.5px] font-extrabold text-red-600">Microphone blocked</span>
          <span className="text-[11px] text-gray-400">✕</span>
        </div>

        <p className="text-[9.5px] text-gray-500 pt-1 leading-tight">
          This page is currently blocked from using your mic:
        </p>

        <div className="space-y-1.5 my-2">
          {/* Radio Option 1: Selected */}
          <div className="flex items-start gap-2 p-1.5 rounded-lg bg-emerald-50 border border-emerald-300">
            <span className="w-3.5 h-3.5 rounded-full bg-[#BAFF29] border-2 border-emerald-600 flex items-center justify-center shrink-0 mt-0.5" />
            <span className="text-[10.5px] font-bold text-gray-900 leading-tight">
              Always allow meet.google.com to access your microphone
            </span>
          </div>

          {/* Radio Option 2: Unselected */}
          <div className="flex items-center gap-2 px-1.5 text-gray-500">
            <span className="w-3.5 h-3.5 rounded-full border border-gray-300 shrink-0" />
            <span className="text-[10px] leading-tight">Continue blocking microphone access</span>
          </div>
        </div>

        {/* Done Button */}
        <div className="flex justify-end pt-1">
          <span className="px-3.5 py-1 rounded-md bg-blue-600 text-[10.5px] font-bold text-white shadow-xs">
            Done
          </span>
        </div>
      </div>

      {/* Hand Cursor pointer pointing to radio */}
      <div className="absolute top-18 left-16 drop-shadow-lg pointer-events-none animate-pulse">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="black" stroke="white" strokeWidth="1.5">
          <path d="M3 3l7 18 3-7 7-3L3 3z" />
        </svg>
      </div>
    </div>
  );
}

// ─── Visual Mockup 3: "If you don't see the microphone icon" ───
function RefreshMockupFull(): React.ReactElement {
  return (
    <div className="w-full rounded-2xl bg-[#18191C] border border-white/10 p-2.5 shadow-md flex flex-col select-none overflow-hidden relative">
      {/* Browser Tab Header with Refresh Trigger */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/8">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#FF5F56]" />
          <span className="w-2 h-2 rounded-full bg-[#FFBD2E]" />
          <span className="w-2 h-2 rounded-full bg-[#27C93F]" />
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[12px] font-bold ring-2 ring-blue-500/40 animate-pulse">
            ↻
          </div>
          <div className="h-5 bg-black/40 rounded-md flex items-center px-2 border border-white/5">
            <span className="text-[10px] text-white/50 font-mono">meet.google.com</span>
          </div>
        </div>
        <span className="w-6" />
      </div>

      {/* Clean Illustrated Instruction Card */}
      <div className="bg-white rounded-xl p-4 shadow-xl border border-black/10 text-gray-900 mx-auto w-full max-w-[280px] flex flex-col items-center text-center space-y-2">
        <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 text-lg font-bold shadow-xs">
          ↻
        </div>
        <div className="space-y-0.5">
          <h4 className="text-[12px] font-bold text-gray-900">1. Click Browser Reload</h4>
          <p className="text-[10px] text-gray-600">
            Refreshing the tab prompts Chrome to show the permission bubble.
          </p>
        </div>
        <div className="w-full pt-1.5 border-t border-gray-100 flex items-center justify-center gap-1 text-[10.5px] font-semibold text-emerald-700">
          <span>2. Then click &ldquo;Allow&rdquo; in the address bar</span>
          <span className="text-[12px]">🎙️</span>
        </div>
      </div>

      {/* Hand Cursor pointer pointing to reload */}
      <div className="absolute top-5 left-18 drop-shadow-lg pointer-events-none animate-pulse">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="black" stroke="white" strokeWidth="1.5">
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
  const [activeStep, setActiveStep] = useState<0 | 1 | 2>(0);
  const [isTesting, setIsTesting] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);

  // Query microphone permission state on mount
  useEffect(() => {
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then((status) => {
          setPermissionState(status.state);
          // If already blocked, smartly default to Step 2 ("If Blocked")!
          if (status.state === 'denied') {
            setActiveStep(1);
          }
          status.onchange = () => {
            setPermissionState(status.state);
            if (status.state === 'granted') {
              onPermissionGranted?.();
            } else if (status.state === 'denied') {
              setActiveStep(1);
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
      setActiveStep(1);
      setIsTesting(false);
      setVolumeLevel(0);
    }
  };

  const steps = [
    {
      title: 'If you see a popup',
      desc: 'Click "Allow while visiting the site" to enable speech-to-text.',
      tip: 'Avoid selecting devices with "virtual" in their names to prevent recording failures.',
      mockup: <PopupMockupFull />,
    },
    {
      title: 'If there’s no popup (Blocked)',
      desc: 'Click the microphone icon in the address bar, select "Always allow..." and click "Done".',
      tip: 'Chrome remembers this setting permanently for this website origin.',
      mockup: <BlockedMockupFull />,
    },
    {
      title: 'If you don’t see the icon',
      desc: 'Refresh the page, then click the microphone icon in the address bar and select "Always allow...".',
      tip: 'Reloading the page reactivates Chrome’s address bar permission prompt.',
      mockup: <RefreshMockupFull />,
    },
  ];

  const current = steps[activeStep];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col justify-end"
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="bg-[#141517] rounded-t-3xl p-4 sm:p-5 border-t border-white/10 shadow-2xl space-y-3.5 text-white max-h-[96vh] flex flex-col justify-between overflow-y-auto"
          >
            {/* 1. Clean Header (No awkward line) */}
            <div className="flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-[16px] font-extrabold text-white tracking-tight leading-tight">
                  Microphone Permission Guide
                </h2>
                <p className="text-[11px] text-white/50 mt-0.5">
                  Follow these steps to ensure your voice is recorded
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* 2. Top Integrated Status & Test Mic Bar (Single Line, No Wrap!) */}
            <div className="p-2.5 rounded-2xl bg-[#1A1C20] border border-white/8 shrink-0 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11.5px] font-semibold text-white/50 shrink-0">Status:</span>
                  {permissionState === 'granted' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold truncate">
                      <CheckCircle2 size={11} className="shrink-0" />
                      Ready & Allowed
                    </span>
                  ) : permissionState === 'denied' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[11px] font-bold truncate">
                      <AlertTriangle size={11} className="shrink-0" />
                      Blocked by Chrome
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] font-bold truncate">
                      <Radio size={11} className="shrink-0" />
                      Permission Needed
                    </span>
                  )}
                </div>

                {/* Single-line button */}
                <button
                  onClick={handleTestMic}
                  disabled={isTesting}
                  className={`px-3 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    isTesting
                      ? 'bg-[#BAFF29] text-[#0A0A0C] shadow-[0_0_12px_rgba(186,255,41,0.35)]'
                      : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                  }`}
                >
                  <Mic size={12} className={isTesting ? 'animate-bounce' : ''} />
                  <span>{isTesting ? `Listening (${volumeLevel}%)` : 'Test Mic'}</span>
                </button>
              </div>

              {/* Voice Meter on test */}
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

            {/* 3. Segmented Scenario Switcher (3 Tabs) */}
            <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-[#0A0A0C] border border-white/8 shrink-0">
              <button
                type="button"
                onClick={() => setActiveStep(0)}
                className={`py-1.5 px-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer text-center ${
                  activeStep === 0
                    ? 'bg-[#BAFF29] text-[#0A0A0C] shadow-sm'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                1. Popup
              </button>
              <button
                type="button"
                onClick={() => setActiveStep(1)}
                className={`py-1.5 px-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer text-center ${
                  activeStep === 1
                    ? 'bg-[#BAFF29] text-[#0A0A0C] shadow-sm'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                2. Blocked
              </button>
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                className={`py-1.5 px-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer text-center ${
                  activeStep === 2
                    ? 'bg-[#BAFF29] text-[#0A0A0C] shadow-sm'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                3. No Icon
              </button>
            </div>

            {/* 4. Active Scenario Card (Full-Width High-Res Mockup + Instructions) */}
            <div className="space-y-2.5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-2.5"
                >
                  {/* High-Resolution Illustrated Mockup */}
                  {current.mockup}

                  {/* Clear Description & Tip */}
                  <div className="p-3 rounded-2xl bg-[#1A1C20] border border-white/8 space-y-1">
                    <h3 className="text-[13px] font-bold text-white leading-snug">
                      {current.title}
                    </h3>
                    <p className="text-[11.5px] text-white/70 leading-relaxed">
                      {current.desc}
                    </p>
                    {current.tip && (
                      <p className="text-[10.5px] text-white/40 pt-1 leading-snug border-t border-white/5 mt-1">
                        💡 <strong>Tip:</strong> {current.tip}
                      </p>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Prev / Next Buttons */}
              <div className="flex items-center justify-between px-1 text-[11px] font-bold text-white/50">
                <button
                  type="button"
                  disabled={activeStep === 0}
                  onClick={() => setActiveStep((prev) => Math.max(0, prev - 1) as any)}
                  className="flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all"
                >
                  <ChevronLeft size={13} />
                  <span>Previous</span>
                </button>
                <span className="text-[10px] text-white/30 font-mono">
                  Step {activeStep + 1} of 3
                </span>
                <button
                  type="button"
                  disabled={activeStep === 2}
                  onClick={() => setActiveStep((prev) => Math.min(2, prev + 1) as any)}
                  className="flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all"
                >
                  <span>Next</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>

            {/* 5. Meeting Audio Participants Tip (Compact) */}
            <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center gap-2 text-[11px] text-sky-200 shrink-0">
              <Volume2 size={15} className="shrink-0 text-sky-400" />
              <div className="leading-tight">
                <span className="font-bold text-sky-300">Meeting participants:</span> Check &ldquo;Also share tab audio&rdquo; in Chrome screen picker.
              </div>
            </div>

            {/* 6. Always-Visible Bottom CTA Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-[#BAFF29] hover:bg-[#a3e622] text-[#0A0A0C] font-black text-[13px] shadow-[0_2px_12px_rgba(186,255,41,0.25)] transition-all cursor-pointer shrink-0"
            >
              Got It, Continue
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
