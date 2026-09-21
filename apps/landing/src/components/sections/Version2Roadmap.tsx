"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Camera,
  Users2,
  Wifi,
  CalendarCheck,
  Blocks,
  BrainCircuit,
  MessageSquare,
  Send,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { WashiTape, StarburstSticker } from "@/components/ui/CartoonStickers";

export default function Version2Roadmap() {
  const [feedback, setFeedback] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback, email }),
      });

      if (!res.ok) {
        throw new Error("Failed to send feedback");
      }

      setIsSuccess(true);
      setFeedback("");
      setEmail("");
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setIsSuccess(false);
      }, 5000);
    } catch (error) {
      setErrorMsg("Failed to send to Discord. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const roadmapItems = [
    {
      icon: Camera,
      title: "Local Multi-Modal Screen & Slide Replay",
      badge: "In Development",
      version: "v2.0.0-alpha",
      desc: "Automatically snapshots key presentation slides and screen shares during calls, syncing visual frames with the timestamped audio timeline — 100% on your local SSD.",
    },
    {
      icon: Users2,
      title: "Neural Voice Diarization 2.0",
      badge: "Architecture Phase",
      version: "v2.0.0",
      desc: "Next-gen on-device acoustic voiceprints that identify speaker identities and conversational turns without uploading raw voice biometric vectors to any cloud server.",
    },
    {
      icon: Wifi,
      title: "Encrypted P2P Local Sync (Desktop ⇄ Mobile)",
      badge: "In Development",
      version: "v2.0.0",
      desc: "End-to-end encrypted synchronization between your desktop library and mobile companion over local Wi-Fi / WebRTC with zero intermediary cloud database.",
    },
    {
      icon: CalendarCheck,
      title: "Autonomous Calendar Auto-Record Daemon",
      badge: "Planned",
      version: "v2.0.0",
      desc: "A silent, ultra-light background tray process that detects scheduled calendar events and silently arms WASAPI/CoreAudio loopback without manual intervention.",
    },
    {
      icon: Blocks,
      title: "Local Integrations SDK (Linear, Jira, Obsidian)",
      badge: "Prototyping",
      version: "v2.0.0",
      desc: "Modular local export pipeline to push action items into Linear tickets, GitHub Issues, Jira boards, or write directly into your local Obsidian vault.",
    },
    {
      icon: BrainCircuit,
      title: "On-Device Personal Jargon LoRA Fine-Tuning",
      badge: "Research",
      version: "v2.0.0",
      desc: "Private local adapter fine-tuning that automatically teaches your on-device LLM your company's proprietary acronyms, customer names, and technical terminology.",
    },
  ];

  return (
    <section id="roadmap" className="py-24 md:py-32 bg-[#000000] border-t border-white/10 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 relative">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="text-[11.5px] font-black uppercase tracking-wider text-[#D1E043] select-none">
              Future Architecture
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#D1E043] text-[#1E1E1E] uppercase">
              v2.0.0 Roadmap
            </span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-[#FFFFFF] leading-tight mb-4">
            Upcoming in Version 2.0.0
          </h2>
          <p className="text-base sm:text-lg text-[#A1A1A6] leading-relaxed">
            We are pushing the boundaries of local-first artificial intelligence. Here is what is coming next in Bacham v2.0.0.
          </p>

          <StarburstSticker text="NEXT-GEN LOCAL AI" className="absolute -top-6 right-4 hidden md:inline-flex" />
        </div>

        {/* 6-Card Roadmap Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {roadmapItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.07 }}
                className="rounded-2xl bg-[#0D0D0E] border border-white/10 p-6 flex flex-col justify-between relative overflow-hidden group hover:border-[#D1E043]/40 transition-all shadow-md"
              >
                {idx === 0 && <WashiTape color="cyan" className="absolute -top-2 right-8 rotate-[-2deg] z-20" />}
                {idx === 1 && <WashiTape color="lime" className="absolute -top-2 left-8 rotate-[2deg] z-20" />}

                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white/10 text-[#D1E043] border border-white/15 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-[#D1E043] group-hover:text-[#1E1E1E] transition-colors">
                      <Icon size={19} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10.5px] font-mono text-[#A1A1A6] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                        {item.version}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#D1E043] bg-[#D1E043]/15 border border-[#D1E043]/30 px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-serif text-xl font-normal text-[#FFFFFF] mb-2.5 tracking-tight group-hover:text-[#D1E043] transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-[13px] text-[#A1A1A6] leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-6 pt-3.5 border-t border-white/10 flex items-center justify-between text-xs text-zinc-500">
                  <span className="font-mono text-[11px] text-[#A1A1A6]">100% Local Pipeline</span>
                  <span className="text-[#D1E043] text-[11px] font-semibold flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <span>Target: Q2 2026</span>
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Community Contribution Box */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#121214] border-2 border-[#D1E043]/30 flex flex-col items-center gap-6 shadow-xl relative overflow-hidden">
          <WashiTape color="pink" className="absolute -top-2 left-14 rotate-[-2deg] z-20" />

          <div className="space-y-2 text-center w-full">
            <div className="flex items-center justify-center gap-2">
              <MessageSquare size={16} className="text-[#D1E043]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#D1E043]">
                Help Shape Version 2.0.0
              </span>
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-normal text-white">
              Have an idea or feature request?
            </h3>
            <p className="text-sm text-[#A1A1A6] max-w-xl mx-auto">
              Bacham is driven by community feedback. Send your ideas directly to our Discord server.
            </p>
          </div>

          <form onSubmit={handleSubmitFeedback} className="w-full max-w-2xl relative z-10 mt-2">
            <div className="space-y-3">
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="What features would you love to see in the next update?"
                className="w-full h-24 p-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D1E043]/50 focus:bg-white/10 resize-none transition-all text-sm"
                required
              />
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email or Discord Username (optional)"
                  className="flex-1 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D1E043]/50 focus:bg-white/10 transition-all text-sm"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !feedback.trim()}
                  className="px-6 py-3 rounded-2xl bg-[#D1E043] hover:bg-[#c4d436] text-[#1E1E1E] font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  <span>Send to Discord</span>
                </button>
              </div>
            </div>

            <AnimatePresence>
              {isSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 flex items-center justify-center gap-2 text-emerald-400 text-sm font-medium"
                >
                  <CheckCircle2 size={16} />
                  <span>Feedback sent successfully! Thank you.</span>
                </motion.div>
              )}
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 text-red-400 text-sm font-medium text-center"
                >
                  {errorMsg}
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>

      </div>
    </section>
  );
}
