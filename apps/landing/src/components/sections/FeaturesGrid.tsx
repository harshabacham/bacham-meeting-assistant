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
    <section id="features" className="py-24 md:py-32 bg-[#FCFBF9] border-t border-[#E8E6DE] relative z-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[11.5px] font-semibold uppercase tracking-wider text-[#4F6322] select-none mb-2 block">
            Intelligence Architecture
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-[#1E1E1E] leading-tight mb-4">
            Everything you need for effortless meeting recall
          </h2>
          <p className="text-base sm:text-lg text-[#666666] leading-relaxed">
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
            className="md:col-span-2 rounded-2xl bg-[#FAF9F5] border border-[#E8E6DE] p-7 sm:p-8 flex flex-col justify-between relative overflow-hidden group hover:border-[#4F6322]/40 transition-all shadow-2xs"
          >
            <div>
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-white text-[#4F6322] border border-[#E8E6DE] flex items-center justify-center shrink-0 shadow-2xs">
                  <Mic size={18} />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white text-[#666666] border border-[#E8E6DE]">
                  Dual-Stream WASAPI &amp; CoreAudio
                </span>
              </div>

              <h3 className="font-serif text-2xl font-normal text-[#1E1E1E] mb-2 tracking-tight">
                Dual-channel audio &amp; offline Whisper ingestion
              </h3>
              <p className="text-[14px] text-[#555555] leading-relaxed max-w-xl mb-6">
                Separates your microphone from incoming speaker audio with studio clarity. Whisper runs directly on your GPU or NPU with sub-second turnaround—zero audio sent to the cloud.
              </p>
            </div>

            {/* Audio Pill Preview */}
            <div className="p-3 rounded-xl bg-white border border-[#E8E6DE] flex items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                <span className="text-xs font-mono text-[#1E1E1E] truncate">Mic: HyperX SoloCast · System: Zoom Output</span>
              </div>
              <span className="text-[11px] font-mono text-[#4F6322] shrink-0 font-semibold">16kHz 16-bit PCM</span>
            </div>
          </motion.div>

          {/* Bento Card 2 (Span 1): Visual Slide Memory */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="md:col-span-1 rounded-2xl bg-[#FAF9F5] border border-[#E8E6DE] p-7 sm:p-8 flex flex-col justify-between relative overflow-hidden group hover:border-[#4F6322]/40 transition-all shadow-2xs"
          >
            <div className="w-10 h-10 rounded-xl bg-white text-[#4F6322] border border-[#E8E6DE] flex items-center justify-center shrink-0 mb-5 shadow-2xs">
              <Presentation size={18} />
            </div>

            <div>
              <h3 className="font-serif text-xl font-normal text-[#1E1E1E] mb-2 tracking-tight">
                Visual slide memory &amp; key frames
              </h3>
              <p className="text-[13.5px] text-[#555555] leading-relaxed mb-4">
                Smart perceptual hashing detects when someone changes slides, automatically capturing crisp snapshots synchronized with notes.
              </p>
            </div>

            <div className="pt-3 border-t border-[#E8E6DE] text-[12px] font-medium text-[#4F6322] flex items-center gap-1">
              <span>Automatic Diff Detection</span>
              <ArrowRight size={13} />
            </div>
          </motion.div>

          {/* Bento Card 3 (Span 1): Chrome Extension Companion */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="md:col-span-1 rounded-2xl bg-[#FAF9F5] border border-[#E8E6DE] p-7 sm:p-8 flex flex-col justify-between relative overflow-hidden group hover:border-[#4F6322]/40 transition-all shadow-2xs"
          >
            <div className="w-10 h-10 rounded-xl bg-white text-[#4F6322] border border-[#E8E6DE] flex items-center justify-center shrink-0 mb-5 shadow-2xs">
              <ChromeIcon className="w-5 h-5 text-[#4F6322]" />
            </div>

            <div>
              <h3 className="font-serif text-xl font-normal text-[#1E1E1E] mb-2 tracking-tight">
                Chrome extension companion
              </h3>
              <p className="text-[13.5px] text-[#555555] leading-relaxed mb-4">
                1-click capture for Google Meet and browser calls. Automatically syncs via local WebSocket (<span className="font-mono text-[11px] text-[#4F6322]">ws://127.0.0.1:1421</span>).
              </p>
            </div>

            <div className="pt-3 border-t border-[#E8E6DE] text-[12px] font-medium text-[#4F6322] flex items-center gap-1">
              <span>Offline Media Vault &amp; Auto-Sync</span>
            </div>
          </motion.div>

          {/* Bento Card 4 (Span 1): Calendar Watchdog */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="md:col-span-1 rounded-2xl bg-[#FAF9F5] border border-[#E8E6DE] p-7 sm:p-8 flex flex-col justify-between relative overflow-hidden group hover:border-[#4F6322]/40 transition-all shadow-2xs"
          >
            <div className="w-10 h-10 rounded-xl bg-white text-[#4F6322] border border-[#E8E6DE] flex items-center justify-center shrink-0 mb-5 shadow-2xs">
              <CalendarCheck2 size={18} />
            </div>

            <div>
              <h3 className="font-serif text-xl font-normal text-[#1E1E1E] mb-2 tracking-tight">
                Calendar brief &amp; smart prep
              </h3>
              <p className="text-[13.5px] text-[#555555] leading-relaxed mb-4">
                Reads your local calendar (iCal, Outlook, Google) to prepare attendee context, prior topics, and prompt recording before calls begin.
              </p>
            </div>

            <div className="pt-3 border-t border-[#E8E6DE] text-[12px] font-medium text-[#4F6322] flex items-center gap-1">
              <span>Automatic Pre-Meeting Briefs</span>
            </div>
          </motion.div>

          {/* Bento Card 5 (Span 1): Formats for Every Team Tool */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="md:col-span-1 rounded-2xl bg-[#FAF9F5] border border-[#E8E6DE] p-7 sm:p-8 flex flex-col justify-between relative overflow-hidden group hover:border-[#4F6322]/40 transition-all shadow-2xs"
          >
            <div className="w-10 h-10 rounded-xl bg-white text-[#4F6322] border border-[#E8E6DE] flex items-center justify-center shrink-0 mb-5 shadow-2xs">
              <Share2 size={18} />
            </div>

            <div>
              <h3 className="font-serif text-xl font-normal text-[#1E1E1E] mb-2 tracking-tight">
                Formats for Slack &amp; Notion
              </h3>
              <p className="text-[13.5px] text-[#555555] leading-relaxed mb-4">
                Exports formatted Markdown, executive briefs, bulleted decisions, and action tables directly to your clipboard or knowledge base.
              </p>
            </div>

            <div className="pt-3 border-t border-[#E8E6DE] text-[12px] font-medium text-[#4F6322] flex items-center gap-1">
              <span>Instant Clipboard &amp; File Export</span>
            </div>
          </motion.div>

          {/* Bento Card 6 (Span 3 on bottom): Cross-Meeting Global Memory */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="md:col-span-3 rounded-2xl bg-[#F6F8F0] border-2 border-[#4F6322]/25 p-7 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-2xs"
          >
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#4F6322] text-white flex items-center justify-center shrink-0">
                  <Database size={16} />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#4F6322]">
                  Local Vector Semantic Index
                </span>
              </div>
              <h3 className="font-serif text-2xl font-normal text-[#1E1E1E] tracking-tight">
                Global memory: ask questions across your entire meeting history
              </h3>
              <p className="text-[14px] text-[#444444] leading-relaxed">
                Need to recall what was agreed upon three months ago? Query across all archived recordings with sub-second RAG search and exact timestamp jump links.
              </p>
            </div>

            <div className="w-full sm:w-auto shrink-0">
              <div className="px-5 py-3 rounded-xl bg-white border border-[#E8E6DE] text-xs font-mono text-[#1E1E1E] flex items-center gap-3 shadow-2xs">
                <Search size={14} className="text-[#4F6322]" />
                <span>&quot;What did Tanya agree to on Q3 ad campaigns?&quot;</span>
              </div>
            </div>
          </motion.div>

        </div>

      </div>
    </section>
  );
}
