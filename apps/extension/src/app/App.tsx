import React, { useEffect, useRef } from 'react';
import { NavigationProvider, useNavigation } from './providers';
import { useSession } from '@/shared/hooks/useSession';
import { usePermissions } from '@/shared/hooks/usePermissions';

import { IdleScreen } from '@/popup/screens/IdleScreen';
import { RecordingScreen } from '@/popup/screens/RecordingScreen';
import { ErrorScreen } from '@/popup/screens/ErrorScreen';
import { PermissionRequestScreen } from '@/popup/screens/PermissionRequestScreen';
import { ConnectingScreen } from '@/popup/screens/ConnectingScreen';
import { SettingsScreen } from '@/popup/screens/SettingsScreen';
import { NotesScreen } from '@/popup/screens/NotesScreen';

import { CopilotScreen } from '@/popup/screens/CopilotScreen';
import { SidebarLayout } from '@/popup/components/SidebarLayout';

import { getExtensionVersion } from '@/infrastructure/browser/runtime';

/** Open BACHAM desktop app via native host / websocket wake message. */
function openDesktopApp(route?: string): void {
  try {
    chrome.runtime.sendMessage({ type: 'OPEN_APP', payload: route ? { route } : {} }).catch(() => {});
  } catch (e) {
    console.error('Failed to send OPEN_APP message:', e);
  }
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
      if (['connecting', 'permission', 'error'].includes(currentScreen)) {
        navigate('recording');
      }
      return;
    }
    
    if (permissionStatus && !permissionStatus.allGranted) { navigate('permission'); return; }
    if (sessionState === 'idle' || sessionState === 'stopping') {
      if (currentScreen !== 'settings' && currentScreen !== 'notes' && currentScreen !== 'copilot') {
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
      case 'paused':
        // Use a fake session if we navigated optimistically (before session is created)
        const displaySession = session ?? {
          id: 'pending',
          tabTitle: 'Starting…',
          tabUrl: '',
          startedAt: new Date(optimisticStartRef.current ?? Date.now()).toISOString(),
          pausedDurationMs: 0,
          state: sessionState === 'paused' ? ('paused' as const) : ('recording' as const),
        };
        return (
          <RecordingScreen
            session={displaySession as any}
            onPause={pause}
            onResume={resume}
            onStop={stop}
            isLoading={isLoading}
            optimisticStart={optimisticStartRef.current}
            onBack={() => navigate('idle')}
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
        // History is now embedded inside NotesScreen as a tab
        return <NotesScreen />;

      case 'copilot':
        return <CopilotScreen />;

      case 'idle':
      default:
        return (
          <IdleScreen
            onStart={handleStart}
            isLoading={isLoading}
            onOpenApp={openDesktopApp}
            onReturnToRecording={() => navigate(sessionState === 'paused' ? 'paused' : 'recording')}
          />
        );
    }
  };

  return (
    <div className="w-screen h-screen flex items-center justify-center sm:bg-[#0a0a0a]">
      <div 
        className="relative overflow-hidden flex flex-col w-full h-full sm:max-w-[420px] sm:max-h-[650px] sm:rounded-2xl sm:border sm:border-white/10 sm:shadow-2xl" 
        style={{ background: 'var(--bg)' }}
      >
        <SidebarLayout>
          {renderScreen()}
        </SidebarLayout>
      </div>
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
