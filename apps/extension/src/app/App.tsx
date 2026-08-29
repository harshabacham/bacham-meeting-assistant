import React, { useEffect, useRef } from 'react';
import { NavigationProvider, useNavigation } from './providers';
import { useSession } from '@/shared/hooks/useSession';
import { usePermissions } from '@/shared/hooks/usePermissions';

import { IdleScreen } from '@/popup/screens/IdleScreen';
import { RecordingScreen } from '@/popup/screens/RecordingScreen';
import { PausedScreen } from '@/popup/screens/PausedScreen';
import { ErrorScreen } from '@/popup/screens/ErrorScreen';
import { PermissionRequestScreen } from '@/popup/screens/PermissionRequestScreen';
import { ConnectingScreen } from '@/popup/screens/ConnectingScreen';
import { SettingsScreen } from '@/popup/screens/SettingsScreen';
import { NotesScreen } from '@/popup/screens/NotesScreen';
import { HistoryScreen } from '@/popup/screens/HistoryScreen';
import { SidebarLayout } from '@/popup/components/SidebarLayout';

import { getExtensionVersion } from '@/infrastructure/browser/runtime';

/** Open BACHAM desktop app via native host wake message and trampoline fallback. */
function openDesktopApp(): void {
  try {
    chrome.runtime.sendMessage({ type: 'OPEN_APP' });
  } catch (e) {
    console.error('Failed to send OPEN_APP message:', e);
  }
  try {
    chrome.tabs.create({ url: 'http://localhost:3000/open', active: true });
  } catch {}
}

function AppInner(): React.ReactElement {
  const { currentScreen, navigate, goBack } = useNavigation();
  const {
    session,
    sessionState,
    isLoading,
    error,
    start,
    pause,
    resume,
    stop,
    discard,
    clearError,
  } = useSession();
  const { permissionStatus, isRequesting, requestAll } = usePermissions();

  // Track optimistic recording start time for immediate timer display
  const optimisticStartRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (isLoading) { navigate('connecting'); return; }
    if (sessionState === 'error' || error) { navigate('error'); return; }
    if (sessionState === 'requesting-permission') { navigate('permission'); return; }
    if (sessionState === 'connecting') { navigate('connecting'); return; }
    
    // If recording or paused, only force navigation if we are coming from a non-active screen
    // This allows the user to browse Notes, History, or Settings while recording!
    if (sessionState === 'recording' || sessionState === 'paused') {
      if (['idle', 'connecting', 'permission', 'error'].includes(currentScreen)) {
        navigate(sessionState);
      }
      return;
    }
    
    if (permissionStatus && !permissionStatus.allGranted) { navigate('permission'); return; }
    if (sessionState === 'idle' || sessionState === 'stopping') {
      if (currentScreen !== 'settings' && currentScreen !== 'history' && currentScreen !== 'notes') {
        navigate('idle');
      }
      optimisticStartRef.current = undefined;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionState, isLoading, error, permissionStatus?.allGranted, currentScreen]);

  const handleStart = async (intent: Parameters<typeof start>[0]): Promise<void> => {
    // Record optimistic start time BEFORE awaiting background response
    optimisticStartRef.current = Date.now();
    // Navigate to recording immediately for timer display
    navigate('recording');
    await start(intent);
  };

  const handleReset = async (): Promise<void> => {
    clearError();
    await discard();
    navigate('idle');
  };

  const handleDiscard = async (): Promise<void> => {
    await discard();
    navigate('idle');
  };

  const version = getExtensionVersion();

  const renderScreen = (): React.ReactElement => {
    switch (currentScreen) {
      case 'connecting':
        return <ConnectingScreen />;

      case 'permission':
        return (
          <PermissionRequestScreen
            onRequest={() => requestAll()}
            isRequesting={isRequesting}
          />
        );

      case 'recording':
        // Use a fake session if we navigated optimistically (before session is created)
        const displaySession = session ?? {
          id: 'pending',
          tabTitle: 'Starting…',
          tabUrl: '',
          startedAt: new Date(optimisticStartRef.current ?? Date.now()).toISOString(),
          pausedDurationMs: 0,
          state: 'recording' as const,
        };
        return (
          <RecordingScreen
            session={displaySession as any}
            onPause={pause}
            onStop={stop}
            isLoading={isLoading}
            optimisticStart={optimisticStartRef.current}
          />
        );

      case 'paused':
        if (!session) return <ConnectingScreen />;
        return (
          <PausedScreen
            session={session}
            onResume={resume}
            onStop={stop}
            isLoading={isLoading}
          />
        );

      case 'error':
        return (
          <ErrorScreen
            errorMessage={session?.errorMessage ?? error ?? 'An unexpected error occurred.'}
            onReset={handleReset}
            onDiscard={handleDiscard}
            isLoading={isLoading}
          />
        );

      case 'settings':
        return <SettingsScreen version={version} onBack={goBack} onOpenApp={openDesktopApp} />;

      case 'notes':
        return <NotesScreen />;

      case 'history':
        return <HistoryScreen />;

      case 'idle':
      default:
        return (
          <IdleScreen
            onStart={handleStart}
            isLoading={isLoading}
            onOpenApp={openDesktopApp}
          />
        );
    }
  };

  return (
    <div className="relative overflow-hidden shadow-2xl flex w-full h-full" style={{ width: '100vw', height: '100vh', background: 'var(--bg)' }}>
      <SidebarLayout>
        {renderScreen()}
      </SidebarLayout>
    </div>
  );
}

export function App(): React.ReactElement {
  return (
    <NavigationProvider>
      <AppInner />
    </NavigationProvider>
  );
}
