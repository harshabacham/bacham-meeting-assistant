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
  title: "Bacham — The 100% Local AI Meeting Wingman",
  description: "Capture Google Meet, Zoom, and system audio in real-time. Automated executive summaries, decisions, action items, and slide snapshots. Zero bots, 100% private.",
  keywords: [
    "AI meeting assistant",
    "local AI",
    "meeting notes",
    "Whisper",
    "Ollama",
    "Google Meet transcription",
    "Zoom transcription",
    "private AI",
    "Granola alternative",
  ],
  authors: [{ name: "Bacham Team" }],
  openGraph: {
    title: "Bacham — The 100% Local AI Meeting Wingman",
    description: "Capture meetings instantly. Real-time transcription, automated decisions & action items. No bots, 100% private.",
    url: "https://bacham.app",
    siteName: "Bacham",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bacham — The 100% Local AI Meeting Wingman",
    description: "Capture meetings instantly. Real-time transcription, automated decisions & action items. No bots, 100% private.",
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
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[#090A0C] text-[#FAF9F5] font-sans selection:bg-[#E2B774]/25 selection:text-[#FAF9F5] relative overflow-x-hidden">
        {/* Ambient Subtle Mesh Lighting */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-[200px] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#E2B774]/[0.08] via-transparent to-transparent blur-[120px]" />
          <div className="absolute top-[35%] -left-[200px] w-[600px] h-[600px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500/[0.04] via-transparent to-transparent blur-[140px]" />
          <div className="absolute top-[65%] -right-[200px] w-[600px] h-[600px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#E2B774]/[0.04] via-transparent to-transparent blur-[140px]" />
          {/* Fine subtle noise overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60" />
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
