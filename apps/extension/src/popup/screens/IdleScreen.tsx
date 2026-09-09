import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { StartSessionIntent, LectureSummary } from '@/shared/types';
import { useCapture } from '@/shared/hooks/useCapture';
import { useSession } from '@/shared/hooks/useSession';
import {
  Plus,
  Search,
  SlidersHorizontal,
  Mic,
  MicOff,
  ChevronDown,
  Video,
  Volume2,
  X,
  ArrowRight,
  HelpCircle,
  RefreshCw,
  Monitor,
} from 'lucide-react';
import { MicrophoneGuideModal } from '../components/MicrophoneGuideModal';
import { offlineMediaVault } from '@/infrastructure/storage/offlineMediaVault';



interface IdleScreenProps {
  readonly onStart: (intent: StartSessionIntent) => Promise<void>;
  readonly isLoading: boolean;
  readonly onOpenApp?: () => void;
  readonly onReturnToRecording?: () => void;
}

interface SavedNoteItem {
  id: string;
  title: string;
  date: string;
  timestamp: number;
  duration?: string;
  notes?: string;
  snapshotCount?: number;
  snapshots?: Array<{ url: string; time: string }>;
  synced?: boolean;
}

export function IdleScreen({ onStart, isLoading, onOpenApp, onReturnToRecording }: IdleScreenProps): React.ReactElement {
  const { captureConfig, updateConfig } = useCapture();
  const { fetchHistory, sessionState } = useSession();

  // Modal and config states
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [micGuideModalOpen, setMicGuideModalOpen] = useState(false);
  const [micPermissionState, setMicPermissionState] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);

  // Check microphone permission on mount & listen for runtime status updates
  useEffect(() => {
    const checkMic = async () => {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const res = await navigator.permissions.query({ name: 'microphone' as any });
          setMicPermissionState(res.state as any);
          res.onchange = () => {
            setMicPermissionState(res.state as any);
          };
        }
      } catch {
        // Query for microphone not supported in some contexts
      }
    };
    void checkMic();

    const listener = (msg: any) => {
      if (msg?.type === 'MIC_PERMISSION_STATUS') {
        if (msg.payload?.granted) {
          setMicPermissionState('granted');
        } else {
          setMicPermissionState('denied');
        }
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);


  // Real Saved Notes (Starts empty, loads from local storage / desktop history)
  const [savedNotes, setSavedNotes] = useState<SavedNoteItem[]>([]);

  // Desktop companion & offline sync status
  const [offlinePendingCount, setOfflinePendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isDesktopConnected, setIsDesktopConnected] = useState<boolean>(false);
  const [dismissedDesktopBanner, setDismissedDesktopBanner] = useState<boolean>(true);

  useEffect(() => {
    chrome.storage?.local?.get(['dismissed_desktop_prompt'], (res) => {
      setDismissedDesktopBanner(!!res?.dismissed_desktop_prompt);
    });
  }, []);

  const handleDismissDesktopBanner = () => {
    setDismissedDesktopBanner(true);
    chrome.storage?.local?.set({ dismissed_desktop_prompt: true });
  };

  const checkDesktopStatus = React.useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 800);
      const res = await fetch('http://127.0.0.1:1422/health', { signal: controller.signal });
      clearTimeout(timeoutId);
      setIsDesktopConnected(res.ok);
    } catch {
      setIsDesktopConnected(false);
    }

    try {
      const count = await offlineMediaVault.getPendingCount();
      setOfflinePendingCount(count);
    } catch {
      setOfflinePendingCount(0);
    }
  }, []);

  useEffect(() => {
    void checkDesktopStatus();
    const interval = setInterval(checkDesktopStatus, 5000);
    return () => clearInterval(interval);
  }, [checkDesktopStatus]);

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      await new Promise<void>((resolve) => {
        chrome.runtime.sendMessage({ type: 'TRIGGER_RECONCILIATION' }, () => {
          resolve();
        });
      });
      await checkDesktopStatus();
      chrome.storage.local.get(['bacham_saved_notes'], (res) => {
        if (res.bacham_saved_notes && Array.isArray(res.bacham_saved_notes)) {
          setSavedNotes(res.bacham_saved_notes);
        }
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadNotesAndHistory = React.useCallback(async () => {
    // 1. Load locally saved notes
    await new Promise<void>((resolve) => {
      chrome.storage.local.get(['bacham_saved_notes'], (res) => {
        if (res.bacham_saved_notes && Array.isArray(res.bacham_saved_notes)) {
          setSavedNotes(res.bacham_saved_notes);
        }
        resolve();
      });
    });

    // 2. Fetch history from desktop app
    if (fetchHistory) {
      try {
        const data = await fetchHistory();
        if (data?.lectures && data.lectures.length > 0) {
          const mapped: SavedNoteItem[] = data.lectures.map((l: LectureSummary) => {
            const createdAt = l.created_at ? new Date(l.created_at) : new Date();
            const durationSeconds = Math.floor((l.duration_ms || 0) / 1000);
            return {
              id: l.id,
              title: l.title || 'Untitled Meeting',
              date: createdAt.toLocaleDateString([], { month: '2-digit', day: '2-digit' }) + ', ' +
                    createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              timestamp: createdAt.getTime(),
              duration: durationSeconds > 0
                ? `${Math.floor(durationSeconds / 60)}:${String(durationSeconds % 60).padStart(2, '0')}`
                : '00:00',
            };
          });
          setSavedNotes((prev) => {
            const ids = new Set(prev.map(p => p.id));
            return [...prev, ...mapped.filter(m => !ids.has(m.id))];
          });
        }
      } catch (err) {
        console.error('Failed to fetch history:', err);
      }
    }
  }, [fetchHistory]);

  const handleRefreshNotes = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await checkDesktopStatus();
      await loadNotesAndHistory();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Load saved notes from storage & desktop companion app
  useEffect(() => {
    void loadNotesAndHistory();
  }, [loadNotesAndHistory]);

  const isVideoMode = captureConfig.video !== false && captureConfig.captureMode !== 'audio';
  const isMicEnabled = !!captureConfig.includeMicrophone;


  const handleStartCapture = async () => {
    // Bypass chrome.desktopCapture.chooseDesktopMedia to avoid the double popup.
    // By passing an empty streamId, the offscreen document will fallback to getDisplayMedia
    // which triggers its own native screen sharing popup.
    const intent: StartSessionIntent = {
      captureAudio: captureConfig.audio ?? true,
      captureVideo: isVideoMode,
      includeMicrophone: isMicEnabled,
      captureMode: isVideoMode ? 'screen' : 'audio',
      streamId: '',
      streamHasAudio: captureConfig.audio ?? true,
      ...(captureConfig.resolution ? { resolution: captureConfig.resolution } : {}),
      ...(captureConfig.screenshotIntervalMs !== undefined && isVideoMode
        ? { screenshotIntervalMs: captureConfig.screenshotIntervalMs }
        : {}),
    };

    try {
      await onStart(intent);
    } catch (err) {
      console.error('Failed to start capture:', err);
    }
  };


  // BACHAM REC Note Home View
  return (
    <div className="flex flex-col h-full bg-[#0A0A0C] font-sans text-white select-none overflow-hidden">
      {/* 1. Header: REC Note + Companion Status Pill */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        <h1 className="text-[23px] font-extrabold text-white tracking-tight flex items-center gap-2">
          <span>REC Note</span>
          <span className="w-2 h-2 rounded-full bg-[#BAFF29] shadow-[0_0_8px_rgba(186,255,41,0.6)]" />
        </h1>
        
        {/* Desktop Companion Connection Pill */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
            isDesktopConnected
              ? 'bg-[#BAFF29]/10 text-[#BAFF29] border-[#BAFF29]/20'
              : 'bg-white/[0.04] text-white/50 border-white/[0.06]'
          }`}
          title={isDesktopConnected ? 'Desktop companion app is running' : 'Desktop app closed · recordings saved in offline vault'}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isDesktopConnected ? 'bg-[#BAFF29] shadow-[0_0_6px_#BAFF29]' : 'bg-white/40'
            }`}
          />
          <span>{isDesktopConnected ? 'App Connected' : 'Offline Vault'}</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 px-5 space-y-4 overflow-y-auto pr-4">
        
        {/* Companion App Banner (If desktop app is not connected and banner wasn't dismissed) */}
        <AnimatePresence>
          {!isDesktopConnected && !dismissedDesktopBanner && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-1"
            >
              <div className="p-3.5 rounded-xl bg-[#141517] border border-white/[0.08] shadow-sm flex flex-col gap-2 relative">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[#BAFF29]/10 text-[#BAFF29] border border-[#BAFF29]/20 flex items-center justify-center shrink-0">
                      <Monitor size={12} />
                    </div>
                    <span className="text-[12px] font-bold text-white tracking-tight">Get Bacham Desktop App</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDismissDesktopBanner}
                    className="text-white/40 hover:text-white transition-colors cursor-pointer p-0.5 rounded"
                    title="Dismiss"
                  >
                    <X size={13} />
                  </button>
                </div>
                <p className="text-[10.5px] text-white/60 leading-relaxed">
                  Connect the desktop app for automated local AI summaries, notes workspace, and calendar sync.
                </p>
                <div className="flex items-center gap-2 pt-0.5">
                  <a
                    href="https://github.com/harshabacham/bacham-meeting-assistant/releases"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-1.5 px-3 rounded-lg bg-[#BAFF29] text-[#0A0A0C] text-[11px] font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition-all cursor-pointer shadow-xs"
                  >
                    <span>Download Desktop App</span>
                    <ArrowRight size={11} />
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2. Top Capture Config Bar: Video/Audio Switch + Mic Toggle */}
        <div className="flex items-center gap-2 relative z-30">
          
          {/* Segmented Mode Selector: Video + Audio vs Only Audio */}
          <div className="flex-1 flex items-center p-1 rounded-xl bg-[#141517] border border-white/[0.06] shadow-xs">
            <button
              type="button"
              onClick={() => void updateConfig({ ...captureConfig, video: true, captureMode: 'tab' })}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[11.5px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none ${
                isVideoMode
                  ? 'bg-[#BAFF29] text-[#0A0A0C] shadow-sm'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
              title="Record Video & Audio (Screen capture)"
            >
              <Video size={13} className="shrink-0" />
              <span className="truncate">Video + Audio</span>
            </button>

            <button
              type="button"
              onClick={() => void updateConfig({ ...captureConfig, video: false, captureMode: 'audio' })}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[11.5px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none ${
                !isVideoMode
                  ? 'bg-[#BAFF29] text-[#0A0A0C] shadow-sm'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
              title="Record Only Audio (No screen capture)"
            >
              <Volume2 size={13} className="shrink-0" />
              <span className="truncate">Only Audio</span>
            </button>
          </div>

          {/* Microphone Split Toggle & Setup Instructions */}
          <div className="relative flex items-center rounded-xl border border-white/[0.06] bg-[#141517] overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={async () => {
                const nextState = !isMicEnabled;
                await updateConfig({ ...captureConfig, includeMicrophone: nextState });
                if (nextState && micPermissionState !== 'granted') {
                  setMicGuideModalOpen(true);
                }
              }}
              title={isMicEnabled ? 'Microphone Active (Click to Mute)' : 'Microphone Muted (Click to Turn On)'}
              className={`flex items-center gap-1.5 px-3 py-2.5 transition-all text-[13px] font-semibold cursor-pointer ${
                isMicEnabled
                  ? 'bg-[#BAFF29]/15 text-[#BAFF29]'
                  : 'text-white/40 hover:text-white/70 hover:bg-[#1A1C20]'
              }`}
            >
              {isMicEnabled ? <Mic size={16} /> : <MicOff size={16} />}
              {isMicEnabled && micPermissionState === 'denied' && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Microphone blocked by Chrome" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setMicGuideModalOpen(true)}
              title="Microphone & Audio Setup Instructions"
              className="px-2 py-2.5 hover:bg-white/5 border-l border-white/[0.05] text-white/40 hover:text-[#BAFF29] transition-colors cursor-pointer"
            >
              <HelpCircle size={13} />
            </button>
          </div>

          {/* Settings / Sliders Button */}
          <button
            onClick={() => setSettingsModalOpen(!settingsModalOpen)}
            className="p-2.5 rounded-xl border border-white/[0.06] bg-[#141517] hover:bg-[#1A1C20] text-white/70 hover:text-white transition-colors shadow-xs cursor-pointer"
            title="Recording Options"
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>

        {/* 3. Primary Action Button (+ New REC Note) */}
        {sessionState === 'recording' || sessionState === 'paused' ? (
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onReturnToRecording && onReturnToRecording()}
            className="w-full py-3 px-4 rounded-2xl bg-rose-600/90 hover:bg-rose-500 border border-rose-500/40 text-white font-bold text-[14px] flex items-center justify-between shadow-lg shadow-rose-600/25 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
              <div className="text-left">
                <span className="text-[13px] font-bold block leading-tight">
                  {sessionState === 'paused' ? 'Recording Paused' : 'Live Recording Active'}
                </span>
                <span className="text-[11px] text-white/70 font-normal">Click to open live note & slides</span>
              </div>
            </div>
            <span className="text-[11.5px] bg-white/20 px-2.5 py-1 rounded-xl text-white font-bold tracking-tight shrink-0 group-hover:bg-white/30 transition-colors">
              Return →
            </span>
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStartCapture}
            disabled={isLoading}
            className="w-full py-3.5 px-6 rounded-2xl bg-[#BAFF29] hover:bg-[#a3e622] text-[#0A0A0C] font-black text-[15px] flex items-center justify-center gap-2 shadow-lg shadow-[#BAFF29]/20 transition-all cursor-pointer"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <Plus size={18} strokeWidth={3} />
                <span>New REC Note</span>
              </>
            )}
          </motion.button>
        )}

        {/* Offline Vault Pending Sync Banner */}
        {offlinePendingCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-2xl bg-[#141517] border border-[#BAFF29]/30 flex items-center justify-between shadow-md"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-[#BAFF29]/15 text-[#BAFF29] shrink-0">
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
              </div>
              <div className="truncate">
                <p className="text-[12.5px] font-bold text-white leading-tight truncate">
                  {offlinePendingCount} recording{offlinePendingCount > 1 ? 's' : ''} in Offline Vault
                </p>
                <p className="text-[11px] text-white/50 truncate">
                  {isDesktopConnected ? 'Desktop online · Ready to sync' : 'Launch desktop app to auto-sync'}
                </p>
              </div>
            </div>

            {isDesktopConnected && (
              <button
                type="button"
                onClick={handleTriggerSync}
                disabled={isSyncing}
                className="px-3 py-1.5 rounded-xl bg-[#BAFF29] hover:bg-[#a3e622] text-[#0A0A0C] text-[11.5px] font-extrabold shrink-0 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
            )}
          </motion.div>
        )}

        {/* Thin, Subtle Divider */}
        <div className="h-[1px] w-full bg-white/[0.05] my-2" />

        {/* 4. My Notes Section Header */}
        <div className="flex items-center justify-between pt-1">
          <h2 className="text-[17px] font-bold text-white tracking-tight">
            My Notes
          </h2>
          <div className="flex items-center gap-1.5 text-white/40">
            <button
              type="button"
              onClick={handleRefreshNotes}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              title="Refresh notes & meetings"
            >
              <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-[#BAFF29]' : ''} />
            </button>
            <button
              onClick={() => setShowSearchInput(!showSearchInput)}
              className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              title="Search notes"
            >
              <Search size={16} />
            </button>
          </div>
        </div>

        {/* Search Bar (Toggled) */}
        <AnimatePresence>
          {showSearchInput && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#141517] border border-white/[0.06] text-[12.5px] text-white placeholder:text-white/30 outline-none focus:border-[#BAFF29] transition-all"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 5. Clean Rounded Notes Cards List */}
        <div className="space-y-3 pb-6">
          {savedNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed border-white/[0.05] text-center bg-[#141517]/50">
              <span className="text-[13px] font-bold text-white/70">No notes recorded yet</span>
              <span className="text-[11.5px] text-white/40 mt-1 max-w-[200px]">
                Click "+ New REC Note" above to capture your first meeting!
              </span>
            </div>
          ) : (
            <>
              {savedNotes
                .filter((n) => !searchQuery || n.title.toLowerCase().includes(searchQuery.toLowerCase()))
                .slice(0, searchQuery ? undefined : 3)
                .map((note) => (
                  <motion.div
                    key={note.id}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => {
                      const route = note.id ? `/lectures/${note.id}` : '/lectures';
                      chrome.runtime.sendMessage({ type: 'OPEN_APP', payload: { route } }).catch(() => {});
                      onOpenApp?.();
                    }}
                    className="p-4 rounded-2xl border border-white/[0.05] bg-[#141517] hover:border-[#BAFF29]/30 hover:bg-[#1A1C20] transition-all cursor-pointer shadow-xs flex flex-col justify-between min-h-[86px]"
                  >
                    <h3 className="text-[14.5px] font-bold text-white leading-tight">
                      {note.title}
                    </h3>
                    <div className="flex items-center justify-between mt-3 text-[12px] text-white/40 font-medium">
                      <span>{note.date}</span>
                      <div className="flex items-center gap-1.5">
                        {note.synced === false && (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-md">
                            Offline Vault
                          </span>
                        )}
                        {note.duration && (
                          <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-white/60 font-semibold text-[10.5px]">
                            {note.duration}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              {savedNotes.length > 3 && !searchQuery && (
                <button
                  type="button"
                  onClick={() => onOpenApp?.()}
                  className="w-full py-2.5 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-white/10 text-[12px] font-semibold text-white/50 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>View All in Desktop App ({savedNotes.length})</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </>
          )}
        </div>

      </div>

      {/* Settings Modal (Slide-up Sheet) */}
      <AnimatePresence>
        {settingsModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col justify-end"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-[#141517] rounded-t-3xl p-5 border-t border-white/[0.07] shadow-2xl space-y-4 text-white"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[16px] font-bold text-white">Recording Options</h3>
                <button
                  onClick={() => setSettingsModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Snapshot Interval */}
              <div className="flex items-center justify-between py-2 border-b border-white/[0.05]">
                <div>
                  <span className="text-[13px] font-bold text-white block">Auto Snapshots</span>
                  <span className="text-[11px] text-white/40">Capture visual slides for notes</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={Math.floor((captureConfig.screenshotIntervalMs ?? 30000) / 1000)}
                    onChange={(e) => {
                      const sec = Math.max(5, Number(e.target.value));
                      void updateConfig({ ...captureConfig, screenshotIntervalMs: sec * 1000 });
                    }}
                    className="w-14 px-2 py-1 bg-[#1A1C20] border border-white/[0.07] rounded-lg text-[12px] font-bold text-center text-white outline-none focus:border-[#BAFF29]"
                  />
                  <span className="text-[12px] text-white/50 font-medium">sec</span>
                </div>
              </div>

              {/* Resolution */}
              <div className="flex items-center justify-between py-2 border-b border-white/[0.05]">
                <div>
                  <span className="text-[13px] font-bold text-white block">Resolution</span>
                  <span className="text-[11px] text-white/40">Capture video quality</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <select
                    value={captureConfig.resolution || 'auto'}
                    onChange={(e) => void updateConfig({ ...captureConfig, resolution: e.target.value as any })}
                    className="px-2.5 py-1.5 bg-[#1A1C20] border border-white/[0.08] rounded-lg text-[12px] font-bold text-white outline-none focus:border-[#BAFF29] cursor-pointer"
                  >
                    <option value="auto" className="bg-[#141517] text-white">Auto (Balanced)</option>
                    <option value="720p" className="bg-[#141517] text-white">720p (Battery Saver)</option>
                    <option value="1080p" className="bg-[#141517] text-white">1080p (Full HD)</option>
                    <option value="1440p" className="bg-[#141517] text-white">1440p (2K Quad HD)</option>
                    <option value="4k" className="bg-[#141517] text-[#BAFF29]">4K / Native (1:1 Pixel-Perfect) ⚡</option>
                  </select>
                </div>
              </div>

              {/* Audio Setup Instructions Button */}
              <div className="pt-2 border-t border-white/[0.05]">
                <button
                  type="button"
                  onClick={() => {
                    setSettingsModalOpen(false);
                    setMicGuideModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-[#1A1C20] border border-white/[0.06] hover:border-[#BAFF29]/40 hover:bg-[#1A1C20]/80 transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#BAFF29]/15 flex items-center justify-center text-[#BAFF29]">
                      <HelpCircle size={16} />
                    </div>
                    <div>
                      <span className="text-[13px] font-bold text-white block group-hover:text-[#BAFF29] transition-colors">
                        Microphone & Audio Guide
                      </span>
                      <span className="text-[11px] text-white/50">
                        How to capture both your voice and meeting audio
                      </span>
                    </div>
                  </div>
                  <ChevronDown size={14} className="text-white/40 -rotate-90 group-hover:text-white transition-colors" />
                </button>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between text-[12px] text-white/50 pt-1">
                <span>Transport</span>
                <span className="font-bold text-[#BAFF29]">100% Local (127.0.0.1)</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Microphone Permission Guide Modal */}
      <MicrophoneGuideModal
        isOpen={micGuideModalOpen}
        onClose={() => setMicGuideModalOpen(false)}
        onPermissionGranted={() => {
          setMicPermissionState('granted');
          void updateConfig({ ...captureConfig, includeMicrophone: true });
        }}
      />
    </div>
  );
}
