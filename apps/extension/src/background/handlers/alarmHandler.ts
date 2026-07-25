import type { StorageService } from '@/infrastructure/storage/storageService';
import type { ScreenshotService } from '@/features/capture/screenshotService';
import type { NativeMessagingClient } from '@/infrastructure/communication/nativeMessagingClient';
import type { Logger } from '@/infrastructure/logger/logger';
import { HEARTBEAT_ALARM_NAME, SCREENSHOT_ALARM_NAME } from '@/shared/constants/app';

/**
 * Alarm Handler
 *
 * Routes chrome.alarms.onAlarm events to the appropriate service.
 * Using alarms instead of setInterval ensures timers survive service-worker restarts.
 */

export interface AlarmHandler {
  onAlarm(alarm: chrome.alarms.Alarm): Promise<void>;
}

export function createAlarmHandler(
  storage: StorageService,
  screenshotService: ScreenshotService,
  messagingClient: NativeMessagingClient,
  log: Logger,
): AlarmHandler {
  const MODULE = 'AlarmHandler';

  async function onAlarm(alarm: chrome.alarms.Alarm): Promise<void> {
    log.debug(MODULE, 'Alarm fired', { name: alarm.name });

    switch (alarm.name) {
      case HEARTBEAT_ALARM_NAME: {
        messagingClient.onHeartbeatAlarm();
        break;
      }

      case SCREENSHOT_ALARM_NAME: {
        const { currentSession } = await storage.get(['currentSession']);
        if (!currentSession || currentSession.state !== 'recording') {
          log.debug(MODULE, 'Screenshot alarm fired but no active recording — clearing alarm');
          await chrome.alarms.clear(SCREENSHOT_ALARM_NAME);
          return;
        }
        await screenshotService.takeScreenshot(currentSession.id);
        break;
      }

      default:
        log.warn(MODULE, 'Unknown alarm fired', { name: alarm.name });
    }
  }

  return { onAlarm };
}
