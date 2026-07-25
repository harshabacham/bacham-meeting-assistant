import React, { useState, useId } from 'react';

interface TooltipProps {
  readonly content: string;
  readonly children: React.ReactElement;
  readonly side?: 'top' | 'bottom' | 'left' | 'right';
}

const sideClasses = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
  left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
  right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
};

/**
 * Lightweight tooltip using CSS hover — no portals, no floating-ui.
 * Suitable for the extension popup context.
 */
export function Tooltip({ content, children, side = 'top' }: TooltipProps): React.ReactElement {
  const [visible, setVisible] = useState(false);
  const tooltipId = useId();

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {React.cloneElement(
        children as React.ReactElement<{ 'aria-describedby'?: string }>,
        visible ? { 'aria-describedby': tooltipId } : {},
      )}
      {visible ? (
        <span
          id={tooltipId}
          role="tooltip"
          className={[
            'absolute z-50 px-2 py-1 text-2xs text-text-primary bg-surface-3 border border-border-default',
            'rounded shadow-panel whitespace-nowrap pointer-events-none animate-fade-in',
            sideClasses[side],
          ].join(' ')}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
