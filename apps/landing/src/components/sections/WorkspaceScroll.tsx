"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { LayoutDashboard, Video, Search, BookOpen } from "lucide-react";

export default function WorkspaceScroll() {
  const screens = [
    { title: "Library View", icon: LayoutDashboard, desc: "Your entire lecture history organized beautifully.", color: "#3B82F6", imageSrc: "/mockups/hero_dashboard.png", height: "h-[450px]" },
    { title: "Workspace", icon: Video, desc: "The main player, synced transcripts, and smart notes.", color: "#10B981", imageSrc: "/mockups/hero_dashboard.png", height: "h-[600px]" },
    { title: "Study Mode", icon: BookOpen, desc: "Distraction-free flashcards and AI quizzes.", color: "#F59E0B", imageSrc: "/mockups/notes_ui.png", height: "h-[500px]" },
    { title: "Universal Search", icon: Search, desc: "Find that one concept across hundreds of hours of video.", color: "#8B5CF6", imageSrc: "/mockups/chat_ui.png", height: "h-[400px]" },
  ];

  const col1 = screens.filter((_, i) => i % 2 === 0);
  const col2 = screens.filter((_, i) => i % 2 === 1);

  const Card = ({ screen, idx }: { screen: typeof screens[0], idx: number }) => (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
      className={`relative w-full rounded-3xl overflow-hidden group bg-[#1E1E1E]/40 backdrop-blur-xl border border-white/5 ring-1 ring-white/5 hover:ring-white/20 transition-all duration-500 hover:-translate-y-2 shadow-2xl ${screen.height}`}
    >
      {/* Glowing Orb */}
      <div className="absolute -top-32 -right-32 w-96 h-96 opacity-20 blur-[100px] transition-opacity duration-500 group-hover:opacity-40 pointer-events-none" style={{ backgroundColor: screen.color }} />
      
      {/* Content Container */}
      <div className="relative h-full flex flex-col p-6 md:p-8 z-10">
        <div className="flex items-center gap-4 mb-4">
           <div className="p-3 rounded-2xl bg-white/5 text-[#F5F5F5] ring-1 ring-white/10 group-hover:scale-110 group-hover:bg-white/10 transition-all duration-500">
             <screen.icon size={24} />
           </div>
           <div>
             <h3 className="text-xl font-bold text-[#F5F5F5]">{screen.title}</h3>
             <p className="text-sm text-[#A0A0A0]">{screen.desc}</p>
           </div>
        </div>

        {/* Image Container */}
        <div className="flex-1 mt-4 relative rounded-2xl overflow-hidden border border-white/5 bg-[#111111]/80 shadow-inner group-hover:border-white/20 transition-colors duration-500">
           {/* MacOS Window Dots */}
           <div className="absolute top-0 left-0 right-0 h-8 bg-black/40 backdrop-blur-md border-b border-white/5 flex items-center px-4 gap-2 z-20">
             <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
             <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
             <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
           </div>
           
           <div className="absolute inset-0 pt-8">
             <Image src={screen.imageSrc} alt={screen.title} fill className="object-cover object-top opacity-80 group-hover:scale-105 group-hover:opacity-100 transition-all duration-700 ease-out" />
           </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <section className="py-32 border-t border-white/5 bg-transparent relative z-10">
      <div className="container mx-auto px-6">
        
        {/* Section Header */}
        <div className="mb-16 md:mb-24 text-center max-w-3xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-serif tracking-tight text-[#F5F5F5] mb-6"
          >
            A beautiful workspace.
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-[#A0A0A0]"
          >
            Designed with intention. Every pixel serves your learning.
          </motion.p>
        </div>

        {/* Masonry Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-6xl mx-auto">
          {/* Column 1 */}
          <div className="flex flex-col gap-6 md:gap-8">
            {col1.map((screen, i) => (
              <Card key={screen.title} screen={screen} idx={i} />
            ))}
          </div>
          
          {/* Column 2 (Staggered on Desktop) */}
          <div className="flex flex-col gap-6 md:gap-8 md:pt-24">
            {col2.map((screen, i) => (
              <Card key={screen.title} screen={screen} idx={i + col1.length} />
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
