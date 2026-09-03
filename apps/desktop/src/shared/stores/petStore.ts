import { create } from 'zustand';

export type PetId = 'codex' | 'dewey' | 'fireball' | 'hoots' | 'rocky' | 'seedy' | 'stacky' | 'bsod' | 'null_signal';

export interface PetDefinition {
  id: PetId;
  name: string;
  description: string;
  color: string;
}

export const PET_DEFINITIONS: PetDefinition[] = [
  {
    id: 'codex',
    name: 'Codex',
    description: 'The original Codex companion.',
    color: '#A855F7',
  },
  {
    id: 'dewey',
    name: 'Dewey',
    description: 'A calm companion for focused workspace days.',
    color: '#38BDF8',
  },
  {
    id: 'fireball',
    name: 'Fireball',
    description: 'Hot path energy for fast iteration.',
    color: '#F97316',
  },
  {
    id: 'hoots',
    name: 'Hoots',
    description: 'A sharp-eyed owl for polished work in a blink.',
    color: '#FB923C',
  },
  {
    id: 'rocky',
    name: 'Rocky',
    description: 'A steady rock when the diff gets large.',
    color: '#A3E635',
  },
  {
    id: 'seedy',
    name: 'Seedy',
    description: 'Small green shoots for new ideas.',
    color: '#4ADE80',
  },
  {
    id: 'stacky',
    name: 'Stacky',
    description: 'A balanced stack for deep work.',
    color: '#C084FC',
  },
  {
    id: 'bsod',
    name: 'BSOD',
    description: 'A tiny blue-screen gremlin.',
    color: '#60A5FA',
  },
  {
    id: 'null_signal',
    name: 'Null Signal',
    description: 'Quiet signal from the void.',
    color: '#F43F5E',
  },
];

interface PetState {
  selectedPetId: PetId;
  petSize: number; // in pixels, default 68
  isTuckedAway: boolean;
  hidePet: boolean;
  setSelectedPetId: (id: PetId) => void;
  setPetSize: (size: number) => void;
  setIsTuckedAway: (tucked: boolean) => void;
  setHidePet: (hide: boolean) => void;
  toggleTuckedAway: () => void;
}

const STORAGE_KEY = 'bacham_ai_pet_settings_v1';

const loadInitialState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        selectedPetId: (parsed.selectedPetId || 'codex') as PetId,
        petSize: parsed.petSize || 68,
        isTuckedAway: Boolean(parsed.isTuckedAway),
        hidePet: Boolean(parsed.hidePet),
      };
    }
  } catch (e) {
    console.error('Failed to load pet settings', e);
  }
  return {
    selectedPetId: 'codex' as PetId,
    petSize: 68,
    isTuckedAway: false,
    hidePet: false,
  };
};

export const usePetStore = create<PetState>((set, get) => {
  const initial = loadInitialState();

  const persist = (state: Partial<PetState>) => {
    try {
      const current = {
        selectedPetId: get().selectedPetId,
        petSize: get().petSize,
        isTuckedAway: get().isTuckedAway,
        hidePet: get().hidePet,
        ...state,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch (e) {
      console.error('Failed to save pet settings', e);
    }
  };

  return {
    ...initial,

    setSelectedPetId: (id: PetId) => {
      set({ selectedPetId: id });
      persist({ selectedPetId: id });
    },

    setPetSize: (size: number) => {
      set({ petSize: size });
      persist({ petSize: size });
    },

    setIsTuckedAway: (tucked: boolean) => {
      set({ isTuckedAway: tucked });
      persist({ isTuckedAway: tucked });
    },

    setHidePet: (hide: boolean) => {
      set({ hidePet: hide });
      persist({ hidePet: hide });
    },

    toggleTuckedAway: () => {
      const next = !get().isTuckedAway;
      set({ isTuckedAway: next });
      persist({ isTuckedAway: next });
    },
  };
});
