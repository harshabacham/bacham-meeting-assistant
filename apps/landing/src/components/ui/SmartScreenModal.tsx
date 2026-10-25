"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ShieldAlert,
  ShieldCheck,
  Download,
  ExternalLink,
  Laptop,
  CheckCircle2,
  Info,
  Terminal,
  ArrowRight,
} from "lucide-react";
import { WashiTape } from "./CartoonStickers";

interface SmartScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  downloadUrl?: string;
  msiUrl?: string;
  version?: string;
}

export function SmartScreenModal({
  isOpen,
  onClose,
  downloadUrl = "/downloads/bacham-setup.exe?v=1.0.10",
  msiUrl = "/downloads/bacham-setup.msi?v=1.0.10",
  version = "1.0.10",
}: SmartScreenModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-md cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
            className="relative z-10 w-full max-w-2xl bg-[#0E1013] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.8)] overflow-hidden text-left"
          >
            <WashiTape color="lime" className="absolute -top-2 left-10 -rotate-2 z-20" />

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-[#A1A1A6] hover:text-white transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#D1E043]/15 border border-[#D1E043]/30 flex items-center justify-center text-[#D1E043] shrink-0">
                <Laptop size={20} />
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#D1E043] font-bold block">
                  Windows 10 / 11 · Installation Helper
                </span>
                <h3 className="font-serif text-xl sm:text-2xl font-normal text-white">
                  Downloading Bacham v{version}
                </h3>
              </div>
            </div>

            <p className="text-xs sm:text-[13px] text-[#A1A1A6] leading-relaxed mb-6">
              Your download should start automatically. When opening newly released open-source software, Windows Defender SmartScreen may ask for confirmation. Here is how to complete installation in 2 clicks:
            </p>

            {/* Windows SmartScreen Mock Visual Guide */}
            <div className="rounded-2xl bg-[#14171C] border border-[#0A84FF]/30 p-5 mb-6 relative overflow-hidden shadow-inner">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
                  <span className="font-mono text-[11px] text-[#0A84FF] font-semibold ml-2 flex items-center gap-1.5">
                    <ShieldAlert size={13} />
                    Windows protected your PC
                  </span>
                </div>
                <span className="text-[10px] font-mono text-white/50">SmartScreen Dialog</span>
              </div>

              {/* 2 Step Action Visual */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Step 1 */}
                <div className="p-3.5 rounded-xl bg-black/40 border border-[#0A84FF]/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-[#D1E043] uppercase tracking-wider">
                      Step 1
                    </span>
                    <span className="w-5 h-5 rounded-full bg-[#D1E043] text-black font-black text-[11px] flex items-center justify-center">
                      1
                    </span>
                  </div>
                  <p className="text-xs text-white/80 leading-snug">
                    Under the warning message, click <strong className="text-[#D1E043] underline decoration-dotted">More info</strong>.
                  </p>
                  <div className="p-2 rounded bg-white/5 border border-white/10 text-center font-mono text-[11px] text-[#0A84FF]">
                    More info
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-3.5 rounded-xl bg-black/40 border border-[#D1E043]/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-[#D1E043] uppercase tracking-wider">
                      Step 2
                    </span>
                    <span className="w-5 h-5 rounded-full bg-[#D1E043] text-black font-black text-[11px] flex items-center justify-center">
                      2
                    </span>
                  </div>
                  <p className="text-xs text-white/80 leading-snug">
                    A button will appear at the bottom. Click <strong className="text-[#D1E043]">Run anyway</strong>.
                  </p>
                  <div className="p-2 rounded bg-[#D1E043] text-black font-bold text-center font-mono text-[11px]">
                    Run anyway
                  </div>
                </div>
              </div>

              {/* Note on why this happens */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-start gap-2 text-[11px] text-white/60">
                <Info size={14} className="text-[#0A84FF] shrink-0 mt-0.5" />
                <span>
                  <strong>Why does Windows show this?</strong> Microsoft SmartScreen flags newly released binaries from open-source developers until download reputation accumulates over time. Bacham contains zero telemetry or malware.
                </span>
              </div>
            </div>

            {/* Direct Re-download & Verification Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 text-xs text-[#D1D1D6]">
                <ShieldCheck size={16} className="text-[#D1E043] shrink-0" />
                <span>Open Source under MIT License</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <a
                  href={downloadUrl}
                  download="BACHAM_1.0.10_x64-setup.exe"
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center justify-center gap-1.5 border border-white/15 transition-all"
                >
                  <Download size={13} />
                  <span>Restart Download</span>
                </a>

                <a
                  href={msiUrl}
                  download="BACHAM_1.0.10_x64_en-US.msi"
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-full bg-[#D1E043] hover:bg-[#c4d436] text-[#1E1E1E] text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <span>Use MSI Installer</span>
                </a>
              </div>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
