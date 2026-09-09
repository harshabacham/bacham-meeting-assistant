"use client";

import { motion } from "framer-motion";
import {
  Check,
  X,
  Minus,
  Crown,
  Lock,
  ExternalLink,
  ShieldCheck,
  Code2,
  Sparkles,
} from "lucide-react";

function GithubIcon({ className = "w-5 h-5", size }: { className?: string; size?: number }) {
  const dimension = size || 20;
  return (
    <svg
      width={dimension}
      height={dimension}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

interface Competitor {
  name: string;
  subtitle: string;
  annualEst: string;
  isOpenSource: boolean;
  highlight?: boolean;
}

const competitors: Competitor[] = [
  {
    name: "Bacham",
    subtitle: "Free Forever",
    annualEst: "$0/year",
    isOpenSource: true,
    highlight: true,
  },
  {
    name: "Granola",
    subtitle: "$14/mo",
    annualEst: "$168/yr",
    isOpenSource: false,
  },
  {
    name: "Fireflies",
    subtitle: "$10–$19/mo",
    annualEst: "$120–$228/yr",
    isOpenSource: false,
  },
  {
    name: "Otter.ai",
    subtitle: "$8.33–$16/mo",
    annualEst: "$100–$192/yr",
    isOpenSource: false,
  },
  {
    name: "Fathom",
    subtitle: "$19–$32/mo",
    annualEst: "$228–$384/yr",
    isOpenSource: false,
  },
  {
    name: "tl;dv",
    subtitle: "$18–$29/mo",
    annualEst: "$216–$348/yr",
    isOpenSource: false,
  },
  {
    name: "Read.ai",
    subtitle: "$15–$25/mo",
    annualEst: "$180–$300/yr",
    isOpenSource: false,
  },
];

type FeatureValue = true | false | "partial" | string;

interface FeatureItem {
  name: string;
  description?: string;
  isImportant?: boolean;
  values: [
    FeatureValue, // Bacham
    FeatureValue, // Granola
    FeatureValue, // Fireflies
    FeatureValue, // Otter.ai
    FeatureValue, // Fathom
    FeatureValue, // tl;dv
    FeatureValue // Read.ai
  ];
}

interface FeatureCategory {
  category: string;
  items: FeatureItem[];
}

const comparisonData: FeatureCategory[] = [
  {
    category: "Open Source & Security Architecture",
    items: [
      {
        name: "100% Open Source Codebase",
        description: "Publicly auditable on GitHub, no proprietary black boxes",
        isImportant: true,
        values: ["100% Open", "Closed", "Closed", "Closed", "Closed", "Closed", "Closed"],
      },
      {
        name: "Zero Audio Stored on Cloud",
        description: "Audio stays exclusively on your local disk",
        isImportant: true,
        values: [true, false, false, false, false, false, false],
      },
      {
        name: "Zero Data Telemetry & Model Training",
        description: "Your conversations are never harvested to train models",
        isImportant: true,
        values: [true, "partial", false, false, false, false, false],
      },
      {
        name: "Bring Your Own API Keys (BYOK)",
        description: "Direct connection to Gemini, OpenAI, Groq, or Ollama",
        isImportant: true,
        values: [true, false, false, false, false, false, false],
      },
      {
        name: "Local Offline AI (Whisper & Ollama)",
        description: "Run transcription and intelligence without internet",
        values: [true, false, false, false, false, false, false],
      },
    ],
  },
  {
    category: "Meeting & Capture Experience",
    items: [
      {
        name: "No Meeting Bot Required (100% Invisible)",
        description: "Captures audio without an awkward bot joining your call",
        isImportant: true,
        values: [true, true, false, false, false, false, false],
      },
      {
        name: "Dual-Stream Native Audio Capture",
        description: "Simultaneously records internal speaker + microphone cleanly",
        values: [true, "partial", false, false, false, false, false],
      },
      {
        name: "Works with Any Audio Source",
        description: "Zoom, Meet, Teams, Loom, YouTube, Discord, or WhatsApp",
        values: [true, true, "partial", "partial", "partial", "partial", "partial"],
      },
      {
        name: "Real-Time Live Transcription",
        description: "Instant speech-to-text as the conversation happens",
        values: [true, true, true, true, true, true, true],
      },
      {
        name: "Automated Summary & Action Items",
        description: "One-click structured meeting minutes with follow-ups",
        values: [true, true, true, true, true, true, true],
      },
    ],
  },
  {
    category: "Active Learning & Knowledge Tools",
    items: [
      {
        name: "1-Click Study Flashcards Generator",
        description: "Turn lectures & complex discussions into review decks",
        isImportant: true,
        values: [true, false, false, false, false, false, false],
      },
      {
        name: "Interactive AI Quiz Generation",
        description: "Test retention and recall with auto-generated quizzes",
        isImportant: true,
        values: [true, false, false, false, false, false, false],
      },
      {
        name: "Multi-Model AI Switcher",
        description: "Switch between Claude, GPT-4o, Gemini 2.0 Flash, or local",
        values: [true, "partial", false, false, false, false, false],
      },
    ],
  },
  {
    category: "Pricing & Freedom",
    items: [
      {
        name: "All Core Features Free Forever",
        description: "No trial expiration, no locked essential features",
        isImportant: true,
        values: ["$0 Free", "$14/mo", "$10/mo+", "$8.33/mo+", "$19/mo+", "$18/mo+", "$15/mo+"],
      },
      {
        name: "No Monthly Recurring Subscriptions",
        description: "Save $120–$380 every single year",
        values: [true, false, false, false, false, false, false],
      },
      {
        name: "No Meeting Quotas or Duration Limits",
        description: "Unlimited meeting minutes and recordings",
        values: [true, "25 notes/mo", "Limited", "300 mins/mo", "Limited", "Limited", "Limited"],
      },
    ],
  },
];

function CellIcon({ value }: { value: FeatureValue }) {
  if (value === true) {
    return (
      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#D1E043]/15 flex items-center justify-center mx-auto border border-[#D1E043]/30 shadow-[0_0_12px_rgba(209,224,67,0.15)]">
        <Check size={14} strokeWidth={3} className="text-[#D1E043]" />
      </div>
    );
  }
  if (value === false) {
    return (
      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto border border-white/5">
        <X size={13} strokeWidth={2.5} className="text-[#555]" />
      </div>
    );
  }
  if (value === "partial") {
    return (
      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto border border-amber-500/20">
        <Minus size={13} strokeWidth={2.5} className="text-amber-400" />
      </div>
    );
  }
  if (value === "100% Open") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#D1E043] text-[#0A0A0A] shadow-[0_0_12px_rgba(209,224,67,0.3)]">
        <Check size={12} strokeWidth={3} />
        Open
      </span>
    );
  }
  if (value === "Closed") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#777]">
        <Lock size={10} className="text-[#555]" />
        Closed
      </span>
    );
  }
  if (value === "$0 Free") {
    return (
      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-black bg-[#D1E043] text-[#0A0A0A] tracking-wide shadow-[0_0_12px_rgba(209,224,67,0.25)]">
        $0 FREE
      </span>
    );
  }
  // String value (e.g. price or limit)
  return (
    <span className="text-[11px] sm:text-xs text-[#8E8E93] font-medium leading-tight">
      {value}
    </span>
  );
}

export default function Comparison() {
  const repoUrl = "https://github.com/harshabacham/bacham-meeting-assistant";

  return (
    <section id="comparison" className="py-24 md:py-32 bg-[#000000] border-t border-white/10 relative overflow-hidden scroll-mt-16">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[#D1E043]/[0.03] rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D1E043]/10 border border-[#D1E043]/25 text-[#D1E043] text-xs font-bold uppercase tracking-wider mb-4 shadow-[0_0_20px_rgba(209,224,67,0.15)]">
              <Code2 size={13} className="text-[#D1E043]" />
              <span>100% Free &amp; Open Source Alternative</span>
            </div>

            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-white leading-tight tracking-[-0.02em] mb-4 text-balance">
              See how Bacham stacks up against the rest
            </h2>
            <p className="text-[#A1A1A6] text-base sm:text-lg leading-relaxed max-w-2xl mx-auto text-balance">
              Commercial meeting tools charge up to <span className="text-white font-medium">$380/year</span> and send your private audio to corporate servers. Bacham is completely <span className="text-[#D1E043] font-semibold">open source</span>, 100% local, and free forever.
            </p>
          </motion.div>
        </div>

        {/* Open Source Highlight Showcase Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-10 rounded-2xl border border-[#D1E043]/30 bg-gradient-to-r from-[#D1E043]/[0.08] via-[#0A0A0A] to-[#D1E043]/[0.04] p-5 sm:p-7 relative overflow-hidden backdrop-blur-sm"
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#D1E043]/15 border border-[#D1E043]/30 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(209,224,67,0.2)]">
                <GithubIcon size={24} className="text-[#D1E043]" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="text-sm font-bold tracking-wide uppercase px-2 py-0.5 rounded bg-[#D1E043] text-[#0A0A0A]">
                    Open Source Guarantee
                  </span>
                  <span className="text-xs text-[#8E8E93]">Apache 2.0 / MIT Licensed</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-1">
                  Your private conversations shouldn&apos;t live in a corporate cloud.
                </h3>
                <p className="text-sm text-[#A1A1A6] max-w-3xl leading-relaxed">
                  Every single line of Bacham is open source on GitHub. You can inspect the audio capture pipeline, verify zero telemetry, compile it yourself, or connect your own local Ollama models. No vendor lock-in, no hidden tracking, and no subscriptions.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0 w-full lg:w-auto">
              <a
                href={repoUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#D1E043] text-[#0A0A0A] font-bold text-sm hover:bg-[#b8c635] transition-all shadow-[0_0_25px_rgba(209,224,67,0.3)] hover:scale-[1.02] active:scale-[0.98]"
              >
                <GithubIcon size={16} />
                <span>View Code on GitHub</span>
                <ExternalLink size={14} className="opacity-70" />
              </a>
              <a
                href={`${repoUrl}/stargazers`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-sm hover:bg-white/10 hover:border-white/20 transition-all"
              >
                <Sparkles size={15} className="text-[#D1E043]" />
                <span>Star Repository</span>
              </a>
            </div>
          </div>
        </motion.div>

        {/* Scroll hint for mobile & tablet */}
        <div className="flex items-center justify-between text-xs text-[#777] mb-3 px-1 lg:hidden">
          <span>← Scroll table horizontally to compare all 7 tools</span>
          <span className="text-[#D1E043] font-medium">Bacham column highlighted</span>
        </div>

        {/* Comparison Table Container */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative rounded-2xl border border-white/10 bg-[#0A0A0A] shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden"
        >
          {/* Table Wrapper with horizontal scroll */}
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <table className="w-full border-collapse text-left min-w-[960px]">
              {/* Header */}
              <thead>
                <tr className="border-b border-white/10 bg-[#0D0D0D]">
                  {/* Feature column label (Sticky) */}
                  <th className="py-5 px-5 text-xs font-bold uppercase tracking-widest text-[#71717A] sticky left-0 bg-[#0D0D0D] z-20 w-[260px] min-w-[240px] border-r border-white/5">
                    Tool & Feature
                  </th>

                  {/* Competitor columns */}
                  {competitors.map((comp) => (
                    <th
                      key={comp.name}
                      className={`py-5 px-3 text-center min-w-[125px] transition-colors ${
                        comp.highlight
                          ? "bg-[#D1E043]/[0.08] border-x-2 border-[#D1E043]/40 relative"
                          : "border-r border-white/5"
                      }`}
                    >
                      {comp.highlight && (
                        <div className="absolute -top-[1px] left-0 right-0 h-[3px] bg-[#D1E043] shadow-[0_0_12px_#D1E043]" />
                      )}

                      <div className="flex flex-col items-center gap-1.5">
                        {/* Name & Badges */}
                        <div className="flex items-center gap-1.5">
                          {comp.highlight && (
                            <Crown size={14} className="text-[#D1E043] shrink-0" />
                          )}
                          <span
                            className={`text-sm font-bold tracking-tight ${
                              comp.highlight ? "text-[#D1E043]" : "text-white"
                            }`}
                          >
                            {comp.name}
                          </span>
                        </div>

                        {/* Tag: You / Open Source vs Proprietary */}
                        {comp.highlight ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-[#D1E043] text-[#0A0A0A] tracking-wider shadow-sm">
                              YOU • OPEN SOURCE
                            </span>
                          </div>
                        ) : (
                          <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-white/5 text-[#71717A]">
                            Closed Source
                          </span>
                        )}

                        {/* Price subtitle */}
                        <div className="flex flex-col items-center">
                          <span
                            className={`text-xs font-semibold ${
                              comp.highlight ? "text-[#D1E043]" : "text-[#A1A1A6]"
                            }`}
                          >
                            {comp.subtitle}
                          </span>
                          <span className="text-[10px] text-[#555]">
                            {comp.annualEst}
                          </span>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Body categorized */}
              {comparisonData.map((cat, catIdx) => (
                <tbody key={`cat-${catIdx}`}>
                    {/* Category Divider Header */}
                    <tr className="bg-white/[0.02] border-y border-white/10">
                      <td
                        colSpan={competitors.length + 1}
                        className="py-3 px-5 text-xs font-bold uppercase tracking-wider text-[#D1E043] bg-gradient-to-r from-[#D1E043]/10 via-transparent to-transparent"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#D1E043]" />
                          <span>{cat.category}</span>
                        </div>
                      </td>
                    </tr>

                    {/* Category Items */}
                    {cat.items.map((item, itemIdx) => {
                      const isLastItem =
                        catIdx === comparisonData.length - 1 &&
                        itemIdx === cat.items.length - 1;

                      return (
                        <tr
                          key={item.name}
                          className={`group transition-colors hover:bg-white/[0.02] ${
                            !isLastItem ? "border-b border-white/5" : ""
                          } ${
                            item.isImportant
                              ? "bg-white/[0.01]"
                              : ""
                          }`}
                        >
                          {/* Feature Name & Description (Sticky) */}
                          <td className="py-3.5 px-5 text-left sticky left-0 bg-[#0A0A0A] group-hover:bg-[#0E0E0E] z-10 border-r border-white/5">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-xs sm:text-sm font-medium ${
                                    item.isImportant
                                      ? "text-white font-semibold"
                                      : "text-[#D1D1D6]"
                                  }`}
                                >
                                  {item.name}
                                </span>
                                {item.name.includes("Open Source") && (
                                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-[#D1E043]/20 text-[#D1E043] border border-[#D1E043]/30">
                                    Key
                                  </span>
                                )}
                              </div>
                              {item.description && (
                                <span className="text-[11px] text-[#71717A] leading-snug max-w-[230px]">
                                  {item.description}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Values per competitor */}
                          {item.values.map((val, i) => {
                            const isBacham = competitors[i].highlight;

                            return (
                              <td
                                key={i}
                                className={`py-3.5 px-2 text-center transition-colors ${
                                  isBacham
                                    ? "bg-[#D1E043]/[0.05] group-hover:bg-[#D1E043]/[0.09] border-x-2 border-[#D1E043]/30"
                                    : "border-r border-white/5"
                                }`}
                              >
                                <div className="flex items-center justify-center">
                                  <CellIcon value={val} />
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                </tbody>
              ))}
            </table>
          </div>

          {/* Bottom Callout & Legend */}
          <div className="p-5 sm:p-6 bg-[#0D0D0D] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#71717A]">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-[#D1E043]/20 flex items-center justify-center border border-[#D1E043]/40">
                  <Check size={10} className="text-[#D1E043]" strokeWidth={3} />
                </div>
                <span>Included / Supported</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/30">
                  <Minus size={10} className="text-amber-400" strokeWidth={3} />
                </div>
                <span>Partial / Plan-Restricted</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                  <X size={10} className="text-[#666]" strokeWidth={3} />
                </div>
                <span>Not Available / Closed</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#D1E043]" />
              <span className="text-xs text-[#A1A1A6]">
                Data verified from official competitor pricing pages (2025/2026).
              </span>
            </div>
          </div>
        </motion.div>

        {/* Community Open Source Call to Action */}
        <div className="mt-12 text-center">
          <p className="text-xs sm:text-sm text-[#71717A]">
            Want to see how it works under the hood?{" "}
            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[#D1E043] hover:underline font-semibold inline-flex items-center gap-1"
            >
              Check out our GitHub repository
              <ExternalLink size={12} />
            </a>{" "}
            — PRs, issues, and feature ideas welcome.
          </p>
        </div>

      </div>
    </section>
  );
}
