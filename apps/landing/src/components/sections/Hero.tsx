"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowDown,
  Calendar,
  Users,
  FolderPlus,
  Mic,
  Video,
  PhoneOff,
  CheckCircle2,
  Clock,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  NoBotsSticker,
  LocalSsdSticker,
  StudyModeSticker,
  DualStreamSticker,
  WashiTape,
  DoodleAnnotation,
  StarburstSticker,
} from "@/components/ui/CartoonStickers";

export default function Hero() {
  const [activeTab, setActiveTab] = useState<"notes" | "transcript" | "flashcards">("notes");
  const [revealedAnswer, setRevealedAnswer] = useState(false);
  const [actionItemChecked, setActionItemChecked] = useState<Record<number, boolean>>({
    0: false,
    1: true,
    2: false,
  });

  const toggleAction = (idx: number) => {
    setActionItemChecked((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <section className="relative pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden bg-[#000000]">
      <div className="max-w-7xl mx-auto px-4 md:px-10">
        
        {/* 2-Column Split: Editorial Copy on Left, Visual Layered Mockup on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-[52%_48%] gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Granola-Style Typography + Trendy Cartoon Hook */}
          <div className="flex flex-col items-start text-left relative z-10">
            
            {/* Pill Badge + Trending Sticker */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <motion.a
                href="#downloads"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="group inline-flex items-center gap-2 pl-1.5 pr-3.5 py-1 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 transition-all shadow-2xs cursor-pointer"
              >
                <span className="px-2 py-0.5 text-[11px] font-black rounded-full bg-[#D1E043] text-[#1E1E1E] uppercase tracking-wider">
                  NEW v0.1.0
                </span>
                <span className="text-[13px] font-medium text-[#FFFFFF]">
                  Real-Time Meeting &amp; Lecture Copilot
                </span>
                <ArrowRight size={13} className="text-[#A1A1A6] group-hover:translate-x-0.5 transition-transform" />
              </motion.a>

              <NoBotsSticker className="rotate-2" />
            </div>

            {/* Display Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="font-serif text-3xl sm:text-4xl lg:text-[48px] font-normal leading-[1.1] tracking-[-0.02em] text-[#FFFFFF] max-w-[20ch] text-balance mb-5"
            >
              Your meetings had more than words.{' '}
              <span
                className="text-[#D1E043]"
                style={{
                  fontFamily: 'var(--font-caveat), cursive',
                  fontWeight: 700,
                  fontSize: '1.2em',
                  letterSpacing: '0.01em',
                  lineHeight: '1.2',
                  display: 'inline-block',
                  marginTop: '4px',
                }}
              >
                Bacham remembers the rest.
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="text-base sm:text-lg text-[#D1D1D6] font-normal leading-relaxed mb-8 max-w-md"
            >
              <p>
                Dual-stream audio capture, live transcription &amp;{' '}
                <strong className="text-white font-semibold">1-click flashcards</strong>
                {' '}— 100% on your SSD.
              </p>
            </motion.div>

            {/* CTA Button Group & Trendy Sticker Accents */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4"
            >
              <a
                href="#downloads"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[#D1E043] hover:bg-[#c4d436] text-[#1E1E1E] font-bold text-[15.5px] shadow-lg hover:shadow-xl transition-all active:scale-[0.98] cursor-pointer"
              >
                <span>Download for free</span>
                <ArrowDown size={16} strokeWidth={2.6} />
              </a>

              <LocalSsdSticker className="-rotate-2" />
            </motion.div>

            {/* Platform availability note */}
            <div className="flex items-center gap-2 text-[13px] text-[#A1A1A6] pt-1">
              <CheckCircle2 size={16} className="text-[#D1E043] shrink-0" />
              <span>Available for macOS, Windows 10/11 &amp; Chrome Extension</span>
            </div>

          </div>

          {/* Right Column: Layered Art + Tactile Notepad + Stickers */}
          <div className="relative w-full flex items-center justify-center lg:justify-end">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-[480px] aspect-[4/5] sm:aspect-[4/5] flex items-center justify-center"
            >
              
              {/* Background Cartoon Stickers & Stamps */}
              <StarburstSticker text="100% SSD LOCAL" className="absolute -top-10 -right-6 z-30" />
              <DualStreamSticker className="absolute -bottom-8 -left-6 z-30 -rotate-6 hidden sm:inline-flex" />
              <StudyModeSticker className="absolute top-1/2 -right-10 z-30 rotate-12 hidden md:inline-flex" />

              {/* Layer 1A: Chartreuse textured art card (Left background) */}
              <div className="absolute -left-6 top-8 w-44 sm:w-52 h-72 sm:h-80 rounded-2xl bg-[#CCD948] overflow-hidden shadow-2xl -rotate-6 transform -z-10 border border-[#b8c63b]/60">
                <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#1E1E1E_1px,transparent_1px)] [background-size:12px_12px]" />
                <div className="absolute bottom-4 left-4 font-mono text-[11px] text-[#1E1E1E]/70 uppercase tracking-widest font-bold">
                  Bacham / v0.1.0
                </div>
                <div className="absolute top-6 -right-6 w-24 h-24 rounded-full border-2 border-[#1E1E1E]/15" />
              </div>

              {/* Layer 1B: Dark abstract burst poster (Right background) */}
              <div className="absolute -right-4 top-2 w-48 sm:w-56 h-80 sm:h-96 rounded-2xl bg-[#0D0D0E] overflow-hidden shadow-2xl rotate-6 transform -z-10 border border-white/10">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-600/35 via-red-900/25 to-black/95" />
                <div className="absolute inset-0 opacity-40 mix-blend-screen bg-[radial-gradient(#ff9e42_1px,transparent_1px)] [background-size:8px_8px]" />
                <div className="absolute top-4 right-4 text-white/40 font-mono text-[10px] tracking-widest">
                  100% PRIVATE
                </div>
              </div>

              {/* Layer 1C: Watermark typographic backdrop card (Bottom background) */}
              <div className="absolute -bottom-6 left-12 w-64 h-32 rounded-xl bg-[#121214] -z-10 rotate-2 border border-white/10 p-4 flex items-end justify-between opacity-80">
                <span className="font-serif text-5xl text-white/10 font-bold select-none">2026</span>
                <span className="font-mono text-xs text-white/30 tracking-widest uppercase">Local Engine</span>
              </div>

              {/* Layer 2: Center Floating Paper Notepad Window with Washi Tape */}
              <div className="relative z-10 w-full bg-[#FAF9F5] border border-[#E8E6DE] rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] p-5 sm:p-6 backdrop-blur-sm">
                
                {/* Trendy Washi Tape over window header */}
                <WashiTape color="lime" className="absolute -top-2 left-10 rotate-[-2deg] z-20" />
                <WashiTape color="pink" className="absolute -top-2 right-12 rotate-[3deg] z-20" />

                {/* macOS Window Controls + Live Status */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ff736a] border border-black/10" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e] border border-black/10" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#19c332] border border-black/10" />
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#EAE8DF] border border-[#DDD9CE] text-[10px] font-mono text-[#4F6322] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                    <span>WASAPI Loopback Active</span>
                  </div>
                </div>

                {/* Real Meeting Title from sampleMeetingData */}
                <h3 className="font-serif text-2xl font-normal text-[#1E1E1E] mb-1.5 tracking-tight">
                  Bacham — Architecture &amp; Strategy
                </h3>

                {/* Meta Badges */}
                <div className="flex items-center gap-2 pb-3 mb-3 border-b border-[#E8E6DE]/70">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-[#E8E6DE] bg-white text-[11px] text-[#666666]">
                    <Calendar size={11} className="text-[#666666]" />
                    <span>Today</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-[#E8E6DE] bg-white text-[11px] text-[#666666]">
                    <Users size={11} className="text-[#666666]" />
                    <span>Alex, Maya, David</span>
                  </div>
                  <div className="w-5 h-5 rounded-full border border-[#E8E6DE] bg-white flex items-center justify-center text-[#666666]">
                    <FolderPlus size={11} />
                  </div>
                </div>

                {/* Notepad Body Content (Switchable between Notes, Transcript, Flashcards) */}
                <div className="min-h-[240px] max-h-[255px] overflow-y-auto pr-1 text-[12px] leading-relaxed text-[#1E1E1E]">
                  <AnimatePresence mode="wait">
                    
                    {/* TAB 1: Real AI Notes & Timestamped Action Items */}
                    {activeTab === "notes" && (
                      <motion.div
                        key="notes"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3 font-sans"
                      >
                        <div>
                          <p className="font-semibold text-[#1E1E1E] text-[12px] mb-1 flex items-center gap-1.5">
                            <span className="text-[#4F6322]">🎯</span>
                            <span>Executive Architecture Summary</span>
                          </p>
                          <ul className="space-y-1 text-[#444444] pl-2">
                            <li className="flex items-start gap-1.5">
                              <span className="text-[#1E1E1E] font-bold">•</span>
                              <span><strong>Dual-Stream Audio Pipeline:</strong> Captures both system loopback and mic with zero echo artifacts.</span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <span className="text-[#1E1E1E] font-bold">•</span>
                              <span><strong>Local-First Storage:</strong> SQLite + FTS5 vector indexing on device for instant semantic search.</span>
                            </li>
                          </ul>
                        </div>

                        {/* Interactive Timestamped Action Items */}
                        <div className="pt-1">
                          <p className="font-semibold text-[#1E1E1E] text-[12px] mb-1.5 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <span className="text-[#4F6322]">⚡</span>
                              <span>Timestamped Action Items (Click to Replay)</span>
                            </span>
                            <span className="text-[10px] text-[#888888] font-mono">Audio Jump</span>
                          </p>
                          
                          <div className="space-y-1.5">
                            {[
                              { time: "00:32", owner: "@Maya", task: "Finalize low-latency loopback buffer for Win & Mac" },
                              { time: "00:50", owner: "@David", task: "Benchmark local Whisper quantization vs Gemini latency" },
                              { time: "01:30", owner: "@Alex", task: "Ship first-time onboarding tour & interactive mic tester" },
                            ].map((item, idx) => (
                              <div
                                key={idx}
                                onClick={() => toggleAction(idx)}
                                className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                  actionItemChecked[idx]
                                    ? "bg-[#F3F1E8] border-[#DDD9CE] opacity-65 line-through"
                                    : "bg-white border-[#E8E6DE] hover:border-[#4F6322]"
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={actionItemChecked[idx]}
                                    onChange={() => {}}
                                    className="w-3.5 h-3.5 accent-[#4F6322] cursor-pointer"
                                  />
                                  <span className="text-[11.5px] truncate">
                                    <strong className="text-[#1E1E1E]">{item.owner}:</strong> {item.task}
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono font-bold text-[#4F6322] px-1.5 py-0.5 rounded bg-[#EAE8DF] shrink-0 flex items-center gap-1">
                                  <Play size={8} fill="currentColor" />
                                  <span>{item.time}</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* TAB 2: Real Meeting Transcript Dialogue */}
                    {activeTab === "transcript" && (
                      <motion.div
                        key="transcript"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-2.5 font-sans pt-1"
                      >
                        {[
                          { time: "00:02", speaker: "Alex (Product Lead)", text: "Welcome everyone. Aligning on core technical architecture for Bacham — our real-time meeting and lecture AI copilot." },
                          { time: "00:15", speaker: "Maya (Systems Architect)", text: "Dual-stream audio solved: native loopback cleanly separates system audio and user voice into a unified transcript." },
                          { time: "00:50", speaker: "David (AI Research)", text: "Continuous chunking from local Whisper identifies key decisions and deliverables in real time." },
                          { time: "01:30", speaker: "Alex (Product Lead)", text: "Ensure flashcards & quizzes tie directly to timestamps so teams can review in seconds!" },
                        ].map((line, idx) => (
                          <div key={idx} className="p-2 rounded-lg bg-white border border-[#E8E6DE] text-[11.5px]">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-[#1E1E1E] text-[11.5px]">{line.speaker}</span>
                              <span className="text-[10px] font-mono text-[#888888] flex items-center gap-1">
                                <Clock size={9} />
                                <span>{line.time}</span>
                              </span>
                            </div>
                            <p className="text-[#555555] leading-relaxed">{line.text}</p>
                          </div>
                        ))}
                      </motion.div>
                    )}

                    {/* TAB 3: Real Flashcards & Study Mode (Bacham Superpower) */}
                    {activeTab === "flashcards" && (
                      <motion.div
                        key="flashcards"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3 font-sans pt-1"
                      >
                        <div className="p-3.5 rounded-xl bg-white border-2 border-[#D1E043] shadow-sm relative overflow-hidden">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4F6322] px-2 py-0.5 rounded-full bg-[#D1E043]/30">
                              ⚡ AI Flashcard #1 of 3
                            </span>
                            <span className="text-[10px] font-mono text-[#888888]">From [00:15]</span>
                          </div>

                          <h4 className="font-semibold text-[13px] text-[#1E1E1E] mb-2 leading-snug">
                            What is Bacham&apos;s dual-channel audio capture architecture?
                          </h4>

                          {revealedAnswer ? (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className="pt-2 border-t border-[#E8E6DE] text-[11.5px] text-[#333333] leading-relaxed"
                            >
                              <strong className="text-[#4F6322]">Answer:</strong> Bacham simultaneously captures output system audio (remote attendees) and input microphone audio (user voice), synchronizing them into a single timeline with zero echo artifacts.
                            </motion.div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setRevealedAnswer(true)}
                              className="w-full py-2 rounded-lg bg-[#FAF9F5] hover:bg-[#EAE8DF] border border-[#DDD9CE] text-[11px] font-bold text-[#4F6322] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Sparkles size={12} />
                              <span>Click to Reveal Answer</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-[#666666] pt-1">
                          <span className="flex items-center gap-1">
                            <RotateCcw size={11} />
                            <span>Spaced Repetition Active</span>
                          </span>
                          <span className="font-bold text-[#4F6322] cursor-pointer hover:underline">
                            Take 2-min Quiz →
                          </span>
                        </div>
                      </motion.div>
                    )}

                  </AnimatePresence>
                </div>

                {/* Bottom Segmented Toggle Pill (Notes | Transcript | Flashcards) */}
                <div className="mt-4 pt-3 border-t border-[#E8E6DE]/70 flex flex-col sm:flex-row items-center justify-between gap-2">
                  <div className="inline-flex p-1 rounded-full bg-[#EAE8DF] border border-[#DDD9CE] gap-0.5">
                    <button
                      type="button"
                      onClick={() => setActiveTab("notes")}
                      className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                        activeTab === "notes"
                          ? "bg-white text-[#1E1E1E] shadow-2xs font-bold"
                          : "text-[#666666] hover:text-[#1E1E1E]"
                      }`}
                    >
                      AI Notes
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("transcript")}
                      className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                        activeTab === "transcript"
                          ? "bg-white text-[#1E1E1E] shadow-2xs font-bold"
                          : "text-[#666666] hover:text-[#1E1E1E]"
                      }`}
                    >
                      Transcript
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("flashcards")}
                      className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                        activeTab === "flashcards"
                          ? "bg-[#D1E043] text-[#1E1E1E] shadow-2xs font-bold"
                          : "text-[#666666] hover:text-[#1E1E1E]"
                      }`}
                    >
                      <span>Study Deck</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4F6322]" />
                    </button>
                  </div>

                  <span className="text-[10px] font-mono text-[#888888]">
                    100% Local SQLite
                  </span>
                </div>

              </div>

              {/* Layer 3: Overlaid Floating Video Call Overlay Widget with No-Bot Badge */}
              <div className="absolute -bottom-4 -right-2 sm:-right-5 z-20 w-32 sm:w-36 bg-[#0D0D0E] border border-white/10 rounded-xl p-2 shadow-2xl flex flex-col gap-1.5">
                
                {/* Participant 1 Video Tile */}
                <div className="relative aspect-video rounded-lg overflow-hidden bg-[#1C1C20] border border-white/5 flex items-center justify-center">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-rose-400 flex items-center justify-center text-white font-bold text-xs shadow-inner">
                    AL
                  </div>
                  <span className="absolute bottom-1 left-1.5 text-[8.5px] font-medium text-white/90 bg-black/60 px-1 rounded">
                    Alex
                  </span>
                  <div className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                </div>

                {/* Participant 2 Video Tile */}
                <div className="relative aspect-video rounded-lg overflow-hidden bg-[#1C1C20] border border-white/5 flex items-center justify-center">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-400 flex items-center justify-center text-white font-bold text-xs shadow-inner">
                    MY
                  </div>
                  <span className="absolute bottom-1 left-1.5 text-[8.5px] font-medium text-white/90 bg-black/60 px-1 rounded">
                    Maya
                  </span>
                </div>

                {/* Mini Call Controls + No Bot Notice */}
                <div className="flex items-center justify-between pt-0.5 px-0.5">
                  <div className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-[#242428] text-white flex items-center justify-center text-[8px]">
                      <Mic size={8} />
                    </span>
                    <span className="w-4 h-4 rounded-full bg-[#242428] text-white flex items-center justify-center text-[8px]">
                      <Video size={8} />
                    </span>
                    <span className="w-4 h-4 rounded-full bg-[#EF4444] text-white flex items-center justify-center text-[8px]">
                      <PhoneOff size={8} />
                    </span>
                  </div>
                  <span className="text-[7.5px] font-mono text-[#D1E043] font-bold">NO BOTS</span>
                </div>

              </div>

            </motion.div>
          </div>

        </div>

      </div>
    </section>
  );
}
