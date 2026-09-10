import type { SessionState } from '@/shared/types';

/**
 * Session state machine.
 *
 * Defines all legal state transitions and validates them.
 * This is pure logic — no chrome.* calls, no I/O, fully testable.
 */

/** All legal transitions as a map: from → Set of valid 'to' states. */
const LEGAL_TRANSITIONS: Readonly<Record<SessionState, ReadonlySet<SessionState>>> = {
  idle: new Set<SessionState>(['idle', 'requesting-permission', 'connecting', 'stopping', 'error']),
  'requesting-permission': new Set<SessionState>(['idle', 'requesting-permission', 'connecting', 'stopping', 'error']),
  connecting: new Set<SessionState>(['idle', 'connecting', 'recording', 'stopping', 'error']),
  recording: new Set<SessionState>(['recording', 'paused', 'stopping', 'error']),
  paused: new Set<SessionState>(['paused', 'recording', 'stopping', 'error']),
  stopping: new Set<SessionState>(['stopping', 'idle', 'error']),
  error: new Set<SessionState>(['error', 'idle', 'stopping']),
};

export interface TransitionResult {
  readonly valid: boolean;
  readonly reason?: string;
}

/**
 * Validate whether transitioning from `from` to `to` is legal.
 *
 * @returns A TransitionResult indicating validity and, if invalid, the reason.
 */
export function validateTransition(
  from: SessionState,
  to: SessionState,
): TransitionResult {
  if (from === to) {
    return { valid: true };
  }
  const allowed = LEGAL_TRANSITIONS[from];
  if (allowed && allowed.has(to)) {
    return { valid: true };
  }
  return {
    valid: false,
    reason: `Illegal transition: ${from} → ${to}. Allowed from ${from}: [${allowed ? [...allowed].join(', ') : ''}]`,
  };
}

/**
 * Assert that a transition is legal, throwing if not.
 * Use in code paths where an invalid transition is a programming error.
 */
export function assertTransition(from: SessionState, to: SessionState): void {
  const result = validateTransition(from, to);
  if (!result.valid) {
    throw new Error(result.reason);
  }
}

/**
 * Get all states reachable from the given state in one step.
 */
export function reachableFrom(state: SessionState): SessionState[] {
  return [...LEGAL_TRANSITIONS[state]];
}

/**
 * Check whether a given string is a valid SessionState.
 */
export function isValidSessionState(value: string): value is SessionState {
  return value in LEGAL_TRANSITIONS;
}
