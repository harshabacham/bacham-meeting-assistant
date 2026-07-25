import type { Session, SessionState, StartSessionIntent } from '@/shared/types';
import type { StorageService } from '@/infrastructure/storage/storageService';
import type { Logger } from '@/infrastructure/logger/logger';
import { validateTransition } from './sessionStateMachine';

/**
 * Session Service
 *
 * Owns the session lifecycle. Validates all state transitions through the
 * state machine, persists state via StorageService, and produces typed
 * Session objects. The service worker rehydrates from storage on restart.
 */

export interface SessionService {
  /** Load the current session from storage. Returns null if no session exists. */
  loadSession(): Promise<Session | null>;
  /** Create a new session (from idle). Returns the created session. */
  createSession(intent: StartSessionIntent, tabId: number, tabTitle: string, tabUrl: string): Promise<Session>;
  /** Transition the current session to a new state. */
  transition(sessionId: string, to: SessionState, extra?: Partial<Session>): Promise<Session>;
  /** Discard the current session (reset to idle, clear storage). */
  discardSession(): Promise<void>;
  /** Update mutable session fields (tabTitle, tabUrl, courseLabel). */
  updateSession(sessionId: string, updates: Partial<Pick<Session, 'tabTitle' | 'tabUrl' | 'courseLabel'>>): Promise<Session>;
}

/** Generates a UUID v4 using the Web Crypto API. */
function generateId(): string {
  return crypto.randomUUID();
}

/** Factory — all dependencies injected for testability. */
export function createSessionService(
  storage: StorageService,
  log: Logger,
): SessionService {
  const MODULE = 'SessionService';

  async function loadSession(): Promise<Session | null> {
    const { currentSession } = await storage.get(['currentSession']);
    if (currentSession) {
      log.debug(MODULE, 'Loaded session from storage', { id: currentSession.id, state: currentSession.state });
    }
    return currentSession;
  }

  async function persistSession(session: Session): Promise<void> {
    await storage.set({ currentSession: session });
  }

  async function createSession(
    intent: StartSessionIntent,
    tabId: number,
    tabTitle: string,
    tabUrl: string,
  ): Promise<Session> {
    const session: Session = {
      id: generateId(),
      startedAt: new Date().toISOString(),
      tabId,
      tabTitle,
      tabUrl,
      ...(intent.courseLabel !== undefined ? { courseLabel: intent.courseLabel } : {}),
      state: 'connecting',
      pausedDurationMs: 0,
    };

    await persistSession(session);
    log.info(MODULE, 'Session created', { id: session.id });
    return session;
  }

  async function transition(
    sessionId: string,
    to: SessionState,
    extra?: Partial<Session>,
  ): Promise<Session> {
    const { currentSession } = await storage.get(['currentSession']);

    if (!currentSession) {
      throw new Error(`Session ${sessionId} not found in storage`);
    }
    if (currentSession.id !== sessionId) {
      throw new Error(`Session ID mismatch: expected ${sessionId}, got ${currentSession.id}`);
    }

    const result = validateTransition(currentSession.state, to);
    if (!result.valid) {
      log.error(MODULE, 'Illegal session transition', {
        from: currentSession.state,
        to,
        reason: result.reason,
      });
      throw new Error(result.reason);
    }

    const now = new Date().toISOString();

    // Compute updated paused duration when resuming
    let pausedDurationMs = currentSession.pausedDurationMs;
    if (to === 'recording' && currentSession.state === 'paused' && currentSession.pausedAt) {
      pausedDurationMs += Date.now() - new Date(currentSession.pausedAt).getTime();
    }

    // Build updated session — avoid spreading `undefined` into optional fields
    // with exactOptionalPropertyTypes: true
    const base = { ...currentSession, ...extra, state: to, pausedDurationMs };

    // Manage pausedAt
    if (to === 'paused') {
      base.pausedAt = now;
    } else if (to === 'recording' && currentSession.state === 'paused') {
      // Remove pausedAt when resuming — delete the property
      const { pausedAt: _removed, ...rest } = base;
      void _removed;
      const updated: Session = { ...rest };
      await persistSession(updated);
      log.info(MODULE, 'Session transitioned', { id: sessionId, from: currentSession.state, to });
      return updated;
    }

    const updated: Session = {
      ...base,
      ...(to === 'idle' ? { endedAt: now } : {}),
    };


    await persistSession(updated);
    log.info(MODULE, 'Session transitioned', { id: sessionId, from: currentSession.state, to });
    return updated;
  }

  async function discardSession(): Promise<void> {
    await storage.set({ currentSession: null, activeStreamId: null });
    log.info(MODULE, 'Session discarded');
  }

  async function updateSession(
    sessionId: string,
    updates: Partial<Pick<Session, 'tabTitle' | 'tabUrl' | 'courseLabel'>>,
  ): Promise<Session> {
    const { currentSession } = await storage.get(['currentSession']);
    if (!currentSession || currentSession.id !== sessionId) {
      throw new Error(`Session ${sessionId} not found`);
    }
    const updated: Session = { ...currentSession, ...updates };
    await persistSession(updated);
    return updated;
  }

  return { loadSession, createSession, transition, discardSession, updateSession };
}
