import { useState, useEffect, useCallback, useRef } from 'react';
import type { CaptureConfig } from '@/shared/types';
import { MessageType } from '@/shared/types';
import type { BackgroundState } from '@/shared/types';
import { sendToBackground, onMessageFromBackground } from '@/infrastructure/browser/runtime';
import { DEFAULT_STORAGE } from '@/shared/types';

/**
 * useCapture hook
 *
 * Reads capture config from background state.
 * Exposes updateConfig() dispatcher.
 */

export interface UseCaptureReturn {
  readonly captureConfig: CaptureConfig;
  readonly updateConfig: (config: CaptureConfig) => Promise<void>;
}

export function useCapture(): UseCaptureReturn {
  const [captureConfig, setCaptureConfig] = useState<CaptureConfig>(
    DEFAULT_STORAGE.captureConfig,
  );
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    sendToBackground<undefined, BackgroundState>({ type: MessageType.GET_STATE })
      .then((res) => {
        if (mountedRef.current && res.success && res.data) {
          setCaptureConfig(res.data.captureConfig);
        }
      })
      .catch(() => undefined);

    const cleanup = onMessageFromBackground((message, sendResponse) => {
      if (message.type === MessageType.STATE_UPDATE) {
        const state = message.payload as BackgroundState;
        if (mountedRef.current) setCaptureConfig(state.captureConfig);
        sendResponse({ success: true });
      }
    });

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, []);

  const updateConfig = useCallback(async (config: CaptureConfig): Promise<void> => {
    await sendToBackground<CaptureConfig, undefined>({
      type: MessageType.UPDATE_CAPTURE_CONFIG,
      payload: config,
    });
    if (mountedRef.current) setCaptureConfig(config);
  }, []);

  return { captureConfig, updateConfig };
}
