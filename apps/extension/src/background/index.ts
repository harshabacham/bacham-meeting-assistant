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
import { createWebSocketClient } from '@/infrastructure/communication/webSocketClient';
import { createPermissionService } from '@/features/permissions/permissionService';
import { createSessionService } from '@/features/session/sessionService';
import { createScreenshotService } from '@/features/capture/screenshotService';
import { createMetadataService } from '@/features/metadata/metadataService';
import { createReconciliationService } from '@/features/sync/reconciliationService';
import { createLifecycleHandler } from './handlers/lifecycleHandler';
import { createAlarmHandler } from './handlers/alarmHandler';
import { createMessageHandler } from './handlers/messageHandler';

const MODULE = 'BackgroundSW';

// ---------------------------------------------------------------------------
// Instantiate services — these are module-level but depend on chrome.* APIs
// that are available in a service worker context.
// ---------------------------------------------------------------------------

const storage = createStorageService(logger);
const messagingClient = createWebSocketClient(logger);
const permissionService = createPermissionService(logger);
const sessionService = createSessionService(storage, logger);
const metadataService = createMetadataService(messagingClient, logger);
const screenshotService = createScreenshotService(messagingClient, sessionService, metadataService, logger);
const reconciliationService = createReconciliationService(messagingClient, logger);

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
  reconciliationService,
  logger,
);

const messageHandler = createMessageHandler(
  storage,
  sessionService,
  permissionService,
  metadataService,
  messagingClient,
  screenshotService,
  reconciliationService,
  logger,
);

// ---------------------------------------------------------------------------
// Register Chrome event listeners
// ---------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener((details) => {
  logger.info(MODULE, 'onInstalled', { reason: details.reason });
  
  // Enable opening the side panel when clicking the extension icon
  if (chrome.sidePanel) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
      logger.error(MODULE, 'Failed to set side panel behavior', { err });
    });
  }
  
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

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const currentUrl = changeInfo.url || tab.url;
  if (currentUrl && currentUrl.includes('bacham_record=true')) {
    logger.info(MODULE, 'Desktop trigger URL detected, redirecting to extension page for user gesture', { url: currentUrl });
    chrome.tabs.update(tabId, { url: chrome.runtime.getURL('src/popup/index.html') });
    return;
  }

  if (changeInfo.status === 'complete' && tab.url) {

    if (
      tab.url.includes('meet.google.com') || 
      tab.url.includes('zoom.us/wc') ||
      tab.url.includes('teams.microsoft.com') ||
      tab.url.includes('webex.com')
    ) {
      logger.info(MODULE, 'Meeting tab detected, auto-starting recording', { url: tab.url });
      messagingClient.connect();
      messagingClient.send({ 
        version: '1.0', 
        type: 'START_AUTO_RECORD' as any, 
        timestamp: Date.now(), 
        payload: {} 
      });
      
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Meeting Auto-Record',
        message: 'Auto-recording started for this meeting.',
      });
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  sessionService.loadSession().then((session) => {
    if (session && session.tabId === tabId && session.state !== 'idle') {
      logger.info(MODULE, 'Meeting tab closed, auto-stopping session', { tabId });
      // Synthesize a STOP_SESSION message to gracefully tear down capture
      void messageHandler.onMessage({ type: 'STOP_SESSION' }, {}, () => {});
    }
  }).catch(err => {
    logger.error(MODULE, 'Error in tabs.onRemoved handler', { err });
  });
});

// ---------------------------------------------------------------------------
// Rehydrate on every service-worker wake
// This runs synchronously at module evaluation time — once per wake.
// ---------------------------------------------------------------------------

logger.info(MODULE, 'Service worker woke up — running rehydration');
void lifecycleHandler.rehydrate();

// Attempt to connect to Desktop App on every wake
messagingClient.connect();

// Automatically trigger reconciliation whenever the Desktop App connects
messagingClient.onConnect?.(() => {
  logger.info(MODULE, 'Desktop App connected — running reconciliation for offline recordings');
  void reconciliationService.reconcile();
});

// Also attempt reconciliation on wake in case desktop is already online
void reconciliationService.reconcile();

messagingClient.onMessage((msg) => {
  if (msg.type === 'OPEN_RECORD_POPUP') {
    logger.info(MODULE, 'Received OPEN_RECORD_POPUP from Desktop App, opening extension UI');
    chrome.tabs.create({ url: chrome.runtime.getURL('src/popup/index.html') });
  }
});

// Forward specific backend messages to the active tab's content script
messagingClient.onMessage((msg) => {
  if (msg.type === 'TRANSCRIPT_SEGMENT' || msg.type === 'INTERVIEW_INSIGHT') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, msg).catch((err) => {
          logger.warn(MODULE, `Failed to forward ${msg.type} to content script`, { err });
        });
      }
    });
  }
});

logger.info(MODULE, 'Service worker initialised');
