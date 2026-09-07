import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, Sparkles, BookOpen, CheckSquare, 
  Brain, Zap, Command, Check,
  RotateCw, Layers
} from 'lucide-react';

export const WelcomeBentoGrid: React.FC = () => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'actions'>('summary');
  const [checkedTask, setCheckedTask] = useState(true);

  return (
    <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-4 text-left">
      {/* ─── Card 1: Real-time Audio & Live Intelligence (Span 7 cols) ─── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 24, delay: 0.05 }}
        className="md:col-span-7 rounded-2xl border border-white/[0.08] bg-[#141517]/80 hover:bg-[#141517] backdrop-blur-xl p-6 relative overflow-hidden group transition-all duration-300 hover:border-lime/30 hover:shadow-[0_0_30px_rgba(186,255,41,0.08)] flex flex-col justify-between"
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 w-56 h-56 bg-lime/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16 group-hover:bg-lime/15 transition-all duration-500" />

        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-lime/10 border border-lime/20 text-lime text-xs font-semibold tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse" />
              Real-Time Transcription
            </div>
            <span className="text-[11px] font-mono text-white/40 tracking-wider">99.4% ACCURACY</span>
          </div>

          <h3 className="text-xl font-bold text-white tracking-tight mb-1.5">
            Capture Every Spoken Word Effortlessly
          </h3>
          <p className="text-xs text-white/60 leading-relaxed mb-5">
            Continuous local and cloud speech-to-text with instantaneous speaker diarization, auto-detection, and key phrase identification.
          </p>

          {/* Interactive Live Audio Visualizer & Transcript Stream Simulation */}
          <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0C]/90 p-4 space-y-3 shadow-inner">
            {/* Audio Wave Bars */}
            <div className="flex items-center justify-between px-2 pb-2 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-lime/10 flex items-center justify-center text-lime">
                  <Mic size={13} />
                </div>
                <span className="text-xs font-medium text-white/80">System & Mic Audio</span>
              </div>
              <div className="flex items-center gap-1 h-5">
                {[30, 65, 45, 90, 75, 40, 85, 100, 60, 80, 50, 95, 40, 70, 30].map((h, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [`${Math.max(15, h * 0.4)}%`, `${h}%`, `${Math.max(15, h * 0.3)}%`] }}
                    transition={{
                      repeat: Infinity,
                      repeatType: "reverse",
                      duration: 0.8 + (i % 5) * 0.15,
                      ease: "easeInOut",
                    }}
                    className="w-1 rounded-full bg-lime/80"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Transcript Snippet */}
            <div className="space-y-2 text-xs font-sans">
              <div className="flex items-start gap-2.5">
                <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-white/10 text-white/70">
                  00:14
                </span>
                <span className="font-semibold text-lime text-[11px] shrink-0">Alex (Host):</span>
                <p className="text-white/80 leading-relaxed">
                  "Let's finalize the CDN architecture roadmap and review the cache-invalidation edge cases..."
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-white/10 text-white/70">
                  00:28
                </span>
                <span className="font-semibold text-sky-400 text-[11px] shrink-0">Elena:</span>
                <p className="text-white/80 leading-relaxed">
                  "Agreed. I'll deploy the updated worker scripts to staging before Thursday's sync."
                  <span className="inline-block w-1.5 h-3 ml-1 bg-lime animate-pulse align-middle" />
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-white/50">
          <span className="flex items-center gap-1.5">
            <Zap size={12} className="text-lime" /> Zero latency local buffering
          </span>
          <span className="font-mono text-[10px] text-lime/80">LIVE RECORDING ON DEMAND</span>
        </div>
      </motion.div>

      {/* ─── Card 2: Agentic Smart Notes & Instant Summaries (Span 5 cols) ─── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 24, delay: 0.1 }}
        className="md:col-span-5 rounded-2xl border border-white/[0.08] bg-[#141517]/80 hover:bg-[#141517] backdrop-blur-xl p-6 relative overflow-hidden group transition-all duration-300 hover:border-lime/30 hover:shadow-[0_0_30px_rgba(186,255,41,0.08)] flex flex-col justify-between"
      >
        <div className="absolute top-0 right-0 w-44 h-44 bg-lime/5 rounded-full blur-2xl pointer-events-none -mr-12 -mt-12" />

        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/80 text-xs font-semibold">
              <Sparkles size={12} className="text-lime" />
              Agentic Synthesis
            </div>
            {/* Interactive Tab Switcher */}
            <div className="flex items-center bg-black/40 p-0.5 rounded-lg border border-white/[0.06] text-[10px]">
              {(['summary', 'actions'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                    activeTab === tab 
                      ? 'bg-lime text-black font-bold shadow-xs' 
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {tab === 'summary' ? 'Summary' : 'Tasks'}
                </button>
              ))}
            </div>
          </div>

          <h3 className="text-lg font-bold text-white tracking-tight mb-1.5">
            Smart Structured Notes
          </h3>
          <p className="text-xs text-white/60 leading-relaxed mb-4">
            Transform messy transcript streams into executive takeaways, decision logs, and verified checklists in seconds.
          </p>

          {/* Interactive Preview Card */}
          <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0C]/90 p-3.5 space-y-2.5 shadow-inner min-h-[140px]">
            <AnimatePresence mode="wait">
              {activeTab === 'summary' ? (
                <motion.div
                  key="summary"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-2 text-xs"
                >
                  <div className="flex items-center gap-1.5 text-lime font-medium text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-lime" />
                    Key Decision
                  </div>
                  <p className="text-white/80 text-xs leading-snug">
                    Deploy Edge-Cache v2 with automatic stale-while-revalidate invalidation.
                  </p>
                  <div className="pt-1 text-[11px] text-white/50 border-t border-white/[0.04]">
                    ⏱️ Saved 42 minutes of manual note synthesis
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="actions"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-2 text-xs"
                >
                  <div 
                    onClick={() => setCheckedTask(!checkedTask)}
                    className="flex items-center gap-2 p-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer border border-white/[0.04] transition-all"
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                      checkedTask ? 'bg-lime text-black' : 'border border-white/40'
                    }`}>
                      {checkedTask && <Check size={11} strokeWidth={3} />}
                    </div>
                    <span className={`text-xs ${checkedTask ? 'line-through text-white/40' : 'text-white/90'}`}>
                      Deploy worker scripts to staging
                    </span>
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-lime/10 text-lime font-mono">
                      @Elena
                    </span>
                  </div>

                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                    <div className="w-4 h-4 rounded border border-white/40" />
                    <span className="text-xs text-white/90">
                      Configure synthetic load test
                    </span>
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/60 font-mono">
                      @Alex
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-white/50">
          <span className="flex items-center gap-1 text-white/70">
            <CheckSquare size={12} className="text-lime" /> Auto-sync with Notion / Tasks
          </span>
          <span className="text-lime text-[11px] font-medium">TipTap Editor</span>
        </div>
      </motion.div>

      {/* ─── Card 3: Interactive Study & Flashcard Intelligence (Span 5 cols) ─── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 24, delay: 0.15 }}
        className="md:col-span-5 rounded-2xl border border-white/[0.08] bg-[#141517]/80 hover:bg-[#141517] backdrop-blur-xl p-6 relative overflow-hidden group transition-all duration-300 hover:border-lime/30 hover:shadow-[0_0_30px_rgba(186,255,41,0.08)] flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <Brain size={12} />
              Active Recall & Quiz
            </div>
            <button 
              type="button"
              onClick={() => setIsFlipped(!isFlipped)}
              className="flex items-center gap-1 text-[11px] text-white/50 hover:text-lime transition-colors"
            >
              <RotateCw size={11} className={isFlipped ? "rotate-180 transition-transform" : ""} />
              Click to flip
            </button>
          </div>

          <h3 className="text-lg font-bold text-white tracking-tight mb-1.5">
            Flashcards & Knowledge Checks
          </h3>
          <p className="text-xs text-white/60 leading-relaxed mb-4">
            Turn meeting concepts or study lectures into spaced-repetition cards and multiple-choice quizzes with 1-click.
          </p>

          {/* Interactive Flip Card */}
          <motion.div
            onClick={() => setIsFlipped(!isFlipped)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="cursor-pointer rounded-xl border border-white/[0.08] bg-gradient-to-br from-[#1C1E22] to-[#0D0E10] p-4 min-h-[110px] flex flex-col justify-between shadow-lg relative overflow-hidden group/flip transition-all"
          >
            <div className="absolute top-2 right-2 text-[10px] font-mono text-white/30 uppercase tracking-widest">
              {isFlipped ? 'ANSWER' : 'QUESTION'}
            </div>

            <div className="pr-12">
              {!isFlipped ? (
                <div>
                  <span className="text-[10px] font-semibold text-lime tracking-wider uppercase block mb-1">
                    System Architecture
                  </span>
                  <p className="text-xs font-medium text-white/90 leading-snug">
                    What is the primary trade-off of stale-while-revalidate caching?
                  </p>
                </div>
              ) : (
                <div>
                  <span className="text-[10px] font-semibold text-emerald-400 tracking-wider uppercase block mb-1">
                    Core Concept
                  </span>
                  <p className="text-xs text-white/90 leading-snug">
                    Users instantly receive cached content while background fetches update cache, accepting slight staleness for near-zero latency.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.06] text-[10px] text-white/40">
              <span>{isFlipped ? '✅ Correct' : 'Tap to reveal answer'}</span>
              <span className="text-lime font-mono">Spaced Repetition #1</span>
            </div>
          </motion.div>
        </div>

        <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-white/50">
          <span className="flex items-center gap-1.5">
            <BookOpen size={12} className="text-lime" /> Instant Quiz Generator
          </span>
          <span className="text-white/40">Exam & Sync Ready</span>
        </div>
      </motion.div>

      {/* ─── Card 4: Command Center & Productivity Shortcuts (Span 7 cols) ─── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 24, delay: 0.2 }}
        className="md:col-span-7 rounded-2xl border border-white/[0.08] bg-[#141517]/80 hover:bg-[#141517] backdrop-blur-xl p-6 relative overflow-hidden group transition-all duration-300 hover:border-lime/30 hover:shadow-[0_0_30px_rgba(186,255,41,0.08)] flex flex-col justify-between"
      >
        <div className="absolute top-0 left-1/3 w-60 h-60 bg-lime/5 rounded-full blur-3xl pointer-events-none" />

        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/80 text-xs font-semibold">
              <Command size={12} className="text-lime" />
              Power User Workflows
            </div>
            <span className="text-[11px] font-mono text-lime/90 tracking-wider">UNIVERSAL PALETTE</span>
          </div>

          <h3 className="text-xl font-bold text-white tracking-tight mb-1.5">
            Fast, Keyboard-First Command Center
          </h3>
          <p className="text-xs text-white/60 leading-relaxed mb-5">
            Navigate your entire archive, trigger AI summaries, start recordings, or query across all past meetings without touching your mouse.
          </p>

          {/* Interactive Keyboard Shortcuts Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0C]/90 p-3 flex flex-col justify-between shadow-inner">
              <span className="text-[11px] text-white/50 mb-2">Global Search</span>
              <div className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 rounded-md bg-white/10 text-white text-xs font-mono font-bold shadow-xs">
                  ⌘ / Ctrl
                </kbd>
                <span className="text-white/40 text-xs">+</span>
                <kbd className="px-2 py-1 rounded-md bg-lime text-black text-xs font-mono font-bold shadow-xs">
                  K
                </kbd>
              </div>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0C]/90 p-3 flex flex-col justify-between shadow-inner">
              <span className="text-[11px] text-white/50 mb-2">Instant Record</span>
              <div className="flex items-center gap-1.5">
                <kbd className="px-3 py-1 rounded-md bg-white/10 text-white text-xs font-mono font-bold shadow-xs">
                  Space
                </kbd>
                <span className="text-[10px] text-white/40 font-sans">or Record Btn</span>
              </div>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0C]/90 p-3 flex flex-col justify-between shadow-inner">
              <span className="text-[11px] text-white/50 mb-2">Ask Global AI</span>
              <div className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 rounded-md bg-white/10 text-white text-xs font-mono font-bold shadow-xs">
                  ⌘
                </kbd>
                <span className="text-white/40 text-xs">+</span>
                <kbd className="px-2 py-1 rounded-md bg-white/10 text-white text-xs font-mono font-bold shadow-xs">
                  J
                </kbd>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-white/50">
          <span className="flex items-center gap-1.5 text-white/70">
            <Layers size={12} className="text-lime" /> Folders, Tagging, & Full-text Search
          </span>
          <span className="font-mono text-lime/80 text-[10px]">ALL DATA STORED LOCALLY</span>
        </div>
      </motion.div>
    </div>
  );
};
