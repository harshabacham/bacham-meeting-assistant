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
    q: "How does the 1-click study flashcards & quiz generator work?",
    a: "Bacham analyzes technical concepts, key decisions, and speaker explanations throughout your calls or university lectures. In one click, it synthesizes interactive spaced-repetition flashcards and multiple-choice quizzes linked directly to exact conversational timestamps ([00:15]) for instant audio replay.",
  },
  {
    q: "Where is my data stored and can I export it?",
    a: "All transcripts, audio files, embeddings, and notes are stored strictly in your local SQLite database on your SSD. You can export meeting summaries to Markdown, PDF, Notion, or Slack with one click.",
  },
  {
    q: "Why does Windows show 'Windows protected your PC' (SmartScreen) on first install?",
    a: "Microsoft Defender SmartScreen displays this prompt for any freshly compiled open-source executable that has not yet accumulated thousands of downloads in Microsoft's cloud reputation database. Simply click 'More info' and then select 'Run anyway'. Bacham is 100% open source under the MIT license, and SHA-256 checksums are publicly verifiable on our GitHub.",
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
    <section id="faq" className="py-24 md:py-32 bg-[#000000] border-t border-white/10 relative z-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Column */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-32 space-y-4">
              <span className="text-[11.5px] font-semibold uppercase tracking-wider text-[#D1E043] select-none block">
                Common Inquiries
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-[#FFFFFF] leading-tight">
                Frequently asked questions
              </h2>
              <p className="text-base text-[#A1A1A6] leading-relaxed">
                Everything you need to know about Bacham&apos;s privacy model, local AI engine, and extension integration.
              </p>

              <div className="pt-4">
                <a
                  href="https://github.com/harshabacham/bacham-meeting-assistant/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-[#D1E043] hover:underline"
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
                  className={`rounded-2xl border transition-all overflow-hidden shadow-md ${
                    isOpen
                      ? "bg-[#121214] border-[#D1E043]/40"
                      : "bg-[#0D0D0E] border-white/10 hover:border-[#D1E043]/30"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggle(idx)}
                    className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span className="text-[15px] sm:text-base font-medium text-[#FFFFFF] leading-snug">
                      {faq.q}
                    </span>
                    <div className={`p-1.5 rounded-full border transition-transform duration-200 shrink-0 ${
                      isOpen
                        ? "bg-[#D1E043] border-[#D1E043] text-[#1E1E1E] rotate-180"
                        : "bg-white/10 border-white/15 text-[#D1D1D6]"
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
                        <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-[13.5px] text-[#D1D1D6] leading-relaxed border-t border-white/10 pt-4">
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
