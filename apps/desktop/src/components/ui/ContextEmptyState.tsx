import React from 'react';
import { cn } from '@/components';

interface ContextEmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  className?: string;
}

export function ContextEmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: ContextEmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto my-12 space-y-5 animate-in fade-in zoom-in-95 duration-200", className)}>
      <div className="w-16 h-16 rounded-2xl bg-surface-raised border border-border/60 flex items-center justify-center text-2xl shadow-sm text-primary">
        {icon}
      </div>
      
      <div className="space-y-1.5">
        <h3 className="text-lg font-bold text-foreground tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>

      {(primaryAction || secondaryAction) && (
        <div className="flex items-center gap-3 pt-2 flex-wrap justify-center">
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all shadow-md active:scale-95"
            >
              {primaryAction.icon}
              <span>{primaryAction.label}</span>
            </button>
          )}

          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface hover:bg-surface-hover border border-border/60 text-foreground text-xs font-semibold transition-all active:scale-95"
            >
              {secondaryAction.icon}
              <span>{secondaryAction.label}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
