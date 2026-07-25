import React from 'react';

export type BadgeVariant = 'default' | 'recording' | 'paused' | 'connected' | 'disconnected' | 'degraded' | 'error';

interface BadgeProps {
  readonly variant?: BadgeVariant;
  readonly children: React.ReactNode;
  readonly className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-surface-3 text-text-secondary border-border-default',
  recording: 'bg-accent-red-subtle text-accent-red border-accent-red/30 animate-pulse-record',
  paused: 'bg-accent-amber-subtle text-accent-amber border-accent-amber/30',
  connected: 'bg-accent-green-subtle text-accent-green border-accent-green/30',
  disconnected: 'bg-surface-3 text-text-tertiary border-border-subtle',
  degraded: 'bg-accent-amber-subtle text-accent-amber border-accent-amber/30',
  error: 'bg-accent-red-subtle text-accent-red border-accent-red/30',
};

/**
 * Small status badge with semantic color variants.
 */
export function Badge({ variant = 'default', children, className = '' }: BadgeProps): React.ReactElement {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2 py-0.5 text-2xs font-medium rounded-sm border',
        variantClasses[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}
