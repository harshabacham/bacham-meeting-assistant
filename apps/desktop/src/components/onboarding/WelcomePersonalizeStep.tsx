import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  GraduationCap, Terminal, Briefcase, Zap, Microscope,
  Check, FileText, ListTodo, AlignLeft, Sparkles
} from 'lucide-react';

interface RoleOption {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  badge?: string;
}

interface StyleOption {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

const ROLES: RoleOption[] = [
  {
    id: 'student',
    title: 'Student / Academic',
    subtitle: 'Lectures, study decks, active recall quizzes',
    icon: GraduationCap,
    badge: 'Popular',
  },
  {
    id: 'engineer',
    title: 'Software Engineer',
    subtitle: 'Standups, architecture deep-dives, tech specs',
    icon: Terminal,
  },
  {
    id: 'product',
    title: 'Product & Business',
    subtitle: 'Client discovery, roadmap reviews, strategy',
    icon: Briefcase,
  },
  {
    id: 'executive',
    title: 'Founder / Executive',
    subtitle: 'High-speed decisions, board meetings, briefings',
    icon: Zap,
  },
  {
    id: 'researcher',
    title: 'Researcher / Writer',
    subtitle: 'Interviews, domain research, source citations',
    icon: Microscope,
  },
];

const NOTE_STYLES: StyleOption[] = [
  {
    id: 'executive',
    title: 'Executive & Concise',
    description: 'Crisp bullet points, high-level takeaways, and key decisions only.',
    icon: AlignLeft,
  },
  {
    id: 'detailed',
    title: 'Comprehensive & Deep',
    description: 'Full contextual background, structured sections, and detailed transcripts.',
    icon: FileText,
  },
  {
    id: 'action',
    title: 'Action & Task Driven',
    description: 'Prioritized deliverables, explicit task owners (@person), and next steps.',
    icon: ListTodo,
  },
];

interface WelcomePersonalizeStepProps {
  onComplete?: () => void;
}

export const WelcomePersonalizeStep: React.FC<WelcomePersonalizeStepProps> = () => {
  const [selectedRole, setSelectedRole] = useState<string>(() => {
    return localStorage.getItem('bacham_user_role') || 'student';
  });

  const [selectedStyle, setSelectedStyle] = useState<string>(() => {
    return localStorage.getItem('bacham_note_style') || 'action';
  });

  useEffect(() => {
    localStorage.setItem('bacham_user_role', selectedRole);
  }, [selectedRole]);

  useEffect(() => {
    localStorage.setItem('bacham_note_style', selectedStyle);
  }, [selectedStyle]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 text-left">
      {/* Step Header */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime/10 border border-lime/20 text-lime text-xs font-semibold">
          <Sparkles size={12} />
          Tailor Your Experience
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          How will you be using Bacham?
        </h2>
        <p className="text-sm text-white/60">
          We customize your AI note templates, summary prompts, and dashboard widgets based on your focus.
        </p>
      </div>

      {/* ─── Role Selection ─── */}
      <div className="space-y-3">
        <label className="text-xs font-mono uppercase tracking-wider text-white/40 block">
          Select Your Primary Focus
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {ROLES.map((role) => {
            const isSelected = selectedRole === role.id;
            const Icon = role.icon;

            return (
              <motion.button
                key={role.id}
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedRole(role.id)}
                className={`relative text-left p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                  isSelected
                    ? 'border-lime bg-lime/[0.06] shadow-[0_0_24px_rgba(186,255,41,0.12)]'
                    : 'border-white/[0.08] bg-[#141517]/80 hover:bg-[#141517] hover:border-white/20'
                }`}
              >
                {role.badge && (
                  <span className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-lime/20 text-lime border border-lime/30">
                    {role.badge}
                  </span>
                )}

                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                    isSelected ? 'bg-lime text-black' : 'bg-white/5 text-white/70'
                  }`}>
                    <Icon size={18} />
                  </div>
                  <span className="font-semibold text-sm text-white">
                    {role.title}
                  </span>
                </div>

                <p className="text-xs text-white/50 leading-relaxed pr-2">
                  {role.subtitle}
                </p>

                {isSelected && (
                  <div className="absolute bottom-3 right-3 w-5 h-5 rounded-full bg-lime text-black flex items-center justify-center">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ─── Note-Taking Preference ─── */}
      <div className="space-y-3 pt-2">
        <label className="text-xs font-mono uppercase tracking-wider text-white/40 block">
          Default Note Generation Style
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {NOTE_STYLES.map((style) => {
            const isSelected = selectedStyle === style.id;
            const Icon = style.icon;

            return (
              <motion.button
                key={style.id}
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedStyle(style.id)}
                className={`relative text-left p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                  isSelected
                    ? 'border-lime bg-lime/[0.06] shadow-[0_0_24px_rgba(186,255,41,0.12)]'
                    : 'border-white/[0.08] bg-[#141517]/80 hover:bg-[#141517] hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    isSelected ? 'bg-lime text-black' : 'bg-white/5 text-white/70'
                  }`}>
                    <Icon size={16} />
                  </div>
                  <span className="font-semibold text-xs text-white">
                    {style.title}
                  </span>
                </div>

                <p className="text-[11px] text-white/50 leading-relaxed mb-1">
                  {style.description}
                </p>

                {isSelected && (
                  <div className="flex items-center gap-1.5 text-lime text-[11px] font-semibold mt-2">
                    <Check size={12} strokeWidth={3} /> Active Default
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
