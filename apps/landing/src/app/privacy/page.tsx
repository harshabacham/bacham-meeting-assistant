import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Lock, EyeOff, Server, Key } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy — BACHAM',
  description: 'Privacy Policy for the BACHAM AI Meeting & Lecture Assistant Chrome Extension.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-col w-full min-h-screen bg-[#000000] text-[#F8F9FA] px-6 py-20 lg:px-8">
      <div className="max-w-4xl mx-auto w-full">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-[#BAFF29] transition-colors mb-12"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        {/* Header */}
        <div className="border-b border-white/10 pb-8 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#BAFF29]/10 border border-[#BAFF29]/20 text-[#BAFF29] text-xs font-semibold uppercase tracking-wider mb-4">
            <ShieldCheck className="w-4 h-4" /> Privacy Policy
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            BACHAM Chrome Extension Privacy Policy
          </h1>
          <p className="text-zinc-400 text-sm">
            Last Updated: September 10, 2026 • Version 0.1.0
          </p>
        </div>

        {/* Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-[#BAFF29]/10 text-[#BAFF29] flex items-center justify-center mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold mb-2">100% Local-First</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Recordings and notes process on your device. We do not operate cloud databases or external audio servers.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-[#BAFF29]/10 text-[#BAFF29] flex items-center justify-center mb-4">
              <EyeOff className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold mb-2">Zero Tracking</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              No telemetry, tracking pixels, ad trackers, or browsing history collection of any kind.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-[#BAFF29]/10 text-[#BAFF29] flex items-center justify-center mb-4">
              <Key className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold mb-2">BYOK Architecture</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Optional AI summaries run through your own personal Google Gemini API key directly from your browser.
            </p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-12 text-zinc-300 leading-relaxed text-sm sm:text-base">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">1. Single Purpose Declaration</h2>
            <p>
              The <strong>BACHAM — AI Meeting & Lecture Capture</strong> browser extension has a single, focused purpose: <em>to capture browser tab audio, video, and slide screenshots during lectures and meetings, and synchronize them with the local BACHAM desktop assistant.</em>
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">2. Permissions & Data Usage Disclosures</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-white/10 text-sm">
                <thead>
                  <tr className="bg-zinc-900/80 text-zinc-200">
                    <th className="p-3 border border-white/10">Permission</th>
                    <th className="p-3 border border-white/10">Purpose & Usage</th>
                    <th className="p-3 border border-white/10">Storage / Transmission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr>
                    <td className="p-3 font-mono text-[#BAFF29]">tabCapture & activeTab</td>
                    <td className="p-3">Captures tab audio and visual stream when you click Record.</td>
                    <td className="p-3">Processed in local offscreen document; streamed only to local app (127.0.0.1).</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-[#BAFF29]">tabs</td>
                    <td className="p-3">Reads active lecture title and URL to automatically label your session.</td>
                    <td className="p-3">Stored locally in your browser session.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-[#BAFF29]">storage & unlimitedStorage</td>
                    <td className="p-3">Saves recording preferences, offline chunks, and local notes.</td>
                    <td className="p-3">Sandboxed browser storage (IndexedDB & chrome.storage.local).</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-[#BAFF29]">alarms</td>
                    <td className="p-3">Maintains periodic slide change checks and companion heartbeats.</td>
                    <td className="p-3">No external transmission.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-[#BAFF29]">nativeMessaging</td>
                    <td className="p-3">Enables secure communication with the companion BACHAM Desktop Application.</td>
                    <td className="p-3">Local IPC on the user&apos;s machine only.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-[#BAFF29]">sidePanel</td>
                    <td className="p-3">Renders the notes and capture UI beside your meeting tab.</td>
                    <td className="p-3">Internal browser UI.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-[#BAFF29]">host_permissions</td>
                    <td className="p-3">Local loopback (http://127.0.0.1/*) for companion app & Google Gemini API.</td>
                    <td className="p-3">Local desktop app and official Google Generative AI endpoints only.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">3. Data We Never Collect</h2>
            <ul className="list-disc pl-6 space-y-2 text-zinc-400">
              <li>No personal identifiers, emails, names, or account passwords.</li>
              <li>No keystrokes, form submissions, or private chat interactions.</li>
              <li>No background browsing activity or history on non-recorded tabs.</li>
              <li>No cookies, session tokens, or payment details.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">4. User Rights & Data Deletion</h2>
            <p>
              You maintain 100% ownership and control over your lecture recordings and notes. You can pause, stop, or discard any capture at any time. You can clear all cached notes and session history with one click in the extension settings or by removing the extension.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">5. Contact & Open Source Verification</h2>
            <p>
              BACHAM is completely open source. You can inspect every line of code on our GitHub repository:
            </p>
            <p>
              <a
                href="https://github.com/harshabacham/bacham-meeting-assistant"
                target="_blank"
                rel="noreferrer"
                className="text-[#BAFF29] underline hover:text-[#a3e622]"
              >
                https://github.com/harshabacham/bacham-meeting-assistant
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
