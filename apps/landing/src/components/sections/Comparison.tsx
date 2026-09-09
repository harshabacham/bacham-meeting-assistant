"use client";

import { motion } from "framer-motion";
import { Check, X, Minus, ExternalLink } from "lucide-react";

interface Competitor {
  name: string;
  price: string;
  isYou?: boolean;
}

const competitors: Competitor[] = [
  { name: "Bacham", price: "Free Forever", isYou: true },
  { name: "Granola", price: "$14/mo" },
  { name: "Fireflies", price: "$10/mo+" },
  { name: "Otter.ai", price: "$8.33/mo+" },
  { name: "Fathom", price: "$19/mo+" },
  { name: "tl;dv", price: "$18/mo+" },
  { name: "Read.ai", price: "$15/mo+" },
];

type FeatureValue = true | false | "partial";

interface FeatureRow {
  name: string;
  values: FeatureValue[];
}

const features: FeatureRow[] = [
  {
    name: "100% Open Source",
    values: [true, false, false, false, false, false, false],
  },
  {
    name: "Zero Cloud Audio (100% Local)",
    values: [true, false, false, false, false, false, false],
  },
  {
    name: "Zero Data Telemetry",
    values: [true, "partial", false, false, false, false, false],
  },
  {
    name: "No Meeting Bot (100% Invisible)",
    values: [true, true, false, false, false, false, false],
  },
  {
    name: "Dual-Stream Audio Capture",
    values: [true, "partial", false, false, false, false, false],
  },
  {
    name: "Real-Time Live Transcription",
    values: [true, true, true, true, true, true, true],
  },
  {
    name: "AI Summaries & Action Items",
    values: [true, true, true, true, true, true, true],
  },
  {
    name: "1-Click Study Flashcards",
    values: [true, false, false, false, false, false, false],
  },
  {
    name: "Interactive AI Quizzes",
    values: [true, false, false, false, false, false, false],
  },
  {
    name: "Private API Keys (BYOK)",
    values: [true, false, false, false, false, false, false],
  },
  {
    name: "Offline Mode (Local Whisper)",
    values: [true, false, false, false, false, false, false],
  },
  {
    name: "All Features 100% Free",
    values: [true, false, false, false, false, false, false],
  },
  {
    name: "No Monthly Subscriptions",
    values: [true, false, false, false, false, false, false],
  },
  {
    name: "Unlimited Meeting Duration",
    values: [true, "partial", false, false, false, false, false],
  },
];

function StatusIcon({ value, isYou }: { value: FeatureValue; isYou?: boolean }) {
  if (value === true) {
    if (isYou) {
      return (
        <div className="w-6 h-6 rounded-full bg-[#D1E043]/15 flex items-center justify-center mx-auto">
          <Check size={13} strokeWidth={3} className="text-[#D1E043]" />
        </div>
      );
    }
    return (
      <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
        <Check size={13} strokeWidth={2.4} className="text-emerald-400" />
      </div>
    );
  }

  if (value === "partial") {
    return (
      <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
        <Minus size={12} strokeWidth={2.4} className="text-amber-400/90" />
      </div>
    );
  }

  return (
    <div className="w-6 h-6 rounded-full bg-white/[0.03] flex items-center justify-center mx-auto">
      <X size={12} strokeWidth={2} className="text-[#444]" />
    </div>
  );
}

export default function Comparison() {
  const repoUrl = "https://github.com/harshabacham/bacham-meeting-assistant";

  return (
    <section
      id="comparison"
      className="py-20 md:py-28 bg-[#000000] border-t border-white/10 relative overflow-hidden scroll-mt-16"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block px-3 py-1 rounded-full bg-[#D1E043]/10 text-[#D1E043] text-xs font-bold uppercase tracking-widest mb-3 border border-[#D1E043]/20">
              Comparison
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-white tracking-[-0.02em] mb-3">
              See how Bacham stacks up
            </h2>
            <p className="text-[#A1A1A6] text-sm sm:text-base leading-relaxed">
              100% open source, zero subscriptions, and no uninvited bots.
            </p>
          </motion.div>
        </div>

        {/* Minimalist Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="rounded-2xl border border-white/10 bg-[#0A0A0A] overflow-hidden"
        >
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <table className="w-full border-collapse text-left min-w-[860px]">
              {/* Header */}
              <thead>
                <tr className="border-b border-white/10 bg-[#0D0D0E]">
                  <th className="py-4 px-5 text-xs font-semibold uppercase tracking-wider text-[#71717A] sticky left-0 bg-[#0D0D0E] z-20 w-[240px] min-w-[200px] border-r border-white/5">
                    Feature
                  </th>

                  {competitors.map((comp) => (
                    <th
                      key={comp.name}
                      className={`py-4 px-3 text-center min-w-[105px] ${
                        comp.isYou
                          ? "bg-[#D1E043]/[0.05] border-x border-[#D1E043]/25"
                          : "border-r border-white/5"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-sm font-semibold tracking-tight ${
                              comp.isYou ? "text-[#D1E043] font-bold" : "text-white"
                            }`}
                          >
                            {comp.name}
                          </span>
                          {comp.isYou && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-[#D1E043] text-[#0A0A0A] tracking-wider">
                              You
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-xs ${
                            comp.isYou
                              ? "text-[#D1E043]/80 font-medium"
                              : "text-[#71717A]"
                          }`}
                        >
                          {comp.price}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Rows */}
              <tbody>
                {features.map((row, idx) => (
                  <tr
                    key={row.name}
                    className={`transition-colors hover:bg-white/[0.02] ${
                      idx !== features.length - 1 ? "border-b border-white/5" : ""
                    }`}
                  >
                    {/* Feature Title (Sticky) */}
                    <td className="py-3.5 px-5 text-sm font-medium text-[#D4D4D8] sticky left-0 bg-[#0A0A0A] z-10 border-r border-white/5">
                      {row.name}
                    </td>

                    {/* Columns */}
                    {row.values.map((val, i) => {
                      const isYou = competitors[i].isYou;

                      return (
                        <td
                          key={i}
                          className={`py-3.5 px-2 text-center ${
                            isYou
                              ? "bg-[#D1E043]/[0.03] border-x border-[#D1E043]/20"
                              : "border-r border-white/5"
                          }`}
                        >
                          <StatusIcon value={val} isYou={isYou} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Minimal Bottom Bar */}
          <div className="py-3 px-5 bg-[#0D0D0E] border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-[#71717A]">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Check size={12} className="text-[#D1E043]" strokeWidth={2.5} />
                <span>Included</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Minus size={12} className="text-amber-400" strokeWidth={2.5} />
                <span>Partial</span>
              </div>
              <div className="flex items-center gap-1.5">
                <X size={12} className="text-[#555]" strokeWidth={2.5} />
                <span>Not Available</span>
              </div>
            </div>

            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[#A1A1A6] hover:text-[#D1E043] transition-colors inline-flex items-center gap-1 font-medium"
            >
              <span>Inspect code on GitHub</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
