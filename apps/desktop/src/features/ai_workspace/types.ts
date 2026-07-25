export type ChatScope = 
  | { lecture: string }
  | { multi_lecture: string[] }
  | { folder: string }
  | { subject: string }
  | { semester: string }
  | 'library';

export interface Conversation {
    id: string;
    title: string;
    scopeType: string;
    scopeRefJson: string;
    isPinned: boolean;
    isFavorite: boolean;
    isArchived: boolean;
    provider: string;
    model: string;
    createdAt: string;
    updatedAt: string;
}

export interface ConversationFilter {
    isPinned?: boolean;
    isFavorite?: boolean;
    isArchived?: boolean;
    scopeType?: string;
}

export interface MessageReference {
    id: string;
    lectureId: string;
    timestampSeconds?: number;
    refType: string;
    excerpt?: string;
}

export interface ChatMessageWithRefs {
    id: string;
    role: string;
    content: string;
    createdAt: string;
    references: MessageReference[];
}
