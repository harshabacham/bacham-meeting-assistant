"use client";

import { motion } from "framer-motion";
import { Sparkles, Terminal, Stethoscope, Scale, Briefcase, Palette, Binary } from "lucide-react";

export default function BuiltForStudents() {
  const fields = [
    { name: "Computer Science & AI", icon: Terminal, desc: "Syntax highlight, stack traces & algorithms", color: "#3B82F6" },
    { name: "Medicine & Biology", icon: Stethoscope, desc: "Dense terminology & anatomical pathways", color: "#EF4444" },
    { name: "Law & Jurisprudence", icon: Scale, desc: "Case citations, precedents & statutory notes", color: "#F59E0B" },
    { name: "Finance & Economics", icon: Briefcase, desc: "Market theories, formulas & spreadsheets", color: "#10B981" },
    { name: "Architecture & Design", icon: Palette, desc: "Diagram understanding & spatial structures", color: "#9B5EFF" },
    { name: "Mathematics & Physics", icon: Binary, desc: "Real-time LaTeX parsing & derivations", color: "#06B6D4" },
  ];

  return (
    <section className="pt-12 pb-32 border-t border-white/[0.06] bg-transparent relative">
      <div className="container mx-auto px-6 max-w-6xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#A6FF00]/20 bg-[#A6FF00]/5 text-xs font-semibold tracking-widest text-[#A6FF00] uppercase mb-4">
            <Sparkles size={12} />
            Universal Versatility
          </div>
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-[#F0F0F0] mb-4">
            Built for rigorous disciplines.
          </h2>
          <p className="text-lg text-[#888888] max-w-2xl mx-auto leading-relaxed">
            Whether it's complex anatomical diagrams, multi-file codebases, or dense legal texts—BACHAM adapts seamlessly.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {fields.map((field, idx) => {
            const Icon = field.icon;
            return (
              <motion.div
                key={field.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08, duration: 0.5 }}
                className="group relative glass-card rounded-2xl p-6 text-left border border-white/[0.07] hover:border-white/[0.18] transition-all duration-300 hover:-translate-y-1 overflow-hidden"
              >
                {/* Glow hover effect */}
                <div
                  className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: `${field.color}20` }}
                />

                <div className="flex items-center gap-3.5 mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/[0.08] bg-white/[0.03] transition-transform duration-300 group-hover:scale-110"
                    style={{ color: field.color }}
                  >
                    <Icon size={20} />
                  </div>
                  <h3 className="text-base font-bold text-[#F0F0F0] tracking-tight">{field.name}</h3>
                </div>

                <p className="text-xs text-[#777777] leading-relaxed pl-0.5">{field.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
