import type { StorageSchema } from '@/shared/types';
import { DEFAULT_STORAGE } from '@/shared/types';
import type { Logger } from '@/infrastructure/logger/logger';

/** Keys of StorageSchema available for type-safe get/set. */
export type StorageKey = keyof StorageSchema;

/**
 * Typed wrapper over chrome.storage.local.
 *
 * All chrome.storage interactions in the codebase go through this service.
 * Keys are constrained to StorageSchema to prevent typos and shape drift.
 */
export interface StorageService {
  /**
   * Get one or more keys from storage.
   * Returns the default value for any key not yet persisted.
   */
  get<K extends StorageKey>(keys: K[]): Promise<Pick<StorageSchema, K>>;
  /**
   * Set one or more keys in storage.
   */
  set<K extends StorageKey>(data: Pick<StorageSchema, K>): Promise<void>;
  /**
   * Remove one or more keys from storage.
   */
  remove(keys: StorageKey[]): Promise<void>;
  /**
   * Run schema migrations if needed. Should be called once on service-worker startup.
   */
  migrate(): Promise<void>;
}

/** Factory — accepts logger for testability; avoids chrome.storage import at module level in tests. */
export function createStorageService(log: Logger): StorageService {
  const MODULE = 'StorageService';

  async function get<K extends StorageKey>(
    keys: K[],
  ): Promise<Pick<StorageSchema, K>> {
    // Build defaults for requested keys
    const defaults: Partial<StorageSchema> = {};
    for (const key of keys) {
      // Cast is safe: we're building a partial from a well-typed source
      (defaults as Record<string, unknown>)[key] = DEFAULT_STORAGE[key];
    }

    const result = await chrome.storage.local.get(keys);
    log.debug(MODULE, 'get', { keys, result });

    // Merge with defaults to fill in any missing keys
    return { ...defaults, ...result } as Pick<StorageSchema, K>;
  }

  async function set<K extends StorageKey>(
    data: Pick<StorageSchema, K>,
  ): Promise<void> {
    log.debug(MODULE, 'set', { keys: Object.keys(data) });
    await chrome.storage.local.set(data);
  }

  async function remove(keys: StorageKey[]): Promise<void> {
    log.debug(MODULE, 'remove', { keys });
    await chrome.storage.local.remove(keys);
  }

  async function migrate(): Promise<void> {
    const stored = await chrome.storage.local.get('schemaVersion');
    const currentVersion = (stored as Partial<StorageSchema>).schemaVersion;

    if (currentVersion === undefined) {
      // Fresh install — write defaults
      log.info(MODULE, 'Fresh install detected — writing default storage schema');
      await chrome.storage.local.set(DEFAULT_STORAGE);
      return;
    }

    if (currentVersion === DEFAULT_STORAGE.schemaVersion) {
      log.debug(MODULE, 'Schema is up to date', { version: currentVersion });
      return;
    }

    // Import and run migrations
    const { runMigrations } = await import('./migrations');
    await runMigrations(currentVersion, log);
  }

  return { get, set, remove, migrate };
}
