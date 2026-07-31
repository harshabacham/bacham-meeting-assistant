import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '@/shared/stores/appStore';
import { useLectureStore } from '@/shared/stores/lectureStore';
import { useAuthStore } from '@/shared/stores/authStore';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { UserAvatar } from '@/components/ui/UserAvatar';
import ProfileDropdown from '@/components/kokonutui/profile-dropdown';
import {
    Home, Settings as SettingsIcon, User, Database, ChevronLeft, Search, Sidebar, LogOut,
    Library, BrainCircuit, Edit3, BookOpen, Bookmark, Clock, Archive, ChevronDown, ChevronRight, Sparkles, CheckSquare, Radio
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { cn, CommandPalette } from '@/components';
import { FolderSidebar } from '@/components/library/FolderSidebar';
import { motion, AnimatePresence } from 'framer-motion';

import { useSearchStore } from '@/features/search/searchStore';
import { InlineAIToolbar } from '@/components/command_center/InlineAIToolbar';
import { GlobalQuickLookModal } from '@/components/command_center/GlobalQuickLookModal';
import { LiveWingman } from '@/components/ui/LiveWingman';

const MAIN_NAV_ITEMS = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/lectures', label: 'Library', icon: Library },
    { path: '/notes', label: 'Notes', icon: Edit3 },
    { path: '/tasks', label: 'Tasks', icon: CheckSquare },
    { path: '/live', label: 'Live Meeting', icon: Radio },
];

const SETTINGS_NAV_ITEMS = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'integrations', label: 'Integrations', icon: BrainCircuit },
    { id: 'storage', label: 'Storage', icon: Database },
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
    const activeSettingsTab = searchParams.get('tab') || 'profile';

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
    }, [fetchLectures]);

    const isActive = (path: string) => {
        if (path === '/') return location.pathname === '/';
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
            {/* Global Ambient Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-surface-raised/50 z-[-1] pointer-events-none" />
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none z-[-1]" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none z-[-1]" />
            
            {/* Subtle Grain Texture */}
            <div 
                className="absolute inset-0 z-[-1] pointer-events-none opacity-[0.04]"
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
                        animate={{ width: 240, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 350, damping: 38, mass: 0.8 }}
                        className="bg-surface/80 shrink-0 flex flex-col z-20 relative overflow-hidden border-r border-border/50 backdrop-blur-xl h-full"
                    >
                        {/* Content Area (Contextual) */}
                        <div className="flex-1 overflow-y-auto flex flex-col relative px-3 py-4 scrollbar-hide">
                            
                            {/* Top Left Toggle Button (Always visible when open) */}
                            <div className="mb-4 flex justify-between items-center px-1">
                                <button 
                                    onClick={() => setIsSidebarOpen(false)}
                                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors border border-border/50"
                                >
                                    <Sidebar size={14} strokeWidth={2.5} />
                                </button>
                                
                                {isSettingsRoute && (
                                    <button 
                                        onClick={() => navigate('/')}
                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-foreground transition-colors bg-surface shadow-sm border border-border"
                                    >
                                        <ChevronLeft size={12} /> Home
                                    </button>
                                )}
                            </div>

                            <AnimatePresence mode="wait">
                                {isSettingsRoute ? (
                                    <motion.div 
                                        key="settings-nav"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                        className="flex-1 flex flex-col space-y-6"
                                    >
                                        {/* Centered Profile Header */}
                                        <div className="flex flex-col items-center text-center mt-0 mb-0">
                                            <div className="w-14 h-14 rounded-full overflow-hidden mb-3 border border-border shadow-sm">
                                                <UserAvatar photoURL={user?.photoURL} email={user?.email} className="w-full h-full" />
                                            </div>
                                            <h2 className="text-sm font-semibold text-foreground mb-0.5">
                                                {user?.displayName || 'User'}
                                            </h2>
                                            <p className="text-[11px] text-muted-foreground font-medium">
                                                {user?.email}
                                            </p>
                                        </div>
                                        
                                        <nav className="space-y-0.5 w-full">
                                            {SETTINGS_NAV_ITEMS.map((item) => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => setSearchParams({ tab: item.id })}
                                                    className={cn(
                                                        "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors duration-200 outline-none group text-[12px] font-medium",
                                                        activeSettingsTab === item.id 
                                                            ? "bg-primary/10 text-primary" 
                                                            : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                                                    )}
                                                >
                                                    <item.icon size={14} strokeWidth={2.5} className={activeSettingsTab === item.id ? "text-primary" : "text-muted-foreground"} />
                                                    {item.label}
                                                </button>
                                            ))}
                                        </nav>
                                    </motion.div>
                                ) : (
                                    <motion.div 
                                        key="main-nav"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                        className="flex-1 flex flex-col space-y-4"
                                    >
                                        {/* Search Bar */}
                                        <button 
                                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-border/50 bg-background/40 hover:bg-[var(--overlay-hover)] hover:border-border transition-all duration-150 group cursor-text focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                            onClick={() => openSearch()}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Search size={13} className="text-muted-foreground/70" />
                                                <span className="text-[12px] text-muted-foreground/70">Search</span>
                                            </div>
                                            <kbd className="text-[10px] font-mono text-muted-foreground/50 bg-muted/50 px-1.5 py-0.5 rounded border border-border/50">⌘K</kbd>
                                        </button>

                                        <nav className="space-y-0.5">
                                            {MAIN_NAV_ITEMS.map(item => (
                                                <Link 
                                                    key={item.path} 
                                                    to={item.path} 
                                                    className="block outline-none rounded-lg focus-visible:ring-2 focus-visible:ring-ring"
                                                    onClick={() => {
                                                        if (item.path === '/lectures') {
                                                            setSystemView('all');
                                                            setSelectedFolderId(null);
                                                        }
                                                    }}
                                                >
                                                    <div 
                                                        className={cn(
                                                            'relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] font-medium transition-all duration-150',
                                                            isActive(item.path)
                                                                ? 'bg-primary/10 text-primary'
                                                                : 'text-muted-foreground hover:bg-[var(--overlay-hover)] hover:text-foreground'
                                                        )}
                                                    >
                                                        {isActive(item.path) && (
                                                            <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary" aria-hidden="true" />
                                                        )}
                                                        <item.icon size={14} strokeWidth={2} className={cn(
                                                            'transition-colors duration-150',
                                                            isActive(item.path) ? 'text-primary' : 'text-muted-foreground'
                                                        )} />
                                                        <span>{item.label}</span>
                                                    </div>
                                                </Link>
                                            ))}
                                        </nav>
                                        
                                        <div className="h-px bg-border/30 mx-2 my-1" />

                                        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/50 px-3 mb-1 select-none">Library</p>

                                        <nav className="space-y-0.5">
                                            {[
                                                { id: 'subjects', label: 'Subjects', icon: BookOpen },
                                                { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
                                                { id: 'recent', label: 'Recent', icon: Clock },
                                                { id: 'archive', label: 'Archive', icon: Archive },
                                            ].map(item => (
                                                <Link key={item.id} to={`/lectures?view=${item.id}`} className="block outline-none rounded-lg focus-visible:ring-2 focus-visible:ring-ring">
                                                    <div 
                                                        className={cn(
                                                            'relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] font-medium transition-all duration-150',
                                                            location.pathname === '/lectures' && searchParams.get('view') === item.id
                                                                ? 'bg-primary/10 text-primary'
                                                                : 'text-muted-foreground hover:bg-[var(--overlay-hover)] hover:text-foreground'
                                                        )}
                                                        onClick={() => {
                                                            setSelectedFolderId(null);
                                                            if (item.id === 'trash') setSystemView('trash');
                                                            else if (item.id === 'archive') setSystemView('archive');
                                                            else setSystemView('all');
                                                        }}
                                                    >
                                                        {(location.pathname === '/lectures' && searchParams.get('view') === item.id) && (
                                                            <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary" aria-hidden="true" />
                                                        )}
                                                        <item.icon size={14} strokeWidth={2} className={cn(
                                                            'transition-colors duration-150',
                                                            (location.pathname === '/lectures' && searchParams.get('view') === item.id) ? 'text-primary' : 'text-muted-foreground'
                                                        )} />
                                                        <span>{item.label}</span>
                                                    </div>
                                                </Link>
                                            ))}
                                        </nav>



                                        <div className="flex-1 mt-4">
                                            <button 
                                                onClick={() => setIsFoldersOpen(!isFoldersOpen)}
                                                className="w-full px-2.5 mb-1 flex items-center gap-1.5 text-left hover:text-foreground transition-colors group outline-none"
                                            >
                                                {isFoldersOpen ? (
                                                    <ChevronDown size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                                                ) : (
                                                    <ChevronRight size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                                                )}
                                                <span className="text-[11px] font-bold text-muted-foreground group-hover:text-foreground transition-colors uppercase tracking-wider">Folders</span>
                                            </button>
                                            
                                            {/* We embed FolderSidebar but override styling heavily */}
                                            {isFoldersOpen && (
                                                <div className="custom-folder-tree animate-in fade-in slide-in-from-top-1 duration-200">
                                                    <FolderSidebar 
                                                        systemView={systemView} 
                                                        setSystemView={(view) => {
                                                            setSystemView(view);
                                                            setSelectedFolderId(null);
                                                            navigate('/lectures');
                                                        }}
                                                        selectedFolderId={selectedFolderId}
                                                        onSelectFolder={(id) => {
                                                            setSystemView('all');
                                                            setSelectedFolderId(id);
                                                            navigate('/lectures');
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Footer Section */}
                        <div className="px-3 pb-4 pt-2 mt-auto shrink-0 flex flex-col gap-1.5">
                            {isSettingsRoute ? (
                                <button 
                                    onClick={handleSignOut}
                                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors text-destructive hover:bg-destructive/10 outline-none"
                                >
                                    <LogOut size={14} strokeWidth={2.5} />
                                    <span>Sign out</span>
                                </button>
                            ) : (
                                <>
                                    {/* Profile Summary block */}
                                    <ProfileDropdown className="w-full mt-1" />
                                </>
                            )}
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Collapsed Sidebar Handle */}
            {!isSidebarOpen && (
                <div className="flex flex-col items-center py-3 shrink-0 w-14 transition-all z-20 border-r border-border/50 bg-surface/80 backdrop-blur-xl">
                    <button
                        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-[var(--overlay-hover)] transition-all duration-150 mb-3"
                        onClick={() => setIsSidebarOpen(true)}
                        title="Expand Sidebar"
                    >
                        <Sidebar size={15} strokeWidth={2} />
                    </button>
                    
                    <div className="flex flex-col gap-1 w-full items-center px-2">
                        {MAIN_NAV_ITEMS.map(item => (
                            <Link 
                                key={item.path} 
                                to={item.path} 
                                className="outline-none w-full rounded-lg focus-visible:ring-2 focus-visible:ring-ring" 
                                title={item.label}
                                onClick={() => {
                                    if (item.path === '/lectures') {
                                        setSystemView('all');
                                        setSelectedFolderId(null);
                                    }
                                }}
                            >
                                <div className={cn(
                                    "relative flex justify-center p-2 rounded-lg transition-all duration-150 cursor-pointer w-full",
                                    isActive(item.path) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-[var(--overlay-hover)] hover:text-foreground"
                                )}>
                                    {isActive(item.path) && (
                                        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary" aria-hidden="true" />
                                    )}
                                    <item.icon size={15} strokeWidth={2} />
                                </div>
                            </Link>
                        ))}
                    </div>
                    
                    <div className="mt-auto mb-2 w-full px-2">
                        <ProfileDropdown collapsed={true} className="w-full flex justify-center" />
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 bg-background relative z-10 transition-all duration-300">
                <Outlet />
            </main>

            {/* AI Learning Command Center Components */}
            <InlineAIToolbar />
            <GlobalQuickLookModal />
            <LiveWingman />

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
