import { useEffect, useState } from 'react';
import { useSettings } from '@/shared/hooks/useSettings';
import { TauriClient, StorageBreakdown } from '@/infrastructure/tauri-client';
import { 
    Settings, Shield, HardDrive, Key, Search, CheckCircle, 
    Trash2, LayoutList, Sparkles, ChevronRight, AlertCircle, Database
} from 'lucide-react';
import { ProfileSetup } from '@/components/ui/profile-setup';
import { cn } from '@/components';
import { useLectureStore } from '@/shared/stores/lectureStore';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/shared/stores/authStore';
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

type TabType = 'profile' | 'general' | 'integrations' | 'storage';

export function SettingsPage() {
    const { settings, isLoading, updateSettings, setApiKey, fetchSettings } = useSettings();
    const { lectures, fetchLectures } = useLectureStore();
    const { user, setUser } = useAuthStore();
    const [searchParams, setSearchParams] = useSearchParams();


    
    const activeTab = (searchParams.get('tab') as TabType) || 'profile';
    
    const [keyInput, setKeyInput] = useState('');
    const [newPath, setNewPath] = useState('');
    const [breakdown, setBreakdown] = useState<StorageBreakdown | null>(null);
    const [keyError, setKeyError] = useState<string | null>(null);

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

    const handleSaveKey = async () => {
        if (!keyInput) return;
        setKeyError(null);
        try {
            await setApiKey(keyInput);
            setKeyInput('');
        } catch (e: any) {
            console.error(e);
            setKeyError(e.message || String(e));
        }
    };

    const handleChangeStorage = async () => {
        if (!newPath) return;
        try {
            await TauriClient.changeStorageLocation(newPath);
            fetchSettings();
            setNewPath('');
            TauriClient.getStorageBreakdown().then(setBreakdown);
        } catch (e) {
            console.error(e);
            alert('Failed to move storage location.');
        }
    };

    const handleDeleteVideo = async (lectureId: string) => {
        if (confirm('Are you sure you want to delete this video asset? The lecture and its notes will be kept, but the video file will be permanently removed.')) {
            await TauriClient.deleteVideoAsset(lectureId);
            fetchLectures();
            TauriClient.getStorageBreakdown().then(setBreakdown);
        }
    };

    return (
        <div className="flex h-full w-full bg-background text-foreground overflow-hidden selection:bg-primary/20">

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto relative bg-background">
                <div className="max-w-4xl mx-auto px-12 py-10">

                    {/* Settings Navigation Header */}
                    <div className="flex items-center gap-2 border-b border-border/40 pb-5 mb-8 overflow-x-auto scrollbar-none">
                        {[
                            { id: 'profile', label: 'My Profile', icon: Shield },
                            { id: 'general', label: 'AI & General', icon: Key },
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
                                        : "bg-surface/50 text-muted-foreground hover:text-foreground hover:bg-surface border border-border/40"
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
                                        <h2 className="text-2xl font-bold tracking-tight text-foreground">My Profile</h2>
                                        <p className="text-muted-foreground mt-1 text-sm">Manage your account and personal details.</p>
                                    </div>
                                    
                                    <div className="bg-surface/40 border border-border/50 rounded-3xl p-8 shadow-xl shadow-black/5 backdrop-blur-xl">
                                        
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
                                                        alert(`Profile updated to ${data.username}!`);
                                                    } catch (error) {
                                                        console.error("Failed to update profile", error);
                                                        alert("Failed to update profile.");
                                                    }
                                                }
                                            }}
                                        />

                                        <div className="mt-8 pt-8 border-t border-border/40 max-w-xl mx-auto">
                                            <label className="block text-sm font-semibold text-foreground mb-2 text-center">Primary Email Address</label>
                                            <div className="relative">
                                                <input 
                                                    className="w-full bg-surface/50 border border-border/50 rounded-xl px-4 py-3 text-sm text-center text-muted-foreground outline-none cursor-not-allowed shadow-inner" 
                                                    value={user?.email || ''} 
                                                    disabled 
                                                />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                    <Shield className="w-4 h-4 text-muted-foreground/50" />
                                                </div>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1.5">
                                                <Shield size={12} /> Managed securely by Firebase Auth.
                                            </p>
                                        </div>
                                    </div>
                                    </div>
                            )}

                            {activeTab === 'general' && (
                                <div className="space-y-8">
                                    <div>
                                        <h2 className="text-2xl font-bold tracking-tight text-foreground">AI & Intelligence</h2>
                                        <p className="text-muted-foreground mt-1 text-sm">Configure your artificial intelligence models and API keys.</p>
                                    </div>

                                    <div className="grid gap-6">
                                        {/* Gemini Key Card */}
                                        <div className="bg-surface/40 border border-border/50 rounded-3xl p-8 shadow-xl shadow-black/5 backdrop-blur-xl relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                                            
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20 shadow-sm">
                                                    <Key className="w-5 h-5" />
                                                </div>
                                                <h3 className="text-lg font-bold text-foreground">Google Gemini</h3>
                                            </div>

                                            <div className="max-w-lg">
                                                <label className="block text-sm font-semibold text-foreground mb-2">
                                                    API Key Configuration
                                                </label>
                                                <div className="flex gap-3">
                                                    <div className="relative flex-1">
                                                        <input
                                                            type="password"
                                                            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all shadow-inner"
                                                            value={keyInput}
                                                            onChange={(e) => setKeyInput(e.target.value)}
                                                            placeholder={settings.geminiApiKeySet ? "•••••••••••••••• (Configured)" : "Paste your Gemini API Key here"}
                                                        />
                                                    </div>
                                                    <button 
                                                        className="px-6 py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95" 
                                                        onClick={handleSaveKey}
                                                    >
                                                        Secure Save
                                                    </button>
                                                </div>
                                                {keyError && (
                                                    <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm flex items-center gap-2">
                                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                                        <span className="font-medium">{keyError}</span>
                                                    </div>
                                                )}
                                                {settings.geminiApiKeySet && !keyError && (
                                                    <p className="mt-3 text-xs text-emerald-500 flex items-center gap-1.5 font-medium bg-emerald-500/10 w-fit px-2.5 py-1 rounded-lg border border-emerald-500/20">
                                                        <CheckCircle className="w-3.5 h-3.5" /> API Key is securely locked in your OS keychain.
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Smart Search & Provider Card */}
                                        <div className="bg-surface/40 border border-border/50 rounded-3xl p-8 shadow-xl shadow-black/5 backdrop-blur-xl">
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

                                                <div className="h-px bg-border/40 w-full" />

                                                {/* AI Provider */}
                                                <div>
                                                    <label className="text-sm font-semibold text-foreground block mb-3">
                                                        Active Inference Engine
                                                    </label>
                                                    <div className="flex gap-3">
                                                        {['gemini', 'ollama'].map((p) => (
                                                            <button
                                                                key={p}
                                                                onClick={() => updateSettings({ aiProvider: p })}
                                                                className={cn(
                                                                    'px-5 py-3 rounded-xl border text-sm font-semibold capitalize transition-all duration-200 outline-none flex items-center gap-2',
                                                                    settings.aiProvider === p 
                                                                        ? 'bg-primary text-primary-foreground border-transparent shadow-lg shadow-primary/20' 
                                                                        : 'bg-surface text-foreground hover:bg-surface-hover border-border'
                                                                )}
                                                            >
                                                                {p === 'ollama' && <HardDrive className="w-4 h-4 opacity-70" />}
                                                                {p === 'gemini' && <Sparkles className="w-4 h-4 opacity-70" />}
                                                                {p} {p === 'ollama' && <span className="text-[10px] uppercase tracking-wider opacity-60 ml-1">Coming soon</span>}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                
                                                <div className="h-px bg-border/40 w-full" />

                                                {/* Max Retries */}
                                                <div>
                                                    <label className="text-sm font-semibold text-foreground block mb-3">
                                                        Network Resilience (Max Retries)
                                                    </label>
                                                    <div className="relative w-48">
                                                        <select 
                                                            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer" 
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

                                        {/* Appearance Card */}
                                        <div className="bg-surface/40 border border-border/50 rounded-3xl p-8 shadow-xl shadow-black/5 backdrop-blur-xl">
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
                                                                        ? 'bg-primary text-primary-foreground border-transparent shadow-lg shadow-primary/20'
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

                            {activeTab === 'integrations' && (
                                <div className="space-y-8">
                                    <div>
                                        <h2 className="text-2xl font-bold tracking-tight text-foreground">Integrations</h2>
                                        <p className="text-muted-foreground mt-1 text-sm">Connect Bacham to your favourite tools. Configure webhook URLs to push meeting notes automatically.</p>
                                    </div>

                                    {/* Slack */}
                                    <div className="bg-surface/40 border border-border/50 rounded-3xl p-8 shadow-xl shadow-black/5 backdrop-blur-xl space-y-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center">
                                                <span className="text-white font-bold text-sm">#</span>
                                            </div>
                                            <div>
                                                <h3 className="text-base font-semibold text-foreground">Slack</h3>
                                                <p className="text-xs text-muted-foreground">Post meeting summaries to a Slack channel via Incoming Webhook</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Incoming Webhook URL</label>
                                            <input
                                                type="url"
                                                placeholder="https://hooks.slack.com/services/..."
                                                defaultValue={localStorage.getItem('slack_webhook_url') || ''}
                                                onChange={e => localStorage.setItem('slack_webhook_url', e.target.value)}
                                                className="w-full bg-background/60 border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                                            />
                                            <p className="text-[11px] text-muted-foreground">
                                                Create an Incoming Webhook in your Slack workspace settings and paste the URL here.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Notion */}
                                    <div className="bg-surface/40 border border-border/50 rounded-3xl p-8 shadow-xl shadow-black/5 backdrop-blur-xl space-y-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white border border-border flex items-center justify-center">
                                                <span className="text-black font-bold text-lg font-serif">N</span>
                                            </div>
                                            <div>
                                                <h3 className="text-base font-semibold text-foreground">Notion Native Integration</h3>
                                                <p className="text-xs text-muted-foreground">Push action items directly to your Notion workspace</p>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Internal Integration Token</label>
                                                <input
                                                    type="password"
                                                    placeholder="secret_..."
                                                    defaultValue={localStorage.getItem('notion_api_token') || ''}
                                                    onChange={e => localStorage.setItem('notion_api_token', e.target.value)}
                                                    className="w-full bg-background/60 border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Default Database / Page ID</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. 1a2b3c4d5e6f..."
                                                    defaultValue={localStorage.getItem('notion_page_id') || ''}
                                                    onChange={e => localStorage.setItem('notion_page_id', e.target.value)}
                                                    className="w-full bg-background/60 border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div className="bg-surface/40 border border-border/50 rounded-3xl p-8 shadow-xl shadow-black/5 backdrop-blur-xl space-y-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-sky-600 flex items-center justify-center">
                                                <span className="text-white font-bold text-sm">@</span>
                                            </div>
                                            <div>
                                                <h3 className="text-base font-semibold text-foreground">Email</h3>
                                                <p className="text-xs text-muted-foreground">Share notes via email — opens your default email client</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                            <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                                            <p className="text-sm text-foreground">Email sharing is available on any recording via the <span className="text-primary font-medium">Share & Export</span> button.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'storage' && (
                                <div className="space-y-8">
                                    <div>
                                        <h2 className="text-2xl font-bold tracking-tight text-foreground">Storage & Data</h2>
                                        <p className="text-muted-foreground mt-1 text-sm">Manage disk usage, databases, and large video files.</p>
                                    </div>

                                    {/* Storage Location Card */}
                                    <div className="bg-surface/40 border border-border/50 rounded-3xl p-8 shadow-xl shadow-black/5 backdrop-blur-xl">
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
                                                <div className="bg-background/80 border border-border/50 rounded-xl px-4 py-3 font-mono text-sm text-foreground shadow-inner overflow-x-auto whitespace-nowrap">
                                                    {settings.storageRootPath || 'Default (Documents/BACHAM)'}
                                                </div>
                                            </div>
                                            
                                            <div className="pt-6 border-t border-border/40">
                                                <label className="text-sm font-semibold text-foreground block mb-2">
                                                    Migrate Data
                                                </label>
                                                <div className="flex gap-3">
                                                    <input
                                                        className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all shadow-inner"
                                                        value={newPath}
                                                        onChange={(e) => setNewPath(e.target.value)}
                                                        placeholder="e.g. D:\BACHAM_Vault"
                                                    />
                                                    <button 
                                                        className="px-6 py-3 bg-secondary text-secondary-foreground text-sm font-semibold rounded-xl hover:bg-secondary/80 shadow-sm transition-all active:scale-95 shrink-0" 
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

                                    {/* Breakdown Card */}
                                    <div className="bg-surface/40 border border-border/50 rounded-3xl p-8 shadow-xl shadow-black/5 backdrop-blur-xl">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20 shadow-sm">
                                                    <Database className="w-5 h-5" />
                                                </div>
                                                <h3 className="text-lg font-bold text-foreground">Capacity Breakdown</h3>
                                            </div>
                                            {breakdown && (
                                                <div className="bg-surface border border-border/50 rounded-lg px-4 py-2 text-sm font-bold text-foreground shadow-sm">
                                                    Total: {formatBytes(breakdown.totalBytes)}
                                                </div>
                                            )}
                                        </div>

                                        {breakdown ? (
                                            <div className="space-y-6">
                                                <div className="w-full h-6 rounded-full flex overflow-hidden border border-border/50 shadow-inner bg-background">
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
                                                        <div key={item.label} className="bg-surface/50 border border-border/40 rounded-xl p-3 flex flex-col items-center justify-center text-center">
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
                                    <div className="bg-surface/40 border border-border/50 rounded-3xl p-8 shadow-xl shadow-black/5 backdrop-blur-xl">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20 shadow-sm">
                                                <LayoutList className="w-5 h-5" />
                                            </div>
                                            <h3 className="text-lg font-bold text-foreground">Large Video Assets</h3>
                                        </div>
                                        
                                        <div className="space-y-3">
                                            {lectures.filter(l => !!l.videoPath).length > 0 ? (
                                                lectures.filter(l => !!l.videoPath).map(lecture => (
                                                    <div key={lecture.id} className="group flex items-center justify-between p-4 rounded-2xl border border-border/50 bg-background/50 hover:bg-surface hover:shadow-md transition-all duration-300">
                                                        <div className="min-w-0 flex-1 pr-6">
                                                            <h4 className="text-sm font-bold text-foreground truncate">{lecture.title || 'Untitled Lecture'}</h4>
                                                            <p className="text-xs text-muted-foreground truncate font-mono mt-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                                                {lecture.videoPath}
                                                            </p>
                                                        </div>
                                                        <button 
                                                            onClick={() => handleDeleteVideo(lecture.id)}
                                                            className="p-2.5 rounded-xl bg-destructive/5 text-destructive hover:bg-destructive hover:text-destructive-foreground hover:shadow-lg hover:shadow-destructive/20 transition-all duration-300 flex-shrink-0 active:scale-95"
                                                            title="Delete Video Asset"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border/50 rounded-2xl bg-surface/20">
                                                    <LayoutList className="w-8 h-8 text-muted-foreground/30 mb-3" />
                                                    <p className="text-sm font-medium text-muted-foreground">No heavy video assets found.</p>
                                                    <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs">Your system is clean and free of massive video caches.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {/* Privacy & Learning Data Card */}
                                    <div className="bg-surface/40 border border-border/50 rounded-3xl p-8 shadow-xl shadow-black/5 backdrop-blur-xl">
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
                                                if (confirm('Are you sure you want to reset your local learning history? This will clear study streaks, session positions, and topic mastery profiles.')) {
                                                    await TauriClient.resetLearningHistory();
                                                    alert('Learning history has been reset.');
                                                }
                                            }}
                                            className="px-4 py-2.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl text-xs font-bold hover:bg-destructive hover:text-white transition-all shadow-sm"
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
