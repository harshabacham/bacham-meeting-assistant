import type { CaptureConfig, CaptureState, ChunkReadyPayload, NativeMessage } from '@/shared/types';
import { MessageType } from '@/shared/types';
import type { Logger } from '@/infrastructure/logger/logger';
import type { StorageService } from '@/infrastructure/storage/storageService';
import type { NativeMessagingClient } from '@/infrastructure/communication/nativeMessagingClient';
import {
  AUDIO_MIME_TYPE,
  VIDEO_MIME_TYPE,
} from '@/shared/constants/capture';
import { NATIVE_MESSAGING_PROTOCOL_VERSION } from '@/shared/constants/app';

/**
 * Capture Service
 *
 * Manages the MediaStream and MediaRecorder for tab audio/video capture.
 * Operates exclusively in the offscreen document context.
 *
 * Data flow:
 *   MediaRecorder → ondataavailable → chunk accumulation → CHUNK_READY message → NativeMessagingClient
 */

export interface CaptureService {
  /** Initialise a capture stream from a stream ID obtained via chrome.tabCapture. */
  startCapture(streamId: string, config: CaptureConfig, sessionId: string): Promise<void>;
  /** Pause the media recorder (data continues flowing but isn't processed). */
  pauseCapture(): void;
  /** Resume the media recorder after a pause. */
  resumeCapture(): void;
  /** Stop capture, flush the final chunk, and release the stream. */
  stopCapture(): Promise<void>;
  /** Take a screenshot from the active video stream */
  takeScreenshot(): Promise<string | null>;
  /** Current capture state snapshot. */
  readonly state: CaptureState;
}

/** Factory — all dependencies injected. */
export function createCaptureService(
  storage: StorageService,
  messagingClient: NativeMessagingClient,
  log: Logger,
): CaptureService {
  const MODULE = 'CaptureService';

  let mediaStream: MediaStream | null = null;
  let videoRecorder: MediaRecorder | null = null;
  let transcriptRecorder: MediaRecorder | null = null;
  let currentSessionId: string | null = null;
  
  let videoChunkIndex = 0;
  let transcriptChunkIndex = 0;
  
  let videoChunkBuffer: Blob[] = [];
  let videoChunkBufferBytes = 0;
  
  let transcriptChunkBuffer: Blob[] = [];

  // Promise chains that guarantee serial ordering of chunk flushes
  let videoFlushPromise = Promise.resolve();
  let transcriptFlushPromise = Promise.resolve();
  
  const _state: CaptureState = {
    isCapturing: false,
    isPaused: false,
    streamId: null,
    chunkCount: 0,
    currentChunkBytes: 0,
  };

  function getMutableState(): CaptureState {
    return _state;
  }

  function updateState(patch: Partial<CaptureState>): void {
    Object.assign(_state, patch);
  }

  function selectMimeType(config: CaptureConfig): string {
    if (config.video) {
      return MediaRecorder.isTypeSupported(VIDEO_MIME_TYPE) ? VIDEO_MIME_TYPE : 'video/webm';
    }
    return MediaRecorder.isTypeSupported(AUDIO_MIME_TYPE) ? AUDIO_MIME_TYPE : 'audio/webm';
  }

  async function sendBlobInSlices(blob: Blob, isTranscript: boolean, isFinal?: boolean): Promise<void> {
    const mimeType = blob.type;
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const CHUNK_SIZE = 512000; // 500 KB limit to stay well under 1MB Native Messaging limit

    for (let offset = 0; offset < bytes.byteLength; offset += CHUNK_SIZE) {
      const slice = bytes.slice(offset, offset + CHUNK_SIZE);
      let binary = '';
      for (let i = 0; i < slice.byteLength; i++) {
        binary += String.fromCharCode(slice[i]);
      }
      const dataBase64 = btoa(binary);

      const payload: ChunkReadyPayload = {
        chunkIndex: isTranscript ? transcriptChunkIndex : videoChunkIndex,
        mimeType,
        dataBase64,
        byteLength: slice.byteLength,
        isTranscriptChunk: isTranscript,
      };

      const message: NativeMessage<ChunkReadyPayload> = {
        version: NATIVE_MESSAGING_PROTOCOL_VERSION,
        type: MessageType.CHUNK_READY,
        payload,
        timestamp: Date.now(),
        ...(currentSessionId !== null ? { sessionId: currentSessionId } : {}),
      };

      if (typeof (messagingClient as any).sendAsync === 'function') {
        await (messagingClient as any).sendAsync(message);
      } else {
        messagingClient.send(message);
      }

      if (isTranscript) {
        log.debug(MODULE, 'Transcript chunk slice sent', { chunkIndex: transcriptChunkIndex, byteLength: slice.byteLength });
        transcriptChunkIndex++;
      } else {
        log.debug(MODULE, isFinal && offset + CHUNK_SIZE >= bytes.byteLength ? 'Final video chunk slice sent' : 'Video chunk slice sent', { chunkIndex: videoChunkIndex, byteLength: slice.byteLength });
        videoChunkIndex++;
      }
    }
  }

  async function flushVideoChunk(mimeType: string, isFinal: boolean): Promise<void> {
    if (videoChunkBuffer.length === 0) return;

    const blob = new Blob(videoChunkBuffer, { type: mimeType });
    videoChunkBuffer = [];
    videoChunkBufferBytes = 0;

    await sendBlobInSlices(blob, false, isFinal);
    updateState({ chunkCount: videoChunkIndex, currentChunkBytes: 0 });
  }

  async function flushTranscriptChunk(mimeType: string): Promise<void> {
    if (transcriptChunkBuffer.length === 0) return;

    const blob = new Blob(transcriptChunkBuffer, { type: mimeType });
    transcriptChunkBuffer = [];

    await sendBlobInSlices(blob, true);
  }

  async function takeScreenshot(): Promise<string | null> {
    if (!mediaStream) return null;
    const videoTrack = mediaStream.getVideoTracks()[0];
    if (!videoTrack) return null;

    try {
      // 1. Try ImageCapture API (most robust for MediaStreamTracks)
      // @ts-ignore - ImageCapture is a standard Web API in Chromium
      const imageCapture = new (window as any).ImageCapture(videoTrack);
      
      // Use Promise.race to prevent hanging if grabFrame() blocks on background tabs
      const bitmap = await Promise.race([
        imageCapture.grabFrame(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('grabFrame timeout')), 500))
      ]);
      
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(bitmap, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      return dataUrl.split(',')[1];
    } catch (err) {
      log.warn(MODULE, 'ImageCapture failed, falling back to video element', { err });
      // 2. Fallback to video element
      const videoEl = document.getElementById('bacham-playback-video') as HTMLVideoElement;
      if (!videoEl || !videoEl.videoWidth) {
        log.warn(MODULE, 'Fallback failed: video element not ready or width is 0');
        return null;
      }
      const canvas = document.createElement('canvas');
      canvas.width = videoEl.videoWidth;
      canvas.height = videoEl.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      return dataUrl.split(',')[1];
    }
  }

  async function startCapture(
    streamId: string,
    config: CaptureConfig,
    sessionId: string,
  ): Promise<void> {
    if (mediaStream) {
      log.warn(MODULE, 'startCapture called while already capturing — stopping first');
      await stopCapture();
    }

    currentSessionId = sessionId;
    videoChunkIndex = 0;
    transcriptChunkIndex = 0;
    videoChunkBuffer = [];
    videoChunkBufferBytes = 0;
    transcriptChunkBuffer = [];
    // Reset the flush promise chains
    videoFlushPromise = Promise.resolve();
    transcriptFlushPromise = Promise.resolve();

    const mediaSource = config.captureMode === 'screen' ? 'desktop' : 'tab';

    const constraints: MediaStreamConstraints = {
      audio: config.audio
        ? ({
            mandatory: {
              chromeMediaSource: mediaSource,
              chromeMediaSourceId: streamId,
            },
          } as unknown as MediaTrackConstraints)
        : false,
      video: (config.video || config.screenshotIntervalMs)
        ? ({
            mandatory: {
              chromeMediaSource: mediaSource,
              chromeMediaSourceId: streamId,
              minFrameRate: 30,
              maxFrameRate: 60,
            },
          } as unknown as MediaTrackConstraints)
        : false,
    };

    mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    log.info(MODULE, 'MediaStream acquired', { tracks: mediaStream.getTracks().length });

    // Listen for unexpected stream termination (e.g. user clicks browser's native "Stop sharing")
    mediaStream.getTracks().forEach(track => {
      track.onended = () => {
        log.info(MODULE, 'MediaStream track ended unexpectedly, triggering stop', { trackId: track.id });
        chrome.runtime.sendMessage({ type: 'STOP_SESSION' }).catch(err => {
          log.warn(MODULE, 'Failed to send STOP_SESSION on track end', { err });
        });
      };
    });

    if (config.audio) {
      try {
        const audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        audioEl.srcObject = mediaStream;
        audioEl.id = 'bacham-playback-audio';
        document.body.appendChild(audioEl);
      } catch (err) {
        log.warn(MODULE, 'Failed to route audio to HTMLAudioElement', { err });
      }
    }

    if (config.video || config.screenshotIntervalMs) {
      try {
        const videoEl = document.createElement('video');
        videoEl.autoplay = true;
        videoEl.muted = true;
        videoEl.playsInline = true;
        videoEl.srcObject = mediaStream;
        videoEl.id = 'bacham-playback-video';
        videoEl.onloadedmetadata = () => {
          videoEl.play().catch(e => log.warn(MODULE, 'Video element play failed', { e }));
        };
        document.body.appendChild(videoEl);
      } catch (err) {
        log.warn(MODULE, 'Failed to route video to HTMLVideoElement', { err });
      }
    }

    await storage.set({ activeStreamId: streamId });

    const mimeType = selectMimeType(config);
    const bitsPerSecond = config.video ? 2_500_000 : 128_000;

    // 1. Video Recorder (continuous, no restarts, 1s timeslice)
    if (config.video) {
      videoRecorder = new MediaRecorder(mediaStream, { mimeType, bitsPerSecond });
      videoRecorder.ondataavailable = (event) => {
        if (event.data.size === 0) return;
        videoChunkBuffer.push(event.data);
        videoChunkBufferBytes += event.data.size;
        updateState({ currentChunkBytes: videoChunkBufferBytes });
        // Chain each flush so chunks are always sent in order
        videoFlushPromise = videoFlushPromise.then(() => flushVideoChunk(mimeType, false));
      };
      videoRecorder.onerror = (event) => log.error(MODULE, 'videoRecorder error', { error: event.error?.message });
      videoRecorder.start(1000); // 1s timeslice keeps native message small
    }

    // 2. Transcript Recorder (audio only, continuous)
    if (config.audio) {
      const audioStream = new MediaStream(mediaStream.getAudioTracks());
      const transcriptMimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      transcriptRecorder = new MediaRecorder(audioStream, { mimeType: transcriptMimeType, bitsPerSecond: 128_000 });
      transcriptRecorder.ondataavailable = (event) => {
        if (event.data.size === 0) return;
        transcriptChunkBuffer.push(event.data);
        transcriptFlushPromise = transcriptFlushPromise.then(() => flushTranscriptChunk(transcriptMimeType));
      };
      transcriptRecorder.onerror = (event) => log.error(MODULE, 'transcriptRecorder error', { error: event.error?.message });
      transcriptRecorder.start(1000); // 1s timeslice keeps native message small
    }

    // 3. Live Speech Recognition (Microphone only)
    if (config.audio) {
      try {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = false;
          recognition.lang = 'en-US';

          recognition.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
              }
            }
            if (finalTranscript.trim()) {
              log.info(MODULE, 'SpeechRecognition transcript', { text: finalTranscript.trim() });
              // Wrap as a LocalTranscriptSegment (we will forward this to the sidecar via background script)
              chrome.runtime.sendMessage({
                type: 'LOCAL_TRANSCRIPT_SEGMENT',
                payload: { text: finalTranscript.trim(), timestamp: Date.now() }
              }).catch(err => log.warn(MODULE, 'Failed to send LOCAL_TRANSCRIPT_SEGMENT', { err }));
            }
          };

          recognition.onerror = (event: any) => {
            log.warn(MODULE, 'SpeechRecognition error', { error: event.error });
          };
          
          recognition.onend = () => {
             // Restart if we are still capturing and it ended unexpectedly
             if (_state.isCapturing && !(window as any).__bacham_speech_stopped) {
                 recognition.start();
             }
          };

          (window as any).__bacham_speech_stopped = false;
          recognition.start();
          (window as any).__bacham_speech_recognition = recognition;
        } else {
          log.warn(MODULE, 'SpeechRecognition API not supported in this browser');
        }
      } catch (err) {
        log.warn(MODULE, 'Failed to initialize SpeechRecognition', { err });
      }
    }

    updateState({
      isCapturing: true,
      isPaused: false,
      streamId,
      chunkCount: 0,
      currentChunkBytes: 0,
    });

    log.info(MODULE, 'Capture started', { sessionId, mimeType });
  }

  function pauseCapture(): void {
    if (videoRecorder && videoRecorder.state === 'recording') videoRecorder.pause();
    if (transcriptRecorder && transcriptRecorder.state === 'recording') transcriptRecorder.pause();
    updateState({ isPaused: true });
    log.info(MODULE, 'Capture paused');
  }

  function resumeCapture(): void {
    if (videoRecorder && videoRecorder.state === 'paused') videoRecorder.resume();
    if (transcriptRecorder && transcriptRecorder.state === 'paused') transcriptRecorder.resume();
    updateState({ isPaused: false });
    log.info(MODULE, 'Capture resumed');
  }

  async function stopCapture(): Promise<void> {
    if (!mediaStream) {
      log.warn(MODULE, 'stopCapture called but no active capture');
      return;
    }

    // Stop both recorders and wait for their onstop to fire
    await new Promise<void>((resolve) => {
      if (!videoRecorder || videoRecorder.state === 'inactive') { resolve(); return; }
      videoRecorder.onstop = () => resolve();
      videoRecorder.stop();
    });

    await new Promise<void>((resolve) => {
      if (!transcriptRecorder || transcriptRecorder.state === 'inactive') { resolve(); return; }
      // Remove any pending restart handler from the interval
      transcriptRecorder.onstop = () => resolve();
      transcriptRecorder.stop();
    });

    // NOW await all pending flush promise chains — this catches the final ondataavailable
    // events that fired just before/during stop()
    await videoFlushPromise;
    await transcriptFlushPromise;

    if (videoRecorder) {
      await flushVideoChunk(videoRecorder.mimeType, true);
    }
    
    if (transcriptRecorder) {
      await flushTranscriptChunk(transcriptRecorder.mimeType);
    }

    for (const track of mediaStream.getTracks()) {
      track.stop();
    }
    
    // Stop Speech Recognition if active
    if ((window as any).__bacham_speech_recognition) {
       (window as any).__bacham_speech_stopped = true;
       (window as any).__bacham_speech_recognition.stop();
       delete (window as any).__bacham_speech_recognition;
    }
    mediaStream = null;
    videoRecorder = null;
    transcriptRecorder = null;
    currentSessionId = null;

    const audioEl = document.getElementById('bacham-playback-audio');
    if (audioEl) audioEl.remove();

    const videoEl = document.getElementById('bacham-playback-video');
    if (videoEl) videoEl.remove();

    await storage.set({ activeStreamId: null });

    updateState({
      isCapturing: false,
      isPaused: false,
      streamId: null,
    });

    log.info(MODULE, 'Capture stopped');
  }

  return {
    startCapture,
    pauseCapture,
    resumeCapture,
    stopCapture,
    takeScreenshot,
    get state() { return getMutableState(); },
  };
}