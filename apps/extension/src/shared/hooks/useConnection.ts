import { useState, useEffect, useRef } from 'react';
import type { ConnectionStatus, BackgroundState } from '@/shared/types';
import { MessageType } from '@/shared/types';
import { sendToBackground, onMessageFromBackground } from '@/infrastructure/browser/runtime';

/**
 * useConnection hook
 *
 * Subscribes to the native messaging connection status from background state.
 */

export interface UseConnectionReturn {
  readonly connectionStatus: ConnectionStatus;
  readonly pendingQueueSize: number;
}

export function useConnection(): UseConnectionReturn {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [pendingQueueSize, setPendingQueueSize] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    sendToBackground<undefined, BackgroundState>({ type: MessageType.GET_STATE })
      .then((res) => {
        if (mountedRef.current && res.success && res.data) {
          setConnectionStatus(res.data.connectionStatus);
          setPendingQueueSize(res.data.pendingQueueSize);
        }
      })
      .catch(() => undefined);

    const cleanup = onMessageFromBackground((message, sendResponse) => {
      if (message.type === MessageType.STATE_UPDATE) {
        const state = message.payload as BackgroundState;
        if (mountedRef.current) {
          setConnectionStatus(state.connectionStatus);
          setPendingQueueSize(state.pendingQueueSize);
        }
        sendResponse({ success: true });
      }
    });

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, []);

  return { connectionStatus, pendingQueueSize };
}
