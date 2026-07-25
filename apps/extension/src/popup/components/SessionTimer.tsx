import React, { useState, useEffect } from 'react';

interface SessionTimerProps {
  /** ISO 8601 string of when the session started. */
  readonly startedAt: string;
  /** Accumulated paused duration in milliseconds. */
  readonly pausedDurationMs: number;
  /** Whether the timer is currently paused. */
  readonly isPaused: boolean;
}

/** Format elapsed milliseconds as HH:MM:SS. */
function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number): string => String(n).padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Live session elapsed time display.
 * Updates every second when recording, stops updating when paused.
 */
export function SessionTimer({ startedAt, pausedDurationMs, isPaused }: SessionTimerProps): React.ReactElement {
  const getElapsed = (): number => {
    const base = Date.now() - new Date(startedAt).getTime() - pausedDurationMs;
    return Math.max(0, base);
  };

  const [elapsed, setElapsed] = useState(getElapsed);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setElapsed(getElapsed());
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused, startedAt, pausedDurationMs]);

  return (
    <time
      dateTime={`PT${Math.floor(elapsed / 1000)}S`}
      className="font-mono text-2xl font-medium text-text-primary tabular-nums tracking-tight"
      aria-label={`Recording time: ${formatElapsed(elapsed)}`}
    >
      {formatElapsed(elapsed)}
    </time>
  );
}
