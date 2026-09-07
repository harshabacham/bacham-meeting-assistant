import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, Mic, Volume2, Zap, Check, ArrowRight, ArrowLeft, 
  Laptop, GraduationCap, Briefcase, Brain, Radio, Layers, 
  CheckCircle2, Command, Keyboard, FileText
} from 'lucide-react';
import { seedSampleMeeting } from '@/shared/utils/sampleMeetingData';

// ── Persona Options ────────────────────────────────────────────────────────
interface PersonaOption {
  id: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tag: string;
}

const PERSONAS: PersonaOption[] = [
  {
    id: 'engineering',
    title: 'Engineering & Product',
    desc: 'Sprint planning, architecture reviews, design critiques, and technical roadmaps.',
    icon: Laptop,
    tag: 'Technical'
  },
  {
    id: 'student',
    title: 'University & Research',
    desc: 'Lecture recordings, seminar notes, exam preparation, and spaced repetition flashcards.',
    icon: GraduationCap,
    tag: 'Academic'
  },
  {
    id: 'executive',
    title: 'Executive & Client Meetings',
    desc: 'Stakeholder alignment, client sales demos, board reviews, and timestamped action items.',
    icon: Briefcase,
    tag: 'Business'
  },
  {
    id: 'creative',
    title: 'Personal Thought Partner',
    desc: 'Voice brainstorming, interview practice, journaling, and unstructured ideation.',
    icon: Brain,
    tag: 'Creative'
  },
];

// ── Steps Definition ───────────────────────────────────────────────────────
const STEPS = [
  { number: 1, label: 'Welcome' },
  { number: 2, label: 'Capabilities' },
  { number: 3, label: 'Audio Check' },
  { number: 4, label: 'Get Started' },
];

export const OnboardingPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPersona, setSelectedPersona] = useState<string>('engineering');
  const [loadSampleMeeting, setLoadSampleMeeting] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  
  // Microphone Testing States
  const [micActive, setMicActive] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [micPermissionState, setMicPermissionState] = useState<'idle' | 'listening' | 'denied'>('idle');
  const [audioBars, setAudioBars] = useState<number[]>([15, 25, 45, 30, 60, 40, 20, 35, 50, 20, 10, 40]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const navigate = useNavigate();

  // Cleanup microphone resources
  const stopMicTest = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setMicActive(false);
    setMicVolume(0);
  };

  useEffect(() => {
    return () => {
      stopMicTest();
    };
  }, []);

  // Handle starting microphone test
  const startMicTest = async () => {
    try {
      stopMicTest();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      setMicActive(true);
      setMicPermissionState('listening');

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateMeter = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        // Average volume calculation
        let sum = 0;
        const bars: number[] = [];
        for (let i = 0; i < 14; i++) {
          const val = dataArray[i] || 0;
          sum += val;
          bars.push(Math.max(12, Math.min(100, Math.round((val / 255) * 100))));
        }
        const avg = Math.round((sum / (14 * 255)) * 100);
        setMicVolume(avg);
        setAudioBars(bars);

        animFrameRef.current = requestAnimationFrame(updateMeter);
      };

      updateMeter();
    } catch (err) {
      console.warn('Microphone permission denied or unavailable:', err);
      setMicPermissionState('denied');
      setMicActive(false);
    }
  };

  // Complete Onboarding
  const handleFinish = async () => {
    stopMicTest();
    setIsSeeding(true);

    try {
      localStorage.setItem('hasSeenOnboarding', 'true');
      localStorage.setItem('userPersona', selectedPersona);

      if (loadSampleMeeting) {
        await seedSampleMeeting();
      }
    } catch (err) {
      console.error('Error during onboarding completion:', err);
    } finally {
      setIsSeeding(false);
      navigate('/');
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      if (currentStep === 3) {
        stopMicTest();
      }
      setCurrentStep(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      if (currentStep === 3) {
        stopMicTest();
      }
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    stopMicTest();
    localStorage.setItem('hasSeenOnboarding', 'true');
    navigate('/');
  };

  return (
    <div className="relative flex h-screen w-full flex-col bg-[#090A0F] text-foreground select-none overflow-hidden font-sans">
      {/* ── Dynamic Ambient Background Glows ── */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[850px] h-[500px] rounded-full bg-gradient-to-b from-primary/20 via-indigo-600/10 to-transparent blur-[140px] opacity-75" />
      <div className="pointer-events-none absolute bottom-0 right-10 w-[550px] h-[450px] rounded-full bg-gradient-to-t from-fuchsia-600/10 via-purple-600/5 to-transparent blur-[130px] opacity-60" />
      <div className="pointer-events-none absolute top-1/3 left-10 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-cyan-600/10 to-transparent blur-[120px] opacity-40" />

      {/* Subtle fine dot grid overlay */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.03]" 
        style={{
          backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* ── Top Header Navigation Bar ── */}
      <header className="relative z-20 flex items-center justify-between px-8 py-6 w-full border-b border-white/[0.06] backdrop-blur-md bg-black/20">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-indigo-600 shadow-[0_0_20px_rgba(99,102,241,0.4)] text-white">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-base text-white">Bacham</span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-md bg-primary/20 text-primary border border-primary/30">
                AI Assistant
              </span>
            </div>
          </div>
        </div>

        {/* Stepper Progress Indicator */}
        <div className="hidden sm:flex items-center gap-2">
          {STEPS.map((step) => {
            const isActive = currentStep === step.number;
            const isDone = currentStep > step.number;
            return (
              <div 
                key={step.number}
                className="flex items-center gap-2"
              >
                <div 
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
                    isActive 
                      ? 'bg-primary/20 text-primary border border-primary/40 shadow-sm' 
                      : isDone 
                        ? 'bg-white/10 text-zinc-300' 
                        : 'text-zinc-500 hover:text-zinc-400'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                    isDone ? 'bg-primary text-white font-bold' : isActive ? 'bg-primary/30 text-primary' : 'bg-white/10 text-zinc-400'
                  }`}>
                    {isDone ? <Check size={10} strokeWidth={3} /> : step.number}
                  </span>
                  <span>{step.label}</span>
                </div>
                {step.number < 4 && (
                  <div className={`w-4 h-[1px] transition-colors ${isDone ? 'bg-primary/50' : 'bg-white/10'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Skip button */}
        <button
          type="button"
          onClick={handleSkip}
          className="text-xs font-medium text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
        >
          Skip to App
        </button>
      </header>

      {/* ── Main Step Container ── */}
      <main className="relative z-10 flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {/* ─── STEP 1: WELCOME & PERSONA ─────────────────────────────── */}
            {currentStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
                className="flex flex-col items-center text-center space-y-8"
              >
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/10 backdrop-blur-xl shadow-inner text-xs font-medium text-indigo-300">
                  <Sparkles size={13} className="text-primary" />
                  <span>Welcome to the Next Era of Meeting Intelligence</span>
                </div>

                <div className="max-w-2xl space-y-3">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
                    Capture every thought. <br />
                    <span className="bg-gradient-to-r from-primary via-indigo-300 to-fuchsia-400 bg-clip-text text-transparent">
                      Never lose context again.
                    </span>
                  </h1>
                  <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-xl mx-auto">
                    Bacham transforms live meetings, academic lectures, and quick audio memos into searchable knowledge, real-time talking points, and structured notes.
                  </p>
                </div>

                {/* Persona Selection */}
                <div className="w-full space-y-3 pt-2">
                  <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider text-left pl-1">
                    Select your primary workspace focus:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                    {PERSONAS.map((item) => {
                      const Icon = item.icon;
                      const isSelected = selectedPersona === item.id;
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedPersona(item.id)}
                          className={`group relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden ${
                            isSelected
                              ? 'bg-primary/[0.08] border-primary/60 shadow-[0_0_25px_rgba(99,102,241,0.15)] ring-1 ring-primary/40'
                              : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08] hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-start gap-3.5">
                            <div className={`p-2.5 rounded-xl shrink-0 transition-colors ${
                              isSelected 
                                ? 'bg-primary text-white shadow-md' 
                                : 'bg-white/5 text-zinc-400 group-hover:text-white group-hover:bg-white/10'
                            }`}>
                              <Icon size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <h3 className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-zinc-200'}`}>
                                  {item.title}
                                </h3>
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                                  isSelected ? 'bg-primary/20 text-primary' : 'bg-white/5 text-zinc-400'
                                }`}>
                                  {item.tag}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-400 mt-1 leading-relaxed line-clamp-2">
                                {item.desc}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─── STEP 2: CORE CAPABILITIES SPOTLIGHT ─────────────────── */}
            {currentStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
                className="flex flex-col items-center text-center space-y-6"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-xs font-medium text-indigo-300">
                  <Layers size={13} className="text-primary" />
                  <span>Interactive Architecture Spotlight</span>
                </div>

                <div className="max-w-xl space-y-2">
                  <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                    Engineered for Instant Flow
                  </h2>
                  <p className="text-sm text-zinc-400">
                    Three revolutionary capabilities built directly into your desktop workflow.
                  </p>
                </div>

                {/* 3-Bento Card Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full text-left pt-2">
                  {/* Card 1: Dual Stream */}
                  <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 backdrop-blur-xl shadow-lg hover:border-primary/40 transition-all flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                        <Radio size={20} />
                      </div>
                      <h3 className="text-sm font-semibold text-white">Dual-Channel Audio</h3>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Captures both incoming virtual audio (Zoom, Google Meet, Teams) and your local microphone into a synchronized, crystal-clear timeline.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center gap-1.5 text-[11px] font-medium text-blue-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                      <span>Zero echo cancellation loss</span>
                    </div>
                  </div>

                  {/* Card 2: Stealth Copilot */}
                  <div className="relative overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-b from-primary/[0.08] to-transparent p-5 backdrop-blur-xl shadow-lg ring-1 ring-primary/20 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
                        <Zap size={20} />
                      </div>
                      <h3 className="text-sm font-semibold text-white">In-Call Floating Copilot</h3>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Press <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white/10 rounded border border-white/20 text-zinc-200">Alt+Space</kbd> anytime during a meeting to reveal real-time suggestions and answers without leaving your call window.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center gap-1.5 text-[11px] font-medium text-primary">
                      <CheckCircle2 size={12} />
                      <span>Stealth overlay mode</span>
                    </div>
                  </div>

                  {/* Card 3: Study & Workspace */}
                  <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 backdrop-blur-xl shadow-lg hover:border-fuchsia-500/40 transition-all flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-400">
                        <Brain size={20} />
                      </div>
                      <h3 className="text-sm font-semibold text-white">Instant Synthesis</h3>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Raw voice translates automatically into markdown summaries, actionable tasks with timestamps, interactive flashcards, and exam quizzes.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center gap-1.5 text-[11px] font-medium text-fuchsia-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400" />
                      <span>One-click flashcard flip</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─── STEP 3: LIVE AUDIO & HARDWARE CHECK ─────────────────── */}
            {currentStep === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
                className="flex flex-col items-center text-center space-y-6"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-xs font-medium text-emerald-400">
                  <Mic size={13} className="text-emerald-400" />
                  <span>Hardware & Permission Readiness</span>
                </div>

                <div className="max-w-md space-y-2">
                  <h2 className="text-3xl font-bold tracking-tight text-white">
                    Verify Your Microphone
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Ensure your desktop voice input is responsive before your first live recording.
                  </p>
                </div>

                {/* Interactive Mic Visualizer Card */}
                <div className="w-full max-w-lg rounded-3xl border border-white/[0.08] bg-black/40 p-6 backdrop-blur-2xl shadow-2xl space-y-6 text-left">
                  <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl transition-all ${
                        micActive 
                          ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/30' 
                          : 'bg-white/5 text-zinc-400'
                      }`}>
                        <Mic size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">Default Microphone Input</h4>
                        <p className="text-xs text-zinc-400">
                          {micActive 
                            ? 'Actively listening — speak into your mic' 
                            : micPermissionState === 'denied' 
                              ? 'Microphone access denied in OS settings' 
                              : 'Ready to test voice sensitivity'}
                        </p>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border ${
                      micActive 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                        : 'bg-white/5 text-zinc-400 border-white/10'
                    }`}>
                      {micActive ? 'Active' : 'Standby'}
                    </span>
                  </div>

                  {/* Visualizer Waveform Bars */}
                  <div className="bg-black/60 rounded-2xl p-4 border border-white/[0.05] flex flex-col items-center justify-center min-h-[90px] space-y-3">
                    <div className="flex items-end justify-center gap-1.5 h-14 w-full px-4">
                      {audioBars.map((height, i) => (
                        <div
                          key={i}
                          style={{ 
                            height: micActive ? `${height}%` : '8px',
                            transition: 'height 0.08s ease-in-out'
                          }}
                          className={`w-2 rounded-full transition-all ${
                            micActive 
                              ? height > 50 
                                ? 'bg-gradient-to-t from-emerald-500 to-indigo-400' 
                                : 'bg-emerald-500/80' 
                              : 'bg-zinc-700/50'
                          }`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center justify-between w-full text-[11px] text-zinc-400 pt-1">
                      <span className="flex items-center gap-1.5">
                        <Volume2 size={12} className={micVolume > 10 ? 'text-emerald-400' : 'text-zinc-500'} />
                        Input Signal: {micActive ? `${micVolume}%` : '0%'}
                      </span>
                      {micActive && micVolume > 15 && (
                        <span className="text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle2 size={12} /> Crystal clear audio detected
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1">
                    {!micActive ? (
                      <button
                        type="button"
                        onClick={startMicTest}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all duration-150 flex items-center gap-2 shadow-lg shadow-emerald-900/30 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <Mic size={14} />
                        <span>Start Microphone Test</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopMicTest}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-all duration-150"
                      >
                        Stop Test
                      </button>
                    )}

                    <p className="text-[11px] text-zinc-400">
                      You can test system loopback in Settings anytime.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─── STEP 4: SHORTCUTS & LAUNCH ──────────────────────────── */}
            {currentStep === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
                className="flex flex-col items-center text-center space-y-6"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-xs font-medium text-fuchsia-400">
                  <Command size={13} className="text-fuchsia-400" />
                  <span>Ready to Launch</span>
                </div>

                <div className="max-w-xl space-y-2">
                  <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                    Power At Your Fingertips
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-400">
                    Keep these essential keyboard shortcuts in mind while in your workflow.
                  </p>
                </div>

                {/* Shortcuts & Demo Box */}
                <div className="w-full max-w-2xl space-y-4 text-left">
                  {/* Shortcut Pills */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-white/5 text-zinc-300">
                          <Keyboard size={15} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">Floating AI Copilot</p>
                          <p className="text-[10px] text-zinc-400">Summon overlay during calls</p>
                        </div>
                      </div>
                      <kbd className="px-2.5 py-1 text-xs font-mono font-bold bg-white/10 text-primary rounded-lg border border-white/10 shadow-sm">
                        Alt + Space
                      </kbd>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-white/5 text-zinc-300">
                          <Radio size={15} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">Quick Record Toggle</p>
                          <p className="text-[10px] text-zinc-400">Start / Stop capture</p>
                        </div>
                      </div>
                      <kbd className="px-2.5 py-1 text-xs font-mono font-bold bg-white/10 text-primary rounded-lg border border-white/10 shadow-sm">
                        Ctrl + Shift + R
                      </kbd>
                    </div>
                  </div>

                  {/* Seed Demo Meeting Option */}
                  <div 
                    onClick={() => setLoadSampleMeeting(!loadSampleMeeting)}
                    className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-start gap-3.5 ${
                      loadSampleMeeting 
                        ? 'bg-primary/[0.08] border-primary/50 ring-1 ring-primary/30' 
                        : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                      loadSampleMeeting ? 'bg-primary text-white' : 'border border-zinc-500 bg-white/5'
                    }`}>
                      {loadSampleMeeting && <Check size={12} strokeWidth={3} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-primary" />
                        <h4 className="text-xs font-bold text-white">
                          Load Demonstration Meeting (Recommended)
                        </h4>
                        <span className="text-[10px] font-semibold bg-primary/20 text-primary px-1.5 py-0.2 rounded">
                          First-Run
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                        Seeds a sample meeting (*"Bacham — Product Architecture & Strategy"*) with complete transcript chunks, formatted notes, and study flashcards so you can test all features right away.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* ── Bottom Action Control Bar ── */}
      <footer className="relative z-20 flex items-center justify-between px-8 py-5 border-t border-white/[0.06] backdrop-blur-md bg-black/30">
        <div>
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={isSeeding}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
          ) : (
            <div className="text-xs text-zinc-500 hidden sm:block">
              Takes less than 1 minute to complete
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary/90 shadow-lg shadow-indigo-900/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Continue</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={isSeeding}
              className="relative group overflow-hidden flex items-center gap-2 px-8 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-primary via-indigo-600 to-fuchsia-600 hover:from-primary/90 hover:to-fuchsia-500 shadow-xl shadow-indigo-900/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="relative z-10 flex items-center gap-2">
                {isSeeding ? 'Setting Up Workspace...' : 'Enter Bacham Workspace'}
                <Sparkles size={14} className="text-yellow-300 animate-pulse" />
              </span>
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
export default OnboardingPage;
