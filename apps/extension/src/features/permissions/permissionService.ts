import type { PermissionStatus, PermissionGrantState } from '@/shared/types';
import type { Logger } from '@/infrastructure/logger/logger';

/**
 * Permission Service
 *
 * Checks and requests Chrome permissions required by the extension.
 * Does NOT call chrome.permissions directly elsewhere — this is the sole owner.
 */

export interface PermissionService {
  /** Get the current permission status for all extension-required permissions. */
  getStatus(): Promise<PermissionStatus>;
  /** Request any missing permissions. Returns true if all are now granted. */
  requestAll(): Promise<boolean>;
}

/** Factory — injectable logger for testability. */
export function createPermissionService(log: Logger): PermissionService {
  const MODULE = 'PermissionService';

  async function checkPermission(name: string): Promise<PermissionGrantState> {
    return new Promise((resolve) => {
      chrome.permissions.contains({ permissions: [name] }, (granted) => {
        if (chrome.runtime.lastError) {
          log.warn(MODULE, 'Error checking permission', {
            name,
            error: chrome.runtime.lastError.message,
          });
          resolve('denied');
          return;
        }
        resolve(granted ? 'granted' : 'prompt');
      });
    });
  }

  async function getStatus(): Promise<PermissionStatus> {
    const [tabCapture, storage] = await Promise.all([
      checkPermission('tabCapture'),
      checkPermission('storage'),
    ]);

    const allGranted = tabCapture === 'granted' && storage === 'granted';

    const status: PermissionStatus = { tabCapture, storage, allGranted };
    log.debug(MODULE, 'Permission status', { status });
    return status;
  }

  async function requestAll(): Promise<boolean> {
    return new Promise((resolve) => {
      chrome.permissions.request(
        { permissions: ['tabCapture', 'storage', 'tabs', 'alarms', 'nativeMessaging'] },
        (granted) => {
          if (chrome.runtime.lastError) {
            log.error(MODULE, 'Error requesting permissions', {
              error: chrome.runtime.lastError.message,
            });
            resolve(false);
            return;
          }
          log.info(MODULE, 'Permission request result', { granted });
          resolve(granted);
        },
      );
    });
  }

  return { getStatus, requestAll };
}
