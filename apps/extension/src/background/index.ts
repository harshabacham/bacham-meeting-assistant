/**
 * BACHAM Background Service Worker Entry Point
 *
 * This is the orchestration layer. It:
 * 1. Instantiates all infrastructure services (with injected dependencies)
 * 2. Instantiates all feature services
 * 3. Registers all chrome event listeners
 * 4. Rehydrates state from storage on every wake-up
 *
 * IMPORTANT — MV3 service worker lifecycle:
 * The service worker can be killed at any time. All persistent state lives
 * in chrome.storage.local, not in module-level variables. The rehydrate()
 * call at the top of this file runs on every wake to restore in-memory state.
 */

import { logger } from '@/infrastructure/logger/logger';
import { createStorageService } from '@/infrastructure/storage/storageService';
import { createNativeMessagingClient } from '@/infrastructure/communication/nativeMessagingClient';
import { createPermissionService } from '@/features/permissions/permissionService';
import { createSessionService } from '@/features/session/sessionService';
import { createScreenshotService } from '@/features/capture/screenshotService';
import { createMetadataService } from '@/features/metadata/metadataService';
import { createLifecycleHandler } from './handlers/lifecycleHandler';
import { createAlarmHandler } from './handlers/alarmHandler';
import { createMessageHandler } from './handlers/messageHandler';

const MODULE = 'BackgroundSW';

// ---------------------------------------------------------------------------
// Instantiate services — these are module-level but depend on chrome.* APIs
// that are available in a service worker context.
// ---------------------------------------------------------------------------

const storage = createStorageService(logger);
const messagingClient = createNativeMessagingClient(logger);
const permissionService = createPermissionService(logger);
const sessionService = createSessionService(storage, logger);
const metadataService = createMetadataService(messagingClient, logger);
const screenshotService = createScreenshotService(messagingClient, sessionService, metadataService, logger);

const lifecycleHandler = createLifecycleHandler(
  storage,
  sessionService,
  messagingClient,
  logger,
);

const alarmHandler = createAlarmHandler(
  storage,
  screenshotService,
  messagingClient,
  logger,
);

const messageHandler = createMessageHandler(
  storage,
  sessionService,
  permissionService,
  metadataService,
  messagingClient,
  screenshotService,
  logger,
);

// ---------------------------------------------------------------------------
// Register Chrome event listeners
// ---------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener((details) => {
  logger.info(MODULE, 'onInstalled', { reason: details.reason });
  void lifecycleHandler.onInstalled(details);
});

chrome.runtime.onStartup.addListener(() => {
  logger.info(MODULE, 'onStartup');
  void lifecycleHandler.onStartup();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  void alarmHandler.onAlarm(alarm);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  return messageHandler.onMessage(message, sender, sendResponse);
});

// ---------------------------------------------------------------------------
// Rehydrate on every service-worker wake
// This runs synchronously at module evaluation time — once per wake.
// ---------------------------------------------------------------------------

logger.info(MODULE, 'Service worker woke up — running rehydration');
void lifecycleHandler.rehydrate();

// Attempt to connect to Desktop App on every wake
messagingClient.connect();

logger.info(MODULE, 'Service worker initialised');
