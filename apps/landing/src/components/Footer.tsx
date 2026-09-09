import Image from "next/image";
import Link from "next/link";
import { Star, ShieldCheck } from "lucide-react";

export default function Footer() {
  const releasesUrl = "https://github.com/harshabacham/bacham-meeting-assistant/releases";
  const repoUrl = "https://github.com/harshabacham/bacham-meeting-assistant";

  return (
    <footer className="border-t border-[#E8E6DE] bg-[#FAF9F5] py-16 relative z-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[#E8E6DE]">
          
          {/* Brand Info */}
          <div className="md:col-span-5 space-y-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-full bg-white border border-[#E8E6DE] flex items-center justify-center p-1 shadow-2xs">
                <Image src="/logo.png" alt="Bacham Logo" width={22} height={22} className="object-contain" />
              </div>
              <span className="font-serif text-2xl font-normal tracking-tight text-[#1E1E1E]">
                bacham
              </span>
            </Link>
            <p className="text-xs sm:text-[13.5px] text-[#666666] leading-relaxed max-w-sm">
              The AI notepad for back-to-back meetings. Notes, actions and memory. Without a meeting bot. Runs 100% locally on macOS and Windows.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs font-medium text-[#4F6322]">
              <ShieldCheck size={15} />
              <span>100% Private · Zero Telemetry · Open Source</span>
            </div>
          </div>

          {/* Product Links */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#1E1E1E]">
              Product
            </h4>
            <ul className="space-y-2 text-[13px] text-[#666666]">
              <li>
                <Link href="#features" className="hover:text-[#1E1E1E] transition-colors">
                  Core Features
                </Link>
              </li>
              <li>
                <Link href="#how-it-works" className="hover:text-[#1E1E1E] transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="#comparison" className="hover:text-[#1E1E1E] transition-colors">
                  Bacham vs. Cloud Bots
                </Link>
              </li>
              <li>
                <Link href="#downloads" className="hover:text-[#1E1E1E] transition-colors">
                  Downloads &amp; Releases
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources & Open Source */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#1E1E1E]">
              Community &amp; Code
            </h4>
            <ul className="space-y-2 text-[13px] text-[#666666]">
              <li>
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#1E1E1E] transition-colors flex items-center gap-1.5"
                >
                  <Star size={13} className="text-[#4F6322] fill-[#4F6322]" />
                  <span>GitHub Repository</span>
                </a>
              </li>
              <li>
                <a
                  href={releasesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#1E1E1E] transition-colors"
                >
                  Release Notes &amp; Installers
                </a>
              </li>
              <li>
                <Link href="#privacy" className="hover:text-[#1E1E1E] transition-colors">
                  Privacy Architecture
                </Link>
              </li>
              <li>
                <Link href="#faq" className="hover:text-[#1E1E1E] transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Strip */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8E8D88]">
          <p>© {new Date().getFullYear()} Bacham. Open source under the MIT License.</p>
          <div className="flex items-center gap-2">
            <span>Built for people in back-to-back meetings.</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
