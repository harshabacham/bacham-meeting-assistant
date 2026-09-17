import React from 'react';
import { Mic, BrainCircuit, GraduationCap, ChevronRight } from 'lucide-react';
import logo from '@/assets/logo.png';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps): React.ReactElement {
  const features = [
    { icon: Mic, color: '#0A84FF', label: 'Capture Audio & Video', desc: 'Record any browser tab with one click.' },
    { icon: BrainCircuit, color: '#30D158', label: 'AI Transcription', desc: 'Auto-transcribed with summaries and notes.' },
    { icon: GraduationCap, color: '#BF5AF2', label: 'Study Tools', desc: 'Flashcards and quizzes generated for you.' },
  ];

  return (
    <div className="flex flex-col animate-fade-in" style={{ background: 'var(--bg)', minHeight: 460 }}>
      {/* Hero */}
      <div className="flex flex-col items-center text-center px-6 pt-12 pb-8">
        <img src={logo} alt="BACHAM" className="w-16 h-16 rounded-2xl object-cover mb-4" />
        <h1 className="text-[22px] font-semibold leading-tight mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          BACHAM
        </h1>
        <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          AI-powered lecture capture
        </p>
      </div>

      {/* Feature list */}
      <div className="flex-1 px-8 flex flex-col justify-center gap-6">
        {features.map(({ icon: Icon, color, label, desc }) => (
          <div key={label} className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <Icon size={22} style={{ color }} />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[14px] font-medium leading-tight mb-1" style={{ color: 'var(--text-primary)' }}>{label}</p>
              <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="px-6 pt-8 pb-6">
        <button
          onClick={onComplete}
          className="w-full flex items-center justify-center gap-2 rounded-xl transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
          style={{
            height: 48,
            background: 'var(--accent)',
            color: 'var(--bg)', // Use dark text for contrast against the bright accent
            fontSize: 15,
            fontWeight: 600,
          }}>
          Get Started
          <ChevronRight size={16} />
        </button>
        <p className="text-[11px] text-center mt-3" style={{ color: 'var(--text-muted)' }}>
          Requires BACHAM Desktop App
        </p>
      </div>
    </div>
  );
}
