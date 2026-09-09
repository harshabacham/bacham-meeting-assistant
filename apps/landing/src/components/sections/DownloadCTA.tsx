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
      badge: "CoreAudio Loopback",
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
      badge: "Google Meet & Tab Capture",
      href: releasesUrl,
      recommended: false,
    },
  ];

  return (
    <section id="downloads" className="py-24 md:py-32 border-t border-white/[0.06] bg-[#0A0B0E]/60 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#BAFF29] select-none mb-2">
            Get Started Free
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#F8F9FA] leading-tight mb-4">
            Download Bacham For Your Operating System
          </h2>
          <p className="text-base sm:text-lg text-white/70 leading-relaxed">
            Install the native desktop application and companion Chrome Extension. No registration or credit card required.
          </p>
        </div>

        {/* Platform Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {platforms.map((p, idx) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08, duration: 0.4 }}
                className={`p-6 rounded-2xl border flex flex-col justify-between transition-all relative overflow-hidden group ${
                  p.recommended
                    ? "bg-[#14161B] border-[#BAFF29]/40 shadow-[0_8px_30px_rgba(186,255,41,0.08)]"
                    : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/15"
                }`}
              >
                {p.recommended && (
                  <span className="absolute top-3 right-3 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#BAFF29]/20 text-[#BAFF29] border border-[#BAFF29]/30">
                    Recommended
                  </span>
                )}

                <div>
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#F8F9FA] mb-4 group-hover:border-[#BAFF29]/40 transition-colors">
                    <Icon size={20} className={p.recommended ? "text-[#BAFF29]" : "text-[#F8F9FA]"} />
                  </div>

                  <h3 className="text-base font-bold text-[#F8F9FA] mb-1">{p.name}</h3>
                  <p className="text-xs text-white/50 mb-3">{p.format}</p>

                  <span className="inline-block text-[10px] font-medium text-white/60 px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.05]">
                    {p.badge}
                  </span>
                </div>

                <div className="mt-6 pt-4 border-t border-white/[0.05]">
                  <a
                    href={p.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      p.recommended
                        ? "bg-[#BAFF29] hover:bg-[#a3e622] text-[#0A0A0C] shadow-sm"
                        : "bg-white/[0.05] hover:bg-white/[0.1] text-[#F8F9FA] border border-white/[0.08]"
                    }`}
                  >
                    <Download size={13} strokeWidth={2.5} />
                    <span>Download</span>
                    <ExternalLink size={11} className="opacity-50" />
                  </a>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Verification Guarantee */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/70 max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#BAFF29] shrink-0" />
            <span>Open Source under MIT License · SHA-256 Checksums available on GitHub</span>
          </div>
          <a
            href={releasesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#BAFF29] hover:underline font-bold flex items-center gap-1 shrink-0"
          >
            <span>View All Releases &amp; Changelog</span>
            <ExternalLink size={12} />
          </a>
        </div>

      </div>
    </section>
  );
}
