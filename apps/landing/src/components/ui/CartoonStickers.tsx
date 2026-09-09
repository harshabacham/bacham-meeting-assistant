"use client";

import { motion } from "framer-motion";
import React from "react";

/**
 * 1. No Bots Allowed Sticker
 * Cute retro cartoon robot crossed out with bold "NO BOTS" badge.
 */
export function NoBotsSticker({ className = "" }: { className?: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.1, rotate: 0 }}
      whileTap={{ scale: 0.95 }}
      className={`inline-flex select-none cursor-pointer group filter drop-shadow-[0_6px_0_rgba(0,0,0,0.9)] ${className}`}
      title="Zero annoying meeting bots!"
    >
      <div className="relative bg-[#FF5C5C] text-white border-2 border-black rounded-2xl px-3 py-2 flex items-center gap-2 shadow-[inset_0_-3px_0_rgba(0,0,0,0.25)] ring-4 ring-white/90">
        {/* Cartoon Robot with X-Eyes */}
        <div className="relative w-8 h-8 rounded-lg bg-[#FFE600] border-2 border-black flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
          {/* Antennas */}
          <div className="absolute -top-1 w-1 h-1.5 bg-black" />
          <div className="flex items-center gap-1.5 z-10">
            <span className="text-[9px] font-black text-black">✕</span>
            <span className="text-[9px] font-black text-black">✕</span>
          </div>
          <div className="absolute bottom-1 w-3.5 h-1 bg-black rounded-full" />
          {/* Red slash */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-0.5 bg-[#FF0033] rotate-45 border-t border-black" />
          </div>
        </div>

        <div className="flex flex-col leading-none">
          <span className="text-[11px] font-black tracking-wider uppercase text-[#FFE600] drop-shadow-[0_1px_0_#000]">
            NO BOTS
          </span>
          <span className="text-[9px] font-bold text-white tracking-tight">
            100% BANNED
          </span>
        </div>

        {/* Glossy corner shine */}
        <div className="absolute top-1 left-1.5 w-4 h-1 bg-white/40 rounded-full" />
      </div>
    </motion.div>
  );
}

/**
 * 2. 100% Local SSD / Floppy Sticker
 * Cute retro smiling floppy disk with sunglasses.
 */
export function LocalSsdSticker({ className = "" }: { className?: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.1, rotate: 0 }}
      whileTap={{ scale: 0.95 }}
      className={`inline-flex select-none cursor-pointer filter drop-shadow-[0_6px_0_rgba(0,0,0,0.9)] ${className}`}
      title="All data stays on your SSD"
    >
      <div className="relative bg-[#00E5FF] text-black border-2 border-black rounded-2xl px-3 py-2 flex items-center gap-2.5 shadow-[inset_0_-3px_0_rgba(0,0,0,0.25)] ring-4 ring-white/90">
        {/* Floppy disk character */}
        <div className="relative w-8 h-8 bg-[#1A1A24] border-2 border-black rounded-md flex flex-col items-center justify-between p-1 shrink-0">
          <div className="w-4 h-2 bg-white rounded-xs" />
          {/* Cute sunglasses */}
          <div className="flex items-center gap-0.5 my-auto">
            <div className="w-2.5 h-2 bg-black rounded-xs border border-[#00E5FF]" />
            <div className="w-0.5 h-0.5 bg-black" />
            <div className="w-2.5 h-2 bg-black rounded-xs border border-[#00E5FF]" />
          </div>
          <div className="w-5 h-1.5 bg-[#FFE600] rounded-xs text-[6px] font-mono font-bold text-black text-center leading-none">
            SSD
          </div>
        </div>

        <div className="flex flex-col leading-none">
          <span className="text-[11px] font-black tracking-wider uppercase text-black">
            YOUR SSD ONLY
          </span>
          <span className="text-[9px] font-extrabold text-[#004B57] tracking-tight">
            0% CLOUD LEAKS
          </span>
        </div>

        <div className="absolute top-1 left-2 w-5 h-1 bg-white/60 rounded-full" />
      </div>
    </motion.div>
  );
}

/**
 * 3. Study Mode & Flashcards Sticker
 * Cartoon magic flashcard with sparkling stars.
 */
export function StudyModeSticker({ className = "" }: { className?: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.1, rotate: 0 }}
      whileTap={{ scale: 0.95 }}
      className={`inline-flex select-none cursor-pointer filter drop-shadow-[0_6px_0_rgba(0,0,0,0.9)] ${className}`}
      title="Turn any meeting into study cards & quizzes!"
    >
      <div className="relative bg-[#D1E043] text-black border-2 border-black rounded-2xl px-3 py-2 flex items-center gap-2 shadow-[inset_0_-3px_0_rgba(0,0,0,0.25)] ring-4 ring-white/90">
        {/* Flashcard icon with lightning */}
        <div className="relative w-8 h-8 bg-white border-2 border-black rounded-lg flex items-center justify-center shrink-0 shadow-xs">
          <span className="text-base leading-none">⚡</span>
          <span className="absolute -top-1 -right-1 text-[10px] text-[#A855F7] animate-spin font-black">★</span>
        </div>

        <div className="flex flex-col leading-none">
          <span className="text-[11px] font-black tracking-wider uppercase text-black">
            STUDY DECK
          </span>
          <span className="text-[9px] font-extrabold text-[#3B4708] tracking-tight">
            1-CLICK QUIZ
          </span>
        </div>

        <div className="absolute top-1 left-2 w-5 h-1 bg-white/70 rounded-full" />
      </div>
    </motion.div>
  );
}

/**
 * 4. Dual-Stream Audio Tape Sticker
 * Cute retro cassette tape for dual-channel audio capture.
 */
export function DualStreamSticker({ className = "" }: { className?: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.1, rotate: 0 }}
      whileTap={{ scale: 0.95 }}
      className={`inline-flex select-none cursor-pointer filter drop-shadow-[0_6px_0_rgba(0,0,0,0.9)] ${className}`}
      title="Mic + Speaker dual-stream capture"
    >
      <div className="relative bg-[#FF99E6] text-black border-2 border-black rounded-2xl px-3 py-2 flex items-center gap-2.5 shadow-[inset_0_-3px_0_rgba(0,0,0,0.25)] ring-4 ring-white/90">
        {/* Cute Cassette */}
        <div className="relative w-8 h-7 bg-[#2A2A36] border-2 border-black rounded-md flex flex-col items-center justify-center shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full border border-white bg-black flex items-center justify-center">
              <div className="w-0.5 h-0.5 rounded-full bg-white" />
            </div>
            <div className="w-2 h-2 rounded-full border border-white bg-black flex items-center justify-center">
              <div className="w-0.5 h-0.5 rounded-full bg-white" />
            </div>
          </div>
          <div className="w-5 h-1 bg-[#D1E043] rounded-xs mt-1" />
        </div>

        <div className="flex flex-col leading-none">
          <span className="text-[11px] font-black tracking-wider uppercase text-black">
            DUAL-STREAM
          </span>
          <span className="text-[9px] font-extrabold text-[#701A57] tracking-tight">
            MIC + SYSTEM AUDIO
          </span>
        </div>

        <div className="absolute top-1 left-2 w-5 h-1 bg-white/60 rounded-full" />
      </div>
    </motion.div>
  );
}

/**
 * 5. Washi Tape Accent
 * Cute diagonal washi tape piece to stick cards or banners to the page.
 */
export function WashiTape({
  className = "",
  color = "lime",
}: {
  className?: string;
  color?: "lime" | "pink" | "cyan" | "orange";
}) {
  const colorMap = {
    lime: "bg-[#D1E043]/80 border-t border-b border-white/40",
    pink: "bg-[#FF66C4]/80 border-t border-b border-white/40",
    cyan: "bg-[#00E5FF]/80 border-t border-b border-white/40",
    orange: "bg-[#FFAA00]/80 border-t border-b border-white/40",
  };

  return (
    <div
      className={`h-4 w-14 backdrop-blur-xs select-none pointer-events-none opacity-90 shadow-sm transform ${colorMap[color]} ${className}`}
      style={{
        clipPath: "polygon(0 0, 95% 0, 100% 50%, 95% 100%, 0 100%, 5% 50%)",
      }}
    />
  );
}

/**
 * 6. Sketched Cartoon Doodle Arrow with Hand-Drawn Annotation
 */
export function DoodleAnnotation({
  text,
  direction = "right",
  className = "",
}: {
  text: string;
  direction?: "right" | "left" | "down";
  className?: string;
}) {
  return (
    <div className={`inline-flex items-center gap-2 select-none pointer-events-none ${className}`}>
      {direction === "left" && (
        <svg width="28" height="20" viewBox="0 0 28 20" fill="none" className="text-[#D1E043] shrink-0">
          <path
            d="M26 10 C18 12, 10 4, 3 10 M3 10 L8 5 M3 10 L8 15"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      <span className="font-serif italic text-xs md:text-sm font-semibold text-[#D1E043] whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
        {text}
      </span>

      {direction === "right" && (
        <svg width="28" height="20" viewBox="0 0 28 20" fill="none" className="text-[#D1E043] shrink-0">
          <path
            d="M2 10 C10 12, 18 4, 25 10 M25 10 L20 5 M25 10 L20 15"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {direction === "down" && (
        <svg width="20" height="28" viewBox="0 0 20 28" fill="none" className="text-[#D1E043] shrink-0">
          <path
            d="M10 2 C12 10, 4 18, 10 25 M10 25 L5 20 M10 25 L15 20"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
}

/**
 * 7. Trendy Starburst Stamp Sticker
 */
export function StarburstSticker({
  text = "100% PRIVATE",
  className = "",
}: {
  text?: string;
  className?: string;
}) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      whileHover={{ scale: 1.15 }}
      className={`w-16 h-16 rounded-full bg-[#FFE600] border-2 border-black flex items-center justify-center p-1 select-none filter drop-shadow-[0_4px_0_rgba(0,0,0,0.9)] ring-4 ring-white/90 cursor-pointer ${className}`}
    >
      <div className="w-full h-full rounded-full border border-dashed border-black flex items-center justify-center text-center">
        <span className="text-[8px] font-black text-black leading-tight uppercase tracking-tighter">
          {text}
        </span>
      </div>
    </motion.div>
  );
}
