"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform, useSpring, MotionValue } from "framer-motion";
import { FileText, Cpu, Network, MonitorPlay, BookOpen } from "lucide-react";

const stages = [
  { title: "Raw Capture", desc: "You just press play. We grab the video, audio, and slides seamlessly.", icon: MonitorPlay, color: "from-blue-500" },
  { title: "Transcription", desc: "Whisper-level models capture every spoken word with perfect accuracy.", icon: FileText, color: "from-emerald-500" },
  { title: "OCR & Vision", desc: "We slice the video and extract text and diagrams from the slides.", icon: Network, color: "from-amber-500" },
  { title: "AI Synthesis", desc: "Contextual understanding models weave the transcript and slides together.", icon: Cpu, color: "from-purple-500" },
  { title: "Mastery", desc: "Your final personalized study package: notes, flashcards, and interactive chat.", icon: BookOpen, color: "from-[#A6FF00]" }
];

const PipelineNode = ({ stage, index, total, progress }: { stage: any, index: number, total: number, progress: MotionValue<number> }) => {
  const start = (index * 0.2) - 0.1;
  const end = (index * 0.2) + 0.1;

  const isActive = useTransform(progress, [start, end], [0, 1]);
  
  const cardOpacity = useTransform(isActive, [0, 1], [0.3, 1]);
  const iconBg = useTransform(isActive, [0, 1], ["rgba(255,255,255,0.02)", "rgba(166,255,0,0.1)"]);
  const iconBorder = useTransform(isActive, [0, 1], ["rgba(255,255,255,0.1)", "rgba(166,255,0,0.5)"]);
  const iconColor = useTransform(isActive, [0, 1], ["rgba(160,160,160,1)", "rgba(166,255,0,1)"]);

  const Icon = stage.icon;

  return (
    <div className="relative pl-16 md:pl-24 flex items-start group">
      {/* Node Icon */}
      <motion.div 
        className="absolute left-0 top-0 w-12 h-12 rounded-xl border flex items-center justify-center z-10 bg-[#111111] shadow-xl backdrop-blur-md"
        style={{ backgroundColor: iconBg, borderColor: iconBorder, color: iconColor }}
      >
        <Icon size={20} />
      </motion.div>

      {/* Card Content */}
      <motion.div 
        style={{ opacity: cardOpacity }}
        className="w-full bg-[#1E1E1E] border border-white/5 rounded-3xl p-8 hover:border-white/10 transition-colors relative overflow-hidden shadow-2xl"
      >
        <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${stage.color} to-transparent opacity-50`} />
        <h3 className="text-2xl font-bold text-[#F5F5F5] mb-2">{stage.title}</h3>
        <p className="text-[#A0A0A0] text-lg leading-relaxed">{stage.desc}</p>
      </motion.div>
    </div>
  );
};

export default function LectureIntelligence() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"],
  });

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, mass: 1 });
  const beamHeight = useTransform(smoothProgress, [0, 1], ["0%", "100%"]);

  return (
    <section className="py-32 border-t border-white/5 bg-transparent">
      <div className="container mx-auto px-6 max-w-4xl text-center mb-24">
        <h2 className="text-4xl md:text-6xl font-serif tracking-tight text-[#F5F5F5] mb-4">
          The Intelligence Pipeline
        </h2>
        <p className="text-xl text-[#A0A0A0] max-w-2xl mx-auto">
          It's not magic, it's just very good engineering. Watch how raw video turns into mastery.
        </p>
      </div>

      <div ref={containerRef} className="relative max-w-3xl mx-auto px-6">
        {/* The Beam Track Background */}
        <div className="absolute left-[47px] top-6 bottom-6 w-[2px] bg-white/5 rounded-full" />
        
        {/* The Animated Glowing Beam */}
        <motion.div 
          className="absolute left-[47px] top-6 w-[2px] bg-gradient-to-b from-transparent via-[#A6FF00] to-[#A6FF00] rounded-full z-0"
          style={{ height: beamHeight, filter: "drop-shadow(0 0 10px #A6FF00)" }}
        />

        <div className="flex flex-col gap-12 relative z-10">
          {stages.map((stage, i) => (
            <PipelineNode key={i} stage={stage} index={i} total={stages.length} progress={smoothProgress} />
          ))}
        </div>
      </div>
    </section>
  );
}
