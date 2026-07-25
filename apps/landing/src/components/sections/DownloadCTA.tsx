"use client";

import { motion } from "framer-motion";
import { Download, AppWindow, Code2, BookOpen } from "lucide-react";

export default function DownloadCTA() {
  return (
    <section id="download" className="py-32 border-t border-white/5 bg-transparent">
      <div className="container mx-auto px-6 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-6xl font-serif tracking-tight text-[#F5F5F5] mb-8">
            Ready to upgrade your study sessions?
          </h2>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <a href="/downloads/bacham-desktop.dmg" download className="w-full sm:w-auto px-8 py-4 bg-[#BAFF29] text-[#0A0A0C] font-semibold rounded-full flex items-center justify-center gap-2 hover:bg-[#c9ff4d] transition-colors shadow-lime">
              <Download size={20} />
              Download Desktop
            </a>
            <a href="/downloads/bacham-extension.zip" download className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 text-[#F5F5F5] font-semibold rounded-full flex items-center justify-center gap-2 hover:bg-white/10 transition-colors">
              <AppWindow size={20} />
              Chrome Extension
            </a>
          </div>

          <div className="flex items-center justify-center gap-6 text-[#A0A0A0] text-sm mb-16">
            <a href="#github" className="flex items-center gap-2 hover:text-[#F5F5F5] transition-colors">
              <Code2 size={16} /> GitHub
            </a>
            <a href="#docs" className="flex items-center gap-2 hover:text-[#F5F5F5] transition-colors">
              <BookOpen size={16} /> Documentation
            </a>
          </div>

          <p className="text-xs text-white/30 max-w-sm mx-auto uppercase tracking-wider">
            System Requirements: macOS 13.0 or later.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
