import Image from "next/image";
import Link from "next/link";
import { Star, ShieldCheck } from "lucide-react";

export default function Footer() {
  const releasesUrl = "https://github.com/harshabacham/bacham-meeting-assistant/releases";
  const repoUrl = "https://github.com/harshabacham/bacham-meeting-assistant";

  return (
    <footer className="border-t border-white/10 bg-[#000000] py-16 relative z-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-white/10">
          
          {/* Brand Info */}
          <div className="md:col-span-5 space-y-3">
            <Link href="/" className="inline-flex items-center group cursor-pointer select-none">
              <Image
                src="/bacham-logo.png"
                alt="Bacham Logo"
                width={120}
                height={32}
                className="w-auto h-8 object-contain transition-transform group-hover:scale-105"
              />
            </Link>
            <p className="text-xs sm:text-[13.5px] text-[#A1A1A6] leading-relaxed max-w-sm">
              The AI notepad for back-to-back meetings &amp; lectures. Dual-stream audio capture. Notes, timestamped actions, and 1-click study flashcards. Without an uninvited meeting bot. 100% on your SSD.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs font-medium text-[#D1E043]">
              <ShieldCheck size={15} />
              <span>100% Private · Zero Telemetry · Open Source</span>
            </div>
          </div>

          {/* Product Links */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#FFFFFF]">
              Product
            </h4>
            <ul className="space-y-2 text-[13px] text-[#A1A1A6]">
              <li>
                <Link href="#features" className="hover:text-[#FFFFFF] transition-colors">
                  Core Features
                </Link>
              </li>
              <li>
                <Link href="#how-it-works" className="hover:text-[#FFFFFF] transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="#instructions" className="hover:text-[#FFFFFF] transition-colors">
                  Instructions &amp; Setup
                </Link>
              </li>
              <li>
                <Link href="#roadmap" className="hover:text-[#FFFFFF] transition-colors flex items-center gap-1.5">
                  <span>v2.0.0 Roadmap</span>
                  <span className="text-[10px] font-mono text-[#D1E043] bg-[#D1E043]/15 px-1.5 py-0.2 rounded">NEW</span>
                </Link>
              </li>
              <li>
                <Link href="#comparison" className="hover:text-[#FFFFFF] transition-colors">
                  Bacham vs. Cloud Bots
                </Link>
              </li>
              <li>
                <Link href="#downloads" className="hover:text-[#FFFFFF] transition-colors">
                  Downloads &amp; Releases
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources & Open Source */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#FFFFFF]">
              Community &amp; Code
            </h4>
            <ul className="space-y-2 text-[13px] text-[#A1A1A6]">
              <li>
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-[#FFFFFF] border border-white/10 hover:border-[#D1E043]/40 text-xs font-semibold transition-all group my-1"
                >
                  <Star size={13} className="text-[#D1E043] fill-[#D1E043] group-hover:scale-125 transition-transform" />
                  <span>Star on GitHub</span>
                </a>
              </li>
              <li>
                <a
                  href={releasesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#FFFFFF] transition-colors"
                >
                  Release Notes &amp; Installers
                </a>
              </li>
              <li>
                <Link href="#privacy" className="hover:text-[#FFFFFF] transition-colors">
                  Privacy Architecture
                </Link>
              </li>
              <li>
                <Link href="#faq" className="hover:text-[#FFFFFF] transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Strip */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#71717A]">
          <p>© {new Date().getFullYear()} Bacham. Open source under the MIT License.</p>
          <div className="flex items-center gap-2">
            <span>Built for people in back-to-back meetings &amp; lectures.</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
