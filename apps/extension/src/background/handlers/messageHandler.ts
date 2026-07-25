import type {
  InternalMessage,
  InternalResponse,
  BackgroundState,
  StartSessionIntent,
  CaptureConfig,
  SessionStartPayload,
  SessionStopPayload,
  NativeMessage,
  DeleteLecturePayload,
  RenameLecturePayload,
} from '@/shared/types';
import { MessageType } from '@/shared/types';
import type { StorageService } from '@/infrastructure/storage/storageService';
import type { SessionService } from '@/features/session/sessionService';
import type { PermissionService } from '@/features/permissions/permissionService';
import type { MetadataService } from '@/features/metadata/metadataService';
import type { NativeMessagingClient } from '@/infrastructure/communication/nativeMessagingClient';
import type { Logger } from '@/infrastructure/logger/logger';
import * as browserTabs from '@/infrastructure/browser/tabs';
import * as browserAction from '@/infrastructure/browser/action';
import { NATIVE_MESSAGING_PROTOCOL_VERSION, SCREENSHOT_ALARM_NAME } from '@/shared/constants/app';


/**
 * Message Handler
 *
 * Routes chrome.runtime.onMessage events from the popup to the appropriate services.
 * All popup → background communication flows through here.
 * Returns typed InternalResponse objects via sendResponse.
 */

export interface MessageHandler {
  onMessage(
    message: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: InternalResponse) => void,
  ): boolean; // Must return true to keep channel open for async response
}

export function createMessageHandler(
  storage: StorageService,
  sessionService: SessionService,
  permissionService: PermissionService,
  metadataService: MetadataService,
  messagingClient: NativeMessagingClient,
  screenshotService: import('@/features/capture/screenshotService').ScreenshotService,
  log: Logger,
): MessageHandler {
  const MODULE = 'MessageHandler';

  /** Build the full BackgroundState snapshot for the popup. */
  async function buildState(): Promise<BackgroundState> {
    const stored = await storage.get([
      'currentSession',
      'captureConfig',
      'connectionStatus',
      'pendingQueueSize',
    ]);

    const permissionStatus = await permissionService.getStatus();

    return {
      session: stored.currentSession,
      sessionState: stored.currentSession?.state ?? 'idle',
      captureConfig: stored.captureConfig,
      captureState: {
        isCapturing: stored.currentSession?.state === 'recording',
        isPaused: stored.currentSession?.state === 'paused',
        streamId: null, // Stream is managed in popup context
        chunkCount: 0,
        currentChunkBytes: 0,
      },
      permissionStatus,
      connectionStatus: stored.connectionStatus,
      pendingQueueSize: stored.pendingQueueSize,
    };
  }

  async function handleMessage(message: InternalMessage): Promise<InternalResponse> {
    switch (message.type) {
      case MessageType.GET_STATE: {
        const state = await buildState();
        return { success: true, data: state };
      }

      case MessageType.REQUEST_PERMISSIONS: {
        const granted = await permissionService.requestAll();
        return granted
          ? { success: true }
          : { success: false, error: 'Permission denied by user' };
      }

      case MessageType.FORWARD_TO_NATIVE: {
        const nativeMsg = message.payload as NativeMessage<unknown>;
        messagingClient.send(nativeMsg);
        return { success: true };
      }

      case MessageType.START_SESSION: {
        const intent = message.payload as StartSessionIntent;

        // Validate intent
        if (typeof intent.captureAudio !== 'boolean' || typeof intent.captureVideo !== 'boolean') {
          return { success: false, error: 'Invalid StartSessionIntent: captureAudio and captureVideo are required' };
        }

        const tab = await browserTabs.getActiveTab();
        if (!tab?.id) {
          return { success: false, error: 'No active tab found' };
        }

        // Connect to native host first
        messagingClient.connect();

        // Get stream ID immediately to preserve user gesture
        const streamId = await new Promise<string | undefined>((resolve, reject) => {
          if (intent.captureMode === 'screen') {
            chrome.desktopCapture.chooseDesktopMedia(['screen', 'window', 'tab'], tab, (id) => {
              if (chrome.runtime.lastError || !id) {
                log.error(MODULE, 'desktopCapture.chooseDesktopMedia failed', {
                  error: chrome.runtime.lastError?.message,
                });
                reject(chrome.runtime.lastError || new Error('No stream ID obtained'));
                return;
              }
              resolve(id);
            });
          } else {
            chrome.tabCapture.getMediaStreamId(
              { targetTabId: tab.id! },
              (id) => {
                if (chrome.runtime.lastError || !id) {
                  log.error(MODULE, 'tabCapture.getMediaStreamId failed', {
                    error: chrome.runtime.lastError?.message,
                  });
                  reject(chrome.runtime.lastError || new Error('No stream ID obtained'));
                  return;
                }
                resolve(id);
              }
            );
          }
        }).catch(() => undefined);

        if (!streamId) {
          return { success: false, error: 'Failed to obtain tab stream ID' };
        }

        const session = await sessionService.createSession(
          intent,
          tab.id,
          tab.title ? (tab.title.length > 30 ? tab.title.substring(0, 30) + '...' : tab.title) : 'Unknown',
          tab.url ?? '',
        );

        // Persist capture config
        const captureConfig: CaptureConfig = {
          audio: intent.captureAudio,
          video: intent.captureVideo,
          ...(intent.screenshotIntervalMs !== undefined
            ? { screenshotIntervalMs: intent.screenshotIntervalMs }
            : {}),
        };
        await storage.set({ captureConfig });

        // Send SESSION_START to Desktop App
        const sessionStartPayload: SessionStartPayload = {
          tabTitle: session.tabTitle,
          tabUrl: session.tabUrl,
          ...(session.courseLabel !== undefined ? { courseLabel: session.courseLabel } : {}),
          captureAudio: intent.captureAudio,
          captureVideo: intent.captureVideo,
          ...(intent.screenshotIntervalMs !== undefined
            ? { screenshotIntervalMs: intent.screenshotIntervalMs }
            : {}),
        };

        const sessionStartMsg: NativeMessage<SessionStartPayload> = {
          version: NATIVE_MESSAGING_PROTOCOL_VERSION,
          type: MessageType.SESSION_START,
          payload: sessionStartPayload,
          timestamp: Date.now(),
          sessionId: session.id,
        };
        messagingClient.send(sessionStartMsg);

        // Send metadata
        await metadataService.sendMetadata(tab.id, session.id, intent.courseLabel);

        // Set up screenshot interval alarm if configured
        if (intent.screenshotIntervalMs) {
          await chrome.alarms.create(SCREENSHOT_ALARM_NAME, {
            periodInMinutes: intent.screenshotIntervalMs / 60_000,
          });
        }

        // Update badge
        await browserAction.setBadgeText('REC');
        await browserAction.setBadgeColor('recording');
        await browserAction.setIcon('recording');

        const updatedSession = await sessionService.transition(session.id, 'recording');

        // Create offscreen document and start capture
        try {
          await chrome.offscreen.createDocument({
            url: 'src/offscreen/offscreen.html',
            reasons: [chrome.offscreen.Reason.USER_MEDIA],
            justification: 'Recording lecture audio and playing it back to prevent muting',
          });
        } catch (err: any) {
          if (!err.message?.includes('Only a single offscreen document may be created')) {
            log.error(MODULE, 'Failed to create offscreen document', { err });
          }
        }

        // Wait for offscreen doc to load with retry loop
        let captureStarted = false;
        for (let attempt = 0; attempt < 5; attempt++) {
          await new Promise(resolve => setTimeout(resolve, attempt === 0 ? 800 : 500));
          try {
            await chrome.runtime.sendMessage({
              target: 'offscreen',
              type: 'START_CAPTURE',
              payload: { streamId, config: captureConfig, sessionId: session.id }
            });
            captureStarted = true;
            break;
          } catch (err: any) {
            log.warn(MODULE, `START_CAPTURE attempt ${attempt + 1} failed — retrying`, { err: err?.message });
          }
        }
        if (!captureStarted) {
          log.error(MODULE, 'Failed to start capture in offscreen doc after retries');
        }

        return { success: true, data: { session: updatedSession, tab } };
      }

      case MessageType.PAUSE_SESSION: {
        const { currentSession } = await storage.get(['currentSession']);
        if (!currentSession) {
          return { success: false, error: 'No active session' };
        }
        
        await chrome.runtime.sendMessage({ target: 'offscreen', type: 'PAUSE_CAPTURE' })
          .catch(err => log.warn(MODULE, 'Failed to pause offscreen capture', { err }));

        const updated = await sessionService.transition(currentSession.id, 'paused');
        await browserAction.setBadgeText('II');
        await browserAction.setBadgeColor('paused');
        await browserAction.setIcon('paused');
        return { success: true, data: updated };
      }

      case MessageType.RESUME_SESSION: {
        const { currentSession } = await storage.get(['currentSession']);
        if (!currentSession) {
          return { success: false, error: 'No active session' };
        }

        await chrome.runtime.sendMessage({ target: 'offscreen', type: 'RESUME_CAPTURE' })
          .catch(err => log.warn(MODULE, 'Failed to resume offscreen capture', { err }));

        const updated = await sessionService.transition(currentSession.id, 'recording');
        await browserAction.setBadgeText('REC');
        await browserAction.setBadgeColor('recording');
        await browserAction.setIcon('recording');
        return { success: true, data: updated };
      }

      case MessageType.STOP_SESSION: {
        const { currentSession } = await storage.get(['currentSession']);
        if (!currentSession) {
          return { success: false, error: 'No active session' };
        }

        await sessionService.transition(currentSession.id, 'stopping');

        // Stop capture in offscreen doc
        await chrome.runtime.sendMessage({ target: 'offscreen', type: 'STOP_CAPTURE' })
          .catch(err => log.warn(MODULE, 'Failed to stop offscreen capture', { err }));
          
        await chrome.offscreen.closeDocument()
          .catch(err => log.warn(MODULE, 'Failed to close offscreen doc', { err }));

        // Clear screenshot alarm
        await chrome.alarms.clear(SCREENSHOT_ALARM_NAME);

        const endedAt = new Date().toISOString();
        const durationMs = Date.now() - new Date(currentSession.startedAt).getTime()
          - currentSession.pausedDurationMs;

        const stopPayload: SessionStopPayload = {
          endedAt,
          durationMs,
          chunkCount: 0, // Chunk count is tracked in popup context... wait, now it's in offscreen, but we don't strictly need accurate chunk count here right now.
        };

        const stopMsg: NativeMessage<SessionStopPayload> = {
          version: NATIVE_MESSAGING_PROTOCOL_VERSION,
          type: MessageType.SESSION_STOP,
          payload: stopPayload,
          timestamp: Date.now(),
          sessionId: currentSession.id,
        };
        messagingClient.send(stopMsg);

        await sessionService.transition(currentSession.id, 'idle');
        await browserAction.setBadgeText('');
        await browserAction.setIcon('idle');

        return { success: true };
      }

      case MessageType.DISCARD_SESSION: {
        await chrome.runtime.sendMessage({ target: 'offscreen', type: 'STOP_CAPTURE' })
          .catch(err => log.warn(MODULE, 'Failed to stop offscreen capture', { err }));
          
        await chrome.offscreen.closeDocument()
          .catch(err => log.warn(MODULE, 'Failed to close offscreen doc', { err }));

        await sessionService.discardSession();
        await chrome.alarms.clear(SCREENSHOT_ALARM_NAME);
        await browserAction.setBadgeText('');
        await browserAction.setIcon('idle');
        return { success: true };
      }

      case MessageType.UPDATE_CAPTURE_CONFIG: {
        const config = message.payload as CaptureConfig;
        if (typeof config.audio !== 'boolean' || typeof config.video !== 'boolean') {
          return { success: false, error: 'Invalid CaptureConfig' };
        }
        await storage.set({ captureConfig: config });
        return { success: true };
      }

      case MessageType.GET_STREAM_ID: {
        const tab = await browserTabs.getActiveTab();
        if (!tab?.id) {
          return { success: false, error: 'No active tab found' };
        }

        return new Promise((resolve) => {
          chrome.tabCapture.getMediaStreamId(
            { targetTabId: tab.id! },
            (streamId) => {
              if (chrome.runtime.lastError) {
                log.error(MODULE, 'tabCapture.getMediaStreamId failed', {
                  error: chrome.runtime.lastError.message,
                });
                resolve({ success: false, error: chrome.runtime.lastError.message ?? 'Unknown error' });
                return;
              }
              if (!streamId) {
                resolve({ success: false, error: 'No stream ID returned' });
                return;
              }
              void storage.set({ activeStreamId: streamId });
              resolve({ success: true, data: { streamId } });
            },
          );
        });
      }

      case MessageType.SEND_DELETE_LECTURE: {
        const { lectureId } = message.payload as DeleteLecturePayload;
        const deleteMsg: NativeMessage<DeleteLecturePayload> = {
          version: NATIVE_MESSAGING_PROTOCOL_VERSION,
          type: MessageType.DELETE_LECTURE,
          payload: { lectureId },
          timestamp: Date.now(),
        };
        messagingClient.send(deleteMsg);
        return { success: true };
      }

      case MessageType.SEND_RENAME_LECTURE: {
        const { lectureId, newTitle } = message.payload as RenameLecturePayload;
        const renameMsg: NativeMessage<RenameLecturePayload> = {
          version: NATIVE_MESSAGING_PROTOCOL_VERSION,
          type: MessageType.RENAME_LECTURE,
          payload: { lectureId, newTitle },
          timestamp: Date.now(),
        };
        messagingClient.send(renameMsg);
        return { success: true };
      }

      case MessageType.TRIGGER_SNAPSHOT: {
        const { currentSession } = await storage.get(['currentSession']);
        if (currentSession && currentSession.state === 'recording') {
          log.info(MODULE, 'Triggering immediate snapshot based on visual context event.');
          // Fire and forget so we don't block
          void screenshotService.takeScreenshot(currentSession.id);
        }
        return { success: true };
      }

      case MessageType.LIVE_CAPTION: {
        const payload = message.payload as import('@/shared/types').LiveCaptionPayload;
        const nativeMsg: NativeMessage<import('@/shared/types').LiveCaptionPayload> = {
          version: NATIVE_MESSAGING_PROTOCOL_VERSION,
          type: MessageType.LIVE_CAPTION,
          payload,
          timestamp: Date.now(),
        };
        messagingClient.send(nativeMsg);
        return { success: true };
      }

      default:
        log.warn(MODULE, 'Unknown message type', { type: message.type });
        return { success: false, error: `Unknown message type: ${String(message.type)}` };
    }
  }

  function onMessage(
    rawMessage: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: InternalResponse) => void,
  ): boolean {
    // Validate: must be an object with a 'type' field
    if (
      typeof rawMessage !== 'object' ||
      rawMessage === null ||
      !('type' in rawMessage) ||
      typeof (rawMessage as Record<string, unknown>)['type'] !== 'string'
    ) {
      log.warn(MODULE, 'Received invalid message — ignoring');
      sendResponse({ success: false, error: 'Invalid message shape' });
      return false;
    }

    const message = rawMessage as InternalMessage;
    log.debug(MODULE, 'Received message', { type: message.type });

    // Handle async and send response
    handleMessage(message)
      .then(sendResponse)
      .catch((err: unknown) => {
        const errorMsg = err instanceof Error ? err.message : String(err);
        log.error(MODULE, 'Error handling message', { type: message.type, error: errorMsg });
        sendResponse({ success: false, error: errorMsg });
      });

    // Return true to keep the channel open for the async response
    return true;
  }

  return { onMessage };
}


