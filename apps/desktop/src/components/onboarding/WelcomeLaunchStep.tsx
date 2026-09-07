import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Mic, MicOff, CheckCircle2, ArrowRight, ShieldCheck, 
  Sparkles, Keyboard, HardDrive, Volume2
} from 'lucide-react';

interface WelcomeLaunchStepProps {
  onLaunch: () => void;
}

export const WelcomeLaunchStep: React.FC<WelcomeLaunchStepProps> = ({ onLaunch }) => {
  const [micActive, setMicActive] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [micVerified, setMicVerified] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const startMicTest = async () => {
    try {
      setMicError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateMeter = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((average / 128) * 100));
        setMicLevel(normalized);

        if (normalized > 10) {
          setMicVerified(true);
        }

        animationFrameRef.current = requestAnimationFrame(updateMeter);
      };

      setMicActive(true);
      updateMeter();
    } catch (err: any) {
      console.error("Microphone test error:", err);
      setMicError("Microphone permission denied or device not found.");
      setMicActive(false);
    }
  };

  const stopMicTest = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setMicActive(false);
    setMicLevel(0);
  };

  useEffect(() => {
    return () => {
      stopMicTest();
    };
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 text-left">
      {/* Header */}
      <div className="text-center max-w-lg mx-auto space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime/10 border border-lime/20 text-lime text-xs font-semibold">
          <CheckCircle2 size={12} />
          You're All Set
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Ready to supercharge your meetings?
        </h2>
        <p className="text-sm text-white/60">
          Everything is set up and configured locally on your device.
        </p>
      </div>

      {/* ─── Center Action Card ─── */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#141517]/90 backdrop-blur-xl p-6 sm:p-8 relative overflow-hidden shadow-2xl space-y-6">
        {/* Glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-lime/10 rounded-full blur-3xl pointer-events-none" />

        {/* Readiness Checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl border border-white/[0.06] bg-[#0A0A0C]/60 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-lime/10 text-lime flex items-center justify-center shrink-0">
              <Sparkles size={16} />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">AI Engine</p>
              <p className="text-[11px] text-white/50">Gemini 2.0 Ready</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-white/[0.06] bg-[#0A0A0C]/60 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-lime/10 text-lime flex items-center justify-center shrink-0">
              <HardDrive size={16} />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Local Storage</p>
              <p className="text-[11px] text-white/50">Encrypted SQLite</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-white/[0.06] bg-[#0A0A0C]/60 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-lime/10 text-lime flex items-center justify-center shrink-0">
              <Keyboard size={16} />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Hotkeys Active</p>
              <p className="text-[11px] text-white/50">⌘K Universal Search</p>
            </div>
          </div>
        </div>

        {/* Live Microphone Check Widget */}
        <div className="p-4 rounded-xl border border-white/[0.06] bg-[#0A0A0C]/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/80">
                <Volume2 size={14} />
              </div>
              <div>
                <span className="text-xs font-semibold text-white block">Microphone Hardware Check</span>
                <span className="text-[11px] text-white/50">Ensure high-fidelity capture for meeting notes</span>
              </div>
            </div>

            <button
              type="button"
              onClick={micActive ? stopMicTest : startMicTest}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                micActive 
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20' 
                  : 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
              }`}
            >
              {micActive ? (
                <>
                  <MicOff size={13} /> Stop Test
                </>
              ) : (
                <>
                  <Mic size={13} /> Test Mic
                </>
              )}
            </button>
          </div>

          {micActive && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
                <span>INPUT LEVEL</span>
                <span className="text-lime">{micLevel}%</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/[0.06]">
                <motion.div 
                  className="h-full bg-gradient-to-r from-lime/60 via-lime to-emerald-400 rounded-full"
                  style={{ width: `${Math.max(4, micLevel)}%` }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                />
              </div>
              {micVerified && (
                <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
                  <CheckCircle2 size={12} /> Audio signal detected clearly
                </p>
              )}
            </div>
          )}

          {micError && (
            <p className="text-xs text-red-400 pt-1">
              {micError}
            </p>
          )}
        </div>

        {/* Big Launch Button */}
        <motion.button
          type="button"
          onClick={onLaunch}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-4 px-6 rounded-xl bg-lime hover:bg-[#aef520] text-black font-bold text-base flex items-center justify-center gap-2 shadow-[0_0_35px_rgba(186,255,41,0.25)] transition-all duration-200 cursor-pointer"
        >
          <span>Launch Workspace</span>
          <ArrowRight size={18} strokeWidth={2.5} />
        </motion.button>
      </div>

      {/* Security Footer Note */}
      <div className="flex items-center justify-center gap-2 text-xs text-white/40">
        <ShieldCheck size={14} className="text-lime/70" />
        <span>100% Private · Zero data sharing · Local-first architecture</span>
      </div>
    </div>
  );
};
