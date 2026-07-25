/**
 * Messaging and native communication constants.
 */

/** Heartbeat interval in milliseconds (1 minute). */
export const HEARTBEAT_INTERVAL_MS = 60_000 as const;

/** Heartbeat timeout — if no ACK received within this period, mark as degraded. */
export const HEARTBEAT_TIMEOUT_MS = 30_000 as const;

/** Reconnect base delay in milliseconds for exponential backoff (1 second). */
export const RECONNECT_BASE_DELAY_MS = 1_000 as const;

/** Maximum reconnect delay in milliseconds (60 seconds). */
export const RECONNECT_MAX_DELAY_MS = 60_000 as const;

/** Maximum number of reconnection attempts before giving up. */
export const RECONNECT_MAX_ATTEMPTS = 10 as const;
