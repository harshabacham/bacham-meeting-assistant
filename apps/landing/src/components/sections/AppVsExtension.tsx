"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Laptop,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Zap,
  HardDrive,
  Cpu,
  Layers,
  Radio,
  Wifi,
} from "lucide-react";
import { ChromeIcon } from "@/components/ui/ChromeIcon";
import { WashiTape, DualStreamSticker } from "@/components/ui/CartoonStickers";

interface AppVsExtensionProps {
  onOpenSmartScreen?: () => void;
}

export default function AppVsExtension({ onOpenSmartScreen }: AppVsExtensionProps) {
  const [activeView, setActiveView] = useState<"desktop" | "extension" | "both">("both");

  const desktopFeatures = [
    { title: "Universal System-Wide Capture", desc: "Captures Zoom, Microsoft Teams, Google Meet, Slack, Discord, and in-person room audio." },
    { title: "Native OS Audio Loopback", desc: "Built with WASAPI (Windows) and CoreAudio (Mac) with zero virtual cables or third-party drivers." },
    { title: "100% Offline AI Execution", desc: "Run local Whisper v3 and local Ollama models on your GPU with zero cloud dependencies." },
    { title: "Local SQLite Vector Brain", desc: "Permanent on-device meeting search, timestamped audio replay, and flashcard generation." },
    { title: "Global Keyboard Shortcuts", desc: "Press Alt + Shift + B to start or stop recording invisibly from any window or desktop." },
  ];

  const extensionFeatures = [
    { title: "Floating In-Call Widget", desc: "A sleek, draggable floating action bar right inside your Google Meet browser tab." },
    { title: "Zero Install Footprint", desc: "Installs in seconds from Chrome Web Store with zero administrator permissions needed." },
    { title: "Tab Audio Capture API", desc: "Isolates Google Meet tab audio cleanly without touching system audio settings." },
    { title: "Offline Storage Fallback", desc: "Caches transcripts locally in Chrome storage if you aren't running the desktop app." },
    { title: "Instant Desktop Sync", desc: "Automatically pipes live audio chunks to the desktop client via local WebSocket (ws://127.0.0.1:1421)." },
  ];

  return (
    <section id="desktop-vs-extension" className="py-24 md:py-32 bg-[#000000] border-t border-white/10 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#D1E043]/5 blur-[130px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 relative">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="text-[11.5px] font-black uppercase tracking-wider text-[#D1E043] select-none">
              Product Ecosystem
            </span>
            <DualStreamSticker className="scale-85 -rotate-2" />
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-[#FFFFFF] leading-tight mb-4">
            Desktop App vs. Chrome Extension
          </h2>
          <p className="text-base sm:text-lg text-[#A1A1A6] leading-relaxed max-w-2xl mx-auto">
            Which tool should you install first? Choose the setup that matches your routine, or use both for the ultimate zero-bot pairing.
          </p>
        </div>

        {/* 2-Column Comparison Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          
          {/* Card 1: Desktop App (Recommended) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="p-7 sm:p-9 rounded-3xl bg-[#0D0D0E] border-2 border-[#D1E043]/40 flex flex-col justify-between relative overflow-hidden shadow-2xl group hover:border-[#D1E043]/70 transition-all"
          >
            <WashiTape color="lime" className="absolute -top-2 left-10 -rotate-2 z-20" />
            <span className="absolute top-5 right-5 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-[#D1E043] text-[#1E1E1E] shadow-sm">
              Recommended for 90% of Users
            </span>

            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#D1E043]/15 border border-[#D1E043]/30 flex items-center justify-center text-[#D1E043] mb-6 shadow-2xs">
                <Laptop size={24} />
              </div>

              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-mono text-[#D1E043] font-bold uppercase tracking-wider">
                  Windows 10/11 &amp; macOS
                </span>
                <span className="text-white/40">•</span>
                <span className="text-xs font-mono text-white/60">Standalone Client</span>
              </div>

              <h3 className="font-serif text-2xl sm:text-3xl font-normal text-white mb-3">
                Bacham Desktop Application
              </h3>

              <p className="text-sm text-[#A1A1A6] leading-relaxed mb-6">
                The full powerhouse experience. Records any meeting or lecture directly through your operating system sound card with zero bots, complete offline AI support, and instant SQLite archiving.
              </p>

              {/* Ideal For Badge */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 mb-6 text-xs text-[#D1D1D6]">
                <strong className="text-white block mb-0.5 font-medium">Best for:</strong>
                Zoom, Microsoft Teams, Slack Huddle, Google Meet, in-person classes, and users who want local offline models.
              </div>

              {/* Feature Checklist */}
              <div className="space-y-3.5 mb-8">
                {desktopFeatures.map((f, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-[#D1E043] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs sm:text-[13px] font-semibold text-white">
                        {f.title}
                      </h4>
                      <p className="text-[11.5px] text-[#8E8E93] leading-snug">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <a
                href="/downloads/bacham-setup.exe?v=1.0.10"
                download="BACHAM_1.0.10_x64-setup.exe"
                onClick={() => onOpenSmartScreen?.()}
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#D1E043] hover:bg-[#c4d436] text-[#1E1E1E] font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
              >
                <span>Download Desktop (v1.0.10)</span>
                <ArrowRight size={14} />
              </a>

              <span className="text-[11px] font-mono text-white/50">
                Free &amp; Open Source · 20.2 MB
              </span>
            </div>
          </motion.div>

          {/* Card 2: Chrome Extension */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="p-7 sm:p-9 rounded-3xl bg-[#0D0D0E] border border-white/10 flex flex-col justify-between relative overflow-hidden shadow-xl group hover:border-white/20 transition-all"
          >
            <WashiTape color="cyan" className="absolute -top-2 left-10 rotate-2 z-20" />
            <span className="absolute top-5 right-5 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-white/10 text-white/80 border border-white/15">
              Browser Companion
            </span>

            <div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white mb-6 shadow-2xs">
                <ChromeIcon className="w-6 h-6 text-[#D1E043]" />
              </div>

              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-mono text-[#D1E043] font-bold uppercase tracking-wider">
                  Chrome, Brave, Arc &amp; Edge
                </span>
                <span className="text-white/40">•</span>
                <span className="text-xs font-mono text-white/60">Companion Extension</span>
              </div>

              <h3 className="font-serif text-2xl sm:text-3xl font-normal text-white mb-3">
                Bacham Chrome Extension
              </h3>

              <p className="text-sm text-[#A1A1A6] leading-relaxed mb-6">
                Lightweight companion for web browser calls. Injects a discrete Floating Action Menu into Google Meet tabs so you can start, pause, and review notes right inside the webpage.
              </p>

              {/* Ideal For Badge */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 mb-6 text-xs text-[#D1D1D6]">
                <strong className="text-white block mb-0.5 font-medium">Best for:</strong>
                Google Meet power users who prefer in-browser floating widgets and want zero desktop system permissions.
              </div>

              {/* Feature Checklist */}
              <div className="space-y-3.5 mb-8">
                {extensionFeatures.map((f, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-[#D1E043] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs sm:text-[13px] font-semibold text-white">
                        {f.title}
                      </h4>
                      <p className="text-[11.5px] text-[#8E8E93] leading-snug">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <a
                href="https://chromewebstore.google.com/detail/bacham-%E2%80%94-ai-meeting-lectu/kfngjfenfpaladmjnogmihilchiednfl"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-2 border border-white/15 transition-all cursor-pointer"
              >
                <ChromeIcon className="w-3.5 h-3.5" />
                <span>Add to Chrome (Free)</span>
                <ExternalLink size={12} className="opacity-60" />
              </a>

              <span className="text-[11px] font-mono text-white/50">
                Official Chrome Web Store
              </span>
            </div>
          </motion.div>

        </div>

        {/* Connecting Banner: Better Together */}
        <div className="rounded-3xl bg-gradient-to-r from-[#121214] via-[#16191E] to-[#121214] border border-white/10 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            
            <div className="space-y-2 text-center lg:text-left max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D1E043]/10 border border-[#D1E043]/20 text-[#D1E043] text-xs font-bold">
                <Sparkles size={12} />
                <span>Better Together Architecture</span>
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-normal text-white">
                Can I use both together? Yes!
              </h3>
              <p className="text-xs sm:text-sm text-[#A1A1A6] leading-relaxed">
                When both are installed, the Chrome extension streams Google Meet audio directly into your Desktop instance over a local loopback socket (<code className="text-[#D1E043] font-mono bg-black/40 px-1 py-0.5 rounded">ws://127.0.0.1:1421</code>). You get in-browser floating buttons and desktop-grade local SQLite memory.
              </p>
            </div>

            {/* Visual Mini Flow Diagram */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs font-mono">
              <div className="px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white/80 flex items-center gap-1.5">
                <ChromeIcon className="w-3.5 h-3.5 text-[#D1E043]" />
                <span>Google Meet Tab</span>
              </div>

              <span className="text-[#D1E043] font-bold">→</span>

              <div className="px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white/80 flex items-center gap-1.5">
                <Radio size={13} className="text-[#0A84FF]" />
                <span>ws://127.0.0.1:1421</span>
              </div>

              <span className="text-[#D1E043] font-bold">→</span>

              <div className="px-3 py-2 rounded-xl bg-black/50 border border-[#D1E043]/30 text-white flex items-center gap-1.5">
                <HardDrive size={13} className="text-[#D1E043]" />
                <span>Desktop SQLite</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
