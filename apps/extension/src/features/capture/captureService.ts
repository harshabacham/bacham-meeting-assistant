import type { CaptureConfig, CaptureState, ChunkReadyPayload, NativeMessage } from '@/shared/types';
import { MessageType } from '@/shared/types';
import type { Logger } from '@/infrastructure/logger/logger';
import type { StorageService } from '@/infrastructure/storage/storageService';
import {
  AUDIO_MIME_TYPE,
  VIDEO_MIME_TYPE,
} from '@/shared/constants/capture';
import { NATIVE_MESSAGING_PROTOCOL_VERSION } from '@/shared/constants/app';
import { offlineMediaVault } from '@/infrastructure/storage/offlineMediaVault';

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
  log: Logger,
): CaptureService {
  const MODULE = 'CaptureService';

  let mediaStream: MediaStream | null = null;
  let micStream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let videoRecorder: MediaRecorder | null = null;
  let transcriptRecorder: MediaRecorder | null = null;
  let currentSessionId: string | null = null;
  
  let videoChunkIndex = 0;
  let transcriptChunkIndex = 0;

  let videoChunkBuffer: Blob[] = [];
  let videoChunkBufferBytes = 0;
  
  let transcriptChunkBuffer: Blob[] = [];
  
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
      if (config.resolution === '4k' || config.resolution === '1440p') {
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
          return 'video/webm;codecs=vp9,opus';
        }
      }
      return MediaRecorder.isTypeSupported(VIDEO_MIME_TYPE) ? VIDEO_MIME_TYPE : 'video/webm';
    }
    return MediaRecorder.isTypeSupported(AUDIO_MIME_TYPE) ? AUDIO_MIME_TYPE : 'audio/webm';
  }

  async function sendBlobInSlices(blob: Blob, isTranscript: boolean): Promise<void> {
    if (blob.size === 0) return;
    try {
      const mimeType = blob.type || (isTranscript ? 'audio/webm' : 'video/webm');
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const CHUNK_SIZE = 512000; // 500 KB

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

        const nativeMsg: NativeMessage<ChunkReadyPayload> = {
          version: NATIVE_MESSAGING_PROTOCOL_VERSION,
          type: MessageType.CHUNK_READY,
          payload,
          timestamp: Date.now(),
          ...(currentSessionId ? { sessionId: currentSessionId } : {}),
        };

        chrome.runtime.sendMessage({
          type: MessageType.FORWARD_TO_NATIVE,
          payload: nativeMsg,
        }).catch(() => {});

        if (isTranscript) {
          transcriptChunkIndex++;
        } else {
          videoChunkIndex++;
        }
      }
    } catch (err) {
      log.warn(MODULE, 'Failed to send chunk slice over native messaging', { err });
    }
  }

  async function uploadBlob(blob: Blob, type: 'video' | 'transcript'): Promise<boolean> {
    if (blob.size === 0) return true;
    try {
      log.info(MODULE, `Uploading ${type} blob via HTTP...`, { size: blob.size, mimeType: blob.type });
      const res = await fetch(`http://127.0.0.1:1422/upload?sessionId=${currentSessionId}&type=${type}`, {
        method: 'POST',
        body: blob,
      });
      if (!res.ok) {
        throw new Error(`Upload failed with status: ${res.status}`);
      }
      log.info(MODULE, `Successfully uploaded ${type} blob`);
      return true;
    } catch (err: any) {
      log.warn(MODULE, `HTTP upload of ${type} blob failed (desktop app offline or unreachable)`, { err: err.message });
      return false;
    }
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
    videoChunkBuffer = [];
    videoChunkBufferBytes = 0;
    transcriptChunkBuffer = [];

    let acquiredStream: MediaStream | null = null;

    if (streamId) {
      try {
        const isTabCapture = !config.captureMode || config.captureMode === 'tab' || config.captureMode === 'audio';
        const mediaSource = isTabCapture ? 'tab' : 'desktop';

        const videoConstraints: any = {
          chromeMediaSource: mediaSource,
          chromeMediaSourceId: streamId,
        };

        if (config.resolution === '4k') {
          videoConstraints.maxWidth = 3840;
          videoConstraints.maxHeight = 2160;
        } else if (config.resolution === '1440p') {
          videoConstraints.maxWidth = 2560;
          videoConstraints.maxHeight = 1440;
        } else if (config.resolution === '1080p') {
          videoConstraints.maxWidth = 1920;
          videoConstraints.maxHeight = 1080;
        } else if (config.resolution === '720p') {
          videoConstraints.maxWidth = 1280;
          videoConstraints.maxHeight = 720;
        }

        const constraints: any = {
          audio: config.audio ? {
            mandatory: {
              chromeMediaSource: mediaSource,
              chromeMediaSourceId: streamId,
            }
          } : false,
          video: (config.video || !!config.screenshotIntervalMs) ? {
            mandatory: videoConstraints,
          } : false,
        };
        acquiredStream = await navigator.mediaDevices.getUserMedia(constraints);
        log.info(MODULE, 'Acquired video stream via getUserMedia', { tracks: acquiredStream.getTracks().length });
      } catch (err: any) {
        log.warn(MODULE, `getUserMedia with streamId failed (${err?.name}: ${err?.message}), attempting getDisplayMedia fallback`);
      }
    }

    if (!acquiredStream) {
      try {
        log.info(MODULE, 'Attempting getDisplayMedia stream acquisition...');
        let videoFallbackConstraints: any = true;
        if (config.resolution === '4k') {
          videoFallbackConstraints = { width: { ideal: 3840, max: 3840 }, height: { ideal: 2160, max: 2160 } };
        } else if (config.resolution === '1440p') {
          videoFallbackConstraints = { width: { ideal: 2560, max: 2560 }, height: { ideal: 1440, max: 1440 } };
        } else if (config.resolution === '1080p') {
          videoFallbackConstraints = { width: { ideal: 1920, max: 1920 }, height: { ideal: 1080, max: 1080 } };
        } else if (config.resolution === '720p') {
          videoFallbackConstraints = { width: { ideal: 1280, max: 1280 }, height: { ideal: 720, max: 720 } };
        }

        const needVideo = Boolean(config.video || config.screenshotIntervalMs);
        acquiredStream = await navigator.mediaDevices.getDisplayMedia({
          // Chromium getDisplayMedia requires video to be true or constraint dictionary; passing false throws TypeError
          video: needVideo ? videoFallbackConstraints : true,
          audio: config.audio ?? true,
        });
        if (!needVideo) {
          // If in Audio Only mode, immediately stop video tracks so only audio is recorded
          acquiredStream.getVideoTracks().forEach(track => track.stop());
        }
        log.info(MODULE, 'Acquired stream via getDisplayMedia', { tracks: acquiredStream.getTracks().length, needVideo });
      } catch (err: any) {
        log.error(MODULE, 'Both getUserMedia and getDisplayMedia failed', { err: err?.message || String(err) });
        throw new Error(`Capture error: ${err?.message || err?.name || 'Failed to acquire media stream'}`);
      }
    }

    mediaStream = acquiredStream;
    
    log.info(MODULE, 'MediaStream acquired', { tracks: mediaStream.getTracks().length });

    // Enable 'detail' contentHint on video tracks for crystal-clear text, slides, and code
    mediaStream.getVideoTracks().forEach(track => {
      try {
        if ('contentHint' in track) {
          track.contentHint = 'detail';
        }
      } catch (err) {
        log.warn(MODULE, 'Could not set contentHint on video track', { err });
      }
    });

    // Listen for unexpected stream termination (e.g. user clicks browser's native "Stop sharing")
    mediaStream.getTracks().forEach(track => {
      track.onended = () => {
        log.info(MODULE, 'MediaStream track ended unexpectedly, triggering stop', { trackId: track.id });
        chrome.runtime.sendMessage({ type: 'STOP_SESSION' }).catch(err => {
          log.warn(MODULE, 'Failed to send STOP_SESSION on track end', { err });
        });
      };
    });

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

    // 1. Setup Audio (Display Audio + Microphone Mixing via Web Audio API)
    let mixedAudioStream: MediaStream | null = null;

    if (config.includeMicrophone || config.audio) {
      try {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        log.info(MODULE, 'Microphone stream acquired for mixing');
        chrome.runtime.sendMessage({
          type: 'MIC_PERMISSION_STATUS',
          payload: { granted: true }
        }).catch(() => {});
      } catch (err: any) {
        log.warn(MODULE, 'Microphone permission denied or unavailable, continuing with display audio', { err });
        chrome.runtime.sendMessage({
          type: 'MIC_PERMISSION_STATUS',
          payload: { granted: false, error: err?.message || 'Permission denied' }
        }).catch(() => {});
      }
    }

    const displayAudioTracks = mediaStream.getAudioTracks();
    const micAudioTracks = micStream ? micStream.getAudioTracks() : [];

    if (displayAudioTracks.length > 0 && micAudioTracks.length > 0) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioContext = new AudioCtx();
        const destination = audioContext.createMediaStreamDestination();

        const displaySource = audioContext.createMediaStreamSource(new MediaStream(displayAudioTracks));
        displaySource.connect(destination);

        const micSource = audioContext.createMediaStreamSource(new MediaStream(micAudioTracks));
        micSource.connect(destination);

        mixedAudioStream = destination.stream;
        log.info(MODULE, 'Successfully mixed display and microphone audio via AudioContext');
      } catch (err: any) {
        log.warn(MODULE, 'Failed to mix audio via AudioContext, falling back to display audio', { err });
        mixedAudioStream = new MediaStream(displayAudioTracks);
      }
    } else if (displayAudioTracks.length > 0) {
      mixedAudioStream = new MediaStream(displayAudioTracks);
    } else if (micAudioTracks.length > 0) {
      mixedAudioStream = new MediaStream(micAudioTracks);
    }

    const mimeType = selectMimeType(config);
    
    // Calculate adaptive bitrate based on resolution
    let bitsPerSecond = 128_000;
    if (config.video) {
      if (config.resolution === '4k') {
        bitsPerSecond = 16_000_000; // 16 Mbps for 4K / Native 1:1 Pixel-Perfect
      } else if (config.resolution === '1440p') {
        bitsPerSecond = 10_000_000; // 10 Mbps for 1440p Quad HD
      } else if (config.resolution === '1080p') {
        bitsPerSecond = 6_000_000;  // 6 Mbps for 1080p Full HD
      } else if (config.resolution === '720p') {
        bitsPerSecond = 2_500_000;  // 2.5 Mbps for 720p
      } else {
        bitsPerSecond = 6_000_000;  // 6 Mbps default for auto
      }
    }

    // 2. Video Recorder
    if (config.video) {
      const recordingTracks: MediaStreamTrack[] = [...mediaStream.getVideoTracks()];
      if (mixedAudioStream) {
        recordingTracks.push(...mixedAudioStream.getAudioTracks());
      }
      const combinedStream = new MediaStream(recordingTracks);

      videoRecorder = new MediaRecorder(combinedStream, { mimeType, bitsPerSecond });
      videoRecorder.ondataavailable = (event) => {
        if (event.data.size === 0) return;
        videoChunkBuffer.push(event.data);
        videoChunkBufferBytes += event.data.size;
        updateState({ currentChunkBytes: videoChunkBufferBytes });
        void sendBlobInSlices(event.data, false);
      };
      videoRecorder.onerror = (event) => log.error(MODULE, 'videoRecorder error', { error: event.error?.message });
      videoRecorder.start(1000); // Continuous recording with 1s timeslice
    }

    // 3. Transcript Recorder (audio only)
    if (config.audio && mixedAudioStream && mixedAudioStream.getAudioTracks().length > 0) {
      const transcriptMimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      
      transcriptRecorder = new MediaRecorder(mixedAudioStream, {
        mimeType: transcriptMimeType,
        bitsPerSecond: 128000,
      });

      transcriptRecorder.ondataavailable = (event) => {
        if (event.data.size !== 0) {
          transcriptChunkBuffer.push(event.data);
          void sendBlobInSlices(event.data, true);
        }
      };

      transcriptRecorder.onerror = (event: Event) => {
        log.error(MODULE, 'transcriptRecorder error', { error: (event as any).error?.message });
      };

      transcriptRecorder.start(1000); // Continuous recording with 1s timeslice
    } else if (config.audio) {
      log.warn(MODULE, 'No audio tracks found for transcript recording.');
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
            const permanentErrors = ['not-allowed', 'audio-capture', 'service-not-allowed'];
            if (permanentErrors.includes(event.error)) {
              // Permanent error — stop trying, don't restart
              log.warn(MODULE, `SpeechRecognition permanently failed (${event.error}) — microphone likely not available in offscreen context`);
              (window as any).__bacham_speech_stopped = true;
            } else {
              // Transient error (no-speech, network) — allow onend to restart
              log.warn(MODULE, 'SpeechRecognition transient error', { error: event.error });
            }
          };
          
          recognition.onend = () => {
             // Restart if we are still capturing and it ended unexpectedly (not permanently stopped)
             if (_state.isCapturing && !(window as any).__bacham_speech_stopped) {
                 try { recognition.start(); } catch { /* ignore if already started */ }
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

    console.log(`[BACHAM:stopCapture] Stopping capture for sessionId: ${currentSessionId}`);

    // Request final data from both recorders before stopping
    if (videoRecorder && videoRecorder.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 800);
        videoRecorder!.addEventListener('stop', () => {
          clearTimeout(timer);
          setTimeout(resolve, 100);
        }, { once: true });
        try { videoRecorder!.requestData(); } catch {}
        videoRecorder!.stop();
      });
    }

    if (transcriptRecorder && transcriptRecorder.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 800);
        transcriptRecorder!.addEventListener('stop', () => {
          clearTimeout(timer);
          setTimeout(resolve, 100);
        }, { once: true });
        try { transcriptRecorder!.requestData(); } catch {}
        transcriptRecorder!.stop();
      });
    }

    console.log(`[BACHAM:stopCapture] Buffers after stop: videoChunks=${videoChunkBuffer.length} (${videoChunkBufferBytes} bytes), transcriptChunks=${transcriptChunkBuffer.length}`);

    let videoUploaded = false;
    let transcriptUploaded = false;
    let finalVideoBlob: Blob | undefined;
    let finalTranscriptBlob: Blob | undefined;

    if (videoChunkBuffer.length > 0) {
      finalVideoBlob = new Blob(videoChunkBuffer, { type: videoRecorder?.mimeType || 'video/webm' });
      videoUploaded = await uploadBlob(finalVideoBlob, 'video');
    } else {
      log.warn(MODULE, 'No video chunks captured to upload');
      videoUploaded = true;
    }
    
    if (transcriptChunkBuffer.length > 0) {
      finalTranscriptBlob = new Blob(transcriptChunkBuffer, { type: transcriptRecorder?.mimeType || 'audio/webm' });
      transcriptUploaded = await uploadBlob(finalTranscriptBlob, 'transcript');
    } else if (finalVideoBlob) {
      // The video WebM file contains the audio track — upload for Gemini transcription
      finalTranscriptBlob = finalVideoBlob;
      transcriptUploaded = await uploadBlob(finalTranscriptBlob, 'transcript');
    } else {
      transcriptUploaded = true;
    }

    // If desktop application was closed or unreachable, buffer Blobs and metadata into IndexedDB Offline Vault
    const isDesktopOffline = (!videoUploaded || !transcriptUploaded) && Boolean(currentSessionId && (finalVideoBlob || finalTranscriptBlob));
    if (isDesktopOffline && currentSessionId) {
      log.info(MODULE, 'Desktop app is offline/unreachable during stopCapture. Preserving recording in Offline Media Vault (IndexedDB)!', {
        sessionId: currentSessionId,
        videoBytes: finalVideoBlob?.size,
        transcriptBytes: finalTranscriptBlob?.size,
      });

      try {
        const stored = await chrome.storage.local.get(['currentSession', 'bacham_saved_notes']);
        const currSession = stored.currentSession;
        const savedNotes = stored.bacham_saved_notes || [];
        const matchingNote = Array.isArray(savedNotes)
          ? savedNotes.find((n: any) => n.id === currentSessionId)
          : null;

        const startedAt = currSession?.startedAt || new Date().toISOString();
        const endedAt = new Date().toISOString();
        const durationMs = Date.now() - new Date(startedAt).getTime() - (currSession?.pausedDurationMs || 0);

        await offlineMediaVault.saveRecording({
          sessionId: currentSessionId,
          title: matchingNote?.title || currSession?.tabTitle || 'Meeting Note',
          tabUrl: currSession?.tabUrl || '',
          courseLabel: currSession?.courseLabel,
          startedAt,
          endedAt,
          durationMs: Math.max(0, durationMs),
          notes: matchingNote?.notes || '',
          videoBlob: finalVideoBlob,
          transcriptBlob: finalTranscriptBlob,
          snapshotCount: matchingNote?.snapshotCount || 0,
          synced: false,
          createdAt: Date.now(),
        });

        // Mark note as unsynced in local storage and indicate pending sync
        if (Array.isArray(savedNotes) && matchingNote) {
          const updatedNotes = savedNotes.map((n: any) =>
            n.id === currentSessionId ? { ...n, synced: false } : n
          );
          await chrome.storage.local.set({ bacham_saved_notes: updatedNotes, hasPendingOfflineSync: true });
        } else {
          await chrome.storage.local.set({ hasPendingOfflineSync: true });
        }

        log.info(MODULE, 'Successfully persisted offline recording into IndexedDB vault with zero data loss');
      } catch (vaultErr: any) {
        log.error(MODULE, 'Failed to save recording to Offline Media Vault', { error: vaultErr?.message || vaultErr });
      }
    }

    for (const track of mediaStream.getTracks()) {
      track.onended = null;
      track.stop();
    }
    
    if (micStream) {
      for (const track of micStream.getTracks()) {
        track.onended = null;
        track.stop();
      }
      micStream = null;
    }

    if (audioContext && audioContext.state !== 'closed') {
      try {
        await audioContext.close();
      } catch (err) {
        log.warn(MODULE, 'Error closing AudioContext', { err });
      }
      audioContext = null;
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