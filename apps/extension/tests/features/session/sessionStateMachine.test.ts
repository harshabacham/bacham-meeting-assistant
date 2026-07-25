import { describe, it, expect } from 'vitest';
import {
  validateTransition,
  assertTransition,
  reachableFrom,
  isValidSessionState,
} from '@/features/session/sessionStateMachine';
import type { SessionState } from '@/shared/types';

describe('sessionStateMachine', () => {
  describe('validateTransition', () => {
    // --- Legal transitions ---
    it('allows idle → requesting-permission', () => {
      expect(validateTransition('idle', 'requesting-permission')).toEqual({ valid: true });
    });

    it('allows idle → connecting', () => {
      expect(validateTransition('idle', 'connecting')).toEqual({ valid: true });
    });

    it('allows requesting-permission → connecting', () => {
      expect(validateTransition('requesting-permission', 'connecting')).toEqual({ valid: true });
    });

    it('allows requesting-permission → idle (permission denied)', () => {
      expect(validateTransition('requesting-permission', 'idle')).toEqual({ valid: true });
    });

    it('allows connecting → recording', () => {
      expect(validateTransition('connecting', 'recording')).toEqual({ valid: true });
    });

    it('allows connecting → idle (connection failed)', () => {
      expect(validateTransition('connecting', 'idle')).toEqual({ valid: true });
    });

    it('allows recording → paused', () => {
      expect(validateTransition('recording', 'paused')).toEqual({ valid: true });
    });

    it('allows recording → stopping', () => {
      expect(validateTransition('recording', 'stopping')).toEqual({ valid: true });
    });

    it('allows paused → recording', () => {
      expect(validateTransition('paused', 'recording')).toEqual({ valid: true });
    });

    it('allows paused → stopping', () => {
      expect(validateTransition('paused', 'stopping')).toEqual({ valid: true });
    });

    it('allows stopping → idle', () => {
      expect(validateTransition('stopping', 'idle')).toEqual({ valid: true });
    });

    it('allows any → error', () => {
      const states: SessionState[] = ['idle', 'requesting-permission', 'connecting', 'recording', 'paused', 'stopping'];
      for (const state of states) {
        expect(validateTransition(state, 'error').valid).toBe(true);
      }
    });

    it('allows error → idle (reset)', () => {
      expect(validateTransition('error', 'idle')).toEqual({ valid: true });
    });

    // --- Illegal transitions ---
    it('rejects idle → paused', () => {
      const result = validateTransition('idle', 'paused');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('idle → paused');
    });

    it('rejects idle → recording (must go through connecting)', () => {
      const result = validateTransition('idle', 'recording');
      expect(result.valid).toBe(false);
    });

    it('rejects recording → idle (must go through stopping)', () => {
      const result = validateTransition('recording', 'idle');
      expect(result.valid).toBe(false);
    });

    it('rejects paused → idle (must go through stopping)', () => {
      const result = validateTransition('paused', 'idle');
      expect(result.valid).toBe(false);
    });

    it('rejects stopping → recording', () => {
      const result = validateTransition('stopping', 'recording');
      expect(result.valid).toBe(false);
    });

    it('rejects error → recording', () => {
      const result = validateTransition('error', 'recording');
      expect(result.valid).toBe(false);
    });

    it('includes reason message on invalid transition', () => {
      const result = validateTransition('idle', 'paused');
      expect(result.reason).toMatch(/Illegal transition/);
      expect(result.reason).toMatch(/idle/);
      expect(result.reason).toMatch(/paused/);
    });
  });

  describe('assertTransition', () => {
    it('does not throw for valid transitions', () => {
      expect(() => assertTransition('idle', 'connecting')).not.toThrow();
    });

    it('throws for invalid transitions', () => {
      expect(() => assertTransition('idle', 'recording')).toThrow();
    });
  });

  describe('reachableFrom', () => {
    it('returns all states reachable from idle', () => {
      const reachable = reachableFrom('idle');
      expect(reachable).toContain('requesting-permission');
      expect(reachable).toContain('connecting');
      expect(reachable).toContain('error');
      expect(reachable).not.toContain('recording');
    });

    it('returns states reachable from recording', () => {
      const reachable = reachableFrom('recording');
      expect(reachable).toContain('paused');
      expect(reachable).toContain('stopping');
      expect(reachable).toContain('error');
    });
  });

  describe('isValidSessionState', () => {
    it('returns true for valid states', () => {
      const validStates: SessionState[] = [
        'idle', 'requesting-permission', 'connecting', 'recording', 'paused', 'stopping', 'error',
      ];
      for (const state of validStates) {
        expect(isValidSessionState(state)).toBe(true);
      }
    });

    it('returns false for invalid strings', () => {
      expect(isValidSessionState('unknown')).toBe(false);
      expect(isValidSessionState('')).toBe(false);
      expect(isValidSessionState('RECORDING')).toBe(false);
    });
  });
});
