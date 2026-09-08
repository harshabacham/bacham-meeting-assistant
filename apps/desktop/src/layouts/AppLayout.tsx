import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '@/shared/stores/appStore';
import { useLectureStore } from '@/shared/stores/lectureStore';
import { useAuthStore } from '@/shared/stores/authStore';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { useModeStore } from '@/shared/stores/modeStore';
import { UserAvatar } from '@/components/ui/UserAvatar';
import ProfileDropdown from '@/components/kokonutui/profile-dropdown';
import {
    Home, Settings as SettingsIcon, User, Database, ChevronLeft, Search, Sidebar, LogOut,
    Library, BrainCircuit, Edit3, Bookmark, Archive, ChevronDown, CheckSquare, Sparkles, Plus, PlugZap,
    MessageSquareHeart
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { cn, CommandPalette } from '@/components';
import { FolderSidebar } from '@/components/library/FolderSidebar';
import { motion, AnimatePresence } from 'framer-motion';

import { useSearchStore } from '@/features/search/searchStore';
import { InlineAIToolbar } from '@/components/command_center/InlineAIToolbar';
import { useFolderStore } from '@/shared/stores/folderStore';

import { GlobalQuickLookModal } from '@/components/command_center/GlobalQuickLookModal';
import { GoogleCalendarSyncModal } from '@/components/dashboard/GoogleCalendarSyncModal';
import { GlobalAskAI } from '@/components/dashboard/GlobalAskAI';
import { TauriClient } from '@/infrastructure/tauri-client';
import { AutoRecordWatcher } from '@/components/AutoRecordWatcher';
import { useFeedbackStore } from '@/shared/stores/feedbackStore';
import { FeedbackModal } from '@/components/feedback/FeedbackModal';

const STUDENT_NAV_ITEMS = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/lectures', label: 'Library', icon: Library },
    { path: '/notes', label: 'Notes', icon: Edit3 },
    { path: '/tasks', label: 'Tasks', icon: CheckSquare },
];

const PRO_NAV_ITEMS = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/lectures', label: 'Meetings', icon: Library },
    { path: '/notes', label: 'Notes', icon: Edit3 },
    { path: '/tasks', label: 'Action Items', icon: CheckSquare },
];


const SETTINGS_NAV_ITEMS = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'ai', label: 'AI & Intelligence', icon: BrainCircuit },
    { id: 'pets', label: 'Pets', icon: Sparkles },
    { id: 'integrations', label: 'Integrations', icon: PlugZap },
    { id: 'storage', label: 'Storage', icon: Database },
    { id: 'feedback', label: 'Feedback & Support', icon: MessageSquareHeart },
];

export function AppLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialize = useAppStore(state => state.initialize);
    const { fetchLectures, systemView, setSystemView, selectedFolderId, setSelectedFolderId } = useLectureStore();
    const { user, signOut } = useAuthStore();
    const { settings: _settings } = useSettingsStore();
    const openSearch = useSearchStore(state => state.open);
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 900);
    const isSettingsRoute = location.pathname.startsWith('/settings');
    const [isFoldersOpen, setIsFoldersOpen] = useState(true);
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const newFolderInputRef = useRef<HTMLInputElement>(null);
    const { createFolder } = useFolderStore();
    const activeSettingsTab = searchParams.get('tab') || 'profile';
    const { appMode } = useModeStore();
    const { openModal: openFeedbackModal } = useFeedbackStore();
    
    const MAIN_NAV_ITEMS = appMode === 'student' ? STUDENT_NAV_ITEMS : PRO_NAV_ITEMS;

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 700) setIsSidebarOpen(false);
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === '1') { e.preventDefault(); navigate('/'); }
                else if (e.key === '2') { e.preventDefault(); navigate('/lectures'); }
                else if (e.key === '3') { e.preventDefault(); navigate('/ai'); }
                else if (e.key === '4') { e.preventDefault(); navigate('/notes'); }
                else if (e.key === 'n' && !e.shiftKey) { e.preventDefault(); navigate('/notes'); }
            }
        };
        window.addEventListener('resize', handleResize);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [navigate]);

    // Auto-navigate to live workspace removed to prevent interrupting the user
    useEffect(() => {
        const unlistenCaption = listen('live_caption_received', () => {
            // No-op
        });

        const unlistenAutoWake = listen('auto_wake_live', async () => {
            // No-op
        });

        return () => {
            unlistenCaption.then(f => f());
            unlistenAutoWake.then(f => f());
        };
    }, []);

    useEffect(() => {
        initialize();
    }, [initialize]);

    useEffect(() => {
        const unlistenPromise = listen('refresh_lectures', () => {
            fetchLectures();
        });
        const handleFocus = () => fetchLectures();
        window.addEventListener('focus', handleFocus);
        return () => {
            unlistenPromise.then(unlisten => unlisten());
            window.removeEventListener('focus', handleFocus);
        };
    }, [fetchLectures, navigate]);

    const isActive = (path: string) => {
        if (path === '/') return location.pathname === '/';
        if (path === '/notes') {
            return location.pathname.startsWith('/notes') && !searchParams.get('folderId') && !selectedFolderId;
        }
        if (path === '/lectures') {
            return location.pathname.startsWith('/lectures') && !searchParams.get('view') && !selectedFolderId;
        }
        return location.pathname.startsWith(path);
    };

    const handleSignOut = async () => {
        try {
            await signOut();
            navigate('/auth');
        } catch (error) {
            console.error("Logout failed", error);
        }
    };
    
    return (
        <div className="flex h-screen w-full overflow-hidden bg-background text-foreground font-sans selection:bg-primary/20 relative z-0">
            <AutoRecordWatcher />
            {/* Invisible Drag Region across the very top */}
            <div data-tauri-drag-region className="absolute top-0 left-0 right-0 h-8 z-[5] pointer-events-auto" />

            {/* Native-style Window Controls (Top Right) */}
            <div className="absolute top-0 right-0 h-12 z-[100] flex items-center justify-end pr-6">
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => TauriClient.minimize()} 
                        className="w-3 h-3 rounded-full bg-[var(--text-muted)]/25 hover:bg-[var(--text-secondary)]/50 transition-all active:scale-90 cursor-pointer" 
                        title="Minimize" 
                    />
                    <button 
                        onClick={() => TauriClient.maximize()} 
                        className="w-3 h-3 rounded-full bg-[var(--text-muted)]/25 hover:bg-[var(--text-secondary)]/50 transition-all active:scale-90 cursor-pointer" 
                        title="Maximize" 
                    />
                    <button 
                        onClick={() => TauriClient.close()} 
                        className="w-3 h-3 rounded-full bg-[var(--text-muted)]/25 hover:bg-rose-500/80 transition-all active:scale-90 cursor-pointer" 
                        title="Close" 
                    />
                </div>
            </div>
            {/* Global Ambient Background Effects (Dark Mode Only) */}
            <div className="hidden dark:block absolute inset-0 bg-gradient-to-br from-transparent to-surface-raised/50 z-[-1] pointer-events-none" />
            
            {/* Subtle Grain Texture (Dark Mode Only) */}
            <div 
                className="hidden dark:block absolute inset-0 z-[-1] pointer-events-none opacity-[0.04]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                }}
            />
            
            <CommandPalette />
            
            {/* Sidebar */}
            <AnimatePresence initial={false}>
                {isSidebarOpen && (
                    <motion.aside 
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 200, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 350, damping: 38, mass: 0.8 }}
                        className="bg-[var(--sidebar-bg)] shrink-0 flex flex-col z-[100] relative overflow-hidden border-r border-border h-full"
                    >
                        {/* Sidebar close button aligned with window controls */}
                        <div className="absolute top-0 right-0 h-12 w-14 flex items-center justify-end pr-3 z-50">
                            <button 
                                onClick={() => setIsSidebarOpen(false)}
                                className="p-1 rounded text-muted-foreground/50 hover:text-foreground hover:bg-surface-hover transition-colors"
                                title="Close Sidebar"
                            >
                                <Sidebar size={13} strokeWidth={2} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto flex flex-col px-2 pt-12 pb-2 scrollbar-hide gap-0.5">
                            <AnimatePresence mode="wait">
                                {isSettingsRoute ? (
                                    <motion.div 
                                        key="settings-nav"
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                        className="flex-1 flex flex-col gap-1"
                                    >
                                        <button 
                                            onClick={() => navigate('/')}
                                            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors mb-2"
                                        >
                                            <ChevronLeft size={13} /> Back
                                        </button>

                                        <div className="flex flex-col items-center text-center pb-3">
                                            <div className="w-10 h-10 rounded-full overflow-hidden mb-2 border border-border">
                                                <UserAvatar photoURL={user?.photoURL} email={user?.email} className="w-full h-full" />
                                            </div>
                                            <p className="text-[12px] font-semibold text-foreground truncate w-full">{user?.displayName || 'User'}</p>
                                            <p className="text-[10px] text-muted-foreground truncate w-full">{user?.email}</p>
                                        </div>
                                        
                                        <nav className="space-y-0.5 flex-1">
                                            {SETTINGS_NAV_ITEMS.map((item) => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => setSearchParams({ tab: item.id })}
                                                    className={cn(
                                                        "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors text-[11.5px] font-medium border",
                                                        activeSettingsTab === item.id 
                                                            ? "bg-[#E6E5DC] text-[#1C1C1A] border-transparent dark:bg-white/[0.08] dark:text-white dark:border-white/5 font-medium" 
                                                            : "text-muted-foreground border-transparent hover:bg-black/5 dark:hover:bg-white/[0.05] hover:text-foreground dark:hover:text-white"
                                                    )}
                                                >
                                                    <item.icon size={13} strokeWidth={2} />
                                                    {item.label}
                                                </button>
                                            ))}
                                        </nav>

                                        <button 
                                            onClick={handleSignOut}
                                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium text-destructive hover:bg-destructive/10 transition-colors mt-2"
                                        >
                                            <LogOut size={13} strokeWidth={2} />
                                            Sign out
                                        </button>
                                    </motion.div>
                                ) : (
                                    <motion.div 
                                        key="main-nav"
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                        className="flex-1 flex flex-col"
                                    >
                                        {/* Search */}
                                        <button 
                                            className="w-full flex items-center justify-between px-2.5 py-1.5 mb-2 rounded-lg text-[11.5px] text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors"
                                            onClick={() => openSearch()}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Search size={12} />
                                                <span>Search</span>
                                            </div>
                                            <kbd className="text-[9px] font-mono opacity-40 bg-muted/50 px-1 py-0.5 rounded border border-border/50">⌘K</kbd>
                                        </button>

                                        {/* Primary nav */}
                                        <nav className="space-y-0.5">
                                            {MAIN_NAV_ITEMS.map(item => (
                                                <Link 
                                                    key={item.path}
                                                    to={item.path}
                                                    className="block rounded-lg outline-none"
                                                    onClick={() => {
                                                        setSystemView('all');
                                                        setSelectedFolderId(null);
                                                    }}
                                                >
                                                    <div className={cn(
                                                        'relative flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium transition-colors border',
                                                        isActive(item.path) 
                                                            ? 'bg-[#E6E5DC] text-[#1C1C1A] border-transparent dark:bg-white/[0.08] dark:text-white dark:border-white/5 font-medium' 
                                                            : 'text-muted-foreground border-transparent hover:bg-black/5 dark:hover:bg-white/[0.05] hover:text-foreground dark:hover:text-white'
                                                    )}>
                                                        <item.icon size={13} strokeWidth={2} />
                                                        <span>{item.label}</span>
                                                    </div>
                                                </Link>
                                            ))}
                                        </nav>

                                        <div className="h-px bg-border/40 mx-1 my-3" />

                                        {/* Secondary nav */}
                                        <nav className="space-y-0.5">
                                            {[
                                                { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
                                                { id: 'archive', label: 'Archive', icon: Archive },
                                            ].map(item => {
                                                const active = location.pathname === '/lectures' && searchParams.get('view') === item.id;
                                                return (
                                                    <Link key={item.id} to={`/lectures?view=${item.id}`} className="block rounded-lg outline-none">
                                                        <div className={cn(
                                                            'relative flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium transition-colors border',
                                                            active 
                                                                ? 'bg-[#E6E5DC] text-[#1C1C1A] border-transparent dark:bg-white/[0.08] dark:text-white dark:border-white/5 font-medium' 
                                                                : 'text-muted-foreground border-transparent hover:bg-black/5 dark:hover:bg-white/[0.05] hover:text-foreground dark:hover:text-white'
                                                        )} onClick={() => { setSelectedFolderId(null); if (item.id === 'archive') setSystemView('archive'); else setSystemView('all'); }}>
                                                            <item.icon size={13} strokeWidth={2} />
                                                            <span>{item.label}</span>
                                                        </div>
                                                    </Link>
                                                );
                                            })}
                                        </nav>

                                        <div className="h-px bg-border/40 mx-1 my-3" />

                                        {/* Folders section */}
                                        <div className="flex-1 flex flex-col min-h-0">
                                            <div className="flex items-center justify-between px-2.5 mb-1.5">
                                                <button
                                                    onClick={() => setIsFoldersOpen(v => !v)}
                                                    className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                                                >
                                                    <ChevronDown size={11} className={cn("transition-transform duration-200", !isFoldersOpen && "-rotate-90")} />
                                                    Folders
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setIsFoldersOpen(true);
                                                        setIsCreatingFolder(true);
                                                        setNewFolderName('');
                                                        setTimeout(() => newFolderInputRef.current?.focus(), 50);
                                                    }}
                                                    className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground/50 hover:text-foreground hover:bg-surface-hover transition-colors"
                                                    title="New Folder"
                                                >
                                                    <Plus size={12} />
                                                </button>
                                            </div>

                                            {isFoldersOpen && (
                                                <div className="flex-1 overflow-y-auto scrollbar-hide -mx-1">
                                                    {isCreatingFolder && (
                                                        <div className="px-2 pb-1">
                                                            <input
                                                                ref={newFolderInputRef}
                                                                value={newFolderName}
                                                                onChange={e => setNewFolderName(e.target.value)}
                                                                onBlur={async () => {
                                                                    if (newFolderName.trim()) {
                                                                        try { await createFolder(newFolderName.trim()); }
                                                                        catch(err: any) { console.error('Create folder failed', err); }
                                                                    }
                                                                    setIsCreatingFolder(false);
                                                                    setNewFolderName('');
                                                                }}
                                                                onKeyDown={e => {
                                                                    if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
                                                                    if (e.key === 'Escape') { e.preventDefault(); setIsCreatingFolder(false); setNewFolderName(''); }
                                                                }}
                                                                className="w-full h-8 px-2.5 mt-1 text-xs rounded-md bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] focus:bg-[var(--surface-raised)] transition-all"
                                                                placeholder="Folder name…"
                                                            />
                                                        </div>
                                                    )}
                                                    <FolderSidebar
                                                        systemView={systemView}
                                                        setSystemView={(view) => {
                                                            setSystemView(view);
                                                            setSelectedFolderId(null);
                                                            if (view === 'trash' || view === 'archive') {
                                                                navigate(`/lectures?view=${view}`);
                                                            } else {
                                                                navigate('/notes');
                                                            }
                                                        }}
                                                        selectedFolderId={selectedFolderId}
                                                        onSelectFolder={(id) => {
                                                            setSystemView('all');
                                                            setSelectedFolderId(id);
                                                            navigate(`/notes?folderId=${encodeURIComponent(id)}`);
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Footer — feedback & profile */}
                        {!isSettingsRoute && (
                            <div className="px-2 pb-3 pt-2 shrink-0 border-t border-border/40 space-y-1.5">
                                <button
                                    type="button"
                                    onClick={() => openFeedbackModal()}
                                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/[0.05] transition-colors border border-transparent hover:border-border/50 cursor-pointer"
                                    title="Share feedback or report an issue"
                                >
                                    <div className="flex items-center gap-2">
                                        <MessageSquareHeart size={14} className="text-[#1C1C1A] dark:text-[#BAFF29]" />
                                        <span>Give Feedback</span>
                                    </div>
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-[rgba(186,255,41,0.12)] text-[#1C1C1A] dark:text-[#BAFF29] border border-black/10 dark:border-[rgba(186,255,41,0.25)]">
                                        v1.0.0
                                    </span>
                                </button>
                                <ProfileDropdown className="w-full" />
                            </div>
                        )}
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Floating Re-open Button when Sidebar is Closed */}
            {!isSidebarOpen && (
                <div className="absolute top-0 left-0 h-16 w-16 flex items-center justify-start pl-4 z-[100]">
                    <button
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-[var(--surface-hover)] transition-colors border border-border/50 bg-[var(--surface)]/50 backdrop-blur-md shadow-sm"
                        onClick={() => setIsSidebarOpen(true)}
                        title="Open Sidebar"
                    >
                        <Sidebar size={14} strokeWidth={2.5} />
                    </button>
                </div>
            )}

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 bg-background relative z-10 transition-all duration-300">
                <Outlet />
            </main>

            {/* AI Learning Command Center Components */}
            <InlineAIToolbar />
            <GlobalQuickLookModal />
            <GoogleCalendarSyncModal />
            <GlobalAskAI />
            <FeedbackModal />

            {/* Global Styles for FolderTree override */}
            <style>{`
                .custom-folder-tree > div {
                    width: 100% !important;
                    background: transparent !important;
                    border: none !important;
                    padding: 0 !important;
                }
                .custom-folder-tree > div > div.p-3 {
                    padding: 0 !important;
                    border: none !important;
                }
                .custom-folder-tree .border-b {
                    border-bottom: none !important;
                }
                .custom-folder-tree button, .custom-folder-tree .flex.items-center.group {
                    font-size: 12px !important;
                    font-weight: 500 !important;
                    color: var(--text-muted) !important;
                    background: transparent !important;
                    padding-left: 10px !important;
                    padding-right: 10px !important;
                    padding-top: 6px !important;
                    padding-bottom: 6px !important;
                    border-radius: 8px !important;
                }
                .custom-folder-tree button:hover, .custom-folder-tree .flex.items-center.group:hover {
                    background-color: var(--surface-hover) !important;
                    color: var(--text-primary) !important;
                }
                .custom-folder-tree button.bg-accent\\/10, .custom-folder-tree .bg-accent\\/10 {
                    background-color: hsla(var(--primary), 0.1) !important;
                    color: hsl(var(--primary)) !important;
                }
                .custom-folder-tree svg {
                    color: inherit !important;
                    width: 14px !important;
                    height: 14px !important;
                    stroke-width: 2.5 !important;
                }
                .custom-folder-tree .bg-surface {
                    background: transparent !important;
                }
                /* Hide top filter buttons in folder tree since we integrated them cleanly */
                .custom-folder-tree > div > div:first-child {
                    display: none !important;
                }
                .custom-folder-tree > div > div.px-4.py-4 {
                    display: none !important;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}
