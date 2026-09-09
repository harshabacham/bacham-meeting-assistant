"use client";

import { motion } from "framer-motion";
import {
  Mic,
  Presentation,
  CalendarCheck2,
  Share2,
  Search,
  ArrowRight,
  Database,
} from "lucide-react";
import { ChromeIcon } from "@/components/ui/ChromeIcon";

export default function FeaturesGrid() {
  return (
    <section id="features" className="py-24 md:py-32 border-t border-white/[0.06] bg-transparent relative z-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#BAFF29] select-none mb-2">
            Intelligence Architecture
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#F8F9FA] leading-tight mb-4">
            Everything You Need For Perfect Meeting Recall
          </h2>
          <p className="text-base sm:text-lg text-white/70 leading-relaxed">
            Built from the ground up for privacy, speed, and deep executive clarity.
          </p>
        </div>

        {/* 6-Card Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Bento Card 1 (Span 2): Dual-Channel Audio & Local Whisper */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="md:col-span-2 rounded-2xl bg-[#111317] border border-white/[0.08] p-7 sm:p-8 flex flex-col justify-between relative overflow-hidden group hover:border-[#BAFF29]/30 transition-all shadow-lg"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#BAFF29]/[0.05] rounded-full blur-3xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[#BAFF29]/10 text-[#BAFF29] border border-[#BAFF29]/20 flex items-center justify-center shrink-0">
                  <Mic size={18} />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/[0.04] text-white/70 border border-white/[0.06]">
                  Dual-Stream WASAPI &amp; CoreAudio
                </span>
              </div>

              <h3 className="text-xl font-bold text-[#F8F9FA] mb-2 tracking-tight">
                Dual-Channel Audio &amp; Offline Whisper Ingestion
              </h3>
              <p className="text-[13.5px] text-white/70 leading-relaxed max-w-xl mb-6">
                Separates your microphone from incoming speaker audio with studio clarity. Whisper runs directly on your GPU/NPU with sub-second turnaround—zero audio streaming to the cloud.
              </p>
            </div>

            {/* Interactive Audio Pill Preview */}
            <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#BAFF29] animate-pulse" />
                <span className="text-xs font-mono text-[#F8F9FA] truncate">Mic: HyperX SoloCast · System: Zoom Output</span>
              </div>
              <span className="text-[11px] font-mono text-[#BAFF29] shrink-0 font-bold">16kHz 16-bit PCM</span>
            </div>
          </motion.div>

          {/* Bento Card 2 (Span 1): Visual Slide Memory */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="md:col-span-1 rounded-2xl bg-[#111317] border border-white/[0.08] p-7 sm:p-8 flex flex-col justify-between relative overflow-hidden group hover:border-white/20 transition-all shadow-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0 mb-5">
              <Presentation size={18} />
            </div>

            <div>
              <h3 className="text-lg font-bold text-[#F8F9FA] mb-2 tracking-tight">
                Visual Slide Memory &amp; Key Frames
              </h3>
              <p className="text-[13px] text-white/70 leading-relaxed mb-4">
                Smart perceptual hashing detects when someone changes slides, automatically capturing crisp snapshots synchronized with notes.
              </p>
            </div>

            <div className="pt-3 border-t border-white/[0.05] text-[11px] font-bold text-blue-400 flex items-center gap-1">
              <span>Automatic Diff Detection</span>
              <ArrowRight size={12} />
            </div>
          </motion.div>

          {/* Bento Card 3 (Span 1): Chrome Extension Companion */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="md:col-span-1 rounded-2xl bg-[#111317] border border-white/[0.08] p-7 sm:p-8 flex flex-col justify-between relative overflow-hidden group hover:border-[#BAFF29]/30 transition-all shadow-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-[#BAFF29]/10 text-[#BAFF29] border border-[#BAFF29]/20 flex items-center justify-center shrink-0 mb-5">
              <ChromeIcon className="w-5 h-5 text-[#BAFF29]" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-[#F8F9FA] mb-2 tracking-tight">
                Chrome Extension Companion
              </h3>
              <p className="text-[13px] text-white/70 leading-relaxed mb-4">
                1-click capture for Google Meet and browser tabs. Automatically syncs via local WebSocket (<span className="font-mono text-[11px] text-[#BAFF29]">ws://127.0.0.1:1421</span>).
              </p>
            </div>

            <div className="pt-3 border-t border-white/[0.05] text-[11px] font-bold text-[#BAFF29] flex items-center gap-1">
              <span>Offline Media Vault &amp; Auto-Sync</span>
            </div>
          </motion.div>

          {/* Bento Card 4 (Span 1): Calendar Watchdog */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="md:col-span-1 rounded-2xl bg-[#111317] border border-white/[0.08] p-7 sm:p-8 flex flex-col justify-between relative overflow-hidden group hover:border-white/20 transition-all shadow-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0 mb-5">
              <CalendarCheck2 size={18} />
            </div>

            <div>
              <h3 className="text-lg font-bold text-[#F8F9FA] mb-2 tracking-tight">
                Calendar Auto-Record Watchdog
              </h3>
              <p className="text-[13px] text-white/70 leading-relaxed mb-4">
                Syncs with Google Calendar and iCal feeds. Arms recording ahead of scheduled meetings so you never forget to press record.
              </p>
            </div>

            <div className="pt-3 border-t border-white/[0.05] text-[11px] font-bold text-rose-400 flex items-center gap-1">
              <span>Pre-Meeting Briefs Generated</span>
            </div>
          </motion.div>

          {/* Bento Card 5 (Span 1): Pluggable Integrations */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="md:col-span-1 rounded-2xl bg-[#111317] border border-white/[0.08] p-7 sm:p-8 flex flex-col justify-between relative overflow-hidden group hover:border-white/20 transition-all shadow-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0 mb-5">
              <Share2 size={18} />
            </div>

            <div>
              <h3 className="text-lg font-bold text-[#F8F9FA] mb-2 tracking-tight">
                Push to Slack &amp; Notion
              </h3>
              <p className="text-[13px] text-white/70 leading-relaxed mb-4">
                Send action items and decisions straight to team channels or local Markdown files with clean Composio-ready integrations.
              </p>
            </div>

            <div className="pt-3 border-t border-white/[0.05] text-[11px] font-bold text-purple-400 flex items-center gap-1">
              <span>One-Click Team Sync</span>
            </div>
          </motion.div>

          {/* Bento Card 6 (Span 3 on bottom): Cross-Meeting Global Memory */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="md:col-span-3 rounded-2xl bg-[#111317] border border-[#BAFF29]/25 p-7 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden group hover:border-[#BAFF29]/50 transition-all shadow-lg"
          >
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#BAFF29]/15 text-[#BAFF29] flex items-center justify-center shrink-0">
                  <Database size={16} />
                </div>
                <span className="text-xs font-black uppercase tracking-wider text-[#BAFF29]">
                  Local Vector Semantic Index
                </span>
              </div>
              <h3 className="text-xl font-bold text-[#F8F9FA] tracking-tight">
                Global Memory: Ask Questions Across Your Entire Meeting History
              </h3>
              <p className="text-[13.5px] text-white/70 leading-relaxed">
                Need to remember what was agreed upon three months ago? Query across all archived recordings with sub-second RAG search and exact timestamp jump links.
              </p>
            </div>

            <div className="w-full sm:w-auto shrink-0">
              <div className="px-5 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-mono text-[#F8F9FA] flex items-center gap-3">
                <Search size={14} className="text-[#BAFF29]" />
                <span>&quot;What did Sarah say about API rate limits?&quot;</span>
              </div>
            </div>
          </motion.div>

        </div>

      </div>
    </section>
  );
}
