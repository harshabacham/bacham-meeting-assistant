import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fetchLiveGoogleCalendarEvents, fetchLiveGoogleCalendarEventsOAuth } from '../utils/icalParser';
import { listen } from '@tauri-apps/api/event';
import { openUrl } from '@tauri-apps/plugin-opener';

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
  reminderMinutes?: number; // e.g. 10, 30, 60. If null, use default.
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
  editEvent: (eventId: string, eventData: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
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

        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '15417749463-hqib9o5nf3fgpcvu1f9bv0gbm6jt06rf.apps.googleusercontent.com';
        const redirectUri = encodeURIComponent('http://localhost:1422/auth/callback');
        const scope = encodeURIComponent("openid email profile https://www.googleapis.com/auth/calendar.events");
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&prompt=select_account&access_type=offline`;

        return new Promise<void>(async (resolve, reject) => {
          let unlistenToken: (() => void) | undefined;
          let unlistenError: (() => void) | undefined;
          let timeoutId: any;

          const cleanup = () => {
            if (unlistenToken) unlistenToken();
            if (unlistenError) unlistenError();
            if (timeoutId) clearTimeout(timeoutId);
          };

          try {
            unlistenToken = await listen<string>('oauth_id_token', async (event) => {
              cleanup();
              try {
                let tokenData: any;
                try {
                  tokenData = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
                } catch {
                  tokenData = { access_token: event.payload };
                }

                const token = tokenData.access_token;
                if (!token) {
                  throw new Error("No access token received from Google authentication.");
                }

                const email = tokenData.email || "Google Calendar User";

                // Fetch events using OAuth
                const fetched = await fetchLiveGoogleCalendarEventsOAuth(token);

                const currentEvents = get().events;
                const currentMap = new Map(currentEvents.map(e => [e.id, e]));
                const mergedFetched = fetched.map(fe => {
                  const existing = currentMap.get(fe.id);
                  if (existing) {
                    return {
                      ...fe,
                      color: existing.color || fe.color,
                      isCompleted: existing.isCompleted !== undefined ? existing.isCompleted : fe.isCompleted,
                      meetingUrl: existing.meetingUrl || fe.meetingUrl,
                      reminderMinutes: existing.reminderMinutes !== undefined ? existing.reminderMinutes : fe.reminderMinutes,
                    };
                  }
                  return fe;
                });
                const localEvents = currentEvents.filter(e => e.type === 'bacham' || e.id.startsWith('evt_') || e.id.startsWith('custom_'));
                const mergedMap = new Map<string, CalendarEvent>();
                mergedFetched.forEach(e => mergedMap.set(e.id, e));
                localEvents.forEach(e => mergedMap.set(e.id, e));

                set({
                  isConnected: true,
                  calendarEmail: email,
                  accessToken: token,
                  iCalUrl: null,
                  isSyncing: false,
                  lastSyncedAt: Date.now(),
                  isSyncModalOpen: false,
                  syncError: null,
                  events: Array.from(mergedMap.values()),
                });

                resolve();
              } catch (err: any) {
                cleanup();
                set({ isSyncing: false, syncError: err.message || "Failed to sync Google Calendar events." });
                reject(err);
              }
            });

            unlistenError = await listen<string>('oauth_error', (event) => {
              cleanup();
              const err = event.payload || "Google sign-in was cancelled or failed.";
              set({ isSyncing: false, syncError: err });
              reject(new Error(err));
            });

            // 2 minute timeout
            timeoutId = setTimeout(() => {
              cleanup();
              set({ isSyncing: false, syncError: "Google sign-in timed out. Please try again." });
              reject(new Error("Google sign-in timed out. Please try again."));
            }, 120000);

            // Open user's default system browser synchronously to preserve WebKit gesture
            const popup = window.open(authUrl, '_blank');
            if (!popup) {
              openUrl(authUrl).catch(console.error);
            }
          } catch (err: any) {
            cleanup();
            set({ isSyncing: false, syncError: err.message || "Failed to initiate Google sign-in." });
            reject(err);
          }
        });
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
          
          // Preserve local customizations and user-edited colors
          const currentEvents = get().events;
          const currentMap = new Map(currentEvents.map(e => [e.id, e]));

          const mergedFetched = fetched.map(fe => {
            const existing = currentMap.get(fe.id);
            if (existing) {
              return {
                ...fe,
                color: existing.color || fe.color,
                isCompleted: existing.isCompleted !== undefined ? existing.isCompleted : fe.isCompleted,
                meetingUrl: existing.meetingUrl || fe.meetingUrl,
                reminderMinutes: existing.reminderMinutes !== undefined ? existing.reminderMinutes : fe.reminderMinutes,
              };
            }
            return fe;
          });

          const localEvents = currentEvents.filter(e => e.type === 'bacham' || e.id.startsWith('evt_') || e.id.startsWith('custom_'));

          const mergedMap = new Map<string, CalendarEvent>();
          mergedFetched.forEach(e => mergedMap.set(e.id, e));
          localEvents.forEach(e => mergedMap.set(e.id, e));
          
          set({ 
            events: Array.from(mergedMap.values()), 
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
        const { accessToken } = get();
        
        const newEvent: CalendarEvent = {
          ...eventData,
          id: `evt_${Date.now()}`,
        };
        
        // Optimistically update local state immediately
        set(state => ({ events: [...state.events, newEvent] }));

        if (!accessToken) {
            return;
        }

        try {
            // Helper to parse the local 'dateStr' and 'startTime'/'endTime' into ISO dates for Google
            const createIsoDate = (dateStr: string, timeStr?: string) => {
                const date = new Date(dateStr);
                if (timeStr) {
                    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
                    if (match) {
                        let hours = parseInt(match[1]);
                        const mins = parseInt(match[2]);
                        const ampm = match[3].toUpperCase();
                        if (ampm === 'PM' && hours < 12) hours += 12;
                        if (ampm === 'AM' && hours === 12) hours = 0;
                        date.setHours(hours, mins, 0, 0);
                    }
                }
                return date.toISOString();
            };

            const startDateTime = createIsoDate(eventData.dateStr, eventData.startTime);
            const endDateTime = eventData.endTime 
                ? createIsoDate(eventData.dateStr, eventData.endTime) 
                : new Date(new Date(startDateTime).getTime() + 60 * 60 * 1000).toISOString(); // Default 1 hr

            const payload: any = {
                summary: eventData.title,
                description: eventData.description || "",
                start: { dateTime: startDateTime, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
                end: { dateTime: endDateTime, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
            };

            if (eventData.reminderMinutes !== undefined) {
                if (eventData.reminderMinutes === null) {
                    payload.reminders = { useDefault: true };
                } else {
                    payload.reminders = {
                        useDefault: false,
                        overrides: [
                            { method: 'popup', minutes: eventData.reminderMinutes }
                        ]
                    };
                }
            }

            const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                console.error("Failed to push event to Google Calendar", await response.text());
                return;
            }
            
            // Re-sync calendar to get the new event ID
            await get().syncNow();
        } catch (e) {
            console.error("Error pushing event to calendar:", e);
        }
      },

      editEvent: async (eventId, eventData) => {
        const { accessToken, events } = get();
        
        const existingEvent = events.find(e => e.id === eventId);
        if (!existingEvent) return;

        // Optimistically update local state immediately
        set(state => ({
            events: state.events.map(e => e.id === eventId ? { ...e, ...eventData } : e)
        }));

        if (!accessToken) return;

        try {

            const createIsoDate = (dateStr: string, timeStr?: string) => {
                const date = new Date(dateStr);
                if (timeStr) {
                    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
                    if (match) {
                        let hours = parseInt(match[1]);
                        const mins = parseInt(match[2]);
                        const ampm = match[3].toUpperCase();
                        if (ampm === 'PM' && hours < 12) hours += 12;
                        if (ampm === 'AM' && hours === 12) hours = 0;
                        date.setHours(hours, mins, 0, 0);
                    }
                }
                return date.toISOString();
            };

            const targetDateStr = eventData.dateStr || existingEvent.dateStr;
            const targetStartTime = eventData.startTime || existingEvent.startTime;
            const targetEndTime = eventData.endTime || existingEvent.endTime;

            const startDateTime = createIsoDate(targetDateStr, targetStartTime);
            const endDateTime = targetEndTime 
                ? createIsoDate(targetDateStr, targetEndTime) 
                : new Date(new Date(startDateTime).getTime() + 60 * 60 * 1000).toISOString();

            const payload: any = {
                summary: eventData.title || existingEvent.title,
                description: eventData.description !== undefined ? eventData.description : existingEvent.description,
                start: { dateTime: startDateTime, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
                end: { dateTime: endDateTime, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
            };

            if (eventData.reminderMinutes !== undefined) {
                if (eventData.reminderMinutes === null) {
                    payload.reminders = { useDefault: true };
                } else {
                    payload.reminders = {
                        useDefault: false,
                        overrides: [
                            { method: 'popup', minutes: eventData.reminderMinutes }
                        ]
                    };
                }
            }

            const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                console.warn("Could not patch Google Calendar remote event; local state updated", await response.text());
            }
        } catch (e) {
            console.error("Error editing event:", e);
        }
      },

      deleteEvent: async (id: string) => {
        const { accessToken } = get();
        
        // Optimistically update local state immediately
        set(state => ({ events: state.events.filter(e => e.id !== id) }));

        if (!accessToken) return;

        try {
            const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!response.ok && response.status !== 204) {
                console.error("Failed to delete event from Google Calendar", await response.text());
            }
        } catch (e) {
            console.error("Error deleting event:", e);
        }
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

/**
 * Parse an event's dateStr and startTime/endTime into valid JavaScript Date objects.
 */
export function parseEventDateTime(event: CalendarEvent): { start: Date; end: Date } | null {
  try {
    if (!event.dateStr) return null;

    const dateOnly = event.dateStr.includes('T') ? event.dateStr.split('T')[0] : event.dateStr;
    const parts = dateOnly.split('-');
    if (parts.length < 3) return null;

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const startDate = new Date(year, month, day);
    let endDate = new Date(year, month, day);

    if (event.startTime) {
      const match = event.startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (match) {
        let hours = parseInt(match[1], 10);
        const mins = parseInt(match[2], 10);
        const ampm = match[3].toUpperCase();
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        startDate.setHours(hours, mins, 0, 0);
      }
    }

    if (event.endTime) {
      const match = event.endTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (match) {
        let hours = parseInt(match[1], 10);
        const mins = parseInt(match[2], 10);
        const ampm = match[3].toUpperCase();
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        endDate.setHours(hours, mins, 0, 0);
      }
    } else {
      endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
    }

    return { start: startDate, end: endDate };
  } catch {
    return null;
  }
}

/**
 * Finds any meeting that is currently starting soon (e.g. within threshold minutes) or in progress.
 */
export function findImminentMeeting(
  events: CalendarEvent[],
  minutesThreshold = 10
): { event: CalendarEvent; minutesUntilStart: number; isOngoing: boolean } | null {
  const now = new Date();

  for (const event of events) {
    if (event.isCompleted) continue;
    const parsed = parseEventDateTime(event);
    if (!parsed) continue;

    // Check if event is today
    if (
      parsed.start.getFullYear() !== now.getFullYear() ||
      parsed.start.getMonth() !== now.getMonth() ||
      parsed.start.getDate() !== now.getDate()
    ) {
      continue;
    }

    const diffMs = parsed.start.getTime() - now.getTime();
    const minutesUntilStart = Math.round(diffMs / 60000);

    // If meeting is ongoing (started and hasn't ended yet)
    if (now >= parsed.start && now <= parsed.end) {
      return { event, minutesUntilStart: 0, isOngoing: true };
    }

    // If meeting starts within threshold (e.g. 0 to 10 min)
    if (minutesUntilStart >= 0 && minutesUntilStart <= minutesThreshold) {
      return { event, minutesUntilStart, isOngoing: false };
    }
  }

  return null;
}

/**
 * Finds any meeting that has concluded recently (e.g. within minutesWindow) and is not yet marked completed.
 */
export function findRecentlyConcludedMeeting(
  events: CalendarEvent[],
  minutesWindow = 30
): { event: CalendarEvent; minutesSinceEnd: number } | null {
  const now = new Date();

  for (const event of events) {
    if (event.isCompleted) continue;
    const parsed = parseEventDateTime(event);
    if (!parsed) continue;

    // Check if event is today
    if (
      parsed.start.getFullYear() !== now.getFullYear() ||
      parsed.start.getMonth() !== now.getMonth() ||
      parsed.start.getDate() !== now.getDate()
    ) {
      continue;
    }

    const diffMs = now.getTime() - parsed.end.getTime();
    const minutesSinceEnd = Math.round(diffMs / 60000);

    // If meeting ended within window (0 to minutesWindow minutes ago)
    if (minutesSinceEnd >= 0 && minutesSinceEnd <= minutesWindow) {
      return { event, minutesSinceEnd };
    }
  }

  return null;
}


