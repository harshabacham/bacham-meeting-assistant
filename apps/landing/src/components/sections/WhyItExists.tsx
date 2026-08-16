"use client";

import { motion } from "framer-motion";
import { ArrowRight, Brain, Clock, Zap, X } from "lucide-react";

export default function WhyItExists() {
  const container: any = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const item: any = {
    hidden: { opacity: 0, y: 30, scale: 0.97 },
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <section id="why" className="py-32 border-t border-white/[0.06] bg-transparent">
      <div className="container mx-auto px-6 max-w-6xl">

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-20"
        >
          <p className="text-xs font-semibold tracking-[0.2em] text-[#A6FF00] uppercase mb-4">The Problem</p>
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-[#F0F0F0] mb-6 leading-tight">
            The old way of working<br />is broken.
          </h2>
          <p className="text-lg text-[#888888] max-w-2xl mx-auto leading-relaxed">
            Hours wasted in meetings without structure. Searching for that one decision. Notes that never get revisited.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto"
        >
          {/* The Old Way */}
          <motion.div
            variants={item}
            className="relative glass-card rounded-3xl p-8 overflow-hidden group"
          >
            {/* Red stripe */}
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-500/60 to-red-500/0 rounded-l-3xl" />
            {/* Hover glow */}
            <div className="absolute inset-0 bg-red-500/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-8">
                <div className="w-6 h-6 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                  <X size={12} className="text-red-400" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-red-400/80">The Old Way</h3>
              </div>
              <ul className="space-y-5">
                {[
                  { icon: Clock, text: "Sit through long meetings without structure" },
                  { icon: ArrowRight, text: "Forget key decisions immediately after" },
                  { icon: Clock, text: "Dig through recordings hours later" },
                  { icon: ArrowRight, text: "Miss half the context anyway" },
                ].map((row, i) => (
                  <li key={i} className="flex items-center gap-4 text-[#666666]">
                    <row.icon size={16} className={i % 2 === 0 ? "text-red-400/60" : "text-white/15"} />
                    <span className="text-[15px]">{row.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* The BACHAM Way */}
          <motion.div
            variants={item}
            className="relative rounded-3xl p-8 overflow-hidden border border-[#A6FF00]/20 bg-[#A6FF00]/[0.03]"
            style={{ boxShadow: "0 0 60px rgba(166,255,0,0.06), inset 0 0 40px rgba(166,255,0,0.02)" }}
          >
            {/* Lime stripe */}
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#A6FF00]/80 to-[#A6FF00]/0 rounded-l-3xl" />
            {/* Corner glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#A6FF00]/10 blur-[60px] rounded-full pointer-events-none" />
            {/* Scan beam */}
            <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#A6FF00]/30 to-transparent animate-scan pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-8">
                <div className="w-6 h-6 rounded-full bg-[#A6FF00]/15 border border-[#A6FF00]/40 flex items-center justify-center">
                  <Zap size={12} className="text-[#A6FF00]" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#A6FF00]">With BACHAM</h3>
              </div>
              <ul className="space-y-5">
                {[
                  { text: "Records & transcribes automatically" },
                  { text: "Understands context in real-time" },
                  { text: "Organizes insights by topic" },
                  { text: "Answers questions about your meetings" },
                ].map((row, i) => (
                  <li key={i} className="flex items-center gap-4 text-[#D0D0D0]">
                    <Brain size={16} className="text-[#A6FF00] shrink-0" />
                    <span className="text-[15px]">{row.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
