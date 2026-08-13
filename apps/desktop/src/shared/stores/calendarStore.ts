import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fetchLiveGoogleCalendarEvents, fetchLiveGoogleCalendarEventsOAuth } from '../utils/icalParser';

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

export interface DeviceFlowData {
  userCode: string;
  verificationUrl: string;
  deviceCode: string;
  interval: number;
  expiresAt: number;
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
  deviceFlowData: DeviceFlowData | null;
  eventFolderMapping: Record<string, string>;

  // Actions
  setSyncModalOpen: (open: boolean) => void;
  connectGoogleCalendar: (email: string, iCalUrl?: string) => Promise<void>;
  connectGoogleCalendarOAuth: () => Promise<void>;
  disconnectCalendar: () => Promise<void>;
  syncNow: () => Promise<void>;
  addEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<void>;
  deleteEvent: (id: string) => void;
  toggleEventCompleted: (id: string) => void;
  toggleAutoSync: () => void;
  cancelDeviceFlow: () => void;
  setEventFolder: (eventId: string, folderId: string | null) => void;
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
      deviceFlowData: null,
      eventFolderMapping: {},

      setEventFolder: (eventId, folderId) => set((state) => {
        const newMapping = { ...state.eventFolderMapping };
        if (folderId) {
          newMapping[eventId] = folderId;
        } else {
          delete newMapping[eventId];
        }
        return { eventFolderMapping: newMapping };
      }),

      setSyncModalOpen: (isSyncModalOpen) => {
        if (!isSyncModalOpen) {
           set({ isSyncModalOpen, deviceFlowData: null });
        } else {
           set({ isSyncModalOpen });
        }
      },

      cancelDeviceFlow: () => set({ deviceFlowData: null, isSyncing: false, syncError: "OAuth Sign-In cancelled." }),

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
        set({ isSyncing: true, syncError: null, deviceFlowData: null });
        try {
          const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
          const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
          
          if (!clientId) {
            throw new Error("Missing VITE_GOOGLE_CLIENT_ID in environment variables.");
          }

          // 1. Request Device Code
          const codeResponse = await fetch('https://oauth2.googleapis.com/device/code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `client_id=${clientId}&scope=https://www.googleapis.com/auth/calendar.readonly%20https://www.googleapis.com/auth/userinfo.email`
          });
          
          if (!codeResponse.ok) {
            throw new Error(`Google Device Flow failed: ${await codeResponse.text()}`);
          }
          const codeData = await codeResponse.json();

          set({
            deviceFlowData: {
              userCode: codeData.user_code,
              verificationUrl: codeData.verification_url,
              deviceCode: codeData.device_code,
              interval: codeData.interval,
              expiresAt: Date.now() + (codeData.expires_in * 1000)
            }
          });

          // 2. Poll for Token
          let token: string | null = null;
          let intervalTime = codeData.interval * 1000;
          const expireTime = Date.now() + (codeData.expires_in * 1000);

          while (Date.now() < expireTime) {
            // Check if user cancelled
            if (!get().deviceFlowData) {
              throw new Error("OAuth Sign-In cancelled.");
            }

            const tokenBody = new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret || '',
              device_code: codeData.device_code,
              grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
            });

            if (!clientSecret) tokenBody.delete('client_secret');

            const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: tokenBody.toString()
            });

            const tokenData = await tokenResponse.json();

            if (tokenResponse.ok && tokenData.access_token) {
              token = tokenData.access_token;
              break;
            } else if (tokenData.error === 'authorization_pending') {
              // keep polling
            } else if (tokenData.error === 'slow_down') {
              intervalTime += 2000;
            } else if (tokenData.error !== 'authorization_pending') {
              throw new Error(`OAuth error: ${tokenData.error_description || tokenData.error}`);
            }

            await new Promise(r => setTimeout(r, intervalTime));
          }

          if (!token) {
            throw new Error("Authentication request timed out. Please try again.");
          }

          // Clear device flow state since we got the token
          set({ deviceFlowData: null });

          // Fetch user email
          let email = "Connected User";
          try {
            const userResponse = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`);
            if (userResponse.ok) {
              const userData = await userResponse.json();
              if (userData.email) email = userData.email;
            }
          } catch (e) {
            console.error("Failed to fetch user email:", e);
          }

          // Fetch events first before committing to connected state
          const fetched = await fetchLiveGoogleCalendarEventsOAuth(token);
          
          set({
            isConnected: true,
            calendarEmail: email,
            accessToken: token,
            iCalUrl: null,
            isSyncing: false,
            lastSyncedAt: Date.now(),
            isSyncModalOpen: false,
            syncError: null,
            events: fetched,
          });
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

      addEvent: async (eventData) => {
        const { accessToken, isConnected } = get();
        
        const newEvent: CalendarEvent = {
          ...eventData,
          id: `evt_${Date.now()}`,
        };
        set((state) => ({
          events: [newEvent, ...state.events],
        }));

        if (isConnected && accessToken) {
          try {
            const payload = {
              summary: eventData.title,
              description: "Added via Ambient Co-Pilot",
              start: { date: eventData.dateStr },
              end: { date: eventData.dateStr }
            };

            const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(payload)
            });

            if (response.ok) {
                await get().syncNow();
            } else {
                console.error("Failed to push event to Google Calendar", await response.text());
            }
          } catch(e) {
            console.error("Error pushing event to calendar:", e);
          }
        }
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
        eventFolderMapping: state.eventFolderMapping,
      }),
    }
  )
);
