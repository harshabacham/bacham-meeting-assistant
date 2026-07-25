import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Folder as FolderIcon, Database, Check, Play, Search } from 'lucide-react';
import { ChatScope } from '../types';
import { TauriClient } from '@/infrastructure/tauri-client';
import { cn } from '@/components';

interface ContextSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (scope: ChatScope) => void;
    currentScope?: ChatScope;
}

export function ContextSelectorModal({ isOpen, onClose, onSelect, currentScope }: ContextSelectorModalProps) {
    const [scopeType, setScopeType] = useState<'library' | 'folder' | 'lecture'>('library');
    const [lectures, setLectures] = useState<any[]>([]);
    const [folders, setFolders] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState<string>('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        if (currentScope === 'library') {
            setScopeType('library');
        } else if (typeof currentScope === 'object') {
            if ('lecture' in currentScope) {
                setScopeType('lecture');
                setSelectedId(currentScope.lecture as string);
            } else if ('folder' in currentScope) {
                setScopeType('folder');
                setSelectedId(currentScope.folder as string);
            }
        }

        const load = async () => {
            try {
                const [l, f] = await Promise.all([
                    TauriClient.listLectures(),
                    TauriClient.listFolders()
                ]);
                setLectures(l);
                setFolders(f);
            } catch (e) {
                console.error("Failed to load context targets", e);
            }
        };
        load();
    }, [isOpen, currentScope]);

    const handleConfirm = () => {
        if (scopeType === 'library') {
            onSelect('library');
        } else if (scopeType === 'folder' && selectedId) {
            onSelect({ folder: selectedId });
        } else if (scopeType === 'lecture' && selectedId) {
            onSelect({ lecture: selectedId });
        }
    };

    const filteredLectures = lectures.filter(l => l.title.toLowerCase().includes(search.toLowerCase()));
    const filteredFolders = folders.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-background/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-surface border border-border shadow-2xl rounded-[24px] w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]"
                        >
                            {/* Header */}
                            <div className="px-6 py-5 border-b border-border/50 flex items-center justify-between bg-background/50">
                                <div>
                                    <h2 className="text-lg font-bold text-foreground">Select AI Context</h2>
                                    <p className="text-xs text-muted-foreground mt-1">Choose the scope of knowledge the AI should access</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full hover:bg-surface-hover text-muted-foreground transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Main Layout */}
                            <div className="flex flex-col md:flex-row flex-1 min-h-0">
                                {/* Left Sidebar (Scope Types) */}
                                <div className="w-full md:w-[200px] shrink-0 border-b md:border-b-0 md:border-r border-border/50 p-4 space-y-2 bg-background/30">
                                    <ScopeTypeButton
                                        active={scopeType === 'library'}
                                        onClick={() => setScopeType('library')}
                                        icon={Database}
                                        title="Library Wide"
                                        desc="All knowledge"
                                    />
                                    <ScopeTypeButton
                                        active={scopeType === 'folder'}
                                        onClick={() => setScopeType('folder')}
                                        icon={FolderIcon}
                                        title="Specific Folder"
                                        desc="Narrow to a topic"
                                    />
                                    <ScopeTypeButton
                                        active={scopeType === 'lecture'}
                                        onClick={() => setScopeType('lecture')}
                                        icon={BookOpen}
                                        title="Single Lecture"
                                        desc="Deep dive"
                                    />
                                </div>

                                {/* Right Content Area */}
                                <div className="flex-1 flex flex-col min-h-0 bg-background">
                                    {scopeType === 'library' && (
                                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                                            <div className="w-20 h-20 rounded-[20px] bg-primary/10 flex items-center justify-center mb-6">
                                                <Database size={36} className="text-primary" />
                                            </div>
                                            <h3 className="text-xl font-bold text-foreground mb-2">Library Wide Access</h3>
                                            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                                                The AI will have complete access to your entire knowledge base, searching across all folders, notes, and transcripts to provide comprehensive answers.
                                            </p>
                                        </div>
                                    )}

                                    {scopeType !== 'library' && (
                                        <div className="flex-1 flex flex-col min-h-0">
                                            <div className="p-4 border-b border-border/50">
                                                <div className="relative">
                                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                                    <input
                                                        type="text"
                                                        value={search}
                                                        onChange={e => setSearch(e.target.value)}
                                                        placeholder={`Search ${scopeType}s...`}
                                                        className="w-full pl-9 pr-4 py-2 bg-surface rounded-xl border border-border text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-2">
                                                {scopeType === 'folder' && filteredFolders.map(folder => (
                                                    <SelectionItem
                                                        key={folder.id}
                                                        icon={FolderIcon}
                                                        title={folder.name}
                                                        subtitle="Folder"
                                                        selected={selectedId === folder.id}
                                                        onClick={() => setSelectedId(folder.id)}
                                                    />
                                                ))}
                                                {scopeType === 'lecture' && filteredLectures.map(lecture => (
                                                    <SelectionItem
                                                        key={lecture.id}
                                                        icon={Play}
                                                        title={lecture.title}
                                                        subtitle={new Date(lecture.createdAt).toLocaleDateString()}
                                                        selected={selectedId === lecture.id}
                                                        onClick={() => setSelectedId(lecture.id)}
                                                    />
                                                ))}
                                                {(scopeType === 'folder' ? filteredFolders : filteredLectures).length === 0 && (
                                                    <div className="p-8 text-center text-muted-foreground text-sm">
                                                        No {scopeType}s found.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-border/50 bg-surface flex justify-end gap-3">
                                <button onClick={onClose} className="px-5 py-2 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={scopeType !== 'library' && !selectedId}
                                    className="px-6 py-2 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_2px_12px_rgba(186,255,41,0.2)]"
                                >
                                    Confirm Context
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

function ScopeTypeButton({ active, onClick, icon: Icon, title, desc }: { active: boolean, onClick: () => void, icon: any, title: string, desc: string }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all border',
                active
                    ? 'bg-primary/10 border-primary/20 shadow-sm'
                    : 'bg-transparent border-transparent hover:bg-surface hover:border-border/50'
            )}
        >
            <div className={cn('p-2.5 rounded-[14px]', active ? 'bg-background shadow-sm' : 'bg-surface border border-border/50')}>
                <Icon size={16} className={active ? 'text-primary' : 'text-muted-foreground'} />
            </div>
            <div>
                <div className={cn('text-sm font-bold', active ? 'text-primary' : 'text-foreground')}>{title}</div>
                <div className="text-[10px] text-muted-foreground">{desc}</div>
            </div>
        </button>
    );
}

function SelectionItem({ icon: Icon, title, subtitle, selected, onClick }: { icon: any, title: string, subtitle: string, selected: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'w-full flex items-center justify-between p-3 rounded-xl text-left transition-all mb-1 border',
                selected
                    ? 'bg-primary/5 border-primary/20'
                    : 'bg-transparent border-transparent hover:bg-surface hover:border-border/50'
            )}
        >
            <div className="flex items-center gap-3 min-w-0">
                <div className={cn('w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0', selected ? 'bg-primary/20 text-primary' : 'bg-surface border border-border text-muted-foreground')}>
                    <Icon size={14} />
                </div>
                <div className="min-w-0">
                    <div className="text-sm font-bold text-foreground truncate">{title}</div>
                    <div className="text-[11px] text-muted-foreground">{subtitle}</div>
                </div>
            </div>
            {selected && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-sm">
                    <Check size={12} className="text-primary-foreground" />
                </div>
            )}
        </button>
    );
}
