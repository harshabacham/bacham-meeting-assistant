export interface Settings {
  theme: string;
  accentColor: string;
  language: string;
  spokenLanguage: string;
  storageRootPath: string;
  geminiApiKeySet: boolean;
  smartSearchEnabled?: boolean;
  aiProvider: string;
  aiMaxRetries: number;
  workspacePanelSizes: number[];
  speakerMapping: Record<string, string>;
  autoExportMarkdown: boolean;
  markdownExportPath: string;
  transcriptionEngine: 'gemini' | 'whisper';
  autoStartRecording?: boolean;
}

export interface UpdateSettingsInput {
  theme?: string;
  accentColor?: string;
  language?: string;
  spokenLanguage?: string;
  smartSearchEnabled?: boolean;
  aiProvider?: string;
  aiMaxRetries?: number;
  workspacePanelSizes?: number[];
  speakerMapping?: Record<string, string>;
  autoExportMarkdown?: boolean;
  markdownExportPath?: string;
  transcriptionEngine?: 'gemini' | 'whisper';
  autoStartRecording?: boolean;
}

export interface AppSettings {
    theme: string;
    accentColor: string;
    language: string;
    spokenLanguage: string;
    storageRootPath: string;
    geminiApiKeySet: boolean;
    smartSearchEnabled?: boolean;
    aiProvider: string;
    aiMaxRetries: number;
    workspacePanelSizes: number[];
    speakerMapping: Record<string, string>;
    autoExportMarkdown: boolean;
    markdownExportPath: string;
    transcriptionEngine: 'gemini' | 'whisper';
    autoStartRecording?: boolean;
}

export interface Lecture {
    id: string;
    title: string;
    courseLabel: string | null;
    course: string | null;
    teacher: string | null;
    semester: string | null;
    folderId: string | null;
    createdAt: string;
    updatedAt: string;
    durationMs: number;
    source: string;
    isFavorite: boolean;
    isPinned: boolean;
    isArchived: boolean;
    subject: string | null;
    description: string | null;
    tags: string[];
    trashedAt?: string | null;
    customSortOrder?: number | null;
    lastOpenedAt?: string | null;
    workspaceType?: 'lecture' | 'meeting' | 'interview' | 'podcast' | null;
    lastStudiedAt?: string | null;
    status?: string;
    startTime?: string;
    videoPath?: string;
}

export interface Collection {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
    is_smart: boolean;
    smart_rule_json: string | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface CollectionWithCount extends Collection {
    lecture_count: number;
}

export interface CreateCollectionInput {
    name: string;
    color?: string | null;
    icon?: string | null;
    is_smart?: boolean;
    smart_rule_json?: string | null;
}

export interface BatchResult {
    succeeded: string[];
    failed: [string, string][];
}

export interface Folder {
    id: string;
    name: string;
    parentId: string | null;
    color: string | null;
    icon: string | null;
    coverImagePath: string | null;
    description: string | null;
    subject: string | null;
    semester: string | null;
    sortOrder: number;
    isLocked: boolean;
    isFavorite: boolean;
    isPinned: boolean;
    isArchived: boolean;
    trashedAt: string | null;
    createdAt: number | null;
    updatedAt: number | null;
}

export interface FolderTreeNode {
    folder: Folder;
    children: FolderTreeNode[];
}

export interface FolderNote {
    id: string;
    folderId: string;
    title: string;
    bodyMd: string;
    kind: string; // "scratchpad" | "study_guide" | "custom"
    createdAt: number;
    updatedAt: number;
}

export interface FolderStatisticsCache {
    folderId: string;
    lectureCount: number;
    studyHours: number;
    storageBytes: number;
    flashcardCount: number;
    quizCount: number;
    noteCount: number;
    completionPct: number;
    computedAt: string;
}

export interface FolderDashboard {
    folder: Folder;
    statistics: FolderStatisticsCache;
    recentLectures: Lecture[];
    pinnedLectures: Lecture[];
    recentChats: any[]; // Conversation[]
    recentNotes: FolderNote[];
    continueLearning?: Lecture;
}

export interface FolderSuggestion {
    folderId: string;
    confidence: number;
    reason: string;
}

export interface DashboardSummary {
    recentLectures: Lecture[];
    pinnedLectures: Lecture[];
    continueLearning?: Lecture;
    todayActivityCount: number;
    storageUsedBytes: number;
    totalLectures: number;
    totalDurationMs: number;
}

export interface SearchResult {
    lectureId: string;
    lectureTitle: string;
    matchType: string;
    snippet: string;
}

export interface OcrStatus {
    pending: number;
    total: number;
}

export interface ChatMessage {
    role: string;
    content: string;
}

export interface UpdateLectureInput {
    id: string;
    title?: string;
    courseLabel?: string;
    folderId?: string;
    isFavorite?: boolean;
    isPinned?: boolean;
    isArchived?: boolean;
    subject?: string;
    description?: string;
    course?: string;
    semester?: string;
    teacher?: string;
    colorLabel?: string;
    videoPath?: string;
}

export interface StorageLayout {
  root: string;
  data: string;
  logs: string;
  settings: string;
  temp: string;
}

export interface DbHealth {
  ok: boolean;
  migrationVersion: number;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'degraded';
