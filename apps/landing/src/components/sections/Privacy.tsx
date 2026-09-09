"use client";

import { motion } from "framer-motion";
import { Lock, HardDrive, WifiOff, Code2 } from "lucide-react";

export default function Privacy() {
  const pillars = [
    {
      icon: WifiOff,
      title: "100% Offline Air-Gapped Operation",
      desc: "Bacham does not require an internet connection to transcribe speech, detect decisions, or organize meeting notes when using local Whisper and Ollama.",
    },
    {
      icon: HardDrive,
      title: "Local SQLite Storage & Embeddings",
      desc: "Transcripts, summaries, action items, and slide images stay on your local drive. You own your data in open SQLite and JSON formats.",
    },
    {
      icon: Code2,
      title: "Auditable Open-Source Architecture",
      desc: "No hidden telemetry trackers or proprietary background daemons. The entire Tauri Rust and TypeScript codebase is open and inspectable on GitHub.",
    },
  ];

  return (
    <section id="privacy" className="py-24 md:py-32 bg-[#000000] border-t border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[11.5px] font-semibold uppercase tracking-wider text-[#D1E043] select-none mb-2 block">
            Data Sovereignty
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-[#FFFFFF] leading-tight mb-4">
            Security by architecture, not marketing promises
          </h2>
          <p className="text-base sm:text-lg text-[#A1A1A6] leading-relaxed">
            Your conversations contain trade secrets, financial models, and strategic plans. Bacham ensures they never leave your machine.
          </p>
        </div>

        {/* Visual Architecture Pipeline */}
        <div className="rounded-3xl bg-[#0D0D0E] border border-white/10 p-6 sm:p-8 mb-12 shadow-xl">
          <div className="text-xs font-mono text-[#D1D1D6] uppercase tracking-wider mb-6 flex items-center justify-between pb-3 border-b border-white/10">
            <span>Local Ingestion Pipeline</span>
            <span className="text-[#D1E043] font-semibold flex items-center gap-1.5">
              <Lock size={13} />
              Sandboxed On-Device
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="p-4 rounded-2xl bg-[#121214] border border-white/10 flex flex-col justify-between shadow-2xs">
              <span className="text-[10px] font-mono text-[#D1E043] font-bold">01 · SOURCE</span>
              <h4 className="text-sm font-semibold text-[#FFFFFF] mt-2 mb-1">Hardware Capture</h4>
              <p className="text-xs text-[#8E8E93] leading-relaxed">Direct WASAPI &amp; CoreAudio loopback stream without virtual cable bloat.</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#121214] border border-white/10 flex flex-col justify-between shadow-2xs">
              <span className="text-[10px] font-mono text-[#D1E043] font-bold">02 · INFERENCE</span>
              <h4 className="text-sm font-semibold text-[#FFFFFF] mt-2 mb-1">Local Whisper Engine</h4>
              <p className="text-xs text-[#8E8E93] leading-relaxed">Zero cloud streaming. Speech converted directly in local RAM.</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#121214] border border-white/10 flex flex-col justify-between shadow-2xs">
              <span className="text-[10px] font-mono text-[#D1E043] font-bold">03 · SYNTHESIS</span>
              <h4 className="text-sm font-semibold text-[#FFFFFF] mt-2 mb-1">Local Ollama / BYOK</h4>
              <p className="text-xs text-[#8E8E93] leading-relaxed">Extracts decisions &amp; action items on your hardware or via personal API keys.</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#151518] border border-[#D1E043]/40 flex flex-col justify-between shadow-md">
              <span className="text-[10px] font-mono text-[#D1E043] font-bold">04 · VAULT</span>
              <h4 className="text-sm font-semibold text-[#FFFFFF] mt-2 mb-1">Local SQLite DB</h4>
              <p className="text-xs text-[#D1D1D6] leading-relaxed">All notes, embeddings, and snapshots stored exclusively on your SSD.</p>
            </div>

          </div>
        </div>

        {/* 3 Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pillars.map((p, idx) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                className="p-6 rounded-2xl bg-[#0D0D0E] border border-white/10 hover:border-[#D1E043]/40 transition-all shadow-md"
              >
                <div className="w-10 h-10 rounded-xl bg-white/10 text-[#D1E043] border border-white/15 flex items-center justify-center mb-4 shadow-2xs">
                  <Icon size={18} />
                </div>
                <h3 className="font-serif text-lg font-normal text-[#FFFFFF] mb-2">{p.title}</h3>
                <p className="text-xs sm:text-[13px] text-[#8E8E93] leading-relaxed">{p.desc}</p>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
