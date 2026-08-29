import React from 'react';
import { motion } from 'framer-motion';

export type MascotMood = 'happy' | 'listening' | 'thinking' | 'recording' | 'success';

interface MascotAvatarProps {
  mood?: MascotMood;
  size?: number;
  className?: string;
  animate?: boolean;
}

export const MascotAvatar: React.FC<MascotAvatarProps> = ({
  mood = 'happy',
  size = 40,
  className = '',
  animate = true,
}) => {
  return (
    <motion.div
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      animate={
        animate
          ? {
              y: [0, -3, 0],
              rotate: [0, 1, -1, 0],
            }
          : {}
      }
      transition={{
        duration: 3.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {/* Outer Glow Halo */}
      <div
        className="absolute inset-0 rounded-full blur-md opacity-60"
        style={{
          background:
            mood === 'recording'
              ? 'radial-gradient(circle, rgba(239,68,68,0.8) 0%, transparent 70%)'
              : mood === 'listening'
              ? 'radial-gradient(circle, rgba(16,185,129,0.8) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(99,102,241,0.8) 0%, transparent 70%)',
        }}
      />

      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 drop-shadow-md"
      >
        {/* Antenna */}
        <line x1="50" y1="18" x2="50" y2="6" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
        <motion.circle
          cx="50"
          cy="6"
          r="5"
          fill={
            mood === 'recording'
              ? '#ef4444'
              : mood === 'listening'
              ? '#10b981'
              : '#6366f1'
          }
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />

        {/* Robot Head Body */}
        <rect
          x="16"
          y="18"
          width="68"
          height="60"
          rx="22"
          fill="url(#botGradient)"
          stroke="#cbd5e1"
          strokeWidth="3"
        />

        {/* Glossy Top Highlight */}
        <path
          d="M 26 22 Q 50 26 74 22 C 78 28 80 34 80 34 C 50 38 30 36 20 34 Z"
          fill="rgba(255, 255, 255, 0.4)"
        />

        {/* Ear Bolts */}
        <rect x="8" y="38" width="8" height="20" rx="4" fill="#64748b" stroke="#cbd5e1" strokeWidth="2" />
        <rect x="84" y="38" width="8" height="20" rx="4" fill="#64748b" stroke="#cbd5e1" strokeWidth="2" />

        {/* Dark Screen Face */}
        <rect
          x="24"
          y="28"
          width="52"
          height="40"
          rx="14"
          fill="#0f172a"
          stroke="#1e293b"
          strokeWidth="2"
        />

        {/* Expressive Eyes */}
        {mood === 'happy' && (
          <g fill="#38bdf8">
            {/* Curved Happy Eyes ^^ */}
            <path d="M33 46 Q40 38 47 46" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M53 46 Q60 38 67 46" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" fill="none" />
            {/* Rosy Cheeks */}
            <circle cx="30" cy="56" r="3" fill="#f43f5e" opacity="0.6" />
            <circle cx="70" cy="56" r="3" fill="#f43f5e" opacity="0.6" />
            {/* Cute Smile */}
            <path d="M44 54 Q50 60 56 54" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" fill="none" />
          </g>
        )}

        {mood === 'listening' && (
          <g fill="#34d399">
            {/* Big Wide Curious Eyes */}
            <motion.ellipse
              cx="38"
              cy="45"
              rx="6"
              ry="8"
              fill="#34d399"
              animate={{ scaleY: [1, 0.1, 1] }}
              transition={{ duration: 3, repeat: Infinity, times: [0, 0.05, 0.1] }}
            />
            <motion.ellipse
              cx="62"
              cy="45"
              rx="6"
              ry="8"
              fill="#34d399"
              animate={{ scaleY: [1, 0.1, 1] }}
              transition={{ duration: 3, repeat: Infinity, times: [0, 0.05, 0.1] }}
            />
            {/* Eye Highlights */}
            <circle cx="36" cy="42" r="2.5" fill="#ffffff" />
            <circle cx="60" cy="42" r="2.5" fill="#ffffff" />
            {/* Audio Wave Mouth */}
            <motion.path
              d="M42 58 Q50 52 58 58"
              stroke="#34d399"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              animate={{ d: ['M42 58 Q50 52 58 58', 'M42 56 Q50 62 58 56', 'M42 58 Q50 52 58 58'] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
          </g>
        )}

        {mood === 'recording' && (
          <g fill="#f87171">
            {/* Focused Alert Eyes */}
            <ellipse cx="38" cy="45" rx="6" ry="7" fill="#f87171" />
            <ellipse cx="62" cy="45" rx="6" ry="7" fill="#f87171" />
            <circle cx="36" cy="43" r="2" fill="#ffffff" />
            <circle cx="60" cy="43" r="2" fill="#ffffff" />
            {/* Recording Dot Mouth */}
            <motion.circle
              cx="50"
              cy="56"
              r="3.5"
              fill="#ef4444"
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </g>
        )}

        {mood === 'thinking' && (
          <g fill="#a78bfa">
            {/* Looking Up / Pondering Eyes */}
            <ellipse cx="40" cy="42" rx="6" ry="6" fill="#a78bfa" />
            <ellipse cx="64" cy="42" rx="6" ry="6" fill="#a78bfa" />
            <circle cx="42" cy="40" r="2" fill="#ffffff" />
            <circle cx="66" cy="40" r="2" fill="#ffffff" />
            {/* Wavy Mouth */}
            <path d="M43 56 Q47 53 51 56 T59 56" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round" fill="none" />
          </g>
        )}

        {mood === 'success' && (
          <g fill="#fbbf24">
            {/* Sparkly Star Eyes */}
            <path d="M33 46 Q40 38 47 46" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M53 46 Q60 38 67 46" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" fill="none" />
            {/* Big Open Smile :D */}
            <path d="M42 53 Q50 63 58 53 Z" fill="#fbbf24" />
          </g>
        )}

        {/* Gradients */}
        <defs>
          <linearGradient id="botGradient" x1="16" y1="18" x2="84" y2="78" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f8fafc" />
            <stop offset="0.5" stopColor="#e2e8f0" />
            <stop offset="1" stopColor="#cbd5e1" />
          </linearGradient>
        </defs>
      </svg>
    </motion.div>
  );
};
