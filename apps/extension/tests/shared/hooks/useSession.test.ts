import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MessageType } from '@/shared/types';
import type { BackgroundState, Session } from '@/shared/types';

// Mock the runtime browser module
vi.mock('@/infrastructure/browser/runtime', () => ({
  sendToBackground: vi.fn(),
  onMessageFromBackground: vi.fn(() => () => undefined),
  getExtensionVersion: vi.fn(() => '0.1.0'),
}));

import { sendToBackground, onMessageFromBackground } from '@/infrastructure/browser/runtime';
import { useSession } from '@/shared/hooks/useSession';

const mockSend = vi.mocked(sendToBackground);
const mockOnMessage = vi.mocked(onMessageFromBackground);

const mockSession: Session = {
  id: 'test-session-1',
  startedAt: new Date().toISOString(),
  tabId: 1,
  tabTitle: 'Test Tab',
  tabUrl: 'https://example.com',
  state: 'recording',
  pausedDurationMs: 0,
};

const mockState: BackgroundState = {
  session: mockSession,
  sessionState: 'recording',
  captureConfig: { audio: true, video: false },
  captureState: {
    isCapturing: true,
    isPaused: false,
    streamId: 'stream-123',
    chunkCount: 2,
    currentChunkBytes: 1024,
  },
  permissionStatus: { tabCapture: 'granted', storage: 'granted', allGranted: true },
  connectionStatus: 'connected',
  pendingQueueSize: 0,
};

describe('useSession', () => {
  it('loads initial state from background on mount', async () => {
    mockSend.mockResolvedValueOnce({ success: true, data: mockState });
    mockOnMessage.mockReturnValue(() => undefined);

    const { result } = renderHook(() => useSession());

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.session?.id).toBe('test-session-1');
    expect(result.current.sessionState).toBe('recording');
    expect(result.current.isLoading).toBe(false);
  });

  it('sets error when start fails', async () => {
    mockSend
      .mockResolvedValueOnce({ success: true, data: { ...mockState, sessionState: 'idle', session: null } }) // GET_STATE
      .mockResolvedValueOnce({ success: false, error: 'No active tab found' }); // START_SESSION

    mockOnMessage.mockReturnValue(() => undefined);

    const { result } = renderHook(() => useSession());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    await act(async () => {
      await result.current.start({ captureAudio: true, captureVideo: false });
    });

    expect(result.current.error).toBe('No active tab found');
  });

  it('dispatches PAUSE_SESSION message', async () => {
    mockSend
      .mockResolvedValueOnce({ success: true, data: mockState }) // GET_STATE
      .mockResolvedValueOnce({ success: true, data: { ...mockSession, state: 'paused' } }); // PAUSE

    mockOnMessage.mockReturnValue(() => undefined);

    const { result } = renderHook(() => useSession());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    await act(async () => {
      await result.current.pause();
    });

    expect(mockSend).toHaveBeenCalledWith({ type: MessageType.PAUSE_SESSION });
  });

  it('dispatches STOP_SESSION and clears session on success', async () => {
    mockSend
      .mockResolvedValueOnce({ success: true, data: mockState }) // GET_STATE
      .mockResolvedValueOnce({ success: true }); // STOP

    mockOnMessage.mockReturnValue(() => undefined);

    const { result } = renderHook(() => useSession());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    await act(async () => {
      await result.current.stop();
    });

    expect(result.current.session).toBeNull();
    expect(result.current.sessionState).toBe('idle');
  });

  it('clears error via clearError', async () => {
    mockSend
      .mockResolvedValueOnce({ success: true, data: { ...mockState, sessionState: 'idle', session: null } })
      .mockResolvedValueOnce({ success: false, error: 'Something broke' });

    mockOnMessage.mockReturnValue(() => undefined);

    const { result } = renderHook(() => useSession());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    await act(async () => {
      await result.current.start({ captureAudio: true, captureVideo: false });
    });

    expect(result.current.error).toBeTruthy();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});
