import React from 'react';
import type { ConnectionStatus } from '@/shared/types';
import { Badge } from '@/shared/components/Badge';
import { StatusDot } from '@/shared/components/StatusDot';

interface ConnectionStatusBadgeProps {
  readonly status: ConnectionStatus;
  readonly pendingQueueSize?: number;
}

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  connected: 'Desktop App Connected',
  connecting: 'Connecting…',
  disconnected: 'Desktop App Not Found',
  degraded: 'Connection Degraded',
};

const STATUS_VARIANTS: Record<ConnectionStatus, 'connected' | 'disconnected' | 'degraded' | 'default'> = {
  connected: 'connected',
  connecting: 'default',
  disconnected: 'disconnected',
  degraded: 'degraded',
};

/**
 * Shows the current native messaging connection status with optional queue indicator.
 */
export function ConnectionStatusBadge({
  status,
  pendingQueueSize = 0,
}: ConnectionStatusBadgeProps): React.ReactElement {
  return (
    <div className="flex items-center gap-2">
      <Badge variant={STATUS_VARIANTS[status]}>
        <StatusDot status={status} />
        {STATUS_LABELS[status]}
      </Badge>
      {pendingQueueSize > 0 ? (
        <span
          className="text-2xs text-accent-amber"
          aria-label={`${pendingQueueSize} messages queued`}
        >
          {pendingQueueSize} queued
        </span>
      ) : null}
    </div>
  );
}
