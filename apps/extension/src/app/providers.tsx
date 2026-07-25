import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

/** Available named screens in the popup. */
export type ScreenName = 'idle' | 'recording' | 'paused' | 'error' | 'permission' | 'connecting' | 'settings';

interface NavigationContextValue {
  readonly currentScreen: ScreenName;
  readonly navigate: (screen: ScreenName) => void;
  readonly goBack: () => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

/**
 * Navigation context provider — lightweight screen routing for the popup.
 * State is local to the popup (popup is not the source of truth for session state).
 */
export function NavigationProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [history, setHistory] = useState<ScreenName[]>(['connecting']);

  const navigate = useCallback((screen: ScreenName): void => {
    setHistory((prev) => [...prev, screen]);
  }, []);

  const goBack = useCallback((): void => {
    setHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const currentScreen = history[history.length - 1] ?? 'connecting';

  return (
    <NavigationContext.Provider value={{ currentScreen, navigate, goBack }}>
      {children}
    </NavigationContext.Provider>
  );
}

/**
 * Hook to access popup navigation state and actions.
 */
export function useNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return ctx;
}
