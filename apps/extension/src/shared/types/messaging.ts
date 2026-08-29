/**
 * Enum of all native messaging and internal message types.
 * Direction: E = Extension→Desktop, D = Desktop→Extension, I = Internal (popup↔background).
 */
export enum MessageType {
  // --- Native Messaging (Extension → Desktop) ---
  /** Signals the start of a new session. Payload: SessionStartPayload. */
  SESSION_START = 'SESSION_START',
  /** Signals the end of a session. Payload: SessionStopPayload. */
  SESSION_STOP = 'SESSION_STOP',
  /** A captured media chunk is ready. Payload: ChunkReadyPayload. */
  CHUNK_READY = 'CHUNK_READY',
  /** Process transcript data. Payload: TranscriptProcessPayload. */
  TRANSCRIPT_PROCESS = 'TRANSCRIPT_PROCESS',
  /** Session metadata (title, URL, label) is ready. Payload: MetadataReadyPayload. */
  METADATA_READY = 'METADATA_READY',
  /** Live caption extracted from the DOM. Payload: LiveCaptionPayload. */
  LIVE_CAPTION = 'LIVE_CAPTION',
  /** Heartbeat to keep the native messaging port alive. Payload: HeartbeatPayload. */
  HEARTBEAT = 'HEARTBEAT',
  /** Live note from the user. Payload: LiveNotePayload. */
  LIVE_NOTE = 'LIVE_NOTE',

  // --- Native Messaging (Desktop → Extension) ---
  /** Acknowledgement from the Desktop App. Payload: AckPayload. */
  ACK = 'ACK',
  /** Error from the Desktop App. Payload: ErrorPayload. */
  ERROR = 'ERROR',
  /** Confirm a decision natively */
  CONFIRM_DECISION = 'CONFIRM_DECISION',
  /** Live transcript segment broadcast from Desktop. */
  TRANSCRIPT_SEGMENT = 'TRANSCRIPT_SEGMENT',
  /** Live interview insight broadcast from Desktop. */
  INTERVIEW_INSIGHT = 'INTERVIEW_INSIGHT',

  // --- Internal (Popup ↔ Background) ---
  /** Popup requests current full state. Payload: none. */
  GET_STATE = 'GET_STATE',
  /** Background pushes full state to popup. Payload: BackgroundState. */
  STATE_UPDATE = 'STATE_UPDATE',
  /** Pre-warm the offscreen document. Payload: none. */
  PRE_WARM_OFFSCREEN = 'PRE_WARM_OFFSCREEN',
  /** Popup sends start-session intent. Payload: StartSessionIntent. */
  START_SESSION = 'START_SESSION',
  /** Popup sends pause-session intent. Payload: none. */
  PAUSE_SESSION = 'PAUSE_SESSION',
  /** Popup sends resume-session intent. Payload: none. */
  RESUME_SESSION = 'RESUME_SESSION',
  /** Popup sends stop-session intent. Payload: none. */
  STOP_SESSION = 'STOP_SESSION',
  /** Popup sends discard-session intent. Payload: none. */
  DISCARD_SESSION = 'DISCARD_SESSION',
  /** Popup requests permission grant. Payload: none. */
  REQUEST_PERMISSIONS = 'REQUEST_PERMISSIONS',
  /** Popup sends updated capture config. Payload: CaptureConfig. */
  UPDATE_CAPTURE_CONFIG = 'UPDATE_CAPTURE_CONFIG',
  /** Popup requests tab stream ID to initiate capture. Payload: GetStreamIdPayload. */
  GET_STREAM_ID = 'GET_STREAM_ID',
  /** Offscreen document forwards NativeMessage to background to route to native host. Payload: NativeMessage. */
  FORWARD_TO_NATIVE = 'FORWARD_TO_NATIVE',
  /** Delete a lecture from the Desktop App DB. Payload: DeleteLecturePayload. */
  DELETE_LECTURE = 'DELETE_LECTURE',
  /** Rename a lecture in the Desktop App DB. Payload: RenameLecturePayload. */
  RENAME_LECTURE = 'RENAME_LECTURE',
  /** Internal: popup sends delete lecture to background to forward. */
  SEND_DELETE_LECTURE = 'SEND_DELETE_LECTURE',
  /** Sent by offscreen doc to background when Web Speech API transcribes text */
  LOCAL_TRANSCRIPT_SEGMENT = 'LOCAL_TRANSCRIPT_SEGMENT',
  /** Internal: popup sends rename lecture to background to forward. */
  SEND_RENAME_LECTURE = 'SEND_RENAME_LECTURE',
  /** Internal: content script triggers an immediate screenshot based on DOM observation. */
  TRIGGER_SNAPSHOT = 'TRIGGER_SNAPSHOT',
  /** Internal: popup requests a live catch-me-up AI summary of recent captions. Payload: none. */
  CATCHUP_REQUEST = 'CATCHUP_REQUEST',
  /** Internal: content script detected a mic mute/unmute change in the meeting tab. */
  MUTE_STATE_CHANGE = 'MUTE_STATE_CHANGE',
  /** Internal: popup requests a manual retry of the native messaging connection. Payload: none. */
  RETRY_CONNECTION = 'RETRY_CONNECTION',
  /** Internal: content script confirms a decision. */
  DECISION_CONFIRMED = 'DECISION_CONFIRMED',
  PREWARM_OFFSCREEN = 'PREWARM_OFFSCREEN',
  GET_HISTORY = 'GET_HISTORY',
  HISTORY_DATA = 'HISTORY_DATA',
}

// ---------------------------------------------------------------------------
// Native message envelope
// ---------------------------------------------------------------------------

/**
 * Typed native messaging envelope.
 * All messages sent to/from the Desktop App must conform to this shape.
 */
export interface NativeMessage<T> {
  /** Protocol version string — bump when breaking changes are made. */
  readonly version: string;
  /** Message type discriminator. */
  readonly type: MessageType;
  /** Typed payload. */
  readonly payload: T;
  /** Unix timestamp (ms) when the message was created. */
  readonly timestamp: number;
  /** Session ID if this message belongs to a session. */
  readonly sessionId?: string;
}

// ---------------------------------------------------------------------------
// Native message payloads
// ---------------------------------------------------------------------------

/** Payload for SESSION_START. */
export interface SessionStartPayload {
  readonly tabTitle: string;
  readonly tabUrl: string;
  readonly courseLabel?: string;
  readonly captureAudio: boolean;
  readonly captureVideo: boolean;
  readonly screenshotIntervalMs?: number;
}

/** Payload for SESSION_STOP. */
export interface SessionStopPayload {
  readonly endedAt: string;
  readonly durationMs: number;
}

/** Payload for CHUNK_READY. */
export interface ChunkReadyPayload {
  /** Zero-based chunk index within the session. */
  readonly chunkIndex: number;
  /** MIME type of the chunk data (e.g. 'audio/webm;codecs=opus'). */
  readonly mimeType: string;
  /**
   * Base64-encoded chunk data.
   * NOTE: for very large chunks consider file-system intermediation.
   * Chunks are bounded by CAPTURE_CHUNK_DURATION_MS in capture constants.
   */
  readonly dataBase64: string;
  /** Size of the chunk in bytes. */
  readonly byteLength: number;
  /** Whether this chunk contains transcript data. */
  readonly isTranscriptChunk?: boolean;
}

/** Payload for TRANSCRIPT_PROCESS. */
export interface TranscriptProcessPayload {
  readonly chunkIndex: number;
}

/** Payload for METADATA_READY. */
export interface MetadataReadyPayload {
  readonly tabTitle: string;
  readonly tabUrl: string;
  readonly courseLabel?: string;
  readonly detectedPlatform: string;
  readonly capturedAt: string;
  /** Base64-encoded PNG image of the captured screenshot. */
  readonly imageBase64?: string;
}

/** Payload for LIVE_CAPTION. */
export interface LiveCaptionPayload {
  readonly text: string;
  readonly speakerName?: string;
  readonly timestamp: number;
  readonly platform: string;
}

/** Payload for LIVE_NOTE. */
export interface LiveNotePayload {
  readonly text: string;
}

/** Payload for HEARTBEAT. */
export interface HeartbeatPayload {
  readonly sequenceNumber: number;
}

/** Payload for ACK. */
export interface AckPayload {
  /** The type of the message being acknowledged. */
  readonly acknowledgedType: MessageType;
  /** The timestamp of the message being acknowledged. */
  readonly acknowledgedTimestamp: number;
}

/** Payload for ERROR from Desktop App. */
export interface ErrorPayload {
  readonly code: string;
  readonly message: string;
}

/** Payload for GET_STREAM_ID. */
export interface GetStreamIdPayload {
  readonly tabId: number;
  readonly targetTabId: number;
}

/** Payload for DELETE_LECTURE. */
export interface DeleteLecturePayload {
  readonly lectureId: string;
}

/** Payload for RENAME_LECTURE. */
export interface RenameLecturePayload {
  readonly lectureId: string;
  readonly newTitle: string;
}

/** Payload for TRIGGER_SNAPSHOT. */
export interface TriggerSnapshotPayload {
  readonly reason: string;
  readonly platform: string;
}

/** Payload for MUTE_STATE_CHANGE. */
export interface MuteStatePayload {
  /** true = mic is now muted, false = mic is now active */
  readonly muted: boolean;
  readonly platform: string;
}

// ---------------------------------------------------------------------------
// Connection state
// ---------------------------------------------------------------------------

/**
 * Connection status to the Desktop Application via native messaging.
 */
export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'degraded';

// ---------------------------------------------------------------------------
// Internal popup ↔ background messaging
// ---------------------------------------------------------------------------

import type { Session, SessionState } from './session';
import type { CaptureConfig, CaptureState } from './capture';
import type { PermissionStatus } from './permissions';

/** Full background state snapshot pushed to popup. */
export interface BackgroundState {
  readonly session: Session | null;
  readonly sessionState: SessionState;
  readonly captureConfig: CaptureConfig;
  readonly captureState: CaptureState;
  readonly permissionStatus: PermissionStatus;
  readonly connectionStatus: ConnectionStatus;
  readonly pendingQueueSize: number;
}

/** A typed internal message sent between popup and background. */
export interface InternalMessage<T = unknown> {
  readonly type: MessageType;
  readonly payload?: T;
}

/** Response envelope for internal messages. */
export interface InternalResponse<T = unknown> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
}
