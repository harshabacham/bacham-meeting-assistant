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
  name: 'BACHAM — AI Meeting & Lecture Capture',
  description: 'Privacy-first lecture and meeting capture. Records tab audio and slides, syncing with the local BACHAM desktop assistant.',
  version,
  minimum_chrome_version: '116',

  icons: {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },

  action: {
    default_icon: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
    default_title: 'BACHAM — Lecture Capture',
  },

  side_panel: {
    default_path: 'src/popup/index.html',
  },

  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },

  content_scripts: [
    {
      // Scoped to all HTTP/HTTPS pages: detects lecture/meeting tabs (Google Meet, Zoom, YouTube, Teams)
      // and monitors slide visual changes to trigger notes snapshots. Never accesses credentials or form data.
      matches: ['*://*/*'],
      js: ['src/content/index.tsx'],
      run_at: 'document_end',
    },
  ],

  permissions: [
    'storage',
    'unlimitedStorage',
    'tabCapture',
    'activeTab',
    'tabs',
    'alarms',
    'nativeMessaging',
    'offscreen',
    'sidePanel',
    'notifications',
  ],

  host_permissions: [
    'http://127.0.0.1/*',
    'http://localhost/*',
    'https://generativelanguage.googleapis.com/*',
  ],

  web_accessible_resources: [
    {
      resources: ['src/popup/index.html'],
      matches: ['<all_urls>'],
    }
  ],
});
