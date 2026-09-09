"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowDown, Calendar, Users, FolderPlus, Mic, Video, PhoneOff, CheckCircle2 } from "lucide-react";
import Image from "next/image";

export default function Hero() {
  const [activeTab, setActiveTab] = useState<"enhanced" | "raw">("enhanced");

  return (
    <section className="relative pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden bg-[#FCFBF9]">
      <div className="max-w-7xl mx-auto px-4 md:px-10">
        
        {/* 2-Column Split: Editorial Copy on Left, Visual Layered Mockup on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-[52%_48%] gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Granola-Style Typography */}
          <div className="flex flex-col items-start text-left">
            
            {/* Pill Badge */}
            <motion.a
              href="#downloads"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="group inline-flex items-center gap-2 pl-1.5 pr-3.5 py-1 rounded-full bg-[#F4F3EF] hover:bg-[#EAE8DF] border border-[#E8E6DE] transition-all mb-8 shadow-2xs cursor-pointer"
            >
              <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-[#D1E043] text-[#1E1E1E]">
                New
              </span>
              <span className="text-[13.5px] font-medium text-[#1E1E1E]">
                Bacham for Mac &amp; Windows
              </span>
              <ArrowRight size={13} className="text-[#666666] group-hover:translate-x-0.5 transition-transform" />
            </motion.a>

            {/* Massive Serif Display Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="font-serif text-5xl sm:text-7xl lg:text-[82px] font-normal leading-[0.93] tracking-[-0.03em] text-[#1E1E1E] max-w-[11ch] text-balance mb-6"
            >
              The AI notepad for back-to-back meetings
            </motion.h1>

            {/* Subtitle */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="text-lg sm:text-xl text-[#1E1E1E]/90 font-normal leading-snug mb-8 max-w-md"
            >
              <p>Notes, actions and memory.</p>
              <p>Without a meeting bot.</p>
            </motion.div>

            {/* CTA Button Group */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-start gap-4"
            >
              <a
                href="#downloads"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[#4F6322] hover:bg-[#43541c] text-white font-medium text-[15.5px] shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
              >
                <span>Download for free</span>
                <ArrowDown size={16} strokeWidth={2.2} />
              </a>

              {/* Platform availability note */}
              <div className="flex items-center gap-2 text-[13px] text-[#666666] pt-1">
                <CheckCircle2 size={16} className="text-[#4F6322] shrink-0" />
                <span>Available for macOS, Windows, Chrome &amp; Local Ollama</span>
              </div>
            </motion.div>

          </div>

          {/* Right Column: Exact Granola Visual Composition (Layered Art + Notepad + Video Call) */}
          <div className="relative w-full flex items-center justify-center lg:justify-end">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-[460px] aspect-[4/5] sm:aspect-[4/5] flex items-center justify-center"
            >
              
              {/* Layer 1A: Chartreuse / Lime textured art card (Left background) */}
              <div className="absolute -left-6 top-8 w-44 sm:w-52 h-72 sm:h-80 rounded-2xl bg-[#CCD948] overflow-hidden shadow-lg -rotate-6 transform -z-10 border border-[#b8c63b]/50">
                <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#1E1E1E_1px,transparent_1px)] [background-size:12px_12px]" />
                <div className="absolute bottom-4 left-4 font-mono text-[11px] text-[#1E1E1E]/60 uppercase tracking-widest font-bold">
                  Bacham / v0.1.0
                </div>
                <div className="absolute top-6 -right-6 w-24 h-24 rounded-full border-2 border-[#1E1E1E]/10" />
              </div>

              {/* Layer 1B: Dark abstract burst / energy poster (Right background) */}
              <div className="absolute -right-4 top-2 w-48 sm:w-56 h-80 sm:h-96 rounded-2xl bg-[#18181A] overflow-hidden shadow-xl rotate-6 transform -z-10 border border-[#333]/40">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-600/40 via-red-900/30 to-black/90" />
                <div className="absolute inset-0 opacity-40 mix-blend-screen bg-[radial-gradient(#ff9e42_1px,transparent_1px)] [background-size:8px_8px]" />
                <div className="absolute top-4 right-4 text-white/30 font-mono text-[10px] tracking-widest">
                  100% PRIVATE
                </div>
              </div>

              {/* Layer 1C: Watermark typographic backdrop card (Bottom background) */}
              <div className="absolute -bottom-6 left-12 w-64 h-32 rounded-xl bg-[#F4F1E8] -z-10 rotate-2 border border-[#E5E2D6] p-4 flex items-end justify-between opacity-80">
                <span className="font-serif text-5xl text-[#1E1E1E]/10 font-bold select-none">2026</span>
                <span className="font-mono text-xs text-[#1E1E1E]/30 tracking-widest uppercase">Local Engine</span>
              </div>

              {/* Layer 2: Center Floating macOS Notepad Window */}
              <div className="relative z-10 w-full bg-[#FAF9F5] border border-[#E8E6DE] rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.12)] p-5 sm:p-6 backdrop-blur-sm">
                
                {/* macOS Window Controls */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff736a] border border-black/10" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e] border border-black/10" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#19c332] border border-black/10" />
                </div>

                {/* Note Title */}
                <h3 className="font-serif text-2xl font-normal text-[#1E1E1E] mb-2 tracking-tight">
                  Q3 GTM sync
                </h3>

                {/* Meta Badges */}
                <div className="flex items-center gap-2 pb-4 mb-4 border-b border-[#E8E6DE]/60">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#E8E6DE] bg-white text-[11px] text-[#666666]">
                    <Calendar size={12} className="text-[#666666]" />
                    <span>Today</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#E8E6DE] bg-white text-[11px] text-[#666666]">
                    <Users size={12} className="text-[#666666]" />
                    <span>4 participants</span>
                  </div>
                  <div className="w-6 h-6 rounded-full border border-[#E8E6DE] bg-white flex items-center justify-center text-[#666666]">
                    <FolderPlus size={12} />
                  </div>
                </div>

                {/* Notepad Body Content (Switchable between Enhanced AI & Raw Notes) */}
                <div className="min-h-[220px] text-[12px] leading-relaxed text-[#1E1E1E]">
                  <AnimatePresence mode="wait">
                    {activeTab === "enhanced" ? (
                      <motion.div
                        key="enhanced"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3 font-sans"
                      >
                        {/* Section 1 */}
                        <div>
                          <p className="font-semibold text-[#1E1E1E] text-[12px] mb-1">
                            ICP Alignment Confirmation
                          </p>
                          <ul className="space-y-1 text-[#444444] pl-2">
                            <li className="flex items-start gap-1.5">
                              <span className="text-[#1E1E1E]">•</span>
                              <span>Agreed to narrow Q3 focus to mid-market finance and ops buyers</span>
                            </li>
                            <li className="flex items-start gap-1.5 pl-3 text-[#666666]">
                              <span>–</span>
                              <span>SMB deprioritised for the quarter</span>
                            </li>
                            <li className="flex items-start gap-1.5 pl-3 text-[#666666]">
                              <span>–</span>
                              <span>Paid campaigns paused until ICP doc is confirmed</span>
                            </li>
                          </ul>
                        </div>

                        {/* Section 2 */}
                        <div>
                          <p className="font-semibold text-[#1E1E1E] text-[12px] mb-1">
                            Deal Stalls: Sales Input
                          </p>
                          <ul className="space-y-1 text-[#444444] pl-2">
                            <li className="flex items-start gap-1.5">
                              <span className="text-[#1E1E1E]">•</span>
                              <span>Jack flagged deals stalling at business case stage</span>
                            </li>
                            <li className="flex items-start gap-1.5 pl-3 text-[#666666]">
                              <span>–</span>
                              <span>Marketing to build a business case template</span>
                            </li>
                            <li className="flex items-start gap-1.5 pl-3 text-[#666666]">
                              <span>–</span>
                              <span>CS to share proof points from successful onboardings</span>
                            </li>
                          </ul>
                        </div>

                        {/* Next Steps */}
                        <div className="pt-1">
                          <p className="font-semibold text-[#1E1E1E] text-[12px] mb-1">
                            Next Steps
                          </p>
                          <ul className="space-y-1 text-[#444444] pl-2">
                            <li className="flex items-start gap-1.5">
                              <span className="text-[#4F6322] font-bold">•</span>
                              <span><strong className="font-medium text-[#1E1E1E]">Tanya:</strong> Update ICP doc and pause paid campaigns</span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <span className="text-[#4F6322] font-bold">•</span>
                              <span><strong className="font-medium text-[#1E1E1E]">Rob:</strong> Scope business case template by Tuesday</span>
                            </li>
                          </ul>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="raw"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-2 font-mono text-[11.5px] text-[#555555] pt-2"
                      >
                        <p className="text-[#888888] italic">// Raw typed meeting notes:</p>
                        <p>confirm ICP alignment</p>
                        <p>jack deals stall at business case</p>
                        <p>tanya pause paid ad spend</p>
                        <p>rob prep template tues</p>
                        <p className="text-[#4F6322] pt-4 font-sans text-xs font-medium">
                          ✦ Whisper local loopback captured 42 min transcript in background
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Granola Bottom Segmented Toggle Pill */}
                <div className="mt-5 pt-3 border-t border-[#E8E6DE]/60 flex justify-center">
                  <div className="inline-flex p-1 rounded-full bg-[#EAE8DF] border border-[#DDD9CE]">
                    <button
                      type="button"
                      onClick={() => setActiveTab("raw")}
                      className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                        activeTab === "raw"
                          ? "bg-white text-[#1E1E1E] shadow-2xs"
                          : "text-[#666666] hover:text-[#1E1E1E]"
                      }`}
                    >
                      My notes
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("enhanced")}
                      className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                        activeTab === "enhanced"
                          ? "bg-white text-[#1E1E1E] shadow-2xs font-semibold"
                          : "text-[#666666] hover:text-[#1E1E1E]"
                      }`}
                    >
                      Enhanced
                    </button>
                  </div>
                </div>

              </div>

              {/* Layer 3: Overlaid Floating Video Call Overlay Widget */}
              <div className="absolute -bottom-4 -right-2 sm:-right-5 z-20 w-32 sm:w-36 bg-[#161618] border border-white/10 rounded-xl p-2 shadow-2xl flex flex-col gap-1.5">
                
                {/* Participant 1 Video Tile */}
                <div className="relative aspect-video rounded-lg overflow-hidden bg-[#242428] border border-white/5 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-rose-400 flex items-center justify-center text-white font-bold text-xs shadow-inner">
                    TP
                  </div>
                  <span className="absolute bottom-1 left-1.5 text-[9px] font-medium text-white/80 bg-black/50 px-1 rounded">
                    Tanya
                  </span>
                  <div className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                </div>

                {/* Participant 2 Video Tile */}
                <div className="relative aspect-video rounded-lg overflow-hidden bg-[#242428] border border-white/5 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-400 flex items-center justify-center text-white font-bold text-xs shadow-inner">
                    JK
                  </div>
                  <span className="absolute bottom-1 left-1.5 text-[9px] font-medium text-white/80 bg-black/50 px-1 rounded">
                    Jack
                  </span>
                </div>

                {/* Mini Call Controls */}
                <div className="flex items-center justify-center gap-1.5 pt-0.5">
                  <span className="w-6 h-4 rounded-full bg-[#38383C] text-white flex items-center justify-center">
                    <Mic size={9} />
                  </span>
                  <span className="w-6 h-4 rounded-full bg-[#38383C] text-white flex items-center justify-center">
                    <Video size={9} />
                  </span>
                  <span className="w-6 h-4 rounded-full bg-[#EF4444] text-white flex items-center justify-center">
                    <PhoneOff size={9} />
                  </span>
                </div>

              </div>

            </motion.div>
          </div>

        </div>

      </div>
    </section>
  );
}
