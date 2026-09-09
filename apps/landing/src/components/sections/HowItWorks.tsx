"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Mic, Sparkles, CheckCircle2, GraduationCap } from "lucide-react";
import {
  StudyModeSticker,
  LocalSsdSticker,
  DualStreamSticker,
  WashiTape,
  DoodleAnnotation,
} from "@/components/ui/CartoonStickers";

export default function HowItWorks() {
  const [activeStage, setActiveStage] = useState<"before" | "during" | "after">("before");

  const stages = [
    {
      id: "before" as const,
      label: "Before the meeting",
      title: "Walk into your meeting completely prepared",
      description:
        "Bacham connects with your local calendar to synthesize a pre-meeting context brief: attendees, unresolved loops from previous sessions, and key agenda goals.",
      icon: Calendar,
      bulletPoints: [
        "Automatic attendee profile & past discussion highlights",
        "Pulls open action items from your local SQLite archive",
        "1-click launch with pre-configured audio loopback",
      ],
      previewContent: {
        badge: "Meeting Brief · Ready 5m before call",
        title: "Architecture Sync & GTM Strategy",
        items: [
          { speaker: "Maya (Systems Architect)", note: "Presenting dual-stream audio loopback benchmarks" },
          { speaker: "David (AI Research)", note: "Requested quantization feedback for local Whisper model" },
        ],
      },
    },
    {
      id: "during" as const,
      label: "During the meeting",
      title: "Stay present. Type quick shorthand.",
      description:
        "Forget transcribing. Focus on the discussion while Bacham's native loopback driver captures both remote attendees and your own microphone with zero bots in the call.",
      icon: Mic,
      bulletPoints: [
        "Native WASAPI & CoreAudio loopback capture (no virtual cables)",
        "Zero intrusive meeting bots joining or announcing recording",
        "Continuous streaming Whisper chunks with real-time decision tagging",
      ],
      previewContent: {
        badge: "Live Capture · Dual-Stream Audio Active",
        title: "Dual-Stream Pipeline [Active]",
        items: [
          { speaker: "You typed", note: "agree pricing, maya loopback buffer, david quantize whisper" },
          { speaker: "Whisper local", note: "[00:15] Maya: Dual-stream audio solved: clean separation..." },
        ],
      },
    },
    {
      id: "after" as const,
      label: "After the meeting",
      title: "Instant notes, action items & study decks",
      description:
        "The moment you hang up, your rough notes merge with the dual-channel transcript to generate clear executive summaries, timestamped action items, and an interactive study flashcard deck.",
      icon: Sparkles,
      bulletPoints: [
        "Timestamped action items with 1-click audio replay ([00:32])",
        "Automatic Flashcard & Quiz generator for lecture review",
        "Instant Markdown export for Slack, Notion, or local PDF",
      ],
      previewContent: {
        badge: "Enhanced Synthesis · 0.3s Local Generation",
        title: "Executive Synthesis & Flashcard Ready",
        items: [
          { speaker: "Action Item [00:32]", note: "@Maya: Finalize low-latency loopback buffer for Win/Mac" },
          { speaker: "Flashcard #1", note: "Q: What is Bacham's dual-channel architecture? (Tap to reveal)" },
        ],
      },
    },
  ];

  const currentStage = stages.find((s) => s.id === activeStage)!;
  const CurrentIcon = currentStage.icon;

  return (
    <section id="how-it-works" className="py-24 md:py-32 bg-[#000000] border-t border-white/10 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Section Headline with Trendy Stickers */}
        <div className="text-center max-w-3xl mx-auto mb-16 relative">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="text-[11.5px] font-black uppercase tracking-wider text-[#D1E043] select-none">
              End-To-End Workflow
            </span>
            <DualStreamSticker className="scale-85 rotate-2" />
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-[#FFFFFF] leading-tight mb-4">
            Bacham helps you before, during and after your meetings.
          </h2>
          <p className="text-base sm:text-lg text-[#A1A1A6] leading-relaxed">
            A frictionless workflow designed for fast-paced engineering teams and back-to-back schedules.
          </p>

          <DoodleAnnotation
            text="★ Click stages to preview!"
            direction="down"
            className="absolute -bottom-6 right-10 hidden md:inline-flex"
          />
        </div>

        {/* 3 Segmented Stage Selector Pills */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex p-1.5 rounded-full bg-white/10 border border-white/15 shadow-md gap-1">
            {stages.map((stage) => {
              const isActive = activeStage === stage.id;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setActiveStage(stage.id)}
                  className={`px-5 py-2 rounded-full text-[13px] font-medium transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#D1E043] text-[#1E1E1E] shadow-sm font-bold"
                      : "text-[#D1D1D6] hover:text-[#FFFFFF]"
                  }`}
                >
                  {stage.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Stage Presentation Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStage.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-[#0D0D0E] border border-white/10 rounded-3xl p-8 sm:p-12 shadow-xl relative overflow-hidden"
          >
            <WashiTape color="pink" className="absolute -top-2 left-16 rotate-[-2deg] z-20" />

            {/* Left: Text & Key Highlights */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[#D1E043] text-xs font-bold mb-4 shadow-2xs">
                <CurrentIcon size={14} />
                <span>{currentStage.label}</span>
              </div>

              <h3 className="font-serif text-3xl sm:text-4xl font-normal text-[#FFFFFF] mb-4 tracking-tight">
                {currentStage.title}
              </h3>
              <p className="text-[#A1A1A6] text-base leading-relaxed mb-6">
                {currentStage.description}
              </p>

              <div className="space-y-3">
                {currentStage.bulletPoints.map((bp, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm text-[#D1D1D6]">
                    <CheckCircle2 size={16} className="text-[#D1E043] shrink-0" />
                    <span>{bp}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Tactile Notepad Preview Mockup with Stickers */}
            <div className="relative w-full bg-[#FAF9F5] border border-[#E8E6DE] rounded-2xl p-6 shadow-2xl flex flex-col justify-between text-[#1E1E1E]">
              <WashiTape color="lime" className="absolute -top-2 right-10 rotate-[3deg] z-20" />
              {activeStage === "after" && (
                <StudyModeSticker className="absolute -bottom-4 -right-4 z-30 scale-85 rotate-6" />
              )}
              {activeStage === "during" && (
                <DualStreamSticker className="absolute -bottom-4 -right-4 z-30 scale-85 -rotate-6" />
              )}
              {activeStage === "before" && (
                <LocalSsdSticker className="absolute -bottom-4 -right-4 z-30 scale-85 rotate-3" />
              )}

              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E8E6DE]">
                  <span className="text-[11px] font-mono font-bold text-[#4F6322] uppercase tracking-wider">
                    {currentStage.previewContent.badge}
                  </span>
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#E8E6DE]" />
                    <span className="w-2 h-2 rounded-full bg-[#E8E6DE]" />
                    <span className="w-2 h-2 rounded-full bg-[#E8E6DE]" />
                  </div>
                </div>

                <h4 className="font-serif text-xl font-normal text-[#1E1E1E] mb-4">
                  {currentStage.previewContent.title}
                </h4>

                <div className="space-y-3">
                  {currentStage.previewContent.items.map((item, i) => (
                    <div key={i} className="p-3.5 rounded-xl bg-white border border-[#E8E6DE] text-xs shadow-2xs">
                      <span className="font-semibold text-[#1E1E1E] block mb-1">
                        {item.speaker}
                      </span>
                      <span className="text-[#555555] leading-relaxed">
                        {item.note}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#E8E6DE] flex items-center justify-between text-xs text-[#666666]">
                <span>100% On-Device Execution</span>
                <span className="font-mono text-[#4F6322] font-semibold">Local SQLite Brain</span>
              </div>
            </div>

          </motion.div>
        </AnimatePresence>

      </div>
    </section>
  );
}
