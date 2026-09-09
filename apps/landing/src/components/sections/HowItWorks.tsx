"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Cpu, CheckSquare, ArrowRight, ShieldCheck, Play, Layers, Sparkles } from "lucide-react";

export default function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      num: "01",
      icon: Mic,
      title: "Invisible Ingestion",
      subtitle: "Zero bots. Zero awkwardness.",
      description:
        "Start with 1 click from your Chrome Extension or desktop system tray. Bacham taps into native audio loopback without sending any bot into your meeting.",
      highlight: "Captures Google Meet, Zoom, Teams, or face-to-face audio.",
      preview: {
        tag: "Stage 1 · Hardware Capture",
        detail: "Mic + System Audio Loopback active",
        subDetail: "Sample Rate: 16kHz · 0% packet loss",
      },
    },
    {
      num: "02",
      icon: Cpu,
      title: "Local AI Synthesis",
      subtitle: "Reasoning on your hardware.",
      description:
        "Local Whisper transcribes speech in real-time. Your selected AI model (Ollama or BYOK Cloud) detects decisions and flags action items as they are spoken.",
      highlight: "Sub-second turnaround with GPU/Metal acceleration.",
      preview: {
        tag: "Stage 2 · Local Engine",
        detail: "Extracting: 2 Decisions · 3 Action Items",
        subDetail: "Engine: Whisper v3 + Ollama Llama 3.3",
      },
    },
    {
      num: "03",
      icon: CheckSquare,
      title: "Instant Action & Recall",
      subtitle: "Notes ready before the call ends.",
      description:
        "Review clean bullet points, export action items to Slack or Notion, or query across all past conversations with local semantic search.",
      highlight: "Permanent offline storage in your encrypted SQLite database.",
      preview: {
        tag: "Stage 3 · Team Sync",
        detail: "Synced to Slack #engineering-sync",
        subDetail: "Saved to: C:\\Users\\...\\bacham_vault.db",
      },
    },
  ];

  return (
    <section id="how-it-works" className="py-24 md:py-32 border-t border-white/[0.06] bg-transparent">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#E2B774] select-none mb-2">
            Seamless Three-Stage Flow
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#FAF9F5] leading-tight mb-4">
            How Bacham Elevates Your Meetings
          </h2>
          <p className="text-base sm:text-lg text-[#8E9099] leading-relaxed">
            From the moment your conversation begins to the moment decisions are executed.
          </p>
        </div>

        {/* Step Selector Pills */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {steps.map((step, idx) => {
            const isActive = activeStep === idx;
            const Icon = step.icon;
            return (
              <button
                key={step.num}
                type="button"
                onClick={() => setActiveStep(idx)}
                className={`p-5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[140px] ${
                  isActive
                    ? "bg-[#14161A] border-[#E2B774]/40 shadow-[0_4px_25px_rgba(226,183,116,0.08)]"
                    : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/15"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-mono font-bold ${isActive ? "text-[#E2B774]" : "text-[#8E9099]"}`}>
                    {step.num}
                  </span>
                  <div className={`p-2 rounded-xl border ${
                    isActive ? "bg-[#E2B774]/15 border-[#E2B774]/30 text-[#E2B774]" : "bg-white/[0.03] border-white/[0.06] text-[#8E9099]"
                  }`}>
                    <Icon size={16} />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-[#FAF9F5] mb-0.5">{step.title}</h3>
                  <p className="text-xs text-[#8E9099]">{step.subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Step Detailed Showcase */}
        <div className="rounded-2xl bg-[#111317] border border-white/[0.08] p-6 sm:p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#E2B774]/[0.04] rounded-full blur-3xl pointer-events-none" />

          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
            >
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E2B774]/10 border border-[#E2B774]/20 text-[#E2B774] text-xs font-bold">
                  <span>Stage {steps[activeStep].num}</span>
                  <span>•</span>
                  <span>{steps[activeStep].subtitle}</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-bold text-[#FAF9F5] tracking-tight">
                  {steps[activeStep].title}
                </h3>

                <p className="text-sm sm:text-base text-[#8E9099] leading-relaxed">
                  {steps[activeStep].description}
                </p>

                <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-[#FAF9F5]/90">
                  <ShieldCheck size={16} className="text-[#E2B774]" />
                  <span>{steps[activeStep].highlight}</span>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="p-6 rounded-xl bg-black/40 border border-white/[0.08] space-y-3 font-mono text-xs text-[#FAF9F5]">
                  <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                    <span className="text-[11px] text-[#E2B774] uppercase font-bold tracking-wider">
                      {steps[activeStep].preview.tag}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <p className="text-[13px] text-[#FAF9F5] font-sans font-medium">
                    {steps[activeStep].preview.detail}
                  </p>
                  <p className="text-[11px] text-[#8E9099]">
                    {steps[activeStep].preview.subDetail}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}
