export interface EventColorStyle {
  bg: string;
  text: string;
  border: string;
  dot: string;
  name: string;
}

export interface EditorialColorOption {
  hex: string;
  name: string;
  style: EventColorStyle;
}

export const EDITORIAL_COLORS: EditorialColorOption[] = [
  {
    hex: '#1C1C1A',
    name: 'Charcoal',
    style: {
      bg: 'bg-[#EAE8E1] dark:bg-white/[0.08]',
      text: 'text-[#1C1C1A] dark:text-[#F4F3ED]',
      border: 'border-[#DAD7CD] dark:border-white/10',
      dot: '#1C1C1A',
      name: 'Charcoal'
    }
  },
  {
    hex: '#92400E',
    name: 'Warm Amber',
    style: {
      bg: 'bg-[#F9EDE0] dark:bg-amber-500/15',
      text: 'text-[#92400E] dark:text-amber-200',
      border: 'border-[#EAD5BF] dark:border-amber-500/25',
      dot: '#92400E',
      name: 'Warm Amber'
    }
  },
  {
    hex: '#1E4D74',
    name: 'Slate Blue',
    style: {
      bg: 'bg-[#EBF1F7] dark:bg-sky-500/15',
      text: 'text-[#1E4D74] dark:text-sky-200',
      border: 'border-[#D4E2EE] dark:border-sky-500/25',
      dot: '#1E4D74',
      name: 'Slate Blue'
    }
  },
  {
    hex: '#9C2738',
    name: 'Terracotta Rose',
    style: {
      bg: 'bg-[#F9EBEA] dark:bg-rose-500/15',
      text: 'text-[#9C2738] dark:text-rose-200',
      border: 'border-[#EFCFCB] dark:border-rose-500/25',
      dot: '#9C2738',
      name: 'Terracotta Rose'
    }
  },
  {
    hex: '#5B3785',
    name: 'Soft Purple',
    style: {
      bg: 'bg-[#F1ECF7] dark:bg-purple-500/15',
      text: 'text-[#5B3785] dark:text-purple-200',
      border: 'border-[#DFD3EC] dark:border-purple-500/25',
      dot: '#5B3785',
      name: 'Soft Purple'
    }
  },
  {
    hex: '#57564F',
    name: 'Stone Gray',
    style: {
      bg: 'bg-[#F2F1EC] dark:bg-stone-500/15',
      text: 'text-[#3E3D38] dark:text-stone-200',
      border: 'border-[#DFDDD6] dark:border-stone-500/25',
      dot: '#57564F',
      name: 'Stone Gray'
    }
  },
  {
    hex: '#2D5A43',
    name: 'Forest Moss',
    style: {
      bg: 'bg-[#EEF4F0] dark:bg-emerald-950/25',
      text: 'text-[#234E39] dark:text-emerald-300',
      border: 'border-[#D4E4DA] dark:border-emerald-800/30',
      dot: '#2D5A43',
      name: 'Forest Moss'
    }
  },
  {
    hex: '#B45309',
    name: 'Warm Ochre',
    style: {
      bg: 'bg-[#FBF1E6] dark:bg-orange-950/25',
      text: 'text-[#863D08] dark:text-orange-300',
      border: 'border-[#F2DECE] dark:border-orange-800/30',
      dot: '#B45309',
      name: 'Warm Ochre'
    }
  }
];

// Alias map for legacy colors or Google Calendar keyword hexes
const COLOR_ALIASES: Record<string, string> = {
  '#10b981': '#2D5A43',
  '#059669': '#2D5A43',
  '#047857': '#2D5A43',
  '#34d399': '#2D5A43',
  '#6ee7b7': '#2D5A43',
  '#a7f3d0': '#2D5A43',
  '#3b82f6': '#1E4D74',
  '#2563eb': '#1E4D74',
  '#1d4ed8': '#1E4D74',
  '#60a5fa': '#1E4D74',
  '#ef4444': '#9C2738',
  '#dc2626': '#9C2738',
  '#f87171': '#9C2738',
  '#f97316': '#92400E',
  '#ea580c': '#92400E',
  '#fb923c': '#92400E',
  '#8b5cf6': '#5B3785',
  '#7c3aed': '#5B3785',
  '#6366f1': '#5B3785',
  '#a855f7': '#5B3785',
  '#ec4899': '#9C2738',
  '#f43f5e': '#9C2738'
};

export function normalizeEventColor(color?: string | null): string {
  if (!color) return EDITORIAL_COLORS[0].hex;
  const lower = color.trim().toLowerCase();
  if (COLOR_ALIASES[lower]) return COLOR_ALIASES[lower];
  const matched = EDITORIAL_COLORS.find(c => c.hex.toLowerCase() === lower);
  if (matched) return matched.hex;
  return color;
}

export function getEventStyle(evt?: { color?: string | null; id?: string } | null, fallbackIdx: number = 0): EventColorStyle {
  if (evt?.color) {
    const norm = normalizeEventColor(evt.color);
    const matched = EDITORIAL_COLORS.find(c => c.hex.toLowerCase() === norm.toLowerCase());
    if (matched) return matched.style;
  }
  
  const idSeed = evt?.id ? evt.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
  const idx = Math.abs((idSeed + fallbackIdx) % EDITORIAL_COLORS.length);
  return EDITORIAL_COLORS[idx].style;
}
