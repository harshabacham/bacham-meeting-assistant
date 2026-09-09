import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader, Dancing_Script } from "next/font/google";
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

const dancingScript = Dancing_Script({
  variable: "--font-dancing",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  title: "Bacham — Every word captured. Every action tracked. Lives on your SSD.",
  description: "Bacham captures both sides of your audio — mic & system loopback — transcribes locally with Whisper, and surfaces timestamped action items & 1-click flashcards in real time. No bot. No cloud.",
  keywords: [
    "AI notepad",
    "meeting notepad",
    "lecture AI copilot",
    "dual-stream audio capture",
    "timestamped action items",
    "study flashcards",
    "quiz generator",
    "Granola alternative",
    "local AI",
    "Whisper",
    "Ollama",
    "100% on your SSD",
    "private AI",
  ],
  authors: [{ name: "Bacham Team" }],
  openGraph: {
    title: "Bacham — The AI Notepad for back-to-back meetings & lectures",
    description: "Dual-stream audio capture. Notes, timestamped actions, and 1-click study flashcards. Without an uninvited meeting bot. 100% on your SSD.",
    url: "https://bacham.app",
    siteName: "Bacham",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bacham — The AI Notepad for back-to-back meetings & lectures",
    description: "Dual-stream audio capture. Notes, timestamped actions, and 1-click study flashcards. Without an uninvited meeting bot. 100% on your SSD.",
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
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} ${dancingScript.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[#000000] text-[#FFFFFF] font-sans selection:bg-[#D1E043]/40 selection:text-[#000000] relative overflow-x-hidden">
        {/* Subtle Pure Black Ambient Lighting */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-[200px] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1C1C20]/45 via-transparent to-transparent blur-[140px]" />
          <div className="absolute top-[40%] -right-[200px] w-[500px] h-[500px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#141418]/60 via-transparent to-transparent blur-[120px]" />
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
