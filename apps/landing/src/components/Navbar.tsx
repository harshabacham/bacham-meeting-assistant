"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, ArrowRight, Star } from "lucide-react";
import { SiGithub } from "react-icons/si";

// Windows 4-pane icon matching Granola's Windows download button
function WindowsIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M0 2.267l6.638-.909.006 6.064-6.644.045V2.267zm6.644 6.046l-.006 6.08-6.638-.91V8.313h6.644zm1.002-7.098L16 0v7.418l-8.354.077V1.215zm8.354 7.189V16l-8.354-1.215.006-6.42 8.348.039z" />
    </svg>
  );
}

// Apple icon for macOS users
function AppleIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 170 170" fill="currentColor" className={className} aria-hidden="true">
      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.7-7.91-12-14.62-5.78-8.99-10.43-19.55-13.93-31.67-3.51-12.13-5.26-23.77-5.26-34.92 0-14.33 3.52-26.31 10.57-35.94 7.05-9.64 16.03-14.54 26.96-14.71 4.58 0 9.77 1.25 15.58 3.75 5.81 2.5 9.78 3.8 11.9 3.91 1.74 0 5.85-1.42 12.33-4.26 6.48-2.83 12.12-4.13 16.92-3.9 12.63.66 22.75 5.37 30.34 14.15-10.89 6.64-16.19 15.82-15.9 27.53.33 9.36 3.99 17.18 10.99 23.47 7 6.29 15.34 9.87 25.02 10.74-2.17 6.74-4.89 13.78-8.16 21.11zM119.22 31.95c0-7.39 2.66-14.28 7.97-20.67 5.31-6.39 11.9-10.45 19.78-12.18.33 1.3.49 2.5.49 3.6 0 7.39-2.77 14.45-8.31 21.18-5.54 6.73-12.33 10.64-20.36 11.73-.22-1.3-.43-2.4-.43-3.66z" />
    </svg>
  );
}

import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const repoUrl = "https://github.com/harshabacham/bacham-meeting-assistant";

  if (pathname === "/launch") return null;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    if (typeof window !== "undefined" && navigator.userAgent) {
      setIsMac(navigator.userAgent.toLowerCase().includes("mac"));
    }

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Instructions", href: "#instructions" },
    { label: "v2.0 Roadmap", href: "#roadmap" },
    { label: "Teaser", href: "/launch" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none transition-all duration-300">
      <div className="w-full px-3 sm:px-6 md:px-8">
        <div
          className={`mx-auto pointer-events-auto transition-all duration-300 ease-out flex items-center justify-between ${
            scrolled
              ? "max-w-5xl mt-3 sm:mt-4 px-4 sm:px-6 h-14 rounded-full border border-white/10 bg-[#09090B]/85 backdrop-blur-xl shadow-2xl shadow-black/60"
              : "max-w-7xl mt-0 px-2 sm:px-4 h-16 sm:h-20 bg-transparent border-transparent"
          }`}
        >
          {/* Left: Brand Logo Wordmark */}
          <div className="flex items-center">
            <Link href="/" className="inline-flex items-center group cursor-pointer select-none">
              <Image
                src="/bacham-logo.png"
                alt="Bacham"
                width={105}
                height={28}
                className="w-auto h-[25px] sm:h-[27px] object-contain transition-transform group-hover:scale-105"
                priority
              />
            </Link>
          </div>

          {/* Center: Minimal Text Navigation (Granola style) */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-[13.5px] lg:text-[14px] font-normal text-[#A1A1AA] hover:text-[#FFFFFF] transition-colors duration-150 cursor-pointer"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right: Actions (GitHub Star + Granola-style OS Download Pill) */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* GitHub Star Pill Button */}
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] font-medium text-[#D1D1D6] hover:text-[#FFFFFF] bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group cursor-pointer"
              title="Star Bacham on GitHub"
            >
              <SiGithub size={13} className="text-white/75 group-hover:text-white" />
              <span>Star</span>
              <Star size={11} className="text-[#D1E043] fill-[#D1E043] group-hover:scale-125 transition-transform" />
            </a>

            {/* Granola-Style Download Button */}
            <Link
              href="#downloads"
              className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-[13px] sm:text-[13.5px] transition-all duration-200 cursor-pointer ${
                scrolled
                  ? "bg-[#D1E043] hover:bg-[#c2d13a] text-black font-semibold shadow-xs"
                  : "bg-white/10 hover:bg-white/15 text-white border border-white/15 font-medium"
              }`}
            >
              {isMac ? (
                <AppleIcon className="w-3.5 h-3.5" />
              ) : (
                <WindowsIcon className="w-3.5 h-3.5" />
              )}
              <span>Download</span>
            </Link>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-full text-[#D1D1D6] hover:text-[#FFFFFF] hover:bg-white/10 transition-colors pointer-events-auto"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu (Floating Card) */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="md:hidden max-w-lg mx-auto mt-2 bg-[#0D0D0E]/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-4 shadow-2xl flex flex-col gap-1.5 pointer-events-auto"
            >
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3.5 py-2.5 rounded-xl text-sm font-medium text-[#D1D1D6] hover:text-[#FFFFFF] hover:bg-white/10 transition-colors flex items-center justify-between"
                >
                  <span>{link.label}</span>
                  <ArrowRight size={14} className="text-[#8E8E93]" />
                </Link>
              ))}
              <div className="pt-3 mt-1 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-4 py-2 rounded-full bg-white/10 text-white text-xs font-semibold flex items-center justify-center gap-1.5 border border-white/15"
                >
                  <SiGithub size={13} />
                  <span>Star on GitHub</span>
                  <Star size={11} className="text-[#D1E043] fill-[#D1E043]" />
                </a>
                <Link
                  href="#downloads"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 rounded-full bg-[#D1E043] text-[#1E1E1E] text-xs font-bold text-center flex items-center justify-center gap-1.5"
                >
                  {isMac ? <AppleIcon className="w-3.5 h-3.5" /> : <WindowsIcon className="w-3.5 h-3.5" />}
                  <span>Download Free</span>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
