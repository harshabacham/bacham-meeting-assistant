"use client";

import { motion } from "framer-motion";
import FeaturesSectionDemo from "@/components/ui/features-section-demo-2";

export default function FeaturesGrid() {
  return (
    <section id="features" className="py-32 border-t border-white/5 bg-transparent relative z-10">
      <div className="container mx-auto px-6">
        
        <div className="mb-20 max-w-3xl">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-serif tracking-tight text-[#F5F5F5] mb-6"
          >
            Everything you receive.
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-[#A0A0A0]"
          >
            The complete toolkit for mastering any subject.
          </motion.p>
        </div>

        <FeaturesSectionDemo />

      </div>
    </section>
  );
}
