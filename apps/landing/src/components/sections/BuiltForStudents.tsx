"use client";

import { motion } from "framer-motion";

export default function BuiltForStudents() {
  const majors = [
    { name: "Engineering", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    { name: "Medicine", color: "bg-red-500/10 text-red-400 border-red-500/20" },
    { name: "Law", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    { name: "Business", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    { name: "Design", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
    { name: "Programming", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" }
  ];

  return (
    <section className="pt-12 pb-32 border-t border-white/5 bg-transparent">
      <div className="container mx-auto px-6 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-5xl font-serif tracking-tight text-[#F5F5F5] mb-6">
            Built for rigorous fields.
          </h2>
          <p className="text-xl text-[#A0A0A0] max-w-2xl mx-auto mb-16">
            Whether it's complex anatomical diagrams, multi-file codebases, or dense legal texts—BACHAM adapts.
          </p>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
          {majors.map((major, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              className={`px-6 py-3 rounded-full border ${major.color} font-medium text-lg shadow-sm`}
            >
              {major.name}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
