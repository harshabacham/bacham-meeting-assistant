"use client";

import { motion } from "framer-motion";
import {
  Mic,
  GraduationCap,
  Clock,
  Share2,
  Search,
  ArrowRight,
  Database,
  Sparkles,
} from "lucide-react";
import { ChromeIcon } from "@/components/ui/ChromeIcon";
import {
  StudyModeSticker,
  LocalSsdSticker,
  NoBotsSticker,
  DualStreamSticker,
  WashiTape,
  DoodleAnnotation,
} from "@/components/ui/CartoonStickers";

export default function FeaturesGrid() {
  return (
    <section id="features" className="py-24 md:py-32 bg-[#000000] border-t border-white/10 relative z-10 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Section Header with Trendy Stickers */}
        <div className="text-center max-w-3xl mx-auto mb-16 relative">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="text-[11.5px] font-black uppercase tracking-wider text-[#D1E043] select-none">
              Intelligence Architecture
            </span>
            <NoBotsSticker className="scale-90 rotate-3" />
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-[#FFFFFF] leading-tight mb-4">
            Everything you need for effortless meeting &amp; lecture recall
          </h2>
          <p className="text-base sm:text-lg text-[#A1A1A6] leading-relaxed">
            Built from the ground up for privacy, dual-stream audio clarity, and 1-click retention.
          </p>

          <DoodleAnnotation
            text="★ 100% on your device!"
            direction="right"
            className="absolute -top-4 right-4 hidden md:inline-flex"
          />
        </div>

        {/* 6-Card Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Bento Card 1 (Span 2): Dual-Stream Audio & Local Whisper */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="md:col-span-2 rounded-2xl bg-[#0D0D0E] border border-white/10 p-7 sm:p-8 flex flex-col justify-between relative overflow-hidden group hover:border-[#D1E043]/40 transition-all shadow-md"
          >
            <WashiTape color="lime" className="absolute -top-2 right-12 rotate-[2deg] z-20" />

            <div>
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-white/10 text-[#D1E043] border border-white/15 flex items-center justify-center shrink-0 shadow-2xs">
                  <Mic size={18} />
                </div>
                <div className="flex items-center gap-2">
                  <DualStreamSticker className="scale-90 -rotate-2" />
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/10 text-[#D1D1D6] border border-white/15">
                    Dual-Stream WASAPI &amp; CoreAudio
                  </span>
                </div>
              </div>

              <h3 className="font-serif text-2xl font-normal text-[#FFFFFF] mb-2 tracking-tight">
                Dual-channel audio &amp; streaming Whisper ingestion
              </h3>
              <p className="text-[14px] text-[#A1A1A6] leading-relaxed max-w-xl mb-6">
                Captures both remote attendees from system loopback and your microphone with zero echo artifacts. Local Whisper processes streaming speech chunks into a synchronized timeline.
              </p>
            </div>

            {/* Audio Pill Preview */}
            <div className="p-3 rounded-xl bg-[#080809] border border-white/10 flex items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                <span className="text-xs font-mono text-[#FFFFFF] truncate">Mic: User Voice · System Loopback: Google Meet / Zoom</span>
              </div>
              <span className="text-[11px] font-mono text-[#D1E043] shrink-0 font-semibold">16kHz 16-bit PCM</span>
            </div>
          </motion.div>

          {/* Bento Card 2 (Span 1): 1-Click Flashcards & Study Decks */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="md:col-span-1 rounded-2xl bg-[#0D0D0E] border-2 border-[#D1E043]/30 p-7 sm:p-8 flex flex-col justify-between relative overflow-hidden group hover:border-[#D1E043] transition-all shadow-md"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#D1E043] text-[#1E1E1E] border border-white/15 flex items-center justify-center shrink-0 shadow-2xs font-bold">
                <GraduationCap size={20} />
              </div>
              <StudyModeSticker className="scale-85 rotate-6" />
            </div>

            <div>
              <h3 className="font-serif text-xl font-normal text-[#FFFFFF] mb-2 tracking-tight flex items-center gap-1.5">
                <span>1-click flashcards &amp; quiz decks</span>
              </h3>
              <p className="text-[13.5px] text-[#A1A1A6] leading-relaxed mb-4">
                Bacham&apos;s killer superpower: Turn technical meetings, architecture syncs, and university lectures into interactive revision flashcards and quizzes in 1 click.
              </p>
            </div>

            <div className="pt-3 border-t border-white/10 text-[12px] font-bold text-[#D1E043] flex items-center gap-1">
              <Sparkles size={13} />
              <span>Spaced Repetition &amp; Quiz Mode</span>
            </div>
          </motion.div>

          {/* Bento Card 3 (Span 1): Timestamped Action Items with Audio Jump */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="md:col-span-1 rounded-2xl bg-[#0D0D0E] border border-white/10 p-7 sm:p-8 flex flex-col justify-between relative overflow-hidden group hover:border-[#D1E043]/40 transition-all shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-white/10 text-[#D1E043] border border-white/15 flex items-center justify-center shrink-0 mb-5 shadow-2xs">
              <Clock size={18} />
            </div>

            <div>
              <h3 className="font-serif text-xl font-normal text-[#FFFFFF] mb-2 tracking-tight">
                Timestamped action items with audio replay
              </h3>
              <p className="text-[13.5px] text-[#A1A1A6] leading-relaxed mb-4">
                Every action item automatically attaches to the exact second in the timeline (<span className="font-mono text-xs text-[#D1E043]">[00:32]</span>). Click any item to jump straight to what was said.
              </p>
            </div>

            <div className="pt-3 border-t border-white/10 text-[12px] font-medium text-[#D1E043] flex items-center gap-1">
              <span>Zero Lost Conversational Context</span>
            </div>
          </motion.div>

          {/* Bento Card 4 (Span 1): Chrome Extension Companion */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="md:col-span-1 rounded-2xl bg-[#0D0D0E] border border-white/10 p-7 sm:p-8 flex flex-col justify-between relative overflow-hidden group hover:border-[#D1E043]/40 transition-all shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-white/10 text-[#D1E043] border border-white/15 flex items-center justify-center shrink-0 mb-5 shadow-2xs">
              <ChromeIcon className="w-5 h-5 text-[#D1E043]" />
            </div>

            <div>
              <h3 className="font-serif text-xl font-normal text-[#FFFFFF] mb-2 tracking-tight">
                Chrome extension + local WebSocket
              </h3>
              <p className="text-[13.5px] text-[#A1A1A6] leading-relaxed mb-4">
                1-click tab capture for Google Meet. Streams to desktop app via secure local WebSocket (<span className="font-mono text-[11px] text-[#D1E043]">ws://127.0.0.1:1421</span>) with offline vault fallback.
              </p>
            </div>

            <div className="pt-3 border-t border-white/10 text-[12px] font-medium text-[#D1E043] flex items-center gap-1">
              <span>Offline Media Vault &amp; Auto-Sync</span>
            </div>
          </motion.div>

          {/* Bento Card 5 (Span 1): Formats for Every Team Tool */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="md:col-span-1 rounded-2xl bg-[#0D0D0E] border border-white/10 p-7 sm:p-8 flex flex-col justify-between relative overflow-hidden group hover:border-[#D1E043]/40 transition-all shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-white/10 text-[#D1E043] border border-white/15 flex items-center justify-center shrink-0 mb-5 shadow-2xs">
              <Share2 size={18} />
            </div>

            <div>
              <h3 className="font-serif text-xl font-normal text-[#FFFFFF] mb-2 tracking-tight">
                Formats for Slack, Notion &amp; PDF
              </h3>
              <p className="text-[13.5px] text-[#A1A1A6] leading-relaxed mb-4">
                Exports formatted Markdown, executive briefs, bulleted decisions, and flashcards directly to your clipboard, Notion workspace, or PDF documentation.
              </p>
            </div>

            <div className="pt-3 border-t border-white/10 text-[12px] font-medium text-[#D1E043] flex items-center gap-1">
              <span>Instant Clipboard &amp; File Export</span>
            </div>
          </motion.div>

          {/* Bento Card 6 (Span 3 on bottom): Local SQLite Knowledge Brain with FTS5 */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="md:col-span-3 rounded-2xl bg-[#121214] border-2 border-[#D1E043]/35 p-7 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-xl"
          >
            <WashiTape color="cyan" className="absolute -top-2 left-16 rotate-[-3deg] z-20" />

            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#D1E043] text-[#1E1E1E] flex items-center justify-center shrink-0 font-bold">
                  <Database size={16} />
                </div>
                <span className="text-xs font-black uppercase tracking-wider text-[#D1E043]">
                  Local SQLite FTS5 &amp; Vector Index
                </span>
                <LocalSsdSticker className="scale-80 -rotate-2" />
              </div>
              <h3 className="font-serif text-2xl font-normal text-[#FFFFFF] tracking-tight">
                Global memory: sub-second semantic search across all meetings &amp; lectures
              </h3>
              <p className="text-[14px] text-[#D1D1D6] leading-relaxed">
                Need to find a technical decision made three weeks ago? Query your local archive with instant full-text SQLite search and audio timestamp jump links. Zero cloud telemetry.
              </p>
            </div>

            <div className="w-full sm:w-auto shrink-0">
              <div className="px-5 py-3 rounded-xl bg-[#080809] border border-white/15 text-xs font-mono text-[#FFFFFF] flex items-center gap-3 shadow-md">
                <Search size={14} className="text-[#D1E043]" />
                <span>&quot;Maya loopback buffer audio routing&quot;</span>
              </div>
            </div>
          </motion.div>

        </div>

      </div>
    </section>
  );
}
