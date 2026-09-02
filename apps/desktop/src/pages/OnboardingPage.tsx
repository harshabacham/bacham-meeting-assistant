import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Zap, Shield, ArrowRight } from 'lucide-react';

const slides = [
  {
    title: "Welcome to the Platform",
    description: "Your all-in-one workspace for capturing, analyzing, and organizing effortlessly.",
    icon: <Sparkles className="h-16 w-16 text-indigo-400" />
  },
  {
    title: "AI-Powered Insights",
    description: "Get instant transcripts, smart summaries, and action items generated automatically.",
    icon: <Zap className="h-16 w-16 text-fuchsia-400" />
  },
  {
    title: "Private & Secure",
    description: "Your data stays yours. Securely synced and always accessible when you need it.",
    icon: <Shield className="h-16 w-16 text-emerald-400" />
  }
];

export const OnboardingPage = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      localStorage.setItem('hasSeenOnboarding', 'true');
      navigate('/');
    }
  };

  return (
    <div className="relative flex h-screen w-full items-center justify-center bg-zinc-950 text-zinc-50 overflow-hidden">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover opacity-60"
      >
        <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260801_001207_ec20d138-aa45-4b2b-ab8c-bdc71607f240.mp4" type="video/mp4" />
      </video>

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent" />
      
      <div className="absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/20 blur-[120px]"></div>
      
      <div className="relative z-10 flex w-full max-w-lg flex-col items-center text-center p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center"
          >
            <div className="mb-8 rounded-full bg-white/5 p-6 backdrop-blur-xl border border-white/10 shadow-2xl">
              {slides[currentSlide].icon}
            </div>
            <h1 className="mb-4 text-4xl font-bold tracking-tight">
              {slides[currentSlide].title}
            </h1>
            <p className="text-lg text-zinc-400 max-w-md">
              {slides[currentSlide].description}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-12 flex items-center gap-3">
          {slides.map((_, i) => (
            <div 
              key={i} 
              className={`h-2 rounded-full transition-all duration-300 ${i === currentSlide ? 'w-8 bg-indigo-500' : 'w-2 bg-white/20'}`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          className="mt-12 flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-semibold text-black transition-transform hover:scale-105 active:scale-95"
        >
          {currentSlide === slides.length - 1 ? 'Get Started' : 'Continue'}
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
