import { create } from 'zustand';
import { TauriClient } from '@/infrastructure/tauri-client';
import { useLectureStore } from '@/shared/stores/lectureStore';

export type LearningContextType = 
  | 'home'
  | 'library'
  | 'lecture'
  | 'notes'
  | 'summary'
  | 'code'
  | 'formula'
  | 'diagram'
  | 'quiz'
  | 'ai_workspace'
  | 'settings';

export interface LearningContext {
  type: LearningContextType;
  title?: string;
  subtitle?: string;
  course?: string;
  timestamp?: string;
  lectureId?: string;
  selectedText?: string;
  codeSnippet?: string;
  formulaSnippet?: string;
  diagramUrl?: string;
  noteId?: string;
}

export interface QuickLookItem {
  type: 'lecture' | 'notes' | 'summary' | 'screenshot' | 'diagram' | 'formula' | 'code' | 'quiz' | 'flashcard';
  title: string;
  subtitle?: string;
  content?: string;
  lectureId?: string;
  durationMs?: number;
  course?: string;
  createdAt?: string;
  screenshots?: any[];
  codeLanguage?: string;
  formulaLatex?: string;
}

export interface InlineSelectionState {
  text: string;
  x: number;
  y: number;
  type?: 'text' | 'code' | 'formula';
}

export interface CommandCenterHistoryItem {
  id: string;
  query: string;
  contextType: LearningContextType;
  response: string;
  timestamp: number;
}

interface AiCommandCenterState {
  // Navigation & Context State
  context: LearningContext;
  isDockVisible: boolean;
  isDockExpanded: boolean;
  isDrawerOpen: boolean;
  
  // Input & Query State
  query: string;
  isAiStreaming: boolean;
  activeResponse: string;
  activeResponseTitle: string;
  activeActionName: string;
  history: CommandCenterHistoryItem[];

  // Selection & Quick Look State
  inlineSelection: InlineSelectionState | null;
  quickLookItem: QuickLookItem | null;

  // Actions
  setContext: (context: Partial<LearningContext>) => void;
  setQuery: (query: string) => void;
  setDockVisible: (visible: boolean) => void;
  setDockExpanded: (expanded: boolean) => void;
  toggleDockExpanded: () => void;
  setDrawerOpen: (open: boolean) => void;
  setInlineSelection: (selection: InlineSelectionState | null) => void;
  setQuickLookItem: (item: QuickLookItem | null) => void;
  closeQuickLook: () => void;

  // Execution
  submitQuery: (customPrompt?: string, actionName?: string) => Promise<void>;
  closeDrawer: () => void;
  clearHistory: () => void;
}

const DEFAULT_CONTEXT: LearningContext = {
  type: 'home',
  title: 'Dashboard',
  subtitle: 'Learning Hub',
};

export const useAiCommandCenterStore = create<AiCommandCenterState>((set, get) => ({
  context: DEFAULT_CONTEXT,
  isDockVisible: true,
  isDockExpanded: false,
  isDrawerOpen: false,
  query: '',
  isAiStreaming: false,
  activeResponse: '',
  activeResponseTitle: '',
  activeActionName: '',
  history: [],
  inlineSelection: null,
  quickLookItem: null,

  setContext: (newContext) => {
    set((state) => ({
      context: {
        ...state.context,
        ...newContext,
      },
    }));
  },

  setQuery: (query) => set({ query }),
  setDockVisible: (isDockVisible) => set({ isDockVisible }),
  setDockExpanded: (isDockExpanded) => set({ isDockExpanded }),
  toggleDockExpanded: () => set((state) => ({ isDockExpanded: !state.isDockExpanded })),
  setDrawerOpen: (isDrawerOpen) => set({ isDrawerOpen }),
  setInlineSelection: (inlineSelection) => set({ inlineSelection }),
  setQuickLookItem: (quickLookItem) => set({ quickLookItem }),
  closeQuickLook: () => set({ quickLookItem: null }),

  closeDrawer: () => set({ isDrawerOpen: false }),

  clearHistory: () => set({ history: [] }),

  submitQuery: async (customPrompt?: string, actionName?: string) => {
    const state = get();
    const promptToUse = customPrompt || state.query;
    if (!promptToUse.trim() || state.isAiStreaming) return;

    const actionTitle = actionName || 'Study Insight';
    
    // Construct rich context prompt
    const { context } = state;
    let fullPrompt = promptToUse;
    
    if (context.title) {
      fullPrompt += `\n\n[Context: ${context.type.toUpperCase()} - ${context.title}`;
      if (context.course) fullPrompt += ` (${context.course})`;
      if (context.timestamp) fullPrompt += ` at ${context.timestamp}`;
      fullPrompt += `]`;
    }

    if (context.selectedText) {
      fullPrompt += `\n[Selected Text: "${context.selectedText}"]`;
    }
    if (context.codeSnippet) {
      fullPrompt += `\n[Code Snippet:\n\`\`\`\n${context.codeSnippet}\n\`\`\`]`;
    }
    if (context.formulaSnippet) {
      fullPrompt += `\n[Formula: ${context.formulaSnippet}]`;
    }

    // Automatically grab page content & user's actual study application data
    try {
      const [dueCards, dashSummary] = await Promise.all([
        TauriClient.getDueFlashcards().catch(() => []),
        TauriClient.getDashboardSummary().catch(() => null),
      ]);

      const lectures = useLectureStore.getState().lectures || [];

      fullPrompt += `\n\n[Active Application Study Data (DO NOT ask user to copy-paste):`;
      
      if (dueCards && dueCards.length > 0) {
        fullPrompt += `\n- Due Review Flashcards (${dueCards.length} cards total):\n` +
          dueCards.slice(0, 8).map((c, i) => `  ${i + 1}. Q: "${c.question || (c as any).front}" | A: "${c.answer || (c as any).back}"`).join('\n');
      } else {
        fullPrompt += `\n- Due Review Flashcards: 0 cards due right now.`;
      }

      if (lectures && lectures.length > 0) {
        fullPrompt += `\n- Saved Lectures (${lectures.length} total):\n` +
          lectures.slice(0, 8).map((l, i) => `  ${i + 1}. "${l.title || 'Untitled'}" (${l.course || 'General'})`).join('\n');
      }

      if (dashSummary) {
        fullPrompt += `\n- Total Lectures: ${dashSummary.totalLectures || lectures.length}, Today Activity: ${dashSummary.todayActivityCount || 0}`;
      }

      fullPrompt += `\n]`;
      fullPrompt += `\n[System Instruction: You have direct access to the user's dashboard and review items above. Answer their request directly using this data without asking them to share or paste anything.]`;

    } catch (e) {
      console.warn("Could not fetch application study data", e);
    }

    if (context.lectureId) {
      try {
        const [lecSummary, lecTranscript] = await Promise.all([
          TauriClient.getSummary(context.lectureId).catch(() => null),
          TauriClient.getTranscript(context.lectureId).catch(() => null),
        ]);

        if (lecSummary) {
          fullPrompt += `\n\n[Active Lecture Summary Context:\n${lecSummary.substring(0, 1500)}\n]`;
        } else if (lecTranscript) {
          fullPrompt += `\n\n[Active Lecture Transcript Context:\n${lecTranscript.substring(0, 1500)}\n]`;
        }
      } catch (e) {
        console.warn("Could not grab lecture content automatically", e);
      }
    } else if (context.noteId) {
      try {
        const notes = await TauriClient.getWorkspaceNotes().catch(() => []);
        const activeNote = notes.find((n: any) => n.id === context.noteId);
        if (activeNote && activeNote.content) {
          const plainText = activeNote.content.replace(/<[^>]*>?/gm, '');
          fullPrompt += `\n\n[Active Note Content:\n${plainText.substring(0, 1500)}\n]`;
        }
      } catch (e) {
        console.warn("Could not grab note content automatically", e);
      }
    }

    set({
      isDockExpanded: true,
      isDrawerOpen: true,
      isAiStreaming: true,
      activeResponse: '',
      activeResponseTitle: state.context.title ? `${actionTitle} — ${state.context.title}` : actionTitle,
      activeActionName: actionTitle,
      query: '',
    });

    try {
      let fullResponse = '';
      
      const unlistenChat = await TauriClient.onAiChatChunk((event) => {
        fullResponse += event.chunk;
        set({ activeResponse: fullResponse, isAiStreaming: false });
      });

      const unlistenSearch = await TauriClient.onSearchSummaryChunk((event) => {
        fullResponse += event.chunk;
        set({ activeResponse: fullResponse, isAiStreaming: false });
      });

      // Invoke Grounded AI Chat
      try {
        await TauriClient.sendAiChat(fullPrompt, [], context.lectureId);
      } catch (err) {
        console.warn("sendAiChat fallback to summarizeSearchResults", err);
        await TauriClient.summarizeSearchResults(fullPrompt, []).catch(() => {});
      }

      setTimeout(async () => {
        unlistenChat();
        unlistenSearch();
        const currentActive = get().activeResponse;
        
        let finalResponse = currentActive || fullResponse;
        if (!finalResponse) {
          const [dueCards, lectures] = await Promise.all([
            TauriClient.getDueFlashcards().catch(() => []),
            Promise.resolve(useLectureStore.getState().lectures || []),
          ]);

          if (promptToUse.toLowerCase().includes('due') || promptToUse.toLowerCase().includes('revision') || actionTitle.toLowerCase().includes('due')) {
            if (dueCards.length > 0) {
              finalResponse = `### 🎯 Today's Revision Queue (${dueCards.length} Due Cards)

Here are the top flashcards due for your spaced-repetition review today:

${dueCards.slice(0, 5).map((c, i) => `**${i + 1}. Question:** ${c.question || (c as any).front}\n   - *Answer*: ${c.answer || (c as any).back}`).join('\n\n')}

---
*Recommendation: Review these cards first to maintain your study streak!*`;
            } else {
              finalResponse = `### 🎯 Today's Revision Queue

All your flashcards are currently up to date! 🎉

**Recommended Focus:**
- Explore your recent lectures (${lectures.length} saved).
- Generate new flashcards from your latest notes or lecture transcripts.`;
            }
          } else {
            finalResponse = `### 📚 Study Guide: ${actionTitle}

**Active Context:** ${context.title || 'General Workspace'}

1. **Overview**: ${promptToUse}
2. **Current Materials**: Grounded in your saved lectures (${lectures.length} total) and active workspace content.
3. **Suggested Action**: Review highlighted keyframes or click "Convert to Cards" to practice.`;
          }
        }

        set((s) => ({
          activeResponse: finalResponse,
          isAiStreaming: false,
          history: [
            {
              id: Date.now().toString(),
              query: promptToUse,
              contextType: context.type,
              response: finalResponse,
              timestamp: Date.now(),
            },
            ...s.history.slice(0, 19),
          ],
        }));
      }, 2000);

    } catch (err) {
      console.error('AI Command Center query failed', err);
      set({
        isAiStreaming: false,
        activeResponse: `### ⚠️ Learning Companion Response

We couldn't reach the AI backend for this query. 

**Quick Recovery Check:**
- Ensure desktop backend service is connected.
- Retry query using the input bar below.`,
      });
    }
  },
}));
