import { useState, useEffect, useRef } from 'react';
import type { BackgroundState } from '@/shared/types';
import { MessageType } from '@/shared/types';
import { sendToBackground, onMessageFromBackground } from '@/infrastructure/browser/runtime';

/**
 * useMetadata hook
 *
 * Reads tab metadata (title, URL) from the active session.
 */

export interface TabMetadataSnapshot {
  readonly tabTitle: string;
  readonly tabUrl: string;
  readonly courseLabel: string | undefined;
}

export interface UseMetadataReturn {
  readonly metadata: TabMetadataSnapshot | null;
}

export function useMetadata(): UseMetadataReturn {
  const [metadata, setMetadata] = useState<TabMetadataSnapshot | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    sendToBackground<undefined, BackgroundState>({ type: MessageType.GET_STATE })
      .then((res) => {
        if (mountedRef.current && res.success && res.data?.session) {
          const { session } = res.data;
          setMetadata({
            tabTitle: session.tabTitle,
            tabUrl: session.tabUrl,
            courseLabel: session.courseLabel,
          });
        }
      })
      .catch(() => undefined);

    const cleanup = onMessageFromBackground((message, sendResponse) => {
      if (message.type === MessageType.STATE_UPDATE) {
        const state = message.payload as BackgroundState;
        if (mountedRef.current && state.session) {
          setMetadata({
            tabTitle: state.session.tabTitle,
            tabUrl: state.session.tabUrl,
            courseLabel: state.session.courseLabel,
          });
        }
        sendResponse({ success: true });
      }
    });

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, []);

  return { metadata };
}
