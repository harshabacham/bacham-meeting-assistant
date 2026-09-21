import { useEffect, useRef } from 'react';
import { listen, emit } from '@tauri-apps/api/event';
import { useCalendarStore } from '@/shared/stores/calendarStore';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { TauriClient } from '@/infrastructure/tauri-client';
import { useToast } from '@/components/ui/ToastProvider';
import { useAppStore } from '@/shared/stores/appStore';

export function AutoRecordWatcher() {
    const events = useCalendarStore(state => state.events);
    const eventFolderMapping = useCalendarStore(state => state.eventFolderMapping);
    const settings = useSettingsStore(state => state.settings);
    const { showToast } = useToast();
    const isRecordingRef = useRef(false);

    useEffect(() => {
        // 1. Extension Hook Listener
        const unlistenPromise = listen('start_recording', async () => {
            const autoStart = settings?.autoStartRecording ?? true;
            if (!autoStart) {
                console.log("[AutoRecordWatcher] Extension trigger ignored (Auto-Start is disabled).");
                return;
            }

            if (isRecordingRef.current) return; // Already recording
            isRecordingRef.current = true;

            showToast("Meeting detected! Auto-starting recording...", "success");
            try {
                emit('force_start_recording', { lectureId: useAppStore.getState().activeMeetingId || Math.random().toString(36).substr(2, 9) });

            } catch (e) {
                console.error("Failed to start recording from extension hook", e);
                isRecordingRef.current = false;
            }
        });

        // 2. Calendar Polling (Proactive OS Hook)
        const checkInterval = setInterval(async () => {
            const autoStart = settings?.autoStartRecording ?? true;
            if (!autoStart || isRecordingRef.current) return;

            const now = new Date();
            
            for (const event of events) {
                if (!event.startTime || !event.dateStr) continue;

                // dateStr is YYYY-MM-DD, startTime is "HH:MM PM"
                const [time, modifier] = event.startTime.split(' ');
                if (!time || !modifier) continue;
                
                let [hours, minutes] = time.split(':');
                let h = parseInt(hours, 10);
                if (modifier.toUpperCase() === 'PM' && h < 12) h += 12;
                if (modifier.toUpperCase() === 'AM' && h === 12) h = 0;

                const eventDate = new Date(`${event.dateStr}T${h.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}:00`);
                
                if (isNaN(eventDate.getTime())) continue;

                const diffMs = eventDate.getTime() - now.getTime();
                const diffMinutes = diffMs / 60000;

                // Start recording if the event starts exactly now (within the last 1 minute)
                if (diffMinutes <= 0 && diffMinutes > -1.5) {
                    isRecordingRef.current = true;
                    showToast(`Auto-starting recording for "${event.title}"`, "success");
                    try {
                        await TauriClient.startNativeRecording();
                    } catch (e) {
                        console.error("Failed to auto-start from calendar", e);
                        isRecordingRef.current = false;
                    }
                    break;
                }
            }
        }, 60000); // Check every minute
        
        const cleanupInterval = setInterval(() => {
            isRecordingRef.current = false;
        }, 5 * 60000); // Reset every 5 mins to allow back-to-back meetings

        // 3. Folder Routing for Live Recordings
        const unlistenAutoWake = listen<string>('auto_wake_live', async (event) => {
            const sessionId = event.payload;
            if (!sessionId) return;
            
            const now = new Date();
            let matchedFolderId = null;

            // Find an event happening right now (± 15 mins)
            for (const evt of events) {
                if (!evt.startTime || !evt.dateStr) continue;

                const [time, modifier] = evt.startTime.split(' ');
                if (!time || !modifier) continue;
                
                let [hours, minutes] = time.split(':');
                let h = parseInt(hours, 10);
                if (modifier.toUpperCase() === 'PM' && h < 12) h += 12;
                if (modifier.toUpperCase() === 'AM' && h === 12) h = 0;

                const eventDate = new Date(`${evt.dateStr}T${h.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}:00`);
                if (isNaN(eventDate.getTime())) continue;

                const diffMs = Math.abs(eventDate.getTime() - now.getTime());
                const diffMinutes = diffMs / 60000;

                // Match if within 15 minutes of start time
                if (diffMinutes <= 15) {
                    const mappedFolder = eventFolderMapping[evt.id];
                    if (mappedFolder) {
                        matchedFolderId = mappedFolder;
                        console.log(`[AutoRecordWatcher] Matched recording to calendar event: ${evt.title}, routing to folder: ${mappedFolder}`);
                        break;
                    }
                }
            }

            if (matchedFolderId) {
                try {
                    await TauriClient.updateLecture({ id: sessionId, folderId: matchedFolderId });
                } catch (e) {
                    console.error("Failed to update lecture folder on auto-wake:", e);
                }
            }
        });

        return () => {
            unlistenPromise.then(unlisten => unlisten());
            unlistenAutoWake.then(unlisten => unlisten());
            clearInterval(checkInterval);
            clearInterval(cleanupInterval);
        };
    }, [events, eventFolderMapping, settings?.autoStartRecording, showToast]);

    return null; // Invisible global component
}
