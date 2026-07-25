"use client";

import Image from "next/image";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ListVideo, FileText, MessageSquare, Layers } from "lucide-react";

type ViewState = "timeline" | "notes" | "chat" | "flashcards";

export default function ProductShowcase() {
  const [activeView, setActiveView] = useState<ViewState>("timeline");

  const views: { id: ViewState; label: string; icon: any; color: string }[] = [
    { id: "timeline", label: "Timeline", icon: ListVideo, color: "#3B82F6" },
    { id: "notes", label: "Smart Notes", icon: FileText, color: "#10B981" },
    { id: "chat", label: "AI Chat", icon: MessageSquare, color: "#8B5CF6" },
    { id: "flashcards", label: "Flashcards", icon: Layers, color: "#F59E0B" }
  ];

  return (
    <section className="py-32 border-t border-white/5 bg-transparent overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-serif tracking-tight text-[#F5F5F5] mb-4">
            A unified study workspace.
          </h2>
          <p className="text-xl text-[#A0A0A0] max-w-2xl mx-auto">
            Switch seamlessly between the video timeline, generated notes, interactive AI chat, and spaced repetition flashcards.
          </p>
        </div>

        {/* Mac Window Mockup */}
        <div className="max-w-6xl mx-auto bg-[#1E1E1E] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col md:h-[600px]">
          {/* Title bar */}
          <div className="h-12 border-b border-white/5 flex items-center px-4 gap-2 bg-[#111111]">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
            <div className="mx-auto text-xs text-[#A0A0A0] font-medium opacity-50">BACHAM</div>
          </div>

          <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
            {/* Sidebar */}
            <div className="w-full md:w-64 border-r border-white/5 bg-[#111111]/50 p-4 flex md:flex-col gap-2 overflow-x-auto md:overflow-visible shrink-0">
              {views.map((view) => {
                const isActive = activeView === view.id;
                return (
                  <button
                    key={view.id}
                    onClick={() => setActiveView(view.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors w-full text-left shrink-0 md:shrink ${
                      isActive ? "bg-[#A6FF00]/10 text-[#A6FF00]" : "text-[#A0A0A0] hover:text-[#F5F5F5] hover:bg-white/5"
                    }`}
                  >
                    <view.icon size={18} />
                    {view.label}
                  </button>
                );
              })}
            </div>

            {/* Content Area */}
            <div className="flex-1 relative bg-[#1E1E1E]/50 overflow-hidden min-h-[400px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeView}
                  initial={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="absolute inset-0 p-8 flex items-center justify-center"
                >
                  {/* Image container */}
                  <div className="w-full h-full relative rounded-xl overflow-hidden border border-white/5 bg-[#111111]/30">
                    {views.map((v) => 
                      v.id === activeView && (
                        <Image 
                          key={v.id}
                          src={`/mockups/${v.id}_ui.png`}
                          alt={`${v.label} UI`}
                          fill
                          className="object-cover"
                        />
                      )
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
