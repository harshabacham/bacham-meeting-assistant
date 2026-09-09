"use client";

import { motion } from "framer-motion";
import { Lock, Shield, HardDrive, WifiOff, Code2, CheckCircle2 } from "lucide-react";

export default function Privacy() {
  const pillars = [
    {
      icon: WifiOff,
      title: "100% Offline Air-Gapped Operation",
      desc: "Bacham doesn't require an internet connection to transcribe speech, detect decisions, or organize meeting notes when using local Whisper and Ollama.",
    },
    {
      icon: HardDrive,
      title: "Local SQLite Storage & Embeddings",
      desc: "Transcripts, summaries, action items, and slide images stay encrypted on your local drive. You own your data in standard SQLite and JSON formats.",
    },
    {
      icon: Code2,
      title: "Auditable Open-Source Architecture",
      desc: "No hidden telemetry trackers or proprietary telemetry daemons. The entire Tauri Rust and TypeScript codebase is open and inspectable on GitHub.",
    },
  ];

  return (
    <section id="privacy" className="py-24 md:py-32 border-t border-white/[0.06] bg-transparent relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#E2B774] select-none mb-2">
            Data Sovereignty
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#FAF9F5] leading-tight mb-4">
            Security by Architecture, Not Marketing Promises
          </h2>
          <p className="text-base sm:text-lg text-[#8E9099] leading-relaxed">
            Your conversations contain trade secrets, financial models, and strategic plans. Bacham is built to ensure they never leave your computer.
          </p>
        </div>

        {/* Visual Architecture Pipeline */}
        <div className="rounded-2xl bg-[#111317] border border-white/[0.08] p-6 sm:p-8 mb-12 shadow-xl">
          <div className="text-xs font-mono text-[#8E9099] uppercase tracking-wider mb-6 flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <span>Local Ingestion Pipeline</span>
            <span className="text-[#E2B774] font-semibold flex items-center gap-1.5">
              <Lock size={12} />
              Sandboxed On-Device
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between">
              <span className="text-[10px] font-mono text-[#E2B774]">01 · SOURCE</span>
              <h4 className="text-sm font-bold text-[#FAF9F5] mt-2 mb-1">Hardware Capture</h4>
              <p className="text-xs text-[#8E9099]">Direct WASAPI &amp; CoreAudio loopback stream without virtual cable bloat.</p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between">
              <span className="text-[10px] font-mono text-[#E2B774]">02 · INFERENCE</span>
              <h4 className="text-sm font-bold text-[#FAF9F5] mt-2 mb-1">Local Whisper Engine</h4>
              <p className="text-xs text-[#8E9099]">Zero cloud streaming. Speech-to-text converted directly into local RAM.</p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between">
              <span className="text-[10px] font-mono text-[#E2B774]">03 · SYNTHESIS</span>
              <h4 className="text-sm font-bold text-[#FAF9F5] mt-2 mb-1">Local Ollama / BYOK</h4>
              <p className="text-xs text-[#8E9099]">Extracts decisions &amp; action items on your hardware or via personal API keys.</p>
            </div>

            <div className="p-4 rounded-xl bg-[#E2B774]/10 border border-[#E2B774]/30 flex flex-col justify-between">
              <span className="text-[10px] font-mono text-[#E2B774]">04 · VAULT</span>
              <h4 className="text-sm font-bold text-[#FAF9F5] mt-2 mb-1">Encrypted SQLite DB</h4>
              <p className="text-xs text-[#8E9099]">All notes, embeddings, and snapshots stored exclusively on your SSD.</p>
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
                className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/15 transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-[#E2B774]/15 text-[#E2B774] border border-[#E2B774]/20 flex items-center justify-center mb-4">
                  <Icon size={18} />
                </div>
                <h3 className="text-base font-bold text-[#FAF9F5] mb-2">{p.title}</h3>
                <p className="text-xs sm:text-[13px] text-[#8E9099] leading-relaxed">{p.desc}</p>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
