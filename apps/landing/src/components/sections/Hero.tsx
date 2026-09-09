"use client";

import { motion } from "framer-motion";
import { Download, Star, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { ChromeIcon } from "@/components/ui/ChromeIcon";
import { LiveMeetingSimulator } from "./LiveMeetingSimulator";

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 md:pt-36 md:pb-28 overflow-hidden text-center px-4 sm:px-6">
      
      {/* Background Radial Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#E2B774]/[0.07] rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-5xl mx-auto flex flex-col items-center">
        
        {/* Pre-headline Pill */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] mb-6 shadow-sm hover:border-[#E2B774]/40 transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-[#E2B774] shadow-[0_0_8px_#E2B774]" />
          <span className="text-[12px] font-semibold text-[#FAF9F5] tracking-wide">
            100% Private · Zero Bots · Local AI Engine
          </span>
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[#FAF9F5] max-w-4xl leading-[1.08] mb-6"
        >
          The Executive AI Meeting Wingman That Runs{" "}
          <span className="font-serif italic font-normal text-[#E2B774]">
            100% Locally.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-base sm:text-lg md:text-xl text-[#8E9099] max-w-2xl mx-auto leading-relaxed mb-10"
        >
          Capture Google Meet, Zoom, and system audio in real-time. Automated executive briefs, decisions, and slide snapshots without cloud subscription fees or intrusive bots.
        </motion.p>

        {/* Call-to-Action Group */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row items-center gap-3.5 w-full justify-center mb-16"
        >
          <a
            href="#downloads"
            className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-[#E2B774] hover:bg-[#d8a863] text-[#090A0C] font-bold text-[14px] flex items-center justify-center gap-2 shadow-[0_4px_24px_rgba(226,183,116,0.25)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Download size={16} strokeWidth={2.5} />
            <span>Download Desktop App</span>
          </a>

          <a
            href="#downloads"
            className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white/[0.05] hover:bg-white/[0.09] text-[#FAF9F5] border border-white/[0.1] hover:border-white/20 font-semibold text-[14px] flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <ChromeIcon className="w-4 h-4 text-[#E2B774]" />
            <span>Add Chrome Extension</span>
          </a>

          <a
            href="https://github.com/harshabacham/bacham-meeting-assistant"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-5 py-3.5 rounded-full text-[#8E9099] hover:text-[#FAF9F5] font-medium text-[13.5px] flex items-center justify-center gap-1.5 transition-colors"
          >
            <Star size={15} className="text-[#E2B774] fill-[#E2B774]" />
            <span>Star on GitHub</span>
            <ArrowRight size={13} className="opacity-50" />
          </a>
        </motion.div>

        {/* Live Interactive Simulator Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full"
        >
          <LiveMeetingSimulator />
        </motion.div>

      </div>
    </section>
  );
}
