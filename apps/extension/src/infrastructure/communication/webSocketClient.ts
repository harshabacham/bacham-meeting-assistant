import type {
  NativeMessage,
  ConnectionStatus,
} from '@/shared/types';
import type { Logger } from '@/infrastructure/logger/logger';
import { createMessageQueue } from './messageQueue';
import { MESSAGE_QUEUE_MAX_CAPACITY } from '@/shared/constants/app';
import {
  RECONNECT_BASE_DELAY_MS,
  RECONNECT_MAX_DELAY_MS,
  RECONNECT_MAX_ATTEMPTS,
} from '@/shared/constants/messages';

export type InboundHandler = (message: NativeMessage<unknown>) => void;

export interface NativeMessagingClient {
  connect(): void;
  disconnect(): void;
  send<T>(message: NativeMessage<T>): void;
  onMessage(handler: InboundHandler): () => void;
  onConnect?(handler: () => void): () => void;
  readonly status: ConnectionStatus;
  flushQueue(): void;
  onHeartbeatAlarm(): void;
  readonly pendingQueueSize: number;
}

export function createWebSocketClient(log: Logger): NativeMessagingClient {
  const MODULE = 'WebSocketClient';

  let ws: WebSocket | null = null;
  let _status: ConnectionStatus = 'disconnected';
  let reconnectAttempts = 0;
  let reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;

  const queue = createMessageQueue(MESSAGE_QUEUE_MAX_CAPACITY, log);
  const handlers: Set<InboundHandler> = new Set();
  const connectHandlers: Set<() => void> = new Set();

  function setStatus(next: ConnectionStatus): void {
    if (_status === next) return;
    log.info(MODULE, 'Connection status changed', { from: _status, to: next });
    _status = next;
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

  function handleMessage(event: MessageEvent): void {
    try {
      const parsed = JSON.parse(event.data);
      if (parsed.type === 'PONG') {
        log.debug(MODULE, 'Received PONG');
        return;
      }
      dispatchInbound(parsed);
    } catch (e) {
      log.warn(MODULE, 'Received invalid inbound message', { err: e });
    }
  }

  function doConnect(): void {
    if (_status === 'connected' || _status === 'connecting') return;
    setStatus('connecting');
    
    ws = new WebSocket('ws://127.0.0.1:1421');

    ws.onopen = () => {
      setStatus('connected');
      reconnectAttempts = 0;
      flushQueue();
      for (const h of connectHandlers) {
        try {
          h();
        } catch (err) {
          log.error(MODULE, 'Connect handler threw', { err });
        }
      }
    };

    ws.onmessage = handleMessage;

    ws.onclose = () => {
      setStatus('disconnected');
      ws = null;
      scheduleReconnect();
    };

    ws.onerror = (e) => {
      // ERR_CONNECTION_REFUSED is expected when the desktop app isn't running.
      // Log as warn (not error) to avoid console noise during normal offline operation.
      log.warn(MODULE, 'WebSocket connection failed — desktop app may not be running', { e });
    };
  }

  function doDisconnect(): void {
    if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
    reconnectTimeoutId = null;
    
    if (ws) {
      ws.onclose = null;
      ws.close();
      ws = null;
    }
    setStatus('disconnected');
  }

  function scheduleReconnect(): void {
    if (reconnectAttempts >= RECONNECT_MAX_ATTEMPTS) {
      // Instead of giving up permanently, reset and enter slow retry mode (every 60s).
      // This ensures the extension reconnects automatically when the desktop app starts.
      log.warn(MODULE, 'Max fast-reconnect attempts reached — entering slow retry mode (60s interval)');
      reconnectAttempts = 0;
      reconnectTimeoutId = setTimeout(doConnect, 60_000);
      return;
    }
    
    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * Math.pow(2, reconnectAttempts),
      RECONNECT_MAX_DELAY_MS
    );
    reconnectAttempts++;
    
    log.info(MODULE, `Scheduling reconnect in ${delay}ms (attempt ${reconnectAttempts})`);
    reconnectTimeoutId = setTimeout(doConnect, delay);
  }

  function flushQueue(): void {
    if (_status !== 'connected' || !ws) return;
    
    let msg: NativeMessage<unknown> | null;
    while ((msg = queue.dequeue())) {
      try {
        ws.send(JSON.stringify(msg));
      } catch (err) {
        log.error(MODULE, 'Failed to flush message — re-queueing', { type: msg.type });
        queue.enqueue(msg);
        break;
      }
    }
  }

  function doSend<T>(message: NativeMessage<T>): void {
    if (_status !== 'connected' || !ws) {
      log.debug(MODULE, 'Disconnected, queuing message', { type: message.type });
      queue.enqueue(message as NativeMessage<unknown>);
      if (_status === 'disconnected') doConnect();
      return;
    }

    try {
      ws.send(JSON.stringify(message));
    } catch (err) {
      log.error(MODULE, 'Failed to send message, queuing', { err, type: message.type });
      queue.enqueue(message as NativeMessage<unknown>);
      doDisconnect();
      doConnect();
    }
  }

  return {
    connect: doConnect,
    disconnect: doDisconnect,
    send: doSend,
    onMessage: (handler: InboundHandler) => {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    onConnect: (handler: () => void) => {
      connectHandlers.add(handler);
      if (_status === 'connected') {
        try {
          handler();
        } catch (err) {
          log.error(MODULE, 'Connect handler threw on immediate call', { err });
        }
      }
      return () => connectHandlers.delete(handler);
    },
    get status() { return _status; },
    flushQueue,
    onHeartbeatAlarm: () => {
      if (_status === 'connected' && ws) {
        ws.send(JSON.stringify({ type: 'PING' }));
      }
    },
    get pendingQueueSize() { return queue.size; }
  };
}
