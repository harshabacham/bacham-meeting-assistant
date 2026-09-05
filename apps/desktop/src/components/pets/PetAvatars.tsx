import React from 'react';
import { motion } from 'framer-motion';
import { PetId } from '@/shared/stores/petStore';

interface PetAvatarProps {
  id: PetId;
  size?: number;
  isHovered?: boolean;
  isThinking?: boolean;
  className?: string;
}

export const PetAvatar: React.FC<PetAvatarProps> = ({
  id,
  size = 64,
  isHovered = false,
  isThinking = false,
  className = '',
}) => {
  // Common container with smooth scaling & hover spring
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative select-none flex items-center justify-center ${className}`}
    >
      {id === 'codex' && <NovaAvatar isHovered={isHovered} isThinking={isThinking} />}
      {id === 'dewey' && <DeweyAvatar isHovered={isHovered} isThinking={isThinking} />}
      {id === 'fireball' && <FireballAvatar isHovered={isHovered} isThinking={isThinking} />}
      {id === 'hoots' && <HootsAvatar isHovered={isHovered} isThinking={isThinking} />}
      {id === 'rocky' && <RockyAvatar isHovered={isHovered} isThinking={isThinking} />}
      {id === 'seedy' && <SeedyAvatar isHovered={isHovered} isThinking={isThinking} />}
      {id === 'stacky' && <StackyAvatar isHovered={isHovered} isThinking={isThinking} />}
      {id === 'bsod' && <BsodAvatar isHovered={isHovered} isThinking={isThinking} />}
      {id === 'null_signal' && <NullSignalAvatar isHovered={isHovered} isThinking={isThinking} />}
    </div>
  );
};

/* ─── 1. NOVA (Purple cloud robot with >_ badge) ─────────────────────────── */
const NovaAvatar = ({ isHovered, isThinking }: { isHovered: boolean; isThinking: boolean }) => (
  <motion.div
    animate={{ y: isHovered ? -3 : [0, -4, 0] }}
    transition={isHovered ? { duration: 0.2 } : { duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
    className="w-full h-full relative flex flex-col items-center justify-center"
  >
    <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
      {/* Cloud-like puffy ears */}
      <path d="M 22 45 C 10 38 12 20 28 22 C 34 10 52 10 60 20 C 70 12 86 18 84 32 C 94 40 88 58 76 60 C 74 72 58 76 46 72 C 32 78 18 70 22 45 Z" fill="#8B5CF6" />
      <path d="M 24 43 C 14 37 16 22 30 24 C 35 14 50 14 58 22 C 67 15 82 20 80 32 C 89 39 84 54 74 56 C 72 66 58 70 47 67 C 34 72 22 65 24 43 Z" fill="#A855F7" />
      
      {/* Face Screen */}
      <rect x="28" y="32" width="44" height="30" rx="10" fill="#1E1B4B" stroke="#6D28D9" strokeWidth="2.5" />
      
      {/* Eyes */}
      {isThinking ? (
        <g stroke="#38BDF8" strokeWidth="3" strokeLinecap="round">
          <line x1="38" y1="47" x2="46" y2="47" />
          <line x1="54" y1="47" x2="62" y2="47" />
        </g>
      ) : isHovered ? (
        <g stroke="#38BDF8" strokeWidth="3.5" fill="none" strokeLinecap="round">
          <path d="M 37 49 Q 42 43 47 49" />
          <path d="M 53 49 Q 58 43 63 49" />
        </g>
      ) : (
        <g stroke="#38BDF8" strokeWidth="3.5" fill="none" strokeLinecap="round">
          <path d="M 37 46 Q 42 50 47 46" />
          <path d="M 53 46 Q 58 50 63 46" />
        </g>
      )}

      {/* Robot Body */}
      <rect x="36" y="66" width="28" height="20" rx="8" fill="#7C3AED" />
      
      {/* >_ Chest Logo */}
      <text x="44" y="80" fill="#FFFFFF" fontSize="11" fontWeight="bold" fontFamily="monospace">&gt;_</text>

      {/* Tiny Feet */}
      <ellipse cx="42" cy="88" rx="5" ry="3" fill="#6D28D9" />
      <ellipse cx="58" cy="88" rx="5" ry="3" fill="#6D28D9" />
    </svg>
  </motion.div>
);

/* ─── 2. DEWEY (Teal water drop) ────────────────────────────────────────── */
const DeweyAvatar = ({ isHovered }: { isHovered: boolean; isThinking?: boolean }) => (
  <motion.div
    animate={{ scale: isHovered ? [1, 1.05, 1] : [1, 0.97, 1] }}
    transition={isHovered ? { duration: 0.3 } : { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
    className="w-full h-full relative flex items-center justify-center"
  >
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {/* Water Drop Body */}
      <path d="M 50 12 C 50 12 85 52 85 68 C 85 84 69 92 50 92 C 31 92 15 84 15 68 C 15 52 50 12 50 12 Z" fill="#38BDF8" />
      <path d="M 50 16 C 50 16 80 53 80 67 C 80 81 66 88 50 88 C 34 88 20 81 20 67 C 20 53 50 16 50 16 Z" fill="#0EA5E9" />
      
      {/* Glossy Reflection */}
      <ellipse cx="38" cy="45" rx="8" ry="16" transform="rotate(-25 38 45)" fill="#FFFFFF" opacity="0.45" />

      {/* Cute Eyes */}
      <circle cx="40" cy="62" r="4.5" fill="#0F172A" />
      <circle cx="60" cy="62" r="4.5" fill="#0F172A" />
      <circle cx="41.5" cy="60.5" r="1.8" fill="#FFFFFF" />
      <circle cx="61.5" cy="60.5" r="1.8" fill="#FFFFFF" />

      {/* Blush */}
      <ellipse cx="33" cy="68" rx="4" ry="2" fill="#F43F5E" opacity="0.5" />
      <ellipse cx="67" cy="68" rx="4" ry="2" fill="#F43F5E" opacity="0.5" />

      {/* Smile */}
      <path d="M 46 69 Q 50 74 54 69" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  </motion.div>
);

/* ─── 3. FIREBALL (Flame character) ─────────────────────────────────────── */
const FireballAvatar = ({ isHovered }: { isHovered: boolean; isThinking?: boolean }) => (
  <motion.div
    animate={{ y: isHovered ? -3 : [0, -3, 0] }}
    transition={isHovered ? { duration: 0.2 } : { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
    className="w-full h-full relative flex items-center justify-center"
  >
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {/* Outer Flame */}
      <path d="M 50 10 C 62 28 85 45 85 68 C 85 86 69 94 50 94 C 31 94 15 86 15 68 C 15 45 38 28 50 10 Z" fill="#F97316" />
      {/* Inner Flame */}
      <path d="M 50 25 C 58 38 75 52 75 70 C 75 83 64 88 50 88 C 36 88 25 83 25 70 C 25 52 42 38 50 25 Z" fill="#FACC15" />
      
      {/* Fiery Core */}
      <ellipse cx="50" cy="72" rx="16" ry="12" fill="#FFF7ED" />

      {/* Eyes */}
      <ellipse cx="43" cy="66" rx="3.5" ry="5" fill="#0F172A" />
      <ellipse cx="57" cy="66" rx="3.5" ry="5" fill="#0F172A" />
      <circle cx="44.5" cy="64" r="1.5" fill="#FFFFFF" />
      <circle cx="58.5" cy="64" r="1.5" fill="#FFFFFF" />

      {/* Excited Mouth */}
      <path d="M 46 75 Q 50 81 54 75" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  </motion.div>
);

/* ─── 4. HOOTS (Orange Owl with Glasses) ────────────────────────────────── */
const HootsAvatar = ({ isHovered }: { isHovered: boolean; isThinking?: boolean }) => (
  <motion.div
    animate={{ rotate: isHovered ? [0, -5, 5, 0] : 0 }}
    transition={{ duration: 0.4 }}
    className="w-full h-full relative flex items-center justify-center"
  >
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {/* Ear Tufts */}
      <polygon points="25,35 18,15 40,25" fill="#EA580C" />
      <polygon points="75,35 82,15 60,25" fill="#EA580C" />

      {/* Body */}
      <ellipse cx="50" cy="58" rx="34" ry="32" fill="#FB923C" />
      <ellipse cx="50" cy="64" rx="22" ry="20" fill="#FFEDD5" />

      {/* Beak */}
      <polygon points="50,56 44,48 56,48" fill="#F59E0B" />

      {/* Big Eyes */}
      <circle cx="36" cy="46" r="12" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2" />
      <circle cx="64" cy="46" r="12" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2" />
      <circle cx="36" cy="46" r="5" fill="#0F172A" />
      <circle cx="64" cy="46" r="5" fill="#0F172A" />
      <circle cx="38" cy="44" r="2" fill="#FFFFFF" />
      <circle cx="66" cy="44" r="2" fill="#FFFFFF" />

      {/* Round Glasses Frames */}
      <circle cx="36" cy="46" r="14" fill="none" stroke="#78350F" strokeWidth="3" />
      <circle cx="64" cy="46" r="14" fill="none" stroke="#78350F" strokeWidth="3" />
      <line x1="50" y1="46" x2="50" y2="46" stroke="#78350F" strokeWidth="4" />
      <line x1="22" y1="46" x2="16" y2="44" stroke="#78350F" strokeWidth="2.5" />
      <line x1="78" y1="46" x2="84" y2="44" stroke="#78350F" strokeWidth="2.5" />
    </svg>
  </motion.div>
);

/* ─── 5. ROCKY (Stone with Sprout) ───────────────────────────────────────── */
const RockyAvatar = ({ isHovered }: { isHovered: boolean; isThinking?: boolean }) => (
  <motion.div
    animate={{ y: isHovered ? -2 : 0 }}
    transition={{ duration: 0.2 }}
    className="w-full h-full relative flex items-center justify-center"
  >
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {/* Tiny Sprout Top */}
      <path d="M 50 35 C 45 20 30 22 36 32 C 42 35 50 35 50 35 Z" fill="#4ADE80" />
      <path d="M 50 35 C 55 20 70 22 64 32 C 58 35 50 35 50 35 Z" fill="#22C55E" />
      <line x1="50" y1="35" x2="50" y2="42" stroke="#15803D" strokeWidth="3" strokeLinecap="round" />

      {/* Rounded Stone Body */}
      <path d="M 25 48 C 25 36 38 34 50 34 C 64 34 75 38 75 52 C 75 78 68 86 50 86 C 30 86 25 74 25 48 Z" fill="#A3E635" />
      <path d="M 27 49 C 27 38 39 36 50 36 C 63 36 73 40 73 53 C 73 76 66 84 50 84 C 32 84 27 72 27 49 Z" fill="#84CC16" />

      {/* Cheerful Eyes */}
      <circle cx="41" cy="58" r="4" fill="#1E293B" />
      <circle cx="59" cy="58" r="4" fill="#1E293B" />
      <circle cx="42.5" cy="56.5" r="1.5" fill="#FFFFFF" />
      <circle cx="60.5" cy="56.5" r="1.5" fill="#FFFFFF" />

      {/* Smile */}
      <path d="M 46 66 Q 50 70 54 66" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  </motion.div>
);

/* ─── 6. SEEDY (Green Sprout Pet) ────────────────────────────────────────── */
const SeedyAvatar = ({ isHovered }: { isHovered: boolean; isThinking?: boolean }) => (
  <motion.div
    animate={{ rotate: isHovered ? [-3, 3, -3] : 0 }}
    transition={{ duration: 1, repeat: Infinity }}
    className="w-full h-full relative flex items-center justify-center"
  >
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {/* Big Plant Stem & Leaves */}
      <path d="M 50 38 C 38 18 18 25 30 35 C 38 40 50 38 50 38 Z" fill="#4ADE80" />
      <path d="M 50 38 C 62 18 82 25 70 35 C 62 40 50 38 50 38 Z" fill="#22C55E" />
      <path d="M 48 20 C 48 10 52 10 52 20 Z" fill="#166534" />

      {/* Head/Body */}
      <rect x="24" y="38" width="52" height="46" rx="20" fill="#ECFDF5" stroke="#A7F3D0" strokeWidth="3" />

      {/* Face */}
      <circle cx="40" cy="58" r="4.5" fill="#065F46" />
      <circle cx="60" cy="58" r="4.5" fill="#065F46" />
      <path d="M 46 66 Q 50 71 54 66" stroke="#065F46" strokeWidth="2.5" strokeLinecap="round" fill="none" />

      {/* Blush */}
      <ellipse cx="33" cy="63" rx="3.5" ry="2" fill="#F43F5E" opacity="0.4" />
      <ellipse cx="67" cy="63" rx="3.5" ry="2" fill="#F43F5E" opacity="0.4" />

      {/* Feet */}
      <rect x="36" y="82" width="8" height="8" rx="4" fill="#047857" />
      <rect x="56" y="82" width="8" height="8" rx="4" fill="#047857" />
    </svg>
  </motion.div>
);

/* ─── 7. STACKY (Retro Purple Computer Stack) ────────────────────────────── */
const StackyAvatar = ({ isHovered }: { isHovered: boolean; isThinking?: boolean }) => (
  <motion.div
    animate={{ y: isHovered ? -2 : 0 }}
    transition={{ duration: 0.2 }}
    className="w-full h-full relative flex items-center justify-center"
  >
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {/* Top Unit */}
      <rect x="25" y="20" width="50" height="26" rx="6" fill="#C084FC" stroke="#7E22CE" strokeWidth="2" />
      <rect x="31" y="25" width="38" height="16" rx="4" fill="#3B0764" />
      {/* Screen Face */}
      <circle cx="42" cy="33" r="2.5" fill="#E9D5FF" />
      <circle cx="58" cy="33" r="2.5" fill="#E9D5FF" />

      {/* Middle Unit */}
      <rect x="20" y="48" width="60" height="22" rx="6" fill="#A855F7" stroke="#6B21A8" strokeWidth="2" />
      <circle cx="30" cy="59" r="2.5" fill="#FACC15" />
      <circle cx="38" cy="59" r="2.5" fill="#4ADE80" />
      <rect x="50" y="56" width="22" height="6" rx="3" fill="#581C87" />

      {/* Bottom Unit */}
      <rect x="16" y="72" width="68" height="18" rx="6" fill="#9333EA" stroke="#581C87" strokeWidth="2" />
      <rect x="24" y="78" width="30" height="6" rx="3" fill="#3B0764" />
      <circle cx="68" cy="81" r="3" fill="#38BDF8" />
    </svg>
  </motion.div>
);

/* ─── 8. BSOD (Tiny Blue Screen Gremlin) ─────────────────────────────────── */
const BsodAvatar = ({ isHovered }: { isHovered: boolean; isThinking?: boolean }) => (
  <motion.div
    animate={{ rotate: isHovered ? [0, -4, 4, 0] : 0 }}
    transition={{ duration: 0.3 }}
    className="w-full h-full relative flex items-center justify-center"
  >
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {/* Monitor Outer Shell */}
      <rect x="18" y="20" width="64" height="54" rx="10" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="3" />
      
      {/* Blue Screen Display */}
      <rect x="24" y="26" width="52" height="42" rx="6" fill="#1E40AF" />
      
      {/* :( Sad/Funny Face */}
      <text x="32" y="52" fill="#FFFFFF" fontSize="20" fontWeight="bold" fontFamily="monospace">:(</text>

      {/* Stand */}
      <path d="M 42 74 L 38 88 L 62 88 L 58 74 Z" fill="#2563EB" />
      <rect x="30" y="88" width="40" height="5" rx="2.5" fill="#1D4ED8" />
    </svg>
  </motion.div>
);

/* ─── 9. NULL SIGNAL (Void Monitor) ─────────────────────────────────────── */
const NullSignalAvatar = ({ isHovered }: { isHovered: boolean; isThinking?: boolean }) => (
  <motion.div
    animate={{ y: isHovered ? -3 : [0, -3, 0] }}
    transition={isHovered ? { duration: 0.2 } : { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
    className="w-full h-full relative flex items-center justify-center"
  >
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {/* Antenna */}
      <line x1="50" y1="22" x2="50" y2="10" stroke="#F43F5E" strokeWidth="3" />
      <circle cx="50" cy="8" r="4" fill="#F43F5E" />

      {/* Dark Outer Shell */}
      <rect x="20" y="22" width="60" height="52" rx="12" fill="#18181B" stroke="#F43F5E" strokeWidth="2.5" />
      
      {/* Screen */}
      <rect x="26" y="28" width="48" height="40" rx="8" fill="#09090B" />
      
      {/* Floating Pink Glow Eyes */}
      <circle cx="41" cy="48" r="4" fill="#F43F5E" />
      <circle cx="59" cy="48" r="4" fill="#F43F5E" />
      <circle cx="42" cy="46" r="1.5" fill="#FFFFFF" />
      <circle cx="60" cy="46" r="1.5" fill="#FFFFFF" />

      {/* Tiny Feet */}
      <rect x="36" y="74" width="8" height="10" rx="4" fill="#27272A" />
      <rect x="56" y="74" width="8" height="10" rx="4" fill="#27272A" />
    </svg>
  </motion.div>
);
