use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MessageType {
    SessionStart,
    SessionStop,
    ChunkReady,
    TranscriptProcess,
    MetadataReady,
    Heartbeat,
    Ack,
    Error,
    DeleteLecture,
    RenameLecture,
    TriggerSnapshot,
    LiveCaption,
    ConfirmDecision,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NativeMessage<T> {
    pub version: String,
    pub r#type: MessageType,
    pub payload: T,
    pub timestamp: i64,
    pub session_id: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ConnectionStatus {
    Disconnected,
    Connecting,
    Connected,
    Degraded,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SessionStartPayload {
    pub tab_title: String,
    pub tab_url: String,
    pub course_label: Option<String>,
    pub capture_audio: bool,
    pub capture_video: bool,
    pub screenshot_interval_ms: Option<u32>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SessionStopPayload {
    pub ended_at: String,
    pub duration_ms: u32,
    pub chunk_count: u32,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ChunkReadyPayload {
    pub chunk_index: u32,
    pub mime_type: String,
    pub data_base64: String,
    pub byte_length: u32,
    pub is_transcript_chunk: Option<bool>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptProcessPayload {
    pub chunk_index: u32,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DeleteLecturePayload {
    pub lecture_id: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RenameLecturePayload {
    pub lecture_id: String,
    pub new_title: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LiveCaptionPayload {
    pub text: String,
    pub speaker_name: Option<String>,
    pub timestamp: i64,
    pub platform: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ConfirmDecisionPayload {
    pub decision_text: String,
}
