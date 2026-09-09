"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Play,
  Mic,
  Monitor,
  Zap,
  Camera,
  FileText,
  Clock,
} from "lucide-react";

const MIC_BARS   = [3,7,14,22,10,30,18,6,26,14,34,10,22,6,38,18,10,30,14,6,22,34,10,18,6,28,16,8,24,12];
const SYS_BARS   = [6,14,10,22,34,6,18,30,14,6,26,38,10,22,14,6,30,18,6,34,14,10,22,6,18,10,28,20,8,16];

const ARTIFACTS = [
  { id:"decision",   icon:CheckCircle2, label:"Decision detected",    detail:"Use Supabase for auth · MVP scope",     time:"02:31", accent:"#4ADE80", pos:"top-[18%] left-[4%]",    floatDir:1,  delay:0.8 },
  { id:"screenshot", icon:Camera,       label:"Screenshot captured",  detail:"Tab: Figma · 1920×1080",               time:"04:12", accent:"#60A5FA", pos:"top-[14%] right-[4%]",   floatDir:-1, delay:1.6 },
  { id:"action",     icon:Zap,          label:"Action item",          detail:"@Maya — finalize loopback buffer",     time:"07:45", accent:"#D1E043", pos:"bottom-[28%] left-[3%]",  floatDir:1,  delay:2.2 },
  { id:"notes",      icon:FileText,     label:"Live notes updated",   detail:"4 decisions · 3 tasks · 2 open Qs",   time:"09:03", accent:"#C084FC", pos:"bottom-[26%] right-[3%]", floatDir:-1, delay:2.8 },
];

const FULL_HEADLINE = "Your meetings had more than words.";
const FULL_SUBHEAD  = "Bacham remembers the rest.";

export default function Hero() {
  const [hlChars,  setHlChars]  = useState(0);
  const [shChars,  setShChars]  = useState(0);
  const [hlDone,   setHlDone]   = useState(false);
  const [shDone,   setShDone]   = useState(false);
  const [recSecs,  setRecSecs]  = useState(0);
  const [waveSeed, setWaveSeed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setHlChars(n => {
        if (n >= FULL_HEADLINE.length) { clearInterval(id); setHlDone(true); return n; }
        return n + 1;
      });
    }, 36);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!hlDone) return;
    const id = setInterval(() => {
      setShChars(n => {
        if (n >= FULL_SUBHEAD.length) { clearInterval(id); setShDone(true); return n; }
        return n + 1;
      });
    }, 52);
    return () => clearInterval(id);
  }, [hlDone]);

  useEffect(() => {
    const id = setInterval(() => setRecSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setWaveSeed(s => s + 1), 110);
    return () => clearInterval(id);
  }, []);

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2,"0")}:${String(s % 60).padStart(2,"0")}`;

  const barH = (base: number, seed: number, i: number) => {
    const jitter = Math.sin(seed * 0.7 + i * 1.3) * 0.45 + 0.55;
    return Math.max(3, Math.round(base * jitter));
  };

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden bg-[#000000] select-none">

      {/* Scanline overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.035]"
        style={{ backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.08) 2px,rgba(255,255,255,0.08) 3px)", backgroundSize:"100% 3px" }}
      />

      {/* Radial glow */}
      <div className="pointer-events-none absolute inset-0 z-0"
        style={{ background:"radial-gradient(ellipse 70% 55% at 50% 45%,rgba(209,224,67,0.05) 0%,transparent 70%)" }}
      />

      {/* TOP BAR */}
      <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} transition={{duration:0.5}}
        className="relative z-20 flex items-center justify-between px-5 md:px-10 pt-6">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <span className="font-mono text-[11px] font-bold tracking-[0.2em] text-[#888888] uppercase">Recording Locally</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[12px] text-[#555555]">
          <Clock size={11} /><span>{fmtTime(recSecs)}</span>
        </div>
      </motion.div>

      {/* FLOATING ARTIFACT CARDS */}
      {ARTIFACTS.map((a) => {
        const Icon = a.icon;
        return (
          <motion.div key={a.id}
            initial={{opacity:0,scale:0.85,y:12}} animate={{opacity:1,scale:1,y:0}}
            transition={{duration:0.6,delay:a.delay,ease:[0.16,1,0.3,1]}}
            className={`absolute z-30 hidden lg:flex flex-col gap-1.5 ${a.pos}`}
            style={{ animation:`floatY${a.floatDir > 0 ? "Up":"Down"} 4.5s ease-in-out infinite`, animationDelay:`${a.delay*0.5}s` }}
          >
            <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl backdrop-blur-md border"
              style={{ background:"rgba(14,14,16,0.85)", borderColor:`${a.accent}28`, boxShadow:`0 0 0 1px ${a.accent}14,0 8px 32px rgba(0,0,0,0.5)` }}
            >
              <span className="mt-0.5 shrink-0 w-5 h-5 rounded-md flex items-center justify-center" style={{background:`${a.accent}18`}}>
                <Icon size={11} style={{color:a.accent}} />
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{color:a.accent}}>{a.label}</span>
                <span className="text-[11.5px] text-[#B0B0B8] leading-snug mt-0.5 max-w-[180px]">{a.detail}</span>
              </div>
            </div>
            <div className="flex justify-end">
              <span className="font-mono text-[9.5px] px-2 py-0.5 rounded-full border"
                style={{color:a.accent,borderColor:`${a.accent}30`,background:`${a.accent}0D`}}>{a.time}</span>
            </div>
          </motion.div>
        );
      })}

      {/* MAIN CENTER */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 py-16">

        {/* Badge */}
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.5,delay:0.1}}
          className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/5 mb-10">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D1E043] animate-pulse" />
          <span className="text-[11px] font-semibold text-[#888888] tracking-widest uppercase">Open Source · Local-first · No Bot</span>
        </motion.div>

        {/* Headline typewriter */}
        <h1 className="font-serif text-[clamp(2.6rem,7vw,5.5rem)] font-normal leading-[1.0] tracking-[-0.03em] text-white max-w-[16ch] text-balance mb-0">
          {FULL_HEADLINE.slice(0,hlChars)}
          {!hlDone && <span className="inline-block w-[3px] h-[0.85em] bg-white ml-0.5 align-middle animate-pulse rounded-[1px]" />}
        </h1>

        {/* Subhead typewriter — lime italic */}
        <div className="font-serif text-[clamp(2.4rem,6.5vw,5.0rem)] font-normal leading-[1.0] tracking-[-0.03em] text-[#D1E043] italic max-w-[16ch] text-balance mb-8 mt-1 min-h-[1.1em]">
          {hlDone && (
            <>
              {FULL_SUBHEAD.slice(0,shChars)}
              {!shDone && <span className="inline-block w-[3px] h-[0.85em] bg-[#D1E043] ml-0.5 align-middle animate-pulse rounded-[1px]" />}
            </>
          )}
        </div>

        {/* Body copy */}
        <motion.p initial={{opacity:0,y:10}} animate={{opacity:shDone?1:0,y:shDone?0:10}}
          transition={{duration:0.6}} className="text-[15px] sm:text-[17px] text-[#808088] leading-relaxed max-w-[44ch] mb-10">
          Local AI that turns your meetings into notes, tasks, and proof.
          <strong className="text-[#C8C8D0] font-semibold"> No bot. No cloud.</strong>
        </motion.p>

        {/* Dual CTAs */}
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:shDone?1:0,y:shDone?0:10}}
          transition={{duration:0.6,delay:0.1}} className="flex flex-col sm:flex-row items-center gap-3 mb-10">
          <a href="#downloads"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#D1E043] hover:bg-[#c4d436] text-[#0D0D0E] font-bold text-[14.5px] shadow-[0_0_40px_rgba(209,224,67,0.25)] hover:shadow-[0_0_60px_rgba(209,224,67,0.35)] transition-all active:scale-[0.97]">
            <span>Get Early Access</span><ArrowRight size={15} strokeWidth={2.6} />
          </a>
          <a href="#demo"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white/[0.06] hover:bg-white/10 border border-white/12 text-[#CCCCCC] font-semibold text-[14.5px] transition-all active:scale-[0.97]">
            <Play size={13} strokeWidth={2.5} className="text-[#D1E043]" fill="#D1E043" />
            <span>Watch 45-sec Demo</span>
          </a>
        </motion.div>

        {/* Trust bar */}
        <motion.div initial={{opacity:0}} animate={{opacity:shDone?1:0}} transition={{duration:0.6,delay:0.2}}
          className="flex flex-wrap justify-center items-center gap-x-5 gap-y-2 text-[12px] text-[#505058]">
          {["Open source","Local-first","No bot joins your meeting"].map((item,i)=>(
            <span key={i} className="flex items-center gap-1.5">
              <CheckCircle2 size={11} className="text-[#D1E043]" />{item}
            </span>
          ))}
        </motion.div>
      </div>

      {/* BOTTOM WAVEFORM */}
      <div className="relative z-10 w-full px-4 md:px-8 pb-8">
        <div className="flex justify-between items-center mb-2 px-1">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest" style={{color:"#D1E043"}}>
            <Mic size={9} style={{color:"#D1E043"}} /><span>Mic Channel</span>
          </div>
          <div className="text-[10px] font-mono text-[#333333] tracking-widest uppercase">Dual-stream Active</div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest" style={{color:"#60A5FA"}}>
            <span>System Audio</span><Monitor size={9} style={{color:"#60A5FA"}} />
          </div>
        </div>

        <div className="w-full overflow-hidden rounded-xl border border-white/5 bg-[#060608] px-3 py-3 flex flex-col gap-1.5">
          <div className="flex items-center justify-center gap-[2px] h-10">
            {MIC_BARS.map((base,i)=>(
              <motion.div key={`mic-${i}`} className="rounded-full shrink-0"
                style={{width:3,background:"linear-gradient(180deg,#D1E043,#8FA62A)",opacity:0.8}}
                animate={{height:barH(base,waveSeed,i)}} transition={{duration:0.1,ease:"linear"}} />
            ))}
          </div>
          <div className="w-full h-px bg-white/5" />
          <div className="flex items-center justify-center gap-[2px] h-10">
            {SYS_BARS.map((base,i)=>(
              <motion.div key={`sys-${i}`} className="rounded-full shrink-0"
                style={{width:3,background:"linear-gradient(180deg,#60A5FA,#2563EB)",opacity:0.7}}
                animate={{height:barH(base,waveSeed+7,i)}} transition={{duration:0.1,ease:"linear"}} />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mt-2.5 text-[10px] font-mono text-[#333333] tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D1E043]" />
          Mic + System Loopback · Local Whisper · SQLite
        </div>
      </div>

      <style>{`
        @keyframes floatYUp   { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-10px)} }
        @keyframes floatYDown { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(10px)} }
      `}</style>
    </section>
  );
}
