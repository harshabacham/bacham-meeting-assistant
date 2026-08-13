import type {
  NativeMessage,
  ConnectionStatus,
  HeartbeatPayload,
  AckPayload,
  ErrorPayload,
} from '@/shared/types';
import { MessageType } from '@/shared/types';
import type { Logger } from '@/infrastructure/logger/logger';
import { createMessageQueue } from './messageQueue';
import {
  NATIVE_HOST_NAME,
  NATIVE_MESSAGING_PROTOCOL_VERSION,
  HEARTBEAT_ALARM_NAME,
  MESSAGE_QUEUE_MAX_CAPACITY,
} from '@/shared/constants/app';
import {
  HEARTBEAT_INTERVAL_MS,
  RECONNECT_BASE_DELAY_MS,
  RECONNECT_MAX_DELAY_MS,
  RECONNECT_MAX_ATTEMPTS,
} from '@/shared/constants/messages';

/**
 * Native Messaging Client
 *
 * Manages the persistent port to the Desktop Application native host.
 * Responsibilities:
 *  - Connect / disconnect lifecycle
 *  - Typed send with local queue on failure
 *  - Heartbeat via chrome.alarms (survives service-worker restarts)
 *  - Exponential-backoff reconnection on disconnect
 *  - ConnectionStatus exposed to the rest of the app
 *  - Inbound message dispatching via registered handlers
 */

export type InboundHandler = (message: NativeMessage<unknown>) => void;

export interface NativeMessagingClient {
  /** Connect to the native host. Idempotent if already connected. */
  connect(): void;
  /** Disconnect from the native host and clear the port. */
  disconnect(): void;
  /** Send a typed message. Queues if disconnected. */
  send<T>(message: NativeMessage<T>): void;
  /** Register a handler for inbound messages from the Desktop App. */
  onMessage(handler: InboundHandler): () => void;
  /** Current connection status. */
  readonly status: ConnectionStatus;
  /** Flush the pending queue — call after reconnection is confirmed. */
  flushQueue(): void;
  /** Handle a heartbeat alarm tick (called from the alarm handler). */
  onHeartbeatAlarm(): void;
  /** Current pending queue size. */
  readonly pendingQueueSize: number;
}

/** Factory — accepts all dependencies for full testability. */
export function createNativeMessagingClient(log: Logger): NativeMessagingClient {
  const MODULE = 'NativeMessagingClient';

  let port: chrome.runtime.Port | null = null;
  let _status: ConnectionStatus = 'disconnected';
  let reconnectAttempts = 0;
  let heartbeatSequence = 0;
  let reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;

  const queue = createMessageQueue(MESSAGE_QUEUE_MAX_CAPACITY, log);
  const handlers: Set<InboundHandler> = new Set();

  function setStatus(next: ConnectionStatus): void {
    if (_status === next) return;
    log.info(MODULE, 'Connection status changed', { from: _status, to: next });
    _status = next;
    // Persist to storage so popup can read it
    chrome.storage.local.set({ connectionStatus: next }).catch((err: unknown) => {
      log.error(MODULE, 'Failed to persist connection status', { err });
    });
  }

  function dispatchInbound(message: NativeMessage<unknown>): void {
    for (const handler of handlers) {
      try {
        handler(message);
      } catch (err) {
        log.error(MODULE, 'Inbound handler threw', { err, type: message.type });
      }
    }
  }

  function handlePortMessage(rawMessage: unknown): void {
    // Validate: must be an object with a 'type' field
    if (
      typeof rawMessage !== 'object' ||
      rawMessage === null ||
      !('type' in rawMessage) ||
      typeof (rawMessage as Record<string, unknown>)['type'] !== 'string'
    ) {
      log.warn(MODULE, 'Received invalid inbound message — ignoring', { rawMessage });
      return;
    }

    const message = rawMessage as NativeMessage<unknown>;

    switch (message.type) {
      case MessageType.ACK: {
        const ack = message.payload as AckPayload;
        log.debug(MODULE, 'Received ACK', { ack });
        break;
      }
      case MessageType.ERROR: {
        const error = message.payload as ErrorPayload;
        log.warn(MODULE, 'Received ERROR from Desktop App', { error });
        break;
      }
      default:
        log.debug(MODULE, 'Received message', { type: message.type });
    }

    dispatchInbound(message);
  }

  function handlePortDisconnect(): void {
    const err = chrome.runtime.lastError;
    log.warn(MODULE, 'Native messaging port disconnected', {
      error: err?.message,
    });
    port = null;
    setStatus('disconnected');
    scheduleReconnect();
  }

  function scheduleReconnect(): void {
    if (reconnectAttempts >= RECONNECT_MAX_ATTEMPTS) {
      log.error(MODULE, 'Max reconnection attempts reached — giving up');
      setStatus('disconnected');
      return;
    }

    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * Math.pow(2, reconnectAttempts),
      RECONNECT_MAX_DELAY_MS,
    );

    reconnectAttempts++;
    log.info(MODULE, 'Scheduling reconnect', { attempt: reconnectAttempts, delayMs: delay });

    if (reconnectTimeoutId !== null) {
      clearTimeout(reconnectTimeoutId);
    }
    // Note: setTimeout is acceptable here for transient reconnect scheduling.
    // The alarm-based heartbeat handles the long-lived interval.
    reconnectTimeoutId = setTimeout(() => {
      reconnectTimeoutId = null;
      connect();
    }, delay);
  }

  function connect(): void {
    if (port !== null) {
      log.debug(MODULE, 'Already connected — skipping connect()');
      return;
    }

    log.info(MODULE, 'Connecting to native host', { host: NATIVE_HOST_NAME });
    setStatus('connecting');

    try {
      port = chrome.runtime.connectNative(NATIVE_HOST_NAME);
      port.onMessage.addListener(handlePortMessage);
      port.onDisconnect.addListener(handlePortDisconnect);

      setStatus('connected');
      reconnectAttempts = 0;
      log.info(MODULE, 'Connected to native host');

      // Flush any queued messages now that we're connected
      flushQueue();

      // Ensure heartbeat alarm is running
      void chrome.alarms.get(HEARTBEAT_ALARM_NAME, (alarm) => {
        if (!alarm) {
          void chrome.alarms.create(HEARTBEAT_ALARM_NAME, {
            periodInMinutes: HEARTBEAT_INTERVAL_MS / 60_000,
          });
        }
      });
    } catch (err) {
      log.error(MODULE, 'Failed to connect to native host', { err });
      port = null;
      setStatus('disconnected');
      scheduleReconnect();
    }
  }

  function disconnect(): void {
    if (reconnectTimeoutId !== null) {
      clearTimeout(reconnectTimeoutId);
      reconnectTimeoutId = null;
    }
    if (port) {
      port.disconnect();
      port = null;
    }
    setStatus('disconnected');
    reconnectAttempts = 0;
    log.info(MODULE, 'Disconnected from native host');
  }

  function send<T>(message: NativeMessage<T>): void {
    if (port === null || _status !== 'connected') {
      log.warn(MODULE, 'Not connected — queuing message', { type: message.type });
      queue.enqueue(message as NativeMessage<unknown>);

      // Update queue size in storage
      chrome.storage.local.set({ pendingQueueSize: queue.size }).catch(() => undefined);

      // Mark as degraded if we were considered connected
      if (_status !== 'disconnected' && _status !== 'connecting') {
        setStatus('degraded');
      }
      return;
    }

    try {
      port.postMessage(message);
      log.debug(MODULE, 'Sent message', { type: message.type });
    } catch (err) {
      log.error(MODULE, 'Failed to send message — queuing', { err, type: message.type });
      queue.enqueue(message as NativeMessage<unknown>);
      chrome.storage.local.set({ pendingQueueSize: queue.size }).catch(() => undefined);
    }
  }

  function flushQueue(): void {
    if (queue.isEmpty) return;
    const messages = queue.drainAll();
    log.info(MODULE, 'Flushing queued messages', { count: messages.length });
    for (const msg of messages) {
      send(msg);
    }
    chrome.storage.local.set({ pendingQueueSize: queue.size }).catch(() => undefined);
  }

  function onHeartbeatAlarm(): void {
    if (_status !== 'connected' || port === null) {
      log.debug(MODULE, 'Heartbeat alarm fired but not connected — attempting to reconnect');
      connect();
      return;
    }

    heartbeatSequence++;
    const heartbeat: NativeMessage<HeartbeatPayload> = {
      version: NATIVE_MESSAGING_PROTOCOL_VERSION,
      type: MessageType.HEARTBEAT,
      payload: { sequenceNumber: heartbeatSequence },
      timestamp: Date.now(),
    };

    log.debug(MODULE, 'Sending heartbeat', { seq: heartbeatSequence });
    send(heartbeat);
  }

  function onMessage(handler: InboundHandler): () => void {
    handlers.add(handler);
    return () => handlers.delete(handler);
  }

  return {
    connect,
    disconnect,
    send,
    onMessage,
    flushQueue,
    onHeartbeatAlarm,
    get status() { return _status; },
    get pendingQueueSize() { return queue.size; },
  };
}
