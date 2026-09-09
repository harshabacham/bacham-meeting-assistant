"use client";

import { motion } from "framer-motion";
import { Check, X, Minus, Crown } from "lucide-react";

const competitors = [
  {
    name: "Bacham",
    subtitle: "Free Forever",
    highlight: true,
  },
  {
    name: "Granola",
    subtitle: "$14/mo",
    highlight: false,
  },
  {
    name: "Fireflies",
    subtitle: "$10/mo",
    highlight: false,
  },
  {
    name: "Otter.ai",
    subtitle: "$8.33/mo",
    highlight: false,
  },
  {
    name: "Fathom",
    subtitle: "$19/mo",
    highlight: false,
  },
  {
    name: "Tactiq",
    subtitle: "$8/mo",
    highlight: false,
  },
];

type FeatureValue = true | false | "partial" | string;

interface FeatureGroup {
  category: string;
  features: {
    name: string;
    values: FeatureValue[]; // Bacham, Granola, Fireflies, Otter, Fathom, Tactiq
  }[];
}

const featureGroups: FeatureGroup[] = [
  {
    category: "🔒 Privacy & Data",
    features: [
      {
        name: "100% Local / Offline Mode",
        values: [true, false, false, false, false, false],
      },
      {
        name: "Zero Data Telemetry",
        values: [true, false, false, false, false, false],
      },
      {
        name: "Data Stored on Your SSD",
        values: [true, false, false, false, false, "partial"],
      },
      {
        name: "No Cloud Upload Required",
        values: [true, false, false, false, false, false],
      },
      {
        name: "Private & Local API Keys (BYOK)",
        values: [true, false, false, false, false, false],
      },
    ],
  },
  {
    category: "🧠 Intelligence",
    features: [
      {
        name: "Real-Time Transcription",
        values: [true, true, true, true, true, true],
      },
      {
        name: "Auto Action Items & Decisions",
        values: [true, true, true, true, true, true],
      },
      {
        name: "1-Click Study Flashcards",
        values: [true, false, false, false, false, false],
      },
      {
        name: "AI Quiz Generation",
        values: [true, false, false, false, false, false],
      },
      {
        name: "Semantic Search Across Meetings",
        values: [true, "partial", true, true, true, false],
      },
      {
        name: "Multiple AI Providers (Whisper, Ollama, Gemini)",
        values: [true, "partial", false, false, false, false],
      },
    ],
  },
  {
    category: "🎙️ Audio & Capture",
    features: [
      {
        name: "No Meeting Bot Required",
        values: [true, true, false, false, false, true],
      },
      {
        name: "Dual-Stream Audio (Mic + System)",
        values: [true, false, false, false, false, false],
      },
      {
        name: "System Loopback Capture",
        values: [true, false, false, false, false, false],
      },
      {
        name: "Speaker Attribution",
        values: [true, true, true, true, true, "partial"],
      },
    ],
  },
  {
    category: "💻 Open Source & Freedom",
    features: [
      {
        name: "Fully Open Source",
        values: [true, false, false, false, false, false],
      },
      {
        name: "Auditable Codebase (No Hidden Telemetry)",
        values: [true, false, false, false, false, false],
      },
      {
        name: "Self-Hostable",
        values: [true, false, false, false, false, false],
      },
      {
        name: "Community Contributions Welcome",
        values: [true, false, false, false, false, false],
      },
      {
        name: "No Vendor Lock-In",
        values: [true, false, false, false, false, false],
      },
      {
        name: "Export All Data (Open Formats)",
        values: [true, false, "partial", "partial", "partial", "partial"],
      },
    ],
  },
  {
    category: "💰 Pricing",
    features: [
      {
        name: "All Features 100% Free",
        values: [true, false, false, false, false, false],
      },
      {
        name: "No Subscription Required",
        values: [true, false, false, false, false, false],
      },
      {
        name: "No Per-Seat Pricing",
        values: [true, false, false, false, false, false],
      },
      {
        name: "No Usage Caps / Minute Limits",
        values: [true, false, false, false, "partial", false],
      },
    ],
  },
];

function CellIcon({ value, isHighlight }: { value: FeatureValue; isHighlight: boolean }) {
  if (value === true) {
    return (
      <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center ${
        isHighlight ? "bg-[#D1E043]/20" : "bg-emerald-500/10"
      }`}>
        <Check size={14} strokeWidth={3} className={isHighlight ? "text-[#D1E043]" : "text-emerald-400"} />
      </div>
    );
  }
  if (value === false) {
    return (
      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/5 flex items-center justify-center">
        <X size={13} strokeWidth={2.5} className="text-[#444]" />
      </div>
    );
  }
  if (value === "partial") {
    return (
      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-500/10 flex items-center justify-center">
        <Minus size={13} strokeWidth={2.5} className="text-amber-400" />
      </div>
    );
  }
  return (
    <span className="text-[10px] text-[#555] uppercase tracking-wide font-medium">
      {value}
    </span>
  );
}

export default function Comparison() {
  return (
    <section id="comparison" className="py-24 md:py-32 bg-[#000000] border-t border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-3 py-1 rounded-full bg-[#D1E043]/10 text-[#D1E043] text-xs font-bold uppercase tracking-widest mb-4 border border-[#D1E043]/20">
              Comparison
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-white leading-tight tracking-[-0.02em] mb-4">
              See how Bacham stacks up
            </h2>
            <p className="text-[#A1A1A6] text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
              The only open-source, local-first meeting AI. No bots, no subscriptions, no data leaving your device.
            </p>
          </motion.div>
        </div>

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="relative"
        >
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0A0A0A]">
            <table className="w-full border-collapse min-w-[800px]">

              {/* Sticky Header */}
              <thead className="sticky top-0 z-10 bg-[#0A0A0A]">
                <tr>
                  <th className="text-left py-5 px-4 sm:px-5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#555] border-b border-white/10 w-[220px] min-w-[180px]">
                    Feature
                  </th>
                  {competitors.map((comp) => (
                    <th
                      key={comp.name}
                      className={`py-5 px-2 sm:px-3 text-center border-b min-w-[100px] ${
                        comp.highlight
                          ? "bg-[#D1E043]/[0.06] border-b-[#D1E043]/30 border-x border-x-[#D1E043]/15"
                          : "border-b-white/10"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1">
                          {comp.highlight && (
                            <Crown size={12} className="text-[#D1E043]" />
                          )}
                          <span
                            className={`text-xs sm:text-sm font-bold tracking-wide ${
                              comp.highlight ? "text-[#D1E043]" : "text-white"
                            }`}
                          >
                            {comp.name}
                          </span>
                          {comp.highlight && (
                            <span className="text-[8px] sm:text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#D1E043] text-[#0A0A0A] tracking-wider">
                              You
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[10px] sm:text-[11px] font-medium ${
                            comp.highlight
                              ? "text-[#D1E043]/70"
                              : "text-[#555]"
                          }`}
                        >
                          {comp.subtitle}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Grouped Body */}
              <tbody>
                {featureGroups.map((group) => (
                  <>
                    {/* Category Header Row */}
                    <tr key={`cat-${group.category}`}>
                      <td
                        colSpan={competitors.length + 1}
                        className="py-3 px-4 sm:px-5 bg-white/[0.03] border-y border-white/10"
                      >
                        <span className="text-xs sm:text-sm font-bold text-white tracking-wide">
                          {group.category}
                        </span>
                      </td>
                    </tr>

                    {/* Feature Rows */}
                    {group.features.map((feature, idx) => (
                      <tr
                        key={feature.name}
                        className={`transition-colors hover:bg-white/[0.02] ${
                          idx !== group.features.length - 1
                            ? "border-b border-white/5"
                            : ""
                        }`}
                      >
                        <td className="py-3.5 px-4 sm:px-5 text-xs sm:text-sm font-medium text-[#C8C8CC]">
                          {feature.name}
                        </td>
                        {feature.values.map((val, i) => (
                          <td
                            key={i}
                            className={`py-3.5 px-2 sm:px-3 text-center ${
                              competitors[i].highlight
                                ? "bg-[#D1E043]/[0.03] border-x border-x-[#D1E043]/10"
                                : ""
                            }`}
                          >
                            <div className="flex items-center justify-center">
                              <CellIcon value={val} isHighlight={competitors[i].highlight} />
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-[11px] text-[#555]">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-[#D1E043]/20 flex items-center justify-center">
                <Check size={10} strokeWidth={3} className="text-[#D1E043]" />
              </div>
              <span>Supported</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Minus size={10} strokeWidth={3} className="text-amber-400" />
              </div>
              <span>Partial / Paid tier only</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-white/5 flex items-center justify-center">
                <X size={10} strokeWidth={3} className="text-[#444]" />
              </div>
              <span>Not available</span>
            </div>
          </div>

          <p className="mt-4 text-center text-[10px] text-[#444] leading-relaxed">
            Based on publicly available information as of 2025. Features and pricing may change.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
