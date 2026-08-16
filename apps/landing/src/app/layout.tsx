import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BACHAM — Your Local AI Meeting Wingman",
  description: "Capture meetings, get real-time AI insights, generate smart notes and flashcards. 100% local. No cloud. No tracking.",
  keywords: ["AI meetings", "local AI", "meeting assistant", "Ollama", "transcription", "privacy"],
  openGraph: {
    title: "BACHAM — Your Local AI Meeting Wingman",
    description: "Capture meetings instantly. Get real-time insights powered by Ollama, OpenAI, or Anthropic. All 100% local.",
    type: "website",
  },
};

import LenisProvider from "@/components/LenisProvider";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ShaderBackground from "@/components/ShaderBackground";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[#050505] text-[#F0F0F0]">
        <ShaderBackground />
        <LenisProvider>
          <Navbar />
          <main className="flex-1 flex flex-col relative z-10">{children}</main>
          <Footer />
        </LenisProvider>
      </body>
    </html>
  );
}
