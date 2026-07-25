import type { NativeMessage } from '@/shared/types';
import type { Logger } from '@/infrastructure/logger/logger';

/**
 * A bounded outbound message queue for native messaging.
 *
 * When the native messaging port is unavailable, outbound messages are queued here.
 * Once reconnected, the queue is flushed in FIFO order.
 *
 * The queue enforces a maximum capacity — when full, the oldest entry is dropped
 * (oldest-drop policy) to ensure memory is bounded.
 */
export interface MessageQueue {
  /** Add a message to the tail of the queue. */
  enqueue(message: NativeMessage<unknown>): void;
  /** Remove and return the message at the head of the queue. Returns null if empty. */
  dequeue(): NativeMessage<unknown> | null;
  /** Peek at the head without removing. */
  peek(): NativeMessage<unknown> | null;
  /** Current number of messages in the queue. */
  readonly size: number;
  /** True when the queue has no messages. */
  readonly isEmpty: boolean;
  /** Drain all messages at once (for bulk flush). */
  drainAll(): NativeMessage<unknown>[];
  /** Empty the queue without returning items. */
  clear(): void;
}

/** Factory for testable, capacity-bounded message queue. */
export function createMessageQueue(
  maxCapacity: number,
  log: Logger,
): MessageQueue {
  const MODULE = 'MessageQueue';
  const queue: NativeMessage<unknown>[] = [];

  function enqueue(message: NativeMessage<unknown>): void {
    if (queue.length >= maxCapacity) {
      const dropped = queue.shift();
      log.warn(MODULE, 'Queue full — dropping oldest message', {
        droppedType: dropped?.type,
        capacity: maxCapacity,
      });
    }
    queue.push(message);
    log.debug(MODULE, 'Enqueued message', { type: message.type, queueSize: queue.length });
  }

  function dequeue(): NativeMessage<unknown> | null {
    return queue.shift() ?? null;
  }

  function peek(): NativeMessage<unknown> | null {
    return queue[0] ?? null;
  }

  function drainAll(): NativeMessage<unknown>[] {
    return queue.splice(0, queue.length);
  }

  function clear(): void {
    queue.length = 0;
  }

  return {
    enqueue,
    dequeue,
    peek,
    drainAll,
    clear,
    get size() { return queue.length; },
    get isEmpty() { return queue.length === 0; },
  };
}
