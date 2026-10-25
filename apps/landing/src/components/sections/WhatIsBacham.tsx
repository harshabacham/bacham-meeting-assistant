"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BotOff,
  Mic,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Layers,
  GraduationCap,
  Briefcase,
  Lock,
  ArrowRight,
  Headphones,
  FileText,
  Clock,
  Play,
} from "lucide-react";
import {
  NoBotsSticker,
  LocalSsdSticker,
  StudyModeSticker,
  DualStreamSticker,
  WashiTape,
  DoodleAnnotation,
} from "@/components/ui/CartoonStickers";
import { LiveMeetingSimulator } from "./LiveMeetingSimulator";

export default function WhatIsBacham() {
  const [selectedPersona, setSelectedPersona] = useState<"engineers" | "students" | "executives">("engineers");

  const personas = [
    {
      id: "engineers" as const,
      label: "Engineers & Tech Leads",
      icon: Briefcase,
      headline: "Capture architecture debates and action items without disrupting the call",
      tagline: "Architecture syncs, sprint planning, pull request reviews, and 1-on-1s.",
      benefits: [
        "No bot joins or announces recording to the engineering team or clients",
        "Dual-channel audio separates your voice from remote attendees cleanly",
        "Action items automatically link to exact audio replay seconds (e.g. [03:45])",
        "Export markdown straight into Obsidian, Notion, Jira, or Slack in 1 click",
      ],
      sampleOutput: {
        title: "Sprint Architecture Sync · Core Engine",
        badge: "Auto-Generated Brief",
        points: [
          "Decision: Migrate to local Whisper v3 with WebAssembly fallback",
          "Action Item [04:12]: @David to benchmark WASAPI loopback buffer latency",
          "Security: Zero meeting audio or transcripts uploaded to third-party clouds",
        ],
      },
    },
    {
      id: "students" as const,
      label: "Students & Researchers",
      icon: GraduationCap,
      headline: "Turn 2-hour university lectures into active-recall flashcards & study decks",
      tagline: "Class lectures, guest seminars, academic symposiums, and thesis syncs.",
      benefits: [
        "1-click Study Mode transforms recorded audio into interactive flashcards",
        "Generates practice quizzes with auto-reveal answers for instant exam prep",
        "Search through entire semesters of lectures using local SQLite semantic search",
        "Works 100% offline in lecture halls with zero Wi-Fi connection required",
      ],
      sampleOutput: {
        title: "Distributed Systems 401 · Lecture 8",
        badge: "Study Deck Ready",
        points: [
          "Flashcard #1: What is the Raft consensus algorithm leader election timeout?",
          "Key Concept [18:22]: Byzantine fault tolerance in decentralized clusters",
          "Action Item: Review proof for Lemma 3.2 before Thursday's lab section",
        ],
      },
    },
    {
      id: "executives" as const,
      label: "Founders, PMs & Privacy-First",
      icon: Lock,
      headline: "Executive meetings and client negotiations with 100% data sovereignty",
      tagline: "Client discovery, board updates, salary reviews, and confidential M&A.",
      benefits: [
        "Zero awkward bot avatars sitting in your meeting room scaring clients",
        "Complete data sovereignty: audio, transcripts, and database stay on your SSD",
        "Bring your own API keys (Claude / OpenAI / Gemini) or run 100% offline Ollama",
        "Free and open-source forever with zero monthly per-seat subscription fees",
      ],
      sampleOutput: {
        title: "Enterprise Client Strategy & Pricing Review",
        badge: "Confidential · 100% Local SSD",
        points: [
          "Executive Summary: Approved annual tiered pricing for enterprise pilots",
          "Decision: Security audit report to be delivered under NDA by Friday",
          "Action Item [12:05]: @Sarah to draft custom SLA agreement terms",
        ],
      },
    },
  ];

  const currentPersona = personas.find((p) => p.id === selectedPersona)!;

  return (
    <section id="what-is-bacham" className="py-24 md:py-32 bg-[#000000] border-t border-white/10 relative overflow-hidden">
      {/* Background ambient radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[#D1E043]/5 blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 relative z-10">
        
        {/* Header: What Exactly Is Bacham? */}
        <div className="text-center max-w-3xl mx-auto mb-16 relative">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="text-[11.5px] font-black uppercase tracking-wider text-[#D1E043] select-none">
              Overview &amp; Concept
            </span>
            <NoBotsSticker className="scale-85 rotate-2" />
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-[#FFFFFF] leading-tight mb-5">
            What exactly is Bacham?
          </h2>
          
          <p className="text-base sm:text-lg text-[#D1D1D6] leading-relaxed max-w-2xl mx-auto font-normal">
            Bacham is a <strong className="text-white font-semibold">private, zero-bot AI meeting and lecture assistant</strong> for Windows, Mac &amp; Chrome.
            It records your calls <span className="text-[#D1E043] font-medium">invisibly from your computer&apos;s audio system</span>—without an uninvited bot joining your meeting room.
          </p>

          <DoodleAnnotation
            text="★ Zero bots in your call!"
            direction="down"
            className="absolute -bottom-6 right-12 hidden md:inline-flex"
          />
        </div>

        {/* 3 Core Pillars: The Foundation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          
          {/* Pillar 1 */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="p-7 rounded-2xl bg-[#0D0D0E] border border-white/10 flex flex-col justify-between relative overflow-hidden group hover:border-[#D1E043]/40 transition-all shadow-md"
          >
            <WashiTape color="lime" className="absolute -top-2 left-6 -rotate-2 z-20" />
            <div>
              <div className="w-12 h-12 rounded-xl bg-white/10 text-[#D1E043] border border-white/15 flex items-center justify-center mb-5 shadow-2xs">
                <BotOff size={24} />
              </div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#D1E043] font-bold block mb-1">
                Pillar 01
              </span>
              <h3 className="font-serif text-xl sm:text-2xl font-normal text-white mb-2">
                Zero Annoying Meeting Bots
              </h3>
              <p className="text-sm text-[#A1A1A6] leading-relaxed">
                Traditional tools (Otter, Fireflies) send an awkward bot into your Zoom or Google Meet room with a banner alerting everyone they are being recorded. Bacham hooks directly into your OS audio driver invisibly.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-[#D1D1D6]">
              <CheckCircle2 size={14} className="text-[#D1E043] shrink-0" />
              <span>Nobody else in the call sees or hears a bot</span>
            </div>
          </motion.div>

          {/* Pillar 2 */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.12 }}
            className="p-7 rounded-2xl bg-[#0D0D0E] border border-white/10 flex flex-col justify-between relative overflow-hidden group hover:border-[#D1E043]/40 transition-all shadow-md"
          >
            <WashiTape color="cyan" className="absolute -top-2 left-6 rotate-2 z-20" />
            <div>
              <div className="w-12 h-12 rounded-xl bg-white/10 text-[#D1E043] border border-white/15 flex items-center justify-center mb-5 shadow-2xs">
                <Mic size={24} />
              </div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#D1E043] font-bold block mb-1">
                Pillar 02
              </span>
              <h3 className="font-serif text-xl sm:text-2xl font-normal text-white mb-2">
                Dual-Stream Audio Precision
              </h3>
              <p className="text-sm text-[#A1A1A6] leading-relaxed">
                Captures system loopback (what you hear through speakers/headphones) and your microphone on distinct synchronized tracks. This prevents audio echo and guarantees crystal-clear speaker attribution.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-[#D1D1D6]">
              <CheckCircle2 size={14} className="text-[#D1E043] shrink-0" />
              <span>Native WASAPI on Windows &amp; CoreAudio on Mac</span>
            </div>
          </motion.div>

          {/* Pillar 3 */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.19 }}
            className="p-7 rounded-2xl bg-[#0D0D0E] border border-white/10 flex flex-col justify-between relative overflow-hidden group hover:border-[#D1E043]/40 transition-all shadow-md"
          >
            <WashiTape color="orange" className="absolute -top-2 left-6 -rotate-1 z-20" />
            <div>
              <div className="w-12 h-12 rounded-xl bg-white/10 text-[#D1E043] border border-white/15 flex items-center justify-center mb-5 shadow-2xs">
                <Cpu size={24} />
              </div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#D1E043] font-bold block mb-1">
                Pillar 03
              </span>
              <h3 className="font-serif text-xl sm:text-2xl font-normal text-white mb-2">
                100% Private on Your SSD
              </h3>
              <p className="text-sm text-[#A1A1A6] leading-relaxed">
                Your recordings, transcripts, and notes are indexed into your local SQLite database. You can run Whisper and Ollama 100% offline on your own GPU, or bring your own API keys with zero platform markup.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-[#D1D1D6]">
              <CheckCircle2 size={14} className="text-[#D1E043] shrink-0" />
              <span>Zero server logging, telemetry, or model training</span>
            </div>
          </motion.div>

        </div>

        {/* Persona Switcher: See How Bacham Fits Your Routine */}
        <div className="mb-24 rounded-3xl bg-[#0A0A0C] border border-white/10 p-6 sm:p-10 shadow-2xl relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10 mb-8">
            <div>
              <span className="text-xs font-mono font-bold text-[#D1E043] uppercase tracking-wider block mb-1">
                Tailored Workflows
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl font-normal text-white">
                Who uses Bacham every day?
              </h3>
            </div>

            {/* Persona Pills */}
            <div className="flex items-center gap-2 p-1.5 rounded-full bg-white/10 border border-white/15 overflow-x-auto scrollbar-none">
              {personas.map((p) => {
                const Icon = p.icon;
                const isSelected = selectedPersona === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPersona(p.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? "bg-[#D1E043] text-[#1E1E1E] font-bold shadow-sm"
                        : "text-[#D1D1D6] hover:text-white"
                    }`}
                  >
                    <Icon size={14} />
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Persona Card Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPersona.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              {/* Left 7 Cols: Benefits */}
              <div className="lg:col-span-7 space-y-4">
                <h4 className="font-serif text-xl sm:text-2xl font-normal text-white leading-snug">
                  {currentPersona.headline}
                </h4>
                <p className="text-sm text-[#A1A1A6] leading-relaxed">
                  {currentPersona.tagline}
                </p>

                <div className="space-y-3 pt-3">
                  {currentPersona.benefits.map((benefit, i) => (
                    <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
                      <CheckCircle2 size={16} className="text-[#D1E043] shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-[13px] text-[#D1D1D6] leading-relaxed font-normal">
                        {benefit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right 5 Cols: Sample Synthesized Card Preview */}
              <div className="lg:col-span-5 rounded-2xl bg-[#121214] border border-white/10 p-5 sm:p-6 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                  <span className="text-[11px] font-mono text-[#D1E043] font-bold uppercase tracking-wider">
                    {currentPersona.sampleOutput.badge}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-white/50 font-mono">SQLite Stored</span>
                  </div>
                </div>

                <h5 className="font-serif text-base sm:text-lg font-normal text-white mb-4">
                  {currentPersona.sampleOutput.title}
                </h5>

                <div className="space-y-2.5">
                  {currentPersona.sampleOutput.points.map((pt, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs text-[#D1D1D6] leading-relaxed">
                      {pt}
                    </div>
                  ))}
                </div>

                <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-[#8E8E93]">
                  <span>Instant Markdown &amp; PDF Export</span>
                  <a href="#downloads" className="text-[#D1E043] hover:underline font-bold flex items-center gap-1">
                    <span>Try Free</span>
                    <ArrowRight size={12} />
                  </a>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Live Simulator Integration: See It In Action */}
        <div id="demo" className="scroll-mt-24 pt-6">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/15 text-[#D1E043] text-xs font-bold mb-3 shadow-2xs">
              <Sparkles size={13} />
              <span>Interactive Live Demo</span>
            </div>
            <h3 className="font-serif text-2xl sm:text-4xl font-normal text-white mb-2">
              Experience the dual-stream ingestion in real time
            </h3>
            <p className="text-sm text-[#A1A1A6] max-w-lg mx-auto">
              Simulated Google Meet session running local Whisper v3. Toggle action items, switch tabs, and copy generated briefs.
            </p>
          </div>

          <LiveMeetingSimulator />
        </div>

      </div>
    </section>
  );
}
