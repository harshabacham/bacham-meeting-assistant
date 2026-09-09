"use client";

import { motion } from "framer-motion";
import { BotOff, ShieldCheck, CheckCheck, GraduationCap } from "lucide-react";
import { StudyModeSticker, NoBotsSticker, WashiTape, DoodleAnnotation } from "@/components/ui/CartoonStickers";

export default function NotepadIntro() {
  const highlights = [
    {
      icon: (
        <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-[#D1E043] shadow-2xs">
          <BotOff size={22} strokeWidth={1.8} />
        </div>
      ),
      text: (
        <>
          Uses your computer audio, <strong className="font-semibold text-[#FFFFFF]">so doesn’t invite an annoying bot</strong>
        </>
      ),
    },
    {
      icon: (
        <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-[#D1E043] shadow-2xs">
          <ShieldCheck size={22} strokeWidth={1.8} />
        </div>
      ),
      text: (
        <>
          <strong className="font-semibold text-[#FFFFFF]">Private by default</strong>, 100% on-device Whisper &amp; SQLite vector storage
        </>
      ),
    },
    {
      icon: (
        <div className="w-11 h-11 rounded-xl bg-[#D1E043] border border-white/15 flex items-center justify-center text-[#1E1E1E] shadow-2xs font-bold">
          <GraduationCap size={22} strokeWidth={2} />
        </div>
      ),
      text: (
        <>
          <strong className="font-semibold text-[#FFFFFF]">Instant Study &amp; Retention Mode:</strong> converts meetings and lectures into flashcards and quizzes
        </>
      ),
    },
    {
      icon: (
        <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-[#D1E043] shadow-2xs">
          <CheckCheck size={22} strokeWidth={1.8} />
        </div>
      ),
      text: (
        <>
          Works seamlessly with <strong className="font-semibold text-[#FFFFFF]">Google Meet</strong>,{" "}
          <strong className="font-semibold text-[#FFFFFF]">Zoom</strong>,{" "}
          <strong className="font-semibold text-[#FFFFFF]">Teams</strong> and in-person lecture audio.
        </>
      ),
    },
  ];

  return (
    <section className="relative py-20 border-y border-white/10 bg-[#000000] overflow-hidden">
      {/* Subtle Ruled Notebook Horizontal Lines Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: "repeating-linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 0px, rgba(255, 255, 255, 0.08) 1px, transparent 1px, transparent 4.5rem)",
          maskImage: "linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 md:px-10 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[45%_55%] gap-10 items-center">
          
          {/* Section Headline + Stickers */}
          <div className="relative">
            <WashiTape color="orange" className="absolute -top-6 left-2 rotate-[-4deg]" />
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[12px] font-black text-[#D1E043] uppercase tracking-wider block">
                The Notepad Philosophy
              </span>
              <StudyModeSticker className="scale-85 -rotate-6" />
            </div>

            <h2 className="font-serif text-3xl sm:text-5xl font-normal tracking-tight text-[#FFFFFF] leading-[1.08] mb-4">
              Effortless notes, enhanced instantly.
            </h2>
            <p className="text-sm text-[#A1A1A6] leading-relaxed max-w-md">
              Focus on the conversation, not frantic typing. Bacham turns raw thoughts into executive clarity and revision decks.
            </p>

            <DoodleAnnotation
              text="★ Try the study deck!"
              direction="down"
              className="mt-4 hidden md:inline-flex"
            />
          </div>

          {/* 4 Notepad Row Bullet Items */}
          <div className="flex flex-col divide-y divide-white/10">
            {highlights.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="py-4 sm:py-5 flex items-center gap-4 text-[15.5px] sm:text-[16.5px] text-[#D1D1D6] leading-snug"
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
