"use client";

import { motion } from "framer-motion";
import { Download, MonitorPlay, Send, BrainCircuit, PackageOpen } from "lucide-react";

export default function HowItWorks() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <section id="how-it-works" className="py-32 border-t border-white/5 bg-transparent overflow-hidden">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="mb-20 text-center md:text-left">
          <h2 className="text-4xl md:text-6xl font-serif tracking-tight text-[#F5F5F5] mb-4">
            How it works
          </h2>
          <p className="text-xl text-[#A0A0A0] max-w-2xl">
            From installation to mastery in five seamless stages. Designed for flow.
          </p>
        </div>

        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[280px]"
        >
          {/* Step 1 */}
          <motion.div variants={item} className="md:col-span-1 group relative bg-[#1E1E1E] border border-white/5 rounded-3xl p-8 overflow-hidden hover:border-white/10 transition-colors">
            <motion.div 
              animate={{ y: [0, -15, 0] }} 
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-30 transition-opacity"
            >
              <Download size={120} className="text-[#A6FF00]" />
            </motion.div>
            <div className="relative z-10 h-full flex flex-col justify-end">
              <div className="w-12 h-12 rounded-xl bg-[#A6FF00]/10 flex items-center justify-center text-[#A6FF00] mb-4">
                <span className="font-bold">1</span>
              </div>
              <h3 className="text-2xl text-[#F5F5F5] font-semibold mb-2">Install</h3>
              <p className="text-[#A0A0A0]">Add the invisible Chrome Extension to your browser.</p>
            </div>
          </motion.div>

          {/* Step 2 */}
          <motion.div variants={item} className="md:col-span-2 group relative bg-[#1E1E1E] border border-white/5 rounded-3xl p-8 overflow-hidden hover:border-white/10 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#A6FF00]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
              className="absolute -bottom-10 -right-10 w-64 h-64 bg-blue-500 blur-3xl rounded-full" 
            />
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <span className="font-bold">2</span>
                </div>
                <div className="relative">
                  <MonitorPlay size={32} className="text-[#A0A0A0] group-hover:text-blue-400 transition-colors" />
                  <motion.div 
                    animate={{ opacity: [1, 0, 1] }} 
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"
                  />
                </div>
              </div>
              <div>
                <h3 className="text-3xl text-[#F5F5F5] font-semibold mb-2">Record seamlessly</h3>
                <p className="text-[#A0A0A0] max-w-sm">Open any lecture video. The extension automatically detects and begins capturing context without manual intervention.</p>
              </div>
            </div>
          </motion.div>

          {/* Step 3 */}
          <motion.div variants={item} className="md:col-span-1 group relative bg-[#1E1E1E] border border-white/5 rounded-3xl p-8 overflow-hidden hover:border-white/10 transition-colors">
            <motion.div 
              animate={{ x: [0, 15, 0], y: [0, -15, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
              className="absolute inset-0 flex items-center justify-center opacity-[0.03] group-hover:opacity-10 transition-opacity"
            >
              <Send size={150} className="text-purple-400 -rotate-12" />
            </motion.div>
            <div className="relative z-10 h-full flex flex-col justify-end">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4">
                <span className="font-bold">3</span>
              </div>
              <h3 className="text-2xl text-[#F5F5F5] font-semibold mb-2">Sync</h3>
              <p className="text-[#A0A0A0]">Data streams securely to your desktop app in real-time.</p>
            </div>
          </motion.div>

          {/* Step 4 */}
          <motion.div variants={item} className="md:col-span-1 group relative bg-[#1E1E1E] border border-white/5 rounded-3xl p-8 overflow-hidden hover:border-white/10 transition-colors">
             <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
             <motion.div 
               animate={{ top: ["0%", "100%", "0%"] }}
               transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
               className="absolute left-0 w-full h-[1px] bg-emerald-500/50 blur-[1px] hidden group-hover:block"
             />
            <div className="relative z-10 h-full flex flex-col justify-end">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4 overflow-hidden relative">
                <span className="font-bold relative z-10">4</span>
              </div>
              <h3 className="text-2xl text-[#F5F5F5] font-semibold mb-2">Analyze</h3>
              <p className="text-[#A0A0A0]">AI processes visuals, audio, and slides to build understanding.</p>
            </div>
          </motion.div>

          {/* Step 5 */}
          <motion.div variants={item} className="md:col-span-1 group relative bg-[#A6FF00] rounded-3xl p-8 overflow-hidden hover:scale-[1.02] transition-transform duration-300">
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-xl bg-black/10 flex items-center justify-center text-[#111111]">
                  <span className="font-bold">5</span>
                </div>
                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                >
                  <PackageOpen size={32} className="text-[#111111]" />
                </motion.div>
              </div>
              <div>
                <h3 className="text-3xl text-[#111111] font-bold mb-2">Master</h3>
                <p className="text-[#111111]/80 font-medium">Your interactive study package is ready. Flashcards, notes, and chat.</p>
              </div>
            </div>
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
}
