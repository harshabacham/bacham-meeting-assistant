"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Play,
  Mic,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Copy,
  ExternalLink,
  Laptop,
  Terminal,
  Headphones,
  FileText,
  Clock,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import {
  NoBotsSticker,
  LocalSsdSticker,
  StudyModeSticker,
  DualStreamSticker,
  WashiTape,
  DoodleAnnotation,
} from "@/components/ui/CartoonStickers";

export default function HowToUse() {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);

  const steps = [
    {
      step: 1 as const,
      number: "01",
      badge: "Quick Setup · 30 Seconds",
      title: "Download & Launch the App",
      shortDesc: "Install the standalone desktop client. Zero audio drivers or virtual cables needed.",
      fullDesc:
        "Download the Windows installer (.exe or .msi) or macOS universal DMG. When you launch Bacham, it automatically verifies and hooks into your native operating system audio loopback (WASAPI on Windows, CoreAudio on Mac). Everything is ready out of the box.",
      keyAction: "Download v1.0.10 Installer",
      actionHref: "#downloads",
      highlights: [
        "Automatic audio loopback detection (WASAPI & CoreAudio)",
        "Zero third-party virtual audio cables (no VB-Cable needed)",
        "Ultralight memory footprint (< 60MB RAM)",
      ],
      mockup: {
        title: "Bacham Desktop Initialization",
        status: "System Ready · All Drivers Verified",
        items: [
          { label: "OS Loopback Driver", value: "WASAPI Loopback Active", status: "success" },
          { label: "Microphone Source", value: "Default Communications Device", status: "success" },
          { label: "Local SQLite Brain", value: "Initialized at %APPDATA%/bacham", status: "success" },
          { label: "AI Engine", value: "Whisper Local + Bring-Your-Own-Key", status: "neutral" },
        ],
      },
    },
    {
      step: 2 as const,
      number: "02",
      badge: "Join & Record · 1 Click",
      title: "Join Your Meeting & Click 'Capture Call'",
      shortDesc: "Open Zoom, Google Meet, Teams, or an in-person class. Start recording invisibly.",
      fullDesc:
        "Jump into your scheduled meeting or lecture. Click the green 'Capture Call' button in Bacham, or press the universal global hotkey Alt+Shift+B from anywhere on your desktop. Zero bots enter the meeting. The attendees won't see or hear any bot.",
      keyAction: "Press Alt + Shift + B to Record",
      actionHref: "#demo",
      highlights: [
        "Zero intrusive meeting bots joining or announcing recording",
        "Global keyboard shortcut Alt + Shift + B works from any window",
        "Companion Chrome Extension available for 1-click Google Meet tab capture",
      ],
      mockup: {
        title: "Active Call Capture · Google Meet",
        status: "Dual-Stream Active · Zero Bots in Room",
        items: [
          { label: "Remote Attendees", value: "System Loopback Audio Ingestion", status: "success" },
          { label: "Your Microphone", value: "Noise-Suppressed Voice Channel", status: "success" },
          { label: "Meeting Room Bot", value: "None (100% Invisible Recording)", status: "highlight" },
          { label: "Timer", value: "00:14:28 · Lossless 16kHz Stream", status: "neutral" },
        ],
      },
    },
    {
      step: 3 as const,
      number: "03",
      badge: "During the Call · Shorthand",
      title: "Talk, Listen & Jot Quick Thoughts",
      shortDesc: "Stay present. Type quick rough shorthand or simply sit back and listen.",
      fullDesc:
        "Forget trying to transcribe every word frantically. Focus on the actual conversation. You can type quick keywords or rough shorthand into Bacham's clean notepad, or leave it completely blank. Bacham records both sides of audio in synchronized harmony.",
      keyAction: "Explore Notepad Mode",
      actionHref: "#features",
      highlights: [
        "Type minimal shorthand keywords — AI expands them post-meeting",
        "Separate audio channels keep speaker attribution crystal clear",
        "Low CPU overhead (< 3%) ensures zero lag during video calls",
      ],
      mockup: {
        title: "Tactile Meeting Notepad",
        status: "Real-Time Ingestion Buffer",
        items: [
          { label: "Your Shorthand", value: "discuss Q3 pricing, ask Maya about loopback buffer, ship v1.0.10", status: "neutral" },
          { label: "Live Speech", value: "Maya: 'The buffer latency is down to 8ms on Windows 11.'", status: "success" },
          { label: "Diarization", value: "Track 1: System Audio • Track 2: Mic", status: "success" },
        ],
      },
    },
    {
      step: 4 as const,
      number: "04",
      badge: "Post-Call · Instant Magic",
      title: "Hit 'End Call' — Get Notes & Flashcards",
      shortDesc: "Instantly receive structured notes, audio action items, and study decks.",
      fullDesc:
        "The moment the call wraps up, click 'End Call'. In seconds, Bacham merges your rough thoughts with the dual-channel transcript to generate executive summaries, decisions, clickable timestamped action items ([02:14]), and interactive study flashcards.",
      keyAction: "View Generated Sample Notes",
      actionHref: "#demo",
      highlights: [
        "Clickable timestamped action items [02:14] replay exact audio moments",
        "1-click Study Mode generates active-recall flashcards & quizzes",
        "Export directly to Markdown, Notion, Obsidian, Slack, or Clipboard",
      ],
      mockup: {
        title: "Enhanced Synthesis & Action Hub",
        status: "Generated in 0.4s · Ready to Export",
        items: [
          { label: "Executive Brief", value: "Architecture sync approved; dual-stream latency verified.", status: "success" },
          { label: "Action Item [02:14]", value: "@Maya: Push signed v1.0.10 Windows build to release channel", status: "highlight" },
          { label: "Flashcard Deck", value: "3 study cards created for lecture revision (Click to flip)", status: "interactive" },
        ],
      },
    },
  ];

  const currentStep = steps.find((s) => s.step === activeStep)!;

  const faqs = [
    {
      q: "Will other people in my meeting know I am recording?",
      a: "No bot joins the call. Traditional services (like Otter or Fireflies) send an external bot user into Zoom or Google Meet with a banner announcing recording. Bacham runs quietly on your own computer and captures sound from your system audio output and microphone. Nothing changes inside the call.",
    },
    {
      q: "Does Bacham work with Bluetooth headphones?",
      a: "Yes! Bacham utilizes native OS loopback capture (WASAPI on Windows and CoreAudio on macOS). It automatically captures whatever sound is playing through your headphones, AirPods, or speakers, alongside your microphone.",
    },
    {
      q: "Do I need to pay for AI tokens or cloud subscriptions?",
      a: "No! Bacham is 100% free and open source. You can run Whisper and Ollama locally on your machine with zero monthly costs, or easily plug in your personal Claude, OpenAI, or Gemini API keys.",
    },
    {
      q: "How does the Chrome Extension interact with the Desktop app?",
      a: "If you install both, the extension streams Google Meet tab audio over a lightning-fast local WebSocket (ws://127.0.0.1:1421) directly to your desktop database. If you use the desktop app standalone, it captures all apps system-wide with zero extension required.",
    },
  ];

  return (
    <section id="how-to-use" className="py-24 md:py-32 bg-[#09090B] border-t border-white/10 relative overflow-hidden">
      {/* Ambient gradient */}
      <div className="absolute top-1/2 right-1/4 w-[500px] h-[300px] bg-[#D1E043]/5 blur-[120px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 relative">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="text-[11.5px] font-black uppercase tracking-wider text-[#D1E043] select-none">
              Beginner Friendly Walkthrough
            </span>
            <LocalSsdSticker className="scale-85 -rotate-2" />
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-[#FFFFFF] leading-tight mb-4">
            How to use Bacham in 4 simple steps
          </h2>
          <p className="text-base sm:text-lg text-[#A1A1A6] leading-relaxed max-w-2xl mx-auto">
            From download to your first meeting in under a minute. Zero confusing virtual cables, zero monthly fees.
          </p>

          <DoodleAnnotation
            text="★ Click any step to preview!"
            direction="down"
            className="absolute -bottom-6 left-12 hidden md:inline-flex"
          />
        </div>

        {/* 4 Interactive Step Selector Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {steps.map((s) => {
            const isActive = activeStep === s.step;
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => setActiveStep(s.step)}
                className={`text-left p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                  isActive
                    ? "bg-[#121214] border-2 border-[#D1E043] shadow-lg shadow-[#D1E043]/10"
                    : "bg-[#0D0D0E] border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`font-mono text-xs font-black px-2 py-0.5 rounded-full ${
                      isActive ? "bg-[#D1E043] text-[#1E1E1E]" : "bg-white/10 text-white/70"
                    }`}
                  >
                    Step {s.number}
                  </span>
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-[#D1E043] animate-pulse" />
                  )}
                </div>

                <h3 className={`font-serif text-base sm:text-lg font-normal mb-1.5 transition-colors ${
                  isActive ? "text-white font-medium" : "text-[#D1D1D6]"
                }`}>
                  {s.title}
                </h3>
                <p className="text-xs text-[#8E8E93] leading-relaxed line-clamp-2">
                  {s.shortDesc}
                </p>
              </button>
            );
          })}
        </div>

        {/* Interactive Step Display Stage */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="rounded-3xl bg-[#0D0D0E] border border-white/10 p-6 sm:p-10 shadow-2xl relative overflow-hidden mb-20"
          >
            <WashiTape color={activeStep % 2 === 0 ? "lime" : "orange"} className="absolute -top-2 left-10 rotate-[-2deg] z-20" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Left 6 Cols: Step Deep Dive */}
              <div className="lg:col-span-6 space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[#D1E043] text-xs font-bold">
                  <span>{currentStep.badge}</span>
                </div>

                <h3 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-normal text-white leading-tight">
                  {currentStep.title}
                </h3>

                <p className="text-sm sm:text-base text-[#A1A1A6] leading-relaxed">
                  {currentStep.fullDesc}
                </p>

                <div className="space-y-3 pt-2">
                  {currentStep.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-3 text-xs sm:text-sm text-[#D1D1D6]">
                      <CheckCircle2 size={16} className="text-[#D1E043] shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 flex flex-wrap items-center gap-4">
                  <a
                    href={currentStep.actionHref}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#D1E043] hover:bg-[#c4d436] text-[#1E1E1E] font-bold text-xs transition-all shadow-sm cursor-pointer"
                  >
                    <span>{currentStep.keyAction}</span>
                    <ArrowRight size={13} />
                  </a>

                  <button
                    type="button"
                    onClick={() => setActiveStep((prev) => (prev < 4 ? ((prev + 1) as 1 | 2 | 3 | 4) : 1))}
                    className="text-xs text-white/60 hover:text-white transition-colors cursor-pointer"
                  >
                    Next step →
                  </button>
                </div>
              </div>

              {/* Right 6 Cols: Visual Simulated Window Card */}
              <div className="lg:col-span-6 rounded-2xl bg-[#14161A] border border-white/15 p-5 sm:p-6 shadow-2xl relative overflow-hidden">
                {/* Window Chrome Header */}
                <div className="flex items-center justify-between pb-3.5 border-b border-white/10 mb-4 select-none">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
                    <span className="ml-2 font-mono text-[11px] text-white/60">
                      {currentStep.mockup.title}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#D1E043] px-2 py-0.5 rounded bg-white/5 border border-white/10">
                    Step {currentStep.number}/04
                  </span>
                </div>

                {/* Subtitle status */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-[#D1E043] animate-pulse" />
                  <span className="text-xs text-white/80 font-medium">
                    {currentStep.mockup.status}
                  </span>
                </div>

                {/* Items list */}
                <div className="space-y-2.5">
                  {currentStep.mockup.items.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        if (item.status === "interactive") {
                          setFlashcardFlipped(!flashcardFlipped);
                        }
                      }}
                      className={`p-3 rounded-xl border text-xs transition-all ${
                        item.status === "interactive"
                          ? "bg-[#D1E043]/10 border-[#D1E043]/30 cursor-pointer hover:bg-[#D1E043]/15"
                          : item.status === "highlight"
                          ? "bg-white/[0.05] border-[#D1E043]/30 text-white"
                          : "bg-black/40 border-white/5 text-[#D1D1D6]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[10px] text-[#A1A1A6] uppercase tracking-wider">
                          {item.label}
                        </span>
                        {item.status === "interactive" && (
                          <span className="text-[10px] text-[#D1E043] font-bold flex items-center gap-1">
                            <RotateCcw size={10} />
                            Tap to Flip
                          </span>
                        )}
                      </div>

                      {item.status === "interactive" ? (
                        <p className="font-medium text-white">
                          {flashcardFlipped
                            ? "Answer: Dual-stream WASAPI loopback captures remote audio & mic without any bot joining."
                            : "Question: Why does Bacham not require an uninvited bot in Zoom or Google Meet?"}
                        </p>
                      ) : (
                        <p className="text-white/90 leading-snug">
                          {item.value}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-white/50">
                  <span>Native Tauri 2.0 Engine</span>
                  <span className="text-[#D1E043] font-mono">100% On-Device</span>
                </div>
              </div>

            </div>
          </motion.div>
        </AnimatePresence>

        {/* Pro-Tips & New User FAQ Grid */}
        <div className="mt-16">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-mono font-bold text-[#D1E043] uppercase tracking-wider block mb-1">
              Common Questions
            </span>
            <h3 className="font-serif text-2xl sm:text-3xl font-normal text-white">
              Everything a new user needs to know
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl mx-auto">
            {faqs.map((f, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-[#0D0D0E] border border-white/10 hover:border-white/20 transition-all shadow-md"
              >
                <div className="flex items-start gap-3 mb-2.5">
                  <HelpCircle size={18} className="text-[#D1E043] shrink-0 mt-0.5" />
                  <h4 className="font-serif text-base sm:text-lg font-normal text-white leading-snug">
                    {f.q}
                  </h4>
                </div>
                <p className="text-xs sm:text-sm text-[#A1A1A6] leading-relaxed pl-7">
                  {f.a}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
