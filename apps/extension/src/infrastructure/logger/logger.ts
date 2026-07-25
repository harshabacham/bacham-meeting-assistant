import type { LogEntry, LogLevel } from '@/shared/types';

/**
 * Structured logger for the BACHAM extension.
 *
 * All logging in the codebase routes through this module — no bare console.log calls.
 * In production builds, debug-level logs are suppressed.
 *
 * Usage:
 *   import { logger } from '@/infrastructure/logger/logger';
 *   logger.info('SessionService', 'Session started', { sessionId: id });
 */

// Vite replaces import.meta.env.DEV at build time; the cast is safe.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const IS_DEV = (import.meta as any).env?.DEV === true;

const LEVEL_RANKS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL: LogLevel = IS_DEV ? 'debug' : 'info';

/** Format a log entry for console output. */
function formatEntry(entry: LogEntry): string {
  const ts = new Date(entry.timestamp).toISOString();
  return `[BACHAM:${entry.module}] ${ts} ${entry.level.toUpperCase()} — ${entry.message}`;
}

/** Emit a log entry to the appropriate console method. */
function emit(entry: LogEntry): void {
  if (LEVEL_RANKS[entry.level] < LEVEL_RANKS[MIN_LEVEL]) return;

  const formatted = formatEntry(entry);

  switch (entry.level) {
    case 'debug':
      // eslint-disable-next-line no-console
      console.debug(formatted, entry.data ?? '');
      break;
    case 'info':
      // eslint-disable-next-line no-console
      console.info(formatted, entry.data ?? '');
      break;
    case 'warn':
      // eslint-disable-next-line no-console
      console.warn(formatted, entry.data ?? '');
      break;
    case 'error':
      // eslint-disable-next-line no-console
      console.error(formatted, entry.data ?? '');
      break;
  }
}

/** Create a LogEntry and emit it. */
function log(
  level: LogLevel,
  module: string,
  message: string,
  data?: Record<string, unknown>,
): void {
  const entry: LogEntry = {
    timestamp: Date.now(),
    module,
    level,
    message,
    ...(data !== undefined ? { data } : {}),
  };
  emit(entry);
}

/**
 * The BACHAM logger singleton.
 * All services receive this as a dependency, enabling test-time substitution.
 */
export const logger = {
  /** Log at debug level — suppressed in production. */
  debug: (module: string, message: string, data?: Record<string, unknown>): void =>
    log('debug', module, message, data),
  /** Log at info level. */
  info: (module: string, message: string, data?: Record<string, unknown>): void =>
    log('info', module, message, data),
  /** Log at warn level. */
  warn: (module: string, message: string, data?: Record<string, unknown>): void =>
    log('warn', module, message, data),
  /** Log at error level. */
  error: (module: string, message: string, data?: Record<string, unknown>): void =>
    log('error', module, message, data),
} as const;

/** Logger interface for dependency injection in services. */
export type Logger = typeof logger;
