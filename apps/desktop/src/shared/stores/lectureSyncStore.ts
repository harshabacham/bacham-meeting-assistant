import { create } from 'zustand';

interface LectureSyncState {
  currentTimeMs: number;
  isPlaying: boolean;
  seekTargetMs: number | null;
  setCurrentTimeMs: (ms: number) => void;
  setIsPlaying: (playing: boolean) => void;
  seekTo: (ms: number) => void;
  clearSeekTarget: () => void;
}

export const useLectureSyncStore = create<LectureSyncState>((set) => ({
  currentTimeMs: 0,
  isPlaying: false,
  seekTargetMs: null,
  setCurrentTimeMs: (ms) => set({ currentTimeMs: ms }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  seekTo: (ms) => set({ seekTargetMs: ms, isPlaying: true }),
  clearSeekTarget: () => set({ seekTargetMs: null }),
}));
