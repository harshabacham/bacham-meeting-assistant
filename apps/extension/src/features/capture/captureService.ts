import type { CaptureConfig, CaptureState } from '@/shared/types';
import type { Logger } from '@/infrastructure/logger/logger';
import type { StorageService } from '@/infrastructure/storage/storageService';
import {
  AUDIO_MIME_TYPE,
  VIDEO_MIME_TYPE,
} from '@/shared/constants/capture';

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
      return MediaRecorder.isTypeSupported(VIDEO_MIME_TYPE) ? VIDEO_MIME_TYPE : 'video/webm';
    }
    return MediaRecorder.isTypeSupported(AUDIO_MIME_TYPE) ? AUDIO_MIME_TYPE : 'audio/webm';
  }

  async function uploadBlob(blob: Blob, type: 'video' | 'transcript'): Promise<void> {
    if (blob.size === 0) return;
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
    } catch (err: any) {
      log.error(MODULE, `Failed to upload ${type} blob`, { err: err.message });
      throw err;
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

    const isDesktop = (config.captureMode === 'screen' || config.captureMode === 'window' || config.captureMode === 'walkthrough');
    const primarySource = isDesktop ? 'desktop' : 'tab';
    const fallbackSource = isDesktop ? 'tab' : 'desktop';

    let acquiredStream: MediaStream | null = null;

    if (streamId) {
      for (const source of [primarySource, fallbackSource]) {
        try {
          const constraints: MediaStreamConstraints = {
            audio: config.audio
              ? ({
                  mandatory: {
                    chromeMediaSource: source,
                    chromeMediaSourceId: streamId,
                  },
                } as unknown as MediaTrackConstraints)
              : false,
            video: (config.video || config.screenshotIntervalMs || isDesktop)
              ? ({
                  mandatory: {
                    chromeMediaSource: source,
                    chromeMediaSourceId: streamId,
                  },
                } as unknown as MediaTrackConstraints)
              : false,
          };
          acquiredStream = await navigator.mediaDevices.getUserMedia(constraints);
          log.info(MODULE, `Acquired stream via getUserMedia using source ${source}`, { tracks: acquiredStream.getTracks().length });
          break;
        } catch (err: any) {
          log.warn(MODULE, `getUserMedia with source ${source} failed`, { err: err.message });
        }
      }
    }

    if (!acquiredStream) {
      try {
        log.info(MODULE, 'Attempting getDisplayMedia stream acquisition...');
        acquiredStream = await navigator.mediaDevices.getDisplayMedia({
          video: config.video || !!config.screenshotIntervalMs,
          audio: config.audio,
        });
        log.info(MODULE, 'Acquired stream via getDisplayMedia', { tracks: acquiredStream.getTracks().length });
      } catch (err: any) {
        log.error(MODULE, 'Both getUserMedia and getDisplayMedia failed', { err: err.message, name: err.name });
        throw new Error(`Capture failed: ${err.message || err.name || 'Unknown error'}`);
      }
    }

    mediaStream = acquiredStream;
    
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

    // 1. Setup Audio (Tab Audio + Optional Microphone Mixing)
    let mixedAudioStream: MediaStream | null = null;

    if (config.includeMicrophone) {
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        log.info(MODULE, 'Microphone stream acquired for mixing');
      } catch (err: any) {
        log.warn(MODULE, 'Microphone permission denied or unavailable, continuing with tab audio', { err });
      }
    }

    const tabAudioTracks = mediaStream.getAudioTracks();
    const micAudioTracks = micStream ? micStream.getAudioTracks() : [];

    if (tabAudioTracks.length > 0 && micAudioTracks.length > 0) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioContext = new AudioCtx();
        const destination = audioContext.createMediaStreamDestination();

        const tabSource = audioContext.createMediaStreamSource(new MediaStream(tabAudioTracks));
        tabSource.connect(destination);

        const micSource = audioContext.createMediaStreamSource(new MediaStream(micAudioTracks));
        micSource.connect(destination);

        mixedAudioStream = destination.stream;
        log.info(MODULE, 'Successfully mixed tab and microphone audio via AudioContext');
      } catch (err: any) {
        log.warn(MODULE, 'Failed to mix audio via AudioContext, falling back to tab audio', { err });
        mixedAudioStream = new MediaStream(tabAudioTracks);
      }
    } else if (tabAudioTracks.length > 0) {
      mixedAudioStream = new MediaStream(tabAudioTracks);
    } else if (micAudioTracks.length > 0) {
      mixedAudioStream = new MediaStream(micAudioTracks);
    }

    const mimeType = selectMimeType(config);
    const bitsPerSecond = config.video ? 2_500_000 : 128_000;

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
      };
      videoRecorder.onerror = (event) => log.error(MODULE, 'videoRecorder error', { error: event.error?.message });
      videoRecorder.start(); // Continuous recording
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
        }
      };

      transcriptRecorder.onerror = (event: Event) => {
        log.error(MODULE, 'transcriptRecorder error', { error: (event as any).error?.message });
      };

      transcriptRecorder.start(); // Continuous recording
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

    if (videoRecorder && videoChunkBuffer.length > 0) {
      const blob = new Blob(videoChunkBuffer, { type: videoRecorder.mimeType });
      await uploadBlob(blob, 'video');
    }
    
    if (transcriptRecorder && transcriptChunkBuffer.length > 0) {
      const blob = new Blob(transcriptChunkBuffer, { type: transcriptRecorder.mimeType });
      await uploadBlob(blob, 'transcript');
    }

    for (const track of mediaStream.getTracks()) {
      track.stop();
    }
    
    if (micStream) {
      for (const track of micStream.getTracks()) {
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