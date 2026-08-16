"use client";

import { motion } from "framer-motion";
import { Download, AppWindow, Code2, BookOpen, Sparkles, CheckCircle2, Apple, Laptop } from "lucide-react";

export default function DownloadCTA() {
  return (
    <section id="download" className="py-32 border-t border-white/[0.06] bg-transparent relative overflow-hidden">
      {/* Massive ambient neon glow */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] rounded-full blur-[140px] pointer-events-none opacity-20"
        style={{ background: "radial-gradient(circle, rgba(166,255,0,0.4) 0%, rgba(155,94,255,0.2) 50%, transparent 70%)" }}
      />

      <div className="container mx-auto px-6 text-center max-w-5xl relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#A6FF00]/20 bg-[#A6FF00]/5 text-xs font-semibold tracking-widest text-[#A6FF00] uppercase mb-6">
            <Sparkles size={12} />
            Start Learning Faster
          </div>

          <h2 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-[#F0F0F0] mb-6 leading-tight">
            Ready to upgrade your<br />study & meeting workflow?
          </h2>

          <p className="text-lg md:text-xl text-[#888888] max-w-2xl mx-auto mb-10 leading-relaxed">
            Free and open during our early beta release. No sign-up required. Download and run 100% offline in minutes.
          </p>
          
          {/* Main Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <a 
              href="/downloads/bacham-desktop.dmg" 
              download 
              id="cta-download-desktop"
              className="w-full sm:w-auto px-9 py-4 bg-[#A6FF00] text-[#050505] font-bold rounded-full flex items-center justify-center gap-2.5 hover:bg-[#BAFF29] transition-all duration-200 glow-lime text-base"
            >
              <Download size={19} />
              Download for macOS & Windows
            </a>
            <a 
              href="/downloads/bacham-extension.zip" 
              download 
              id="cta-download-extension"
              className="w-full sm:w-auto px-9 py-4 glass-card rounded-full flex items-center justify-center gap-2.5 hover:border-white/20 hover:bg-white/[0.05] transition-all duration-200 text-[#E0E0E0] font-semibold text-base"
            >
              <AppWindow size={19} />
              Chrome Extension (.zip)
            </a>
          </div>

          {/* Social Proof and Secondary Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-[#777777] text-sm mb-12">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#A6FF00]" />
              <span>Zero Cloud Dependency</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#A6FF00]" />
              <span>Ollama & Local LLM Support</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#A6FF00]" />
              <span>MIT License</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 text-[#666666] text-xs">
            <a href="https://github.com/bacham-app" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-[#F0F0F0] transition-colors">
              <Code2 size={14} /> GitHub Repository
            </a>
            <span>•</span>
            <a href="#docs" className="flex items-center gap-1.5 hover:text-[#F0F0F0] transition-colors">
              <BookOpen size={14} /> Documentation
            </a>
          </div>

        </motion.div>
      </div>
    </section>
  );
}
