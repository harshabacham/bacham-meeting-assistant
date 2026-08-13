import { useState, useEffect } from 'react';
import { TauriClient } from '@/infrastructure/tauri-client';
import { Conversation, ChatScope } from '../types';
import { Plus, Search, Settings, X, Star, Pencil, Trash2 } from 'lucide-react';
import { ProviderSettings } from './ProviderSettings';
import { cn } from '@/components';
import { useConfirmStore } from '@/components/ui/ConfirmProvider';

interface WorkspaceSidebarProps {
    onSelectConversation: (conv: Conversation) => void;
    selectedId?: string;
    onCreateNew: (scope: ChatScope) => void;
}

export function WorkspaceSidebar({ onSelectConversation, selectedId, onCreateNew }: WorkspaceSidebarProps) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'pinned'>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const { showConfirm } = useConfirmStore();

    useEffect(() => {
        loadConversations();
    }, []);

    const loadConversations = async () => {
        setIsLoading(true);
        try {
            // For now, we fetch all and filter client side or pass scopeType
            const results = await TauriClient.listConversations();
            setConversations(results || []);
        } catch (e) {
            console.error('Failed to load conversations:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateNew = () => {
        const scope: ChatScope = 'library'; // Default to library scope for "New" until scope picker is built
        onCreateNew(scope);
    };

    return (
        <div className="w-[260px] shrink-0 bg-[var(--bg)] flex flex-col h-full border-r border-white/[0.02]">
            <div className="p-6 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                        Workspace
                    </h2>
                    <button 
                        onClick={handleCreateNew}
                        title="New Chat"
                        className="p-1.5 text-[var(--text-muted)] hover:text-white hover:bg-white/5 rounded-md transition-all"
                    >
                        <Plus size={16} strokeWidth={2.5} />
                    </button>
                </div>
                
                {/* Filters & Search */}
                <div className="flex flex-col gap-3">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input 
                            type="text" 
                            placeholder="Search chats..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-surface/50 border border-border/50 rounded-lg pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                        />
                    </div>
                    <div className="flex bg-surface/50 rounded-lg p-1 border border-border/50">
                        <button 
                            onClick={() => setActiveFilter('all')}
                            className={cn("flex-1 text-[11px] py-1 rounded flex items-center justify-center gap-1.5 transition-all font-medium", 
                            activeFilter === 'all' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                        >
                            All
                        </button>
                        <button 
                            onClick={() => setActiveFilter('pinned')}
                            className={cn("flex-1 text-[11px] py-1 rounded flex items-center justify-center gap-1.5 transition-all font-medium", 
                            activeFilter === 'pinned' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                        >
                            <Star size={12} className={activeFilter === 'pinned' ? "fill-primary text-primary" : ""} /> Pinned
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-0.5">
                {isLoading ? (
                    <div className="p-4 text-center text-xs text-[var(--text-muted)] animate-pulse">Loading...</div>
                ) : conversations.length === 0 ? (
                    <div className="p-4 text-center text-[13px] text-[var(--text-muted)] mt-10">
                        No conversations found
                    </div>
                ) : (
                    conversations
                        .filter(conv => activeFilter === 'all' || conv.isFavorite)
                        .filter(conv => !searchQuery || conv.title.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map(conv => (
                        <div key={conv.id} className="relative group">
                            <button
                                onClick={() => onSelectConversation(conv)}
                                className={cn(
                                    "w-full text-left px-3 py-2.5 rounded-xl text-[13px] truncate transition-all flex items-center gap-3 border border-transparent",
                                    selectedId === conv.id 
                                        ? "bg-white/[0.04] text-white border-white/[0.02]" 
                                        : "text-[var(--text-secondary)] hover:bg-white/[0.02] hover:text-white"
                                )}
                            >
                                <div className="flex flex-col flex-1 min-w-0 pr-6">
                                    <span className="truncate font-medium">{conv.title}</span>
                                </div>
                            </button>
                            
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                                <button
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        await TauriClient.toggleConversationFavorite(conv.id);
                                        loadConversations();
                                    }}
                                    className="p-1.5 rounded-md hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--warning)] transition-colors"
                                    title={conv.isFavorite ? "Unfavorite" : "Favorite"}
                                >
                                    <Star size={13} className={conv.isFavorite ? "fill-current text-[var(--warning)]" : ""} />
                                </button>
                                <button
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        const newTitle = prompt("Rename conversation:", conv.title);
                                        if (newTitle && newTitle !== conv.title) {
                                            await TauriClient.renameConversation(conv.id, newTitle);
                                            loadConversations();
                                        }
                                    }}
                                    className="p-1.5 rounded-md hover:bg-white/10 text-[var(--text-muted)] hover:text-white transition-colors"
                                >
                                    <Pencil size={13} />
                                </button>
                                <button
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        const ok = await showConfirm("Are you sure you want to delete this conversation?");
                                        if (ok) {
                                            await TauriClient.deleteConversation(conv.id);
                                            loadConversations();
                                        }
                                    }}
                                    className="p-1.5 rounded-md hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--error)] transition-colors"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 mt-auto">
                <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="flex items-center gap-2 w-full px-4 py-3 text-[13px] text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.03] rounded-xl transition-all"
                >
                    <Settings size={15} />
                    AI Provider Settings
                </button>
            </div>

            {isSettingsOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-[#111111] border border-white/[0.05] rounded-[24px] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-white/[0.05] flex justify-between items-center sticky top-0 bg-[#111111]/80 backdrop-blur-xl z-10">
                            <h2 className="text-[15px] font-semibold text-white">AI Provider Settings</h2>
                            <button 
                                onClick={() => setIsSettingsOpen(false)}
                                className="text-[var(--text-muted)] hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-8">
                            <ProviderSettings />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
