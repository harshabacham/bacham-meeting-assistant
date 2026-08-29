/**
 * Barrel export for all shared types.
 * Import from '@/shared/types' throughout the codebase.
 */
export type { Session, SessionState, StartSessionIntent, LectureSummary, HistoryData } from './session';
export type { CaptureConfig, CaptureState, DetectedPlatform } from './capture';
export type { PermissionName, PermissionGrantState, PermissionStatus } from './permissions';
export type { StorageSchema } from './storage';
export { CURRENT_SCHEMA_VERSION, DEFAULT_STORAGE } from './storage';
export type {
  NativeMessage,
  SessionStartPayload,
  SessionStopPayload,
  ChunkReadyPayload,
  MetadataReadyPayload,
  LiveCaptionPayload,
  LiveNotePayload,
  HeartbeatPayload,
  AckPayload,
  ErrorPayload,
  GetStreamIdPayload,
  DeleteLecturePayload,
  RenameLecturePayload,
  TriggerSnapshotPayload,
  MuteStatePayload,
  ConnectionStatus,
  BackgroundState,
  InternalMessage,
  InternalResponse,
} from './messaging';
export { MessageType } from './messaging';

export type { LogLevel, LogEntry } from './logger';
