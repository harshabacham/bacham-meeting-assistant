import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStorageService } from '@/infrastructure/storage/storageService';
import { DEFAULT_STORAGE, CURRENT_SCHEMA_VERSION } from '@/shared/types';
import type { StorageSchema } from '@/shared/types';
import { chromeMock } from '../../setup';

const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

describe('StorageService', () => {
  let storage: ReturnType<typeof createStorageService>;

  beforeEach(() => {
    storage = createStorageService(mockLogger);
  });

  describe('get', () => {
    it('returns stored values merged with defaults', async () => {
      const storedSession = {
        id: 'abc',
        startedAt: '2024-01-01T00:00:00.000Z',
        tabId: 1,
        tabTitle: 'Test',
        tabUrl: 'https://example.com',
        state: 'recording' as const,
        pausedDurationMs: 0,
      };
      chromeMock.storage.local.get.mockResolvedValue({
        currentSession: storedSession,
      });

      const result = await storage.get(['currentSession', 'captureConfig']);

      expect(result.currentSession).toEqual(storedSession);
      // captureConfig not in storage — falls back to default
      expect(result.captureConfig).toEqual(DEFAULT_STORAGE.captureConfig);
    });

    it('returns full defaults when storage is empty', async () => {
      chromeMock.storage.local.get.mockResolvedValue({});

      const result = await storage.get(['captureConfig', 'connectionStatus']);

      expect(result.captureConfig).toEqual(DEFAULT_STORAGE.captureConfig);
      expect(result.connectionStatus).toBe(DEFAULT_STORAGE.connectionStatus);
    });
  });

  describe('set', () => {
    it('calls chrome.storage.local.set with provided data', async () => {
      const data: Pick<StorageSchema, 'connectionStatus'> = { connectionStatus: 'connected' };
      await storage.set(data);

      expect(chromeMock.storage.local.set).toHaveBeenCalledWith(data);
    });
  });

  describe('remove', () => {
    it('calls chrome.storage.local.remove with provided keys', async () => {
      await storage.remove(['currentSession']);
      expect(chromeMock.storage.local.remove).toHaveBeenCalledWith(['currentSession']);
    });
  });

  describe('migrate', () => {
    it('writes defaults on fresh install (no schemaVersion)', async () => {
      chromeMock.storage.local.get.mockResolvedValue({});

      await storage.migrate();

      expect(chromeMock.storage.local.set).toHaveBeenCalledWith(DEFAULT_STORAGE);
    });

    it('does nothing when schema is current', async () => {
      chromeMock.storage.local.get.mockResolvedValue({
        schemaVersion: CURRENT_SCHEMA_VERSION,
      });

      await storage.migrate();

      expect(chromeMock.storage.local.set).not.toHaveBeenCalled();
    });

    it('runs migration when schema is outdated (v0 → v1)', async () => {
      // Simulate old storage with no schemaVersion (treated as version 0 by migrations)
      chromeMock.storage.local.get
        // First call: schemaVersion check
        .mockResolvedValueOnce({ schemaVersion: 0 })
        // Second call: get all data in runMigrations
        .mockResolvedValueOnce({});

      await storage.migrate();

      // Migration should have written data with schemaVersion = 1
      expect(chromeMock.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({ schemaVersion: CURRENT_SCHEMA_VERSION }),
      );
    });
  });
});
