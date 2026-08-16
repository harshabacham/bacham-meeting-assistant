"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle } from "lucide-react";

const faqs = [
  {
    q: "Does BACHAM require an internet connection?",
    a: "No. The core audio transcription (Whisper), slide OCR, note generation, and spaced repetition flashcards run 100% locally on your machine using local compute. If you choose to use Ollama for AI chat, even conversations stay entirely offline."
  },
  {
    q: "Where are my meeting and lecture recordings stored?",
    a: "Privacy is built into the architecture. All captured audio, keyframes, transcripts, and study decks are stored strictly in a local SQLite database on your computer. No data is ever dispatched to our servers."
  },
  {
    q: "Which platforms and video formats does the Chrome Extension support?",
    a: "BACHAM works with Google Meet, Zoom Web, Microsoft Teams Web, Canvas LMS, Panopto, Coursera, YouTube, and any standard HTML5 browser video player."
  },
  {
    q: "Can I bring my own Gemini or OpenAI API key?",
    a: "Yes! You have complete freedom: run 100% free with local Ollama models, or plug in your Gemini, OpenAI, or Anthropic API key in Settings for cloud reasoning."
  },
  {
    q: "Can I export my notes and flashcards to other apps?",
    a: "Yes. BACHAM exports formatted Markdown directly into Obsidian, Notion, or Apple Notes, and exports Anki-compatible decks (.apkg / .csv) for your active recall sessions."
  }
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-32 border-t border-white/[0.06] bg-transparent relative z-10">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
          
          {/* Left Column */}
          <div className="lg:w-1/3">
            <div className="lg:sticky lg:top-32">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#A6FF00]/20 bg-[#A6FF00]/5 text-xs font-semibold tracking-widest text-[#A6FF00] uppercase mb-4">
                <HelpCircle size={12} />
                Knowledge Base
              </div>
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-4xl md:text-5xl font-extrabold tracking-tighter text-[#F0F0F0] mb-4"
              >
                Frequently asked questions
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-[#888888] text-base leading-relaxed mb-6"
              >
                Everything you need to know about privacy, offline AI, and workflow integration.
              </motion.p>
              <div className="p-5 rounded-2xl glass-card border border-white/[0.07]">
                <p className="text-xs text-[#888888] mb-2">Have a question not answered here?</p>
                <a 
                  href="https://github.com/bacham-app/discussions" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-[#A6FF00] hover:underline"
                >
                  Join Community Discussion &rarr;
                </a>
              </div>
            </div>
          </div>

          {/* Right Column - Accordion */}
          <div className="lg:w-2/3">
            <div className="border-t border-white/[0.08]">
              {faqs.map((faq, idx) => {
                const isOpen = openIndex === idx;
                return (
                  <motion.div 
                    key={idx} 
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.08 }}
                    className="border-b border-white/[0.08] transition-colors"
                  >
                    <button
                      onClick={() => toggle(idx)}
                      className="w-full py-7 flex items-start justify-between text-left focus:outline-none group"
                    >
                      <span className={`text-lg sm:text-xl font-bold pr-8 transition-colors duration-200 ${
                        isOpen ? "text-[#A6FF00]" : "text-[#D0D0D0] group-hover:text-[#F0F0F0]"
                      }`}>
                        {faq.q}
                      </span>
                      
                      {/* Plus/Minus Indicator */}
                      <div className={`relative w-6 h-6 flex items-center justify-center flex-shrink-0 mt-1 transition-colors duration-200 ${
                        isOpen ? "text-[#A6FF00]" : "text-[#777777] group-hover:text-[#F0F0F0]"
                      }`}>
                        <span className="absolute w-3.5 h-[2px] bg-current rounded-full" />
                        <motion.span 
                          animate={{ rotate: isOpen ? 90 : 0, opacity: isOpen ? 0 : 1 }} 
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="absolute h-3.5 w-[2px] bg-current rounded-full" 
                        />
                      </div>
                    </button>
                    
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="pb-7 pr-6 text-[#888888] text-base leading-relaxed">
                            {faq.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
