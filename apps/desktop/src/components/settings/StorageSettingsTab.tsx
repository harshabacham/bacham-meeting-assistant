import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { useLectureStore } from '@/shared/stores/lectureStore';
import { useConfirmStore } from '@/components/ui/ConfirmProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { TauriClient, StorageBreakdown } from '@/infrastructure/tauri-client';
import { 
  Database, HardDrive, Shield, Trash2, 
  FolderSync, Video, Download
} from 'lucide-react';
import { motion } from 'framer-motion';

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const StorageSettingsTab: React.FC = () => {
  const { settings, updateSettings, fetchSettings } = useSettingsStore();
  const { lectures, fetchLectures } = useLectureStore();
  const { showConfirm } = useConfirmStore();
  const { showToast } = useToast();

  const [breakdown, setBreakdown] = useState<StorageBreakdown | null>(null);
  const [newStoragePath, setNewStoragePath] = useState('');
  const [backupPath, setBackupPath] = useState('');
  const [isBackingUp, setIsBackingUp] = useState(false);

  useEffect(() => {
    fetchLectures();
    TauriClient.getStorageBreakdown().then(setBreakdown).catch(console.error);
  }, [fetchLectures]);

  const handleChangeStorage = async () => {
    if (!newStoragePath.trim()) return;
    try {
      await TauriClient.changeStorageLocation(newStoragePath.trim());
      await fetchSettings();
      setNewStoragePath('');
      const updated = await TauriClient.getStorageBreakdown();
      setBreakdown(updated);
      showToast('Storage location updated successfully.', 'success');
    } catch (e: any) {
      console.error(e);
      showToast('Failed to move storage location.', 'error');
    }
  };

  const handleBackupDatabase = async () => {
    if (!backupPath.trim()) return;
    setIsBackingUp(true);
    try {
      await TauriClient.backupDatabase(backupPath.trim());
      showToast('Database backup created successfully!', 'success');
      setBackupPath('');
    } catch (e: any) {
      showToast(`Backup failed: ${e?.message || e}`, 'error');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleDeleteVideo = async (lectureId: string, title: string) => {
    const ok = await showConfirm(`Delete video recording for "${title}"? Notes, transcripts, and action items will remain completely intact.`);
    if (ok) {
      try {
        await TauriClient.deleteVideoAsset(lectureId);
        await fetchLectures();
        const updated = await TauriClient.getStorageBreakdown();
        setBreakdown(updated);
        showToast('Video recording deleted to free up space.', 'info');
      } catch (err: any) {
        showToast(`Failed to delete video: ${err?.message || err}`, 'error');
      }
    }
  };

  const lecturesWithVideo = lectures.filter(l => Boolean(l.videoPath));

  return (
    <div className="space-y-6 w-full max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">Storage & Data</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Monitor disk usage, manage your local SQLite database, and configure external note vaults.
        </p>
      </div>

      {/* Capacity Breakdown Card */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Database size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Disk Capacity Breakdown</h3>
              <p className="text-xs text-muted-foreground">Space consumed by audio, video recordings, databases, and logs</p>
            </div>
          </div>

          {breakdown && (
            <span className="text-xs font-bold text-foreground bg-surface-raised border border-border px-3 py-1 rounded-full">
              Total: {formatBytes(breakdown.totalBytes)}
            </span>
          )}
        </div>

        {breakdown && breakdown.totalBytes > 0 ? (
          <div className="space-y-3">
            <div className="w-full h-3 rounded-full flex overflow-hidden border border-border bg-surface-raised">
              <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: `${(breakdown.videosBytes / breakdown.totalBytes) * 100}%` }} 
                transition={{ duration: 0.6 }} 
                className="bg-purple-500" 
                title="Videos" 
              />
              <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: `${(breakdown.databaseBytes / breakdown.totalBytes) * 100}%` }} 
                transition={{ duration: 0.6, delay: 0.1 }} 
                className="bg-blue-500" 
                title="Database" 
              />
              <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: `${(breakdown.logsBytes / breakdown.totalBytes) * 100}%` }} 
                transition={{ duration: 0.6, delay: 0.2 }} 
                className="bg-amber-500" 
                title="Logs" 
              />
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground pt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span>Videos: {formatBytes(breakdown.videosBytes)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>Database: {formatBytes(breakdown.databaseBytes)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Logs & Cache: {formatBytes(breakdown.logsBytes)}</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Calculating disk usage...</p>
        )}
      </div>

      {/* Markdown Vault Sync Card (Obsidian / Notion) */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
              <FolderSync size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Markdown Vault Sync (Obsidian / Logseq)</h3>
              <p className="text-xs text-muted-foreground">Automatically write structured Markdown notes into your personal knowledge base</p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={settings?.autoExportMarkdown ?? false}
              onChange={(e) => updateSettings({ autoExportMarkdown: e.target.checked })}
            />
            <div className="w-11 h-6 bg-surface-raised border border-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
          </label>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">
            Vault Directory Absolute Path
          </label>
          <input
            type="text"
            className="w-full bg-surface-raised border border-border rounded-xl px-3.5 py-2 text-xs text-foreground outline-none focus:border-primary transition-all font-mono"
            value={settings?.markdownExportPath || ''}
            onChange={(e) => updateSettings({ markdownExportPath: e.target.value })}
            placeholder="e.g. C:\Users\Username\Documents\ObsidianVault\Meetings"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            When enabled, every completed meeting is exported as a clean Markdown file with YAML frontmatter, action items, and timestamps.
          </p>
        </div>
      </div>

      {/* Storage Working Directory & Migration */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-border">
          <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
            <HardDrive size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Storage Location & Migration</h3>
            <p className="text-xs text-muted-foreground">Root directory on disk where databases, audio files, and cache are saved</p>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">Current Directory</label>
          <div className="bg-surface-raised border border-border rounded-xl px-3.5 py-2 font-mono text-xs text-foreground font-medium truncate">
            {settings?.storageRootPath || 'Default (Documents/BACHAM)'}
          </div>
        </div>

        <div className="pt-3 border-t border-border">
          <label className="text-xs font-semibold text-foreground block mb-1">Migrate to New Location</label>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 bg-surface-raised border border-border rounded-xl px-3.5 py-2 text-xs text-foreground outline-none focus:border-primary transition-all font-mono"
              value={newStoragePath}
              onChange={(e) => setNewStoragePath(e.target.value)}
              placeholder="e.g. D:\BACHAM_Vault"
            />
            <button 
              onClick={handleChangeStorage}
              disabled={!newStoragePath.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:brightness-105 disabled:opacity-50 transition-all cursor-pointer shrink-0"
            >
              Move Files
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1.5">
            <Shield size={12} className="text-amber-500" />
            <span>Safely moves all SQLite databases, images, and transcripts to the target drive.</span>
          </p>
        </div>
      </div>

      {/* Database Backup Export */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-border">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
            <Download size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">SQLite Database Backup</h3>
            <p className="text-xs text-muted-foreground">Export a snapshot of all meeting notes, transcripts, and intelligence into a standalone file</p>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 bg-surface-raised border border-border rounded-xl px-3.5 py-2 text-xs text-foreground outline-none focus:border-primary transition-all font-mono"
            value={backupPath}
            onChange={(e) => setBackupPath(e.target.value)}
            placeholder="e.g. D:\Backups\bacham_backup.sqlite"
          />
          <button
            onClick={handleBackupDatabase}
            disabled={!backupPath.trim() || isBackingUp}
            className="px-4 py-2 bg-surface-raised hover:bg-surface-hover border border-border text-foreground text-xs font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer shrink-0"
          >
            {isBackingUp ? 'Exporting...' : 'Export Backup'}
          </button>
        </div>
      </div>

      {/* Large Video Assets Space Reclaim */}
      {lecturesWithVideo.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-border">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
              <Video size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Video Asset Cleanup</h3>
              <p className="text-xs text-muted-foreground">Reclaim gigabytes of space by deleting raw screen recordings while keeping notes</p>
            </div>
          </div>

          <div className="divide-y divide-border/50">
            {lecturesWithVideo.map(lecture => (
              <div key={lecture.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-foreground truncate">{lecture.title}</h4>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(lecture.createdAt).toLocaleDateString()} &bull; Video recording saved
                  </p>
                </div>

                <button
                  onClick={() => handleDeleteVideo(lecture.id, lecture.title)}
                  className="px-3 py-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 border border-destructive/25 text-destructive text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Trash2 size={12} />
                  <span>Free Space</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
