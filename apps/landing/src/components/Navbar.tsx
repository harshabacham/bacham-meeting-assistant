"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Download, Menu, X, ArrowRight } from "lucide-react";

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
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#000000]/85 backdrop-blur-md border-b border-white/10 transition-all">
      <div className="max-w-7xl mx-auto px-4 md:px-10 h-16 flex items-center justify-between">
        
        {/* Left: Brand Logo Wordmark */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center p-1 shadow-xs group-hover:border-[#D1E043] transition-colors">
              <Image src="/logo.png" alt="Bacham" width={22} height={22} className="object-contain" priority />
            </div>
            <span className="font-serif text-[22px] font-normal tracking-[-0.02em] text-[#FFFFFF]">
              bacham
            </span>
          </Link>
        </div>

        {/* Center: Minimal Text Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="px-3.5 py-1.5 rounded-full text-[14px] font-medium text-[#D1D1D6] hover:text-[#FFFFFF] hover:bg-white/10 transition-colors duration-150"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          {/* Subtle Download Pill Button */}
          <Link
            href="#downloads"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 text-[#FFFFFF] border border-white/15 text-[13.5px] font-medium transition-all shadow-2xs hover:shadow-xs"
          >
            <Download size={14} className="text-[#D1E043]" />
            <span>Download</span>
          </Link>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-full text-[#D1D1D6] hover:text-[#FFFFFF] hover:bg-white/10 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

      </div>

      {/* Mobile Dropdown Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-[#0D0D0E] border-b border-white/15 px-4 py-4 shadow-xl flex flex-col gap-1.5"
          >
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-xl text-sm font-medium text-[#D1D1D6] hover:text-[#FFFFFF] hover:bg-white/10 transition-colors flex items-center justify-between"
              >
                <span>{link.label}</span>
                <ArrowRight size={14} className="text-[#8E8E93]" />
              </Link>
            ))}
            <div className="pt-3 mt-1 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-[#8E8E93]">Zero Bots · 100% Local</span>
              <Link
                href="#downloads"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-1.5 rounded-full bg-[#D1E043] text-[#1E1E1E] text-xs font-semibold"
              >
                Download Free
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
