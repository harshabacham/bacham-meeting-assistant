"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { LayoutDashboard, Video, Search, BookOpen, Sparkles, Check } from "lucide-react";

export default function WorkspaceScroll() {
  const tickerItems = [
    "100% Offline AI",
    "Whisper Transcription",
    "LaTeX Math Parser",
    "Spaced Repetition Flashcards",
    "Zero Cloud Recording",
    "Obsidian Markdown Export",
    "Universal Semantic Search",
    "Real-time Slide OCR",
  ];

  const screens = [
    {
      title: "Library View",
      badge: "Knowledge Hub",
      icon: LayoutDashboard,
      desc: "Your entire lecture & meeting archive indexed chronologically with semantic search.",
      color: "#3B82F6",
      imageSrc: "/mockups/hero_dashboard.png",
      height: "h-[460px]",
    },
    {
      title: "Active Workspace",
      badge: "Live Studio",
      icon: Video,
      desc: "Video playback synchronized with real-time transcript chapters and AI insights.",
      color: "#10B981",
      imageSrc: "/mockups/hero_dashboard.png",
      height: "h-[580px]",
    },
    {
      title: "Study & Recall Mode",
      badge: "Focus Mode",
      icon: BookOpen,
      desc: "Distraction-free flashcards, active quizzes, and smart AI tutor reviews.",
      color: "#F59E0B",
      imageSrc: "/mockups/notes_ui.png",
      height: "h-[500px]",
    },
    {
      title: "Universal Search",
      badge: "Neural Vector Index",
      icon: Search,
      desc: "Find exact phrases, speaker quotes, or diagram explanations across hundreds of hours.",
      color: "#9B5EFF",
      imageSrc: "/mockups/chat_ui.png",
      height: "h-[420px]",
    },
  ];

  const col1 = screens.filter((_, i) => i % 2 === 0);
  const col2 = screens.filter((_, i) => i % 2 === 1);

  const Card = ({ screen, idx }: { screen: typeof screens[0]; idx: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
      className={`relative w-full rounded-3xl overflow-hidden group glass-card border border-white/[0.08] hover:border-white/20 transition-all duration-500 hover:-translate-y-2 shadow-2xl ${screen.height}`}
    >
      {/* Dynamic Colored Glow Halo */}
      <div
        className="absolute -top-32 -right-32 w-80 h-80 opacity-15 blur-[90px] transition-opacity duration-500 group-hover:opacity-30 pointer-events-none"
        style={{ backgroundColor: screen.color }}
      />

      {/* Content Container */}
      <div className="relative h-full flex flex-col p-6 md:p-8 z-10">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3.5">
            <div
              className="p-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] transition-all duration-500 group-hover:scale-105"
              style={{ color: screen.color }}
            >
              <screen.icon size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-[#F0F0F0] tracking-tight">{screen.title}</h3>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.05] text-[#888888]">
                  {screen.badge}
                </span>
              </div>
              <p className="text-xs text-[#777777] mt-0.5 max-w-xs">{screen.desc}</p>
            </div>
          </div>
        </div>

        {/* Mockup Frame inside card */}
        <div className="flex-1 mt-3 relative rounded-2xl overflow-hidden border border-white/[0.08] bg-[#070707] shadow-inner group-hover:border-white/20 transition-colors duration-500">
          {/* macOS window title bar dots */}
          <div className="absolute top-0 left-0 right-0 h-7 bg-[#0E0E0E] border-b border-white/[0.05] flex items-center px-3.5 gap-1.5 z-20">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
          </div>

          <div className="absolute inset-0 pt-7">
            <Image
              src={screen.imageSrc}
              alt={screen.title}
              fill
              className="object-cover object-top opacity-75 group-hover:scale-[1.03] group-hover:opacity-100 transition-all duration-700 ease-out"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <section className="py-32 border-t border-white/[0.06] bg-transparent relative z-10 overflow-hidden">
      
      {/* Ticker Banner */}
      <div className="mb-20 py-3 border-y border-white/[0.05] bg-white/[0.01] overflow-hidden whitespace-nowrap">
        <div className="inline-flex gap-8 animate-ticker">
          {[...tickerItems, ...tickerItems, ...tickerItems].map((item, index) => (
            <div key={index} className="inline-flex items-center gap-3 text-xs font-mono tracking-wider text-[#666666] uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A6FF00]" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-6 max-w-6xl">
        <div className="mb-16 md:mb-24 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#A6FF00]/20 bg-[#A6FF00]/5 text-xs font-semibold tracking-widest text-[#A6FF00] uppercase mb-4">
            <Sparkles size={12} />
            Visual Workspace
          </div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-extrabold tracking-tighter text-[#F0F0F0] mb-4"
          >
            Crafted with intention.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-[#888888]"
          >
            Every view is optimized to minimize friction and maximize deep retention.
          </motion.p>
        </div>

        {/* Masonry Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-6xl mx-auto">
          {/* Column 1 */}
          <div className="flex flex-col gap-6 md:gap-8">
            {col1.map((screen, i) => (
              <Card key={screen.title} screen={screen} idx={i} />
            ))}
          </div>

          {/* Column 2 (Staggered offset) */}
          <div className="flex flex-col gap-6 md:gap-8 md:pt-20">
            {col2.map((screen, i) => (
              <Card key={screen.title} screen={screen} idx={i + col1.length} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
