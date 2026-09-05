/**
 * Reconciliation Sync Service
 *
 * Automatically detects when the Desktop Application comes online and syncs
 * any recordings buffered in the OfflineMediaVault (IndexedDB).
 *
 * Reconciliation Workflow:
 * 1. Ping http://127.0.0.1:1422/health
 * 2. If online, fetch pending offline recordings (synced === false)
 * 3. For each session:
 *    - Send SESSION_START via WebSocket to register the lecture in desktop SQLite
 *    - POST video & transcript WebM Blobs to http://127.0.0.1:1422/upload
 *    - Send LIVE_NOTE if user entered notes
 *    - Send SESSION_STOP via WebSocket to trigger duration update and AI pipeline
 *    - On success: mark synced = true and release heavy Blobs from IndexedDB
 */

import { offlineMediaVault } from '@/infrastructure/storage/offlineMediaVault';
import type { NativeMessagingClient } from '@/infrastructure/communication/nativeMessagingClient';
import type { Logger } from '@/infrastructure/logger/logger';
import { MessageType } from '@/shared/types';
import { NATIVE_MESSAGING_PROTOCOL_VERSION } from '@/shared/constants/app';

const MODULE = 'ReconciliationService';
const DESKTOP_HTTP_ORIGIN = 'http://127.0.0.1:1422';

export interface ReconciliationService {
  /** Check if the desktop app is reachable. */
  isDesktopOnline(): Promise<boolean>;
  /** Run sync reconciliation on any pending offline recordings. */
  reconcile(): Promise<{ syncedCount: number; failedCount: number }>;
}

export function createReconciliationService(
  messagingClient: NativeMessagingClient,
  log: Logger,
): ReconciliationService {
  let isSyncing = false;

  async function isDesktopOnline(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`${DESKTOP_HTTP_ORIGIN}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  }

  async function uploadBlob(sessionId: string, blob: Blob, type: 'video' | 'transcript'): Promise<boolean> {
    try {
      log.info(MODULE, `Uploading offline ${type} blob to desktop...`, { sessionId, size: blob.size });
      const res = await fetch(`${DESKTOP_HTTP_ORIGIN}/upload?sessionId=${sessionId}&type=${type}`, {
        method: 'POST',
        body: blob,
      });
      return res.ok;
    } catch (err: any) {
      log.warn(MODULE, `Failed to upload ${type} blob for session ${sessionId}`, { error: err.message });
      return false;
    }
  }

  async function reconcile(): Promise<{ syncedCount: number; failedCount: number }> {
    if (isSyncing) {
      log.debug(MODULE, 'Sync already in progress, skipping');
      return { syncedCount: 0, failedCount: 0 };
    }

    const online = await isDesktopOnline();
    if (!online) {
      log.debug(MODULE, 'Desktop app is offline, skipping reconciliation');
      return { syncedCount: 0, failedCount: 0 };
    }

    isSyncing = true;
    let syncedCount = 0;
    let failedCount = 0;

    try {
      const pending = await offlineMediaVault.getPendingRecordings();
      if (pending.length === 0) {
        log.debug(MODULE, 'No pending offline recordings to sync');
        chrome.storage.local.set({ hasPendingOfflineSync: false }).catch(() => {});
        return { syncedCount: 0, failedCount: 0 };
      }

      log.info(MODULE, `Found ${pending.length} offline recording(s) to sync to desktop`);

      for (const record of pending) {
        try {
          // 1. Ensure WebSocket connection is active
          messagingClient.connect();

          // 2. Register lecture in SQLite via SESSION_START
          messagingClient.send({
            version: NATIVE_MESSAGING_PROTOCOL_VERSION,
            type: MessageType.SESSION_START,
            sessionId: record.sessionId,
            payload: {
              tabTitle: record.title || 'Meeting Note',
              tabUrl: record.tabUrl || '',
              courseLabel: record.courseLabel,
            },
            timestamp: new Date(record.startedAt).getTime(),
          });

          // Small delay to allow desktop DB insert to commit
          await new Promise((resolve) => setTimeout(resolve, 200));

          // 3. Upload video blob if present
          let uploadOk = true;
          if (record.videoBlob && record.videoBlob.size > 0) {
            const ok = await uploadBlob(record.sessionId, record.videoBlob, 'video');
            if (!ok) uploadOk = false;
          }

          // 4. Upload transcript blob if present
          if (record.transcriptBlob && record.transcriptBlob.size > 0) {
            const ok = await uploadBlob(record.sessionId, record.transcriptBlob, 'transcript');
            if (!ok) uploadOk = false;
          } else if (record.videoBlob && record.videoBlob.size > 0) {
            // Send video blob as transcript source if separate audio wasn't tracked
            await uploadBlob(record.sessionId, record.videoBlob, 'transcript');
          }

          if (!uploadOk) {
            log.warn(MODULE, `Blob upload incomplete for session ${record.sessionId}, will retry later`);
            failedCount++;
            continue;
          }

          // 5. Sync Live Notes text if available
          if (record.notes && record.notes.trim().length > 0) {
            messagingClient.send({
              version: NATIVE_MESSAGING_PROTOCOL_VERSION,
              type: MessageType.LIVE_NOTE,
              sessionId: record.sessionId,
              payload: { text: record.notes },
              timestamp: Date.now(),
            });
          }

          // 6. Send SESSION_STOP to finalize duration and trigger Desktop AI Pipeline
          messagingClient.send({
            version: NATIVE_MESSAGING_PROTOCOL_VERSION,
            type: MessageType.SESSION_STOP,
            sessionId: record.sessionId,
            payload: {
              endedAt: record.endedAt,
              durationMs: record.durationMs,
            },
            timestamp: new Date(record.endedAt).getTime(),
          });

          // 7. Mark as synced in IndexedDB and release heavy Blobs to free storage
          await offlineMediaVault.markRecordingSynced(record.sessionId, true);

          // 8. Update local notes list to reflect synced status
          chrome.storage.local.get(['bacham_saved_notes'], (res) => {
            if (res.bacham_saved_notes && Array.isArray(res.bacham_saved_notes)) {
              const updated = res.bacham_saved_notes.map((n: any) =>
                n.id === record.sessionId ? { ...n, synced: true } : n
              );
              chrome.storage.local.set({ bacham_saved_notes: updated });
            }
          });

          log.info(MODULE, `Successfully synced offline recording ${record.sessionId} to desktop!`);
          syncedCount++;
        } catch (err: any) {
          log.error(MODULE, `Error syncing session ${record.sessionId}`, { error: err.message });
          failedCount++;
        }
      }

      const remaining = await offlineMediaVault.getPendingCount();
      chrome.storage.local.set({
        hasPendingOfflineSync: remaining > 0,
        lastSyncTimestamp: Date.now(),
      }).catch(() => {});
    } finally {
      isSyncing = false;
    }

    return { syncedCount, failedCount };
  }

  return {
    isDesktopOnline,
    reconcile,
  };
}
