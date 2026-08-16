"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Download, AppWindow, Play, Shield, Cpu, Zap } from "lucide-react";

const stats = [
  { icon: Shield, label: "100% Local", color: "#A6FF00" },
  { icon: Cpu, label: "Ollama Ready", color: "#9B5EFF" },
  { icon: Zap, label: "Real-time AI", color: "#3B82F6" },
];

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-24 pb-16 aurora-bg">

      {/* ── Background layers ── */}
      {/* Dot grid */}
      <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />

      {/* Aurora blobs */}
      <div
        className="absolute top-[-20%] left-[10%] w-[700px] h-[700px] rounded-full pointer-events-none animate-aurora"
        style={{ background: "radial-gradient(circle, rgba(166,255,0,0.07) 0%, transparent 70%)" }}
      />
      <div
        className="absolute top-[30%] right-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none animate-aurora"
        style={{ background: "radial-gradient(circle, rgba(155,94,255,0.06) 0%, transparent 70%)", animationDelay: "4s" }}
      />
      <div
        className="absolute bottom-[-10%] left-[30%] w-[600px] h-[600px] rounded-full pointer-events-none animate-aurora"
        style={{ background: "radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)", animationDelay: "8s" }}
      />

      {/* ── Hero content ── */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-6xl mx-auto w-full">

        {/* Live badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#A6FF00]/25 bg-[#A6FF00]/5 text-xs font-semibold tracking-widest text-[#A6FF00] uppercase"
        >
          <span className="w-1.5 h-1.5 bg-[#A6FF00] rounded-full animate-badge shadow-[0_0_6px_rgba(166,255,0,1)]" />
          Now in Beta — Free to Download
        </motion.div>

        {/* Main headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="text-6xl sm:text-7xl md:text-8xl lg:text-[96px] font-extrabold tracking-tighter leading-[0.92] text-[#F0F0F0] mb-6"
        >
          The Ultimate
          <br />
          <span className="text-gradient-hero">Local AI</span>
          <br />
          Meeting Wingman.
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="text-lg md:text-xl text-[#888888] max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Capture meetings instantly with the Chrome Extension. Get real-time insights
          with the Universal AI Engine powered by Ollama, OpenAI, or Anthropic.
          <span className="text-[#C0C0C0]"> All 100% local.</span>
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center mb-14"
        >
          <a
            href="/downloads/bacham-desktop.dmg"
            download
            id="hero-download-btn"
            className="group w-full sm:w-auto px-8 py-4 bg-[#A6FF00] text-[#050505] font-bold rounded-full flex items-center justify-center gap-2.5 hover:bg-[#BAFF29] transition-all duration-200 animate-pulse-glow text-[15px]"
          >
            <Download size={18} />
            Download Desktop
          </a>
          <a
            href="/downloads/bacham-extension.zip"
            download
            id="hero-extension-btn"
            className="w-full sm:w-auto px-8 py-4 glass-card rounded-full flex items-center justify-center gap-2.5 hover:border-white/15 hover:bg-white/[0.05] transition-all duration-200 text-[#C0C0C0] font-semibold text-[15px]"
          >
            <AppWindow size={18} />
            Chrome Extension
          </a>
          <button
            id="hero-demo-btn"
            className="w-full sm:w-auto px-8 py-4 rounded-full flex items-center justify-center gap-2.5 text-[#888888] hover:text-[#F0F0F0] font-semibold transition-colors duration-200 text-[15px]"
          >
            <Play size={16} className="fill-current" />
            Watch Demo
          </button>
        </motion.div>

        {/* Stat chips */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.38, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-wrap items-center justify-center gap-3 mb-16"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-2 px-4 py-2 glass-card rounded-full text-sm font-medium"
              style={{ color: stat.color }}
            >
              <stat.icon size={14} />
              {stat.label}
            </div>
          ))}
        </motion.div>

        {/* Hero App Window */}
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-5xl mx-auto"
        >
          {/* Glow behind the window */}
          <div
            className="absolute -inset-8 rounded-[40px] opacity-40 blur-[60px] pointer-events-none"
            style={{ background: "radial-gradient(ellipse, rgba(166,255,0,0.12) 0%, rgba(155,94,255,0.08) 50%, transparent 70%)" }}
          />

          {/* Mac window frame */}
          <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_40px_120px_rgba(0,0,0,0.8)] bg-[#0D0D0D]">
            {/* Title bar */}
            <div className="h-11 flex items-center px-5 gap-2 border-b border-white/[0.06] bg-[#0A0A0A]">
              <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
              <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
              <div className="w-3 h-3 rounded-full bg-[#28C840]" />
              <div className="mx-auto text-[11px] text-[#555555] font-medium tracking-wide">BACHAM — Meeting Assistant</div>
            </div>

            {/* Screenshot */}
            <div className="relative w-full aspect-[16/10]">
              <Image
                src="/mockups/hero_dashboard.png"
                alt="BACHAM Desktop Interface"
                fill
                className="object-cover"
                priority
                draggable={false}
              />
              {/* Scan line animation */}
              <div
                className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#A6FF00]/40 to-transparent pointer-events-none animate-scan"
                style={{ top: "0%" }}
              />
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/40 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
