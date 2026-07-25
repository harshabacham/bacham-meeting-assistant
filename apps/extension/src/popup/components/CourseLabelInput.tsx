import React from 'react';

interface CourseLabelInputProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly id: string;
}

/**
 * Course/lecture label input field for session metadata.
 */
export function CourseLabelInput({ value, onChange, id }: CourseLabelInputProps): React.ReactElement {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-text-secondary">
        Course Label <span className="text-text-tertiary">(optional)</span>
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. CS101 — Lecture 12"
        maxLength={120}
        className={[
          'w-full px-3 py-2 text-sm bg-surface-2 border border-border-default rounded',
          'text-text-primary placeholder-text-tertiary',
          'focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple',
          'transition-colors duration-fast',
        ].join(' ')}
      />
    </div>
  );
}
