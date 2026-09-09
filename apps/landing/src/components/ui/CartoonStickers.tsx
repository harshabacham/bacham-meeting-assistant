"use client";

import { motion } from "framer-motion";
import React from "react";

/**
 * 1. No Bots Sticker — Red Warning Shield Badge
 * Hexagonal shield shape with a crossed-out robot icon.
 */
export function NoBotsSticker({ className = "" }: { className?: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.1, rotate: -3 }}
      whileTap={{ scale: 0.95 }}
      className={`inline-flex select-none cursor-pointer group ${className}`}
      title="Zero annoying meeting bots!"
    >
      {/* Shield / badge shape via clip-path */}
      <div
        className="relative bg-[#FF3B30] px-4 py-3 flex items-center gap-2.5 shadow-lg"
        style={{
          clipPath: "polygon(50% 0%, 100% 15%, 100% 75%, 50% 100%, 0% 75%, 0% 15%)",
        }}
      >
        {/* Robot face with X */}
        <div className="relative w-7 h-7 rounded bg-[#FFE600] flex items-center justify-center shrink-0">
          <span className="text-[14px] font-black text-black leading-none">🤖</span>
          {/* Strike-through */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-9 h-[3px] bg-[#FF3B30] rotate-45 rounded-full" />
          </div>
        </div>

        <div className="flex flex-col leading-none">
          <span className="text-[11px] font-black tracking-wider uppercase text-white drop-shadow-[0_1px_0_rgba(0,0,0,0.5)]">
            NO BOTS
          </span>
          <span className="text-[8px] font-bold text-[#FFE0DE] tracking-tight">
            100% BANNED
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * 2. Local SSD Sticker — Retro Ticket / Admit One Style
 * Torn-edge ticket stub with perforated border.
 */
export function LocalSsdSticker({ className = "" }: { className?: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.08, rotate: 2 }}
      whileTap={{ scale: 0.95 }}
      className={`inline-flex select-none cursor-pointer ${className}`}
      title="All data stays on your SSD"
    >
      <div className="relative bg-[#1A1A24] border-[3px] border-dashed border-[#00E5FF] rounded-lg px-3.5 py-2 flex items-center gap-2.5 shadow-[0_0_15px_rgba(0,229,255,0.25)]">
        {/* SSD Chip Icon */}
        <div className="w-7 h-7 bg-[#00E5FF]/20 border border-[#00E5FF] rounded flex items-center justify-center shrink-0">
          <span className="text-[13px] leading-none">💾</span>
        </div>

        <div className="flex flex-col leading-none">
          <span className="text-[10px] font-black tracking-widest uppercase text-[#00E5FF]">
            YOUR SSD
          </span>
          <span className="text-[8px] font-bold text-[#00E5FF]/60 tracking-tight">
            0% CLOUD LEAKS
          </span>
        </div>

        {/* Perforated edge */}
        <div className="absolute -right-[1px] top-1/2 -translate-y-1/2 flex flex-col gap-1">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-black" />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * 3. Study Mode Sticker — Postage Stamp Style
 * Serrated-edge stamp with a star + lightning icon.
 */
export function StudyModeSticker({ className = "" }: { className?: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.1, rotate: 6 }}
      whileTap={{ scale: 0.95 }}
      className={`inline-flex select-none cursor-pointer ${className}`}
      title="Turn any meeting into study cards & quizzes!"
    >
      {/* Outer serrated stamp border */}
      <div className="bg-white p-[3px] rounded-sm shadow-lg" style={{
        maskImage: `
          radial-gradient(circle at 0px 0px, transparent 3px, black 3.5px),
          radial-gradient(circle at 8px 0px, transparent 3px, black 3.5px),
          radial-gradient(circle at 16px 0px, transparent 3px, black 3.5px),
          radial-gradient(circle at 24px 0px, transparent 3px, black 3.5px),
          radial-gradient(circle at 32px 0px, transparent 3px, black 3.5px),
          radial-gradient(circle at 40px 0px, transparent 3px, black 3.5px),
          radial-gradient(circle at 48px 0px, transparent 3px, black 3.5px),
          radial-gradient(circle at 56px 0px, transparent 3px, black 3.5px),
          radial-gradient(circle at 64px 0px, transparent 3px, black 3.5px),
          radial-gradient(circle at 72px 0px, transparent 3px, black 3.5px),
          radial-gradient(circle at 80px 0px, transparent 3px, black 3.5px),
          radial-gradient(circle at 88px 0px, transparent 3px, black 3.5px)
        `,
        WebkitMaskComposite: 'intersect' as any,
        maskComposite: 'intersect',
      }}>
        <div className="bg-[#D1E043] px-3 py-2 flex items-center gap-2 rounded-xs">
          <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center shrink-0 border border-black/10">
            <span className="text-[14px] leading-none">⚡</span>
          </div>

          <div className="flex flex-col leading-none">
            <span className="text-[10px] font-black tracking-wider uppercase text-[#1A1A24]">
              STUDY DECK
            </span>
            <span className="text-[8px] font-bold text-[#3B4708] tracking-tight">
              1-CLICK QUIZ
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * 4. Dual-Stream Sticker — Cassette Tape / Polaroid Hybrid
 * Tilted polaroid-style card with a cassette inside.
 */
export function DualStreamSticker({ className = "" }: { className?: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.12, rotate: -2 }}
      whileTap={{ scale: 0.95 }}
      className={`inline-flex select-none cursor-pointer ${className}`}
      title="Mic + Speaker dual-stream capture"
    >
      {/* Polaroid-ish card */}
      <div className="bg-white p-1 pb-2.5 rounded shadow-xl">
        <div className="bg-gradient-to-br from-[#FF99E6] to-[#D946EF] px-3 py-2 rounded-xs flex items-center gap-2">
          {/* Mini cassette */}
          <div className="w-7 h-6 bg-[#2A2A36] rounded flex items-center justify-center shrink-0">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full border border-white/70" />
              <div className="w-2 h-2 rounded-full border border-white/70" />
            </div>
          </div>

          <div className="flex flex-col leading-none">
            <span className="text-[10px] font-black tracking-wider uppercase text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
              DUAL MIX
            </span>
            <span className="text-[7px] font-bold text-white/70 tracking-tight">
              MIC + SYSTEM
            </span>
          </div>
        </div>
        {/* Polaroid bottom label */}
        <p className="text-[6px] font-mono text-center text-black/40 mt-1 tracking-widest uppercase">
          dual-stream
        </p>
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
 * 7. Starburst Stamp — Spinning Star Badge
 * Rotating starburst with jagged edges instead of a plain circle.
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
      className={`w-16 h-16 flex items-center justify-center select-none cursor-pointer ${className}`}
    >
      {/* Starburst SVG */}
      <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0 drop-shadow-[0_3px_0_rgba(0,0,0,0.8)]">
        <polygon
          points="50,2 61,22 83,12 76,35 98,42 80,56 92,78 68,72 58,95 50,74 42,95 32,72 8,78 20,56 2,42 24,35 17,12 39,22"
          fill="#FFE600"
          stroke="#000"
          strokeWidth="2"
        />
      </svg>
      <span className="relative z-10 text-[7px] font-black text-black leading-tight uppercase tracking-tighter text-center px-1">
        {text}
      </span>
    </motion.div>
  );
}
