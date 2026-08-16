"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import ProfileDropdown from "./kokonutui/profile-dropdown";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4"
    >
      <div
        className={`relative flex items-center justify-between w-full max-w-5xl px-4 py-2.5 rounded-full transition-all duration-500 ${
          scrolled
            ? "glass-nav shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
            : "bg-white/[0.04] backdrop-blur-xl border border-white/[0.07]"
        }`}
      >
        {/* Subtle inner glow on scroll */}
        {scrolled && (
          <div className="absolute inset-0 rounded-full pointer-events-none"
            style={{ boxShadow: "inset 0 0 0 1px rgba(166,255,0,0.06)" }}
          />
        )}

        {/* Left: Logo + Beta Badge */}
        <Link href="/" className="flex items-center gap-2.5 pl-2 group">
          <div className="relative">
            <Image src="/logo.png" alt="BACHAM Logo" width={26} height={26} className="rounded-lg" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#A6FF00] rounded-full animate-badge shadow-[0_0_6px_rgba(166,255,0,0.8)]" />
          </div>
          <span className="font-bold tracking-tight text-[15px] text-[#F0F0F0] group-hover:text-white transition-colors">BACHAM</span>
          <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-[#A6FF00] border border-[#A6FF00]/30 rounded-full bg-[#A6FF00]/5">
            BETA
          </span>
        </Link>

        {/* Middle: Links */}
        <nav className="hidden md:flex items-center gap-7 text-[13.5px] font-medium text-[#888888]">
          <Link href="#features" className="hover:text-[#F0F0F0] transition-colors duration-200">Features</Link>
          <Link href="#how-it-works" className="hover:text-[#F0F0F0] transition-colors duration-200">How It Works</Link>
          <Link href="#privacy" className="hover:text-[#F0F0F0] transition-colors duration-200">Privacy</Link>
          <Link href="#faq" className="hover:text-[#F0F0F0] transition-colors duration-200">FAQ</Link>
        </nav>

        {/* Right: CTA */}
        <div className="flex items-center gap-2">
          <Link
            href="#download"
            className="hidden md:inline-flex items-center px-5 py-2.5 text-[13px] font-semibold bg-[#A6FF00] text-[#050505] rounded-full hover:bg-[#BAFF29] transition-all duration-200 glow-lime-sm"
          >
            Download
          </Link>
          <div className="hidden md:block scale-75 origin-right">
            <ProfileDropdown />
          </div>
          <div className="md:hidden w-10" />
        </div>
      </div>
    </motion.header>
  );
}
