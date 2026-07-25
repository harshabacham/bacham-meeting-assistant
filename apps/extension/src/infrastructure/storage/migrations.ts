import type { StorageSchema } from '@/shared/types';
import { DEFAULT_STORAGE, CURRENT_SCHEMA_VERSION } from '@/shared/types';
import type { Logger } from '@/infrastructure/logger/logger';

type OldSchemaVersion = number;

/**
 * Migration function signature.
 * Each migration receives raw stored data, mutates it in place, and must
 * update schemaVersion to the version it migrates TO.
 */
type MigrationFn = (
  data: Record<string, unknown>,
  log: Logger,
) => Promise<void>;

/**
 * Registry of migrations keyed by the version they migrate FROM.
 * To add a migration from v1 → v2:
 *   1. Increment CURRENT_SCHEMA_VERSION in storage.ts
 *   2. Add an entry here: MIGRATIONS[1] = async (data, log) => { ... }
 */
const MIGRATIONS: Record<OldSchemaVersion, MigrationFn> = {
  // v0 → v1: initial schema — just write defaults for any missing keys
  0: async (data, log) => {
    log.info('Migrations', 'Running v0 → v1 migration');
    // Fill in any keys that are absent with defaults
    for (const [key, value] of Object.entries(DEFAULT_STORAGE)) {
      if (!(key in data)) {
        data[key] = value;
      }
    }
    data['schemaVersion'] = 1;
  },
};

/**
 * Run all pending migrations from `fromVersion` up to CURRENT_SCHEMA_VERSION.
 * Writes the fully migrated data back to chrome.storage.local.
 */
export async function runMigrations(
  fromVersion: OldSchemaVersion,
  log: Logger,
): Promise<void> {
  const MODULE = 'Migrations';
  log.info(MODULE, 'Starting migrations', {
    from: fromVersion,
    to: CURRENT_SCHEMA_VERSION,
  });

  const allData = await chrome.storage.local.get(null);
  const data: Record<string, unknown> = { ...allData };

  let version = fromVersion;
  while (version < CURRENT_SCHEMA_VERSION) {
    const migration = MIGRATIONS[version];
    if (!migration) {
      log.error(MODULE, `No migration found from version ${version}`, { version });
      throw new Error(`Missing migration for schema version ${version}`);
    }
    await migration(data, log);
    version++;
  }

  // Type assertion: after all migrations run, data must match StorageSchema
  await chrome.storage.local.set(data as unknown as StorageSchema);
  log.info(MODULE, 'Migrations complete', { finalVersion: CURRENT_SCHEMA_VERSION });
}
