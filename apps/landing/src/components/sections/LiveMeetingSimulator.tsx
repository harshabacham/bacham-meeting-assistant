"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  CheckCircle2,
  Sparkles,
  Sliders,
  Share2,
  Layers,
  Copy,
  Clock,
  User,
  ShieldAlert,
  HardDrive,
  Cpu,
  Lock,
} from "lucide-react";

export function LiveMeetingSimulator() {
  const [activeTab, setActiveTab] = useState<"summary" | "actions" | "slides">("summary");
  const [copied, setCopied] = useState(false);
  const [tasks, setTasks] = useState([
    { id: 1, text: "Finalize local SQLite schema for audio chunk offline indexing", owner: "Harsha", done: false, priority: "High" },
    { id: 2, text: "Verify Chrome Extension WebSocket reconnection timeout (ws://127.0.0.1:1421)", owner: "Alex", done: true, priority: "High" },
    { id: 3, text: "Push auto-generated decision log to Slack #engineering-sync", owner: "Sarah", done: false, priority: "Medium" },
  ]);

  const toggleTask = (id: number) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto rounded-2xl bg-[#0E1013] border border-white/[0.08] shadow-[0_25px_70px_rgba(0,0,0,0.6)] overflow-hidden text-left">
      
      {/* Top Window Chrome Bar */}
      <div className="h-11 px-4 bg-[#14161A] border-b border-white/[0.06] flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56]/80 border border-[#E0443E]" />
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E]/80 border border-[#DEA123]" />
          <div className="w-3 h-3 rounded-full bg-[#27C93F]/80 border border-[#1AAB29]" />
          <span className="ml-3 text-[11.5px] font-medium text-[#8E9099] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Ingestion · Google Meet (Tab #4)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1 text-[10.5px] font-semibold tracking-wider text-[#E2B774] bg-[#E2B774]/10 px-2 py-0.5 rounded-md border border-[#E2B774]/20">
            <Cpu size={10} />
            Whisper v3 Local
          </span>
          <span className="text-[11px] text-[#8E9099] font-mono">00:28:44</span>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
        
        {/* Left 7 Cols: Real-Time Streaming Diarization Transcript */}
        <div className="lg:col-span-7 p-5 sm:p-6 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/[0.06] bg-[#0E1013]/60">
          
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.05] mb-5">
              <div>
                <h3 className="text-base font-bold text-[#FAF9F5] tracking-tight">
                  Q3 Product Architecture & Roadmap Review
                </h3>
                <p className="text-xs text-[#8E9099] mt-0.5 flex items-center gap-2">
                  <span>3 Participants</span>
                  <span>•</span>
                  <span>Audio Dual-Stream Active</span>
                </p>
              </div>

              {/* Simulated Audio Waveform */}
              <div className="flex items-center gap-0.5 h-5 px-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                {[40, 75, 100, 60, 90, 45, 80, 50, 95, 65, 30].map((h, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [`${Math.max(20, h * 0.3)}%`, `${h}%`, `${Math.max(15, h * 0.4)}%`] }}
                    transition={{ repeat: Infinity, duration: 1 + (i % 3) * 0.2, ease: "easeInOut" }}
                    className="w-1 bg-[#E2B774]/70 rounded-full"
                  />
                ))}
              </div>
            </div>

            {/* Transcript Stream */}
            <div className="space-y-4 text-[13px] leading-relaxed">
              {/* Speaker 1 */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                  AL
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#FAF9F5] text-xs">Alex (Lead Architect)</span>
                    <span className="text-[10px] text-[#8E9099] font-mono">10:14:02</span>
                  </div>
                  <p className="text-[#8E9099]">
                    We decided to run all meeting transcription strictly on-device using local Whisper models. That ensures confidential engineering discussions never touch 3rd-party servers.
                  </p>
                </div>
              </div>

              {/* Speaker 2 */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-[#E2B774]/15 border border-[#E2B774]/30 text-[#E2B774] flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                  SA
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#FAF9F5] text-xs">Sarah (Product Lead)</span>
                    <span className="text-[10px] text-[#8E9099] font-mono">10:14:38</span>
                  </div>
                  <p className="text-[#8E9099]">
                    Love it. Let&apos;s log the action item for <span className="text-[#E2B774] font-medium">@Harsha</span> to finalize the SQLite schema and verify the Chrome Extension WebSocket before launch.
                  </p>
                </div>
              </div>

              {/* Speaker 3 */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                  DA
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#FAF9F5] text-xs">David (Infra)</span>
                    <span className="text-[10px] text-[#8E9099] font-mono">10:15:10</span>
                  </div>
                  <p className="text-[#8E9099]">
                    Tested the build on Windows and Mac. Ingestion CPU usage stayed below 3% while capturing audio and slides.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Live Streaming Indicator */}
          <div className="mt-5 pt-3 border-t border-white/[0.04] flex items-center justify-between text-[11.5px] text-[#8E9099]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E2B774] animate-ping" />
              <span>Transcribing live conversation stream...</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-white/50 border border-white/[0.05]">
              Lossless 16kHz WAV
            </span>
          </div>

        </div>

        {/* Right 5 Cols: Automated AI Executive Intelligence */}
        <div className="lg:col-span-5 p-5 sm:p-6 flex flex-col justify-between bg-[#111317]">
          
          <div>
            {/* Header Tabs */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-4">
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/30 border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setActiveTab("summary")}
                  className={`px-3 py-1 rounded-md text-[11.5px] font-semibold transition-all cursor-pointer ${
                    activeTab === "summary"
                      ? "bg-[#E2B774] text-[#090A0C] shadow-sm"
                      : "text-[#8E9099] hover:text-[#FAF9F5]"
                  }`}
                >
                  Brief & Decisions
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("actions")}
                  className={`px-3 py-1 rounded-md text-[11.5px] font-semibold transition-all cursor-pointer ${
                    activeTab === "actions"
                      ? "bg-[#E2B774] text-[#090A0C] shadow-sm"
                      : "text-[#8E9099] hover:text-[#FAF9F5]"
                  }`}
                >
                  Tasks ({tasks.filter((t) => !t.done).length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("slides")}
                  className={`px-3 py-1 rounded-md text-[11.5px] font-semibold transition-all cursor-pointer ${
                    activeTab === "slides"
                      ? "bg-[#E2B774] text-[#090A0C] shadow-sm"
                      : "text-[#8E9099] hover:text-[#FAF9F5]"
                  }`}
                >
                  Slides (2)
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="text-[#8E9099] hover:text-[#FAF9F5] transition-colors p-1 rounded cursor-pointer"
                title="Copy Brief"
              >
                {copied ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {activeTab === "summary" && (
                <motion.div
                  key="summary"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="space-y-4"
                >
                  {/* Executive Summary */}
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#E2B774] block mb-1.5">
                      ✦ Executive Brief
                    </span>
                    <ul className="space-y-1.5 text-[12px] text-[#FAF9F5]/90 leading-relaxed">
                      <li className="flex items-start gap-1.5">
                        <span className="text-[#E2B774] font-bold">•</span>
                        <span>Zero-cloud architecture approved for all core client meeting ingestion.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-[#E2B774] font-bold">•</span>
                        <span>Local Whisper v3 benchmarks confirmed sub-3% CPU overhead across platforms.</span>
                      </li>
                    </ul>
                  </div>

                  {/* Decisions Detected */}
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-[#E2B774]/20 space-y-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#E2B774] flex items-center gap-1.5">
                      <CheckCircle2 size={12} />
                      Decisions Made (Live Detected)
                    </span>
                    <p className="text-[11.5px] text-[#FAF9F5]/80 leading-snug">
                      Ship initial release with offline Whisper + local SQLite fallback before expanding to optional self-hosted Ollama servers.
                    </p>
                  </div>
                </motion.div>
              )}

              {activeTab === "actions" && (
                <motion.div
                  key="actions"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="space-y-2.5"
                >
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#8E9099] block mb-1">
                    Click to Toggle Completion:
                  </span>
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => toggleTask(task.id)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 select-none ${
                        task.done
                          ? "bg-white/[0.01] border-white/[0.04] opacity-50"
                          : "bg-white/[0.03] border-white/[0.08] hover:border-[#E2B774]/40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() => {}}
                        className="rounded border-white/20 mt-0.5 accent-[#E2B774] cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-[12px] leading-snug ${task.done ? "line-through text-[#8E9099]" : "text-[#FAF9F5]"}`}>
                          {task.text}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] text-[#8E9099]">
                            @{task.owner}
                          </span>
                          <span className={`text-[9.5px] font-semibold px-1.5 py-0.2 rounded ${
                            task.priority === "High" ? "text-red-400 bg-red-500/10" : "text-amber-400 bg-amber-500/10"
                          }`}>
                            {task.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {activeTab === "slides" && (
                <motion.div
                  key="slides"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="space-y-3"
                >
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#8E9099] block">
                    Auto-Captured Key Frames:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl overflow-hidden border border-white/[0.08] bg-black/40 p-2 space-y-1.5 group cursor-pointer hover:border-[#E2B774]/50 transition-colors">
                      <div className="h-18 rounded bg-[#181A1F] flex items-center justify-center text-[10px] text-[#8E9099] font-mono">
                        [Architecture Diagram]
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#8E9099]">
                        <span>Slide 4</span>
                        <span className="font-mono">10:14:02</span>
                      </div>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-white/[0.08] bg-black/40 p-2 space-y-1.5 group cursor-pointer hover:border-[#E2B774]/50 transition-colors">
                      <div className="h-18 rounded bg-[#181A1F] flex items-center justify-center text-[10px] text-[#8E9099] font-mono">
                        [Latency Benchmarks]
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#8E9099]">
                        <span>Slide 7</span>
                        <span className="font-mono">10:22:15</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Security Pill */}
          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-[#8E9099]">
            <div className="flex items-center gap-1.5 text-emerald-400/90 font-medium">
              <Lock size={12} />
              <span>100% On-Device Reasoning</span>
            </div>
            <span className="font-mono text-[10.5px]">0 KB Uploaded</span>
          </div>

        </div>

      </div>

      {/* Bottom Technical Guarantee Strip */}
      <div className="px-6 py-2.5 bg-[#090A0C] border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-[11px] text-[#8E9099]">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <HardDrive size={12} className="text-[#E2B774]" />
            Local SQLite Memory
          </span>
          <span className="hidden sm:inline-block">•</span>
          <span className="hidden sm:flex items-center gap-1.5">
            <Cpu size={12} className="text-[#E2B774]" />
            NVIDIA / Apple Metal Acceleration
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20 text-[10px]">
            No Bots Joining Calls
          </span>
        </div>
      </div>

    </div>
  );
}
