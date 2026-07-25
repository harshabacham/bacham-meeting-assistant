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
      <div className="flex flex-col items-center text-center px-6 pt-10 pb-6">
        <div className="relative mb-5">
          <div className="absolute inset-0 rounded-2xl" style={{ background: 'radial-gradient(circle, rgba(10,132,255,0.2) 0%, transparent 70%)', filter: 'blur(12px)', transform: 'scale(1.2)' }} />
          <img src={logo} alt="BACHAM" className="relative w-16 h-16 rounded-2xl object-cover" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }} />
        </div>
        <h1 className="text-[24px] font-bold leading-tight mb-1.5" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
          BACHAM
        </h1>
        <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          AI-powered lecture capture
        </p>
      </div>

      {/* Feature list */}
      <div className="flex-1 px-4">
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
          {features.map(({ icon: Icon, color, label, desc }, idx) => (
            <div key={label}>
              {idx > 0 && <div style={{ height: 1, background: 'var(--separator)', marginLeft: 52 }} />}
              <div className="flex items-center px-4 py-3.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mr-3.5 flex-shrink-0" style={{ background: `${color}18` }}>
                  <Icon size={15} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>{label}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pt-4 pb-5">
        <button
          onClick={onComplete}
          className="btn-apple w-full gap-2"
          style={{
            height: 48,
            background: 'var(--accent)',
            color: '#fff',
            fontSize: 15,
            fontWeight: 600,
            boxShadow: '0 0 24px rgba(10,132,255,0.35)',
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 32px rgba(10,132,255,0.5)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 24px rgba(10,132,255,0.35)'; }}>
          Get Started
          <ChevronRight size={15} />
        </button>
        <p className="text-[11px] text-center mt-2.5" style={{ color: 'var(--text-muted)' }}>
          Requires BACHAM Desktop App
        </p>
      </div>
    </div>
  );
}
