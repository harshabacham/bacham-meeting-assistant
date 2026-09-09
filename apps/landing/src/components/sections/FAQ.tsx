"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, MessageSquare } from "lucide-react";

const faqs = [
  {
    q: "Does Bacham require a bot to join my meeting?",
    a: "No. Unlike legacy cloud tools (Otter, Fireflies), Bacham never sends an uninvited bot to your call. It records directly through your operating system's native audio loopback (WASAPI on Windows, CoreAudio on macOS) or via the Chrome Extension for browser tabs. It is 100% invisible to other participants.",
  },
  {
    q: "Can I use Bacham completely offline without internet?",
    a: "Yes. When paired with local Whisper and local Ollama models (such as Llama 3.3 or DeepSeek), all speech-to-text, decision extraction, and knowledge retrieval happen 100% on your machine with zero network connectivity required.",
  },
  {
    q: "How do the Desktop App and Chrome Extension work together?",
    a: "The extension communicates with the desktop app via a secure local WebSocket (ws://127.0.0.1:1421). If the desktop app is closed, the extension securely saves captured meetings in its local Offline Media Vault and automatically syncs them as soon as you launch the desktop application.",
  },
  {
    q: "Which AI models can I connect?",
    a: "You have complete freedom. You can run offline models via Ollama or supply your own personal API keys for Anthropic Claude 3.5 Sonnet, OpenAI GPT-4o, Groq, or Google Gemini. Bacham charges zero markup on your API usage.",
  },
  {
    q: "Where is my data stored and can I export it?",
    a: "All transcripts, audio files, embeddings, and notes are stored strictly in your local SQLite database on your SSD. You can export meeting summaries to Markdown, PDF, Notion, or Slack with one click.",
  },
  {
    q: "Is Bacham free and open source?",
    a: "Yes. Bacham is licensed under the MIT open-source license. You can inspect the source code, contribute on GitHub, and run unlimited meetings without recurring per-seat subscription fees.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-24 md:py-32 bg-[#FCFBF9] border-t border-[#E8E6DE] relative z-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Column */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-32 space-y-4">
              <span className="text-[11.5px] font-semibold uppercase tracking-wider text-[#4F6322] select-none block">
                Common Inquiries
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-[#1E1E1E] leading-tight">
                Frequently asked questions
              </h2>
              <p className="text-base text-[#666666] leading-relaxed">
                Everything you need to know about Bacham&apos;s privacy model, local AI engine, and extension integration.
              </p>

              <div className="pt-4">
                <a
                  href="https://github.com/harshabacham/bacham-meeting-assistant/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-[#4F6322] hover:underline"
                >
                  <MessageSquare size={14} />
                  <span>Have a question? Open an issue on GitHub</span>
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Accordion Items */}
          <div className="lg:col-span-7 space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div
                  key={faq.q}
                  className={`rounded-2xl border transition-all overflow-hidden shadow-2xs ${
                    isOpen
                      ? "bg-[#FAF9F5] border-[#4F6322]/40"
                      : "bg-white border-[#E8E6DE] hover:border-[#4F6322]/30"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggle(idx)}
                    className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span className="text-[15px] sm:text-base font-medium text-[#1E1E1E] leading-snug">
                      {faq.q}
                    </span>
                    <div className={`p-1.5 rounded-full border transition-transform duration-200 shrink-0 ${
                      isOpen
                        ? "bg-[#4F6322] border-[#4F6322] text-white rotate-180"
                        : "bg-[#FAF9F5] border-[#E8E6DE] text-[#666666]"
                    }`}>
                      <ChevronDown size={14} />
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-[13.5px] text-[#555555] leading-relaxed border-t border-[#E8E6DE] pt-4">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
}
