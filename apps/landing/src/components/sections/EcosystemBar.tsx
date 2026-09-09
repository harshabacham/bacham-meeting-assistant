"use client";

import { motion } from "framer-motion";
import { SiGooglemeet, SiDiscord, SiLoom, SiOllama, SiDeepseek, SiAnthropic, SiGooglegemini } from "react-icons/si";
import { BiLogoMicrosoftTeams } from "react-icons/bi";
import { BsSlack } from "react-icons/bs";
import { RiOpenaiFill, RiGrokAiFill } from "react-icons/ri";

export function EcosystemBar() {
  return (
    <section className="py-20 sm:py-28 border-y border-white/[0.08] bg-[#09090B] relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-12">

        {/* Section Heading matching reference typography */}
        <motion.h3
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="font-serif text-center text-sm sm:text-base md:text-lg text-[#A1A1A6] tracking-wide mb-14 sm:mb-16 font-normal"
        >
          Works seamlessly with your meeting apps &amp; AI models
        </motion.h3>

        {/* Row 1: Meeting Apps (6 columns, small, elegant & spacious) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-y-10 sm:gap-y-12 md:gap-y-14 gap-x-6 sm:gap-x-10 md:gap-x-12 lg:gap-x-16 items-center justify-items-center">
          
          {/* Google Meet */}
          <div className="flex items-center gap-2 sm:gap-2.5 text-white/70 hover:text-white transition-all duration-200 group cursor-default">
            <SiGooglemeet className="w-5 h-5 sm:w-6 sm:h-6 text-white/85 group-hover:text-white transition-colors shrink-0" />
            <span className="text-sm sm:text-base font-semibold tracking-normal text-white/85 group-hover:text-white whitespace-nowrap">
              Google Meet
            </span>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-2 sm:gap-2.5 text-white/70 hover:text-white transition-all duration-200 group cursor-default">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 fill-current text-white/85 group-hover:text-white transition-colors shrink-0" viewBox="0 0 24 24">
              <path d="M4 6.5A2.5 2.5 0 0 0 1.5 9v6A2.5 2.5 0 0 0 4 17.5h8.5A2.5 2.5 0 0 0 15 15V9a2.5 2.5 0 0 0-2.5-2.5H4zm13 4.148l4.417-3.155A1 1 0 0 1 23 8.272v7.456a1 1 0 0 1-1.583.78L17 13.352V10.648z" />
            </svg>
            <span className="text-sm sm:text-base font-semibold tracking-normal text-white/85 group-hover:text-white whitespace-nowrap">
              zoom
            </span>
          </div>

          {/* Microsoft Teams */}
          <div className="flex items-center gap-2 sm:gap-2.5 text-white/70 hover:text-white transition-all duration-200 group cursor-default">
            <BiLogoMicrosoftTeams className="w-5 h-5 sm:w-6 sm:h-6 text-white/85 group-hover:text-white transition-colors shrink-0" />
            <span className="text-sm sm:text-base font-semibold tracking-normal text-white/85 group-hover:text-white whitespace-nowrap">
              Teams
            </span>
          </div>

          {/* Slack */}
          <div className="flex items-center gap-2 sm:gap-2.5 text-white/70 hover:text-white transition-all duration-200 group cursor-default">
            <BsSlack className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5 text-white/85 group-hover:text-white transition-colors shrink-0" />
            <span className="text-sm sm:text-base font-semibold tracking-normal text-white/85 group-hover:text-white whitespace-nowrap">
              slack
            </span>
          </div>

          {/* Discord */}
          <div className="flex items-center gap-2 sm:gap-2.5 text-white/70 hover:text-white transition-all duration-200 group cursor-default">
            <SiDiscord className="w-5 h-5 sm:w-6 sm:h-6 text-white/85 group-hover:text-white transition-colors shrink-0" />
            <span className="text-sm sm:text-base font-semibold tracking-normal text-white/85 group-hover:text-white whitespace-nowrap">
              Discord
            </span>
          </div>

          {/* Loom */}
          <div className="flex items-center gap-2 sm:gap-2.5 text-white/70 hover:text-white transition-all duration-200 group cursor-default">
            <SiLoom className="w-5 h-5 sm:w-6 sm:h-6 text-white/85 group-hover:text-white transition-colors shrink-0" />
            <span className="text-sm sm:text-base font-semibold tracking-normal text-white/85 group-hover:text-white whitespace-nowrap">
              loom
            </span>
          </div>

        </div>

        {/* Subtle Horizontal Divider with Grid Plus (+) Markers matching reference */}
        <div className="relative w-full my-12 sm:my-14 hidden md:block">
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
        <div className="w-full border-t border-white/[0.08] my-8 md:hidden" />

        {/* Row 2: AI Models & Engines (6 columns, small, elegant & spacious) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-y-10 sm:gap-y-12 md:gap-y-14 gap-x-6 sm:gap-x-10 md:gap-x-12 lg:gap-x-16 items-center justify-items-center">
          
          {/* OpenAI */}
          <div className="flex items-center gap-2 sm:gap-2.5 text-white/70 hover:text-white transition-all duration-200 group cursor-default">
            <RiOpenaiFill className="w-5 h-5 sm:w-6 sm:h-6 text-white/85 group-hover:text-white transition-colors shrink-0" />
            <span className="text-sm sm:text-base font-semibold tracking-normal text-white/85 group-hover:text-white whitespace-nowrap">
              OpenAI
            </span>
          </div>

          {/* Anthropic */}
          <div className="flex items-center gap-2 sm:gap-2.5 text-white/70 hover:text-white transition-all duration-200 group cursor-default">
            <SiAnthropic className="w-5 h-5 sm:w-6 sm:h-6 text-white/85 group-hover:text-white transition-colors shrink-0" />
            <span className="text-sm sm:text-base font-semibold tracking-normal text-white/85 group-hover:text-white whitespace-nowrap">
              Anthropic
            </span>
          </div>

          {/* Gemini */}
          <div className="flex items-center gap-2 sm:gap-2.5 text-white/70 hover:text-white transition-all duration-200 group cursor-default">
            <SiGooglegemini className="w-5 h-5 sm:w-6 sm:h-6 text-white/85 group-hover:text-white transition-colors shrink-0" />
            <span className="text-sm sm:text-base font-semibold tracking-normal text-white/85 group-hover:text-white whitespace-nowrap">
              Gemini
            </span>
          </div>

          {/* DeepSeek */}
          <div className="flex items-center gap-2 sm:gap-2.5 text-white/70 hover:text-white transition-all duration-200 group cursor-default">
            <SiDeepseek className="w-5 h-5 sm:w-6 sm:h-6 text-white/85 group-hover:text-white transition-colors shrink-0" />
            <span className="text-sm sm:text-base font-semibold tracking-normal text-white/85 group-hover:text-white whitespace-nowrap">
              DeepSeek
            </span>
          </div>

          {/* Ollama */}
          <div className="flex items-center gap-2 sm:gap-2.5 text-white/70 hover:text-white transition-all duration-200 group cursor-default">
            <SiOllama className="w-5 h-5 sm:w-6 sm:h-6 text-white/85 group-hover:text-white transition-colors shrink-0" />
            <span className="text-sm sm:text-base font-semibold tracking-normal text-white/85 group-hover:text-white whitespace-nowrap">
              ollama
            </span>
          </div>

          {/* Grok */}
          <div className="flex items-center gap-2 sm:gap-2.5 text-white/70 hover:text-white transition-all duration-200 group cursor-default">
            <RiGrokAiFill className="w-5 h-5 sm:w-6 sm:h-6 text-white/85 group-hover:text-white transition-colors shrink-0" />
            <span className="text-sm sm:text-base font-semibold tracking-normal text-white/85 group-hover:text-white whitespace-nowrap">
              Grok
            </span>
          </div>

        </div>

      </div>
    </section>
  );
}
