import { defineManifest } from '@crxjs/vite-plugin';
import packageJson from './package.json';

const { version } = packageJson;

/**
 * Chrome Extension Manifest V3 configuration for BACHAM.
 *
 * Permission justifications:
 * - storage:         Persisting session state, capture config, and connection status across service-worker restarts.
 * - tabCapture:      Core capture — capturing audio/video stream from the active browser tab.
 * - activeTab:       Required for chrome.tabs.captureVisibleTab (screenshots) and gesture-scoped tab access.
 * - tabs:            Reading tab title/URL for ongoing session metadata while recording (activeTab alone is gesture-scoped).
 * - alarms:          Driving screenshot interval and native messaging heartbeat that survive service-worker sleep/restart.
 * - nativeMessaging: Forwarding captured data to the companion Desktop Application.
 *
 * host_permissions: none. Content script metadata scraping reads only document.title, window.location,
 * and visible platform indicators — no host permission is needed for this.
 */
export default defineManifest({
  manifest_version: 3,
  name: 'BACHAM',
  description: 'Local-first lecture capture engine. Captures browser tab audio, video, and screenshots and forwards them to the BACHAM Desktop Application.',
  version,
  minimum_chrome_version: '116',

  icons: {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },

  action: {
    default_popup: 'src/popup/index.html',
    default_icon: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
    default_title: 'BACHAM — Lecture Capture',
  },

  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },

  content_scripts: [
    {
      // Scoped to all HTTP/HTTPS pages: the user can start recording on any tab.
      // The content script only reads document.title, window.location, and
      // detects known lecture platforms (Zoom/Meet/YouTube) — never page content.
      matches: ['*://*/*'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],

  permissions: [
    'storage',
    'tabCapture',
    'activeTab',
    'tabs',
    'alarms',
    'nativeMessaging',
    'offscreen',
  ],

  // No host_permissions — the content script reads only browser-visible
  // document properties that don't require host access grants.
  host_permissions: [],
});
