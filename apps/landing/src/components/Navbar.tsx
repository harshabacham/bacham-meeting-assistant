"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Star, Download, Menu, X, ArrowRight, ShieldCheck } from "lucide-react";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Comparison", href: "#comparison" },
    { label: "Privacy", href: "#privacy" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-5 left-0 right-0 z-50 flex justify-center px-4 sm:px-6"
    >
      <div className="w-full max-w-5xl rounded-full glass-pill px-4 sm:px-5 py-2.5 flex items-center justify-between shadow-[0_16px_40px_rgba(0,0,0,0.5)] border border-white/[0.08]">
        
        {/* Left: Brand / Logo */}
        <Link href="/" className="flex items-center gap-2.5 pl-1 group cursor-pointer">
          <div className="w-7 h-7 rounded-lg overflow-hidden relative shadow-sm border border-white/10 group-hover:border-[#E2B774]/50 transition-colors">
            <Image src="/logo.png" alt="Bacham Logo" fill className="object-cover" priority />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-tight text-[15px] text-[#FAF9F5]">
              BACHAM
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/[0.05] text-[#8E9099] border border-white/[0.06]">
              <ShieldCheck size={11} className="text-[#E2B774]" />
              100% Local
            </span>
          </div>
        </Link>

        {/* Center: Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-[13.5px] font-medium text-[#8E9099]">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="hover:text-[#FAF9F5] transition-colors duration-150 py-1"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          {/* GitHub Star Button */}
          <a
            href="https://github.com/harshabacham/bacham-meeting-assistant"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-[12.5px] font-medium text-[#FAF9F5] border border-white/[0.08] transition-all hover:border-white/20"
          >
            <Star size={13} className="text-[#E2B774] fill-[#E2B774]" />
            <span>Star</span>
          </a>

          {/* Download CTA */}
          <Link
            href="#downloads"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#E2B774] hover:bg-[#d8a863] text-[#090A0C] text-[12.5px] font-bold shadow-[0_0_20px_rgba(226,183,116,0.25)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download size={13} strokeWidth={2.5} />
            <span>Download</span>
          </Link>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-full text-[#8E9099] hover:text-[#FAF9F5] hover:bg-white/[0.05] transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

      </div>

      {/* Mobile Dropdown Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="absolute top-18 left-4 right-4 p-5 rounded-2xl glass-card border border-white/10 shadow-2xl flex flex-col gap-3 md:hidden z-50"
          >
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl text-sm font-medium text-[#8E9099] hover:text-[#FAF9F5] hover:bg-white/[0.05] transition-colors flex items-center justify-between"
              >
                <span>{link.label}</span>
                <ArrowRight size={14} className="opacity-40" />
              </Link>
            ))}

            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
              <a
                href="https://github.com/harshabacham/bacham-meeting-assistant"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs font-semibold text-[#8E9099] hover:text-[#FAF9F5]"
              >
                <Star size={13} className="text-[#E2B774] fill-[#E2B774]" />
                <span>GitHub Repository</span>
              </a>
              <Link
                href="#downloads"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3.5 py-1.5 rounded-full bg-[#E2B774] text-[#090A0C] text-xs font-bold"
              >
                Get App
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
