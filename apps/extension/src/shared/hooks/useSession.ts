import { useState, useEffect, useCallback, useRef } from 'react';
import type { Session, SessionState, StartSessionIntent } from '@/shared/types';
import { MessageType } from '@/shared/types';
import type { BackgroundState } from '@/shared/types';
import { sendToBackground, onMessageFromBackground } from '@/infrastructure/browser/runtime';

/**
 * useSession hook
 *
 * Subscribes to session state from the background service worker.
 * Exposes intent dispatchers: start, pause, resume, stop, discard.
 * No business logic lives here — it dispatches messages to the background.
 */

export interface UseSessionReturn {
  readonly session: Session | null;
  readonly sessionState: SessionState;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly start: (intent: StartSessionIntent) => Promise<void>;
  readonly pause: () => Promise<void>;
  readonly resume: () => Promise<void>;
  readonly stop: () => Promise<void>;
  readonly discard: () => Promise<void>;
  readonly clearError: () => void;
}

export function useSession(): UseSessionReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Fetch initial state on mount
  useEffect(() => {
    mountedRef.current = true;

    sendToBackground<undefined, BackgroundState>({ type: MessageType.GET_STATE })
      .then((res) => {
        if (!mountedRef.current) return;
        if (res.success && res.data) {
          setSession(res.data.session);
          setSessionState(res.data.sessionState);
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (mountedRef.current) setIsLoading(false);
      });

    // Subscribe to background state push
    const cleanup = onMessageFromBackground((message, sendResponse) => {
      if (message.type === MessageType.STATE_UPDATE) {
        const state = message.payload as BackgroundState;
        if (mountedRef.current) {
          setSession(state.session);
          setSessionState(state.sessionState);
        }
        sendResponse({ success: true });
      }
    });

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, []);

  const start = useCallback(async (intent: StartSessionIntent): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await sendToBackground<StartSessionIntent, BackgroundState>({
        type: MessageType.START_SESSION,
        payload: intent,
      });
      if (!res.success) {
        setError(res.error ?? 'Failed to start session');
      } else if (res.data) {
        setSession(res.data.session);
        setSessionState(res.data.sessionState);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const pause = useCallback(async (): Promise<void> => {
    const res = await sendToBackground<undefined, Session>({ type: MessageType.PAUSE_SESSION });
    if (!res.success) setError(res.error ?? 'Failed to pause');
    else if (res.data) setSession(res.data);
  }, []);

  const resume = useCallback(async (): Promise<void> => {
    const res = await sendToBackground<undefined, Session>({ type: MessageType.RESUME_SESSION });
    if (!res.success) setError(res.error ?? 'Failed to resume');
    else if (res.data) setSession(res.data);
  }, []);

  const stop = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await sendToBackground<undefined, undefined>({ type: MessageType.STOP_SESSION });
      if (!res.success) setError(res.error ?? 'Failed to stop session');
      else {
        setSession(null);
        setSessionState('idle');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const discard = useCallback(async (): Promise<void> => {
    await sendToBackground<undefined, undefined>({ type: MessageType.DISCARD_SESSION });
    setSession(null);
    setSessionState('idle');
    setError(null);
  }, []);

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  return { session, sessionState, isLoading, error, start, pause, resume, stop, discard, clearError };
}


