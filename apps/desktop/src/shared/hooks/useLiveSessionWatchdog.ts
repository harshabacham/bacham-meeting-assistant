import { useEffect, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useToast } from '@/components/ui/ToastProvider';

interface WatchdogOptions {
  /** How many ms of silence before firing an alert. Default: 60_000 */
  silenceThresholdMs?: number;
  /** Whether the watchdog is active (e.g., only during live recording). */
  active: boolean;
  /** ID of the current lecture/session. */
  lectureId?: string;
}

/**
 * useLiveSessionWatchdog
 *
 * Monitors the `live_caption_received` Tauri event stream.
 * If no caption arrives within `silenceThresholdMs` while `active === true`,
 * it fires a persistent warning toast — the "Loud Failure" guard.
 *
 * This directly addresses Granola's most-cited complaint: silent failures
 * where the tool appears to record but produces nothing.
 */
export function useLiveSessionWatchdog({
  silenceThresholdMs = 60_000,
  active,
  lectureId,
}: WatchdogOptions) {
  const { showToast } = useToast();
  const [isAlerting, setIsAlerting] = useState(false);
  const lastCaptionTs = useRef<number>(Date.now());
  const watchdogTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const alreadyAlerted = useRef(false);
  const unlistenRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!active || !lectureId) {
      // Clear everything when not active
      if (watchdogTimer.current) clearInterval(watchdogTimer.current);
      if (unlistenRef.current) unlistenRef.current();
      alreadyAlerted.current = false;
      return;
    }

    // Reset on activation
    lastCaptionTs.current = Date.now();
    alreadyAlerted.current = false;

    // Subscribe to live caption events to reset the timer
    let cancelled = false;
    listen<{ sessionId: string; text: string }>('live_caption_received', (event) => {
      if (cancelled) return;
      if (event.payload.sessionId === lectureId) {
        lastCaptionTs.current = Date.now();
        // If previously alerted, notify recovery
        if (alreadyAlerted.current) {
          alreadyAlerted.current = false;
          setIsAlerting(false);
          showToast('✅ Audio stream restored — captions are flowing again.', 'success');
        }
      }
    }).then((unlisten) => {
      unlistenRef.current = unlisten;
    });

    // Poll every 10 seconds to check silence
    watchdogTimer.current = setInterval(() => {
      const silenceDuration = Date.now() - lastCaptionTs.current;
      if (silenceDuration >= silenceThresholdMs && !alreadyAlerted.current) {
        alreadyAlerted.current = true;
        setIsAlerting(true);
        showToast(
          '⚠️ Audio stream flatlined — no captions for 60s. Check mic or meeting captions.',
          'error',
        );
      }
    }, 10_000);

    return () => {
      cancelled = true;
      if (watchdogTimer.current) clearInterval(watchdogTimer.current);
      if (unlistenRef.current) unlistenRef.current();
    };
  }, [active, lectureId, silenceThresholdMs, showToast]);

  return isAlerting;
}
