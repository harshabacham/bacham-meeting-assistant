import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Lock, EyeOff, Server, Key, Calendar, CheckCircle } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy — BACHAM',
  description: 'Privacy Policy for the BACHAM AI Meeting & Lecture Assistant platform, desktop app, and browser extension.',
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
            BACHAM Privacy Policy
          </h1>
          <p className="text-zinc-400 text-sm">
            Last Updated: September 13, 2026 • Version 1.0.0
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
              Recordings, speech-to-text transcripts, and notes process directly on your device. We do not operate external audio surveillance servers.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-[#BAFF29]/10 text-[#BAFF29] flex items-center justify-center mb-4">
              <EyeOff className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold mb-2">Zero Data Selling</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              We never sell your personal data, recordings, transcripts, or calendar items to advertisers, data brokers, or third parties.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-[#BAFF29]/10 text-[#BAFF29] flex items-center justify-center mb-4">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold mb-2">Google Limited Use</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Google Calendar access is used strictly to display and organize your meeting schedules, adhering to Google&apos;s Limited Use policy.
            </p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-12 text-zinc-300 leading-relaxed text-sm sm:text-base">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">1. Introduction &amp; Scope</h2>
            <p>
              This Privacy Policy explains how <strong>BACHAM</strong> (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects, uses, and safeguards information when you use the <strong>BACHAM Desktop Application</strong>, the <strong>BACHAM Browser Extension</strong>, and our website (collectively, the &quot;Services&quot;).
            </p>
            <p>
              BACHAM is built on a local-first philosophy: our primary design goal is that your confidential meetings, personal lectures, and audio recordings remain strictly on your own hardware.
            </p>
          </section>

          {/* Google API Limited Use Section - REQUIRED BY GOOGLE */}
          <section className="space-y-4 p-6 rounded-2xl bg-zinc-900/80 border border-[#BAFF29]/20">
            <div className="flex items-center gap-2 text-[#BAFF29] font-bold text-lg">
              <ShieldCheck className="w-5 h-5" />
              <h2>2. Google API Services User Data Policy &amp; Limited Use Disclosure</h2>
            </div>
            <p className="text-zinc-200">
              BACHAM&apos;s use and transfer to any other app of information received from Google APIs will adhere to the{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#BAFF29] font-semibold underline hover:text-white"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
            <div className="space-y-3 pt-2 text-sm text-zinc-300">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-[#BAFF29] shrink-0 mt-1" />
                <span><strong>No Human Reading:</strong> No human at BACHAM ever reads or accesses your Google Calendar events or account data.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-[#BAFF29] shrink-0 mt-1" />
                <span><strong>No Generalized AI Model Training:</strong> Information received from Google APIs is never used to train generalized artificial intelligence or machine learning models.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-[#BAFF29] shrink-0 mt-1" />
                <span><strong>No Advertising or Sale:</strong> We do not sell Google user data or use it to serve advertisements.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-[#BAFF29] shrink-0 mt-1" />
                <span><strong>Minimal Permissions:</strong> Google Calendar data is fetched only to show upcoming meetings inside your dashboard and associate notes with specific meetings.</span>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">3. Information We Access and How It Is Handled</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-white/10 text-sm">
                <thead>
                  <tr className="bg-zinc-900/80 text-zinc-200">
                    <th className="p-3 border border-white/10">Data Type</th>
                    <th className="p-3 border border-white/10">Purpose</th>
                    <th className="p-3 border border-white/10">Storage Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr>
                    <td className="p-3 font-semibold text-white">Google Account Profile (Email, Name)</td>
                    <td className="p-3">Authenticates your user session and displays your profile name in the app header.</td>
                    <td className="p-3">Local app state / secure storage. Never shared with third parties.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-white">Google Calendar Events</td>
                    <td className="p-3">Displays your schedule in the Upcoming Meetings widget and links notes to meeting titles.</td>
                    <td className="p-3">Stored locally on your device in your local database. Zero cloud sync to BACHAM servers.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-white">Audio Recordings &amp; Transcripts</td>
                    <td className="p-3">Transcribes spoken speech into editable notes during lectures or meetings.</td>
                    <td className="p-3">Stored 100% locally on your local disk in your designated storage folder.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-white">AI API Keys (BYOK)</td>
                    <td className="p-3">Allows you to connect your personal Google Gemini API key to generate summaries.</td>
                    <td className="p-3">Stored encrypted in your local machine preferences. Sent only to Google AI endpoints.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">4. Chrome Extension Specific Disclosures</h2>
            <p>
              The <strong>BACHAM Chrome Extension</strong> captures active browser tab audio and video streams solely when you explicitly toggle the recording button.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Local Stream Only:</strong> Media is streamed directly through an offscreen document to your local desktop assistant over loopback (<code>http://127.0.0.1:1422</code>).</li>
              <li><strong>No Background Surveillance:</strong> The extension does not inspect web pages, inject ads, record keystrokes, or monitor tabs outside active recording sessions.</li>
              <li><strong>Zero Remote Analytics:</strong> The extension contains zero third-party telemetry, trackers, or behavioral trackers.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">5. Data Retention &amp; User Control</h2>
            <p>
              Because your notes, recordings, and calendar feeds reside on your local machine:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Full Control:</strong> You can delete any recording, meeting note, or calendar event from the app or your filesystem at any time.</li>
              <li><strong>Disconnect Google Account:</strong> You can disconnect Google Calendar or your Google account at any time via the Settings &gt; Disconnect button. Upon disconnection, local tokens are immediately purged.</li>
              <li><strong>Revoke Access:</strong> You can permanently revoke BACHAM&apos;s permissions anytime via your <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-[#BAFF29] underline">Google Account Security page</a>.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">6. Security</h2>
            <p>
              We implement industry-standard security safeguards. OAuth 2.0 PKCE flow is utilized for authentication, and sensitive credentials (such as OAuth access tokens and AI API keys) are stored in secure local storage or system keychain mechanisms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">7. Changes to This Policy</h2>
            <p>
              If we modify this Privacy Policy, we will post the revised version with an updated &quot;Last Updated&quot; date on this page and through software release notes.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">8. Contact Us</h2>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or your data, please contact:
            </p>
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5 space-y-1">
              <p><strong>Maintainer:</strong> Harsha Bacham</p>
              <p><strong>Email:</strong> <a href="mailto:bachamharsha4091@gmail.com" className="text-[#BAFF29] underline">bachamharsha4091@gmail.com</a></p>
              <p><strong>Repository:</strong> <a href="https://github.com/harshabacham/bacham-meeting-assistant" target="_blank" rel="noopener noreferrer" className="text-[#BAFF29] underline">github.com/harshabacham/bacham-meeting-assistant</a></p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
