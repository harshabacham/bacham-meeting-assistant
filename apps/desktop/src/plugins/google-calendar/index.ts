import { BachamPlugin } from '@/core/integrations/types';

const PLUGIN_ID = 'bacham.google-calendar';

const GoogleCalendarPlugin: BachamPlugin = {
  manifest: {
    id: PLUGIN_ID,
    name: 'Google Calendar',
    version: '1.0.0',
    description: 'Read events, detect meetings, and sync your schedule automatically.',
    icon: 'Calendar',
    category: 'Calendar',
    permissions: ['Read Calendars', 'Read Events'],
    author: 'Bacham',
    setupGuide: {
      url: 'https://calendar.google.com/calendar/r/settings',
      urlLabel: 'Calendar Settings',
      steps: [
        'Option 1 (1-Click Google OAuth): Click "Connect" to open the Calendar Sync modal and sign in with Google to grant read-only access.',
        'Option 2 (Zero-OAuth Secret iCal): Open Google Calendar in your browser > Settings > Settings for my calendars > Integrate calendar.',
        'Scroll down to "Secret address in iCal format", copy the secret URL, and paste it into the Calendar Sync modal.',
        'Once connected, Bacham automatically detects upcoming meetings and auto-starts recordings on time.'
      ],
      whereToUse: 'Calendar Page, Home Dashboard & Auto-Record prompt',
      note: 'Only requires read-only event permissions. Your personal data is never modified.'
    }
  },
  auth: {
    type: 'oauth2',
    authenticate: async () => {
      // Open the global sync modal instead of asking for an API key
      const { useCalendarStore } = await import('@/shared/stores/calendarStore');
      useCalendarStore.getState().setSyncModalOpen(true);
      
      // Wait for the user to connect via the modal
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          const state = useCalendarStore.getState();
          if (state.isConnected) {
            clearInterval(checkInterval);
            resolve();
          } else if (!state.isSyncModalOpen) {
            clearInterval(checkInterval);
            reject(new Error("Calendar connection cancelled"));
          }
        }, 500);
      });
    },
    disconnect: async () => {
      const { useCalendarStore } = await import('@/shared/stores/calendarStore');
      await useCalendarStore.getState().disconnectCalendar();
    },
    isConnected: async () => {
      const { useCalendarStore } = await import('@/shared/stores/calendarStore');
      return useCalendarStore.getState().isConnected;
    }
  },
  actions: {
    sync: async () => {
      return { status: 'success', message: 'Calendar synced.' };
    }
  }
};
export default GoogleCalendarPlugin;
