import React from 'react';

export type ButtonVariant = 'primary' | 'danger' | 'ghost' | 'outline' | 'secondary';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly onClick?: () => void;
  readonly type?: 'button' | 'submit' | 'reset';
  readonly 'aria-label'?: string;
  readonly id?: string;
  readonly className?: string;
  readonly children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--accent)] text-black border border-[var(--accent)] hover:bg-[#b8ff1a] hover:shadow-[0_0_20px_rgba(166,255,0,0.15)] focus-visible:ring-[var(--accent)]',
  secondary:
    'bg-[rgba(255,255,255,0.06)] text-white border border-[var(--border)] hover:bg-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)]',
  danger:
    'bg-[rgba(255,77,77,0.15)] text-[var(--destructive)] border border-[rgba(255,77,77,0.3)] hover:bg-[rgba(255,77,77,0.25)] focus-visible:ring-[var(--destructive)]',
  ghost:
    'bg-transparent text-[var(--muted-foreground)] border border-transparent hover:bg-[rgba(255,255,255,0.06)] hover:text-white',
  outline:
    'bg-transparent border border-[var(--border)] text-[var(--muted-foreground)] hover:border-white hover:text-white',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-[12px] rounded-md',
  md: 'px-4 py-2 text-[13px] rounded-lg',
  lg: 'px-5 py-2.5 text-[14px] rounded-xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  children,
  className = '',
  ...rest
}: ButtonProps): React.ReactElement {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={[
        'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
      {...rest}
    >
      {loading ? (
        <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
      ) : null}
      {children}
    </button>
  );
}
