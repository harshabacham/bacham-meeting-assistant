import { useState, useEffect, useCallback, useRef } from 'react';
import type { PermissionStatus } from '@/shared/types';
import { MessageType } from '@/shared/types';
import type { BackgroundState } from '@/shared/types';
import { sendToBackground, onMessageFromBackground } from '@/infrastructure/browser/runtime';

/**
 * usePermissions hook
 *
 * Reads permission status from background state.
 * Exposes a requestAll() dispatcher.
 */

export interface UsePermissionsReturn {
  readonly permissionStatus: PermissionStatus | null;
  readonly isRequesting: boolean;
  readonly requestAll: () => Promise<boolean>;
}

export function usePermissions(): UsePermissionsReturn {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    sendToBackground<undefined, BackgroundState>({ type: MessageType.GET_STATE })
      .then((res) => {
        if (mountedRef.current && res.success && res.data) {
          setPermissionStatus(res.data.permissionStatus);
        }
      })
      .catch(() => undefined);

    const cleanup = onMessageFromBackground((message, sendResponse) => {
      if (message.type === MessageType.STATE_UPDATE) {
        const state = message.payload as BackgroundState;
        if (mountedRef.current) setPermissionStatus(state.permissionStatus);
        sendResponse({ success: true });
      }
    });

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, []);

  const requestAll = useCallback(async (): Promise<boolean> => {
    setIsRequesting(true);
    try {
      const res = await sendToBackground<undefined, undefined>({
        type: MessageType.REQUEST_PERMISSIONS,
      });
      return res.success;
    } finally {
      if (mountedRef.current) setIsRequesting(false);
    }
  }, []);

  return { permissionStatus, isRequesting, requestAll };
}
