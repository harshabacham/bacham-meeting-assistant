import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FocusState {
  isRunning: boolean;
  timeLeft: number; // in seconds
  totalDuration: number; // in seconds
  mode: 'focus' | 'break';
  completedSessions: number;

  // Actions
  startSession: (minutes: number, mode?: 'focus' | 'break') => void;
  pauseSession: () => void;
  resumeSession: () => void;
  resetSession: () => void;
  tick: () => void;
  setMode: (mode: 'focus' | 'break') => void;
}

export const useFocusStore = create<FocusState>()(
  persist(
    (set, get) => ({
      isRunning: false,
      timeLeft: 25 * 60,
      totalDuration: 25 * 60,
      mode: 'focus',
      completedSessions: 0,

      startSession: (minutes: number, mode = 'focus') => {
        const seconds = minutes * 60;
        set({
          isRunning: true,
          timeLeft: seconds,
          totalDuration: seconds,
          mode,
        });
      },

      pauseSession: () => set({ isRunning: false }),
      
      resumeSession: () => {
        const { timeLeft } = get();
        if (timeLeft > 0) {
          set({ isRunning: true });
        }
      },

      resetSession: () => {
        const { totalDuration, mode } = get();
        set({
          isRunning: false,
          timeLeft: totalDuration,
          mode,
        });
      },

      tick: () => {
        const { timeLeft, isRunning, mode, completedSessions } = get();
        if (!isRunning) return;

        if (timeLeft <= 1) {
          // Completed
          const isFocus = mode === 'focus';
          set({
            isRunning: false,
            timeLeft: 0,
            completedSessions: isFocus ? completedSessions + 1 : completedSessions,
          });
        } else {
          set({ timeLeft: timeLeft - 1 });
        }
      },

      setMode: (mode) => {
        const duration = mode === 'focus' ? 25 * 60 : 5 * 60;
        set({
          mode,
          isRunning: false,
          timeLeft: duration,
          totalDuration: duration,
        });
      },
    }),
    {
      name: 'bacham_focus_companion_store',
      partialize: (state) => ({
        completedSessions: state.completedSessions,
        mode: state.mode,
        totalDuration: state.totalDuration,
        timeLeft: state.timeLeft,
      }),
    }
  )
);
