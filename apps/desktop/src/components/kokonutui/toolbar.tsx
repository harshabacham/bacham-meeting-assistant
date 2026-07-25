"use client";

/**
 * @author: @dorianbaffier
 * @description: Toolbar
 * @version: 1.0.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import { type LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";
import { cn } from "@/shared/utils/cn";

export interface ToolbarItem {
  id: string;
  title: string;
  icon: LucideIcon;
  type?: never;
}

export interface ToolbarProps {
  items: ToolbarItem[];
  defaultSelected?: string;
  className?: string;
  activeColor?: string;
  onSelect?: (itemId: string) => void;
  selected?: string; // allow external control
}

const buttonVariants = {
  initial: {
    gap: 0,
    paddingLeft: ".5rem",
    paddingRight: ".5rem",
  },
  animate: (isSelected: boolean) => ({
    gap: isSelected ? ".5rem" : 0,
    paddingLeft: isSelected ? "1rem" : ".5rem",
    paddingRight: isSelected ? "1rem" : ".5rem",
  }),
};

const spanVariants = {
  initial: { width: 0, opacity: 0 },
  animate: { width: "auto", opacity: 1 },
  exit: { width: 0, opacity: 0 },
};

const notificationVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: -10 },
  exit: { opacity: 0, y: -20 },
};

const lineVariants = {
  initial: { scaleX: 0, x: "-50%" },
  animate: {
    scaleX: 1,
    x: "0%",
    transition: { duration: 0.2, ease: "easeOut" },
  },
  exit: {
    scaleX: 0,
    x: "50%",
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

const transition = { type: "spring", bounce: 0, duration: 0.4 };

export function Toolbar({
  items,
  defaultSelected,
  className,
  activeColor: _activeColor = "text-primary",
  onSelect,
  selected: externalSelected,
}: ToolbarProps) {
  const [internalSelected, setInternalSelected] = React.useState<string | null>(
    defaultSelected || (items.length > 0 ? items[0].id : null)
  );
  const [activeNotification, setActiveNotification] = React.useState<string | null>(null);
  const outsideClickRef = React.useRef(null);

  const selected = externalSelected !== undefined ? externalSelected : internalSelected;

  const handleItemClick = (itemId: string) => {
    if (externalSelected === undefined) {
      setInternalSelected(itemId);
    }
    onSelect?.(itemId);
    setActiveNotification(itemId);
    setTimeout(() => setActiveNotification(null), 1500);
  };

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "relative flex items-center gap-2 p-1.5",
          "bg-background/80 backdrop-blur-md shadow-lg",
          "rounded-xl border border-border/50",
          "transition-all duration-200",
          className
        )}
        ref={outsideClickRef}
      >
        <AnimatePresence>
          {activeNotification && (
            <motion.div
              animate="animate"
              className="absolute -top-10 left-1/2 z-50 -translate-x-1/2 transform"
              exit="exit"
              initial="initial"
              transition={{ duration: 0.3 }}
              variants={notificationVariants as any}
            >
              <div className="rounded-full bg-primary px-3 py-1.5 text-primary-foreground text-xs font-semibold whitespace-nowrap shadow-xl">
                Switched to {items.find((item) => item.id === activeNotification)?.title}
              </div>
              <motion.div
                animate="animate"
                className="absolute -bottom-1 left-1/2 h-[2px] w-full origin-left bg-primary"
                exit="exit"
                initial="initial"
                variants={lineVariants as any}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-1.5 hide-scrollbar overflow-x-auto">
          {items.map((item) => (
            <motion.button
              animate="animate"
              className={cn(
                "relative flex items-center rounded-lg px-3 py-2 shrink-0",
                "font-medium text-xs sm:text-sm transition-colors duration-300",
                selected === item.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
              )}
              custom={selected === item.id}
              initial={false}
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              transition={transition as any}
              variants={buttonVariants as any}
            >
              <item.icon
                className={cn(selected === item.id && "text-primary-foreground")}
                size={16}
              />
              <AnimatePresence initial={false}>
                {selected === item.id && (
                  <motion.span
                    animate="animate"
                    className="overflow-hidden whitespace-nowrap"
                    exit="exit"
                    initial="initial"
                    transition={transition as any}
                    variants={spanVariants as any}
                  >
                    {item.title}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Toolbar;
