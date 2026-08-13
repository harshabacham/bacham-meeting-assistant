"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Download, AppWindow, CirclePlay } from "lucide-react";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-10">
      {/* Background Glow */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#A6FF00]/5 rounded-full blur-[120px] pointer-events-none" />

      <ContainerScroll
        titleComponent={
          <>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter text-[#F5F5F5] max-w-5xl mx-auto mb-6"
            >
              The Ultimate Local AI <br/> Meeting Wingman.
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-lg md:text-2xl text-[#A0A0A0] max-w-2xl mx-auto mb-12"
            >
              Capture meetings instantly with the Chrome Extension. Get real-time insights with the Universal AI Engine powered by Ollama, OpenAI, or Anthropic. All 100% local.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center mb-10"
            >
              <a href="/downloads/bacham-desktop.dmg" download className="w-full sm:w-auto px-8 py-4 bg-[#BAFF29] text-[#0A0A0C] font-semibold rounded-full flex items-center justify-center gap-2 hover:bg-[#c9ff4d] transition-colors shadow-lime">
                <Download size={20} />
                Download Desktop
              </a>
              <a href="/downloads/bacham-extension.zip" download className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 text-[#F5F5F5] font-semibold rounded-full flex items-center justify-center gap-2 hover:bg-white/10 transition-colors">
                <AppWindow size={20} />
                Chrome Extension
              </a>
              <button className="w-full sm:w-auto px-8 py-4 bg-transparent text-[#A0A0A0] font-semibold rounded-full flex items-center justify-center gap-2 hover:text-[#F5F5F5] transition-colors">
                <CirclePlay size={20} />
                Watch Demo
              </button>
            </motion.div>
          </>
        }
      >
        <Image 
          src="/mockups/hero_dashboard.png" 
          alt="BACHAM Desktop Interface" 
          fill 
          className="object-cover"
          priority
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      </ContainerScroll>
    </section>
  );
}
