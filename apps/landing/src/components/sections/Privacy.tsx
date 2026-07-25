"use client";

import { motion } from "framer-motion";

export default function Privacy() {
  const lineVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    show: { 
      pathLength: 1, 
      opacity: 1,
      transition: { duration: 1.5, ease: "easeInOut" }
    }
  };

  const nodeVariants = {
    hidden: { scale: 0, opacity: 0 },
    show: { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 15 } }
  };

  return (
    <section id="privacy" className="py-32 border-t border-white/5 bg-transparent overflow-hidden">
      <div className="container mx-auto px-6 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-20"
        >
          <h2 className="text-3xl md:text-5xl font-serif tracking-tight text-[#F5F5F5] mb-6">
            Architecture, not marketing.
          </h2>
          <p className="text-xl font-mono text-[#A6FF00]">
            No cloud. No server. No tracking.
          </p>
        </motion.div>

        {/* Animated SVG Diagram */}
        <div className="max-w-4xl mx-auto relative h-64 md:h-80 flex items-center justify-center">
          <motion.svg 
            viewBox="0 0 1000 300" 
            className="w-full h-full absolute inset-0 z-0"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
          >
            {/* Base faded lines */}
            <path d="M 150 150 L 350 150 L 650 150 L 850 150" stroke="rgba(255,255,255,0.05)" strokeWidth="2" fill="none" />
            <path d="M 650 150 L 650 250 L 850 250" stroke="rgba(255,255,255,0.05)" strokeWidth="2" fill="none" />

            {/* Animated primary flow */}
            <motion.path 
              variants={lineVariants}
              d="M 150 150 L 350 150 L 650 150 L 850 150" 
              stroke="#A6FF00" 
              strokeWidth="3" 
              fill="none" 
              strokeLinecap="round"
            />
            
            <motion.path 
              variants={lineVariants}
              d="M 650 150 L 650 250 L 850 250" 
              stroke="#A6FF00" 
              strokeWidth="2" 
              strokeDasharray="6 6"
              fill="none" 
              strokeLinecap="round"
            />
          </motion.svg>

          {/* Nodes */}
          <div className="absolute inset-0 flex items-center justify-between z-10 px-4 md:px-0 max-w-[800px] mx-auto w-full">
            <Node title="Browser Ext" delay={0} />
            <Node title="Desktop App" delay={0.4} />
            <Node title="Local SQLite" delay={0.8} />
            <Node title="Done." delay={1.2} highlight />
          </div>

          <div className="absolute inset-0 flex items-end justify-end z-10 px-4 md:px-0 max-w-[800px] mx-auto w-full pb-2 md:pb-6">
             <div className="mr-8">
               <Node title="Gemini API (Optional)" delay={1.0} small />
             </div>
          </div>
        </div>
      </div>
    </section>
  );

  function Node({ title, delay, highlight, small }: { title: string, delay: number, highlight?: boolean, small?: boolean }) {
    return (
      <motion.div 
        variants={nodeVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        transition={{ delay, type: "spring", stiffness: 100, damping: 15 }}
        className={`
          flex items-center justify-center text-center
          ${small ? 'px-4 py-2 text-xs' : 'px-6 py-3 text-sm md:text-base'}
          ${highlight ? 'bg-[#A6FF00] text-[#111111] font-bold' : 'bg-[#1E1E1E] text-[#F5F5F5] border border-white/10'}
          rounded-xl shadow-lg
        `}
      >
        {title}
      </motion.div>
    );
  }
}
