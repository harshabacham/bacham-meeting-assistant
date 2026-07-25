import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock } from 'lucide-react';

interface SmartHoverPreviewProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  details?: string;
  duration?: string;
  tags?: string[];
  disabled?: boolean;
}

export function SmartHoverPreview({
  children,
  title,
  subtitle,
  details,
  duration,
  tags = [],
  disabled = false,
}: SmartHoverPreviewProps) {
  const [isHovered, setIsHovered] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 180);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsHovered(false);
  };

  return (
    <div
      className="relative inline-block w-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-surface/95 backdrop-blur-xl border border-border/80 rounded-xl shadow-2xl pointer-events-none text-xs space-y-2"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-1.5">
              <span className="font-bold text-foreground truncate">{title}</span>
              {duration && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono shrink-0">
                  <Clock size={10} /> {duration}
                </span>
              )}
            </div>

            {subtitle && (
              <p className="text-[11px] font-semibold text-primary">{subtitle}</p>
            )}

            {details && (
              <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
                {details}
              </p>
            )}

            {tags.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap pt-1">
                {tags.slice(0, 3).map((tag, i) => (
                  <span
                    key={i}
                    className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
