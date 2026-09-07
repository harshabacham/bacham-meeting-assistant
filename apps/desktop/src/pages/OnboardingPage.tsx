import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, ArrowLeft, Sparkles, Check,
  Layers, CheckCircle2, Mic, FileText, Brain, ShieldCheck
} from 'lucide-react';
import { WelcomeBentoGrid } from '@/components/onboarding/WelcomeBentoGrid';
import { WelcomeLaunchStep } from '@/components/onboarding/WelcomeLaunchStep';
import { useAuthStore } from '@/shared/stores/authStore';

const STEPS = [
  { id: 0, label: 'Welcome', icon: Sparkles },
  { id: 1, label: 'Features', icon: Layers },
  { id: 2, label: 'Ready', icon: CheckCircle2 },
];

export const OnboardingPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleFinish = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    navigate('/login');
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleFinish();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user]);

  return (
    <div className="relative h-screen max-h-screen w-full bg-[#0A0A0C] text-[#F8F9FA] flex flex-col overflow-y-auto overflow-x-hidden select-none font-sans scroll-smooth">
      {/* ─── Ambient Glow & Subtle Grid Background ─── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:24px_24px] opacity-60" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-lime/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-lime/5 rounded-full blur-[120px] pointer-events-none" />
      </div>

      {/* ─── Top Navigation Header (Sticky with Next Button on top) ─── */}
      <header className="sticky top-0 z-30 w-full border-b border-white/[0.06] backdrop-blur-xl bg-[#0A0A0C]/85 shrink-0">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <img 
                src="/logo.png" 
                alt="Bacham Logo" 
                className="w-7 h-7 rounded-lg object-contain shadow-sm" 
              />
              <span className="font-bold text-lg tracking-tight text-white font-sans">
                Bacham
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-white/10 text-white/70 border border-white/10">
              v1.0.0
            </span>
          </div>

          {/* Stepper Pills */}
          <div className="hidden sm:flex items-center gap-1.5 p-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
            {STEPS.map((step, idx) => {
              const isActive = currentStep === idx;
              const isCompleted = currentStep > idx;
              const Icon = step.icon;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setCurrentStep(idx)}
                  className={`flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-lime text-black shadow-sm'
                      : isCompleted
                      ? 'text-white/80 hover:text-white'
                      : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  {isCompleted ? (
                    <Check size={12} strokeWidth={3} className="text-lime" />
                  ) : (
                    <Icon size={12} className={isActive ? "text-black" : "text-white/50"} />
                  )}
                  <span>{step.label}</span>
                </button>
              );
            })}
          </div>

          {/* Top Actions: Back, Skip, & Next Button on Top */}
          <div className="flex items-center gap-2.5">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1 text-xs text-white/70 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                <ArrowLeft size={13} />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleFinish}
              className="text-xs text-white/50 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white/5"
            >
              Skip
            </button>

            {/* Next Button on top */}
            <motion.button
              type="button"
              onClick={handleNext}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-lime hover:bg-[#aef520] text-black font-bold text-xs tracking-wide shadow-[0_0_18px_rgba(186,255,41,0.25)] transition-all cursor-pointer shrink-0"
            >
              <span>{currentStep === 2 ? 'Proceed to Sign In' : 'Next'}</span>
              <ArrowRight size={13} strokeWidth={2.5} />
            </motion.button>
          </div>
        </div>
      </header>

      {/* ─── Main Content Canvas (Scrollable, with room to breathe) ─── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-start px-4 sm:px-6 py-8 sm:py-12 pb-16 w-full max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          {currentStep === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="w-full flex flex-col items-center text-center space-y-10"
            >
              {/* Hero Title */}
              <div className="max-w-3xl space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime/10 border border-lime/20 text-lime text-xs font-semibold">
                  <Sparkles size={13} />
                  <span>Welcome to Bacham</span>
                </div>
                <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
                  Your Second Brain for Every <br />
                  <span className="bg-gradient-to-r from-lime via-[#c8ff57] to-white bg-clip-text text-transparent">
                    Meeting, Lecture & Conversation.
                  </span>
                </h1>
                <p className="text-sm sm:text-base text-white/60 max-w-2xl mx-auto leading-relaxed">
                  Real-time speech transcription, agentic note generation, active-recall study flashcards, and instant knowledge search — all stored locally on your device.
                </p>
              </div>

              {/* 3 Core Highlights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-5xl text-left">
                {/* Pillar 1: Speech Capture */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
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

                {/* Pillar 2: Automated Notes */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.15 }}
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

                  {/* Summary Preview */}
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

                {/* Pillar 3: Flashcards */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="rounded-2xl border border-white/[0.08] bg-[#141517]/80 hover:bg-[#141517] backdrop-blur-xl p-6 flex flex-col justify-between transition-all duration-300 hover:border-lime/30 hover:shadow-[0_0_25px_rgba(186,255,41,0.06)]"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-lime/10 border border-lime/20 flex items-center justify-center text-lime mb-4">
                      <Brain size={18} />
                    </div>
                    <h3 className="text-base font-bold text-white tracking-tight mb-2">
                      Flashcards & Study Decks
                    </h3>
                    <p className="text-xs text-white/60 leading-relaxed mb-4">
                      Convert complex lecture ideas and meeting points into spaced-repetition cards and quizzes for instant memory retention.
                    </p>
                  </div>

                  {/* Flashcard Preview */}
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
                transition={{ duration: 0.3, delay: 0.25 }}
                className="w-full max-w-5xl rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 flex items-center justify-center gap-2 text-xs text-white/60 text-center"
              >
                <ShieldCheck size={15} className="text-lime shrink-0" />
                <span>
                  <strong className="text-white font-medium">100% Local-First Storage:</strong> Your audio recordings, transcripts, and notes stay encrypted on your machine.
                </span>
              </motion.div>

              {/* Explore Features CTA button */}
              <motion.button
                type="button"
                onClick={handleNext}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-lime hover:bg-[#aef520] text-black font-bold text-sm shadow-[0_0_25px_rgba(186,255,41,0.2)] transition-all cursor-pointer"
              >
                <span>Explore Interactive Features</span>
                <ArrowRight size={15} strokeWidth={2.5} />
              </motion.button>
            </motion.div>
          )}

          {currentStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="w-full flex flex-col items-center text-center space-y-8"
            >
              {/* Features Header */}
              <div className="max-w-3xl space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime/10 border border-lime/20 text-lime text-xs font-semibold">
                  <Layers size={13} />
                  <span>Interactive Feature Suite</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Engineered for Focus, Speed & Retention.
                </h2>
                <p className="text-sm sm:text-base text-white/60 max-w-2xl mx-auto leading-relaxed">
                  Interact with real-time waveform visualizers, speaker diarization, auto-generated task checklists, and active recall study decks below.
                </p>
              </div>

              {/* Interactive Bento Grid Showcase */}
              <WelcomeBentoGrid />
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="w-full flex flex-col items-center"
            >
              <WelcomeLaunchStep onLaunch={handleFinish} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
export default OnboardingPage;
