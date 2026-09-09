"use client";

import { motion } from "framer-motion";
import { Video, Cpu, ShieldCheck, Sparkles } from "lucide-react";

export function EcosystemBar() {
  const platforms = [
    { name: "Google Meet", tag: "Chrome Extension & Desktop" },
    { name: "Zoom Meetings", tag: "Native & Web Audio" },
    { name: "Microsoft Teams", tag: "System Loopback" },
    { name: "Webex & Slack", tag: "Direct Stream" },
    { name: "In-Person Conversations", tag: "Studio Mic Capture" },
  ];

  const models = [
    { name: "Whisper v3 (Local)", desc: "100% Offline Speech-to-Text" },
    { name: "Ollama (DeepSeek / Llama 3)", desc: "Local On-Device Reasoning" },
    { name: "Anthropic Claude 3.5", desc: "Executive Synthesis via BYOK" },
    { name: "OpenAI GPT-4o", desc: "Zero-Data Retention" },
    { name: "Groq LPU", desc: "Sub-Second Live Streaming" },
  ];

  return (
    <section className="py-14 border-y border-white/[0.06] bg-[#0A0B0E]/60 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#E2B774] select-none">
              Universal Ecosystem
            </p>
            <h2 className="text-xl sm:text-2xl font-bold text-[#FAF9F5] tracking-tight mt-1">
              Works seamlessly with your tools &amp; preferred AI backends.
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#8E9099] bg-white/[0.03] px-3.5 py-1.5 rounded-full border border-white/[0.06] shrink-0 self-start md:self-auto">
            <ShieldCheck size={14} className="text-[#E2B774]" />
            <span>Zero Vendor Lock-In · Bring Your Own Keys</span>
          </div>
        </div>

        {/* Supported Platforms Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          {platforms.map((p, idx) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05, duration: 0.4 }}
              className="p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/15 transition-all flex flex-col justify-between group"
            >
              <div className="flex items-center gap-2 mb-2">
                <Video size={14} className="text-[#E2B774]/80 group-hover:text-[#E2B774] transition-colors" />
                <span className="text-xs font-bold text-[#FAF9F5] truncate">{p.name}</span>
              </div>
              <span className="text-[10px] text-[#8E9099] font-mono leading-tight">{p.tag}</span>
            </motion.div>
          ))}
        </div>

        {/* Supported AI Models Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {models.map((m, idx) => (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + idx * 0.05, duration: 0.4 }}
              className="p-3.5 rounded-xl bg-white/[0.015] hover:bg-white/[0.04] border border-white/[0.05] hover:border-white/15 transition-all flex flex-col justify-between group"
            >
              <div className="flex items-center gap-2 mb-2">
                <Cpu size={14} className="text-blue-400/80 group-hover:text-blue-400 transition-colors" />
                <span className="text-xs font-bold text-[#FAF9F5] truncate">{m.name}</span>
              </div>
              <span className="text-[10px] text-[#8E9099] leading-tight">{m.desc}</span>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
