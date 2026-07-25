import { useState } from 'react';
import { BookOpen, FileText, CheckSquare, Zap, Loader2 } from 'lucide-react';
import { TauriClient } from '@/infrastructure/tauri-client';
import { ChatScope } from '../types';
import { cn } from '@/components';

interface StudyActionBarProps {
    scope: ChatScope;
}

export function StudyActionBar({ scope }: StudyActionBarProps) {
    const [runningAction, setRunningAction] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const handleRunAction = async (actionType: string) => {
        if (runningAction) return;
        
        setRunningAction(actionType);
        setToastMessage(`Generating ${actionType.toLowerCase()}...`);
        
        try {
            const run = await TauriClient.runStudyAction(actionType, scope);
            
            // Poll for completion
            const pollInterval = setInterval(async () => {
                const status = await TauriClient.getStudyActionStatus(run.id);
                if (status.status === 'done' || status.status === 'error') {
                    clearInterval(pollInterval);
                    setRunningAction(null);
                    
                    if (status.status === 'done') {
                        setToastMessage(`${actionType} generated successfully!`);
                    } else {
                        setToastMessage(`Failed to generate ${actionType}.`);
                    }
                    
                    setTimeout(() => setToastMessage(null), 3000);
                }
            }, 2000);
            
        } catch (e: any) {
            console.error('Failed to start study action', e);
            setRunningAction(null);
            setToastMessage(`Error: ${e.message}`);
            setTimeout(() => setToastMessage(null), 3000);
        }
    };

    const actions = [
        { id: 'summary', label: 'Summary', icon: FileText, color: 'text-blue-400', bg: 'bg-blue-400/10' },
        { id: 'flashcards', label: 'Flashcards', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
        { id: 'quiz', label: 'Quiz', icon: CheckSquare, color: 'text-green-400', bg: 'bg-green-400/10' },
        { id: 'cheatSheet', label: 'Cheat Sheet', icon: BookOpen, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    ];

    return (
        <div className="flex flex-col w-full relative shrink-0 z-10">
            <div className="flex items-center gap-4 px-8 py-4 bg-transparent shrink-0">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">
                    Generate
                </span>
                <div className="flex items-center gap-2">
                    {actions.map(action => {
                        const Icon = action.icon;
                        const isRunning = runningAction === action.id;
                        const isDisabled = runningAction !== null && !isRunning;
                        
                        return (
                            <button
                                key={action.id}
                                onClick={() => handleRunAction(action.id)}
                                disabled={isDisabled}
                                className={cn(
                                    "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all shrink-0 border border-transparent",
                                    isDisabled ? "opacity-30 cursor-not-allowed" : "hover:bg-white/[0.04] cursor-pointer",
                                    isRunning ? "bg-white/[0.06] text-white" : "bg-white/[0.02] text-[var(--text-secondary)]"
                                )}
                            >
                                {isRunning ? (
                                    <Loader2 size={13} className="animate-spin text-[var(--text-muted)]" />
                                ) : (
                                    <Icon size={13} className={action.color} style={{ opacity: 0.8 }} />
                                )}
                                <span>{action.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
            
            {/* Simple Toast overlay */}
            {toastMessage && (
                <div className="absolute top-14 left-8 mt-2 px-4 py-2 bg-[#1A1A1A]/90 backdrop-blur-md border border-white/5 rounded-full shadow-2xl text-[13px] text-white z-50 flex items-center gap-3 animate-in slide-in-from-top-2 fade-in">
                    {runningAction && <Loader2 size={13} className="animate-spin text-[var(--text-muted)]" />}
                    {toastMessage}
                </div>
            )}
        </div>
    );
}
