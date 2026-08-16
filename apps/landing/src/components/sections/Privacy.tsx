"use client";

import { motion } from "framer-motion";
import { ShieldCheck, HardDrive, Lock, Cpu, ServerOff, CheckCircle2 } from "lucide-react";

export default function Privacy() {
  const lineVariants: any = {
    hidden: { pathLength: 0, opacity: 0 },
    show: { 
      pathLength: 1, 
      opacity: 1,
      transition: { duration: 1.5, ease: "easeInOut" }
    }
  };

  const guarantees = [
    { icon: ServerOff, title: "Zero Cloud Telemetry", desc: "Your audio, video, and notes are never dispatched to an external server." },
    { icon: HardDrive, title: "100% Local SQLite DB", desc: "Stored encrypted on your local filesystem under your complete ownership." },
    { icon: Lock, title: "BYOK Engine Architecture", desc: "Bring your own API keys for Gemini/OpenAI or run totally free offline with Ollama." },
  ];

  return (
    <section id="privacy" className="py-32 border-t border-white/[0.06] bg-transparent overflow-hidden relative">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] bg-[#A6FF00]/[0.02] blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-6 max-w-6xl text-center relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#A6FF00]/20 bg-[#A6FF00]/5 text-xs font-semibold tracking-widest text-[#A6FF00] uppercase mb-4">
            <ShieldCheck size={12} />
            Privacy by Architecture
          </div>
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-[#F0F0F0] mb-4">
            Architecture, not marketing.
          </h2>
          <p className="text-lg font-mono text-[#A6FF00] max-w-xl mx-auto">
            // No cloud recording. No tracking. No telemetry.
          </p>
        </motion.div>

        {/* Interactive Architecture Flow Card */}
        <div className="glass-card rounded-3xl p-8 sm:p-12 max-w-4xl mx-auto border border-white/[0.08] mb-14 shadow-2xl relative overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative z-10 items-center">
            
            <div className="flex flex-col items-center p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-2">
                <Cpu size={20} />
              </div>
              <span className="text-xs font-mono font-bold text-[#F0F0F0]">Chrome Ext</span>
              <span className="text-[10px] text-[#666666] mt-0.5">Media Stream</span>
            </div>

            <div className="flex flex-col items-center p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-2">
                <HardDrive size={20} />
              </div>
              <span className="text-xs font-mono font-bold text-[#F0F0F0]">Desktop App</span>
              <span className="text-[10px] text-[#666666] mt-0.5">Tauri + Rust</span>
            </div>

            <div className="flex flex-col items-center p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2">
                <Lock size={20} />
              </div>
              <span className="text-xs font-mono font-bold text-[#F0F0F0]">Local SQLite</span>
              <span className="text-[10px] text-[#666666] mt-0.5">Encrypted Disk</span>
            </div>

            <div className="flex flex-col items-center p-4 rounded-2xl border border-[#A6FF00]/30 bg-[#A6FF00]/5 glow-lime-sm">
              <div className="w-10 h-10 rounded-xl bg-[#A6FF00]/15 text-[#A6FF00] flex items-center justify-center mb-2">
                <CheckCircle2 size={20} />
              </div>
              <span className="text-xs font-mono font-bold text-[#A6FF00]">100% Private</span>
              <span className="text-[10px] text-[#A6FF00]/70 mt-0.5">Never leaves PC</span>
            </div>

          </div>
        </div>

        {/* Guarantees Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto text-left">
          {guarantees.map((g, idx) => {
            const Icon = g.icon;
            return (
              <div key={idx} className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.01]">
                <div className="w-9 h-9 rounded-xl bg-[#A6FF00]/10 text-[#A6FF00] flex items-center justify-center mb-3">
                  <Icon size={18} />
                </div>
                <h4 className="text-base font-bold text-[#F0F0F0] mb-1.5">{g.title}</h4>
                <p className="text-xs text-[#777777] leading-relaxed">{g.desc}</p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
