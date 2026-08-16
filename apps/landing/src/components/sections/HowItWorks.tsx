"use client";

import { motion } from "framer-motion";
import { Download, MonitorPlay, Send, BrainCircuit, PackageOpen } from "lucide-react";

const steps = [
  {
    num: "01",
    icon: Download,
    title: "Install",
    desc: "Add the invisible Chrome Extension to your browser. Takes 30 seconds.",
    color: "#A6FF00",
    glowColor: "rgba(166,255,0,0.12)",
    span: "col-span-1",
  },
  {
    num: "02",
    icon: MonitorPlay,
    title: "Record seamlessly",
    desc: "Open any meeting or video. The extension automatically detects and begins capturing context — no manual intervention needed.",
    color: "#3B82F6",
    glowColor: "rgba(59,130,246,0.12)",
    span: "col-span-1 md:col-span-2",
  },
  {
    num: "03",
    icon: Send,
    title: "Sync",
    desc: "Data streams securely to your desktop app in real-time.",
    color: "#9B5EFF",
    glowColor: "rgba(155,94,255,0.12)",
    span: "col-span-1",
  },
  {
    num: "04",
    icon: BrainCircuit,
    title: "Analyze",
    desc: "Local AI processes audio and context to build deep understanding.",
    color: "#10B981",
    glowColor: "rgba(16,185,129,0.12)",
    span: "col-span-1",
  },
  {
    num: "05",
    icon: PackageOpen,
    title: "Master",
    desc: "Your study package is ready. Smart notes, action items, and AI chat.",
    color: "#A6FF00",
    glowColor: "rgba(166,255,0,0.15)",
    span: "col-span-1",
    highlight: true,
  },
];

const container: any = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};
const item: any = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
};

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-32 border-t border-white/[0.06] bg-transparent overflow-hidden">
      <div className="container mx-auto px-6 max-w-6xl">

        <div className="mb-16 max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.2em] text-[#A6FF00] uppercase mb-4">Process</p>
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-[#F0F0F0] mb-4 leading-tight">
            How it works
          </h2>
          <p className="text-lg text-[#888888] leading-relaxed">
            From installation to mastery in five seamless stages. Designed for flow.
          </p>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[280px]"
        >
          {steps.map((step) => (
            <motion.div
              key={step.num}
              variants={item}
              className={`${step.span} relative group rounded-3xl p-7 overflow-hidden transition-all duration-500 hover:-translate-y-1 ${
                step.highlight
                  ? "bg-[#A6FF00] border-0 animate-pulse-glow"
                  : "glass-card hover:border-white/12"
              }`}
            >
              {/* Per-card glow orb */}
              {!step.highlight && (
                <div
                  className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                  style={{ background: step.glowColor }}
                />
              )}

              {/* Floating background icon */}
              {!step.highlight && (
                <motion.div
                  animate={{ y: [0, -12, 0] }}
                  transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: parseInt(step.num) * 0.5 }}
                  className="absolute top-5 right-5 opacity-[0.06] group-hover:opacity-[0.14] transition-opacity duration-500 pointer-events-none"
                >
                  <step.icon size={90} />
                </motion.div>
              )}

              {/* Content */}
              <div className={`relative z-10 h-full flex flex-col justify-between ${step.highlight ? "text-[#050505]" : ""}`}>
                <div className="flex items-center justify-between">
                  {/* Step number badge */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                      step.highlight
                        ? "bg-black/10 text-[#050505]"
                        : "border border-white/10 bg-white/[0.04] text-[#888888]"
                    }`}
                  >
                    {step.num}
                  </div>
                  {step.highlight && (
                    <motion.div
                      animate={{ rotate: [0, -10, 10, -10, 0] }}
                      transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    >
                      <PackageOpen size={28} className="text-[#050505]" />
                    </motion.div>
                  )}
                </div>

                <div>
                  <h3 className={`text-2xl md:text-3xl font-bold mb-2 ${step.highlight ? "text-[#050505]" : "text-[#F0F0F0]"}`}>
                    {step.title}
                  </h3>
                  <p className={step.highlight ? "text-[#050505]/75 font-medium" : "text-[#777777] text-[15px]"}>
                    {step.desc}
                  </p>
                </div>
              </div>

              {/* Recording dot for step 02 */}
              {step.num === "02" && (
                <div className="absolute top-7 right-7">
                  <div className="relative">
                    <MonitorPlay size={26} className="text-[#888888] group-hover:text-[#3B82F6] transition-colors" />
                    <motion.div
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_6px_rgba(239,68,68,0.8)]"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
