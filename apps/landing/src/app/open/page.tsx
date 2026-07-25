"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function OpenAppPage() {
  const [status, setStatus] = useState<"opening" | "failed">("opening");

  useEffect(() => {
    // Attempt to open the custom protocol URI
    window.location.href = "bacham://open";

    // Set a timeout to check if the app launched
    const timeout = setTimeout(() => {
      // If the document is still visible after 2.5 seconds, it probably failed
      if (!document.hidden) {
        setStatus("failed");
      }
    }, 2500);

    // Clean up if the user navigates away or unmounts
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white font-sans selection:bg-[#BAFF29] selection:text-black">
      <div className="max-w-md w-full bg-[#111111] border border-[#222222] rounded-2xl p-10 text-center flex flex-col items-center shadow-2xl relative overflow-hidden">
        
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl overflow-hidden mb-6 relative">
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
            <p className="text-[#999999] text-sm mb-8">
              If nothing happens, you may need to install the desktop application.
            </p>
            <div className="flex items-center justify-center gap-2 text-[#BAFF29]">
              <div className="w-2 h-2 rounded-full bg-current animate-ping" />
              <span className="text-sm font-bold uppercase tracking-widest opacity-80">Connecting</span>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-3 tracking-tight">App Not Found</h1>
            <p className="text-[#999999] text-sm mb-8">
              It looks like BACHAM isn't installed on your system. Download the desktop app to get started.
            </p>
            <Link 
              href="https://github.com/bacham/bacham/releases/latest" 
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#BAFF29] text-black font-bold py-3.5 px-6 rounded-xl hover:bg-[#9CE500] transition-colors focus:ring-4 focus:ring-[#BAFF29]/30 outline-none flex items-center justify-center gap-2"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Download BACHAM
            </Link>
            <button 
              onClick={() => window.location.href = "bacham://open"}
              className="mt-6 text-[#666666] hover:text-white text-sm transition-colors"
            >
              I already installed it, try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
