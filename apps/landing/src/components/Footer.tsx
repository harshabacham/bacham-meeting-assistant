import Image from "next/image";
import Link from "next/link";
import { Code2, MessageCircle, Heart, Sparkles } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-transparent py-16 mt-20 relative z-10">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
          
          {/* Logo & Tagline */}
          <div className="flex flex-col gap-2">
            <Link href="/" className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-[#F0F0F0] group">
              <Image src="/logo.png" alt="BACHAM Logo" width={28} height={28} className="rounded-lg" />
              <span>BACHAM</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-[#A6FF00]/30 bg-[#A6FF00]/10 text-[#A6FF00]">
                v1.0-beta
              </span>
            </Link>
            <p className="text-xs text-[#777777] max-w-sm">
              Your autonomous offline intelligence wingman for lectures, videos, and meetings.
            </p>
          </div>
          
          {/* Navigation Links */}
          <div className="flex flex-wrap items-center gap-8 text-xs font-medium text-[#888888]">
            <Link href="#features" className="hover:text-[#F0F0F0] transition-colors">Features</Link>
            <Link href="#how-it-works" className="hover:text-[#F0F0F0] transition-colors">How It Works</Link>
            <Link href="#privacy" className="hover:text-[#F0F0F0] transition-colors">Privacy</Link>
            <Link href="#faq" className="hover:text-[#F0F0F0] transition-colors">FAQ</Link>
            <Link href="#download" className="text-[#A6FF00] hover:underline">Download App</Link>
          </div>
          
          {/* Social Icons */}
          <div className="flex items-center gap-3 text-[#777777]">
            <a 
              href="https://github.com/bacham-app" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-9 h-9 rounded-xl glass-card flex items-center justify-center hover:text-[#F0F0F0] hover:border-white/20 transition-all"
            >
              <Code2 size={16} />
            </a>
            <a 
              href="https://discord.gg" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-9 h-9 rounded-xl glass-card flex items-center justify-center hover:text-[#F0F0F0] hover:border-white/20 transition-all"
            >
              <MessageCircle size={16} />
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/[0.05] flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-[#555555]">
          <div>
            &copy; {new Date().getFullYear()} BACHAM. Built with privacy and flow.
          </div>
          <div className="flex items-center gap-1">
            <span>Crafted for deep work & active retention</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
