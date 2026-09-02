"use client";

import { FileText, LogOut, Settings, User, Trash2, Sun, Moon } from "lucide-react";
import { Link } from "react-router-dom";
import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/shared/utils/cn";
import Gemini from "./gemini";
import { useAuthStore } from "@/shared/stores/authStore";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useSettingsStore } from "@/shared/stores/settingsStore";
import { useLectureStore } from "@/shared/stores/lectureStore";
import { useAnimatedTheme } from "@/components/ui/animated-theme-toggler";

interface Profile {
  name: string;
  email: string;
  avatar: string;
  subscription?: string;
  model?: string;
}

interface MenuItem {
  label: string;
  value?: string;
  href?: string;
  icon: React.ReactNode;
  external?: boolean;
  onClick?: (e?: any) => void;
  danger?: boolean;
}
interface ProfileDropdownProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'data'> {
  data?: Profile;
  collapsed?: boolean;
}

const DEFAULT_GUEST_PROFILE: Profile = {
  name: "Guest User",
  email: "guest@bacham.app",
  avatar: "",
  subscription: "FREE",
  model: "Gemini 2.0 Flash",
};

export default function ProfileDropdown({
  data = DEFAULT_GUEST_PROFILE,
  className,
  collapsed = false,
  ...props
}: ProfileDropdownProps) {
  const { user, signOut } = useAuthStore();
  const { settings, updateSettings } = useSettingsStore();
  const { setSystemView, setSelectedFolderId } = useLectureStore();
  
  const isDarkCurrent = settings?.theme === 'dark' || (settings?.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  const { toggleTheme } = useAnimatedTheme({
    theme: isDarkCurrent ? 'dark' : 'light',
    onThemeChange: (newTheme) => updateSettings({ theme: newTheme })
  });

  const displayData = {
    name: user?.displayName || user?.email?.split('@')[0] || data.name,
    email: user?.email || data.email,
    avatar: user?.photoURL || data.avatar,
    subscription: data.subscription,
    model: data.model,
  };

  const [isOpen, setIsOpen] = React.useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  const menuItems: MenuItem[] = [
    {
      label: "Profile",
      href: "/settings?tab=profile",
      icon: <User className="h-4 w-4" />,
    },
    {
      label: "Model",
      value: displayData.model,
      href: "/settings?tab=general",
      icon: <Gemini className="h-4 w-4" />,
    },
    {
      label: "Settings",
      href: "/settings?tab=general",
      icon: <Settings className="h-4 w-4" />,
    },
    {
      label: "Terms & Policies",
      href: "/terms",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      label: isDarkCurrent ? "Light Mode" : "Dark Mode",
      icon: isDarkCurrent ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
      onClick: (e?: any) => {
        // e is passed from DropdownMenuItem onClick
        // wait for the dropdown to close before animating for better visual effect,
        // or just let it animate immediately.
        toggleTheme(e);
      },
    },
    {
      label: "Trash",
      href: "/notes",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: () => {
        setSelectedFolderId('system:trash');
        setSystemView('all');
      },
      danger: true,
    },
  ];

  return (
    <div className={cn("relative", className)} {...props}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen} modal={false}>
        <div 
          className="group relative" 
          onMouseEnter={handleMouseEnter} 
          onMouseLeave={handleMouseLeave}
        >
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center w-full rounded-xl p-1.5 transition-all duration-200 hover:bg-surface-hover active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                collapsed ? "justify-center" : "justify-between gap-2"
              )}
              type="button"
            >
              {!collapsed && (
                <div className="flex-1 text-left min-w-0">
                  <div className="font-semibold text-[12px] text-foreground truncate">
                    {displayData.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate leading-tight">
                    {displayData.email}
                  </div>
                </div>
              )}
              <div className="relative shrink-0">
                <div className="h-6 w-6 rounded-full overflow-hidden border border-border/50 shadow-sm">
                  <UserAvatar photoURL={displayData.avatar} email={displayData.email} className="h-full w-full" />
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>

          {/* Bending line indicator on the right */}
          {!collapsed && (
            <div
              className={cn(
                "absolute top-1/2 -right-3 -translate-y-1/2 transition-all duration-200 pointer-events-none z-50",
                isOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
            >
              <svg
                aria-hidden="true"
                className={cn(
                  "transition-all duration-200",
                  isOpen
                    ? "scale-110 text-primary"
                    : "text-muted-foreground group-hover:text-foreground"
                )}
                fill="none"
                height="24"
                viewBox="0 0 12 24"
                width="12"
              >
                <path
                  d="M2 4C6 8 6 16 2 20"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
          )}

          <DropdownMenuContent
            align={collapsed ? "start" : "end"}
            side={collapsed ? "right" : "top"}
            className="w-64 rounded-xl border border-border/50 bg-surface/95 p-2 shadow-2xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
            sideOffset={12}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="space-y-1">
              {menuItems.map((item) => {
                const ItemWrapper = item.href ? Link : 'button';
                const wrapperProps = item.href 
                  ? { to: item.href, onClick: item.onClick }
                  : { onClick: item.onClick, type: 'button' as const };

                return (
                  <DropdownMenuItem asChild key={item.label}>
                    <ItemWrapper
                      className={cn(
                        "group flex w-full cursor-pointer items-center rounded-lg border border-transparent p-2.5 transition-all duration-200 hover:bg-surface-hover",
                        item.danger && "hover:bg-destructive/10 text-destructive hover:text-destructive"
                      )}
                      {...wrapperProps as any}
                    >
                      <div className="flex flex-1 items-center gap-3">
                        {item.icon}
                        <span className={cn(
                          "font-medium text-sm transition-colors",
                          item.danger ? "text-destructive group-hover:text-destructive" : "text-foreground group-hover:text-foreground"
                        )}>
                          {item.label}
                        </span>
                      </div>
                      <div className="ml-auto flex-shrink-0">
                        {item.value && (
                        <span
                          className={cn(
                            "rounded-md px-2 py-1 font-medium text-xs tracking-tight",
                            item.label === "Model"
                              ? "border border-blue-500/10 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                              : "border border-purple-500/10 bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400"
                          )}
                        >
                          {item.value}
                        </span>
                      )}
                    </div>
                  </ItemWrapper>
                </DropdownMenuItem>
                );
              })}
            </div>

            <DropdownMenuSeparator className="my-2 bg-border/50" />

            <DropdownMenuItem asChild>
              <button
                onClick={signOut}
                className="group flex w-full cursor-pointer items-center gap-3 rounded-lg border border-transparent bg-destructive/10 p-2.5 transition-all duration-200 hover:bg-destructive/20"
                type="button"
              >
                <LogOut className="h-4 w-4 text-destructive" />
                <span className="font-medium text-destructive text-sm">
                  Sign Out
                </span>
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </div>
      </DropdownMenu>
    </div>
  );
}
