import type { Session, CaptureConfig } from './index';

/**
 * Current schema version. Increment when the shape of StorageSchema changes.
 * The migrations.ts file handles upgrading from older versions.
 */
export const CURRENT_SCHEMA_VERSION = 1 as const;

/**
 * The complete shape of everything persisted to chrome.storage.local.
 * This is the single source of truth for storage — nothing is stored outside this schema.
 */
export interface StorageSchema {
  /**
   * Schema version — used by the migration system.
   * Must always be the first field checked on read.
   */
  schemaVersion: typeof CURRENT_SCHEMA_VERSION;

  /** Currently active or most recently completed session. Null when no session exists. */
  currentSession: Session | null;

  /** User's preferred capture configuration. */
  captureConfig: CaptureConfig;

  /**
   * ID of the stream obtained from chrome.tabCapture.getMediaStreamId.
   * Stored so that if the service worker restarts mid-session we can detect
   * stream loss and transition to 'error' rather than silently corrupting state.
   */
  activeStreamId: string | null;

  /** Connection status to the Desktop Application. */
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'degraded';

  /** Number of messages in the local outbound queue. */
  pendingQueueSize: number;
}

/**
 * Default values used when initialising storage for the first time,
 * or when a key is missing from an older schema version.
 */
export const DEFAULT_STORAGE: StorageSchema = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  currentSession: null,
  captureConfig: {
    audio: true,
    video: false,
  },
  activeStreamId: null,
  connectionStatus: 'disconnected',
  pendingQueueSize: 0,
};
