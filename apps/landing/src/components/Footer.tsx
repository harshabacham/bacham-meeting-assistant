import Image from "next/image";
import Link from "next/link";
import { Star, ShieldCheck } from "lucide-react";

export default function Footer() {
  const releasesUrl = "https://github.com/harshabacham/bacham-meeting-assistant/releases";
  const repoUrl = "https://github.com/harshabacham/bacham-meeting-assistant";

  return (
    <footer className="border-t border-white/[0.06] bg-[#07080A] py-14 relative z-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-white/[0.06]">
          
          {/* Brand Info */}
          <div className="md:col-span-5 space-y-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-7 h-7 rounded-lg overflow-hidden relative shadow-sm border border-white/10 group-hover:border-[#BAFF29]/50 transition-colors">
                <Image src="/logo.png" alt="Bacham Logo" fill className="object-cover" />
              </div>
              <span className="font-bold tracking-tight text-lg text-[#F8F9FA]">
                BACHAM
              </span>
            </Link>
            <p className="text-xs sm:text-[13px] text-white/70 leading-relaxed max-w-sm">
              The 100% local AI meeting wingman. Invisible on-device ingestion, automated executive briefs, and slide memory without cloud privacy risk.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-white/70">
              <ShieldCheck size={14} className="text-[#BAFF29]" />
              <span>100% Private · Zero Telemetry · Open Source</span>
            </div>
          </div>

          {/* Product Links */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#F8F9FA]">
              Product
            </h4>
            <ul className="space-y-2 text-xs text-white/70">
              <li>
                <Link href="#features" className="hover:text-[#F8F9FA] transition-colors">
                  Core Features
                </Link>
              </li>
              <li>
                <Link href="#how-it-works" className="hover:text-[#F8F9FA] transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="#comparison" className="hover:text-[#F8F9FA] transition-colors">
                  Bacham vs. Cloud Bots
                </Link>
              </li>
              <li>
                <Link href="#downloads" className="hover:text-[#F8F9FA] transition-colors">
                  Downloads &amp; Releases
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources & Open Source */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#F8F9FA]">
              Community &amp; Code
            </h4>
            <ul className="space-y-2 text-xs text-white/70">
              <li>
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#F8F9FA] transition-colors flex items-center gap-1.5"
                >
                  <Star size={13} className="text-[#BAFF29] fill-[#BAFF29]" />
                  <span>GitHub Repository</span>
                </a>
              </li>
              <li>
                <a
                  href={releasesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#F8F9FA] transition-colors"
                >
                  Release Notes &amp; Installers
                </a>
              </li>
              <li>
                <Link href="#privacy" className="hover:text-[#F8F9FA] transition-colors">
                  Privacy Architecture
                </Link>
              </li>
              <li>
                <Link href="#faq" className="hover:text-[#F8F9FA] transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Strip */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
          <p>© {new Date().getFullYear()} Bacham. Open source under the MIT License.</p>
          <div className="flex items-center gap-2">
            <span>Built for high-stakes executive clarity.</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
