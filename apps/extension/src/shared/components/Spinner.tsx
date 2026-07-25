import React from 'react';

interface SpinnerProps {
  readonly size?: 'sm' | 'md' | 'lg';
  readonly className?: string;
  readonly 'aria-label'?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-[3px]',
};

/**
 * Accessible loading spinner.
 */
export function Spinner({ size = 'md', className = '', ...rest }: SpinnerProps): React.ReactElement {
  return (
    <span
      role="status"
      aria-label={rest['aria-label'] ?? 'Loading'}
      className={[
        'inline-block animate-spin-slow rounded-full border-border-strong border-t-accent-purple',
        sizeClasses[size],
        className,
      ].join(' ')}
    />
  );
}
