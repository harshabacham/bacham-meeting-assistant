"use client";

import { motion } from "framer-motion";

export function EcosystemBar() {
  return (
    <section className="py-16 sm:py-20 border-y border-white/10 bg-[#09090B] relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        {/* Minimalist Centered Title */}
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="font-serif text-center text-sm sm:text-base text-[#A1A1A6] tracking-wide mb-10 sm:mb-12 font-normal"
        >
          Works seamlessly with your meeting apps &amp; AI models
        </motion.h3>

        {/* Row 1: Meeting Apps (6 columns) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-y-8 gap-x-6 items-center justify-items-center">
          {/* Google Meet */}
          <div className="flex items-center gap-2 text-white/70 hover:text-white transition-all duration-200 group cursor-default">
            <svg className="w-5 h-5 fill-current opacity-80 group-hover:opacity-100 transition-opacity shrink-0" viewBox="0 0 24 24">
              <rect x="3" y="6" width="12" height="12" rx="2.5" />
              <polygon points="16,10 21,6 21,18 16,14" />
            </svg>
            <span className="text-sm font-semibold tracking-tight">Google Meet</span>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-2 text-white/70 hover:text-white transition-all duration-200 group cursor-default">
            <svg className="w-5 h-5 fill-current opacity-80 group-hover:opacity-100 transition-opacity shrink-0" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
              <polygon points="9,8.5 16.5,12 9,15.5" />
            </svg>
            <span className="text-sm font-bold tracking-tight">zoom</span>
          </div>

          {/* Microsoft Teams */}
          <div className="flex items-center gap-2 text-white/70 hover:text-white transition-all duration-200 group cursor-default">
            <svg className="w-5 h-5 fill-current opacity-80 group-hover:opacity-100 transition-opacity shrink-0" viewBox="0 0 24 24">
              <rect x="7" y="5" width="13" height="14" rx="2.5" fillOpacity="0.6" />
              <rect x="4" y="8" width="10" height="10" rx="2" />
            </svg>
            <span className="text-sm font-semibold tracking-tight">Teams</span>
          </div>

          {/* Slack */}
          <div className="flex items-center gap-2 text-white/70 hover:text-white transition-all duration-200 group cursor-default">
            <svg className="w-4.5 h-4.5 fill-current opacity-80 group-hover:opacity-100 transition-opacity shrink-0" viewBox="0 0 24 24">
              <path d="M6 15a2 2 0 0 1-2-2 2 2 0 0 1 2-2h2v2a2 2 0 0 1-2 2zm1-2a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-5zm2-6a2 2 0 0 1-2-2 2 2 0 0 1 2-2 2 2 0 0 1 2 2v2H9zm2 1a2 2 0 0 1 2-2 2 2 0 0 1 2 2v2h-5a2 2 0 0 1 1-2zm6 2a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2v-2a2 2 0 0 1 2-2zm-1 2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V9a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5zm-2 6a2 2 0 0 1 2 2 2 2 0 0 1-2 2 2 2 0 0 1-2-2v-2h2zm-2-1a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-2h5a2 2 0 0 1-1 2z" />
            </svg>
            <span className="text-sm font-bold tracking-tight">slack</span>
          </div>

          {/* Discord */}
          <div className="flex items-center gap-2 text-white/70 hover:text-white transition-all duration-200 group cursor-default">
            <svg className="w-5 h-5 fill-current opacity-80 group-hover:opacity-100 transition-opacity shrink-0" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            <span className="text-sm font-semibold tracking-tight">Discord</span>
          </div>

          {/* Loom */}
          <div className="flex items-center gap-2 text-white/70 hover:text-white transition-all duration-200 group cursor-default">
            <svg className="w-5 h-5 fill-current opacity-80 group-hover:opacity-100 transition-opacity shrink-0" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2a4 4 0 0 0-4 4v2.5a4 4 0 1 0 8 0V6a4 4 0 0 0-4-4zm-6.5 9.5a4 4 0 1 0 0 8H8a4 4 0 0 0 0-8H5.5zm10.5 4a4 4 0 0 0 4-4H18a4 4 0 0 0-4 4v2.5a4 4 0 0 0 2 3.5z" />
            </svg>
            <span className="text-sm font-bold tracking-tight">loom</span>
          </div>
        </div>

        {/* Subtle Horizontal Divider with Grid Plus (+) Markers */}
        <div className="relative w-full my-7 sm:my-9 hidden md:block">
          <div className="w-full border-t border-white/[0.07]" />
          <span className="absolute left-[16.666%] -translate-x-1/2 -top-2.5 text-xs text-white/20 font-mono select-none">
            +
          </span>
          <span className="absolute left-[33.333%] -translate-x-1/2 -top-2.5 text-xs text-white/20 font-mono select-none">
            +
          </span>
          <span className="absolute left-[50%] -translate-x-1/2 -top-2.5 text-xs text-white/20 font-mono select-none">
            +
          </span>
          <span className="absolute left-[66.666%] -translate-x-1/2 -top-2.5 text-xs text-white/20 font-mono select-none">
            +
          </span>
          <span className="absolute left-[83.333%] -translate-x-1/2 -top-2.5 text-xs text-white/20 font-mono select-none">
            +
          </span>
        </div>

        {/* Mobile/Tablet Simple Divider */}
        <div className="w-full border-t border-white/[0.07] my-6 md:hidden" />

        {/* Row 2: AI Models & Engines (6 columns) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-y-8 gap-x-6 items-center justify-items-center">
          {/* OpenAI */}
          <div className="flex items-center gap-2 text-white/70 hover:text-white transition-all duration-200 group cursor-default">
            <svg className="w-5 h-5 fill-current opacity-80 group-hover:opacity-100 transition-opacity shrink-0" viewBox="0 0 24 24">
              <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l2.02-1.164 5.832 3.368-2.02 1.164z" />
            </svg>
            <span className="text-sm font-semibold tracking-tight">OpenAI</span>
          </div>

          {/* Anthropic */}
          <div className="flex items-center gap-2 text-white/70 hover:text-white transition-all duration-200 group cursor-default">
            <svg className="w-5 h-5 fill-current opacity-80 group-hover:opacity-100 transition-opacity shrink-0" viewBox="0 0 24 24">
              <path d="M13.82 2.5a.68.68 0 0 0-.64-.46H10.8a.68.68 0 0 0-.64.46L4.2 21.54a.68.68 0 0 0 .64.9h2.38a.68.68 0 0 0 .64-.46l1.73-5.22h4.82l1.73 5.22a.68.68 0 0 0 .64.46h2.38a.68.68 0 0 0 .64-.9zm-3.64 10.74 1.82-5.48 1.82 5.48z" />
            </svg>
            <span className="text-sm font-semibold tracking-tight">Anthropic</span>
          </div>

          {/* Gemini */}
          <div className="flex items-center gap-2 text-white/70 hover:text-white transition-all duration-200 group cursor-default">
            <svg className="w-5 h-5 fill-current opacity-80 group-hover:opacity-100 transition-opacity shrink-0" viewBox="0 0 24 24">
              <path d="M12 0C12 6.627 6.627 12 0 12c6.627 0 12 5.373 12 12 0-6.627 5.373-12 12-12-6.627 0-12-5.373-12-12z" />
            </svg>
            <span className="text-sm font-semibold tracking-tight">Gemini</span>
          </div>

          {/* DeepSeek */}
          <div className="flex items-center gap-2 text-white/70 hover:text-white transition-all duration-200 group cursor-default">
            <svg className="w-5 h-5 fill-current opacity-80 group-hover:opacity-100 transition-opacity shrink-0" viewBox="0 0 24 24">
              <path d="M3 13c3-5 7-7 12-6 3 1 5 3 6 6-4 1-8 0-11-2-1 3-3 4-7 2z" />
              <circle cx="17" cy="11" r="1.5" />
            </svg>
            <span className="text-sm font-semibold tracking-tight">DeepSeek</span>
          </div>

          {/* Ollama */}
          <div className="flex items-center gap-2 text-white/70 hover:text-white transition-all duration-200 group cursor-default">
            <svg className="w-5 h-5 fill-current opacity-80 group-hover:opacity-100 transition-opacity shrink-0" viewBox="0 0 24 24">
              <circle cx="9" cy="9" r="1.5" />
              <circle cx="15" cy="9" r="1.5" />
              <path d="M6 5a2 2 0 0 1 2-2h1l1 3h4l1-3h1a2 2 0 0 1 2 2v6a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6V5z" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span className="text-sm font-bold tracking-tight">ollama</span>
          </div>

          {/* Groq */}
          <div className="flex items-center gap-2 text-white/70 hover:text-white transition-all duration-200 group cursor-default">
            <svg className="w-5 h-5 fill-current opacity-80 group-hover:opacity-100 transition-opacity shrink-0" viewBox="0 0 24 24">
              <rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="text-sm font-black tracking-tight">groq</span>
          </div>
        </div>

      </div>
    </section>
  );
}
