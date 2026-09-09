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
];

type FeatureValue = true | false | "partial" | string;

interface Feature {
  name: string;
  values: [FeatureValue, FeatureValue, FeatureValue, FeatureValue]; // Bacham, Granola, Fireflies, Otter
}

const features: Feature[] = [
  {
    name: "No Meeting Bot Required",
    values: [true, true, false, false],
  },
  {
    name: "100% Local / Offline Mode",
    values: [true, false, false, false],
  },
  {
    name: "Dual-Stream Audio Capture",
    values: [true, false, false, false],
  },
  {
    name: "Real-Time Transcription",
    values: [true, true, true, true],
  },
  {
    name: "Auto Action Items",
    values: [true, true, true, true],
  },
  {
    name: "1-Click Study Flashcards",
    values: [true, false, false, false],
  },
  {
    name: "Quiz Generation",
    values: [true, false, false, false],
  },
  {
    name: "Zero Data Telemetry",
    values: [true, false, false, false],
  },
  {
    name: "Open Source",
    values: [true, false, false, false],
  },
  {
    name: "Multiple AI Providers",
    values: [true, "partial", true, false],
  },
  {
    name: "Bring Your Own API Key",
    values: [true, false, false, false],
  },
  {
    name: "No Subscription Required",
    values: [true, false, false, false],
  },
  {
    name: "CRM Integrations",
    values: [false, false, true, "partial"],
  },
  {
    name: "Chrome Extension",
    values: [true, true, true, true],
  },
];

function CellIcon({ value }: { value: FeatureValue }) {
  if (value === true) {
    return (
      <div className="w-7 h-7 rounded-full bg-[#D1E043]/15 flex items-center justify-center">
        <Check size={15} strokeWidth={3} className="text-[#D1E043]" />
      </div>
    );
  }
  if (value === false) {
    return (
      <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center">
        <X size={14} strokeWidth={2.5} className="text-[#555]" />
      </div>
    );
  }
  if (value === "partial") {
    return (
      <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center">
        <Minus size={14} strokeWidth={2.5} className="text-amber-400" />
      </div>
    );
  }
  // String value (e.g. "Unknown")
  return (
    <span className="text-xs text-[#666] uppercase tracking-wide font-medium">
      {value}
    </span>
  );
}

export default function Comparison() {
  return (
    <section id="comparison" className="py-24 md:py-32 bg-[#000000] border-t border-white/10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">

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
              No bots. No subscriptions. No data leaving your device. Here&apos;s how we compare to the big names.
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
          {/* Desktop Table */}
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0A0A0A]">
            <table className="w-full border-collapse">
              {/* Table Header */}
              <thead>
                <tr>
                  <th className="text-left py-5 px-5 text-xs font-bold uppercase tracking-widest text-[#666] border-b border-white/10 w-[240px] min-w-[180px]">
                    Feature
                  </th>
                  {competitors.map((comp, i) => (
                    <th
                      key={comp.name}
                      className={`py-5 px-3 text-center border-b border-white/10 min-w-[120px] ${
                        comp.highlight
                          ? "bg-[#D1E043]/5 border-x border-[#D1E043]/20"
                          : ""
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1.5">
                          {comp.highlight && (
                            <Crown size={13} className="text-[#D1E043]" />
                          )}
                          <span
                            className={`text-sm font-bold tracking-wide ${
                              comp.highlight ? "text-[#D1E043]" : "text-white"
                            }`}
                          >
                            {comp.name}
                          </span>
                          {comp.highlight && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#D1E043] text-[#0A0A0A] tracking-wider">
                              You
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[11px] font-medium ${
                            comp.highlight
                              ? "text-[#D1E043]/70"
                              : "text-[#666]"
                          }`}
                        >
                          {comp.subtitle}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Table Body */}
              <tbody>
                {features.map((feature, idx) => (
                  <tr
                    key={feature.name}
                    className={`transition-colors hover:bg-white/[0.02] ${
                      idx !== features.length - 1
                        ? "border-b border-white/5"
                        : ""
                    }`}
                  >
                    <td className="py-4 px-5 text-sm font-medium text-[#D1D1D6]">
                      {feature.name}
                    </td>
                    {feature.values.map((val, i) => (
                      <td
                        key={i}
                        className={`py-4 px-3 text-center ${
                          competitors[i].highlight
                            ? "bg-[#D1E043]/[0.03] border-x border-[#D1E043]/10"
                            : ""
                        }`}
                      >
                        <div className="flex items-center justify-center">
                          <CellIcon value={val} />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom note */}
          <div className="mt-6 text-center">
            <p className="text-[11px] text-[#555] leading-relaxed">
              Comparison based on publicly available information as of 2025. Features and pricing may change.
              <br />
              &quot;Partial&quot; means limited support or only available on higher-tier plans.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
