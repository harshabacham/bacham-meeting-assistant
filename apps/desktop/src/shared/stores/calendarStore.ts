import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fetchLiveGoogleCalendarEvents, fetchLiveGoogleCalendarEventsOAuth } from '../utils/icalParser';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/infrastructure/firebase/config';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  dateStr: string; // e.g. "2026-07-23" or "Thu, Jul 23"
  dayNum: number; // e.g. 23
  monthStr: string; // e.g. "July"
  dayOfWeek: string; // e.g. "Thu"
  startTime?: string; // e.g. "12:00 PM"
  endTime?: string; // e.g. "12:30 PM"
  timeRange?: string; // e.g. "12:00 – 12:30 PM"
  type: 'google' | 'bacham' | 'hint';
  color: string; // HEX or Tailwind color class (e.g. '#f97316', '#ef4444', '#3b82f6')
  isCompleted?: boolean;
  meetingUrl?: string;
  lectureId?: string;
  isExam?: boolean;
}

interface CalendarState {
  events: CalendarEvent[];
  isConnected: boolean;
  calendarEmail: string | null;
  iCalUrl: string | null;
  accessToken: string | null;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  isSyncModalOpen: boolean;
  autoSyncEnabled: boolean;
  syncError: string | null;

  // Actions
  setSyncModalOpen: (open: boolean) => void;
  connectGoogleCalendar: (email: string, iCalUrl?: string) => Promise<void>;
  connectGoogleCalendarOAuth: () => Promise<void>;
  disconnectCalendar: () => Promise<void>;
  syncNow: () => Promise<void>;
  addEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  deleteEvent: (id: string) => void;
  toggleEventCompleted: (id: string) => void;
  toggleAutoSync: () => void;
}


export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      events: [],
      isConnected: false,
      calendarEmail: null,
      iCalUrl: null,
      accessToken: null,
      isSyncing: false,
      lastSyncedAt: null,
      isSyncModalOpen: false,
      autoSyncEnabled: true,
      syncError: null,

      setSyncModalOpen: (isSyncModalOpen) => set({ isSyncModalOpen }),

      toggleAutoSync: () => set((state) => ({ autoSyncEnabled: !state.autoSyncEnabled })),

      connectGoogleCalendar: async (email, iCalUrl) => {
        set({ isSyncing: true, syncError: null });

        try {
          if (!iCalUrl || !iCalUrl.trim()) {
            throw new Error("Secret address iCal URL is required.");
          }

          const realEvents = await fetchLiveGoogleCalendarEvents(iCalUrl.trim());

          set({
            isConnected: true,
            calendarEmail: email,
            iCalUrl: iCalUrl.trim(),
            accessToken: null,
            events: realEvents,
            isSyncing: false,
            lastSyncedAt: Date.now(),
            isSyncModalOpen: false,
            syncError: null,
          });
        } catch (err: any) {
          console.error("Failed to connect Google Calendar:", err);
          set({
            isSyncing: false,
            syncError: err.message || "Failed to parse Google Calendar feed. Please check your Secret Address URL.",
          });
          throw err;
        }
      },

      connectGoogleCalendarOAuth: async () => {
        set({ isSyncing: true, syncError: null });
        try {
          const provider = new GoogleAuthProvider();
          provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
          provider.setCustomParameters({
            prompt: 'select_account'
          });
          
          const result = await signInWithPopup(auth, provider);
          const credential = GoogleAuthProvider.credentialFromResult(result);
          const token = credential?.accessToken;
          const email = result.user.email;

          if (!token) {
            throw new Error("Failed to retrieve Google access token.");
          }

          set({
            isConnected: true,
            calendarEmail: email,
            accessToken: token,
            iCalUrl: null,
            isSyncing: false,
            lastSyncedAt: Date.now(),
            isSyncModalOpen: false,
            syncError: null,
          });

          // Sync events immediately
          const fetched = await fetchLiveGoogleCalendarEventsOAuth(token);
          set({ events: fetched });
        } catch (err: any) {
          console.error("Failed Google Calendar OAuth Login:", err);
          set({
            isSyncing: false,
            syncError: err.message || "Failed to authenticate Google Account.",
          });
          throw err;
        }
      },

      disconnectCalendar: async () => {
        try {
          await auth.signOut();
        } catch (e) {
          console.error("Firebase auth signOut error:", e);
        }
        set({
          isConnected: false,
          calendarEmail: null,
          iCalUrl: null,
          accessToken: null,
          lastSyncedAt: null,
          events: [],
          syncError: null,
        });
      },

      syncNow: async () => {
        const { iCalUrl, accessToken } = get();
        if (!iCalUrl && !accessToken) return;

        set({ isSyncing: true, syncError: null });

        try {
          let fetched: CalendarEvent[] = [];
          if (accessToken) {
            fetched = await fetchLiveGoogleCalendarEventsOAuth(accessToken);
          } else if (iCalUrl) {
            fetched = await fetchLiveGoogleCalendarEvents(iCalUrl.trim());
          }
          
          set({ 
            events: fetched, 
            isSyncing: false, 
            lastSyncedAt: Date.now(),
            syncError: null
          });
        } catch (err: any) {
          console.error("syncNow failed:", err);
          set({ 
            isSyncing: false, 
            syncError: err.message || "Failed to sync. Please check your network connection." 
          });
        }
      },

      addEvent: (eventData) => {
        const newEvent: CalendarEvent = {
          ...eventData,
          id: `evt_${Date.now()}`,
        };
        set((state) => ({
          events: [newEvent, ...state.events],
        }));
      },

      deleteEvent: (id) => {
        set((state) => ({
          events: state.events.filter((e) => e.id !== id),
        }));
      },

      toggleEventCompleted: (id) => {
        set((state) => ({
          events: state.events.map((e) =>
            e.id === id ? { ...e, isCompleted: !e.isCompleted } : e
          ),
        }));
      },
    }),
    {
      name: 'bacham_calendar_storage',
      partialize: (state) => ({
        events: state.events,
        isConnected: state.isConnected,
        calendarEmail: state.calendarEmail,
        iCalUrl: state.iCalUrl,
        accessToken: state.accessToken,
        lastSyncedAt: state.lastSyncedAt,
        autoSyncEnabled: state.autoSyncEnabled,
      }),
    }
  )
);
