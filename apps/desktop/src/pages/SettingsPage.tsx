import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { ProfileSettingsTab } from '@/components/settings/ProfileSettingsTab';
import { GeneralSettingsTab } from '@/components/settings/GeneralSettingsTab';
import { AISettingsTab } from '@/components/settings/AISettingsTab';
import { PetsSettingsTab } from '@/components/settings/PetsSettingsTab';
import { IntegrationsHub } from '@/components/integrations/IntegrationsHub';
import { StorageSettingsTab } from '@/components/settings/StorageSettingsTab';
import { FeedbackSettingsTab } from '@/components/settings/FeedbackSettingsTab';

export type SettingsTabType = 'profile' | 'general' | 'ai' | 'pets' | 'integrations' | 'storage' | 'feedback';

export function SettingsPage() {
  const { settings, isLoading, fetchSettings } = useSettingsStore();
  const [searchParams] = useSearchParams();

  const activeTab = (searchParams.get('tab') as SettingsTabType) || 'profile';

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  if (isLoading && !settings) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
          <p className="text-xs font-semibold">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-background text-foreground overflow-hidden">
      <main className="flex-1 overflow-y-auto relative bg-background">
        <div className={`mx-auto py-8 transition-all duration-200 ${
          activeTab === 'integrations' 
            ? 'w-full max-w-full px-6 lg:px-10' 
            : 'max-w-4xl px-6 lg:px-8'
        }`}>

          {/* Active Tab Content with Smooth Transitions */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {activeTab === 'profile' && <ProfileSettingsTab />}
              {activeTab === 'general' && <GeneralSettingsTab />}
              {activeTab === 'ai' && <AISettingsTab />}
              {activeTab === 'pets' && <PetsSettingsTab />}
              {activeTab === 'integrations' && <IntegrationsHub />}
              {activeTab === 'storage' && <StorageSettingsTab />}
              {activeTab === 'feedback' && <FeedbackSettingsTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
