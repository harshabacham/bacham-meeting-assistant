"use client";

import Image from "next/image";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ListVideo, FileText, MessageSquare, Layers, Sparkles, CheckCircle2 } from "lucide-react";

type ViewState = "timeline" | "notes" | "chat" | "flashcards";

interface ViewConfig {
  id: ViewState;
  label: string;
  badge: string;
  icon: any;
  color: string;
  tagline: string;
  bullets: string[];
}

export default function ProductShowcase() {
  const [activeView, setActiveView] = useState<ViewState>("timeline");

  const views: ViewConfig[] = [
    {
      id: "timeline",
      label: "Live Timeline",
      badge: "Real-time sync",
      icon: ListVideo,
      color: "#3B82F6",
      tagline: "Video scrub synced with auto-generated chapters.",
      bullets: ["Deep audio timestamping", "Instant jump to speaker changes", "Visual slide markers"]
    },
    {
      id: "notes",
      label: "Smart Notes",
      badge: "Local AI",
      icon: FileText,
      color: "#10B981",
      tagline: "Structured summaries extracted directly from visual slides & speech.",
      bullets: ["LaTeX equations rendered live", "Action items highlighted", "Markdown & Obsidian export"]
    },
    {
      id: "chat",
      label: "AI Wingman Chat",
      badge: "Ollama & Cloud",
      icon: MessageSquare,
      color: "#9B5EFF",
      tagline: "Ask questions, generate practice questions, or drill into confusing topics.",
      bullets: ["Context-aware responses", "Zero hallucination grounded in transcript", "Multi-model selection"]
    },
    {
      id: "flashcards",
      label: "Spaced Repetition",
      badge: "Active Recall",
      icon: Layers,
      color: "#F59E0B",
      tagline: "Auto-generated flashcards tested using proven retention algorithms.",
      bullets: ["Anki deck export", "Difficulty self-rating", "Review scheduling"]
    }
  ];

  const currentConfig = views.find((v) => v.id === activeView)!;

  return (
    <section className="py-32 border-t border-white/[0.06] bg-transparent relative overflow-hidden">
      {/* Background radial glow */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[140px] opacity-10 pointer-events-none transition-all duration-700"
        style={{ backgroundColor: currentConfig.color }}
      />

      <div className="container mx-auto px-6 max-w-6xl relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#A6FF00]/20 bg-[#A6FF00]/5 text-xs font-semibold tracking-widest text-[#A6FF00] uppercase mb-4">
            <Sparkles size={12} />
            Unified Workspace
          </div>
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-[#F0F0F0] mb-4">
            One interface. Infinite flow.
          </h2>
          <p className="text-lg text-[#888888] max-w-2xl mx-auto leading-relaxed">
            Switch seamlessly between the video timeline, structured notes, AI conversational wingman, and spaced repetition decks.
          </p>
        </div>

        {/* Outer Frame with Glowing Ring */}
        <div className="max-w-6xl mx-auto rounded-3xl p-1 bg-gradient-to-b from-white/10 via-white/5 to-transparent shadow-[0_30px_100px_rgba(0,0,0,0.8)]">
          <div className="bg-[#0A0A0A] rounded-[22px] border border-white/[0.08] overflow-hidden flex flex-col">
            
            {/* Window Title Bar */}
            <div className="h-12 border-b border-white/[0.06] flex items-center justify-between px-5 bg-[#0D0D0D]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FF5F57]/80" />
                <div className="w-3 h-3 rounded-full bg-[#FEBC2E]/80" />
                <div className="w-3 h-3 rounded-full bg-[#28C840]/80" />
              </div>
              <div className="text-xs text-[#666666] font-mono tracking-wider">
                BACHAM — {currentConfig.label.toUpperCase()}
              </div>
              <div className="w-12 text-right">
                <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: currentConfig.color }} />
              </div>
            </div>

            {/* Showcase Main Layout */}
            <div className="flex flex-col lg:flex-row min-h-[580px]">
              {/* Sidebar Tabs */}
              <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-white/[0.06] bg-[#070707] p-4 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible shrink-0">
                {views.map((view) => {
                  const isActive = activeView === view.id;
                  const Icon = view.icon;
                  return (
                    <button
                      key={view.id}
                      onClick={() => setActiveView(view.id)}
                      className={`relative flex items-center justify-between p-3.5 rounded-xl text-left transition-all duration-300 w-full shrink-0 group ${
                        isActive
                          ? "bg-white/[0.06] border border-white/10 shadow-lg"
                          : "hover:bg-white/[0.02] border border-transparent text-[#777777]"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-105 ${
                            isActive ? "text-white" : "text-[#777777]"
                          }`}
                          style={{
                            backgroundColor: isActive ? `${view.color}25` : "rgba(255,255,255,0.03)",
                            color: isActive ? view.color : undefined
                          }}
                        >
                          <Icon size={18} />
                        </div>
                        <div>
                          <div className={`text-sm font-semibold tracking-tight ${isActive ? "text-[#F0F0F0]" : "text-[#888888] group-hover:text-[#CCCCCC]"}`}>
                            {view.label}
                          </div>
                          <div className="text-[11px] text-[#555555] font-mono">
                            {view.badge}
                          </div>
                        </div>
                      </div>

                      {isActive && (
                        <motion.div
                          layoutId="active-indicator"
                          className="w-1.5 h-6 rounded-full"
                          style={{ backgroundColor: view.color }}
                        />
                      )}
                    </button>
                  );
                })}

                {/* Info Card on desktop sidebar bottom */}
                <div className="hidden lg:flex flex-col gap-3 mt-auto p-4 rounded-xl glass-card border border-white/[0.06]">
                  <p className="text-xs font-semibold text-[#F0F0F0] leading-snug">{currentConfig.tagline}</p>
                  <div className="space-y-1.5 pt-1 border-t border-white/[0.05]">
                    {currentConfig.bullets.map((b, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[11px] text-[#777777]">
                        <CheckCircle2 size={12} style={{ color: currentConfig.color }} className="shrink-0" />
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Visual Showcase Panel */}
              <div className="flex-1 relative bg-[#060606] p-6 md:p-8 flex items-center justify-center overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeView}
                    initial={{ opacity: 0, scale: 0.97, y: 10, filter: "blur(6px)" }}
                    animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 0.97, y: -10, filter: "blur(6px)" }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full h-full min-h-[380px] md:min-h-[460px] relative rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl bg-[#0B0B0B]"
                  >
                    {views.map((v) =>
                      v.id === activeView && (
                        <Image
                          key={v.id}
                          src={`/mockups/${v.id}_ui.png`}
                          alt={`${v.label} UI Mockup`}
                          fill
                          className="object-cover object-top"
                          priority
                        />
                      )
                    )}
                    {/* Top ambient glass gloss */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.05] pointer-events-none" />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
