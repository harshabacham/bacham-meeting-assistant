import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Bacham — The AI Notepad for back-to-back meetings",
  description: "The AI notepad for back-to-back meetings. Notes, actions and memory. Without a meeting bot. Runs 100% locally on your computer.",
  keywords: [
    "AI notepad",
    "meeting notepad",
    "Granola alternative",
    "local AI",
    "meeting notes",
    "Whisper",
    "Ollama",
    "Google Meet transcription",
    "Zoom transcription",
    "private AI",
  ],
  authors: [{ name: "Bacham Team" }],
  openGraph: {
    title: "Bacham — The AI Notepad for back-to-back meetings",
    description: "Notes, actions and memory. Without a meeting bot. 100% local on macOS and Windows.",
    url: "https://bacham.app",
    siteName: "Bacham",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bacham — The AI Notepad for back-to-back meetings",
    description: "Notes, actions and memory. Without a meeting bot. 100% local on macOS and Windows.",
  },
  icons: {
    icon: "/logo.png",
  },
};

import LenisProvider from "@/components/LenisProvider";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[#FCFBF9] text-[#1E1E1E] font-sans selection:bg-[#D1E043]/50 selection:text-[#1E1E1E] relative overflow-x-hidden">
        {/* Subtle Warm Paper Lighting */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-[200px] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#FAF7EE] via-[#FCFBF9]/60 to-transparent blur-[140px]" />
          <div className="absolute top-[40%] -right-[200px] w-[500px] h-[500px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#F4F1E8]/50 via-transparent to-transparent blur-[120px]" />
        </div>

        <LenisProvider>
          <Navbar />
          <main className="flex-1 flex flex-col relative z-10">{children}</main>
          <Footer />
        </LenisProvider>
      </body>
    </html>
  );
}
