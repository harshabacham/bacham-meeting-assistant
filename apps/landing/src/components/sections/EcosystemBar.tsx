"use client";

import { motion } from "framer-motion";
import { SiGooglemeet, SiDiscord, SiLoom, SiOllama, SiDeepseek, SiAnthropic, SiGooglegemini } from "react-icons/si";
import { BiLogoMicrosoftTeams } from "react-icons/bi";
import { BsSlack } from "react-icons/bs";
import { RiOpenaiFill, RiGrokAiFill } from "react-icons/ri";

export function EcosystemBar() {
  return (
    <section className="py-24 sm:py-32 border-y border-white/[0.08] bg-[#09090B] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">

        {/* Section Heading matching reference typography */}
        <motion.h3
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="font-serif text-center text-base sm:text-lg md:text-xl text-[#A1A1A6] tracking-wide mb-16 sm:mb-20 font-normal"
        >
          Works seamlessly with your meeting apps &amp; AI models
        </motion.h3>

        {/* Row 1: Meeting Apps (6 columns, prominent & big) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-y-12 sm:gap-y-14 gap-x-6 sm:gap-x-10 items-center justify-items-center">
          
          {/* Google Meet */}
          <div className="flex items-center gap-3.5 sm:gap-4 text-white/80 hover:text-white transition-all duration-200 group cursor-default hover:scale-105 transform">
            <SiGooglemeet className="w-8 h-8 sm:w-10 sm:h-10 text-white/90 group-hover:text-white transition-colors shrink-0" />
            <span className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-white/95 group-hover:text-white whitespace-nowrap">
              Google Meet
            </span>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-3.5 sm:gap-4 text-white/80 hover:text-white transition-all duration-200 group cursor-default hover:scale-105 transform">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 fill-current text-white/90 group-hover:text-white transition-colors shrink-0" viewBox="0 0 24 24">
              <path d="M4 6.5A2.5 2.5 0 0 0 1.5 9v6A2.5 2.5 0 0 0 4 17.5h8.5A2.5 2.5 0 0 0 15 15V9a2.5 2.5 0 0 0-2.5-2.5H4zm13 4.148l4.417-3.155A1 1 0 0 1 23 8.272v7.456a1 1 0 0 1-1.583.78L17 13.352V10.648z" />
            </svg>
            <span className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-white/95 group-hover:text-white whitespace-nowrap">
              zoom
            </span>
          </div>

          {/* Microsoft Teams */}
          <div className="flex items-center gap-3.5 sm:gap-4 text-white/80 hover:text-white transition-all duration-200 group cursor-default hover:scale-105 transform">
            <BiLogoMicrosoftTeams className="w-8 h-8 sm:w-10 sm:h-10 text-white/90 group-hover:text-white transition-colors shrink-0" />
            <span className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-white/95 group-hover:text-white whitespace-nowrap">
              Teams
            </span>
          </div>

          {/* Slack */}
          <div className="flex items-center gap-3.5 sm:gap-4 text-white/80 hover:text-white transition-all duration-200 group cursor-default hover:scale-105 transform">
            <BsSlack className="w-8 h-8 sm:w-10 sm:h-10 text-white/90 group-hover:text-white transition-colors shrink-0" />
            <span className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-white/95 group-hover:text-white whitespace-nowrap">
              slack
            </span>
          </div>

          {/* Discord */}
          <div className="flex items-center gap-3.5 sm:gap-4 text-white/80 hover:text-white transition-all duration-200 group cursor-default hover:scale-105 transform">
            <SiDiscord className="w-8 h-8 sm:w-10 sm:h-10 text-white/90 group-hover:text-white transition-colors shrink-0" />
            <span className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-white/95 group-hover:text-white whitespace-nowrap">
              Discord
            </span>
          </div>

          {/* Loom */}
          <div className="flex items-center gap-3.5 sm:gap-4 text-white/80 hover:text-white transition-all duration-200 group cursor-default hover:scale-105 transform">
            <SiLoom className="w-8 h-8 sm:w-10 sm:h-10 text-white/90 group-hover:text-white transition-colors shrink-0" />
            <span className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-white/95 group-hover:text-white whitespace-nowrap">
              loom
            </span>
          </div>

        </div>

        {/* Subtle Horizontal Divider with Grid Plus (+) Markers matching reference */}
        <div className="relative w-full my-12 sm:my-16 hidden md:block">
          <div className="w-full border-t border-white/[0.08]" />
          <span className="absolute left-[16.666%] -translate-x-1/2 -top-2.5 text-xs text-white/25 font-mono select-none">
            +
          </span>
          <span className="absolute left-[33.333%] -translate-x-1/2 -top-2.5 text-xs text-white/25 font-mono select-none">
            +
          </span>
          <span className="absolute left-[50%] -translate-x-1/2 -top-2.5 text-xs text-white/25 font-mono select-none">
            +
          </span>
          <span className="absolute left-[66.666%] -translate-x-1/2 -top-2.5 text-xs text-white/25 font-mono select-none">
            +
          </span>
          <span className="absolute left-[83.333%] -translate-x-1/2 -top-2.5 text-xs text-white/25 font-mono select-none">
            +
          </span>
        </div>

        {/* Mobile/Tablet Simple Divider */}
        <div className="w-full border-t border-white/[0.08] my-10 md:hidden" />

        {/* Row 2: AI Models & Engines (6 columns, prominent & big) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-y-12 sm:gap-y-14 gap-x-6 sm:gap-x-10 items-center justify-items-center">
          
          {/* OpenAI */}
          <div className="flex items-center gap-3.5 sm:gap-4 text-white/80 hover:text-white transition-all duration-200 group cursor-default hover:scale-105 transform">
            <RiOpenaiFill className="w-8 h-8 sm:w-10 sm:h-10 text-white/90 group-hover:text-white transition-colors shrink-0" />
            <span className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-white/95 group-hover:text-white whitespace-nowrap">
              OpenAI
            </span>
          </div>

          {/* Anthropic */}
          <div className="flex items-center gap-3.5 sm:gap-4 text-white/80 hover:text-white transition-all duration-200 group cursor-default hover:scale-105 transform">
            <SiAnthropic className="w-8 h-8 sm:w-10 sm:h-10 text-white/90 group-hover:text-white transition-colors shrink-0" />
            <span className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-white/95 group-hover:text-white whitespace-nowrap">
              Anthropic
            </span>
          </div>

          {/* Gemini */}
          <div className="flex items-center gap-3.5 sm:gap-4 text-white/80 hover:text-white transition-all duration-200 group cursor-default hover:scale-105 transform">
            <SiGooglegemini className="w-8 h-8 sm:w-10 sm:h-10 text-white/90 group-hover:text-white transition-colors shrink-0" />
            <span className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-white/95 group-hover:text-white whitespace-nowrap">
              Gemini
            </span>
          </div>

          {/* DeepSeek */}
          <div className="flex items-center gap-3.5 sm:gap-4 text-white/80 hover:text-white transition-all duration-200 group cursor-default hover:scale-105 transform">
            <SiDeepseek className="w-8 h-8 sm:w-10 sm:h-10 text-white/90 group-hover:text-white transition-colors shrink-0" />
            <span className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-white/95 group-hover:text-white whitespace-nowrap">
              DeepSeek
            </span>
          </div>

          {/* Ollama */}
          <div className="flex items-center gap-3.5 sm:gap-4 text-white/80 hover:text-white transition-all duration-200 group cursor-default hover:scale-105 transform">
            <SiOllama className="w-8 h-8 sm:w-10 sm:h-10 text-white/90 group-hover:text-white transition-colors shrink-0" />
            <span className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-white/95 group-hover:text-white whitespace-nowrap">
              ollama
            </span>
          </div>

          {/* Grok (Official xAI Grok G-slash icon) */}
          <div className="flex items-center gap-3.5 sm:gap-4 text-white/80 hover:text-white transition-all duration-200 group cursor-default hover:scale-105 transform">
            <RiGrokAiFill className="w-8 h-8 sm:w-10 sm:h-10 text-white/90 group-hover:text-white transition-colors shrink-0" />
            <span className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-white/95 group-hover:text-white whitespace-nowrap">
              Grok
            </span>
          </div>

        </div>

      </div>
    </section>
  );
}
