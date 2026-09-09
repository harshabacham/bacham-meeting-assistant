"use client";

import { motion } from "framer-motion";
import { BotOff, ShieldCheck, CheckCheck } from "lucide-react";

export default function NotepadIntro() {
  const highlights = [
    {
      icon: (
        <div className="w-11 h-11 rounded-xl bg-[#FAF9F5] border border-[#E8E6DE] flex items-center justify-center text-[#4F6322] shadow-2xs">
          <BotOff size={22} strokeWidth={1.8} />
        </div>
      ),
      text: (
        <>
          Uses your computer audio, <strong className="font-semibold text-[#1E1E1E]">so doesn’t invite a bot</strong>
        </>
      ),
    },
    {
      icon: (
        <div className="w-11 h-11 rounded-xl bg-[#FAF9F5] border border-[#E8E6DE] flex items-center justify-center text-[#4F6322] shadow-2xs">
          <ShieldCheck size={22} strokeWidth={1.8} />
        </div>
      ),
      text: (
        <>
          <strong className="font-semibold text-[#1E1E1E]">Private by default</strong>, 100% on-device Whisper &amp; Ollama
        </>
      ),
    },
    {
      icon: (
        <div className="w-11 h-11 rounded-xl bg-[#FAF9F5] border border-[#E8E6DE] flex items-center justify-center text-[#4F6322] shadow-2xs">
          <CheckCheck size={22} strokeWidth={1.8} />
        </div>
      ),
      text: (
        <>
          Works with <strong className="font-semibold text-[#1E1E1E]">Zoom</strong>,{" "}
          <strong className="font-semibold text-[#1E1E1E]">Google Meet</strong>,{" "}
          <strong className="font-semibold text-[#1E1E1E]">Teams</strong> and every other meeting app.
        </>
      ),
    },
  ];

  return (
    <section className="relative py-20 border-y border-[#E8E6DE] bg-[#FCFBF9] overflow-hidden">
      {/* Subtle Ruled Notebook Horizontal Lines Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          backgroundImage: "repeating-linear-gradient(to bottom, #E8E6DE 0px, #E8E6DE 1px, transparent 1px, transparent 4.5rem)",
          maskImage: "linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 md:px-10 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[45%_55%] gap-10 items-center">
          
          {/* Section Headline */}
          <div>
            <span className="text-[12px] font-semibold text-[#4F6322] uppercase tracking-wider mb-3 block">
              The Notepad Philosophy
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl font-normal tracking-tight text-[#1E1E1E] leading-[1.08]">
              Effortless notes, enhanced instantly.
            </h2>
          </div>

          {/* 3 Notepad Row Bullet Items */}
          <div className="flex flex-col divide-y divide-[#E8E6DE]">
            {highlights.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="py-5 flex items-center gap-4 text-[16px] sm:text-[17px] text-[#333333] leading-snug"
              >
                <div className="shrink-0">{item.icon}</div>
                <div>{item.text}</div>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
