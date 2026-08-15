import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
    AppSettings, Lecture, Folder, DashboardSummary,
    FolderDashboard, FolderStatisticsCache, FolderNote, FolderTreeNode, FolderSuggestion,
    SearchResult, OcrStatus, ChatMessage, UpdateLectureInput,
    Collection, CollectionWithCount, CreateCollectionInput, BatchResult
} from '@/shared/types';
import { Conversation, ChatMessageWithRefs } from '@/features/ai_workspace/types';

// ─── Type Definitions ──────────────────────────────────────────────────────
export interface Screenshot {
    id: string;
    filePath: string;
    capturedAt: number;
    isKeyFrame: boolean;
    changeReason?: string;
}

export interface LectureArtifact {
    id: string;
    lectureId: string;
    artifactType: string;
    contentJson: string;
    generatedAt: number;
    modelUsed: string;
    version: number;
    status: string;
}

export interface ArtifactMeta {
    artifactType: string;
    version: number;
    generatedAt: number;
    status: string;
}

export interface TimelineEvent {
    id: string;
    lectureId: string;
    eventType: string;
    timestampMs: number;
    label: string;
    screenshotId?: string;
}

export interface Tag {
    id: string;
    name: string;
}

export interface Flashcard {
    id: string;
    lectureId: string;
    question: string;
    answer: string;
    difficulty: string;
    easeFactor: number;
    intervalDays: number;
    nextReviewAt?: number;
    createdAt: string;
    lastReviewedAt?: string;
}

export interface QuizQuestion {
    id: string;
    type: string;
    difficulty: string;
    question: string;
    answerKey: string;
    options?: string;
}

export interface QuizAnswer {
    quizId: string;
    submittedAnswer: string;
}

export interface QuizResult {
    sessionId: string;
    total: number;
    correct: number;
    scorePct: number;
    answers: Array<{ quizId: string; submittedAnswer: string; correctAnswer: string; isCorrect: boolean }>;
}

export interface QuizSession {
    id: string;
    lectureId: string;
    mode: string;
    timeLimitSeconds?: number;
    startedAt: number;
    completedAt?: number;
    scorePct?: number;
}

export interface FilterCondition {
    field: string;
    operator: 'equals' | 'contains' | 'in' | 'is_true' | 'is_false';
    value: any;
}

export interface FilterQuery {
    matchType: 'All' | 'Any';
    conditions: FilterCondition[];
}

export interface RecentlyViewed {
    lectureId: string;
    viewedAt: number;
    title?: string;
}

export interface NoteVersion {
    id: string;
    content: string;
    savedAt: number;
}

export interface ArtifactProgressEvent {
    lectureId: string;
    artifactType: string;
    status: 'pending' | 'generating' | 'done' | 'error' | 'waiting_for_quota' | 'retry_scheduled' | 'failed';
    error?: string;
}

export interface ChatChunkEvent {
    chunk: string;
    references?: Array<{ refType: string; value: string }>;
}

export interface SavedPrompt {
    id: string;
    name: string;
    body: string;
    category?: string;
    isFavorite: boolean;
    isBuiltin: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ProviderConfig {
    id: string;
    provider: string;
    enabled: boolean;
    defaultModel?: string;
    configJson?: string;
    hasKey: boolean;
}

export interface SaveProviderConfigPayload {
    provider: string;
    enabled: boolean;
    defaultModel?: string;
    configJson?: string;
    apiKey?: string;
}

export interface SearchFilters {
    entityTypes?: string[];
    subject?: string;
    folder?: string;
    dateRange?: [string, string];
    favoritesOnly?: boolean;
}

export type SearchSort = 'relevance' | 'newest' | 'oldest' | 'alphabetical' | 'duration' | 'popularity';

export interface UniversalSearchResult {
    entityType: string;
    entityId: string;
    parentLectureId?: string;
    title?: string;
    bodySnippet?: string;
    score: number;
    updatedAt: string;
}

export interface UniversalSearchResults {
    resultsByType: Record<string, UniversalSearchResult[]>;
    totalCounts: Record<string, number>;
    bestOverall: UniversalSearchResult[];
    nextCursor?: string;
}

export interface SearchSuggestion {
    text: string;
    suggestionType: string; // 'history' | 'lecture' | 'subject'
}

export interface SearchHistoryEntry {
    id: string;
    query: string;
    resultCount: number;
    isPinned: boolean;
    isFavorite: boolean;
    createdAt: string;
}

export interface IndexRebuildResult {
    entitiesProcessed: number;
    durationMs: number;
}

export interface IndexStatus {
    totalDocuments: number;
    lastBackfillAt?: string;
    isHealthy: boolean;
}

// ─── TauriClient ───────────────────────────────────────────────────────────
export interface StorageBreakdown {
    databaseBytes: number;
    videosBytes: number;
    logsBytes: number;
    otherBytes: number;
    totalBytes: number;
}

export const TauriClient = {
    // ── Settings ──────────────────────────────────────────────────────────
    getSettings: () => invoke<AppSettings>('settings_get'),
    updateSettings: (settings: Partial<AppSettings>) => invoke<AppSettings>('settings_update', { input: settings }),
    setApiKey: (key: string) => invoke<void>('settings_set_api_key', { input: { key } }),

    // ── Window ─────────────────────────────────────────────────────────────
    minimize: () => invoke<void>('window_minimize'),
    maximize: () => invoke<void>('window_maximize'),
    close: () => invoke<void>('window_close'),

    // ── System ─────────────────────────────────────────────────────────────
    checkNativeStatus: () => invoke<string>('native_messaging_status'),
    getDbHealth: () => invoke<{ ok: boolean; migrationVersion: number }>('db_health_check'),
    writeLog: (level: string, module: string, message: string) => invoke<void>('logger_write', { input: { level, module, message } }),
    getStorageLayout: () => invoke<any>('storage_get_layout'),
    changeStorageLocation: (newPath: string) => invoke<any>('storage_change_location', { input: { newPath } }),
    getStorageBreakdown: () => invoke<StorageBreakdown>('storage_get_breakdown'),
    deleteVideoAsset: (id: string) => invoke<void>('storage_delete_video', { id }),
    backupDatabase: (destinationPath: string) => invoke<void>('storage_backup_database', { input: { destinationPath } }),

    // Native Capture
    startNativeRecording: () => invoke<boolean>('start_native_recording'),
    stopNativeRecording: () => invoke<boolean>('stop_native_recording'),
    
    // Integrations
    pushTaskToNotion: (input: { token: string, pageId: string, title: string, content: string }) => 
        invoke<boolean>('push_task_to_notion', { input }),

    // ── Lectures ───────────────────────────────────────────────────────────
    listLectures: (filterJson?: string) => invoke<Lecture[]>('lectures_list', { filterJson }),
    getLecture: (id: string) => invoke<Lecture | null>('lectures_get', { id }),
    updateLecture: (input: UpdateLectureInput) => invoke<void>('lectures_update', { input }),
    /** Soft-delete (batch). Lectures move to Trash, not permanently removed. */
    deleteLectures: (ids: string[]) => invoke<void>('lectures_delete', { ids }),
    /** Hard-delete (batch). Permanently removes lectures. */
    hardDeleteLectures: (ids: string[]) => invoke<void>('lectures_hard_delete', { ids }),
    listTrash: () => invoke<Lecture[]>('lectures_list_trash'),
    restoreLectures: (ids: string[]) => invoke<void>('lectures_restore', { ids }),
    emptyTrash: () => invoke<number>('lectures_empty_trash'),
    mergeLectures: (primaryId: string, secondaryId: string) => invoke<string>('lectures_merge', { primaryId, secondaryId }),
    duplicateLecture: (id: string) => invoke<string>('lectures_duplicate', { id }),
    listTags: () => invoke<Tag[]>('tags_list'),
    addTagToLecture: (lectureId: string, tagName: string) => invoke<void>('lecture_add_tag', { lectureId, tagName }),
    removeTagFromLecture: (lectureId: string, tagName: string) => invoke<void>('lecture_remove_tag', { lectureId, tagName }),

    // ── Dashboard ──────────────────────────────────────────────────────────
    getDashboardSummary: () => invoke<DashboardSummary>('dashboard_summary'),

    // ── Folders ─────────────────────────────────────────────────────────────
    listFolders: () => invoke<Folder[]>('folders_list'),
    getFolderTree: () => invoke<FolderTreeNode[]>('get_folder_tree'),
    createFolder: (name: string, parentId?: string, color?: string, icon?: string, coverImagePath?: string, description?: string, subject?: string, semester?: string) => 
        invoke<Folder>('create_folder', { input: { name, parentId, color, icon, coverImagePath, description, subject, semester } }),
    updateFolder: (id: string, name?: string, color?: string, icon?: string, coverImagePath?: string, description?: string, subject?: string, semester?: string) => 
        invoke<Folder>('update_folder', { id, input: { name, color, icon, coverImagePath, description, subject, semester } }),
    renameFolder: (id: string, name: string) => invoke<void>('rename_folder', { id, name }),
    duplicateFolder: (id: string, deep: boolean) => invoke<Folder>('duplicate_folder', { id, deep }),
    moveFolder: (id: string, newParentId: string | null) => 
        invoke<void>('move_folder', { id, new_parent_id: newParentId }),
    reorderFolders: (parentId: string | null, orderedIds: string[]) => 
        invoke<void>('reorder_folders', { parentId, orderedIds }),
    setFolderFavorite: (id: string, favorite: boolean) => invoke<void>('set_folder_favorite', { id, favorite }),
    setFolderPinned: (id: string, pinned: boolean) => invoke<void>('set_folder_pinned', { id, pinned }),
    archiveFolder: (id: string, archived: boolean) => invoke<void>('archive_folder', { id, archived }),
    trashFolder: (id: string) => invoke<void>('trash_folder', { id }),
    restoreFolder: (id: string) => invoke<void>('restore_folder', { id }),
    deleteFolderPermanently: (id: string) => invoke<void>('delete_folder_permanently', { id }),
    lockFolder: (id: string, passcode: string) => invoke<void>('lock_folder', { id, passcode }),
    unlockFolder: (id: string, passcode: string) => invoke<boolean>('unlock_folder', { id, passcode }),
    removeFolderLock: (id: string, passcode: string) => invoke<void>('remove_folder_lock', { id, passcode }),
    getFolderDashboard: (id: string) => invoke<FolderDashboard>('get_folder_dashboard', { id }),
    recomputeFolderStatistics: (id: string) => invoke<FolderStatisticsCache>('recompute_folder_statistics', { id }),
    getFolderNotes: (folderId: string) => invoke<FolderNote[]>('get_folder_notes', { folderId }),
    createFolderNote: (folderId: string, kind: string, title: string) => invoke<FolderNote>('create_folder_note', { folderId, kind, title }),
    updateFolderNote: (id: string, title?: string, bodyMd?: string) => invoke<FolderNote>('update_folder_note', { id, title, bodyMd }),
    deleteFolderNote: (id: string) => invoke<void>('delete_folder_note', { id }),
    exportFolder: (id: string, dest: string, options: { includeMedia: boolean, includeStudyMaterials: boolean }) => 
        invoke<void>('folder_export', { id, dest, options }),
    importFolder: (src: string) => invoke<void>('folder_import', { src }),

    // ── Content ────────────────────────────────────────────────────────────
    getTranscript: (lectureId: string) => invoke<string | null>('transcript_get', { lectureId }),
    getNotes: (lectureId: string) => invoke<string | null>('notes_get', { lectureId }),
    updateNotes: (lectureId: string, content: string) => invoke<void>('notes_update', { lectureId, content }),
    getNoteVersions: (lectureId: string) => invoke<NoteVersion[]>('note_versions_list', { lectureId }),
    restoreNoteVersion: (versionId: string, lectureId: string) => invoke<void>('note_versions_restore', { versionId, lectureId }),
    getScreenshots: (lectureId: string) => invoke<Screenshot[]>('screenshots_get', { lectureId }),
    getSummary: (lectureId: string) => invoke<string | null>('summary_get', { lectureId }),
    readFileAsBase64: (path: string) => invoke<string>('read_file_as_base64', { path }),

    // ── AI ─────────────────────────────────────────────────────────────────
    /** Grounded chat — send lectureId to ground responses in lecture content. */
    sendAiChat: (prompt: string, history: ChatMessage[], lectureId?: string) =>
        invoke<void>('ai_chat_send', { input: { prompt, history, lectureId } }),
    sendFolderChat: (folderId: string, prompt: string, history: ChatMessage[]) =>
        invoke<void>('folder_chat_send', { input: { folderId, prompt, history } }),
    generateSummary: (lectureId: string, transcript: string) => invoke<string>('summary_generate', { lectureId, transcript }),
    generateFlashcards: (lectureId: string, transcript: string) => invoke<void>('flashcards_generate', { lectureId, transcript }),
    generateQuiz: (lectureId: string, transcript: string) => invoke<void>('quiz_generate', { lectureId, transcript }),
    /** Trigger the full intelligence engine (all 13 artifact types) — async, fires artifact_progress events. */
    generateIntelligence: (lectureId: string) => invoke<void>('lecture_intelligence_generate', { lectureId }),
    suggestFoldersForLecture: (lectureId: string) => invoke<FolderSuggestion[]>('suggest_folders_for_lecture', { lectureId }),

    // ── AI Workspace 2.0 ───────────────────────────────────────────────────
    createConversation: (scope: any, title?: string) => invoke<any>('create_conversation', { scope, title }),
    listConversations: (filter?: any) => invoke<Conversation[]>('list_conversations', { filter }),
    getOrCreateLectureConversation: (lectureId: string) => invoke<any>('get_or_create_lecture_conversation', { lectureId }),
    getConversationHistory: (conversationId: string) => 
        invoke<ChatMessageWithRefs[]>('get_conversation_history', { conversationId }),
    sendMessage: (conversationId: string, content: string) => 
        invoke<void>('send_message', { conversationId, content }),
    renameConversation: (id: string, title: string) => invoke<void>('rename_conversation', { id, title }),
    toggleConversationFavorite: (id: string) => invoke<void>('toggle_conversation_favorite', { id }),
    archiveConversation: (id: string) => invoke<void>('archive_conversation', { id }),
    deleteConversation: (id: string) => invoke<void>('delete_conversation', { id }),
    changeConversationScope: (id: string, scope: any) => invoke<void>('change_conversation_scope', { id, scope }),
    runStudyAction: (action: string, scope: any) => invoke<any>('run_study_action', { action, scope }),
    getStudyActionStatus: (runId: string) => invoke<any>('get_study_action_status', { runId }),

    // ── Prompts ────────────────────────────────────────────────────────────
    listPrompts: () => invoke<SavedPrompt[]>('list_prompts'),
    createPrompt: (name: string, body: string, category?: string) => 
        invoke<SavedPrompt>('create_prompt', { input: { name, body, category } }),
    updatePrompt: (id: string, name?: string, body?: string, category?: string) => 
        invoke<void>('update_prompt', { input: { id, name, body, category } }),
    togglePromptFavorite: (id: string, favorite: boolean) => 
        invoke<void>('toggle_prompt_favorite', { id, favorite }),
    deletePrompt: (id: string) => invoke<void>('delete_prompt', { id }),

    // ── Patterns & Compare ─────────────────────────────────────────────────
    detectPatterns: (scope: any) => invoke<any>('detect_patterns', { scope }),
    compareLectures: (lectureIds: string[]) => invoke<any>('compare_lectures', { lectureIds }),

    // ── Providers ──────────────────────────────────────────────────────────
    listProviders: () => invoke<ProviderConfig[]>('list_providers'),
    saveProviderConfig: (payload: SaveProviderConfigPayload) => 
        invoke<void>('save_provider_config', { payload }),

    // ── Artifacts ──────────────────────────────────────────────────────────
    getArtifact: (lectureId: string, artifactType: string) =>
        invoke<LectureArtifact | null>('artifacts_get', { lectureId, artifactType }),
    listArtifacts: (lectureId: string) => invoke<ArtifactMeta[]>('artifacts_list', { lectureId }),
    regenerateArtifact: (lectureId: string, artifactType: string) =>
        invoke<string>('artifacts_regenerate', { lectureId, artifactType }),

    // ── Timeline ───────────────────────────────────────────────────────────
    getTimeline: (lectureId: string) => invoke<TimelineEvent[]>('timeline_get', { lectureId }),
    addBookmark: (lectureId: string, timestampMs: number, label: string) =>
        invoke<string>('timeline_add_bookmark', { lectureId, timestampMs, label }),

    // ── Library ────────────────────────────────────────────────────────────

    getRecentlyViewed: () => invoke<RecentlyViewed[]>('recently_viewed_list'),
    addRecentlyViewed: (lectureId: string) => invoke<void>('recently_viewed_add', { lectureId }),

    // ── Flashcards ─────────────────────────────────────────────────────────
    listFlashcards: (lectureId: string) => invoke<Flashcard[]>('flashcards_list', { lectureId }),
    reviewFlashcard: (id: string, rating: number) => invoke<Flashcard>('flashcards_review', { id, rating }),
    getDueFlashcards: (lectureId?: string) => invoke<Flashcard[]>('flashcards_due', { lectureId }),
    createFlashcard: (lectureId: string, question: string, answer: string, difficulty: string) => 
        invoke<Flashcard>('flashcards_create', { lectureId, question, answer, difficulty }),
    updateFlashcard: (id: string, question: string, answer: string) => 
        invoke<Flashcard>('flashcards_update', { id, question, answer }),
    deleteFlashcard: (id: string) => invoke<void>('flashcards_delete', { id }),

    // ── Quiz ───────────────────────────────────────────────────────────────
    listQuizQuestions: (lectureId: string) => invoke<QuizQuestion[]>('quiz_list', { lectureId }),
    createQuizSession: (lectureId: string, mode: 'practice' | 'exam', timeLimitSeconds?: number) =>
        invoke<string>('quiz_sessions_create', { lectureId, mode, timeLimitSeconds }),
    completeQuizSession: (sessionId: string, answers: QuizAnswer[]) =>
        invoke<QuizResult>('quiz_sessions_complete', { sessionId, answers }),
    listQuizSessions: (lectureId: string) => invoke<QuizSession[]>('quiz_sessions_list', { lectureId }),

    // ── AI Video & Graph ───────────────────────────────────────────────────────────
    generateHighlightReel: (lectureId: string) => invoke<{startMs: number, endMs: number, reason: string}[]>('generate_highlight_reel', { lectureId }),
    generateKnowledgeGraph: () => invoke<{nodes: any[], links: any[]}>('generate_knowledge_graph'),
    generatePodcastScript: (lectureId: string) => invoke<string>('generate_podcast_script', { lectureId }),

    // ── OCR ────────────────────────────────────────────────────────────────
    enqueueOcr: (lectureId: string, imagePath: string) => invoke<void>('ocr_enqueue', { lectureId, imagePath }),
    getOcrStatus: (lectureId: string) => invoke<OcrStatus>('ocr_status', { lectureId }),

    // ── Search ─────────────────────────────────────────────────────────────
    search: (query: string, mode?: 'fts' | 'smart') => invoke<SearchResult[]>('search_query', { query, mode }),

    // ── Export ─────────────────────────────────────────────────────────────
    exportLecture: (lectureId: string, format: 'markdown' | 'pdf' | 'html' | 'json', dest: string) =>
        invoke<void>('export_lecture', { lectureId, format, dest }),
    exportFolderCramSheet: (folderId: string, dest: string) =>
        invoke<void>('export_folder_cram_sheet', { folderId, dest }),
    generateMagicLinkHtml: (lectureId: string, dest: string) =>
        invoke<void>('generate_magic_link_html', { lectureId, dest }),

    // ── Collections ────────────────────────────────────────────────────────
    createCollection: (input: CreateCollectionInput) => invoke<Collection>('create_collection', { input }),
    listCollections: () => invoke<CollectionWithCount[]>('list_collections'),
    addLecturesToCollection: (collectionId: string, lectureIds: string[]) => 
        invoke<void>('add_lectures_to_collection', { collectionId, lectureIds }),
    removeLecturesFromCollection: (collectionId: string, lectureIds: string[]) => 
        invoke<void>('remove_lectures_from_collection', { collectionId, lectureIds }),
    removeLecturesFromAllCollections: (lectureIds: string[]) => 
        invoke<void>('remove_lectures_from_all_collections', { lectureIds }),
    deleteCollection: (id: string) => invoke<void>('delete_collection', { id }),

    // ── Organization ───────────────────────────────────────────────────────
    moveLectures: (lectureIds: string[], targetFolderId: string | null) => 
        invoke<BatchResult>('move_lectures', { lecture_ids: lectureIds, target_folder_id: targetFolderId }),
    setFavorite: (lectureIds: string[], favorite: boolean) => invoke<void>('set_favorite', { lectureIds, favorite }),
    setPinned: (lectureIds: string[], pinned: boolean) => invoke<void>('set_pinned', { lectureIds, pinned }),
    setArchived: (lectureIds: string[], archived: boolean) => invoke<void>('set_archived', { lectureIds, archived }),

    // ── Universal Search ────────────────────────────────────────────────────────────
    folderSearch: (folderId: string, query: string) => invoke<UniversalSearchResult[]>('folder_search', { folderId, query }),
    universalSearch: (query: string, filters: SearchFilters, sort: SearchSort, limitPerType: number, cursor?: string) =>
        invoke<UniversalSearchResults>('universal_search', { query, filters, sort, limitPerType, cursor }),
    getSearchSuggestions: (partialQuery: string) => invoke<SearchSuggestion[]>('get_search_suggestions', { partialQuery }),
    recordSearchHistory: (query: string, resultCount: number) => invoke<void>('record_search_history', { query, resultCount }),
    listSearchHistory: (limit: number) => invoke<SearchHistoryEntry[]>('list_search_history', { limit }),
    pinSearch: (query: string, pinned: boolean) => invoke<void>('pin_search', { query, pinned }),
    clearSearchHistory: (entryId?: string) => invoke<void>('clear_search_history', { entryId }),
    rebuildSearchIndex: (full: boolean) => invoke<IndexRebuildResult>('rebuild_search_index', { full }),
    getIndexStatus: () => invoke<IndexStatus>('get_index_status'),
    summarizeSearchResults: (query: string, results: any[]) => invoke<void>('summarize_search_results', { query, results }),
    semanticSearch: (query: string) => invoke<{ answer: string, lectureId: string | null, timestampMs: number | null }>('semantic_search', { query }),

    // ── Workspace Notes ────────────────────────────────────────────────────────
    getWorkspaceNotes: () => invoke<any[]>('get_workspace_notes'),
    createWorkspaceNote: (title: string, content: string) => invoke<any>('create_workspace_note', { title, content }),
    updateWorkspaceNote: (id: string, title?: string, content?: string, isPinned?: boolean, tags?: string[]) =>
        invoke<any>('update_workspace_note', { id, title, content, isPinned, tags }),
    deleteWorkspaceNote: (id: string) => invoke<void>('delete_workspace_note', { id }),

    // ── Multimodal Teaching & Cross-Lecture Engine ────────────────────────
    transcriptCommentsList: (lectureId: string) => invoke<any[]>('transcript_comments_list', { lectureId }),
    transcriptCommentsAdd: (lectureId: string, timestampMs: number, blockIndex: number, text: string, author: string) => 
        invoke<any>('transcript_comments_add', { lectureId, timestampMs, blockIndex, text, author }),
    transcriptCommentsDelete: (id: string) => invoke<void>('transcript_comments_delete', { id }),
    analyzeConversation: (lectureId: string) => invoke<any>('analyze_conversation', { lectureId }),
    notesAiAugment: (lectureId: string, userDraft: string) => invoke<string>('notes_ai_augment', { lectureId, userDraft }),
    globalAskAi: (query: string) => invoke<string>('global_ask_ai', { query }),
    chatTeachingMode: (lectureId: string, prompt: string, persona: string) =>
        invoke<{ answer: string; confidence: string; citations: any[]; persona: string }>('chat_teaching_mode', { lectureId, prompt, persona }),
    getCrossLectureInsights: (courseLabel: string) =>
        invoke<Array<{ sourceLectureId: string; targetLectureId: string; linkType: string; explanation: string }>>('get_cross_lecture_insights', { courseLabel }),
    recordQuizAttempt: (topicName: string, isCorrect: boolean) =>
        invoke<void>('record_quiz_attempt', { topicName, isCorrect }),

    // ── Phase 2 Personalized Learning Intelligence ───────────────────────
    saveSessionState: (session: { lectureId: string; videoTimestampMs: number; activeTab: string; scrollPosition: number; openNoteId?: string; workspaceLayoutJson?: string }) =>
        invoke<void>('save_session_state', { session }),
    getSessionState: (lectureId: string) =>
        invoke<{ lectureId: string; videoTimestampMs: number; activeTab: string; scrollPosition: number; openNoteId?: string; workspaceLayoutJson?: string; updatedAt: number } | null>('get_session_state', { lectureId }),
    getSpacedRepetitionQueue: () =>
        invoke<{ dueToday: any[]; dueTomorrow: any[]; dueThisWeek: any[]; upcoming: any[] }>('get_spaced_repetition_queue'),
    reviewSpacedRepetitionItem: (itemType: string, itemId: string, lectureId: string | null, rating: number) =>
        invoke<void>('review_spaced_repetition_item', { itemType, itemId, lectureId, rating }),
    getLearningAnalytics: () =>
        invoke<{ currentStreakDays: number; longestStreakDays: number; totalHoursStudied: number; conceptsMastered: number; weakTopics: any[]; strongTopics: any[] }>('get_learning_analytics'),
    getDailyLearningPlan: () =>
        invoke<{ focusTitle: string; totalEstimatedMinutes: number; tasks: any[] }>('get_daily_learning_plan'),
    getAiStudyCoachSuggestions: () =>
        invoke<Array<{ id: string; title: string; description: string; actionType: string; lectureId?: string; estimatedMinutes: number; icon: string }>>('get_ai_study_coach_suggestions'),
    resetLearningHistory: () =>
        invoke<void>('reset_learning_history'),

    // ── Phase 4 Student Productivity & Time Saving Intelligence ─────────
    getLectureSkipSegments: (lectureId: string, durationMs: number) =>
        invoke<Array<{ id: string; lectureId: string; startMs: number; endMs: number; segmentType: string; category: string; summary: string }>>('get_lecture_skip_segments', { lectureId, durationMs }),
    getAutoBookmarks: (lectureId: string, durationMs: number) =>
        invoke<Array<{ id: string; lectureId: string; timestampMs: number; title: string; reason: string; screenshotPath?: string; category: string }>>('get_auto_bookmarks', { lectureId, durationMs }),
    generateNightBeforePlan: (windowMinutes: number) =>
        invoke<{ targetWindowMinutes: number; totalTasks: number; totalEstimatedMinutes: number; tasks: any[] }>('generate_night_before_plan', { windowMinutes }),
    predictExamQuestions: (lectureId: string) =>
        invoke<Array<{ id: string; lectureId: string; question: string; likelihood: string; explanation: string; references: string[] }>>('predict_exam_questions', { lectureId }),
    matchAssignmentHelper: (assignmentText: string) =>
        invoke<Array<{ questionNum: number; questionSnippet: string; lectureId: string; lectureTitle: string; timestampMs: number; relevantConcept: String; suggestedStudyOrder: number }>>('match_assignment_helper', { assignmentText }),
    generateOnePageCheatSheet: (lectureId: string) =>
        invoke<{ title: string; keyDefinitions: string[]; essentialFormulas: string[]; commonMistakes: string[]; examTips: string[] }>('generate_one_page_cheat_sheet', { lectureId }),

    // ── Event Listeners ────────────────────────────────────────────────────
    onAiChatChunk: (callback: (event: ChatChunkEvent) => void) => {
        return listen<ChatChunkEvent>('ai_chat_chunk', (event) => {
            callback(event.payload);
        });
    },
    onSearchSummaryChunk: (callback: (event: ChatChunkEvent) => void) => {
        return listen<ChatChunkEvent>('search://summary-chunk', (event) => {
            callback(event.payload);
        });
    },
    onAiChatFollowups: (callback: (data: { messageId: string, suggestions: string[] }) => void) => {
        return listen<{ messageId: string, suggestions: string[] }>('ai_chat_followups', (event) => {
            callback(event.payload);
        });
    },
    onArtifactProgress: (callback: (event: ArtifactProgressEvent) => void) => {
        return listen<ArtifactProgressEvent>('artifact_progress', (event) => {
            callback(event.payload);
        });
    },
    onPipelineProgress: (callback: (data: { sessionId: string; status: string; message: string }) => void) => {
        return listen<{ sessionId: string; status: string; message: string }>('pipeline_progress', (event) => {
            callback(event.payload);
        });
    },
    onRefreshLectures: (callback: () => void) => {
        return listen<void>('refresh_lectures', () => {
            callback();
        });
    },
    onSystemNotification: (callback: (data: { title: string; body: string }) => void) => {
        return listen<{ title: string; body: string }>('system_notification', (event) => {
            callback(event.payload);
        });
    },
    onTranscriptUpdate: (callback: (data: { session_id?: string; lectureId?: string; text?: string; content?: string; timestamp: number; platform?: string }) => void) => {
        return listen<any>('live_caption_received', (event) => {
            callback(event.payload);
        });
    },

    // ── Missing Mocks/Backend methods ──────────────────────────────────────
    translateTranscript: (lectureId: string, targetLanguage: string) => invoke<void>('translate_transcript', { lectureId, targetLanguage }),
    trimVideoByTimestamps: (lectureId: string, blocks: { startMs: number; endMs: number }[]) => invoke<void>('trim_video', { lectureId, blocks }),
    getAllActionItems: () => invoke<any[]>('get_all_action_items'),
    updateActionItemStatus: (lectureId: string, task: string, status: string) => invoke<void>('update_action_item_status', { lectureId, task, status }),
    fsWriteTextFile: (path: string, content: string) => invoke<void>('fs_write_text_file', { path, content }),
    soundbitesCreate: (lectureId: string, title: string, startMs: number, endMs: number, text: string, color: string) => invoke<any>('soundbites_create', { lectureId, title, startMs, endMs, text, color }),
    generatePreMeetingBrief: (attendees: string[], title: string) => invoke<any>('generate_pre_meeting_brief', { attendees, title }),
    analyzeInterviewLive: (input: { transcriptBuffer: string }) => invoke<{ questionDetected: boolean; suggestedAnswer?: string }>('analyze_interview_live', { input }),
    detectDecisionsLive: (input: { transcriptBuffer: string }) => invoke<{ decisionDetected: boolean; decisionText?: string }>('detect_decisions_live', { input }),
    confirmLiveDecision: (input: { lectureId: string; decisionText: string }) => invoke<boolean>('confirm_live_decision', { input }),
    syncMeetingToMarkdown: (lectureId: string) => invoke<boolean>('sync_meeting_to_markdown', { lectureId }),
    sendGlobalMemoryChat: (prompt: string, history?: any[]) => invoke<string>('send_global_memory_chat', { prompt, history }),
    saveLiveScratchpad: (lectureId: string, notes: string) => invoke<void>('save_live_scratchpad', { input: { lectureId, notes } }),
    pushToComposio: (task: string, owner: string, priority: string, destination: string) => invoke<string>('push_to_composio', { input: { task, owner, priority, destination } }),
    transcribeLiveAudioChunk: (audioBase64: string, mimeType: string, languageHint?: string) => 
        invoke<{ text: string; language: string; flag: string }>('transcribe_live_audio_chunk', { input: { audioBase64, mimeType, languageHint } }),
};
