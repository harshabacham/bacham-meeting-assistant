"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Laptop,
  Terminal,
  Cpu,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Download,
  Mic,
  Sparkles,
} from "lucide-react";
import { ChromeIcon } from "@/components/ui/ChromeIcon";
import { WashiTape, LocalSsdSticker } from "@/components/ui/CartoonStickers";

export default function QuickStartInstructions() {
  const [activeTab, setActiveTab] = useState<"desktop" | "extension" | "local-ai" | "cli">("desktop");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const tabs = [
    { id: "desktop" as const, label: "Desktop App", icon: Laptop, badge: "Win & Mac" },
    { id: "extension" as const, label: "Chrome Extension", icon: ChromeIcon, badge: "Google Meet" },
    { id: "local-ai" as const, label: "100% Offline AI", icon: Cpu, badge: "Ollama / Whisper" },
    { id: "cli" as const, label: "Build From Source", icon: Terminal, badge: "Developers" },
  ];

  const repoUrl = "https://github.com/harshabacham/bacham-meeting-assistant";

  return (
    <section id="instructions" className="py-24 md:py-32 bg-[#09090B] border-t border-white/10 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 relative">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="text-[11.5px] font-black uppercase tracking-wider text-[#D1E043] select-none">
              Setup &amp; Instructions
            </span>
            <LocalSsdSticker className="scale-85 rotate-2" />
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-[#FFFFFF] leading-tight mb-4">
            Up and running in less than 60 seconds
          </h2>
          <p className="text-base sm:text-lg text-[#A1A1A6] leading-relaxed">
            Choose your preferred workflow. Zero complicated virtual audio cables, zero cloud subscriptions.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-10 overflow-x-auto pb-2 scrollbar-none">
          <div className="inline-flex p-1.5 rounded-full bg-white/10 border border-white/15 shadow-md gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full text-[13px] font-medium transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-[#D1E043] text-[#1E1E1E] shadow-sm font-bold"
                      : "text-[#D1D1D6] hover:text-[#FFFFFF]"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                  <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-full hidden sm:inline-block ${
                    isActive ? "bg-black/15 text-[#1E1E1E]" : "bg-white/10 text-[#A1A1A6]"
                  }`}>
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Container */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.3 }}
            className="rounded-3xl bg-[#0D0D0E] border border-white/10 p-6 sm:p-10 shadow-2xl relative overflow-hidden"
          >
            <WashiTape color="lime" className="absolute -top-2 left-12 -rotate-2 z-20" />

            {/* TAB 1: DESKTOP APP */}
            {activeTab === "desktop" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-6">
                  <div>
                    <span className="text-xs font-mono font-bold text-[#D1E043] uppercase tracking-wider block mb-1">
                      Quick Start · Desktop
                    </span>
                    <h3 className="font-serif text-2xl sm:text-3xl font-normal text-white">
                      Install the standalone desktop client
                    </h3>
                    <p className="text-sm text-[#A1A1A6] mt-2 leading-relaxed">
                      Bacham runs natively on macOS (Apple Silicon / Intel) and Windows 10/11 using Tauri 2.0 with ultra-low RAM usage.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/[0.04] border border-white/10">
                      <span className="w-7 h-7 rounded-full bg-[#D1E043] text-[#1E1E1E] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </span>
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-1">Download &amp; Install the Binary</h4>
                        <p className="text-xs text-[#A1A1A6] leading-relaxed">
                          Grab the latest <span className="text-white font-mono">.msi</span> for Windows or universal <span className="text-white font-mono">.dmg</span> for macOS from GitHub Releases.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/[0.04] border border-white/10">
                      <span className="w-7 h-7 rounded-full bg-[#D1E043] text-[#1E1E1E] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </span>
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-1">Automatic Audio Loopback Verification</h4>
                        <p className="text-xs text-[#A1A1A6] leading-relaxed">
                          On launch, Bacham automatically hooks into your OS audio driver (WASAPI loopback on Windows, CoreAudio on Mac). No virtual cables or extra drivers needed.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/[0.04] border border-white/10">
                      <span className="w-7 h-7 rounded-full bg-[#D1E043] text-[#1E1E1E] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        3
                      </span>
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-1">Start Calling or Attending Lectures</h4>
                        <p className="text-xs text-[#A1A1A6] leading-relaxed">
                          Join any Zoom, Meet, or Teams call. Click <span className="text-[#D1E043] font-semibold">&quot;Capture Call&quot;</span> or press <span className="font-mono text-white bg-white/10 px-1.5 py-0.5 rounded text-[11px]">Alt+Shift+B</span>. When finished, notes and flashcards generate instantly.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-[#121214] border border-white/10 flex flex-col justify-between h-full space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                      <Download size={15} className="text-[#D1E043]" />
                      <span>Release Packages</span>
                    </h4>
                    <p className="text-xs text-[#A1A1A6] leading-relaxed mb-4">
                      Official signed installers available on GitHub with SHA-256 integrity checksums.
                    </p>
                    <div className="space-y-2 text-xs font-mono text-[#D1D1D6]">
                      <div className="flex items-center justify-between p-2 rounded bg-black/40 border border-white/5">
                        <span>Windows (.msi)</span>
                        <span className="text-[#D1E043]">x64</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-black/40 border border-white/5">
                        <span>macOS (.dmg)</span>
                        <span className="text-[#D1E043]">Universal</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-black/40 border border-white/5">
                        <span>Linux (.deb/.AppImage)</span>
                        <span className="text-[#D1E043]">x64</span>
                      </div>
                    </div>
                  </div>

                  <a
                    href="#downloads"
                    className="w-full py-2.5 px-4 rounded-full bg-[#D1E043] hover:bg-[#c4d436] text-[#1E1E1E] font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Go to Download Center</span>
                  </a>
                </div>
              </div>
            )}

            {/* TAB 2: CHROME EXTENSION */}
            {activeTab === "extension" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-6">
                  <div>
                    <span className="text-xs font-mono font-bold text-[#D1E043] uppercase tracking-wider block mb-1">
                      Quick Start · Browser
                    </span>
                    <h3 className="font-serif text-2xl sm:text-3xl font-normal text-white">
                      Use the Zero-Bot Chrome Extension
                    </h3>
                    <p className="text-sm text-[#A1A1A6] mt-2 leading-relaxed">
                      Prefer in-browser controls? The companion extension injects a sleek Floating Action Menu right into Google Meet and Zoom tabs.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/[0.04] border border-white/10">
                      <span className="w-7 h-7 rounded-full bg-[#D1E043] text-[#1E1E1E] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </span>
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-1">Add Extension to Chrome / Brave / Edge</h4>
                        <p className="text-xs text-[#A1A1A6] leading-relaxed">
                          Install from Chrome Web Store or load unpacked from <span className="font-mono text-white">apps/extension/dist</span> in Developer mode.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/[0.04] border border-white/10">
                      <span className="w-7 h-7 rounded-full bg-[#D1E043] text-[#1E1E1E] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </span>
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-1">Open Any Google Meet or Web Call</h4>
                        <p className="text-xs text-[#A1A1A6] leading-relaxed">
                          The discreet Floating Action Menu will appear on the bottom-right. Click <span className="text-[#D1E043] font-semibold">&quot;Start Capture&quot;</span> to begin tab audio capture.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/[0.04] border border-white/10">
                      <span className="w-7 h-7 rounded-full bg-[#D1E043] text-[#1E1E1E] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        3
                      </span>
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-1">Automatic Local Sync</h4>
                        <p className="text-xs text-[#A1A1A6] leading-relaxed">
                          Audio chunks stream over a secure loopback socket (<span className="font-mono text-white text-[11px]">ws://127.0.0.1:1421</span>) straight to your desktop database.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-[#121214] border border-white/10 flex flex-col justify-between h-full space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2">Extension Capabilities</h4>
                    <ul className="space-y-2.5 text-xs text-[#D1D1D6]">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-[#D1E043] shrink-0" />
                        <span>Zero bots in the meeting room</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-[#D1E043] shrink-0" />
                        <span>Chrome tab audio capture API</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-[#D1E043] shrink-0" />
                        <span>Draggable floating action menu</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-[#D1E043] shrink-0" />
                        <span>Offline storage fallback buffer</span>
                      </li>
                    </ul>
                  </div>

                  <a
                    href="https://github.com/harshabacham/bacham-meeting-assistant/tree/main/apps/extension"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-full bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/15 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <ChromeIcon className="w-3.5 h-3.5 text-[#D1E043]" />
                    <span>View Extension Source</span>
                    <ExternalLink size={12} className="opacity-50" />
                  </a>
                </div>
              </div>
            )}

            {/* TAB 3: LOCAL AI SETUP */}
            {activeTab === "local-ai" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-6">
                  <div>
                    <span className="text-xs font-mono font-bold text-[#D1E043] uppercase tracking-wider block mb-1">
                      Quick Start · 100% Offline
                    </span>
                    <h3 className="font-serif text-2xl sm:text-3xl font-normal text-white">
                      Configure Ollama &amp; Local Whisper
                    </h3>
                    <p className="text-sm text-[#A1A1A6] mt-2 leading-relaxed">
                      Run every transcript and summary on your local GPU or CPU. No data ever leaves your computer.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white">1. Start Ollama with Llama 3 or Mistral</span>
                        <button
                          type="button"
                          onClick={() => handleCopy("ollama run llama3", "ollama-cmd")}
                          className="flex items-center gap-1 text-[11px] font-mono text-[#D1E043] hover:underline cursor-pointer"
                        >
                          {copiedCode === "ollama-cmd" ? <Check size={12} /> : <Copy size={12} />}
                          <span>{copiedCode === "ollama-cmd" ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                      <div className="bg-black/60 p-3 rounded-xl font-mono text-xs text-[#D1E043] border border-white/10">
                        ollama run llama3
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white">2. Or Run Local DeepSeek R1</span>
                        <button
                          type="button"
                          onClick={() => handleCopy("ollama run deepseek-r1:8b", "deepseek-cmd")}
                          className="flex items-center gap-1 text-[11px] font-mono text-[#D1E043] hover:underline cursor-pointer"
                        >
                          {copiedCode === "deepseek-cmd" ? <Check size={12} /> : <Copy size={12} />}
                          <span>{copiedCode === "deepseek-cmd" ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                      <div className="bg-black/60 p-3 rounded-xl font-mono text-xs text-[#D1E043] border border-white/10">
                        ollama run deepseek-r1:8b
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/[0.04] border border-white/10">
                      <span className="w-7 h-7 rounded-full bg-[#D1E043] text-[#1E1E1E] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        3
                      </span>
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-1">Select &quot;Ollama Local&quot; in Bacham Settings</h4>
                        <p className="text-xs text-[#A1A1A6] leading-relaxed">
                          In Bacham Settings → AI Engine, toggle to <span className="text-[#D1E043] font-semibold">&quot;Local Ollama&quot;</span>. The app connects to <span className="font-mono text-white text-[11px]">http://localhost:11434</span> automatically.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-[#121214] border border-white/10 flex flex-col justify-between h-full space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2">Supported Local Models</h4>
                    <ul className="space-y-2 text-xs text-[#D1D1D6]">
                      <li className="flex items-center justify-between py-1 border-b border-white/5">
                        <span>Whisper Small / Base</span>
                        <span className="text-[#D1E043] font-mono">Built-in</span>
                      </li>
                      <li className="flex items-center justify-between py-1 border-b border-white/5">
                        <span>Llama 3 / 3.3</span>
                        <span className="text-[#D1E043] font-mono">Ollama</span>
                      </li>
                      <li className="flex items-center justify-between py-1 border-b border-white/5">
                        <span>DeepSeek R1</span>
                        <span className="text-[#D1E043] font-mono">Ollama</span>
                      </li>
                      <li className="flex items-center justify-between py-1 border-b border-white/5">
                        <span>Mistral / Qwen 2.5</span>
                        <span className="text-[#D1E043] font-mono">Ollama</span>
                      </li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-[11px] text-[#A1A1A6]">
                    Prefer cloud speed? You can also optionally paste your personal Claude, OpenAI, or Gemini API keys.
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: BUILD FROM SOURCE */}
            {activeTab === "cli" && (
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-mono font-bold text-[#D1E043] uppercase tracking-wider block mb-1">
                    Developers · Open Source
                  </span>
                  <h3 className="font-serif text-2xl sm:text-3xl font-normal text-white">
                    Build and contribute from source
                  </h3>
                  <p className="text-sm text-[#A1A1A6] mt-2 leading-relaxed">
                    Bacham is 100% open source under the MIT license. Built with Rust, Tauri 2.0, Vite, React 19, and Tailwind CSS.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-black/60 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-zinc-400">1. Clone the repository</span>
                      <button
                        type="button"
                        onClick={() => handleCopy("git clone https://github.com/harshabacham/bacham-meeting-assistant.git", "git-clone")}
                        className="flex items-center gap-1 text-[11px] font-mono text-[#D1E043] hover:underline cursor-pointer"
                      >
                        {copiedCode === "git-clone" ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedCode === "git-clone" ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                    <code className="font-mono text-xs text-[#D1E043] block">
                      git clone https://github.com/harshabacham/bacham-meeting-assistant.git
                    </code>
                  </div>

                  <div className="p-4 rounded-2xl bg-black/60 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-zinc-400">2. Install dependencies &amp; run desktop development server</span>
                      <button
                        type="button"
                        onClick={() => handleCopy("cd bacham-meeting-assistant && pnpm install && pnpm tauri dev", "pnpm-dev")}
                        className="flex items-center gap-1 text-[11px] font-mono text-[#D1E043] hover:underline cursor-pointer"
                      >
                        {copiedCode === "pnpm-dev" ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedCode === "pnpm-dev" ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                    <code className="font-mono text-xs text-[#D1E043] block">
                      cd bacham-meeting-assistant &amp;&amp; pnpm install &amp;&amp; pnpm tauri dev
                    </code>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-[#A1A1A6]">
                      Requires Rust toolchain (`rustup`) and Node.js v20+.
                    </span>
                    <a
                      href={repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-[#D1E043] font-bold hover:underline"
                    >
                      <span>Read CONTRIBUTING.md on GitHub</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>

      </div>
    </section>
  );
}
