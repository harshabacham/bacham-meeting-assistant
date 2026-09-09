"use client";

import { motion } from "framer-motion";
import { XCircle, CheckCircle2, ShieldCheck, EyeOff, Bot } from "lucide-react";

export default function WhyItExists() {
  const oldWayItems = [
    {
      title: "Awkward Meeting Bots",
      desc: "An uninvited bot joins your Zoom/Meet call, announcing to clients that they are being recorded.",
    },
    {
      title: "Cloud Data Exposure",
      desc: "Confidential executive deliberations and customer secrets are uploaded to third-party servers.",
    },
    {
      title: "Recurring Per-Seat Subscriptions",
      desc: "Monthly recurring fees of $20–$40/user that continuously balloon as your team scales.",
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
      desc: "Audio recordings and embeddings reside strictly in your local SQLite database on your machine.",
    },
    {
      title: "Free & Open-Source Forever",
      desc: "Run unlimited meetings using local Ollama models or your own BYOK cloud keys with zero markup.",
    },
    {
      title: "Full Offline Knowledge Brain",
      desc: "Instant sub-second semantic search across all your meeting history anytime, anywhere.",
    },
  ];

  return (
    <section id="comparison" className="py-24 md:py-32 bg-[#353935]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-[11.5px] font-semibold uppercase tracking-wider text-[#D1E043] select-none mb-2 block">
            The Bacham Advantage
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-[#F5F5F0] leading-tight mb-4">
            Why professionals are ditching cloud meeting bots
          </h2>
          <p className="text-base sm:text-lg text-[#C4C7C0] leading-relaxed">
            Stop sending awkward bots to client calls. Take notes with complete privacy, zero monthly fees, and 100% local processing.
          </p>
        </motion.div>

        {/* 2-Column Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-7 items-stretch">
          
          {/* Cloud Bots Column */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl bg-[#2C302C] border border-white/10 p-7 sm:p-8 flex flex-col justify-between shadow-lg"
          >
            <div>
              <div className="flex items-center gap-3 pb-4 border-b border-white/10 mb-6">
                <div className="w-9 h-9 rounded-xl bg-red-500/15 text-red-400 border border-red-500/25 flex items-center justify-center shrink-0">
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#F5F5F0]">Traditional Cloud Bots</h3>
                  <p className="text-xs text-[#959891]">Otter, Fireflies, Grain, etc.</p>
                </div>
              </div>

              <div className="space-y-5">
                {oldWayItems.map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <XCircle size={18} className="text-red-400/90 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-[14px] font-semibold text-[#F5F5F0] mb-0.5">
                        {item.title}
                      </h4>
                      <p className="text-[13px] text-[#A9ACA4] leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/10 text-xs text-red-400/90 font-medium">
              Result: Client friction, recurring bills, third-party privacy leaks.
            </div>
          </motion.div>

          {/* Bacham Column */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl bg-[#2D332D] border-2 border-[#D1E043]/40 p-7 sm:p-8 flex flex-col justify-between shadow-2xl relative"
          >
            <div>
              <div className="flex items-center gap-3 pb-4 border-b border-white/10 mb-6">
                <div className="w-9 h-9 rounded-xl bg-[#D1E043] text-[#1E1E1E] flex items-center justify-center shrink-0 shadow-xs font-bold">
                  <EyeOff size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-[#F5F5F0]">Bacham Local Notepad</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#D1E043] text-[#1E1E1E]">
                      100% Private
                    </span>
                  </div>
                  <p className="text-xs text-[#C4C7C0]">On-Device Native Audio Pipeline</p>
                </div>
              </div>

              <div className="space-y-5">
                {bachamItems.map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="text-[#D1E043] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-[14px] font-semibold text-[#F5F5F0] mb-0.5">
                        {item.title}
                      </h4>
                      <p className="text-[13px] text-[#C4C7C0] leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/10 text-xs text-[#D1E043] flex items-center gap-1.5 font-semibold">
              <ShieldCheck size={15} />
              <span>Result: Zero participant awkwardness. 100% data ownership.</span>
            </div>
          </motion.div>

        </div>

      </div>
    </section>
  );
}
