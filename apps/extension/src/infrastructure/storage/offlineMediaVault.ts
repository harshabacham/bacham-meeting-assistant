/**
 * Offline Media Vault (IndexedDB)
 *
 * Provides persistent, quota-friendly local storage for binary recordings (WebM Blobs)
 * and metadata in the Chrome Extension.
 *
 * Key properties:
 * - Shared across Extension Popup, Service Worker, and Offscreen Documents.
 * - Stores multi-gigabyte video/audio Blobs without hitting chrome.storage.local's 10MB limit.
 * - Indexed by sessionId and sync status (synced: boolean).
 */

export interface OfflineRecordingData {
  sessionId: string;
  title: string;
  tabUrl: string;
  courseLabel?: string | undefined;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  notes?: string | undefined;
  videoBlob?: Blob | undefined;
  transcriptBlob?: Blob | undefined;
  snapshotCount?: number | undefined;
  synced: boolean;
  createdAt: number;
}

const DB_NAME = 'bacham_offline_vault';
const DB_VERSION = 1;
const STORE_NAME = 'recordings';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'sessionId' });
        store.createIndex('synced', 'synced', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

export const offlineMediaVault = {
  /**
   * Save or update an offline recording entry in IndexedDB.
   */
  async saveRecording(data: OfflineRecordingData): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(data);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  },

  /**
   * Fetch all recordings that are waiting to be synced to the desktop app.
   */
  async getPendingRecordings(): Promise<OfflineRecordingData[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('synced');
      // Look for recordings where synced === 0 or synced === false
      // IndexedDB IDBKeyRange supports boolean or number keys
      const req = index.getAll(IDBKeyRange.only(false));

      req.onsuccess = () => {
        const results: OfflineRecordingData[] = req.result || [];
        resolve(results.sort((a, b) => b.createdAt - a.createdAt));
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  },

  /**
   * Get a specific recording by sessionId.
   */
  async getRecording(sessionId: string): Promise<OfflineRecordingData | null> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(sessionId);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  },

  /**
   * Mark a recording as synced and optionally remove the heavy video/audio Blobs
   * to conserve browser disk space while retaining the metadata.
   */
  async markRecordingSynced(sessionId: string, pruneBlobs = true): Promise<void> {
    const record = await this.getRecording(sessionId);
    if (!record) return;

    record.synced = true;
    if (pruneBlobs) {
      delete record.videoBlob;
      delete record.transcriptBlob;
    }

    await this.saveRecording(record);
  },

  /**
   * Permanently delete a recording entry.
   */
  async deleteRecording(sessionId: string): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(sessionId);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  },

  /**
   * Count how many recordings are currently pending sync.
   */
  async getPendingCount(): Promise<number> {
    try {
      const list = await this.getPendingRecordings();
      return list.length;
    } catch {
      return 0;
    }
  },
};
