import { useState, useEffect, useRef, useCallback } from 'react';
import { TauriClient, ChatChunkEvent } from '@/infrastructure/tauri-client';
import { Conversation, ChatScope, MessageReference } from './types';
import { ParsedModelContent } from '@/components/workspace/chat/ParsedModelContent';
import { cn } from '@/components';
import { useAuthStore } from '@/shared/stores/authStore';
import {
    Plus, Search, MessageSquare, Star, Trash2, Pencil,
    Send, Loader2, BrainCircuit, BookOpen, Play, FileText,
    Image as ImageIcon, Clock, Database,
    Activity, ChevronRight, X,
    Sparkles, Zap, PenTool, CheckSquare, LayoutTemplate,
    Pin, SidebarOpen, SidebarClose,
} from 'lucide-react';
import { WaveLoader } from '@/components';
import { PromptLibrary } from './components/PromptLibrary';
import { ContextSelectorModal } from './components/ContextSelectorModal';
import type { ChatMessage } from '@/shared/types';

type WorkspaceChatMessage = ChatMessage & { references?: MessageReference[]; followups?: string[] };

// ─── Quick action recipes ──────────────────────────────────────────────────
const QUICK_ACTIONS = [
    { icon: Sparkles, text: 'Summarize this lecture', color: 'text-violet-400' },
    { icon: BrainCircuit, text: 'List key concepts', color: 'text-blue-400' },
    { icon: CheckSquare, text: 'Generate a quiz', color: 'text-green-400' },
    { icon: PenTool, text: 'Create study notes', color: 'text-orange-400' },
    { icon: Zap, text: 'Explain this formula', color: 'text-yellow-400' },
    { icon: LayoutTemplate, text: 'Create a cheat sheet', color: 'text-pink-400' },
];

// ─── Main Page ─────────────────────────────────────────────────────────────
export function AiWorkspacePage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [activeReference, setActiveReference] = useState<MessageReference | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [contextOpen, setContextOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'pinned'>('all');
    const [isLoadingConvs, setIsLoadingConvs] = useState(true);
    
    // Context Selection State
    const [showContextModal, setShowContextModal] = useState(false);
    const [contextModalMode, setContextModalMode] = useState<'create' | 'change'>('create');

    const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

    const loadConversations = useCallback(async () => {
        setIsLoadingConvs(true);
        try {
            const results = await TauriClient.listConversations();
            setConversations(results || []);
        } catch (e) {
            console.error('Failed to load conversations:', e);
        } finally {
            setIsLoadingConvs(false);
        }
    }, []);

    useEffect(() => { loadConversations(); }, [loadConversations]);

    const handleCreateNew = (initialPrompt?: string) => {
        if (isCreating) return;
        if (initialPrompt) setPendingPrompt(initialPrompt);
        else setPendingPrompt(null);
        
        setContextModalMode('create');
        setShowContextModal(true);
    };

    const handleContextSelect = async (scope: ChatScope) => {
        setShowContextModal(false);
        setIsCreating(true);
        try {
            if (contextModalMode === 'create') {
                const newConv = await TauriClient.createConversation(scope, 'New Conversation');
                setSelectedConversation(newConv);
                setActiveReference(null);
            } else if (contextModalMode === 'change' && selectedConversation) {
                await TauriClient.changeConversationScope(selectedConversation.id, scope);
                const updatedConvs = await TauriClient.listConversations();
                setConversations(updatedConvs || []);
                const updatedSelected = updatedConvs.find((c: any) => c.id === selectedConversation.id);
                if (updatedSelected) {
                    setSelectedConversation(updatedSelected);
                }
            }
            await loadConversations();
        } catch (e) {
            console.error('Failed to handle context selection', e);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Delete this conversation?')) return;
        await TauriClient.deleteConversation(id);
        if (selectedConversation?.id === id) setSelectedConversation(null);
        loadConversations();
    };

    const handlePin = async (conv: Conversation, e: React.MouseEvent) => {
        e.stopPropagation();
        await TauriClient.toggleConversationFavorite(conv.id);
        loadConversations();
    };

    const handleRename = async (conv: Conversation, e: React.MouseEvent) => {
        e.stopPropagation();
        const newTitle = prompt('Rename conversation:', conv.title);
        if (newTitle && newTitle !== conv.title) {
            await TauriClient.renameConversation(conv.id, newTitle);
            loadConversations();
        }
    };

    const filteredConvs = conversations
        .filter(c => activeFilter === 'all' || c.isFavorite)
        .filter(c => !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase()));

    const pinnedConvs = filteredConvs.filter(c => c.isFavorite);
    const recentConvs = filteredConvs.filter(c => !c.isFavorite);

    return (
        <div className="flex h-full w-full bg-background overflow-hidden">
            {/* ─── LEFT SIDEBAR ─── */}
            <div className={cn(
                'shrink-0 flex flex-col h-full border-r border-border bg-surface transition-all duration-300 overflow-hidden',
                sidebarOpen ? 'w-[280px]' : 'w-0'
            )}>
                {sidebarOpen && (
                    <div className="flex flex-col h-full w-[280px]">
                        {/* Sidebar Header */}
                        <div className="px-4 pt-5 pb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <BrainCircuit size={15} className="text-primary" />
                                </div>
                                <span className="text-sm font-bold text-foreground">AI Workspace</span>
                            </div>
                            <button
                                onClick={() => handleCreateNew()}
                                disabled={isCreating}
                                className="p-1.5 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                                title="New Chat"
                            >
                                {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                            </button>
                        </div>

                        {/* Search */}
                        <div className="px-4 pb-3">
                            <div className="relative">
                                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search conversations..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Filter Tabs */}
                        <div className="px-4 pb-3">
                            <div className="flex bg-background rounded-lg p-0.5 border border-border">
                                <button
                                    onClick={() => setActiveFilter('all')}
                                    className={cn('flex-1 text-[11px] py-1 rounded font-semibold transition-all',
                                        activeFilter === 'all' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                                >All</button>
                                <button
                                    onClick={() => setActiveFilter('pinned')}
                                    className={cn('flex-1 text-[11px] py-1 rounded font-semibold transition-all flex items-center justify-center gap-1',
                                        activeFilter === 'pinned' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                                >
                                    <Star size={10} /> Pinned
                                </button>
                            </div>
                        </div>

                        {/* Conversation List */}
                        <div className="flex-1 overflow-y-auto px-2 pb-4">
                            {isLoadingConvs ? (
                                <div className="flex flex-col gap-2 px-2 mt-2">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="h-10 rounded-lg bg-border/30 animate-pulse" />
                                    ))}
                                </div>
                            ) : filteredConvs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4 pb-12">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <MessageSquare size={18} className="text-primary/60" />
                                    </div>
                                    <p className="text-xs text-muted-foreground font-medium">No conversations yet.<br />Start a new chat above.</p>
                                </div>
                            ) : (
                                <>
                                    {pinnedConvs.length > 0 && (
                                        <div className="mb-3">
                                            <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                                <Pin size={9} /> Pinned
                                            </div>
                                            {pinnedConvs.map(conv => (
                                                <ConvItem
                                                    key={conv.id}
                                                    conv={conv}
                                                    isSelected={selectedConversation?.id === conv.id}
                                                    onSelect={() => { setSelectedConversation(conv); setActiveReference(null); }}
                                                    onPin={e => handlePin(conv, e)}
                                                    onRename={e => handleRename(conv, e)}
                                                    onDelete={e => handleDelete(conv.id, e)}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {recentConvs.length > 0 && (
                                        <div>
                                            <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                                <Clock size={9} /> Recent
                                            </div>
                                            {recentConvs.map(conv => (
                                                <ConvItem
                                                    key={conv.id}
                                                    conv={conv}
                                                    isSelected={selectedConversation?.id === conv.id}
                                                    onSelect={() => { setSelectedConversation(conv); setActiveReference(null); }}
                                                    onPin={e => handlePin(conv, e)}
                                                    onRename={e => handleRename(conv, e)}
                                                    onDelete={e => handleDelete(conv.id, e)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ─── MAIN CHAT AREA ─── */}
            <div className="flex-1 flex flex-col min-w-0 h-full relative">
                {/* Top bar */}
                <div className="h-12 shrink-0 border-b border-border flex items-center px-4 gap-3 bg-background/80 backdrop-blur-sm">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
                        title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                    >
                        {sidebarOpen ? <SidebarClose size={16} /> : <SidebarOpen size={16} />}
                    </button>

                    {selectedConversation && (
                        <>
                            <div className="h-4 w-px bg-border" />
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <BrainCircuit size={14} className="text-primary shrink-0" />
                                <span className="text-sm font-semibold text-foreground truncate">
                                    {selectedConversation.title}
                                </span>
                                <span className="text-xs text-muted-foreground bg-surface px-2 py-0.5 rounded-full border border-border shrink-0">
                                    {selectedConversation.scopeType}
                                </span>
                            </div>
                        </>
                    )}

                    <div className="ml-auto flex items-center gap-1">
                        <button
                            onClick={() => setContextOpen(!contextOpen)}
                            className={cn('p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors text-xs flex items-center gap-1.5',
                                contextOpen ? 'bg-primary/10 text-primary' : 'hover:bg-surface')}
                            title="Toggle Knowledge Panel"
                        >
                            <Database size={14} />
                            <span className="text-[11px] font-semibold hidden sm:block">Context</span>
                        </button>
                    </div>
                </div>

                {/* Chat or Home */}
                {selectedConversation ? (
                    <ChatPane
                        conversation={selectedConversation}
                        onReferenceClick={ref => { setActiveReference(ref); setContextOpen(true); }}
                        initialPrompt={pendingPrompt || undefined}
                        onPromptHandled={() => setPendingPrompt(null)}
                    />
                ) : (
                    <HomeView
                        onCreateNew={handleCreateNew}
                        onSelectConversation={conv => { setSelectedConversation(conv); setActiveReference(null); }}
                        conversations={conversations.slice(0, 5)}
                        isCreating={isCreating}
                    />
                )}
            </div>

            {/* ─── RIGHT CONTEXT PANEL ─── */}
            {contextOpen && (
                <div className="w-[300px] shrink-0 border-l border-border bg-surface flex flex-col h-full overflow-hidden animate-in slide-in-from-right-4 duration-200">
                    <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Database size={14} className="text-primary" />
                            <span className="text-xs font-bold text-foreground">Knowledge Panel</span>
                        </div>
                        <button onClick={() => setContextOpen(false)} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
                            <X size={14} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-5">
                        {/* AI Confidence */}
                        <div>
                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">AI Confidence</div>
                            <div className={cn(
                                'flex items-start gap-3 p-3 rounded-xl border',
                                selectedConversation ? 'bg-green-500/5 border-green-500/20' : 'bg-border/30 border-border'
                            )}>
                                <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                                    selectedConversation ? 'bg-green-500/15' : 'bg-muted')}>
                                    <Activity size={13} className={selectedConversation ? 'text-green-500' : 'text-muted-foreground'} />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-foreground">
                                        {selectedConversation ? 'High' : 'No Context'}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                                        {selectedConversation
                                            ? 'KnowledgeGraph nodes loaded and ready for grounded responses.'
                                            : 'Select a conversation to activate knowledge context.'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Active Context */}
                        {selectedConversation && (
                            <div>
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
                                    <span>Active Scope</span>
                                    <button 
                                        onClick={() => { setContextModalMode('change'); setShowContextModal(true); }}
                                        className="text-[10px] text-primary hover:underline"
                                    >
                                        Change
                                    </button>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl">
                                    <div className="p-1.5 bg-background rounded-lg">
                                        <BookOpen size={13} className="text-primary" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-primary capitalize">{selectedConversation.scopeType}</div>
                                        <div className="text-[11px] text-muted-foreground">Context active</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Knowledge Sources */}
                        {selectedConversation && (
                            <div>
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Connected Sources</div>
                                <div className="flex flex-col gap-1.5">
                                    {[
                                        { icon: Play, label: 'Transcript Excerpts' },
                                        { icon: ImageIcon, label: 'Screenshots & OCR' },
                                        { icon: FileText, label: 'Extracted Notes' },
                                        { icon: BrainCircuit, label: 'KnowledgeGraph Nodes' },
                                    ].map(({ icon: Icon, label }) => (
                                        <div key={label} className="flex items-center justify-between py-1.5 px-3 bg-background border border-border/50 rounded-lg">
                                            <span className="text-[11px] font-medium text-foreground flex items-center gap-2">
                                                <Icon size={12} className="text-muted-foreground" />
                                                {label}
                                            </span>
                                            <span className="text-[10px] font-bold text-green-500">Active</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Active Reference */}
                        {activeReference && (
                            <div>
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Cited Reference</div>
                                <div className="border border-primary/30 bg-primary/5 rounded-xl overflow-hidden">
                                    <div className="px-3 py-2 bg-background border-b border-primary/20 flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-primary capitalize">{activeReference.refType} Source</span>
                                        <button onClick={() => setActiveReference(null)} className="text-muted-foreground hover:text-foreground">
                                            <X size={12} />
                                        </button>
                                    </div>
                                    <div className="p-3 text-[11px] text-foreground/90 leading-relaxed italic border-l-2 border-primary/40 ml-3 mt-2 mb-3">
                                        "{activeReference.excerpt}"
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {/* Context Modal */}
            <ContextSelectorModal
                isOpen={showContextModal}
                onClose={() => setShowContextModal(false)}
                onSelect={handleContextSelect}
                currentScope={contextModalMode === 'change' && selectedConversation ? (selectedConversation as any).scopeRefJson ? JSON.parse((selectedConversation as any).scopeRefJson) : 'library' : undefined}
            />
        </div>
    );
}

// ─── Conversation Item ──────────────────────────────────────────────────────
function ConvItem({ conv, isSelected, onSelect, onPin, onRename, onDelete }: {
    conv: Conversation;
    isSelected: boolean;
    onSelect: () => void;
    onPin: (e: React.MouseEvent) => void;
    onRename: (e: React.MouseEvent) => void;
    onDelete: (e: React.MouseEvent) => void;
}) {
    return (
        <div className="relative group mb-0.5">
            <button
                onClick={onSelect}
                className={cn(
                    'w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center gap-2 border',
                    isSelected
                        ? 'bg-primary/10 text-primary border-primary/20 font-semibold'
                        : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground border-transparent'
                )}
            >
                <MessageSquare size={12} className="shrink-0" />
                <span className="truncate flex-1 font-medium">{conv.title}</span>
            </button>

            {/* Hover actions */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity bg-surface rounded-md border border-border/50 px-0.5 shadow-sm">
                <button onClick={onPin} className="p-1 rounded text-muted-foreground hover:text-yellow-500 transition-colors" title="Pin">
                    <Star size={11} className={conv.isFavorite ? 'fill-yellow-500 text-yellow-500' : ''} />
                </button>
                <button onClick={onRename} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors" title="Rename">
                    <Pencil size={11} />
                </button>
                <button onClick={onDelete} className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                    <Trash2 size={11} />
                </button>
            </div>
        </div>
    );
}

// ─── Home View (No conversation selected) ──────────────────────────────────
function HomeView({ onCreateNew, onSelectConversation, conversations, isCreating }: {
    onCreateNew: (initialPrompt?: string) => void;
    onSelectConversation: (c: Conversation) => void;
    conversations: Conversation[];
    isCreating: boolean;
}) {
    const { user } = useAuthStore();
    const [input, setInput] = useState('');

    const nameStr = user?.displayName || user?.email?.split('@')[0] || 'Scholar';
    const name = nameStr.charAt(0).toUpperCase() + nameStr.slice(1);

    return (
        <div className="flex-1 overflow-y-auto flex flex-col items-center pt-8 pb-8 bg-background">
            <div className="w-full max-w-2xl px-6 flex flex-col items-center">
                {/* Greeting */}
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <BrainCircuit size={24} className="text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-1">Hi {name}</h1>
                <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
                    I've attended every lecture with you. Ask me anything about your knowledge base.
                </p>

                {/* Input box */}
                <div className="w-full relative group mb-6">
                    <div className="w-full bg-surface border border-border rounded-2xl p-1 flex flex-col shadow-sm focus-within:border-primary/50 transition-colors">
                        <textarea
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    if (input.trim()) onCreateNew(input.trim());
                                }
                            }}
                            placeholder="Ask anything about your lectures..."
                            className="w-full bg-transparent border-none resize-none outline-none px-4 pt-3 pb-2 text-foreground placeholder:text-muted-foreground/60 text-sm min-h-[56px]"
                            rows={2}
                        />
                        <div className="flex items-center justify-end px-3 pb-2">
                            <button
                                onClick={() => input.trim() ? onCreateNew(input.trim()) : onCreateNew()}
                                disabled={isCreating}
                                className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {isCreating ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                                Ask
                            </button>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="w-full mb-6">
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</div>
                    <div className="grid grid-cols-3 gap-2">
                        {QUICK_ACTIONS.map(({ icon: Icon, text, color }) => (
                            <button
                                key={text}
                                onClick={() => onCreateNew(text)}
                                className="flex flex-col gap-2 p-3 bg-surface hover:bg-surface-hover border border-border hover:border-primary/30 rounded-xl text-left transition-all group"
                            >
                                <Icon size={16} className={cn(color, 'group-hover:scale-110 transition-transform')} />
                                <span className="text-[11px] font-medium text-foreground leading-tight">{text}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Recent conversations */}
                {conversations.length > 0 && (
                    <div className="w-full">
                        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Recent</div>
                        <div className="flex flex-col gap-1">
                            {conversations.map(conv => (
                                <button
                                    key={conv.id}
                                    onClick={() => onSelectConversation(conv)}
                                    className="flex items-center gap-3 p-3 bg-surface hover:bg-surface-hover border border-border hover:border-primary/30 rounded-xl text-left transition-all group"
                                >
                                    <MessageSquare size={14} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-foreground truncate">{conv.title}</div>
                                        <div className="text-[11px] text-muted-foreground capitalize">{conv.scopeType}</div>
                                    </div>
                                    <ChevronRight size={14} className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors shrink-0" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Chat Pane ─────────────────────────────────────────────────────────────
function ChatPane({ conversation, onReferenceClick, initialPrompt, onPromptHandled }: {
    conversation: Conversation;
    onReferenceClick: (ref: MessageReference) => void;
    initialPrompt?: string;
    onPromptHandled?: () => void;
}) {
    const [history, setHistory] = useState<WorkspaceChatMessage[]>([]);
    const [prompt, setPrompt] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [showPromptLibrary, setShowPromptLibrary] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const loadHistory = async () => {
            setIsLoadingHistory(true);
            try {
                const msgs = await TauriClient.getConversationHistory(conversation.id);
                setHistory(msgs.map((m: any) => ({ role: m.role === 'assistant' ? 'model' : m.role, content: m.content, references: m.references })));
            } catch (e) {
                console.error('Failed to load history:', e);
            } finally {
                setIsLoadingHistory(false);
            }
        };
        loadHistory();
    }, [conversation.id]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history, isSending]);

    useEffect(() => {
        let isMounted = true;
        const unlistenChunk = TauriClient.onAiChatChunk((event: ChatChunkEvent) => {
            if (!isMounted) return;
            setHistory(prev => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'model') {
                    const existingRefs = last.references || [];
                    const newRefs = event.references || [];
                    const mergedRefs = [...existingRefs];
                    for (const nr of newRefs as any[]) {
                        if (!mergedRefs.find((r: any) => r.refType === nr.refType && r.excerpt === nr.value)) {
                            mergedRefs.push({ id: Math.random().toString(), refType: nr.refType, excerpt: nr.value, lectureId: '' });
                        }
                    }
                    return [...prev.slice(0, -1), { role: 'model', content: last.content + event.chunk, references: mergedRefs }];
                }
                const initialRefs = (event.references || []).map((nr: any) => ({ id: Math.random().toString(), refType: nr.refType, excerpt: nr.value, lectureId: '' }));
                return [...prev, { role: 'model', content: event.chunk, references: initialRefs }];
            });
            setIsSending(false);
        });

        const unlistenFollowups = TauriClient.onAiChatFollowups((data) => {
            if (!isMounted) return;
            setHistory(prev => {
                if (prev.length === 0) return prev;
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === 'model') last.followups = data.suggestions;
                return updated;
            });
        });

        return () => {
            isMounted = false;
            unlistenChunk.then(f => f());
            unlistenFollowups.then(f => f());
        };
    }, []);

    const handleSend = async (overridePrompt?: string) => {
        const msgToSend = (typeof overridePrompt === 'string' ? overridePrompt : prompt).trim();
        if (!msgToSend || isSending) return;
        setHistory(prev => [...prev, { role: 'user', content: msgToSend }]);
        if (typeof overridePrompt !== 'string') setPrompt('');
        setIsSending(true);
        try {
            await TauriClient.sendMessage(conversation.id, msgToSend);
        } catch (e: any) {
            setIsSending(false);
            setHistory(prev => [...prev, { role: 'model', content: `⚠️ Error: ${e?.message || String(e)}` }]);
        }
    };

    useEffect(() => {
        if (initialPrompt && !isSending) {
            handleSend(initialPrompt);
            if (onPromptHandled) onPromptHandled();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialPrompt]);


    const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setPrompt(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6 scroll-smooth">
                {isLoadingHistory ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                            <WaveLoader className="w-12 h-6" />
                            <span className="text-xs">Loading conversation...</span>
                        </div>
                    </div>
                ) : history.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto gap-4 pb-20">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <BrainCircuit size={28} className="text-primary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-foreground mb-1">Ready to assist</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Ask me anything about your {conversation.scopeType}. I'll search through transcripts, notes, screenshots, and formulas.
                            </p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2 mt-2">
                            {['Summarize this', 'List key concepts', 'Create a quiz', 'Explain deeply'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => handleSend(s)}
                                    className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-primary/50 bg-surface hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    history.map((msg, idx) => (
                        <div key={idx} className={cn('flex flex-col w-full max-w-3xl mx-auto', msg.role === 'user' ? 'items-end' : 'items-start')}>
                            {msg.role === 'user' ? (
                                <div className="px-4 py-3 bg-primary text-primary-foreground rounded-2xl rounded-br-sm max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap shadow-sm">
                                    {msg.content}
                                </div>
                            ) : (
                                <div className="w-full">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center">
                                            <BrainCircuit size={11} className="text-primary" />
                                        </div>
                                        <span className="text-[11px] font-bold text-muted-foreground">BACHAM AI</span>
                                    </div>
                                    <div className="text-sm text-foreground leading-[1.8] prose prose-sm max-w-none prose-invert prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-code:text-primary prose-pre:bg-surface prose-blockquote:border-primary/40">
                                        <ParsedModelContent
                                            text={msg.content}
                                            references={msg.references || []}
                                            onReferenceClick={onReferenceClick}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}

                {/* Thinking indicator */}
                {isSending && (
                    <div className="w-full max-w-3xl mx-auto">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center">
                                <BrainCircuit size={11} className="text-primary" />
                            </div>
                            <span className="text-[11px] font-bold text-muted-foreground">BACHAM AI</span>
                        </div>
                        <div className="flex items-center gap-3 text-muted-foreground">
                            <WaveLoader className="w-8 h-4 opacity-70" />
                            <span className="text-xs text-muted-foreground">Searching knowledge base...</span>
                        </div>
                    </div>
                )}

                {/* Follow-up suggestions */}
                {!isSending && history.length > 0 && history[history.length - 1]?.role === 'model' && history[history.length - 1]?.followups?.length ? (
                    <div className="w-full max-w-3xl mx-auto">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Follow-up suggestions</div>
                        <div className="flex flex-wrap gap-2">
                            {history[history.length - 1].followups!.map((s, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSend(s)}
                                    className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-primary/40 bg-surface hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : null}

                <div className="h-28 shrink-0" />
            </div>

            {/* Input bar */}
            <div className="absolute bottom-0 left-0 right-0 px-6 pb-5 pt-3 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none">
                <div className="max-w-3xl mx-auto pointer-events-auto">
                    <div className="flex items-end gap-2 bg-surface border border-border rounded-2xl shadow-lg focus-within:border-primary/50 transition-colors px-4 pt-3 pb-3">
                        <button
                            onClick={() => setShowPromptLibrary(true)}
                            title="Prompt Library"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors shrink-0 mb-0.5"
                        >
                            <BookOpen size={16} />
                        </button>
                        <textarea
                            ref={textareaRef}
                            value={prompt}
                            onChange={handleTextareaInput}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                            }}
                            placeholder="Ask anything about your lectures…"
                            className="flex-1 bg-transparent resize-none outline-none text-sm text-foreground placeholder:text-muted-foreground leading-relaxed min-h-[24px] max-h-[160px] scrollbar-hide"
                            rows={1}
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={!prompt.trim() || isSending}
                            className={cn(
                                'p-2 rounded-xl transition-all shrink-0 mb-0.5',
                                prompt.trim() && !isSending
                                    ? 'bg-primary text-primary-foreground hover:opacity-90'
                                    : 'text-muted-foreground opacity-40 cursor-not-allowed'
                            )}
                        >
                            {isSending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                        </button>
                    </div>
                    <div className="text-center mt-2">
                        <span className="text-[10px] text-muted-foreground/60 font-medium">
                            Responses grounded in your personal knowledge base · Enter to send, Shift+Enter for new line
                        </span>
                    </div>
                </div>
            </div>

            {showPromptLibrary && (
                <PromptLibrary
                    onClose={() => setShowPromptLibrary(false)}
                    onSelectPrompt={body => setPrompt(body)}
                />
            )}
        </div>
    );
}

