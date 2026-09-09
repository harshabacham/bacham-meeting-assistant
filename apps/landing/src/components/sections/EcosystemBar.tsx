"use client";

import { motion } from "framer-motion";
import { Video, Cpu, ShieldCheck } from "lucide-react";

export function EcosystemBar() {
  const platforms = [
    { name: "Google Meet", tag: "Chrome Extension & Desktop" },
    { name: "Zoom Meetings", tag: "Native & Web Audio" },
    { name: "Microsoft Teams", tag: "System Loopback" },
    { name: "Slack Huddles", tag: "Direct Stream" },
    { name: "In-Person Meetings", tag: "Studio Mic Capture" },
  ];

  const models = [
    { name: "Whisper v3 (Local)", desc: "100% Offline Speech-to-Text" },
    { name: "Ollama (Local Models)", desc: "DeepSeek, Llama 3 & Gemma" },
    { name: "Anthropic Claude 3.5", desc: "Executive Synthesis via BYOK" },
    { name: "OpenAI GPT-4o", desc: "Zero Data Retention API" },
    { name: "Groq LPU", desc: "Sub-Second Live Streaming" },
  ];

  return (
    <section className="py-16 border-y border-white/10 bg-[#070708] overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#D1E043] select-none">
              Universal Ecosystem
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif text-[#FFFFFF] tracking-tight mt-1">
              Works seamlessly with your meeting apps &amp; AI models.
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#A1A1A6] bg-white/10 px-3.5 py-1.5 rounded-full border border-white/15 shrink-0 self-start md:self-auto shadow-2xs">
            <ShieldCheck size={14} className="text-[#D1E043]" />
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
              className="p-3.5 rounded-xl bg-[#0E0E10] hover:bg-[#151518] border border-white/10 hover:border-[#D1E043]/40 transition-all flex flex-col justify-between group shadow-2xs"
            >
              <div className="flex items-center gap-2 mb-2">
                <Video size={14} className="text-[#D1E043]" />
                <span className="text-xs font-semibold text-[#FFFFFF] truncate">{p.name}</span>
              </div>
              <span className="text-[11px] text-[#8E8E93] font-sans leading-tight">{p.tag}</span>
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
              className="p-3.5 rounded-xl bg-[#0E0E10]/80 hover:bg-[#0E0E10] border border-white/10 hover:border-[#D1E043]/30 transition-all flex flex-col justify-between group shadow-2xs"
            >
              <div className="flex items-center gap-2 mb-2">
                <Cpu size={14} className="text-[#D1E043]/80 group-hover:text-[#D1E043] transition-colors" />
                <span className="text-xs font-semibold text-[#FFFFFF] truncate">{m.name}</span>
              </div>
              <span className="text-[11px] text-[#8E8E93] leading-tight">{m.desc}</span>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
