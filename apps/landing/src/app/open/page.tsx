"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Download, RefreshCw } from "lucide-react";

export default function OpenAppPage() {
  const [status, setStatus] = useState<"opening" | "failed">("opening");

  useEffect(() => {
    // Attempt to open the custom protocol URI
    window.location.href = "bacham://open";

    // Set a timeout to check if the app launched
    const timeout = setTimeout(() => {
      if (!document.hidden) {
        setStatus("failed");
      }
    }, 2500);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0C] flex flex-col items-center justify-center p-6 text-[#F8F9FA] font-sans selection:bg-[#BAFF29]/30 selection:text-[#F8F9FA]">
      <div className="max-w-md w-full bg-[#141517] border border-white/[0.08] rounded-2xl p-10 text-center flex flex-col items-center shadow-2xl relative overflow-hidden">
        
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl overflow-hidden mb-6 relative border border-white/10 shadow-md">
          <Image 
            src="/logo.png" 
            alt="BACHAM Logo" 
            fill 
            className="object-cover"
          />
        </div>

        {status === "opening" ? (
          <>
            <h1 className="text-2xl font-bold mb-3 tracking-tight">Opening Workspace...</h1>
            <p className="text-white/60 text-sm mb-8 leading-relaxed">
              Connecting to your local Bacham desktop instance.
            </p>
            <div className="flex items-center justify-center gap-2 text-[#BAFF29]">
              <div className="w-2 h-2 rounded-full bg-current animate-ping" />
              <span className="text-xs font-black uppercase tracking-widest opacity-80">Connecting</span>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-3 tracking-tight">App Not Found</h1>
            <p className="text-white/60 text-sm mb-8 leading-relaxed">
              It looks like Bacham isn&apos;t running or installed on your system. Download the desktop app to get started.
            </p>
            <a 
              href="/downloads/bacham-setup.exe"
              download="bacham-setup.exe"
              className="w-full bg-[#BAFF29] hover:bg-[#a3e622] text-[#0A0A0C] font-black py-3.5 px-6 rounded-xl transition-all shadow-[0_4px_20px_rgba(186,255,41,0.2)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download size={18} strokeWidth={2.5} />
              <span>Download Bacham (.exe)</span>
            </a>
            <button 
              type="button"
              onClick={() => {
                setStatus("opening");
                window.location.href = "bacham://open";
              }}
              className="mt-6 text-white/60 hover:text-[#F8F9FA] text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>I already installed it, try again</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
