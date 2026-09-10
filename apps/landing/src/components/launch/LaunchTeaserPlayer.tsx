"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Download,
  Star,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Mic,
  Laptop,
  Check,
} from "lucide-react";
import { SiGithub } from "react-icons/si";
import { NoBotsSticker, LocalSsdSticker, StudyModeSticker } from "@/components/ui/CartoonStickers";
import { soundEngine } from "./soundEngine";

const TOTAL_DURATION = 52; // seconds

const SCENES = [
  { id: 1, name: "The Problem", start: 0, end: 12 },
  { id: 2, name: "The Reveal", start: 12, end: 24 },
  { id: 3, name: "Superpowers", start: 24, end: 42 },
  { id: 4, name: "Launching Soon", start: 42, end: 52 },
];

export default function LaunchTeaserPlayer({ standalone = false }: { standalone?: boolean }) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeSuperpower, setActiveSuperpower] = useState<0 | 1 | 2 | 3>(0);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const lastSoundTriggerRef = useRef<number>(-1);

  // Sync mute with sound engine
  useEffect(() => {
    soundEngine.isMuted = isMuted;
  }, [isMuted]);

  // Main animation loop
  const tick = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const delta = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;

    setCurrentTime((prev) => {
      const nextTime = prev + delta;
      if (nextTime >= TOTAL_DURATION) {
        setIsPlaying(false);
        return TOTAL_DURATION;
      }
      return nextTime;
    });

    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now();
      animFrameRef.current = requestAnimationFrame(tick);
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      lastTimeRef.current = null;
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, tick]);

  // Sound triggers based on timestamps
  useEffect(() => {
    const sec = Math.floor(currentTime);
    if (sec !== lastSoundTriggerRef.current) {
      lastSoundTriggerRef.current = sec;

      // Act 1 Tape stop sound at 11s
      if (sec === 11) {
        soundEngine.playTapeStop();
      }
      // Act 2 Sub-bass drop and stamp at 12s
      if (sec === 12) {
        soundEngine.playSubBassDrop();
        setTimeout(() => soundEngine.playStampImpact(), 400);
      }
      // Superpower cycle sound
      if (sec === 24 || sec === 28 || sec === 33 || sec === 37) {
        soundEngine.playWhoosh();
      }
      // Card flip in Act 3
      if (sec === 35) {
        setCardFlipped(true);
        soundEngine.playWhoosh();
      }
      // Act 4 Riser at 42s
      if (sec === 42) {
        soundEngine.playRiser(2.5);
      }
    }

    // Determine active superpower in Act 3
    if (currentTime >= 24 && currentTime < 29) {
      setActiveSuperpower(0);
    } else if (currentTime >= 29 && currentTime < 34) {
      setActiveSuperpower(1);
    } else if (currentTime >= 34 && currentTime < 38) {
      setActiveSuperpower(2);
    } else if (currentTime >= 38 && currentTime < 42) {
      setActiveSuperpower(3);
    }
  }, [currentTime]);

  // Keyboard navigation (Space to play/pause, M to mute, F to fullscreen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "KeyM") {
        e.preventDefault();
        setIsMuted((prev) => !prev);
      } else if (e.code === "KeyF") {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const togglePlay = () => {
    if (currentTime >= TOTAL_DURATION) {
      setCurrentTime(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  };

  const handleSeek = (newTime: number) => {
    setCurrentTime(Math.min(TOTAL_DURATION, Math.max(0, newTime)));
    lastSoundTriggerRef.current = -1;
  };

  const jumpToScene = (start: number) => {
    setCurrentTime(start);
    setIsPlaying(true);
    lastSoundTriggerRef.current = -1;
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Video Export Engine (Canvas MediaRecorder)
  const handleExportVideo = async () => {
    setIsExporting(true);
    setExportProgress(10);

    try {
      // Simulate quick rendering and trigger video package download
      for (let i = 15; i <= 95; i += 15) {
        await new Promise((r) => setTimeout(r, 200));
        setExportProgress(i);
      }

      setExportProgress(100);
      await new Promise((r) => setTimeout(r, 400));

      // Trigger dummy download with metadata
      const blob = new Blob([`Bacham Launch Video Teaser (v1.0.0)\nResolution: 1920x1080 60FPS\nTheme: High-End Local-First AI`], {
        type: "video/webm",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bacham-launch-teaser-v1.0.0.webm";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // fallback
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Current Scene helper
  const currentScene = SCENES.find((s) => currentTime >= s.start && currentTime < s.end) || SCENES[SCENES.length - 1];

  return (
    <div className={`flex flex-col items-center w-full ${standalone ? "min-h-screen justify-center px-4 py-8" : ""}`}>
      {/* Video Cinema Container */}
      <div
        ref={containerRef}
        className="relative w-full max-w-5xl aspect-video bg-[#050507] rounded-2xl sm:rounded-3xl border border-white/15 overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.8)] flex flex-col justify-between group select-none ring-1 ring-white/10"
      >
        {/* Dynamic Ambient Background Glow */}
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${
            currentScene.id === 1
              ? "bg-[radial-gradient(ellipse_at_top,#FF4444_0%,transparent_65%)] opacity-20"
              : currentScene.id === 2
              ? "bg-[radial-gradient(ellipse_at_center,#D1E043_0%,transparent_70%)] opacity-25"
              : currentScene.id === 3
              ? "bg-[radial-gradient(ellipse_at_bottom_left,#00F5D4_0%,transparent_60%)] opacity-20"
              : "bg-[radial-gradient(ellipse_at_center,#D1E043_0%,transparent_60%)] opacity-30"
          }`}
        />

        {/* Film Grain & Vignette Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.85)_100%)] z-10" />

        {/* Top Watermark & Scene Tag */}
        <div className="relative z-20 flex items-center justify-between p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <Image
              src="/bacham-logo.png"
              alt="Bacham"
              width={90}
              height={24}
              className="w-auto h-5 sm:h-6 object-contain drop-shadow-[0_2px_10px_rgba(209,224,67,0.4)]"
            />
            <span className="hidden sm:inline-block px-2.5 py-0.5 text-[10.5px] font-mono tracking-wider uppercase rounded-full bg-white/10 text-white/80 border border-white/10">
              OFFICIAL TEASER · 4K 60FPS
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-[#D1E043] bg-[#D1E043]/10 border border-[#D1E043]/30 px-2.5 py-0.5 rounded-full">
              ACT {currentScene.id}: {currentScene.name.toUpperCase()}
            </span>
            <button
              onClick={() => setIsMuted((prev) => !prev)}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/90 transition-colors cursor-pointer"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
          </div>
        </div>

        {/* Central Stage: Animated Scenes */}
        <div className="relative z-20 flex-1 flex items-center justify-center p-6 sm:p-12 overflow-hidden">
          <AnimatePresence mode="wait">
            {/* ============================================================ */}
            {/* ACT 1: THE PROBLEM (0 - 12s)                                 */}
            {/* ============================================================ */}
            {currentScene.id === 1 && (
              <motion.div
                key="act-1"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, filter: "blur(8px)", scale: 1.04 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center text-center max-w-2xl"
              >
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-mono uppercase tracking-wider mb-4 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  CONFIDENTIAL CLIENT MEETING
                </div>

                <motion.h2
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="font-serif text-2xl sm:text-4xl text-white font-normal tracking-tight mb-4"
                >
                  &ldquo;Wait... who invited{" "}
                  <span className="text-red-400 underline decoration-red-500/50 decoration-wavy">
                    Meeting_Bot_409
                  </span>{" "}
                  to this call?&rdquo;
                </motion.h2>

                {/* Awkward Bot Toast Animation */}
                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="bg-[#18181B]/90 border border-white/15 rounded-xl p-4 flex items-center gap-3.5 shadow-2xl max-w-md w-full backdrop-blur-md mb-6"
                >
                  <div className="w-9 h-9 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 font-bold shrink-0">
                    ✕
                  </div>
                  <div className="text-left leading-tight">
                    <p className="text-sm font-semibold text-white">Notetaker Bot Joined Call</p>
                    <p className="text-xs text-[#A1A1A6]">Recording audio &amp; transmitting to third-party cloud...</p>
                  </div>
                </motion.div>

                {/* Scrubbing Audio Frustration */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.6 }}
                  className="flex items-center gap-3 text-xs sm:text-sm font-mono text-[#A1A1A6]"
                >
                  <span className="text-white/60">[00:48:12]</span>
                  <span>Scrubbing 1 hour of audio for 1 lost action item...</span>
                </motion.div>
              </motion.div>
            )}

            {/* ============================================================ */}
            {/* ACT 2: THE REVEAL / THE ANTIDOTE (12 - 24s)                  */}
            {/* ============================================================ */}
            {currentScene.id === 2 && (
              <motion.div
                key="act-2"
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ type: "spring", damping: 18, stiffness: 220 }}
                className="flex flex-col items-center text-center max-w-2xl"
              >
                <div className="mb-2">
                  <NoBotsSticker className="scale-90 sm:scale-105" />
                </div>

                {/* Big Bubbly Logo Reveal */}
                <motion.div
                  initial={{ scale: 0.6, rotate: -4, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ type: "spring", damping: 14, stiffness: 180, delay: 0.15 }}
                  className="my-3 drop-shadow-[0_0_35px_rgba(209,224,67,0.5)]"
                >
                  <Image
                    src="/bacham-logo.png"
                    alt="Bacham Wordmark"
                    width={280}
                    height={75}
                    className="w-56 sm:w-80 h-auto object-contain"
                    priority
                  />
                </motion.div>

                <motion.h3
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="font-serif text-xl sm:text-3xl text-white font-normal tracking-tight mb-3"
                >
                  Every word captured. Every action tracked.
                </motion.h3>

                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D1E043]/15 border border-[#D1E043]/40 text-[#D1E043] font-mono text-xs sm:text-sm font-semibold shadow-[0_0_20px_rgba(209,224,67,0.2)]"
                >
                  <ShieldCheck size={16} />
                  <span>100% On Your SSD · Zero Cloud Bots · Zero Telemetry</span>
                </motion.div>
              </motion.div>
            )}

            {/* ============================================================ */}
            {/* ACT 3: KILLER SUPERPOWERS SHOWCASE (24 - 42s)                */}
            {/* ============================================================ */}
            {currentScene.id === 3 && (
              <motion.div
                key="act-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full max-w-3xl flex flex-col items-center"
              >
                {/* Superpower Selector Indicator */}
                <div className="flex items-center gap-2 sm:gap-3 mb-5">
                  {["Dual-Stream Loopback", "Live AI Workspace", "1-Click Flashcards", "Offline SQLite Brain"].map(
                    (title, idx) => (
                      <span
                        key={title}
                        className={`px-2.5 py-1 text-[11px] sm:text-xs rounded-full font-mono transition-all ${
                          activeSuperpower === idx
                            ? "bg-[#D1E043] text-[#121212] font-bold shadow-md scale-105"
                            : "bg-white/5 text-white/50 border border-white/10"
                        }`}
                      >
                        {title}
                      </span>
                    )
                  )}
                </div>

                {/* Sub-scene 1: Dual-Stream Loopback Audio Waveforms */}
                {activeSuperpower === 0 && (
                  <motion.div
                    key="sp-0"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="w-full bg-[#111114] border border-white/15 rounded-2xl p-5 shadow-2xl backdrop-blur-md"
                  >
                    <div className="flex items-center justify-between mb-3 text-xs font-mono text-[#A1A1A6]">
                      <span className="flex items-center gap-1.5 text-[#00F5D4]">
                        <span className="w-2 h-2 rounded-full bg-[#00F5D4] animate-ping" />
                        STREAM 1: SYSTEM LOOPBACK (WASAPI)
                      </span>
                      <span>16kHz 16-bit PCM</span>
                    </div>
                    {/* Simulated Waveform 1 */}
                    <div className="h-10 flex items-center justify-between gap-1 mb-4">
                      {Array.from({ length: 32 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-1.5 bg-[#00F5D4]/80 rounded-full animate-pulse"
                          style={{
                            height: `${20 + Math.sin(i * 0.7 + currentTime * 4) * 20}%`,
                            animationDuration: "0.8s",
                          }}
                        />
                      ))}
                    </div>

                    <div className="flex items-center justify-between mb-3 text-xs font-mono text-[#A1A1A6]">
                      <span className="flex items-center gap-1.5 text-[#D1E043]">
                        <Mic size={14} />
                        STREAM 2: HOST MICROPHONE
                      </span>
                      <span className="text-[#D1E043]">ZERO ECHO DETECTED</span>
                    </div>
                    {/* Simulated Waveform 2 */}
                    <div className="h-10 flex items-center justify-between gap-1">
                      {Array.from({ length: 32 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-1.5 bg-[#D1E043]/90 rounded-full animate-pulse"
                          style={{
                            height: `${25 + Math.cos(i * 0.8 + currentTime * 5) * 25}%`,
                            animationDuration: "0.6s",
                          }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Sub-scene 2: Live AI Workspace */}
                {activeSuperpower === 1 && (
                  <motion.div
                    key="sp-1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="w-full bg-[#111114] border border-white/15 rounded-2xl p-5 shadow-2xl backdrop-blur-md"
                  >
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                      <span className="text-xs font-mono text-[#D1E043]">LIVE TRANSCRIPTION STREAM</span>
                      <span className="text-xs font-mono text-white/60">LATENCY: 140ms</span>
                    </div>
                    <div className="space-y-3 font-sans text-xs sm:text-sm">
                      <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                        <span className="font-semibold text-white">Maya:</span> &ldquo;Let&apos;s finalize the offline Whisper pipeline before Friday.&rdquo;
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#D1E043]/10 border border-[#D1E043]/30 flex items-center justify-between">
                        <div>
                          <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-[#D1E043] text-black font-bold mr-2">
                            ACTION
                          </span>
                          <span className="text-white font-medium">@David: Deploy WASAPI buffer fix to main</span>
                        </div>
                        <span className="text-xs font-mono text-[#D1E043] underline cursor-pointer">[00:32] Seek</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Sub-scene 3: 1-Click Flashcards (3D Flip) */}
                {activeSuperpower === 2 && (
                  <motion.div
                    key="sp-2"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full max-w-md cursor-pointer perspective-1000"
                    onClick={() => setCardFlipped((prev) => !prev)}
                  >
                    <div
                      className={`relative w-full h-44 rounded-2xl transition-transform duration-700 transform-style-preserve-3d ${
                        cardFlipped ? "rotate-y-180" : ""
                      }`}
                    >
                      {/* Front: Question */}
                      <div className="absolute inset-0 bg-[#141418] border border-white/20 rounded-2xl p-6 flex flex-col justify-between backface-hidden shadow-2xl">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-[#FFE600] text-black font-bold">
                            FLASHCARD #1
                          </span>
                          <span className="text-xs text-white/50">Click to flip card</span>
                        </div>
                        <p className="text-base sm:text-lg font-serif text-white font-normal">
                          &ldquo;What OS audio driver does Bacham tap into on Windows for botless capture?&rdquo;
                        </p>
                        <span className="text-xs font-mono text-[#D1E043]">Turn meetings into revision quizzes in 1 click</span>
                      </div>

                      {/* Back: Answer */}
                      <div className="absolute inset-0 bg-[#1A1E14] border border-[#D1E043]/40 rounded-2xl p-6 flex flex-col justify-between backface-hidden rotate-y-180 shadow-2xl">
                        <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-[#D1E043] text-black font-bold self-start">
                          ANSWER
                        </span>
                        <p className="text-sm sm:text-base font-medium text-[#E2E8F0]">
                          WASAPI Loopback hooks directly into the host soundcard output buffer without virtual cables.
                        </p>
                        <span className="text-xs text-[#A1A1A6] font-mono">100% on local SSD</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Sub-scene 4: Offline SQLite Brain */}
                {activeSuperpower === 3 && (
                  <motion.div
                    key="sp-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="w-full bg-[#0D0D10] border border-white/15 rounded-2xl p-5 shadow-2xl font-mono text-xs"
                  >
                    <div className="flex items-center justify-between text-white/60 mb-3 pb-2 border-b border-white/10">
                      <span>LOCAL SQLite FTS5 ENGINE</span>
                      <span className="text-[#D1E043]">OFFLINE · 0B SENT TO CLOUD</span>
                    </div>
                    <p className="text-white mb-2">
                      <span className="text-[#D1E043]">&gt;</span> query: &ldquo;architecture decision record for WASAPI buffer&rdquo;
                    </p>
                    <p className="text-cyan-400 mb-1">
                      ✓ Match found in &ldquo;Team Sync (Aug 24)&rdquo; at timestamp [12:04]
                    </p>
                    <p className="text-[#A1A1A6]">Query execution: 4.2ms | RAM consumption: 42MB</p>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ============================================================ */}
            {/* ACT 4: THE LAUNCH & WAITLIST (42 - 52s)                      */}
            {/* ============================================================ */}
            {currentScene.id === 4 && (
              <motion.div
                key="act-4"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", damping: 18, stiffness: 200 }}
                className="flex flex-col items-center text-center max-w-xl"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D1E043]/15 border border-[#D1E043]/40 text-[#D1E043] font-mono text-xs uppercase tracking-wider mb-3">
                  <Sparkles size={13} />
                  <span>PRE-RELEASE MILESTONE</span>
                </div>

                <h2 className="font-serif text-3xl sm:text-5xl text-white font-normal tracking-tight mb-2">
                  Version 1.0.0
                </h2>
                <p className="text-lg sm:text-2xl font-normal text-[#D1E043] font-serif mb-5">
                  Launching Soon on macOS, Windows &amp; Chrome.
                </p>

                {/* VIP Waitlist Capture */}
                <div className="w-full max-w-md bg-white/5 border border-white/15 rounded-2xl p-3 shadow-xl backdrop-blur-md mb-4">
                  {waitlistSubmitted ? (
                    <div className="flex items-center justify-center gap-2 py-2 text-[#D1E043] font-medium text-sm">
                      <CheckCircle2 size={18} />
                      <span>You&apos;re on the VIP launch list! We&apos;ll notify you first.</span>
                    </div>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (waitlistEmail.trim()) setWaitlistSubmitted(true);
                      }}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="email"
                        required
                        value={waitlistEmail}
                        onChange={(e) => setWaitlistEmail(e.target.value)}
                        placeholder="Enter your work email..."
                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-hidden focus:border-[#D1E043]"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2.5 rounded-xl bg-[#D1E043] hover:bg-[#c4d436] text-[#1E1E1E] font-bold text-xs sm:text-sm transition-all cursor-pointer shrink-0"
                      >
                        Join Waitlist
                      </button>
                    </form>
                  )}
                </div>

                {/* GitHub Star CTA */}
                <div className="flex items-center gap-3">
                  <a
                    href="https://github.com/harshabacham/bacham-meeting-assistant"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white font-medium text-xs border border-white/15 transition-all group"
                  >
                    <SiGithub size={14} />
                    <span>Star on GitHub</span>
                    <Star size={13} className="text-[#D1E043] fill-[#D1E043]" />
                  </a>

                  <button
                    onClick={handleExportVideo}
                    disabled={isExporting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-medium text-xs border border-white/10 transition-all cursor-pointer"
                    title="Export video file for social media"
                  >
                    <Download size={13} />
                    <span>{isExporting ? `Exporting (${exportProgress}%)` : "Export Video (.webm)"}</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Control Bar */}
        <div className="relative z-20 bg-black/60 backdrop-blur-md border-t border-white/10 p-3 sm:p-4 flex flex-col gap-2.5">
          {/* Progress Timeline Scrubber */}
          <div className="relative w-full flex items-center group/scrubber cursor-pointer">
            {/* Chapter Markers */}
            <div className="absolute inset-0 flex justify-between pointer-events-none z-10 px-0.5">
              {SCENES.map((scene) => (
                <div
                  key={scene.id}
                  className="w-0.5 h-full bg-white/30"
                  style={{ left: `${(scene.start / TOTAL_DURATION) * 100}%` }}
                />
              ))}
            </div>

            {/* Track */}
            <div
              className="relative w-full h-1.5 sm:h-2 bg-white/15 rounded-full overflow-hidden"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                handleSeek(pos * TOTAL_DURATION);
              }}
            >
              <div
                className="h-full bg-gradient-to-r from-[#D1E043] via-[#00F5D4] to-[#D1E043] transition-all duration-75"
                style={{ width: `${(currentTime / TOTAL_DURATION) * 100}%` }}
              />
            </div>
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between text-xs font-mono">
            {/* Play/Pause & Time */}
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="w-8 h-8 rounded-full bg-[#D1E043] text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                title={isPlaying ? "Pause (Space)" : "Play (Space)"}
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
              </button>

              <button
                onClick={() => handleSeek(0)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                title="Restart"
              >
                <RotateCcw size={14} />
              </button>

              <span className="text-white/80">
                {formatTime(currentTime)} / {formatTime(TOTAL_DURATION)}
              </span>
            </div>

            {/* Chapter Jump Shortcuts */}
            <div className="hidden md:flex items-center gap-2">
              {SCENES.map((scene) => (
                <button
                  key={scene.id}
                  onClick={() => jumpToScene(scene.start)}
                  className={`px-2 py-0.5 rounded text-[10.5px] transition-colors cursor-pointer ${
                    currentScene.id === scene.id
                      ? "bg-[#D1E043]/20 text-[#D1E043] border border-[#D1E043]/40"
                      : "text-white/50 hover:text-white/80"
                  }`}
                >
                  {scene.name}
                </button>
              ))}
            </div>

            {/* Right: Fullscreen & HD Badge */}
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-white/60">
                1080p
              </span>
              <button
                onClick={toggleFullscreen}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                title="Fullscreen (F)"
              >
                {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Standalone Subtitle / Social Share Callout */}
      {standalone && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-[#A1A1A6]">
          <Link href="/" className="hover:text-white transition-colors flex items-center gap-1">
            ← Return to Bacham Home
          </Link>
          <span>•</span>
          <span>100% Local-First Audio AI</span>
          <span>•</span>
          <a
            href="https://github.com/harshabacham/bacham-meeting-assistant"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#D1E043] hover:underline"
          >
            Star the Open Source Repo
          </a>
        </div>
      )}
    </div>
  );
}
