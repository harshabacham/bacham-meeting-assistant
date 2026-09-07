import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, ArrowLeft, Sparkles, Check,
  Layers, Sliders, CheckCircle2
} from 'lucide-react';
import { WelcomeBentoGrid } from '@/components/onboarding/WelcomeBentoGrid';
import { WelcomePersonalizeStep } from '@/components/onboarding/WelcomePersonalizeStep';
import { WelcomeLaunchStep } from '@/components/onboarding/WelcomeLaunchStep';
import { useAuthStore } from '@/shared/stores/authStore';

const STEPS = [
  { id: 0, label: 'Superpowers', icon: Layers },
  { id: 1, label: 'Personalize', icon: Sliders },
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
              className="w-full flex flex-col items-center text-center space-y-8"
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

              {/* Bento Grid Showcase */}
              <WelcomeBentoGrid />
            </motion.div>
          )}

          {currentStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="w-full flex flex-col items-center"
            >
              <WelcomePersonalizeStep />
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
