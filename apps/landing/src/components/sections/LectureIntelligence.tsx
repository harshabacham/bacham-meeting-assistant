"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform, useSpring, MotionValue } from "framer-motion";
import { FileText, Cpu, Network, MonitorPlay, BookOpen, Sparkles } from "lucide-react";

interface Stage {
  step: string;
  title: string;
  desc: string;
  tag: string;
  icon: any;
  accent: string;
  color: string;
}

const stages: Stage[] = [
  {
    step: "01",
    title: "Raw Capture",
    desc: "Seamless background stream from Google Meet, Zoom, Coursera, or YouTube videos via lightweight Chrome extension.",
    tag: "Native Media Stream",
    icon: MonitorPlay,
    accent: "from-blue-500/20 via-blue-500/5 to-transparent",
    color: "#3B82F6"
  },
  {
    step: "02",
    title: "Local Whisper Transcription",
    desc: "Lightning fast, speaker-diarized speech-to-text running 100% locally with zero cloud latency.",
    tag: "Sub-second STT",
    icon: FileText,
    accent: "from-emerald-500/20 via-emerald-500/5 to-transparent",
    color: "#10B981"
  },
  {
    step: "03",
    title: "OCR & Keyframe Extraction",
    desc: "Real-time visual slicing of diagrams, code blocks, slides, and shared whiteboard screens into high-res assets.",
    tag: "Computer Vision",
    icon: Network,
    accent: "from-amber-500/20 via-amber-500/5 to-transparent",
    color: "#F59E0B"
  },
  {
    step: "04",
    title: "Contextual AI Synthesis",
    desc: "Universal AI Engine (Ollama / Local LLMs / API) merges spoken transcripts with slide context into structured hierarchy.",
    tag: "Knowledge Graphs",
    icon: Cpu,
    accent: "from-purple-500/20 via-purple-500/5 to-transparent",
    color: "#9B5EFF"
  },
  {
    step: "05",
    title: "Mastery & Spaced Recall",
    desc: "Interactive study package with active recall decks, instant quiz generator, and grounded AI conversation.",
    tag: "Ready to Master",
    icon: BookOpen,
    accent: "from-[#A6FF00]/20 via-[#A6FF00]/5 to-transparent",
    color: "#A6FF00"
  }
];

const PipelineNode = ({
  stage,
  index,
  total,
  progress
}: {
  stage: Stage;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) => {
  const start = (index / total) - 0.08;
  const end = ((index + 1) / total) + 0.05;

  const isActive = useTransform(progress, [start, end], [0, 1]);
  const cardOpacity = useTransform(isActive, [0, 1], [0.35, 1]);
  const cardScale = useTransform(isActive, [0, 1], [0.98, 1]);
  const iconGlow = useTransform(isActive, [0, 1], ["0 0 0px transparent", `0 0 24px ${stage.color}80`]);

  const Icon = stage.icon;

  return (
    <div className="relative pl-14 sm:pl-20 flex items-start group">
      {/* Node Icon on Timeline */}
      <motion.div
        className="absolute left-0 top-1 w-10 sm:w-12 h-10 sm:h-12 rounded-2xl border flex items-center justify-center z-10 bg-[#0A0A0A] transition-colors duration-300"
        style={{
          boxShadow: iconGlow,
          borderColor: `${stage.color}50`,
          color: stage.color
        }}
      >
        <Icon size={20} />
      </motion.div>

      {/* Card Content */}
      <motion.div
        style={{ opacity: cardOpacity, scale: cardScale }}
        className="w-full relative glass-card rounded-3xl p-6 sm:p-8 overflow-hidden transition-all duration-300 border border-white/[0.08] hover:border-white/[0.15]"
      >
        {/* Ambient Top Gradient */}
        <div className={`absolute top-0 left-0 right-0 h-28 bg-gradient-to-b ${stage.accent} pointer-events-none`} />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold tracking-widest px-2.5 py-1 rounded-md bg-white/[0.05] border border-white/[0.08]" style={{ color: stage.color }}>
              STAGE {stage.step}
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-[#F0F0F0] tracking-tight">{stage.title}</h3>
          </div>
          <span className="text-xs font-mono text-[#666666] uppercase tracking-wider self-start sm:self-auto">
            {stage.tag}
          </span>
        </div>

        <p className="relative z-10 text-[#888888] text-base sm:text-lg leading-relaxed">{stage.desc}</p>
      </motion.div>
    </div>
  );
};

export default function LectureIntelligence() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"]
  });

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, mass: 1 });
  const beamHeight = useTransform(smoothProgress, [0, 1], ["0%", "100%"]);

  return (
    <section className="py-32 border-t border-white/[0.06] bg-transparent relative">
      <div className="container mx-auto px-6 max-w-4xl text-center mb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#A6FF00]/20 bg-[#A6FF00]/5 text-xs font-semibold tracking-widest text-[#A6FF00] uppercase mb-4">
          <Sparkles size={12} />
          Autonomous Pipeline
        </div>
        <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-[#F0F0F0] mb-4">
          The Intelligence Engine
        </h2>
        <p className="text-lg text-[#888888] max-w-2xl mx-auto leading-relaxed">
          From unorganized streams to crystallized knowledge. Watch how raw audio and video turn into instant retention.
        </p>
      </div>

      <div ref={containerRef} className="relative max-w-3xl mx-auto px-6">
        {/* Timeline Backing Track */}
        <div className="absolute left-[38px] sm:left-[51px] top-6 bottom-6 w-[2px] bg-white/[0.06] rounded-full" />

        {/* Animated Neon Glowing Line */}
        <motion.div
          className="absolute left-[38px] sm:left-[51px] top-6 w-[2px] bg-gradient-to-b from-blue-500 via-[#A6FF00] to-[#A6FF00] rounded-full z-0 origin-top"
          style={{ height: beamHeight, filter: "drop-shadow(0 0 10px #A6FF00)" }}
        />

        <div className="flex flex-col gap-10 sm:gap-14 relative z-10">
          {stages.map((stage, i) => (
            <PipelineNode key={i} stage={stage} index={i} total={stages.length} progress={smoothProgress} />
          ))}
        </div>
      </div>
    </section>
  );
}
