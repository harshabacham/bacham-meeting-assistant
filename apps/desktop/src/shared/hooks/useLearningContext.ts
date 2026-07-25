import { useEffect } from 'react';
import { useAiCommandCenterStore, LearningContext } from '@/shared/stores/aiCommandCenterStore';

export function useLearningContext(context: LearningContext) {
  const setContext = useAiCommandCenterStore((state) => state.setContext);

  useEffect(() => {
    setContext(context);
  }, [
    context.type,
    context.title,
    context.subtitle,
    context.course,
    context.timestamp,
    context.lectureId,
    context.selectedText,
    context.codeSnippet,
    context.formulaSnippet,
    context.diagramUrl,
    context.noteId,
    setContext,
  ]);
}
