"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Mic, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";

export default function HowItWorks() {
  const [activeStage, setActiveStage] = useState<"before" | "during" | "after">("before");

  const stages = [
    {
      id: "before" as const,
      label: "Before the meeting",
      title: "Start your meeting prepared",
      description:
        "Bacham syncs with your local calendar to prepare an Executive Brief before every call: who is attending, what was agreed upon last time, and the top priorities.",
      icon: Calendar,
      bulletPoints: [
        "Automatic attendee detection & company profile notes",
        "Pulls prior commitments & open loops from past transcripts",
        "Pre-meeting notification prompt with 1-click start",
      ],
      previewContent: {
        badge: "Meeting Brief · Ready 5m before call",
        title: "Sprint Review & Q3 GTM Sync",
        items: [
          { speaker: "Sarah (VP Product)", note: "Pushed counter-proposal on pricing; brings roadmap update" },
          { speaker: "David (Lead Eng)", note: "Requested 2-week freeze for Whisper.cpp latency tuning" },
        ],
      },
    },
    {
      id: "during" as const,
      label: "During the meeting",
      title: "Stay present. Jot three words.",
      description:
        "Forget trying to transcribe everything. Type quick shorthand while Bacham captures both your microphone and computer audio with zero bots in the call.",
      icon: Mic,
      bulletPoints: [
        "100% invisible native loopback audio capture",
        "Zero intrusive bots joining your client meeting",
        "Automatic screen slide snapshots when presentations change",
      ],
      previewContent: {
        badge: "Live Capture · Whisper v3 On-Device",
        title: "System Audio Loopback Active",
        items: [
          { speaker: "You typed", note: "agree pricing, jack deals stall, Tanya pause ads" },
          { speaker: "Whisper local", note: "Transcribing dual-channel 16kHz audio in real time..." },
        ],
      },
    },
    {
      id: "after" as const,
      label: "After the meeting",
      title: "Effortless notes, enhanced instantly",
      description:
        "The moment you hang up, your rough notes combine with the local audio transcript to generate clear executive decisions, structured bullet points, and assigned next steps.",
      icon: Sparkles,
      bulletPoints: [
        "Instant structured summary with decisions & owners",
        "1-click formatted copy for Slack, Notion, or Email",
        "Permanent vector indexing for sub-second recall anytime",
      ],
      previewContent: {
        badge: "Enhanced Summary · 0.4s Synthesis",
        title: "Executive Synthesis & Next Steps",
        items: [
          { speaker: "Decision", note: "Agreed to narrow Q3 focus to mid-market finance buyers" },
          { speaker: "Next Step", note: "Tanya to update ICP doc and pause paid campaigns by Tuesday" },
        ],
      },
    },
  ];

  const currentStage = stages.find((s) => s.id === activeStage)!;
  const CurrentIcon = currentStage.icon;

  return (
    <section id="how-it-works" className="py-24 md:py-32 bg-[#FCFBF9] border-t border-[#E8E6DE]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Section Headline (Granola Style) */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[11.5px] font-semibold uppercase tracking-wider text-[#4F6322] select-none mb-2 block">
            End-To-End Workflow
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-[#1E1E1E] leading-tight mb-4">
            Bacham helps you before, during and after your meetings.
          </h2>
          <p className="text-base sm:text-lg text-[#666666] leading-relaxed">
            A frictionless workflow designed for people with back-to-back schedules.
          </p>
        </div>

        {/* 3 Segmented Stage Selector Pills */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex p-1.5 rounded-full bg-[#FAF9F5] border border-[#E8E6DE] shadow-2xs gap-1">
            {stages.map((stage) => {
              const isActive = activeStage === stage.id;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setActiveStage(stage.id)}
                  className={`px-5 py-2 rounded-full text-[13px] font-medium transition-all cursor-pointer ${
                    isActive
                      ? "bg-white text-[#1E1E1E] shadow-xs font-semibold border border-[#E8E6DE]"
                      : "text-[#666666] hover:text-[#1E1E1E]"
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
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-[#FAF9F5] border border-[#E8E6DE] rounded-3xl p-8 sm:p-12 shadow-2xs"
          >
            {/* Left: Text & Key Highlights */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E8E6DE] text-[#4F6322] text-xs font-semibold mb-4 shadow-2xs">
                <CurrentIcon size={14} />
                <span>{currentStage.label}</span>
              </div>

              <h3 className="font-serif text-3xl sm:text-4xl font-normal text-[#1E1E1E] mb-4 tracking-tight">
                {currentStage.title}
              </h3>
              <p className="text-[#555555] text-base leading-relaxed mb-6">
                {currentStage.description}
              </p>

              <div className="space-y-3">
                {currentStage.bulletPoints.map((bp, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm text-[#333333]">
                    <CheckCircle2 size={16} className="text-[#4F6322] shrink-0" />
                    <span>{bp}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Tactile Notepad Preview Mockup */}
            <div className="w-full bg-white border border-[#E8E6DE] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E8E6DE]">
                  <span className="text-[11px] font-mono font-medium text-[#4F6322] uppercase tracking-wider">
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
                    <div key={i} className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E8E6DE] text-xs">
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
                <span className="font-mono text-[#4F6322] font-medium">Local SQLite Vault</span>
              </div>
            </div>

          </motion.div>
        </AnimatePresence>

      </div>
    </section>
  );
}
