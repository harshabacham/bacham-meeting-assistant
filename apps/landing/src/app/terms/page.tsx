import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, CheckCircle2, Shield, AlertTriangle, HelpCircle } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service — BACHAM',
  description: 'Terms of Service for the BACHAM AI Meeting & Lecture Assistant platform, desktop application, and browser extensions.',
};

export default function TermsOfServicePage() {
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
            <FileText className="w-4 h-4" /> Legal
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Terms of Service
          </h1>
          <p className="text-zinc-400 text-sm">
            Last Updated: September 13, 2026 • Version 1.0.0
          </p>
        </div>

        {/* Key Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-[#BAFF29]/10 text-[#BAFF29] flex items-center justify-center mb-4">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold mb-2">User Ownership</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              You retain 100% ownership of your recordings, meeting transcripts, notes, and generated summaries.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-[#BAFF29]/10 text-[#BAFF29] flex items-center justify-center mb-4">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold mb-2">Privacy &amp; Security</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              We process audio and data locally on your computer. We do not sell your personal data or training transcripts.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-[#BAFF29]/10 text-[#BAFF29] flex items-center justify-center mb-4">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold mb-2">Open Source &amp; Free</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              BACHAM is released as open-source software under the MIT License with optional BYOK AI capabilities.
            </p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-12 text-zinc-300 leading-relaxed text-sm sm:text-base">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">1. Agreement to Terms</h2>
            <p>
              By downloading, installing, or using the <strong>BACHAM Desktop Application</strong>, <strong>BACHAM Browser Extension</strong>, or visiting the <strong>BACHAM Website</strong> (collectively referred to as the &quot;Services&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you disagree with any part of these Terms, you may not use our Services.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">2. Description of Services</h2>
            <p>
              BACHAM is an AI-powered meeting and lecture capture assistant. Features include:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Dual-stream meeting and lecture audio recording (system loopback and microphone).</li>
              <li>Automated meeting transcription and AI note generation.</li>
              <li>Google Calendar synchronization to organize schedules and upcoming meeting events.</li>
              <li>Cross-platform desktop companion application and browser capture utilities.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">3. Google Services &amp; API Integration</h2>
            <p>
              BACHAM integrates with Google APIs (including Google Sign-In and Google Calendar) to allow users to view their schedules and auto-associate meetings with lecture notes. By connecting your Google account:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You grant BACHAM permission to read and synchronize your calendar event details locally on your machine.</li>
              <li>
                BACHAM&apos;s use and transfer of information received from Google APIs to any other app will adhere to the{' '}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#BAFF29] underline hover:text-white"
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements.
              </li>
              <li>You can revoke BACHAM&apos;s access at any time directly through your Google Account security settings or via the app&apos;s Disconnect button.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">4. User Content &amp; Intellectual Property</h2>
            <p>
              <strong>Your Content:</strong> You retain all ownership rights to any audio files, meeting transcripts, lecture notes, slides, or documents created or imported into BACHAM. Because BACHAM utilizes a local-first architecture, your content is stored on your local disk.
            </p>
            <p>
              <strong>Open Source License:</strong> The software codebase is licensed under the MIT License. You are free to inspect, modify, and contribute to the code in accordance with the repository&apos;s license terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">5. Recording Consent &amp; Compliance</h2>
            <p>
              Recording laws vary significantly by jurisdiction (such as single-party vs. all-party consent laws). You acknowledge and agree that:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You are solely responsible for obtaining any necessary consents from meeting or lecture participants prior to recording.</li>
              <li>You will not use BACHAM for illegal surveillance, wiretapping, or in violation of applicable privacy laws or third-party platform terms (such as Google Meet, Zoom, or Microsoft Teams terms).</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">6. Disclaimer of Warranties</h2>
            <div className="p-4 rounded-xl bg-zinc-900/80 border border-yellow-500/20 text-zinc-300">
              <div className="flex items-center gap-2 text-yellow-400 font-semibold mb-1">
                <AlertTriangle className="w-4 h-4" /> &quot;As Is&quot; Software Warranty
              </div>
              <p className="text-xs leading-relaxed text-zinc-400">
                The Services are provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of any kind, whether express or implied, including fitness for a particular purpose, merchantability, or non-infringement. We do not warrant that speech recognition or AI transcription will always be 100% accurate.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">7. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law, in no event shall BACHAM, its maintainers, or contributors be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of data, loss of profits, or business interruption arising out of your use or inability to use the Services.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">8. Contact &amp; Questions</h2>
            <p>
              If you have any questions or feedback regarding these Terms of Service, please contact the developer team:
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
