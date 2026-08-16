"use client";

import { motion } from "framer-motion";
import FeaturesSectionDemo from "@/components/ui/features-section-demo-2";
import { Sparkles } from "lucide-react";

export default function FeaturesGrid() {
  return (
    <section id="features" className="py-32 border-t border-white/[0.06] bg-transparent relative z-10">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="mb-16 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#A6FF00]/20 bg-[#A6FF00]/5 text-xs font-semibold tracking-widest text-[#A6FF00] uppercase mb-4">
            <Sparkles size={12} />
            Feature Ecosystem
          </div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-extrabold tracking-tighter text-[#F0F0F0] mb-4"
          >
            Engineered for depth.
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-[#888888]"
          >
            The comprehensive offline intelligence toolkit designed for speed, privacy, and zero cognitive overhead.
          </motion.p>
        </div>

        <FeaturesSectionDemo />
      </div>
    </section>
  );
}
