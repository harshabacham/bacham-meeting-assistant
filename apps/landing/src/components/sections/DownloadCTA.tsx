"use client";

import { motion } from "framer-motion";
import { Download, Apple, Laptop, Terminal, ExternalLink, ShieldCheck } from "lucide-react";
import { ChromeIcon } from "@/components/ui/ChromeIcon";

export default function DownloadCTA() {
  const releasesUrl = "https://github.com/harshabacham/bacham-meeting-assistant/releases";

  const platforms = [
    {
      name: "Windows 10 / 11",
      icon: Laptop,
      format: ".msi / .exe Installer",
      badge: "Desktop Shortcut & Tray Autostart",
      href: releasesUrl,
      recommended: true,
    },
    {
      name: "macOS",
      icon: Apple,
      format: "Universal DMG (Apple Silicon & Intel)",
      badge: "CoreAudio Loopback Support",
      href: releasesUrl,
      recommended: false,
    },
    {
      name: "Linux",
      icon: Terminal,
      format: ".deb / AppImage",
      badge: "ALSA & PulseAudio Support",
      href: releasesUrl,
      recommended: false,
    },
    {
      name: "Chrome Extension",
      icon: ChromeIcon,
      format: "Web Store / CRX Package",
      badge: "Google Meet & Tab Audio",
      href: releasesUrl,
      recommended: false,
    },
  ];

  return (
    <section id="downloads" className="py-24 md:py-32 bg-[#000000] border-t border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[11.5px] font-semibold uppercase tracking-wider text-[#D1E043] select-none mb-2 block">
            Get Started Free
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-[#FFFFFF] leading-tight mb-4">
            Download Bacham for your device
          </h2>
          <p className="text-base sm:text-lg text-[#A1A1A6] leading-relaxed">
            Install the native desktop application and companion Chrome extension. No account or credit card required.
          </p>
        </div>

        {/* Platform Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {platforms.map((p, idx) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08, duration: 0.4 }}
                className={`p-6 rounded-2xl border flex flex-col justify-between transition-all relative overflow-hidden group shadow-md ${
                  p.recommended
                    ? "bg-[#121214] border-2 border-[#D1E043]/40 shadow-xl"
                    : "bg-[#0D0D0E] border-white/10 hover:border-[#D1E043]/40"
                }`}
              >
                {p.recommended && (
                  <span className="absolute top-3.5 right-3.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#D1E043] text-[#1E1E1E]">
                    Recommended
                  </span>
                )}

                <div>
                  <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-[#FFFFFF] mb-4 group-hover:border-[#D1E043]/40 transition-colors shadow-2xs">
                    <Icon size={20} className={p.recommended ? "text-[#D1E043]" : "text-[#FFFFFF]"} />
                  </div>

                  <h3 className="font-serif text-lg font-normal text-[#FFFFFF] mb-1">{p.name}</h3>
                  <p className="text-xs text-[#8E8E93] mb-3">{p.format}</p>

                  <span className="inline-block text-[11px] font-medium text-[#D1D1D6] px-2.5 py-0.5 rounded-full bg-white/10 border border-white/10">
                    {p.badge}
                  </span>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10">
                  <a
                    href={p.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full py-2.5 px-4 rounded-full text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      p.recommended
                        ? "bg-[#D1E043] hover:bg-[#c4d436] text-[#1E1E1E] shadow-sm"
                        : "bg-white/10 hover:bg-white/15 text-[#FFFFFF] border border-white/15"
                    }`}
                  >
                    <Download size={13} strokeWidth={2.2} />
                    <span>Download</span>
                    <ExternalLink size={11} className="opacity-50" />
                  </a>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Verification Guarantee */}
        <div className="p-4 rounded-2xl bg-[#0D0D0E] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#D1D1D6] max-w-4xl mx-auto shadow-md">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#D1E043] shrink-0" />
            <span>Open source under MIT License · Signed binaries &amp; SHA-256 Checksums available</span>
          </div>
          <a
            href={releasesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#D1E043] hover:underline font-semibold flex items-center gap-1 shrink-0"
          >
            <span>View All Releases &amp; Notes</span>
            <ExternalLink size={12} />
          </a>
        </div>

      </div>
    </section>
  );
}
