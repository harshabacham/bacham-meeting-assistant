import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '@/shared/hooks/useSettings';
import { useToast } from '@/components/ui/ToastProvider';

import { pluginManager } from '@/core/integrations/PluginManager';
import { IntegrationCard } from '@/components/integrations/IntegrationCard';
import { TauriClient, StorageBreakdown } from '@/infrastructure/tauri-client';
import {
    Settings, Shield, HardDrive, Key, Search, 
    Trash2, LayoutList, Sparkles, ChevronRight, Database, BrainCircuit, Eye, EyeOff
} from 'lucide-react';
import { usePetStore, PET_DEFINITIONS } from '@/shared/stores/petStore';
import { PetAvatar } from '@/components/pets/PetAvatars';
import { ProfileSetup } from '@/components/ui/profile-setup';
import { cn } from '@/components';
import { useLectureStore } from '@/shared/stores/lectureStore';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/shared/stores/authStore';
import { useConfirmStore } from '@/components/ui/ConfirmProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { updateProfile } from 'firebase/auth';
import { auth } from '@/infrastructure/firebase/config';

const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

type TabType = 'profile' | 'general' | 'ai' | 'pets' | 'integrations' | 'storage';

export function SettingsPage() {
    const { settings, isLoading, updateSettings, setApiKey: _setApiKey, fetchSettings } = useSettings();
    const { showConfirm } = useConfirmStore();
    const { lectures, fetchLectures } = useLectureStore();
    const { user, setUser } = useAuthStore();
    const [searchParams, setSearchParams] = useSearchParams();
    const { showToast } = useToast();
    const { selectedPetId, setSelectedPetId, petSize, setPetSize, isTuckedAway, toggleTuckedAway } = usePetStore();
    const { t } = useTranslation();


    
    const activeTab = (searchParams.get('tab') as TabType) || 'profile';
    
    const [_keyInput, _setKeyInput] = useState('');
    const [newPath, setNewPath] = useState('');
    const [backupPath, setBackupPath] = useState('');
    const [breakdown, setBreakdown] = useState<StorageBreakdown | null>(null);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    useEffect(() => {
        if (activeTab === 'storage') {
            fetchLectures();
            TauriClient.getStorageBreakdown().then(setBreakdown);
        }
    }, [activeTab, fetchLectures]);

    if (isLoading || !settings) {
        return (
            <div className="flex items-center justify-center h-full bg-background">
                <div className="flex flex-col items-center gap-4 text-muted-foreground animate-pulse">
                    <Settings className="w-8 h-8 animate-spin" style={{ animationDuration: '3s' }} />
                    <p className="text-sm font-medium">Loading Preferences...</p>
                </div>
            </div>
        );
    }


    const handleChangeStorage = async () => {
        if (!newPath) return;
        try {
            await TauriClient.changeStorageLocation(newPath);
            fetchSettings();
            setNewPath('');
            TauriClient.getStorageBreakdown().then(setBreakdown);
        } catch (e) {
            console.error(e);
            showToast('Failed to move storage location.', 'error');
        }
    };

    const handleDeleteVideo = async (lectureId: string) => {
        const ok = await showConfirm('Are you sure you want to delete this video asset? The lecture and its notes will be kept, but the video file will be permanently removed.');
        if (ok) {
            await TauriClient.deleteVideoAsset(lectureId);
            fetchLectures();
            TauriClient.getStorageBreakdown().then(setBreakdown);
        }
    };

    return (
        <div className="flex h-full w-full bg-background text-foreground overflow-hidden selection:bg-primary">

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto relative bg-background">
                <div className="max-w-4xl mx-auto px-12 py-10">

                    {/* Settings Navigation Header */}
                    <div className="flex items-center gap-2 border-b border-border pb-5 mb-8 overflow-x-auto scrollbar-none">
                        {[
                            { id: 'profile', label: 'My Profile', icon: Shield },
                            { id: 'general', label: 'AI & General', icon: Key },
                            { id: 'pets', label: 'Pets', icon: Sparkles },
                            { id: 'integrations', label: 'Integrations', icon: Settings },
                            { id: 'storage', label: 'Storage & Data', icon: Database },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setSearchParams({ tab: tab.id })}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0",
                                    activeTab === tab.id
                                        ? "bg-primary text-primary-foreground font-bold shadow-md"
                                        : "bg-surface text-muted-foreground hover:text-foreground hover:bg-surface border border-border"
                                )}
                            >
                                <tab.icon size={14} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 15, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -15, scale: 0.98 }}
                            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                            className="space-y-8"
                        >
                            {activeTab === 'profile' && (
                                <div className="space-y-8">
                                    <div>
                                        <h2 className="text-2xl font-bold tracking-tight text-foreground">{t('settings.my_profile', 'My Profile')}</h2>
                                        <p className="text-muted-foreground mt-1 text-sm">{t('settings.profile_desc', 'Manage your account and personal details.')}</p>
                                    </div>
                                    
                                    <div className="bg-surface border border-border rounded-3xl p-8 shadow-sm shadow-black/5 backdrop-blur-xl">
                                        
                                        <ProfileSetup 
                                            variant="inline"
                                            defaultUsername={user?.displayName || ''} 
                                            defaultAvatarId={user?.photoURL?.startsWith('avatar:') ? parseInt(user.photoURL.split(':')[1]) : undefined}
                                            className="mx-0 max-w-full"
                                            onComplete={async (data) => {
                                                if (auth.currentUser) {
                                                    try {
                                                        await updateProfile(auth.currentUser, {
                                                            displayName: data.username,
                                                            photoURL: `avatar:${data.avatarId}`
                                                        });
                                                        // Also update local state
                                                        setUser({
                                                            ...auth.currentUser,
                                                            displayName: data.username,
                                                            photoURL: `avatar:${data.avatarId}`
                                                        });
                                                        showToast(`Profile updated to ${data.username}!`, 'success');
                                                    } catch (error) {
                                                        console.error("Failed to update profile", error);
                                                        showToast("Failed to update profile.", 'error');
                                                    }
                                                }
                                            }}
                                        />

                                        <div className="mt-8 pt-8 border-t border-border max-w-xl mx-auto">
                                            <label className="block text-sm font-semibold text-foreground mb-2 text-center">Primary Email Address</label>
                                            <div className="relative">
                                                <input 
                                                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-center text-muted-foreground outline-none cursor-not-allowed shadow-inner" 
                                                    value={user?.email || ''} 
                                                    disabled 
                                                />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                    <Shield className="w-4 h-4 text-muted-foreground" />
                                                </div>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1.5">
                                                <Shield size={12} /> Managed securely by Firebase Auth.
                                            </p>
                                        </div>
                                    </div>
                                    </div>
                            )}

                            {activeTab === 'ai' && (
                                <div className="space-y-8">
                                    <div>
                                        <h2 className="text-2xl font-bold tracking-tight text-foreground">AI & Intelligence</h2>
                                        <p className="text-muted-foreground mt-1 text-sm">Configure your artificial intelligence models and API keys.</p>
                                    </div>

                                    <div className="grid gap-6">
                                        {/* AI Providers Grid */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                            {pluginManager.getPlugins().filter(p => p.manifest.category === 'AI Providers').map(plugin => (
                                                <IntegrationCard key={plugin.manifest.id} plugin={plugin} />
                                            ))}
                                        </div>
                                        {/* Active AI Provider Selector */}
                                        <div className="bg-surface border border-border rounded-3xl p-8 shadow-sm shadow-black/5 backdrop-blur-xl">
                                            <div className="flex items-center gap-3 mb-8">
                                                <div className="p-2.5 bg-violet-500/10 text-violet-500 rounded-xl border border-violet-500/20 shadow-sm">
                                                    <BrainCircuit className="w-5 h-5" />
                                                </div>
                                                <h3 className="text-lg font-bold text-foreground">Active AI Provider</h3>
                                            </div>
                                            
                                            <div className="flex items-start justify-between">
                                                <div className="pr-8">
                                                    <label className="text-sm font-semibold text-foreground block mb-1">
                                                        Primary Inference Engine
                                                    </label>
                                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                                        Select which AI provider to use for generating summaries, action items, and live meeting intelligence. You must connect the provider above first.
                                                    </p>
                                                </div>
                                                <select
                                                    value={settings.aiProvider}
                                                    onChange={(e) => updateSettings({ aiProvider: e.target.value })}
                                                    className="bg-surface border border-border rounded-xl px-4 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[150px]"
                                                >
                                                    {pluginManager.getPlugins().filter(p => p.manifest.category === 'AI Providers').map(plugin => (
                                                        <option key={plugin.manifest.id} value={plugin.manifest.id}>
                                                            {plugin.manifest.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'general' && (
                                <div className="space-y-8">
                                    <div>
                                        <h2 className="text-2xl font-bold tracking-tight text-foreground">General Settings</h2>
                                        <p className="text-muted-foreground mt-1 text-sm">Configure basic application behavior.</p>
                                    </div>

                                    <div className="grid gap-6">

                                        {/* Auto-Start Recording */}
                                        <div className="bg-surface border border-border rounded-3xl p-8 shadow-sm shadow-black/5 backdrop-blur-xl">
                                            <div className="flex items-center gap-3 mb-8">
                                                <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20 shadow-sm">
                                                    <Sparkles className="w-5 h-5" />
                                                </div>
                                                <h3 className="text-lg font-bold text-foreground">Bulletproof Auto-Record</h3>
                                            </div>
                                            
                                            <div className="flex items-center justify-between">
                                                <div className="pr-8">
                                                    <label className="text-sm font-semibold text-foreground block mb-1">
                                                        Auto-Start from Calendar & Extensions
                                                    </label>
                                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                                        Automatically start recording when a scheduled calendar event begins or when the browser extension detects a meeting URL. This prevents you from ever forgetting to record.
                                                    </p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                                    <input 
                                                        type="checkbox" 
                                                        className="sr-only peer" 
                                                        checked={settings.autoStartRecording ?? true}
                                                        onChange={(e) => updateSettings({ autoStartRecording: e.target.checked })}
                                                    />
                                                    <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner border border-border/50"></div>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Localization & Language */}
                                        <div className="bg-surface border border-border rounded-3xl p-8 shadow-sm shadow-black/5 backdrop-blur-xl">
                                            <div className="flex items-center gap-3 mb-8">
                                                <div className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-xl border border-indigo-500/20 shadow-sm">
                                                    <Sparkles className="w-5 h-5" />
                                                </div>
                                                <h3 className="text-lg font-bold text-foreground">{t('settings.global_localization', 'Global Localization')}</h3>
                                            </div>
                                            
                                            <div className="flex items-start justify-between">
                                                <div className="pr-8">
                                                    <label className="text-sm font-semibold text-foreground block mb-1">
                                                        App Interface Language
                                                    </label>
                                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                                        Select your preferred language. The app UI and all AI-generated summaries, action items, and live copilot responses will be generated in this language.
                                                    </p>
                                                </div>
                                                <select
                                                    value={settings.language}
                                                    onChange={(e) => updateSettings({ language: e.target.value })}
                                                    className="bg-surface border border-border rounded-xl px-4 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[150px]"
                                                >
                                                    <option value="en">English</option>
                                                    <option value="es">Español</option>
                                                    <option value="fr">Français</option>
                                                    <option value="ja">日本語</option>
                                                    <option value="hi">हिन्दी</option>
                                                </select>
                                            </div>

                                            <div className="flex items-start justify-between mt-8 pt-8 border-t border-border/50">
                                                <div className="pr-8">
                                                    <label className="text-sm font-semibold text-foreground block mb-1">
                                                        Default Spoken Language
                                                    </label>
                                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                                        Select the language being spoken during your meetings. Setting this accurately dramatically improves transcription and AI intelligence.
                                                    </p>
                                                </div>
                                                <select
                                                    value={settings.spokenLanguage || 'auto'}
                                                    onChange={(e) => updateSettings({ spokenLanguage: e.target.value })}
                                                    className="bg-surface border border-border rounded-xl px-4 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[150px]"
                                                >
                                                    <option value="auto">Auto-Detect</option>
                                                    <option value="en-US">English (US)</option>
                                                    <option value="en-GB">English (UK)</option>
                                                    <option value="es">Spanish</option>
                                                    <option value="fr">French</option>
                                                    <option value="de">German</option>
                                                    <option value="it">Italian</option>
                                                    <option value="pt">Portuguese</option>
                                                    <option value="nl">Dutch</option>
                                                    <option value="ja">Japanese</option>
                                                    <option value="zh">Mandarin Chinese</option>
                                                    <option value="ru">Russian</option>
                                                    <option value="hi">Hindi</option>
                                                    <option value="ko">Korean</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Smart Search & Provider Card */}
                                        <div className="bg-surface border border-border rounded-3xl p-8 shadow-sm shadow-black/5 backdrop-blur-xl">
                                            <div className="flex items-center gap-3 mb-8">
                                                <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl border border-blue-500/20 shadow-sm">
                                                    <Search className="w-5 h-5" />
                                                </div>
                                                <h3 className="text-lg font-bold text-foreground">Search & Inference</h3>
                                            </div>

                                            <div className="space-y-8">
                                                {/* Smart Search Toggle */}
                                                <div className="flex items-start justify-between">
                                                    <div className="pr-8">
                                                        <label className="text-sm font-semibold text-foreground block mb-1">
                                                            Smart Search (Semantic Embeddings)
                                                        </label>
                                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                                            Supercharge your library search using Gemini's semantic embeddings. This allows you to search by meaning rather than exact keywords.
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => updateSettings({ smartSearchEnabled: !settings.smartSearchEnabled })}
                                                        className={cn(
                                                            'w-12 h-7 rounded-full relative transition-colors duration-300 shrink-0 shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background',
                                                            settings.smartSearchEnabled ? 'bg-primary' : 'bg-surface-hover border border-border'
                                                        )}
                                                    >
                                                        <motion.div
                                                            layout
                                                            className={cn(
                                                                "absolute top-1 bottom-1 w-5 rounded-full shadow-sm transition-colors duration-300",
                                                                settings.smartSearchEnabled ? "bg-white" : "bg-muted-foreground"
                                                            )}
                                                            style={{
                                                                left: settings.smartSearchEnabled ? 'calc(100% - 24px)' : '4px',
                                                            }}
                                                        />
                                                    </button>
                                                </div>

                                                <div className="h-px bg-border w-full" />

                                                {/* AI Provider */}
                                                <div>
                                                    <label className="text-sm font-semibold text-foreground block mb-3">
                                                        Active Inference Engine
                                                    </label>
                                                    <div className="flex flex-wrap gap-3">
                                                        {pluginManager.getPlugins().filter(p => p.manifest.category === 'AI Providers').map((p) => (
                                                            <button
                                                                key={p.manifest.id}
                                                                onClick={() => updateSettings({ aiProvider: p.manifest.id })}
                                                                className={cn(
                                                                    'px-5 py-3 rounded-xl border text-sm font-semibold transition-all duration-200 outline-none flex items-center gap-2',
                                                                    settings.aiProvider === p.manifest.id 
                                                                        ? 'bg-primary text-primary-foreground border-transparent shadow-sm shadow-primary/20' 
                                                                        : 'bg-surface text-foreground hover:bg-surface-hover border-border'
                                                                )}
                                                            >
                                                                <Sparkles className="w-4 h-4 opacity-70" />
                                                                {p.manifest.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="h-px bg-border w-full" />

                                                {/* Transcription Engine */}
                                                <div>
                                                    <label className="text-sm font-semibold text-foreground block mb-3">
                                                        Transcription Engine
                                                    </label>
                                                    <div className="flex flex-wrap gap-3">
                                                        <button
                                                            onClick={() => updateSettings({ transcriptionEngine: 'gemini' })}
                                                            className={cn(
                                                                'px-5 py-3 rounded-xl border text-sm font-semibold transition-all duration-200 outline-none flex items-center gap-2',
                                                                settings.transcriptionEngine === 'gemini' || !settings.transcriptionEngine
                                                                    ? 'bg-primary text-primary-foreground border-transparent shadow-sm shadow-primary/20' 
                                                                    : 'bg-surface text-foreground hover:bg-surface-hover border-border'
                                                            )}
                                                        >
                                                            <Sparkles className="w-4 h-4 opacity-70" />
                                                            Gemini API (Cloud)
                                                        </button>
                                                        <button
                                                            onClick={() => updateSettings({ transcriptionEngine: 'whisper' })}
                                                            className={cn(
                                                                'px-5 py-3 rounded-xl border text-sm font-semibold transition-all duration-200 outline-none flex items-center gap-2',
                                                                settings.transcriptionEngine === 'whisper'
                                                                    ? 'bg-primary text-primary-foreground border-transparent shadow-sm shadow-primary/20' 
                                                                    : 'bg-surface text-foreground hover:bg-surface-hover border-border'
                                                            )}
                                                        >
                                                            <HardDrive className="w-4 h-4 opacity-70" />
                                                            Whisper.cpp (Local)
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                <div className="h-px bg-border w-full" />

                                                {/* Max Retries */}
                                                <div>
                                                    <label className="text-sm font-semibold text-foreground block mb-3">
                                                        Network Resilience (Max Retries)
                                                    </label>
                                                    <div className="relative w-48">
                                                        <select 
                                                            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer" 
                                                            value={settings.aiMaxRetries || 5}
                                                            onChange={(e) => updateSettings({ aiMaxRetries: parseInt(e.target.value) })}
                                                        >
                                                            <option value={1}>1 (Strict - No retry)</option>
                                                            <option value={3}>3 (Balanced)</option>
                                                            <option value={5}>5 (Resilient)</option>
                                                            <option value={10}>10 (Aggressive)</option>
                                                        </select>
                                                        <ChevronRight className="w-4 h-4 text-muted-foreground absolute right-4 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Data & Export Card */}
                                        <div className="bg-surface border border-border rounded-3xl p-8 shadow-sm shadow-black/5 backdrop-blur-xl">
                                            <div className="flex items-center gap-3 mb-8">
                                                <div className="p-2.5 bg-green-500/10 text-green-500 rounded-xl border border-green-500/20 shadow-sm">
                                                    <Database className="w-5 h-5" />
                                                </div>
                                                <h3 className="text-lg font-bold text-foreground">Data & Export</h3>
                                            </div>

                                            <div className="space-y-8">
                                                {/* Auto-Export Toggle */}
                                                <div className="flex items-start justify-between">
                                                    <div className="pr-8">
                                                        <label className="text-sm font-semibold text-foreground block mb-1">
                                                            Auto-Export to Markdown
                                                        </label>
                                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                                            Automatically export your meetings as Markdown files when processing completes. Perfect for Obsidian or Notion users.
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => updateSettings({ autoExportMarkdown: !settings.autoExportMarkdown })}
                                                        className={cn(
                                                            'w-12 h-7 rounded-full relative transition-colors duration-300 shrink-0 shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background',
                                                            settings.autoExportMarkdown ? 'bg-primary' : 'bg-surface-hover border border-border'
                                                        )}
                                                    >
                                                        <motion.div
                                                            layout
                                                            className={cn(
                                                                "absolute top-1 bottom-1 w-5 rounded-full shadow-sm transition-colors duration-300",
                                                                settings.autoExportMarkdown ? "bg-white" : "bg-muted-foreground"
                                                            )}
                                                            style={{
                                                                left: settings.autoExportMarkdown ? 'calc(100% - 24px)' : '4px',
                                                            }}
                                                        />
                                                    </button>
                                                </div>

                                                <div className="h-px bg-border w-full" />

                                                {/* Export Path */}
                                                <div>
                                                    <label className="text-sm font-semibold text-foreground block mb-3">
                                                        Markdown Export Directory
                                                    </label>
                                                    <p className="text-sm text-muted-foreground mb-4">
                                                        Leave empty to use the default `Documents/BACHAM/Exports` directory.
                                                    </p>
                                                    <div className="flex gap-3">
                                                        <input 
                                                            type="text"
                                                            placeholder="e.g. /Users/name/Documents/Obsidian/Meetings"
                                                            className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                                            value={settings.markdownExportPath || ''}
                                                            onChange={(e) => updateSettings({ markdownExportPath: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Appearance Card */}
                                        <div className="bg-surface border border-border rounded-3xl p-8 shadow-sm shadow-black/5 backdrop-blur-xl">
                                            <div className="flex items-center gap-3 mb-8">
                                                <div className="p-2.5 bg-zinc-500/10 text-zinc-500 rounded-xl border border-zinc-500/20 shadow-sm">
                                                    <Sparkles className="w-5 h-5" />
                                                </div>
                                                <h3 className="text-lg font-bold text-foreground">Appearance</h3>
                                            </div>
                                            <div className="space-y-8">
                                                <div>
                                                    <label className="text-sm font-semibold text-foreground block mb-3">
                                                        Application Theme
                                                    </label>
                                                    <div className="flex gap-3">
                                                        {['system', 'dark', 'light'].map((t) => (
                                                            <button
                                                                key={t}
                                                                onClick={() => updateSettings({ theme: t })}
                                                                className={cn(
                                                                    'px-5 py-3 rounded-xl border text-sm font-semibold capitalize transition-all duration-200 outline-none flex items-center gap-2',
                                                                    settings.theme === t || (!settings.theme && t === 'system')
                                                                        ? 'bg-primary text-primary-foreground border-transparent shadow-sm shadow-primary/20'
                                                                        : 'bg-surface text-foreground hover:bg-surface-hover border-border'
                                                                )}
                                                            >
                                                                {t}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'pets' && (
                                <div className="space-y-8">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-2xl font-bold tracking-tight text-foreground">Pets</h2>
                                            <p className="text-muted-foreground mt-1 text-sm">Pets manage threads and surface what needs attention.</p>
                                        </div>
                                        <button
                                            onClick={() => toggleTuckedAway()}
                                            className={cn(
                                                "px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-2",
                                                isTuckedAway
                                                    ? "bg-surface text-foreground border-border hover:bg-surface-hover"
                                                    : "bg-surface text-muted-foreground border-border hover:text-foreground"
                                            )}
                                        >
                                            {isTuckedAway ? <Eye size={14} /> : <EyeOff size={14} />}
                                            {isTuckedAway ? 'Show Pet' : 'Tuck Away Pet'}
                                        </button>
                                    </div>

                                    {/* Pets Selection Grid */}
                                    <div className="bg-surface border border-border rounded-3xl p-6 shadow-xl backdrop-blur-xl">
                                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
                                            <div className="flex items-center gap-2.5">
                                                <Sparkles size={16} className="text-primary" />
                                                <h3 className="text-sm font-bold text-foreground">Pick a pet</h3>
                                            </div>
                                        </div>

                                        <div className="divide-y divide-border/30">
                                            {PET_DEFINITIONS.map((pet) => {
                                                const isSelected = selectedPetId === pet.id;
                                                return (
                                                    <div key={pet.id} className="py-4 flex items-center justify-between gap-4 first:pt-0 last:pb-0 hover:bg-surface px-3 rounded-2xl transition-colors">
                                                        <div className="flex items-center gap-4 min-w-0">
                                                            <div className="w-12 h-12 rounded-2xl bg-surface-raised border border-border flex items-center justify-center shrink-0 shadow-inner">
                                                                <PetAvatar id={pet.id} size={40} />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <h4 className="text-sm font-bold text-foreground">{pet.name}</h4>
                                                                <p className="text-xs text-muted-foreground truncate">{pet.description}</p>
                                                            </div>
                                                        </div>

                                                        <button
                                                            onClick={() => setSelectedPetId(pet.id)}
                                                            className={cn(
                                                                "px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0",
                                                                isSelected
                                                                    ? "bg-surface-hover text-muted-foreground border border-border cursor-default"
                                                                    : "bg-primary text-primary-foreground hover:opacity-90 shadow-sm"
                                                            )}
                                                        >
                                                            {isSelected ? 'Selected' : 'Select'}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Appearance Controls */}
                                    <div className="bg-surface border border-border rounded-3xl p-6 shadow-xl backdrop-blur-xl space-y-6">
                                        <h3 className="text-sm font-bold text-foreground">Appearance</h3>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-semibold text-foreground">Pet size</label>
                                                <span className="text-xs font-mono text-muted-foreground">{petSize}px</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">Adjust the size of your pet companion.</p>
                                            <input
                                                type="range"
                                                min="48"
                                                max="100"
                                                step="4"
                                                value={petSize}
                                                onChange={(e) => setPetSize(parseInt(e.target.value))}
                                                className="w-full h-2 bg-surface-raised rounded-lg appearance-none cursor-pointer accent-primary"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'integrations' && (
                                <div className="space-y-8">
                                    <div>
                                        <h2 className="text-2xl font-bold tracking-tight text-foreground">Integrations</h2>
                                        <p className="text-muted-foreground mt-1 text-sm">Connect Bacham to your favourite tools. Plugins run entirely locally on your device.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[minmax(180px,auto)]">
                                        {pluginManager.getPlugins().length === 0 ? (
                                            <div className="col-span-full py-12 flex flex-col items-center justify-center text-center bg-surface border border-border rounded-2xl border-dashed">
                                                <BrainCircuit size={32} className="text-muted-foreground mb-3" />
                                                <h3 className="text-sm font-semibold text-foreground">No Plugins Installed</h3>
                                                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                                                    You haven't installed any integrations yet. Future updates will allow you to browse and install community plugins right here.
                                                </p>
                                            </div>
                                        ) : (
                                            pluginManager.getPlugins().filter(p => p.manifest.category !== 'AI Providers').map(plugin => (
                                                <IntegrationCard key={plugin.manifest.id} plugin={plugin} />
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'storage' && (
                                <div className="space-y-8">
                                    <div>
                                        <h2 className="text-2xl font-bold tracking-tight text-foreground">Storage & Data</h2>
                                        <p className="text-muted-foreground mt-1 text-sm">Manage disk usage, databases, and large video files.</p>
                                    </div>

                                    {/* Markdown Vault Sync Card */}
                                    <div className="bg-surface border border-border rounded-3xl p-8 shadow-sm shadow-black/5 backdrop-blur-xl">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl border border-blue-500/20 shadow-sm">
                                                <Database className="w-5 h-5" />
                                            </div>
                                            <h3 className="text-lg font-bold text-foreground">Markdown Vault Sync (Obsidian / Notion)</h3>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <label className="text-sm font-semibold text-foreground block mb-1">
                                                        Auto-Export Meetings
                                                    </label>
                                                    <p className="text-xs text-muted-foreground max-w-md">
                                                        Automatically save every processed meeting as a clean Markdown file with frontmatter, action items, and transcripts.
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => updateSettings({ autoExportMarkdown: !settings.autoExportMarkdown })}
                                                    className={cn(
                                                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                                                        settings.autoExportMarkdown ? 'bg-primary' : 'bg-muted'
                                                    )}
                                                >
                                                    <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", settings.autoExportMarkdown ? 'translate-x-6' : 'translate-x-1')} />
                                                </button>
                                            </div>

                                            <div className="pt-4 border-t border-border">
                                                <label className="text-sm font-semibold text-foreground block mb-2">
                                                    Vault Directory Path
                                                </label>
                                                <div className="flex gap-3">
                                                    <input
                                                        className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-inner"
                                                        value={settings.markdownExportPath || ''}
                                                        onChange={(e) => updateSettings({ markdownExportPath: e.target.value })}
                                                        placeholder="e.g. C:\Users\YourName\Documents\ObsidianVault\Meetings"
                                                    />
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-2">
                                                    We recommend creating a specific folder in your Vault (like `Meetings/`) for these exports to keep your graph clean.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Storage Location Card */}
                                    <div className="bg-surface border border-border rounded-3xl p-8 shadow-sm shadow-black/5 backdrop-blur-xl">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-2.5 bg-orange-500/10 text-orange-500 rounded-xl border border-orange-500/20 shadow-sm">
                                                <HardDrive className="w-5 h-5" />
                                            </div>
                                            <h3 className="text-lg font-bold text-foreground">Storage Location</h3>
                                        </div>

                                        <div className="space-y-8">
                                            <div>
                                                <label className="text-sm font-semibold text-foreground block mb-2">
                                                    Current Working Directory
                                                </label>
                                                <div className="bg-background border border-border rounded-xl px-4 py-3 font-mono text-sm text-foreground shadow-inner overflow-x-auto whitespace-nowrap">
                                                    {settings.storageRootPath || 'Default (Documents/BACHAM)'}
                                                </div>
                                            </div>
                                            
                                            <div className="pt-6 border-t border-border">
                                                <label className="text-sm font-semibold text-foreground block mb-2">
                                                    Migrate Data
                                                </label>
                                                <div className="flex gap-3">
                                                    <input
                                                        className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-inner"
                                                        value={newPath}
                                                        onChange={(e) => setNewPath(e.target.value)}
                                                        placeholder="e.g. D:\BACHAM_Vault"
                                                    />
                                                    <button 
                                                        className="px-6 py-3 bg-secondary text-secondary-foreground text-sm font-semibold rounded-xl hover:bg-secondary shadow-sm transition-all active:scale-95 shrink-0" 
                                                        onClick={handleChangeStorage}
                                                    >
                                                        Move Files
                                                    </button>
                                                </div>
                                                <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-3">
                                                    <Shield className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                                    <p className="text-xs text-amber-500 leading-relaxed font-medium">
                                                        This action will safely move all databases, images, logs, and metadata to the new location. Ensure the target drive is fast and accessible.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Database Backup Card */}
                                    <div className="bg-surface border border-border rounded-3xl p-8 shadow-sm shadow-black/5 backdrop-blur-xl mt-8">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20 shadow-sm">
                                                <Database className="w-5 h-5" />
                                            </div>
                                            <h3 className="text-lg font-bold text-foreground">Database Backup</h3>
                                        </div>

                                        <div className="space-y-4">
                                            <p className="text-sm text-muted-foreground">
                                                Create a complete, consistent backup of your SQLite database file. This will save all your meetings, transcripts, notes, and folders into a single file.
                                            </p>
                                            
                                            <div className="flex gap-3">
                                                <input
                                                    className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-inner"
                                                    value={backupPath}
                                                    onChange={(e) => setBackupPath(e.target.value)}
                                                    placeholder="e.g. D:\Backups\bacham_backup.sqlite"
                                                />
                                                <button 
                                                    className="px-6 py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary shadow-sm transition-all active:scale-95 shrink-0 disabled:opacity-50" 
                                                    disabled={!backupPath}
                                                    onClick={async () => {
                                                        if (!backupPath) return;
                                                        try {
                                                            await TauriClient.backupDatabase(backupPath);
                                                            showToast('Database backup completed successfully!', 'success');
                                                            setBackupPath('');
                                                        } catch (e: any) {
                                                            showToast(`Failed to backup database: ${e.message}`, 'error');
                                                        }
                                                    }}
                                                >
                                                    Export Database Backup
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Breakdown Card */}
                                    <div className="bg-surface border border-border rounded-3xl p-8 shadow-sm shadow-black/5 backdrop-blur-xl">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20 shadow-sm">
                                                    <Database className="w-5 h-5" />
                                                </div>
                                                <h3 className="text-lg font-bold text-foreground">Capacity Breakdown</h3>
                                            </div>
                                            {breakdown && (
                                                <div className="bg-surface border border-border rounded-lg px-4 py-2 text-sm font-bold text-foreground shadow-sm">
                                                    Total: {formatBytes(breakdown.totalBytes)}
                                                </div>
                                            )}
                                        </div>

                                        {breakdown ? (
                                            <div className="space-y-6">
                                                <div className="w-full h-6 rounded-full flex overflow-hidden border border-border shadow-inner bg-background">
                                                    <motion.div initial={{width: 0}} animate={{width: `${(breakdown.videosBytes / breakdown.totalBytes) * 100}%`}} transition={{duration: 1, ease: "easeOut"}} className="bg-purple-500 hover:brightness-110 transition-all" title="Videos" />
                                                    <motion.div initial={{width: 0}} animate={{width: `${(breakdown.databaseBytes / breakdown.totalBytes) * 100}%`}} transition={{duration: 1, delay: 0.2, ease: "easeOut"}} className="bg-blue-500 hover:brightness-110 transition-all" title="Database" />
                                                    <motion.div initial={{width: 0}} animate={{width: `${(breakdown.logsBytes / breakdown.totalBytes) * 100}%`}} transition={{duration: 1, delay: 0.4, ease: "easeOut"}} className="bg-orange-500 hover:brightness-110 transition-all" title="Logs" />
                                                    <motion.div initial={{width: 0}} animate={{width: `${(breakdown.otherBytes / breakdown.totalBytes) * 100}%`}} transition={{duration: 1, delay: 0.6, ease: "easeOut"}} className="bg-zinc-500 hover:brightness-110 transition-all" title="Other" />
                                                </div>
                                                
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                    {[
                                                        { label: 'Videos', color: 'bg-purple-500', value: breakdown.videosBytes },
                                                        { label: 'Database', color: 'bg-blue-500', value: breakdown.databaseBytes },
                                                        { label: 'Logs', color: 'bg-orange-500', value: breakdown.logsBytes },
                                                        { label: 'Other', color: 'bg-zinc-500', value: breakdown.otherBytes },
                                                    ].map((item) => (
                                                        <div key={item.label} className="bg-surface border border-border rounded-xl p-3 flex flex-col items-center justify-center text-center">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <div className={cn("w-2.5 h-2.5 rounded-full shadow-sm", item.color)} />
                                                                <span className="text-xs font-semibold text-muted-foreground">{item.label}</span>
                                                            </div>
                                                            <span className="text-sm font-bold text-foreground">{formatBytes(item.value)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-32 flex items-center justify-center">
                                                <div className="flex flex-col items-center gap-3 text-muted-foreground animate-pulse">
                                                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                    <span className="text-xs font-medium uppercase tracking-wider">Analyzing Disk...</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Video Assets Card */}
                                    <div className="bg-surface border border-border rounded-3xl p-8 shadow-sm shadow-black/5 backdrop-blur-xl">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20 shadow-sm">
                                                <LayoutList className="w-5 h-5" />
                                            </div>
                                            <h3 className="text-lg font-bold text-foreground">Large Video Assets</h3>
                                        </div>
                                        
                                        <div className="space-y-3">
                                            {lectures.filter(l => !!l.videoPath).length > 0 ? (
                                                lectures.filter(l => !!l.videoPath).map(lecture => (
                                                    <div key={lecture.id} className="group flex items-center justify-between p-4 rounded-2xl border border-border bg-background hover:bg-surface hover:shadow-md transition-all duration-300">
                                                        <div className="min-w-0 flex-1 pr-6">
                                                            <h4 className="text-sm font-bold text-foreground truncate">{lecture.title || 'Untitled Lecture'}</h4>
                                                            <p className="text-xs text-muted-foreground truncate font-mono mt-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                                                {lecture.videoPath}
                                                            </p>
                                                        </div>
                                                        <button 
                                                            onClick={() => handleDeleteVideo(lecture.id)}
                                                            className="p-2.5 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground hover:shadow-sm hover:shadow-destructive/20 transition-all duration-300 flex-shrink-0 active:scale-95"
                                                            title="Delete Video Asset"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border rounded-2xl bg-surface">
                                                    <LayoutList className="w-8 h-8 text-muted-foreground mb-3" />
                                                    <p className="text-sm font-medium text-muted-foreground">No heavy video assets found.</p>
                                                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">Your system is clean and free of massive video caches.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {/* Privacy & Learning Data Card */}
                                    <div className="bg-surface border border-border rounded-3xl p-8 shadow-sm shadow-black/5 backdrop-blur-xl">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl border border-blue-500/20 shadow-sm">
                                                <Shield className="w-5 h-5" />
                                            </div>
                                            <h3 className="text-lg font-bold text-foreground">Privacy & Learning Data</h3>
                                        </div>
                                        <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
                                            All learning analytics, topic mastery ratings, study streaks, and workspace session memories are stored 100% locally on your device in SQLite. No tracking telemetry is ever uploaded.
                                        </p>
                                        <button
                                            onClick={async () => {
                                                const ok = await showConfirm('Are you sure you want to reset your local learning history? This will clear study streaks, session positions, and topic mastery profiles.');
                                                if (ok) {
                                                    await TauriClient.resetLearningHistory();
                                                    showToast('Learning history has been reset.', 'success');
                                                }
                                            }}
                                            className="px-4 py-2.5 bg-destructive text-destructive border border-destructive rounded-xl text-xs font-bold hover:bg-destructive hover:text-white transition-all shadow-sm"
                                        >
                                            Reset Learning History
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>


                </div>
            </main>
        </div>
    );
}
