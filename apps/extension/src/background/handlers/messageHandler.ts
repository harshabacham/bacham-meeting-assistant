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
import { NATIVE_MESSAGING_PROTOCOL_VERSION } from '@/shared/constants/app';


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

  let screenshotIntervalId: ReturnType<typeof setInterval> | null = null;

  function clearScreenshotInterval() {
    if (screenshotIntervalId !== null) {
      clearInterval(screenshotIntervalId);
      screenshotIntervalId = null;
    }
  }

  function startScreenshotInterval(intervalMs: number, sessionId: string) {
    clearScreenshotInterval();
    screenshotIntervalId = setInterval(() => {
      storage.get(['currentSession']).then(({ currentSession }) => {
        if (!currentSession || currentSession.state !== 'recording') return;
        void screenshotService.takeScreenshot(sessionId);
      }).catch(err => log.error(MODULE, 'Error in screenshot interval', { err }));
    }, intervalMs);
  }

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

      case MessageType.RETRY_CONNECTION: {
        messagingClient.connect();
        return { success: true };
      }

      case 'OPEN_APP' as any: {
        messagingClient.connect();
        messagingClient.send({
          version: NATIVE_MESSAGING_PROTOCOL_VERSION,
          type: 'OPEN_APP' as any,
          payload: {},
          timestamp: Date.now(),
        });
        return { success: true };
      }

      case MessageType.PRE_WARM_OFFSCREEN: {
        try {
          await chrome.offscreen.createDocument({
            url: 'src/offscreen/offscreen.html',
            reasons: [chrome.offscreen.Reason.USER_MEDIA, chrome.offscreen.Reason.DISPLAY_MEDIA],
            justification: 'Recording lecture audio and video',
          });
        } catch (err: any) {
          if (!err.message?.includes('Only a single offscreen document may be created')) {
            log.error(MODULE, 'Failed to pre-warm offscreen document', { err });
          }
        }
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

        // Get stream ID: use the stream ID from the popup if provided.
        // If empty, the offscreen document will use getDisplayMedia as a fallback,
        // which triggers its own native screen sharing popup.
        const captureResult = { 
          streamId: intent.streamId || '', 
          hasAudio: intent.streamHasAudio ?? true 
        };

        // Fallback: Ensure offscreen document exists before sending message.
        try {
          await chrome.offscreen.createDocument({
            url: 'src/offscreen/offscreen.html',
            reasons: [chrome.offscreen.Reason.USER_MEDIA, chrome.offscreen.Reason.DISPLAY_MEDIA],
            justification: 'Recording lecture audio and video',
          });
        } catch (err: any) {
          if (!err.message?.includes('Only a single offscreen document may be created')) {
            log.error(MODULE, 'Failed to create offscreen document', { err });
          }
        }

        if (intent.captureAudio && !captureResult.hasAudio && !intent.captureVideo) {
          return { 
            success: false, 
            error: 'You selected "Only Audio", but did not share system audio. Please check the "Share audio" box when selecting a screen.' 
          };
        }

        const session = await sessionService.createSession(
          intent,
          tab.id,
          tab.title ? (tab.title.length > 30 ? tab.title.substring(0, 30) + '...' : tab.title) : 'Unknown',
          tab.url ?? '',
        );

        // Persist capture config
        const captureConfig: CaptureConfig = {
          audio: intent.captureAudio && (captureResult.hasAudio ?? false),
          video: intent.captureVideo,
          captureMode: intent.captureMode ?? 'tab',
          ...(intent.includeMicrophone !== undefined ? { includeMicrophone: intent.includeMicrophone } : {}),
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

        // Tell the content script to open the sidebar UI
        chrome.tabs.sendMessage(tab.id, { type: 'OPEN_SIDEBAR' }).catch((e) => {
          log.warn(MODULE, 'Failed to send OPEN_SIDEBAR to content script', { error: e });
        });

        // Set up screenshot interval if configured (using setInterval for precise sub-minute capture)
        if (intent.screenshotIntervalMs) {
          startScreenshotInterval(intent.screenshotIntervalMs, session.id);
        }

        // Update badge
        await browserAction.setBadgeText('REC');
        await browserAction.setBadgeColor('recording');
        await browserAction.setIcon('recording');

        const updatedSession = await sessionService.transition(session.id, 'recording');

        // Immediately send START_CAPTURE with no initial delay to prevent streamId expiration
        let captureStarted = false;
        for (let attempt = 0; attempt < 5; attempt++) {
          try {
            await chrome.runtime.sendMessage({
              target: 'offscreen',
              type: 'START_CAPTURE',
              payload: { streamId: captureResult.streamId, config: captureConfig, sessionId: session.id }
            });
            captureStarted = true;
            break;
          } catch (err: any) {
            log.warn(MODULE, `START_CAPTURE attempt ${attempt + 1} failed — retrying`, { err: err?.message });
            await new Promise(resolve => setTimeout(resolve, 50)); // Very fast retry
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
        if (!currentSession || currentSession.state === 'idle' || currentSession.state === 'stopping') {
          return { success: true };
        }

        await sessionService.transition(currentSession.id, 'stopping');

        // Stop capture in offscreen doc
        await chrome.runtime.sendMessage({ target: 'offscreen', type: 'STOP_CAPTURE' })
          .catch(err => {
            log.warn(MODULE, 'Failed to stop offscreen capture', { err });
            return null;
          });
          
        await chrome.offscreen.closeDocument()
          .catch(err => log.warn(MODULE, 'Failed to close offscreen doc', { err }));

        // Clear screenshot interval
        clearScreenshotInterval();

        const endedAt = new Date().toISOString();
        const durationMs = Date.now() - new Date(currentSession.startedAt).getTime()
          - currentSession.pausedDurationMs;

        const stopPayload: SessionStopPayload = {
          endedAt,
          durationMs,
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
        clearScreenshotInterval();
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
          log.info(MODULE, 'Triggering immediate snapshot.');
          try {
            const response = await chrome.runtime.sendMessage({
              target: 'offscreen',
              type: 'TAKE_SCREENSHOT',
            });
            if (response?.success && response.base64) {
              void screenshotService.processScreenshot(currentSession.id, response.base64);
              return { success: true, data: { base64: response.base64 } };
            }
          } catch (err) {
            log.warn(MODULE, 'Failed to capture frame from offscreen', { err });
          }
        }
        return { success: false, error: 'No active recording stream' };
      }

      case MessageType.LIVE_CAPTION: {
        const payload = message.payload as import('@/shared/types').LiveCaptionPayload;
        const activeSession = await sessionService.loadSession();
        const nativeMsg: NativeMessage<import('@/shared/types').LiveCaptionPayload> = {
          version: NATIVE_MESSAGING_PROTOCOL_VERSION,
          type: MessageType.LIVE_CAPTION,
          payload,
          sessionId: (message as any).sessionId ?? activeSession?.id,
          timestamp: Date.now(),
        };
        messagingClient.send(nativeMsg);

        // Also buffer caption for Catch Me Up feature (keep last 200 entries)
        try {
          const stored = await chrome.storage.session.get(['captionBuffer']) as { captionBuffer?: Array<{text: string; ts: number}> };
          const buffer: Array<{text: string; ts: number}> = stored.captionBuffer ?? [];
          buffer.push({ text: payload.text, ts: payload.timestamp });
          // Keep only last 200 captions (~last 10–15 mins)
          if (buffer.length > 200) buffer.splice(0, buffer.length - 200);
          await chrome.storage.session.set({ captionBuffer: buffer });
        } catch (_e) {
          // session storage may not be available — ignore
        }
        return { success: true };
      }

      case MessageType.LOCAL_TRANSCRIPT_SEGMENT: {
        const payload = message.payload as import('@/shared/types').LiveCaptionPayload;
        const activeSession = await sessionService.loadSession();
        // The local transcript segment represents the user's microphone.
        // We package it as a LIVE_CAPTION so the Desktop App records it and routes it through the Interview Engine.
        const nativeMsg: NativeMessage<import('@/shared/types').LiveCaptionPayload> = {
          version: NATIVE_MESSAGING_PROTOCOL_VERSION,
          type: MessageType.LIVE_CAPTION,
          payload: {
            text: payload.text,
            timestamp: payload.timestamp,
            platform: 'native_mic', // Indicates this came from the local user's microphone
            speakerName: 'You'
          },
          sessionId: (message as any).sessionId ?? activeSession?.id,
          timestamp: Date.now(),
        };
        messagingClient.send(nativeMsg);
        return { success: true };
      }

      case MessageType.CATCHUP_REQUEST: {
        // Fetch buffered captions
        let captionText = '';
        try {
          const stored = await chrome.storage.session.get(['captionBuffer']) as { captionBuffer?: Array<{text: string; ts: number}> };
          const buffer = stored.captionBuffer ?? [];
          if (buffer.length === 0) {
            return { success: true, data: { summary: 'No conversation captured yet. Make sure captions are enabled on your meeting platform.' } };
          }
          captionText = buffer.map(c => c.text).join(' ');
        } catch (_e) {
          return { success: false, error: 'Could not read caption buffer.' };
        }

        // Get Gemini API key from storage (raw access since it's outside the schema)
        let apiKey = '';
        try {
          const raw = await chrome.storage.local.get(['geminiApiKey']) as { geminiApiKey?: string };
          apiKey = raw.geminiApiKey ?? '';
        } catch (_e) {}

        if (!apiKey) {
          return { success: false, error: 'Gemini API key not configured. Please add it in extension Settings.' };
        }

        // Call Gemini
        try {
          const prompt = `You are a live meeting assistant. The following is a transcript of what has been said so far in the meeting:\n\n"${captionText.slice(-6000)}"\n\nGive a crisp, helpful summary of:\n1. What has been discussed (2-3 bullet points max)\n2. Any key decisions or action items mentioned\n3. The current topic being discussed\n\nKeep it under 120 words. Be direct and practical.`;

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: 300, temperature: 0.3 }
              })
            }
          );

          const json = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
          const summary = json.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Could not generate summary. Please try again.';
          return { success: true, data: { summary } };
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          return { success: false, error: `Gemini API error: ${errMsg}` };
        }
      }

      case MessageType.MUTE_STATE_CHANGE: {
        const { muted } = message.payload as import('@/shared/types').MuteStatePayload;
        const { currentSession } = await storage.get(['currentSession']);
        if (!currentSession || currentSession.state !== 'recording') {
          return { success: true }; // Not recording, nothing to do
        }

        if (muted) {
          // Pause the transcript recorder so we don't capture muted audio
          await chrome.runtime.sendMessage({ target: 'offscreen', type: 'PAUSE_CAPTURE' })
            .catch(err => log.warn(MODULE, 'Failed to pause offscreen capture on mute', { err }));
          log.info(MODULE, 'Mic muted — transcript capture paused');
        } else {
          // Resume when unmuted
          await chrome.runtime.sendMessage({ target: 'offscreen', type: 'RESUME_CAPTURE' })
            .catch(err => log.warn(MODULE, 'Failed to resume offscreen capture on unmute', { err }));
          log.info(MODULE, 'Mic unmuted — transcript capture resumed');
        }
        return { success: true };
      }

      case MessageType.DECISION_CONFIRMED: {
        const payload = message.payload as { text: string };
        const nativeMsg: NativeMessage<any> = {
          version: NATIVE_MESSAGING_PROTOCOL_VERSION,
          type: MessageType.CONFIRM_DECISION as any, // Cast since CONFIRM_DECISION needs to be added to extension's MessageType if not already there (wait, I didn't add CONFIRM_DECISION to extension's MessageType). I will cast to any or just add it. Wait, I should use string 'CONFIRM_DECISION' and cast to MessageType.
          payload: { decisionText: payload.text },
          timestamp: Date.now(),
        };
        // Let's use the exact string that matches the Rust enum `ConfirmDecision` which is transformed to `CONFIRM_DECISION` by SCREAMING_SNAKE_CASE
        (nativeMsg as any).type = 'CONFIRM_DECISION';
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


