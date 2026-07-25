import { X, Play, FileText, Image as ImageIcon, Link as LinkIcon, Activity, Database, BookOpen } from 'lucide-react';
import { MessageReference, Conversation } from '../types';
import { useNavigate } from 'react-router-dom';

interface ContextPanelProps {
    conversation: Conversation | null;
    activeReference: MessageReference | null;
    onCloseReference: () => void;
}

export function ContextPanel({ conversation, activeReference, onCloseReference }: ContextPanelProps) {
    const navigate = useNavigate();
    
    // In Phase 1, we simulate AI Confidence and Active Sources based on the active conversation.
    const confidence = conversation ? 'High' : 'None';
    const parsedScope = conversation && conversation.scopeRefJson ? JSON.parse(conversation.scopeRefJson) : null;
    const sourceCount = parsedScope?.lecture_id ? 1 : (parsedScope?.multi_lecture?.length || 0);

    const handleJumpToVideo = () => {
        if (activeReference?.lectureId && activeReference?.timestampSeconds !== undefined) {
            navigate(`/lectures/${activeReference.lectureId}?t=${activeReference.timestampSeconds}`);
        }
    };

    const getRefIcon = () => {
        switch (activeReference?.refType) {
            case 'transcript': return <Play size={18} className="text-primary" />;
            case 'screenshot': return <ImageIcon size={18} className="text-primary" />;
            case 'note': return <FileText size={18} className="text-primary" />;
            default: return <LinkIcon size={18} className="text-primary" />;
        }
    };

    const getRefTitle = () => {
        switch (activeReference?.refType) {
            case 'transcript': return 'Transcript Reference';
            case 'screenshot': return 'Screenshot Reference';
            case 'note': return 'Note Reference';
            default: return 'Knowledge Node Reference';
        }
    };

    if (!conversation) {
        return null;
    }

    return (
        <div className="w-[340px] shrink-0 border-l border-border bg-surface flex flex-col h-full overflow-y-auto">
            {/* Header */}
            <div className="p-5 pb-3 border-b border-border/50 bg-background/50 sticky top-0 z-10 backdrop-blur-sm">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Database size={16} className="text-primary" />
                    Knowledge Context
                </h3>
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                    Sources available for reasoning
                </p>
            </div>

            <div className="p-5 space-y-6 flex-1">
                {/* AI Confidence Status */}
                <div className="space-y-2">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">AI Confidence</div>
                    <div className="bg-background border border-border/60 rounded-xl p-3 flex items-start gap-3 shadow-sm">
                        <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                            <Activity size={16} className="text-green-500" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-foreground">{confidence} Confidence</div>
                            <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                {confidence === 'High' ? 'Retrieval found highly relevant KnowledgeGraph nodes to ground the responses.' : 'Not enough context provided.'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Current Context */}
                <div className="space-y-2">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Active Scope</div>
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center gap-3">
                        <div className="p-2 bg-background rounded-lg shadow-sm">
                            <BookOpen size={16} className="text-primary" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-primary">{sourceCount === 1 ? 'Single Lecture' : `${sourceCount} Lectures`}</div>
                            <div className="text-xs text-muted-foreground font-medium">Context active</div>
                        </div>
                    </div>
                </div>

                {/* Connected Sources Simulation */}
                <div className="space-y-2">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Connected Nodes</div>
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between py-2 px-3 bg-background border border-border/50 rounded-lg">
                            <span className="text-xs font-medium text-foreground flex items-center gap-2"><Play size={14} className="text-muted-foreground"/> Transcript Excerpts</span>
                            <span className="text-xs font-bold text-muted-foreground">Active</span>
                        </div>
                        <div className="flex items-center justify-between py-2 px-3 bg-background border border-border/50 rounded-lg">
                            <span className="text-xs font-medium text-foreground flex items-center gap-2"><ImageIcon size={14} className="text-muted-foreground"/> Screenshots</span>
                            <span className="text-xs font-bold text-muted-foreground">Active</span>
                        </div>
                        <div className="flex items-center justify-between py-2 px-3 bg-background border border-border/50 rounded-lg">
                            <span className="text-xs font-medium text-foreground flex items-center gap-2"><FileText size={14} className="text-muted-foreground"/> Extracted Notes</span>
                            <span className="text-xs font-bold text-muted-foreground">Active</span>
                        </div>
                    </div>
                </div>

                {/* Active Reference Panel (Appears when citation clicked) */}
                {activeReference && (
                    <div className="mt-8 border border-primary/30 bg-primary/5 rounded-xl overflow-hidden shadow-sm relative animate-in slide-in-from-bottom-4">
                        <div className="p-3 bg-background border-b border-primary/20 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-primary font-bold text-xs">
                                {getRefIcon()}
                                {getRefTitle()}
                            </div>
                            <button 
                                onClick={onCloseReference}
                                className="p-1 rounded hover:bg-surface text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>
                        
                        <div className="p-4">
                            {activeReference.refType === 'transcript' && (
                                <div className="flex flex-col gap-3">
                                    <div className="text-xs text-foreground/90 leading-relaxed italic border-l-2 border-primary/50 pl-3">
                                        "{activeReference.excerpt}"
                                    </div>
                                    <button 
                                        onClick={handleJumpToVideo}
                                        className="mt-2 flex items-center justify-center gap-2 w-full py-2 bg-primary hover:opacity-90 text-primary-foreground rounded-lg text-xs font-bold transition-opacity shadow-sm"
                                    >
                                        <Play size={14} />
                                        Jump to Video ({formatTime(activeReference.timestampSeconds || 0)})
                                    </button>
                                </div>
                            )}

                            {activeReference.refType === 'screenshot' && (
                                <div className="flex flex-col gap-3">
                                    <div className="bg-background border border-border/50 rounded-lg p-3 aspect-video flex items-center justify-center text-muted-foreground shadow-inner">
                                        <ImageIcon size={24} className="opacity-50" />
                                    </div>
                                    {activeReference.excerpt && (
                                        <p className="text-xs text-foreground/80 font-medium">{activeReference.excerpt}</p>
                                    )}
                                </div>
                            )}

                            {activeReference.refType === 'note' && (
                                <div className="text-xs text-foreground/90 leading-relaxed font-medium">
                                    {activeReference.excerpt}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}
