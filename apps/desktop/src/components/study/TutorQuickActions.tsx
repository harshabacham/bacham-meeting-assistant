import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { invoke } from '@tauri-apps/api/core';

interface TutorQuickActionsProps {
  lectureId: string;
  targetId?: string;
  targetText?: string;
  onResult: (text: string) => void;
  className?: string;
}

export function TutorQuickActions({ lectureId, targetId, targetText, onResult, className = "" }: TutorQuickActionsProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  
  const actions = [
    { id: 'explain', label: 'Explain' },
    { id: 'simplify', label: 'Simplify' },
    { id: 'examples', label: 'Examples' },
    { id: 'visual', label: 'Visualize' },
    { id: 'exam_prep', label: 'Exam Prep' }
  ];

  const handleAction = async (actionType: string) => {
    setLoadingAction(actionType);
    try {
      const result: string = await invoke('send_tutor_action', {
        input: {
          lectureId,
          actionType,
          targetId,
          targetText
        }
      });
      onResult(result);
    } catch (e) {
      console.error('Tutor action failed:', e);
      onResult(`⚠️ Tutor action failed: ${String(e)}`);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {actions.map(action => (
        <Button 
          key={action.id}
          variant="ghost" 
          size="sm" 
          className="rounded-full bg-surface/50 border border-primary/20 hover:bg-primary/10 hover:border-primary/50 hover:text-primary text-xs h-7 transition-colors"
          disabled={loadingAction !== null}
          onClick={(e) => { e.stopPropagation(); handleAction(action.id); }}
        >
          {loadingAction === action.id ? (
            <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3 mr-1.5 text-primary/70" />
          )}
          {action.label}
        </Button>
      ))}
    </div>
  );
}
