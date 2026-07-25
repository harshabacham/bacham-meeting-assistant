import React, { ReactNode } from 'react';
import { Loader2, Search } from 'lucide-react';
export * from './CommandPalette';
export * from './ui/animated-shiny-text';
export * from './ui/bento-grid';
export * from './ui/wave-loader';
export * from './ui/dropdown-menu';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' | 'ghost' }>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2",
          variant === 'default' && "bg-primary text-primary-foreground shadow hover:bg-primary/90",
          variant === 'outline' && "border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground",
          variant === 'ghost' && "hover:bg-accent hover:text-accent-foreground",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-md border border-border bg-card text-card-foreground shadow", className)}>
      {children}
    </div>
  );
}

export function Sidebar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <aside className={cn("flex flex-col w-64 border-r border-border bg-card h-full", className)}>
      {children}
    </aside>
  );
}

export function Topbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <header className={cn("h-14 border-b border-border bg-background flex items-center px-4 shrink-0", className)}>
      {children}
    </header>
  );
}

export function PageHeader({ title, description, className }: { title: string; description?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1 mb-6", className)}>
      <h1 className="text-3xl font-serif tracking-tight">{title}</h1>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-lg border border-dashed border-border bg-card/50">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-2xl font-serif tracking-tight">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
    </div>
  );
}

export function Loader({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin text-muted-foreground", className)} />;
}

export function StatusBadge({ status }: { status: 'disconnected' | 'connecting' | 'connected' | 'degraded' }) {
  const colors = {
    disconnected: 'bg-destructive/20 text-destructive',
    connecting: 'bg-yellow-500/20 text-yellow-600',
    connected: 'bg-green-500/20 text-green-600',
    degraded: 'bg-orange-500/20 text-orange-600'
  };
  return (
    <div className={cn("px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider", colors[status])}>
      {status}
    </div>
  );
}

export function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--glass-bg)] backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card shadow-lg flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-serif">{title}</h2>
          <Button variant="ghost" className="h-8 w-8 p-0" onClick={onClose}>x</Button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export function SearchBar({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input type="search" placeholder="Search..." className="pl-9" />
    </div>
  );
}

export function Toast({ message, visible }: { message: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-foreground text-background px-4 py-2 rounded-md shadow-lg text-sm font-medium">
      {message}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-border", className)} />;
}
