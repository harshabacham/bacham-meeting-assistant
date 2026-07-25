import React from 'react';
import type { ConnectionStatus } from '@/shared/types';

interface StatusDotProps {
  readonly status: ConnectionStatus | 'recording' | 'paused' | 'idle' | 'error';
  readonly size?: 'sm' | 'md';
  readonly 'aria-label'?: string;
}

const colorClasses: Record<string, string> = {
  connected: 'bg-status-connected',
  recording: 'bg-status-recording animate-pulse-record',
  paused: 'bg-status-paused',
  disconnected: 'bg-status-disconnected',
  degraded: 'bg-status-degraded',
  idle: 'bg-status-disconnected',
  error: 'bg-accent-red',
  connecting: 'bg-accent-amber animate-pulse',
};

const sizeClasses = {
  sm: 'h-1.5 w-1.5',
  md: 'h-2 w-2',
};

/**
 * Small circular status indicator dot.
 */
export function StatusDot({ status, size = 'sm', ...rest }: StatusDotProps): React.ReactElement {
  return (
    <span
      role="img"
      aria-label={rest['aria-label'] ?? status}
      className={[
        'inline-block rounded-full flex-shrink-0',
        colorClasses[status] ?? colorClasses['idle'],
        sizeClasses[size],
      ].join(' ')}
    />
  );
}
