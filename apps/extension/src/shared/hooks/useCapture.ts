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

    // 1. Read directly from chrome.storage.local for instant hydration
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['captureConfig'], (result) => {
        if (mountedRef.current && result.captureConfig) {
          setCaptureConfig(result.captureConfig as CaptureConfig);
        }
      });
    }

    // 2. Also request latest state from background
    sendToBackground<undefined, BackgroundState>({ type: MessageType.GET_STATE })
      .then((res) => {
        if (mountedRef.current && res.success && res.data?.captureConfig) {
          setCaptureConfig(res.data.captureConfig);
        }
      })
      .catch(() => undefined);

    // 3. Listen for storage changes across tabs/panels
    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.captureConfig?.newValue && mountedRef.current) {
        setCaptureConfig(changes.captureConfig.newValue as CaptureConfig);
      }
    };
    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener(storageListener);
    }

    // 4. Background runtime state update listener
    const cleanup = onMessageFromBackground((message, sendResponse) => {
      if (message.type === MessageType.STATE_UPDATE) {
        const state = message.payload as BackgroundState;
        if (mountedRef.current && state.captureConfig) setCaptureConfig(state.captureConfig);
        sendResponse({ success: true });
      }
    });

    return () => {
      mountedRef.current = false;
      if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
        chrome.storage.onChanged.removeListener(storageListener);
      }
      cleanup();
    };
  }, []);

  const updateConfig = useCallback(async (config: CaptureConfig): Promise<void> => {
    // Immediate optimistic local update for zero-latency UI feel
    if (mountedRef.current) {
      setCaptureConfig(config);
    }

    // Direct persistence in chrome.storage.local
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      try {
        await chrome.storage.local.set({ captureConfig: config });
      } catch (err) {
        console.warn('[useCapture] Failed to save captureConfig to storage:', err);
      }
    }

    // Dispatch to background service worker
    try {
      await sendToBackground<CaptureConfig, undefined>({
        type: MessageType.UPDATE_CAPTURE_CONFIG,
        payload: config,
      });
    } catch {
      // Ignore background communication errors if worker is sleeping
    }
  }, []);

  return { captureConfig, updateConfig };
}
