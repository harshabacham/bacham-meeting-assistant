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
    { name: "Ollama (DeepSeek / Llama 3)", desc: "Local On-Device Reasoning" },
    { name: "Anthropic Claude 3.5", desc: "Executive Synthesis via BYOK" },
    { name: "OpenAI GPT-4o", desc: "Zero Data Retention API" },
    { name: "Groq LPU", desc: "Sub-Second Live Streaming" },
  ];

  return (
    <section className="py-16 border-y border-[#E8E6DE] bg-[#FAF9F5] overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#4F6322] select-none">
              Universal Ecosystem
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif text-[#1E1E1E] tracking-tight mt-1">
              Works seamlessly with your meeting apps &amp; AI models.
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#555555] bg-white px-3.5 py-1.5 rounded-full border border-[#E8E6DE] shrink-0 self-start md:self-auto shadow-2xs">
            <ShieldCheck size={14} className="text-[#4F6322]" />
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
              className="p-3.5 rounded-xl bg-white hover:bg-[#F4F3EF] border border-[#E8E6DE] hover:border-[#4F6322]/40 transition-all flex flex-col justify-between group shadow-2xs"
            >
              <div className="flex items-center gap-2 mb-2">
                <Video size={14} className="text-[#4F6322]" />
                <span className="text-xs font-semibold text-[#1E1E1E] truncate">{p.name}</span>
              </div>
              <span className="text-[11px] text-[#666666] font-sans leading-tight">{p.tag}</span>
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
              className="p-3.5 rounded-xl bg-white/70 hover:bg-white border border-[#E8E6DE] hover:border-[#4F6322]/30 transition-all flex flex-col justify-between group shadow-2xs"
            >
              <div className="flex items-center gap-2 mb-2">
                <Cpu size={14} className="text-[#4F6322]/80 group-hover:text-[#4F6322] transition-colors" />
                <span className="text-xs font-semibold text-[#1E1E1E] truncate">{m.name}</span>
              </div>
              <span className="text-[11px] text-[#666666] leading-tight">{m.desc}</span>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
