import type { NativeMessage, MetadataReadyPayload } from '@/shared/types';
import { MessageType } from '@/shared/types';
import type { Logger } from '@/infrastructure/logger/logger';
import type { NativeMessagingClient } from '@/infrastructure/communication/nativeMessagingClient';
import type { SessionService } from '@/features/session/sessionService';
import type { MetadataService } from '@/features/metadata/metadataService';
import { NATIVE_MESSAGING_PROTOCOL_VERSION } from '@/shared/constants/app';

/**
 * Screenshot Service
 *
 * Handles on-demand and interval-based screenshot capture.
 * Screenshots are extracted from the active offscreen capture session
 * (guaranteeing we capture the exact tab being recorded even in background).
 *
 * Note: The screenshot alarm is managed by the background's alarmHandler.
 * This service only implements the actual capture logic.
 */

export interface ScreenshotService {
  /** Take a single screenshot of the recorded tab and send it to the Desktop App. */
  takeScreenshot(sessionId: string): Promise<void>;
  /** Process a base64 screenshot directly. */
  processScreenshot(sessionId: string, base64Data: string): Promise<void>;
}

/** Factory — all dependencies injected. */
export function createScreenshotService(
  messagingClient: NativeMessagingClient,
  sessionService: SessionService,
  metadataService: MetadataService,
  log: Logger,
): ScreenshotService {
  const MODULE = 'ScreenshotService';

  async function takeScreenshot(sessionId: string): Promise<void> {
    const session = await sessionService.loadSession();
    if (!session || session.id !== sessionId) {
      log.warn(MODULE, 'Active session not found or mismatched', { sessionId });
      return;
    }

    try {
      // 1. Send message to offscreen document to get a frame from the video stream
      const response = await chrome.runtime.sendMessage({
        target: 'offscreen',
        type: 'TAKE_SCREENSHOT'
      });

      if (!response || !response.success || !response.base64) {
        log.warn(MODULE, 'Offscreen document failed to return screenshot base64', { response });
        return;
      }

      const base64Data = response.base64;

      // 2. Extract metadata for the specifically recorded tab
      const metadata = await metadataService.extractTabMetadata(session.tabId);
      if (!metadata) {
        log.warn(MODULE, 'Failed to extract metadata for recorded tab', { tabId: session.tabId });
        return;
      }

      const payload: MetadataReadyPayload = {
        tabTitle: metadata.tabTitle,
        tabUrl: metadata.tabUrl,
        ...(session.courseLabel !== undefined ? { courseLabel: session.courseLabel } : {}),
        detectedPlatform: metadata.detectedPlatform,
        capturedAt: metadata.capturedAt,
        imageBase64: base64Data,
      };

      const message: NativeMessage<MetadataReadyPayload> = {
        version: NATIVE_MESSAGING_PROTOCOL_VERSION,
        type: MessageType.METADATA_READY,
        payload,
        timestamp: Date.now(),
        sessionId,
      };

      messagingClient.send(message);
      log.debug(MODULE, 'Screenshot sent', { sessionId, tabTitle: metadata.tabTitle });
    } catch (err: any) {
      log.error(MODULE, 'Error taking screenshot via offscreen document', { error: err?.message });
    }
  }

  async function processScreenshot(sessionId: string, base64Data: string): Promise<void> {
    const session = await sessionService.loadSession();
    if (!session || session.id !== sessionId) {
      log.warn(MODULE, 'Active session not found or mismatched', { sessionId });
      return;
    }

    try {
      const metadata = await metadataService.extractTabMetadata(session.tabId);
      if (!metadata) {
        log.warn(MODULE, 'Failed to extract metadata for recorded tab', { tabId: session.tabId });
        return;
      }

      const payload: MetadataReadyPayload = {
        tabTitle: metadata.tabTitle,
        tabUrl: metadata.tabUrl,
        ...(session.courseLabel !== undefined ? { courseLabel: session.courseLabel } : {}),
        detectedPlatform: metadata.detectedPlatform,
        capturedAt: metadata.capturedAt,
        imageBase64: base64Data,
      };

      const message: NativeMessage<MetadataReadyPayload> = {
        version: NATIVE_MESSAGING_PROTOCOL_VERSION,
        type: MessageType.METADATA_READY,
        payload,
        timestamp: Date.now(),
        sessionId,
      };

      messagingClient.send(message);
      log.debug(MODULE, 'Screenshot sent via processScreenshot', { sessionId, tabTitle: metadata.tabTitle });
    } catch (err: any) {
      log.error(MODULE, 'Error processing screenshot', { error: err?.message });
    }
  }

  return { takeScreenshot, processScreenshot };
}
