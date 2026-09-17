"use client";

import { motion } from "framer-motion";
import { Download, Laptop, Terminal, ExternalLink, ShieldCheck, Info } from "lucide-react";
import { SiApple } from "react-icons/si";
import { ChromeIcon } from "@/components/ui/ChromeIcon";
import {
  NoBotsSticker,
  LocalSsdSticker,
  StudyModeSticker,
  WashiTape,
  DoodleAnnotation,
} from "@/components/ui/CartoonStickers";

export default function DownloadCTA() {
  const releasesUrl = "https://github.com/harshabacham/bacham-meeting-assistant/releases";

  const platforms = [
    {
      name: "Windows 10 / 11",
      icon: Laptop,
      format: ".exe / .msi (64-bit)",
      badge: "Desktop Shortcut & Tray Autostart",
      href: "/downloads/bacham-setup.exe",
      download: "bacham-setup.exe",
      recommended: true,
      direct: true,
      altHref: "/downloads/bacham-setup.msi",
      altText: "MSI Installer (.msi)",
    },
    {
      name: "Chrome Extension",
      icon: ChromeIcon,
      format: "Packed CRX / ZIP Package",
      badge: "Google Meet & Tab Audio",
      href: "/downloads/bacham-extension.zip",
      download: "bacham-extension.zip",
      recommended: false,
      direct: true,
    },
    {
      name: "macOS",
      icon: SiApple,
      format: "Universal DMG (Apple Silicon & Intel)",
      badge: "CoreAudio Loopback Support",
      href: releasesUrl,
      recommended: false,
      direct: false,
      comingSoon: false,
    },
    {
      name: "Linux",
      icon: Terminal,
      format: ".deb / AppImage",
      badge: "ALSA & PulseAudio Support",
      href: releasesUrl,
      recommended: false,
      direct: false,
      comingSoon: true,
    },
  ];

  return (
    <section id="downloads" className="py-24 md:py-32 bg-[#000000] border-t border-white/10 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Header with Cartoon Stickers */}
        <div className="text-center max-w-3xl mx-auto mb-16 relative">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="text-[11.5px] font-black uppercase tracking-wider text-[#D1E043] select-none">
              Get Started Free
            </span>
            <LocalSsdSticker className="scale-85 -rotate-3" />
            <NoBotsSticker className="scale-85 rotate-3" />
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-[#FFFFFF] leading-tight mb-4">
            Download Bacham for your device
          </h2>
          <p className="text-base sm:text-lg text-[#A1A1A6] leading-relaxed max-w-2xl mx-auto">
            Dual-stream audio capture. Notes, timestamped actions, and 1-click study flashcards. Without an uninvited meeting bot. 100% on your SSD.
          </p>

          <DoodleAnnotation
            text="★ Click to grab the latest build!"
            direction="down"
            className="absolute -bottom-6 left-1/2 -translate-x-1/2 hidden md:inline-flex"
          />
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
                  <>
                    <WashiTape color="lime" className="absolute -top-2 left-6 rotate-[-2deg] z-20" />
                    <span className="absolute top-3.5 right-3.5 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#D1E043] text-[#1E1E1E]">
                      Recommended
                    </span>
                  </>
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
                  {p.direct ? (
                    <div>
                      <a
                        href={p.href}
                        download={p.download}
                        className={`w-full py-2.5 px-4 rounded-full text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          p.recommended
                            ? "bg-[#D1E043] hover:bg-[#c4d436] text-[#1E1E1E] shadow-sm"
                            : "bg-white/10 hover:bg-white/15 text-[#FFFFFF] border border-white/15"
                        }`}
                      >
                        <Download size={13} strokeWidth={2.4} />
                        <span>Download {p.name.includes("Windows") ? "EXE" : "ZIP"}</span>
                      </a>
                      {p.altHref && (
                        <div className="mt-2 text-center">
                          <a
                            href={p.altHref}
                            download="bacham-setup.msi"
                            className="text-[11px] text-[#A1A1A6] hover:text-[#D1E043] transition-colors"
                          >
                            or download {p.altText}
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full py-2.5 px-4 rounded-full text-xs font-medium flex items-center justify-center gap-1.5 bg-white/5 text-[#8E8E93] border border-white/5 cursor-default select-none">
                      <span>Coming Soon</span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Windows SmartScreen Notice */}
        <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-[#121214] border border-amber-500/30 max-w-4xl mx-auto shadow-lg relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400 shadow-inner">
              <Info size={18} />
            </div>
            <div className="flex-1 text-xs sm:text-[13px] text-[#A1A1A6] leading-relaxed">
              <span className="font-bold text-white block sm:inline mr-1.5">Windows SmartScreen Note:</span>
              If Windows displays <span className="text-white font-medium">&quot;Windows protected your PC&quot;</span> on first launch, click <span className="text-[#D1E043] font-bold underline decoration-dotted">&quot;More info&quot;</span> and then select <span className="text-[#D1E043] font-bold">&quot;Run anyway&quot;</span>. This is standard for newly released open-source software until reputation is established.
            </div>
          </div>
        </div>

        {/* Verification Guarantee */}
        <div className="p-4 rounded-2xl bg-[#0D0D0E] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#D1D1D6] max-w-4xl mx-auto shadow-md relative">
          <WashiTape color="cyan" className="absolute -top-2 left-10 rotate-[-2deg] z-20" />
          
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#D1E043] shrink-0" />
            <span>Open source under MIT License · Signed binaries &amp; SHA-256 Checksums available</span>
          </div>
          <a
            href={releasesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#D1E043] hover:underline font-bold flex items-center gap-1 shrink-0"
          >
            <span>View All Releases &amp; Notes</span>
            <ExternalLink size={12} />
          </a>
        </div>

      </div>
    </section>
  );
}
