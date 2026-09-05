import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '@/app/App';
import { OnboardingScreen } from '@/popup/screens/OnboardingScreen';
import { MicPermissionTab } from '@/popup/screens/MicPermissionTab';
import '@/styles/globals.css';

function Root() {
  const isMicFlow = typeof window !== 'undefined' && window.location.search.includes('flow=mic_permission');
  if (isMicFlow) {
    return <MicPermissionTab />;
  }

  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    // Pre-warm the offscreen document immediately when popup opens
    chrome.runtime.sendMessage({ type: 'PRE_WARM_OFFSCREEN' }).catch(() => {});

    chrome.storage.local.get(['v2_onboarded'], (result) => {
      setOnboarded(!!result.v2_onboarded);
    });
  }, []);

  if (onboarded === null) {
    return null; // Loading state
  }

  if (!onboarded) {
    return (
      <OnboardingScreen
        onComplete={() => {
          chrome.storage.local.set({ v2_onboarded: true }, () => {
            setOnboarded(true);
          });
        }}
      />
    );
  }

  return <App />;
}

const root = document.getElementById('root');
if (!root) {
  throw new Error('[BACHAM] Root element #root not found in popup HTML');
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
