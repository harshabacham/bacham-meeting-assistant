import type { StorageService } from '@/infrastructure/storage/storageService';
import type { ScreenshotService } from '@/features/capture/screenshotService';
import type { NativeMessagingClient } from '@/infrastructure/communication/nativeMessagingClient';
import type { Logger } from '@/infrastructure/logger/logger';
import { HEARTBEAT_ALARM_NAME } from '@/shared/constants/app';

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
  _storage: StorageService,
  _screenshotService: ScreenshotService,
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



      default:
        log.warn(MODULE, 'Unknown alarm fired', { name: alarm.name });
    }
  }

  return { onAlarm };
}
