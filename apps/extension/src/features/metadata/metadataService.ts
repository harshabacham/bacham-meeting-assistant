import type { MetadataReadyPayload, NativeMessage, DetectedPlatform } from '@/shared/types';
import { MessageType } from '@/shared/types';
import type { Logger } from '@/infrastructure/logger/logger';
import type { NativeMessagingClient } from '@/infrastructure/communication/nativeMessagingClient';
import * as browserTabs from '@/infrastructure/browser/tabs';
import { NATIVE_MESSAGING_PROTOCOL_VERSION } from '@/shared/constants/app';

/**
 * Metadata Service
 *
 * Extracts session metadata from the captured tab: title, URL, platform.
 * Sends METADATA_READY messages to the Desktop App.
 *
 * This service reads only tab.title and tab.url — never page content,
 * form data, or anything beyond what's needed to label a session.
 */

export interface TabMetadata {
  readonly tabTitle: string;
  readonly tabUrl: string;
  readonly detectedPlatform: DetectedPlatform;
  readonly capturedAt: string;
}

export interface MetadataService {
  /** Extract and return metadata for the given tab. */
  extractTabMetadata(tabId: number): Promise<TabMetadata | null>;
  /** Extract metadata and send a METADATA_READY message to the Desktop App. */
  sendMetadata(tabId: number, sessionId: string, courseLabel?: string): Promise<void>;
}

/** Detect the lecture platform from a URL. */
function detectPlatform(url: string): DetectedPlatform {
  if (/zoom\.us/i.test(url)) return 'zoom';
  if (/meet\.google\.com/i.test(url)) return 'google-meet';
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (/teams\.microsoft\.com/i.test(url)) return 'teams';
  return 'unknown';
}

/** Factory — all dependencies injected. */
export function createMetadataService(
  messagingClient: NativeMessagingClient,
  log: Logger,
): MetadataService {
  const MODULE = 'MetadataService';

  async function extractTabMetadata(tabId: number): Promise<TabMetadata | null> {
    const tab = await browserTabs.getTabById(tabId);
    if (!tab) {
      log.warn(MODULE, 'Tab not found for metadata extraction', { tabId });
      return null;
    }

    const metadata: TabMetadata = {
      tabTitle: tab.title ? (tab.title.length > 30 ? tab.title.substring(0, 30) + '...' : tab.title) : 'Unknown',
      tabUrl: tab.url ?? '',
      detectedPlatform: detectPlatform(tab.url ?? ''),
      capturedAt: new Date().toISOString(),
    };

    log.debug(MODULE, 'Metadata extracted', { metadata });
    return metadata;
  }

  async function sendMetadata(
    tabId: number,
    sessionId: string,
    courseLabel?: string,
  ): Promise<void> {
    const metadata = await extractTabMetadata(tabId);
    if (!metadata) return;

    const payload: MetadataReadyPayload = {
      tabTitle: metadata.tabTitle,
      tabUrl: metadata.tabUrl,
      ...(courseLabel !== undefined ? { courseLabel } : {}),
      detectedPlatform: metadata.detectedPlatform,
      capturedAt: metadata.capturedAt,
    };

    const message: NativeMessage<MetadataReadyPayload> = {
      version: NATIVE_MESSAGING_PROTOCOL_VERSION,
      type: MessageType.METADATA_READY,
      payload,
      timestamp: Date.now(),
      sessionId,
    };

    messagingClient.send(message);
    log.info(MODULE, 'Metadata sent', { sessionId, platform: metadata.detectedPlatform });
  }

  return { extractTabMetadata, sendMetadata };
}
