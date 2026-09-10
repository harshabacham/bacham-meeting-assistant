import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import LaunchTeaserPlayer from "@/components/launch/LaunchTeaserPlayer";
import { SiGithub } from "react-icons/si";
import { Star, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Bacham — Official v1.0.0 Launch Teaser",
  description:
    "Watch the official launch teaser for Bacham. The AI notepad for back-to-back meetings & lectures with dual-stream loopback audio capture. 100% on your SSD.",
};

export default function LaunchPage() {
  return (
    <main className="min-h-screen bg-[#050507] text-[#FFFFFF] font-sans selection:bg-[#D1E043]/30 selection:text-[#FFFFFF] flex flex-col justify-between">
      {/* Top Theater Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-30">
        <Link href="/" className="inline-flex items-center gap-2 group cursor-pointer">
          <ArrowLeft size={16} className="text-[#A1A1A6] group-hover:-translate-x-1 transition-transform" />
          <Image
            src="/bacham-logo.png"
            alt="Bacham"
            width={100}
            height={26}
            className="w-auto h-6 object-contain"
            priority
          />
        </Link>

        <div className="flex items-center gap-3">
          <a
            href="https://github.com/harshabacham/bacham-meeting-assistant"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-xs text-white border border-white/10 transition-colors"
          >
            <SiGithub size={13} />
            <span>Star on GitHub</span>
            <Star size={12} className="text-[#D1E043] fill-[#D1E043]" />
          </a>

          <Link
            href="/#downloads"
            className="px-4 py-1.5 rounded-full bg-[#D1E043] hover:bg-[#c4d436] text-[#1E1E1E] font-bold text-xs transition-colors"
          >
            Download v1.0.0
          </Link>
        </div>
      </header>

      {/* Main Video Cinema Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-4">
        <div className="text-center max-w-xl mx-auto mb-6">
          <span className="inline-block px-3 py-1 rounded-full bg-[#D1E043]/15 border border-[#D1E043]/30 text-[#D1E043] font-mono text-[11px] uppercase tracking-widest mb-3">
            WORLD PREMIERE TEASER
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-normal tracking-tight text-white mb-2">
            The Launch of Bacham.
          </h1>
          <p className="text-sm sm:text-base text-[#A1A1A6]">
            Every word captured. Every action tracked. Stays 100% on your SSD.
          </p>
        </div>

        {/* Video Player Component */}
        <LaunchTeaserPlayer standalone={true} />
      </div>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-[#71717A] border-t border-white/5">
        <p>© 2026 Bacham. 100% Private · Zero Telemetry · Open Source under MIT License.</p>
      </footer>
    </main>
  );
}
