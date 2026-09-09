"use client";

import { motion } from "framer-motion";
import { XCircle, CheckCircle2, ShieldCheck, Zap, Lock, DollarSign, Bot, EyeOff } from "lucide-react";

export default function WhyItExists() {
  const oldWayItems = [
    {
      title: "Awkward Meeting Bots",
      desc: "An uninvited bot joins your Zoom/Meet call, broadcasting to clients that they are being recorded.",
    },
    {
      title: "Cloud Data Exposure",
      desc: "Confidential executive deliberations and customer secrets are stored on third-party servers.",
    },
    {
      title: "Expensive Per-Seat Subscriptions",
      desc: "Monthly recurring fees of $20–$40/user that balloon as your team scales.",
    },
    {
      title: "Zero Offline Access",
      desc: "Unable to search past meeting transcripts, playback audio, or review notes while in transit or offline.",
    },
  ];

  const bachamItems = [
    {
      title: "100% Invisible Native Capture",
      desc: "Zero bots. Zero notification banners. Captures audio directly from system loopback or browser tab.",
    },
    {
      title: "Absolute Data Sovereignty",
      desc: "Audio recordings and embeddings reside strictly in your local SQLite database on your SSD.",
    },
    {
      title: "Free & Open-Source Forever",
      desc: "Run unlimited meetings using local Ollama models or your own BYOK cloud keys with 0 markup.",
    },
    {
      title: "Full Offline Knowledge Brain",
      desc: "Instant sub-second semantic search across all your meeting history anytime, anywhere.",
    },
  ];

  return (
    <section id="comparison" className="py-24 md:py-32 border-t border-white/[0.06] bg-transparent">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#E2B774] select-none mb-2">
            The Bacham Advantage
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#FAF9F5] leading-tight mb-4">
            Why Professionals Are Ditching Cloud Meeting Bots
          </h2>
          <p className="text-base sm:text-lg text-[#8E9099] leading-relaxed">
            Stop sending awkward bots to client calls. Capture everything invisibly with complete privacy and zero monthly fees.
          </p>
        </motion.div>

        {/* 2-Column Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          
          {/* Cloud Bots Column */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl bg-white/[0.015] border border-white/[0.06] p-7 sm:p-8 flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/[0.03] rounded-full blur-3xl pointer-events-none" />

            <div>
              <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.06] mb-6">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center shrink-0">
                  <Bot size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#FAF9F5]">Traditional Cloud Bots</h3>
                  <p className="text-xs text-[#8E9099]">Otter, Fireflies, Grain, etc.</p>
                </div>
              </div>

              <div className="space-y-5">
                {oldWayItems.map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <XCircle size={18} className="text-red-400/80 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-[13.5px] font-semibold text-[#FAF9F5]/90 mb-0.5">
                        {item.title}
                      </h4>
                      <p className="text-[12.5px] text-[#8E9099] leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/[0.04] text-xs text-red-400/70 font-mono">
              Result: Client friction, recurring bills, privacy leaks.
            </div>
          </motion.div>

          {/* Bacham Column */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl bg-[#121418] border border-[#E2B774]/30 p-7 sm:p-8 flex flex-col justify-between relative overflow-hidden shadow-[0_12px_40px_rgba(226,183,116,0.06)]"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#E2B774]/[0.08] rounded-full blur-3xl pointer-events-none" />

            <div>
              <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.08] mb-6">
                <div className="w-8 h-8 rounded-lg bg-[#E2B774]/15 text-[#E2B774] border border-[#E2B774]/30 flex items-center justify-center shrink-0">
                  <EyeOff size={16} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-[#FAF9F5]">Bacham Local Assistant</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-[#E2B774]/15 text-[#E2B774] border border-[#E2B774]/30">
                      100% Private
                    </span>
                  </div>
                  <p className="text-xs text-[#8E9099]">On-Device Native Audio Pipeline</p>
                </div>
              </div>

              <div className="space-y-5">
                {bachamItems.map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="text-[#E2B774] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-[13.5px] font-semibold text-[#FAF9F5] mb-0.5">
                        {item.title}
                      </h4>
                      <p className="text-[12.5px] text-[#8E9099] leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/[0.08] text-xs text-[#E2B774] font-mono flex items-center gap-1.5">
              <ShieldCheck size={14} />
              <span>Result: Zero participant awkwardness. 100% data ownership.</span>
            </div>
          </motion.div>

        </div>

      </div>
    </section>
  );
}
