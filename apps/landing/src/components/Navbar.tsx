"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import ProfileDropdown from "./kokonutui/profile-dropdown";

export default function Navbar() {
  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4"
    >
      <div className="bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-black/5 rounded-full px-4 py-2.5 flex items-center justify-between w-full max-w-5xl">
        
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2 pl-2 text-[#111111] hover:opacity-80 transition-opacity">
          <Image src="/logo.png" alt="BACHAM Logo" width={24} height={24} className="rounded-md" />
          <span className="font-bold tracking-tight text-[15px]">BACHAM</span>
        </Link>

        {/* Middle: Links */}
        <nav className="hidden md:flex items-center gap-8 text-[14px] font-medium text-[#666666]">
          <Link href="#features" className="hover:text-[#111111] transition-colors">Features</Link>
          <Link href="#how-it-works" className="hover:text-[#111111] transition-colors">How It Works</Link>
          <Link href="#download" className="hover:text-[#111111] transition-colors">Download</Link>
          <Link href="#docs" className="hover:text-[#111111] transition-colors">Docs</Link>
        </nav>

        {/* Right: CTA Button */}
        <div className="flex items-center gap-2">
          <Link 
            href="#download" 
            className="hidden md:inline-flex px-6 py-2.5 text-[14px] font-semibold bg-[#111111] text-white rounded-full hover:bg-black transition-colors shadow-sm"
          >
            Get Started
          </Link>
          <div className="hidden md:block scale-75 origin-right">
            <ProfileDropdown />
          </div>
          {/* Mobile menu fallback spacing if needed */}
          <div className="md:hidden w-10"></div>
        </div>

      </div>
    </motion.header>
  );
}
