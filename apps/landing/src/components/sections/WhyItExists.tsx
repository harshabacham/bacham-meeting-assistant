"use client";

import { motion } from "framer-motion";
import { XCircle, CheckCircle2, ShieldCheck, EyeOff, Bot } from "lucide-react";
import { NoBotsSticker, LocalSsdSticker, WashiTape } from "@/components/ui/CartoonStickers";

export default function WhyItExists() {
  const oldWayItems = [
    {
      title: "Awkward Uninvited Meeting Bots",
      desc: "A bot enters your Zoom/Meet call with an obnoxious banner, alerting clients and peers they are being recorded.",
    },
    {
      title: "Wall-of-Text Unstructured Transcripts",
      desc: "Leaves you with thousands of lines of unedited speech with zero actionable takeaways or study retention.",
    },
    {
      title: "Confidential Data Uploaded to Cloud",
      desc: "Sensitive executive decisions, IP, and customer secrets are sent to third-party servers for model training.",
    },
    {
      title: "Recurring Per-Seat Monthly Taxes",
      desc: "Expensive subscriptions of $20–$40 per user every single month with strict recording minute caps.",
    },
  ];

  const bachamItems = [
    {
      title: "100% Invisible Native Dual-Stream Capture",
      desc: "Zero bots in the call. Captures both remote attendees and your mic cleanly via OS loopback or Chrome extension.",
    },
    {
      title: "Timestamped Action Items & Study Decks",
      desc: "Instant structured notes, action items linked to audio seconds ([00:32]), and 1-click revision flashcards.",
    },
    {
      title: "Absolute Local SSD Data Sovereignty",
      desc: "Transcripts, audio, and SQLite database stay 100% on your SSD with zero cloud leaks or telemetry.",
    },
    {
      title: "Free & Open-Source Forever",
      desc: "Run local Whisper & local Ollama on your GPU with zero markup, or connect your personal Claude/GPT-4o API keys.",
    },
  ];

  return (
    <section id="why-it-exists" className="py-24 md:py-32 bg-[#000000] relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-3xl mx-auto mb-16 relative"
        >
          <span className="text-[11.5px] font-black uppercase tracking-wider text-[#D1E043] select-none mb-2 block">
            The Bacham Advantage
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-[44px] font-normal tracking-[-0.02em] text-[#FFFFFF] leading-[1.15] mb-4">
            Why professionals and students are kicking out meeting bots
          </h2>
          <p className="text-base sm:text-lg text-[#A1A1A6] leading-relaxed max-w-2xl mx-auto">
            Stop sending awkward bots to client calls. Capture notes with dual-stream clarity, zero monthly fees, and 100% local privacy.
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
            className="rounded-2xl bg-[#0D0D0E] border border-white/10 p-7 sm:p-8 flex flex-col justify-between shadow-lg relative overflow-hidden"
          >
            <NoBotsSticker className="absolute -top-3 right-4 rotate-6 z-20 scale-90" />

            <div>
              <div className="flex items-center gap-3 pb-4 border-b border-white/10 mb-6 pt-4 sm:pt-2">
                <div className="w-9 h-9 rounded-xl bg-red-500/15 text-red-400 border border-red-500/25 flex items-center justify-center shrink-0">
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#FFFFFF]">Traditional Cloud Bots</h3>
                  <p className="text-xs text-[#8E8E93]">Otter, Fireflies, Grain, etc.</p>
                </div>
              </div>

              <div className="space-y-5">
                {oldWayItems.map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <XCircle size={18} className="text-red-400/90 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-[14px] font-semibold text-[#FFFFFF] mb-0.5">
                        {item.title}
                      </h4>
                      <p className="text-[13px] text-[#A1A1A6] leading-relaxed">
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
            className="rounded-2xl bg-[#121214] border-2 border-[#D1E043]/40 p-7 sm:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden"
          >
            <WashiTape color="lime" className="absolute -top-2 left-10 -rotate-[2deg] z-20" />
            <LocalSsdSticker className="absolute -top-3.5 right-6 rotate-2 z-20 scale-90" />

            <div>
              <div className="flex items-center gap-3 pb-4 border-b border-white/10 mb-6 pt-4 sm:pt-2">
                <div className="w-9 h-9 rounded-xl bg-[#D1E043] text-[#1E1E1E] flex items-center justify-center shrink-0 shadow-xs font-bold">
                  <EyeOff size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-[#FFFFFF]">Bacham Local Copilot</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#D1E043] text-[#1E1E1E]">
                      100% Private
                    </span>
                  </div>
                  <p className="text-xs text-[#D1D1D6]">On-Device Dual-Stream Audio &amp; Study Engine</p>
                </div>
              </div>

              <div className="space-y-5">
                {bachamItems.map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="text-[#D1E043] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-[14px] font-semibold text-[#FFFFFF] mb-0.5">
                        {item.title}
                      </h4>
                      <p className="text-[13px] text-[#D1D1D6] leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/10 text-xs text-[#D1E043] flex items-center gap-1.5 font-semibold">
              <ShieldCheck size={15} />
              <span>Result: Zero participant awkwardness. 100% data ownership. Instant study cards.</span>
            </div>
          </motion.div>

        </div>

      </div>
    </section>
  );
}
