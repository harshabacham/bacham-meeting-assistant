"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const faqs = [
  {
    q: "Do I need to leave my computer open during a lecture?",
    a: "Yes, the Chrome extension needs to be active during the video to capture the data, but it runs silently in the background without affecting your computer's performance."
  },
  {
    q: "Where is my data stored?",
    a: "Privacy is our priority. All data is processed and stored locally on your machine in a secure SQLite database. No recordings or transcripts are ever sent to a cloud server."
  },
  {
    q: "Does BACHAM work with live Zoom calls?",
    a: "Currently, BACHAM is optimized for browser-based video players (like YouTube, Panopto, Canvas, and Coursera). Deep native integration for live Zoom and Teams calls is coming in Q4."
  },
  {
    q: "Do I need a Gemini API key?",
    a: "The core transcription and OCR features run completely locally. However, if you want to use the advanced 'Ask AI' chat feature to converse with your lectures, you will need to provide your own Gemini API key."
  }
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0); // Open the first one by default for presentation

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-32 border-t border-white/5 bg-transparent relative z-10">
      <div className="container mx-auto px-6 max-w-6xl">
        
        <div className="flex flex-col md:flex-row gap-12 md:gap-24">
          
          {/* Left Column - Sticky */}
          <div className="md:w-1/3">
            <div className="sticky top-32">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-4xl md:text-5xl font-serif tracking-tight text-[#F5F5F5] mb-6"
              >
                FAQs
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-[#A0A0A0] text-lg leading-relaxed"
              >
                Everything you need to know about how BACHAM works, privacy, and integrations. Can't find the answer you're looking for? Reach out on our community Discord.
              </motion.p>
            </div>
          </div>

          {/* Right Column - Accordions */}
          <div className="md:w-2/3">
            <div className="border-t border-white/10">
              {faqs.map((faq, idx) => {
                const isOpen = openIndex === idx;
                return (
                  <motion.div 
                    key={idx} 
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className="border-b border-white/10"
                  >
                    <button
                      onClick={() => toggle(idx)}
                      className="w-full py-8 flex items-start justify-between text-left focus:outline-none group"
                    >
                      <span className={`text-xl font-medium pr-8 transition-colors duration-300 ${isOpen ? "text-[#F5F5F5]" : "text-[#D0D0D0] group-hover:text-[#F5F5F5]"}`}>
                        {faq.q}
                      </span>
                      
                      {/* Morphing Plus/Minus Icon */}
                      <div className={`relative w-6 h-6 flex items-center justify-center flex-shrink-0 mt-1 transition-colors duration-300 ${isOpen ? "text-[#F5F5F5]" : "text-[#A0A0A0] group-hover:text-[#F5F5F5]"}`}>
                        <span className="absolute w-4 h-[2px] bg-current rounded-full" />
                        <motion.span 
                          animate={{ rotate: isOpen ? 90 : 0, opacity: isOpen ? 0 : 1 }} 
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="absolute h-4 w-[2px] bg-current rounded-full" 
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
                          <div className="pb-8 pr-12 text-[#A0A0A0] text-lg leading-relaxed">
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
