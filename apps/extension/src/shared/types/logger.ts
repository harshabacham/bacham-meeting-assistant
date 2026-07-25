/**
 * Log severity levels.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * A single structured log entry.
 */
export interface LogEntry {
  /** Unix timestamp (ms) when the log was created. */
  readonly timestamp: number;
  /** Module/service that produced the log. */
  readonly module: string;
  /** Severity level. */
  readonly level: LogLevel;
  /** Human-readable message. */
  readonly message: string;
  /** Optional structured data associated with this log entry. */
  readonly data?: Record<string, unknown>;
}
