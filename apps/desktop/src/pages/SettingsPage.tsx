import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Settings, BrainCircuit, Sparkles, PlugZap, Database, Loader2 } from 'lucide-react';
import { ProfileSettingsTab } from '@/components/settings/ProfileSettingsTab';
import { GeneralSettingsTab } from '@/components/settings/GeneralSettingsTab';
import { AISettingsTab } from '@/components/settings/AISettingsTab';
import { PetsSettingsTab } from '@/components/settings/PetsSettingsTab';
import { IntegrationsHub } from '@/components/integrations/IntegrationsHub';
import { StorageSettingsTab } from '@/components/settings/StorageSettingsTab';

export type SettingsTabType = 'profile' | 'general' | 'ai' | 'pets' | 'integrations' | 'storage';

interface TabItem {
  id: SettingsTabType;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const SETTINGS_TABS: TabItem[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'general', label: 'General', icon: Settings },
  { id: 'ai', label: 'AI & Models', icon: BrainCircuit },
  { id: 'pets', label: 'Pets', icon: Sparkles },
  { id: 'integrations', label: 'Integrations', icon: PlugZap },
  { id: 'storage', label: 'Storage', icon: Database },
];

export function SettingsPage() {
  const { settings, isLoading, fetchSettings } = useSettingsStore();
  const [searchParams, setSearchParams] = useSearchParams();

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
          {/* Settings Navigation Header */}
          <div className="flex items-center gap-2 border-b border-border pb-4 mb-8 overflow-x-auto scrollbar-none">
            {SETTINGS_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSearchParams({ tab: tab.id })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                      : 'bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-raised border border-border'
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

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
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
