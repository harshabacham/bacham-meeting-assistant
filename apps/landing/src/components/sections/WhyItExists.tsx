"use client";

import { motion } from "framer-motion";
import { ArrowRight, Brain, Clock, Zap } from "lucide-react";

export default function WhyItExists() {
  const container: any = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const item: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <section id="why" className="py-32 border-t border-white/5 bg-transparent">
      <div className="container mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-24"
        >
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-[#F5F5F5] mb-6">
            The old way of studying is broken.
          </h2>
          <p className="text-xl text-[#A0A0A0] max-w-2xl mx-auto">
            Hours wasted rewatching videos. Searching for that one concept. Taking notes that you never read again.
          </p>
        </motion.div>

        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="flex flex-col md:flex-row items-stretch justify-center gap-6 max-w-5xl mx-auto"
        >
          {/* The Old Way */}
          <motion.div variants={item} className="flex-1 bg-[#1E1E1E]/50 border border-white/5 rounded-2xl p-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <h3 className="text-[#A0A0A0] text-sm font-semibold uppercase tracking-wider mb-8">The Old Way</h3>
            <ul className="space-y-6 text-[#A0A0A0]">
              <li className="flex items-center gap-4"><Clock className="text-red-400/70" size={20} /> Attend lecture</li>
              <li className="flex items-center gap-4"><ArrowRight className="text-white/20" size={16} /> Forget everything</li>
              <li className="flex items-center gap-4"><Clock className="text-red-400/70" size={20} /> Rewatch recordings</li>
              <li className="flex items-center gap-4"><ArrowRight className="text-white/20" size={16} /> Waste hours</li>
            </ul>
          </motion.div>

          {/* The New Way */}
          <motion.div variants={item} className="flex-1 bg-[#1E1E1E] border border-[#A6FF00]/20 rounded-2xl p-8 relative overflow-hidden shadow-[0_0_40px_rgba(166,255,0,0.05)]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#A6FF00]/10 blur-[50px]" />
            <h3 className="text-[#A6FF00] text-sm font-semibold uppercase tracking-wider mb-8 flex items-center gap-2">
              <Zap size={16} /> BACHAM
            </h3>
            <ul className="space-y-6 text-[#F5F5F5]">
              <li className="flex items-center gap-4"><Brain className="text-[#A6FF00]" size={20} /> Records automatically</li>
              <li className="flex items-center gap-4"><ArrowRight className="text-white/20" size={16} /> Understands context</li>
              <li className="flex items-center gap-4"><Brain className="text-[#A6FF00]" size={20} /> Organizes by topic</li>
              <li className="flex items-center gap-4"><ArrowRight className="text-white/20" size={16} /> Teaches you perfectly</li>
            </ul>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
