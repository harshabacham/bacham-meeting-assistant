/**
 * Vitest global test setup.
 * Provides chrome.* API mocks for all test files.
 */
/// <reference types="vitest/globals" />
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// Chrome API mocks
// ---------------------------------------------------------------------------

const chromeMock = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    },
  },
  runtime: {
    lastError: undefined as chrome.runtime.LastError | undefined,
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    connectNative: vi.fn(),
    getManifest: vi.fn(() => ({ version: '0.1.0' })),
    id: 'test-extension-id',
  },
  permissions: {
    contains: vi.fn(),
    request: vi.fn(),
  },
  alarms: {
    create: vi.fn(),
    clear: vi.fn(),
    get: vi.fn(),
    onAlarm: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(),
    get: vi.fn(),
    captureVisibleTab: vi.fn(),
    sendMessage: vi.fn(),
  },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
    setIcon: vi.fn(),
    openPopup: vi.fn(),
  },
  tabCapture: {
    getMediaStreamId: vi.fn(),
  },
};

// Assign to global so imports of chrome.* in source code resolve
(globalThis as Record<string, unknown>)['chrome'] = chromeMock;

// Reset all mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
  // Default implementations
  chromeMock.storage.local.get.mockResolvedValue({});
  chromeMock.storage.local.set.mockResolvedValue(undefined);
  chromeMock.storage.local.remove.mockResolvedValue(undefined);
  chromeMock.runtime.lastError = undefined;
  chromeMock.alarms.create.mockResolvedValue(undefined);
  chromeMock.alarms.clear.mockResolvedValue(true);
  chromeMock.action.setBadgeText.mockResolvedValue(undefined);
  chromeMock.action.setBadgeBackgroundColor.mockResolvedValue(undefined);
  chromeMock.action.setIcon.mockResolvedValue(undefined);
});

export { chromeMock };
