import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, Mic, FileText, Brain, 
  ShieldCheck, Sparkles, Check
} from 'lucide-react';
import { TauriClient } from '@/infrastructure/tauri-client';

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleProceed = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    navigate('/login');
  };

  // Keyboard shortcut listener: Enter or Escape to proceed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        handleProceed();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-[#0A0A0C] text-[#F8F9FA] flex flex-col justify-between overflow-x-hidden select-none font-sans">
      {/* ─── Ambient Glow & Subtle Background Grid ─── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:24px_24px] opacity-60" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-lime/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-lime/5 rounded-full blur-[120px] pointer-events-none" />
      </div>

      {/* ─── Top Navigation Header ─── */}
      <header className="sticky top-0 z-30 w-full border-b border-white/[0.08] backdrop-blur-xl bg-[#0A0A0C]/85 shrink-0">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          {/* Brand & Version */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <img 
                src="/logo.png" 
                alt="Bacham Logo" 
                className="w-7 h-7 rounded-lg object-contain shadow-sm" 
              />
              <span className="font-bold text-lg tracking-tight text-white">
                Bacham
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-white/10 text-white/70 border border-white/10">
              v1.0.0
            </span>
          </div>

          {/* Top Window Controls / Actions */}
          <div className="flex items-center gap-4">
            {/* Skip action */}
            <button
              type="button"
              onClick={handleProceed}
              className="text-xs text-white/50 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
            >
              Skip
            </button>

            {/* Next Button on Top */}
            <motion.button
              type="button"
              onClick={handleProceed}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-lime hover:bg-[#aef520] text-black font-bold text-xs tracking-wide shadow-[0_0_18px_rgba(186,255,41,0.25)] transition-all cursor-pointer shrink-0"
            >
              <span>Next</span>
              <ArrowRight size={13} strokeWidth={2.5} />
            </motion.button>

            {/* Tauri Window Controls */}
            <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-white/10">
              <button
                type="button"
                onClick={() => TauriClient.minimize()}
                className="w-2.5 h-2.5 rounded-full bg-[#FFC15E] hover:brightness-110 shadow-xs transition-all active:scale-95 cursor-pointer"
                title="Minimize"
              />
              <button
                type="button"
                onClick={() => TauriClient.maximize()}
                className="w-2.5 h-2.5 rounded-full bg-[#5EFF9F] hover:brightness-110 shadow-xs transition-all active:scale-95 cursor-pointer"
                title="Maximize"
              />
              <button
                type="button"
                onClick={() => TauriClient.close()}
                className="w-2.5 h-2.5 rounded-full bg-[#FF5E5E] hover:brightness-110 shadow-xs transition-all active:scale-95 cursor-pointer"
                title="Close"
              />
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main Hero & Feature Pillars ─── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-10 max-w-6xl mx-auto w-full">
        <div className="w-full flex flex-col items-center text-center space-y-10">
          {/* Hero Title & Pitch */}
          <div className="max-w-3xl space-y-3.5">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime/10 border border-lime/20 text-lime text-xs font-semibold"
            >
              <Sparkles size={13} />
              <span>Welcome to Bacham</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
              className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight"
            >
              Every meeting & lecture, <br />
              <span className="bg-gradient-to-r from-lime via-[#c8ff57] to-white bg-clip-text text-transparent">
                captured, summarized, and organized.
              </span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              className="text-sm sm:text-base text-white/60 max-w-2xl mx-auto leading-relaxed"
            >
              Real-time speech transcription, automated structured notes, and active-recall study flashcards — stored privately on your local disk.
            </motion.p>
          </div>

          {/* ─── 3 Clean Feature Pillars ─── */}
          <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
            {/* Pillar 1: Live Audio Transcription */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.15 }}
              className="rounded-2xl border border-white/[0.08] bg-[#141517]/80 hover:bg-[#141517] backdrop-blur-xl p-6 flex flex-col justify-between transition-all duration-300 hover:border-lime/30 hover:shadow-[0_0_25px_rgba(186,255,41,0.06)]"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-lime/10 border border-lime/20 flex items-center justify-center text-lime mb-4">
                  <Mic size={18} />
                </div>
                <h3 className="text-base font-bold text-white tracking-tight mb-2">
                  Live Speech Capture
                </h3>
                <p className="text-xs text-white/60 leading-relaxed mb-4">
                  Record system audio and microphone simultaneously with real-time speaker separation and offline speech recognition.
                </p>
              </div>

              {/* Minimalist Waveform Graphic */}
              <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0C]/90 p-3.5 flex items-center justify-between shadow-inner">
                <span className="text-[11px] font-medium text-white/70">Audio Stream</span>
                <div className="flex items-center gap-1 h-5">
                  {[25, 55, 80, 45, 90, 70, 40, 85, 60, 95, 50, 75, 30].map((h, i) => (
                    <motion.div
                      key={i}
                      animate={{ height: [`${Math.max(20, h * 0.3)}%`, `${h}%`, `${Math.max(20, h * 0.4)}%`] }}
                      transition={{
                        repeat: Infinity,
                        repeatType: "reverse",
                        duration: 0.9 + (i % 4) * 0.15,
                        ease: "easeInOut",
                      }}
                      className="w-1 rounded-full bg-lime/80"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Pillar 2: Automated Notes & Actions */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.2 }}
              className="rounded-2xl border border-white/[0.08] bg-[#141517]/80 hover:bg-[#141517] backdrop-blur-xl p-6 flex flex-col justify-between transition-all duration-300 hover:border-lime/30 hover:shadow-[0_0_25px_rgba(186,255,41,0.06)]"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-lime/10 border border-lime/20 flex items-center justify-center text-lime mb-4">
                  <FileText size={18} />
                </div>
                <h3 className="text-base font-bold text-white tracking-tight mb-2">
                  Instant Structured Notes
                </h3>
                <p className="text-xs text-white/60 leading-relaxed mb-4">
                  Automatically turns hours of meetings into concise executive summaries, key decisions, and actionable task lists.
                </p>
              </div>

              {/* Minimalist Summary Preview */}
              <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0C]/90 p-3.5 space-y-2 shadow-inner">
                <div className="flex items-center gap-1.5 text-lime text-[10px] font-semibold tracking-wide uppercase">
                  <Check size={11} strokeWidth={3} />
                  <span>Key Action Items</span>
                </div>
                <p className="text-[11px] text-white/80 leading-snug line-clamp-2">
                  Review production architecture & finalize weekly release milestones.
                </p>
              </div>
            </motion.div>

            {/* Pillar 3: Active Recall & Flashcards */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.25 }}
              className="rounded-2xl border border-white/[0.08] bg-[#141517]/80 hover:bg-[#141517] backdrop-blur-xl p-6 flex flex-col justify-between transition-all duration-300 hover:border-lime/30 hover:shadow-[0_0_25px_rgba(186,255,41,0.06)]"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-lime/10 border border-lime/20 flex items-center justify-center text-lime mb-4">
                  <Brain size={18} />
                </div>
                <h3 className="text-base font-bold text-white tracking-tight mb-2">
                  Flashcards & Knowledge Recall
                </h3>
                <p className="text-xs text-white/60 leading-relaxed mb-4">
                  Convert complex lecture ideas and meeting points into spaced-repetition cards and quizzes for instant memory retention.
                </p>
              </div>

              {/* Minimalist Flashcard Preview */}
              <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0C]/90 p-3.5 space-y-2 shadow-inner">
                <div className="flex items-center justify-between text-[10px] text-lime font-mono">
                  <span>ACTIVE RECALL</span>
                  <span className="text-white/40">Deck #1</span>
                </div>
                <p className="text-[11px] text-white/80 leading-snug">
                  Key concepts converted into practice questions ready for review.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Privacy Guarantee Banner */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.3 }}
            className="w-full max-w-5xl rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 flex items-center justify-center gap-2 text-xs text-white/60 text-center"
          >
            <ShieldCheck size={15} className="text-lime shrink-0" />
            <span>
              <strong className="text-white font-medium">100% Local-First Storage:</strong> Your audio recordings, transcripts, and notes stay encrypted on your machine.
            </span>
          </motion.div>
        </div>
      </main>

      {/* ─── Footer Minimal Bar ─── */}
      <footer className="relative z-10 w-full border-t border-white/[0.06] py-3.5 px-6 text-center text-[11px] text-white/40">
        Bacham v1.0.0 • Built for focus, speed, and privacy
      </footer>
    </div>
  );
};

export default OnboardingPage;
