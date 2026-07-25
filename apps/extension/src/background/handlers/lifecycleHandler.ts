import type { StorageService } from '@/infrastructure/storage/storageService';
import type { SessionService } from '@/features/session/sessionService';
import type { NativeMessagingClient } from '@/infrastructure/communication/nativeMessagingClient';
import type { Logger } from '@/infrastructure/logger/logger';
import * as browserAction from '@/infrastructure/browser/action';

/**
 * Lifecycle Handler
 *
 * Handles chrome.runtime.onInstalled and chrome.runtime.onStartup.
 * On every service-worker wake, rehydrates state from storage and
 * reconciles with reality (detects stream loss, etc.).
 */

export interface LifecycleHandler {
  onInstalled(details: chrome.runtime.InstalledDetails): Promise<void>;
  onStartup(): Promise<void>;
  /** Call on every service-worker wake to rehydrate in-flight state. */
  rehydrate(): Promise<void>;
}

export function createLifecycleHandler(
  storage: StorageService,
  sessionService: SessionService,
  messagingClient: NativeMessagingClient,
  log: Logger,
): LifecycleHandler {
  const MODULE = 'LifecycleHandler';

  async function onInstalled(details: chrome.runtime.InstalledDetails): Promise<void> {
    log.info(MODULE, 'Extension installed/updated', { reason: details.reason });
    await storage.migrate();

    if (details.reason === 'install') {
      log.info(MODULE, 'First install — defaults written');
    }

    await browserAction.setBadgeText('');
    await browserAction.setIcon('idle');
  }

  async function onStartup(): Promise<void> {
    log.info(MODULE, 'Browser started up — rehydrating');
    await storage.migrate();
    await rehydrate();
  }

  async function rehydrate(): Promise<void> {
    log.info(MODULE, 'Rehydrating state from storage');

    const { currentSession, activeStreamId } = await storage.get([
      'currentSession',
      'activeStreamId',
    ]);

    if (!currentSession) {
      log.debug(MODULE, 'No active session found in storage');
      await browserAction.setBadgeText('');
      await browserAction.setIcon('idle');
      return;
    }

    const { state } = currentSession;

    if (state === 'recording' || state === 'paused') {
      // Service worker was killed while a session was in flight.
      // We can't recover the MediaStream handle — transition to error.
      if (!activeStreamId) {
        log.warn(MODULE, 'Service worker restarted mid-session — stream handle lost, transitioning to error', {
          sessionId: currentSession.id,
        });
        await sessionService.transition(currentSession.id, 'error', {
          errorMessage: 'Recording was interrupted because the extension background process restarted. Please start a new session.',
        });
        await browserAction.setBadgeText('!');
        await browserAction.setBadgeColor('error');
        await browserAction.setIcon('error');
        return;
      }

      // Stream ID exists — update UI to reflect paused/recording state
      if (state === 'recording') {
        await browserAction.setBadgeText('REC');
        await browserAction.setBadgeColor('recording');
        await browserAction.setIcon('recording');
      } else {
        await browserAction.setBadgeText('II');
        await browserAction.setBadgeColor('paused');
        await browserAction.setIcon('paused');
      }
    }

    if (state === 'connecting' || state === 'requesting-permission' || state === 'stopping') {
      // These transient states should not survive a restart — reset to idle
      log.info(MODULE, 'Resetting transient session state after restart', { state });
      await sessionService.discardSession();
      await browserAction.setBadgeText('');
      await browserAction.setIcon('idle');
      return;
    }

    if (state === 'error') {
      await browserAction.setBadgeText('!');
      await browserAction.setBadgeColor('error');
      await browserAction.setIcon('error');
    }

    // Attempt to connect to Desktop App on rehydration
    messagingClient.connect();

    log.info(MODULE, 'Rehydration complete', { sessionState: state });
  }

  return { onInstalled, onStartup, rehydrate };
}
