import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Session } from '@/shared/types';
import { useCapture } from '@/shared/hooks/useCapture';
import {
  ArrowLeft,
  Camera,
  Pause,
  Play,
  Square,
  Sparkles,
  AlertTriangle,
  HelpCircle,
  X,
  Trash2,
  Menu,
} from 'lucide-react';
import { MicrophoneGuideModal } from '../components/MicrophoneGuideModal';
import { MessageType } from '@/shared/types';

interface RecordingScreenProps {
  readonly session: Session;
  readonly onPause: () => Promise<void>;
  readonly onResume?: () => Promise<void>;
  readonly onStop: () => Promise<void>;
  readonly isLoading: boolean;
  readonly optimisticStart?: number | undefined;
  readonly onBack?: () => void;
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(m)}:${pad(sec)}`;
}

/** Helper to clean messy browser tab titles like "(1) WhatsApp" -> "WhatsApp". */
function cleanTitle(raw: string): string {
  if (!raw || raw.trim() === '' || raw === 'Starting…') return 'Meeting Note';
  return raw.replace(/^(\(\d+\+?\)|\[\d+\+?\])\s*/, '').trim() || 'Meeting Note';
}

interface SnapshotItem {
  id: string;
  url: string;
  time: string;
}

export function RecordingScreen({
  session,
  onPause,
  onResume,
  onStop,
  isLoading,
  optimisticStart,
  onBack,
}: RecordingScreenProps): React.ReactElement {
  const { captureConfig } = useCapture();
  const startMs = optimisticStart ?? new Date(session.startedAt).getTime();
  const [elapsed, setElapsed] = useState(() => Math.max(0, Date.now() - startMs - session.pausedDurationMs));
  const [isPaused, setIsPaused] = useState(session.state === 'paused');

  // Editable Title & Live Note Content
  const [title, setTitle] = useState(() => cleanTitle(session.tabTitle));
  const [noteContent, setNoteContent] = useState('');
  const [showToast, setShowToast] = useState<string | null>(null);

  // Live Captured Snapshots (Starts completely empty - real captures only)
  const [snapshots, setSnapshots] = useState<SnapshotItem[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<SnapshotItem | null>(null);

  // Mic status & guide state
  const [micBlocked, setMicBlocked] = useState(false);
  const [showMicAlert, setShowMicAlert] = useState(false);
  const [showAudioGuideModal, setShowAudioGuideModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Synchronize pause state with session prop
  useEffect(() => {
    setIsPaused(session.state === 'paused');
  }, [session.state]);

  // Check microphone permissions and listen for captureService events
  useEffect(() => {
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then((permissionStatus) => {
          if (permissionStatus.state === 'denied') {
            setMicBlocked(true);
            setShowMicAlert(true);
          }
          permissionStatus.onchange = () => {
            if (permissionStatus.state === 'denied') {
              setMicBlocked(true);
              setShowMicAlert(true);
            } else {
              setMicBlocked(false);
              setShowMicAlert(false);
            }
          };
        })
        .catch(() => {});
    }

    const listener = (msg: any) => {
      if (msg?.type === 'MIC_PERMISSION_STATUS') {
        if (msg.payload?.granted === false) {
          setMicBlocked(true);
          setShowMicAlert(true);
        } else {
          setMicBlocked(false);
          setShowMicAlert(false);
        }
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  // Elapsed timer tick
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!isPaused) {
      interval = setInterval(() => {
        setElapsed(Math.max(0, Date.now() - startMs - session.pausedDurationMs));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [startMs, session.pausedDurationMs, isPaused]);

  // Load saved note, title, and snapshots on mount
  useEffect(() => {
    chrome.storage.local.get(
      [`note_${session.id}`, `note_title_${session.id}`, `note_snapshots_${session.id}`],
      (res) => {
        if (res[`note_${session.id}`]) {
          setNoteContent(res[`note_${session.id}`]);
        }
        if (res[`note_title_${session.id}`]) {
          setTitle(res[`note_title_${session.id}`]);
        } else if (session.tabTitle) {
          setTitle(cleanTitle(session.tabTitle));
        }
        if (res[`note_snapshots_${session.id}`] && Array.isArray(res[`note_snapshots_${session.id}`])) {
          setSnapshots(res[`note_snapshots_${session.id}`]);
        }
      }
    );
  }, [session.id, session.tabTitle]);

  // Handle title edits with autosave
  const handleTitleChange = (val: string) => {
    setTitle(val);
    chrome.storage.local.set({ [`note_title_${session.id}`]: val });
  };

  // Save note on edit & transfer to desktop companion app
  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNoteContent(val);
    chrome.storage.local.set({ [`note_${session.id}`]: val });
    chrome.runtime
      .sendMessage({
        type: MessageType.LIVE_NOTE,
        payload: { text: val },
        sessionId: session.id,
      })
      .catch(() => {});
  };

  // Listen for live screenshot triggers from alarms / background observers
  useEffect(() => {
    const listener = (msg: any) => {
      if (msg?.type === MessageType.METADATA_READY && msg?.payload?.imageBase64) {
        const base64 = msg.payload.imageBase64;
        const dataUrl = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
        setSnapshots((prev) => {
          const updated = [
            {
              id: String(Date.now()),
              url: dataUrl,
              time: formatTime(elapsed),
            },
            ...prev,
          ];
          // Persist recent snapshots safely (limit to 5 to keep storage footprint minimal)
          chrome.storage.local.set({ [`note_snapshots_${session.id}`]: updated.slice(0, 5) }).catch(() => {});
          return updated;
        });
        triggerToast('📸 Slide captured!');
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [elapsed, session.id]);

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 2500);
  };

  // Real on-demand frame capture from the active media stream
  const handleCaptureSnapshot = async () => {
    try {
      triggerToast('📸 Snapping slide...');
      const res = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage({ type: MessageType.TRIGGER_SNAPSHOT }, (response) => {
          resolve(response);
        });
      });

      const base64 = res?.data?.base64 || res?.base64;
      if (res?.success && base64) {
        const dataUrl = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
        setSnapshots((prev) => {
          const updated = [
            {
              id: String(Date.now()),
              url: dataUrl,
              time: formatTime(elapsed),
            },
            ...prev,
          ];
          chrome.storage.local.set({ [`note_snapshots_${session.id}`]: updated.slice(0, 5) }).catch(() => {});
          return updated;
        });
        triggerToast('✅ Slide captured!');
      } else {
        triggerToast('Frame captured');
      }
    } catch {
      triggerToast('Failed to capture frame');
    }
  };

  const handleTogglePause = async () => {
    if (isPaused) {
      if (onResume) {
        await onResume();
      } else {
        await chrome.runtime.sendMessage({ type: MessageType.RESUME_SESSION });
      }
      setIsPaused(false);
      triggerToast('▶ Recording resumed');
    } else {
      await onPause();
      setIsPaused(true);
      triggerToast('⏸ Recording paused');
    }
  };

  const handleStopAndSave = async () => {
    const noteEntry = {
      id: session.id,
      title: title.trim() || 'Meeting Note',
      date:
        new Date().toLocaleDateString([], { month: '2-digit', day: '2-digit' }) +
        ', ' +
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      duration: formatTime(elapsed),
      notes: noteContent,
      snapshotCount: snapshots.length,
    };

    await new Promise<void>((resolve) => {
      chrome.storage.local.get(['bacham_saved_notes'], (res) => {
        const existing = res.bacham_saved_notes || [];
        chrome.storage.local
          .set({
            bacham_saved_notes: [noteEntry, ...existing.filter((n: any) => n.id !== session.id)],
          })
          .then(() => resolve())
          .catch((err: any) => {
            console.warn('[BACHAM] Failed to save note to storage:', err);
            resolve();
          });
      });
    });

    await onStop();
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0A0C] font-sans text-white select-none relative overflow-hidden">
      {/* 1. Header: Sleek Back Arrow + Hamburger Menu with Red Pulse Indicator */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0 bg-[#0A0A0C] z-20">
        <button
          type="button"
          onClick={onBack}
          className="p-1 -ml-1 text-white/50 hover:text-white transition-colors cursor-pointer active:scale-95"
          title="Back"
        >
          <ArrowLeft size={20} strokeWidth={2} />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMenu((prev) => !prev)}
            className="p-1 -mr-1 text-white/50 hover:text-white transition-colors cursor-pointer relative active:scale-95"
            title="Recording Details & Options"
          >
            <Menu size={20} strokeWidth={2} />
            {/* Active Red Recording Indicator Dot */}
            <span
              className={`absolute top-0.5 right-0.5 w-2 h-2 rounded-full ${
                isPaused ? 'bg-amber-400' : 'bg-rose-500 animate-pulse'
              } ring-2 ring-[#0A0A0C]`}
            />
          </button>

          {/* Minimal Dropdown Menu */}
          <AnimatePresence>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-52 rounded-2xl bg-[#141517] border border-white/10 shadow-2xl p-2 z-50 text-[12px] space-y-1 backdrop-blur-xl"
                >
                  <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
                    <span className="text-white/40 font-medium">Timer</span>
                    <span className="font-mono font-bold text-[#BAFF29]">
                      {isPaused ? `PAUSED (${formatTime(elapsed)})` : formatTime(elapsed)}
                    </span>
                  </div>

                  <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
                    <span className="text-white/40 font-medium">Capture</span>
                    <span className="font-semibold text-white/80">
                      {captureConfig.video === false ? 'Audio Only' : 'Video + Audio'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      setShowAudioGuideModal(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left hover:bg-white/5 text-white/70 hover:text-white flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span>Audio & Mic Setup</span>
                    <HelpCircle size={13} className="text-white/40" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onBack?.();
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left hover:bg-white/5 text-white/70 hover:text-white flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span>All Meeting Notes</span>
                    <ArrowLeft size={13} className="text-white/40" />
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 2. Microphone Blocked Banner (If applicable) */}
      <AnimatePresence>
        {micBlocked && showMicAlert && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-5 mb-2 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-start justify-between gap-2 shrink-0 shadow-xs z-10"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11.5px] font-bold text-amber-300">Microphone Muted</span>
                  <button
                    type="button"
                    onClick={() => setShowAudioGuideModal(true)}
                    className="text-[10.5px] font-bold text-[#BAFF29] underline hover:text-white cursor-pointer"
                  >
                    Fix
                  </button>
                </div>
                <p className="text-[10.5px] text-white/70 leading-tight">
                  Tab audio is recording. Grant mic permissions to record your voice.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowMicAlert(false)}
              className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer shrink-0"
              title="Dismiss"
            >
              <X size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Main Canvas: Clean Sider-style Document Layout */}
      <div className="flex-1 px-6 pt-3 pb-24 flex flex-col overflow-y-auto">
        {/* Document Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Untitled"
          spellCheck={false}
          className="w-full text-[26px] font-bold text-white placeholder:text-white/30 bg-transparent outline-none border-none tracking-tight pb-3 selection:bg-[#BAFF29]/25"
        />

        {/* Note Content Textarea (Document style, zero card borders) */}
        <textarea
          value={noteContent}
          onChange={handleNoteChange}
          placeholder="Enter key information, and BACHAM will help you organize it."
          spellCheck={false}
          className="flex-1 w-full text-[14px] text-white/80 font-normal leading-relaxed outline-none border-none bg-transparent resize-none placeholder:text-white/30 selection:bg-[#BAFF29]/25"
        />

        {/* Captured Slides Ribbon (if slides exist) */}
        {snapshots.length > 0 && (
          <div className="pt-3 pb-1 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
                Captured Slides ({snapshots.length})
              </span>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
              {snapshots.map((snap) => (
                <div
                  key={snap.id}
                  onClick={() => setSelectedSnapshot(snap)}
                  className="w-24 h-16 rounded-xl overflow-hidden bg-[#1A1C20] border border-white/10 shrink-0 relative group cursor-pointer shadow-sm hover:border-[#BAFF29]/50 transition-all"
                  title="Click to preview slide"
                >
                  <img
                    src={snap.url}
                    alt="Slide"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/80 text-[#BAFF29] text-[8.5px] font-bold font-mono border border-white/10">
                    {snap.time}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            className="absolute top-14 left-1/2 -translate-x-1/2 bg-[#1A1C20]/95 backdrop-blur-md text-white text-[11.5px] font-semibold px-3 py-1 rounded-full shadow-2xl flex items-center gap-1.5 z-40 whitespace-nowrap border border-[#BAFF29]/30"
          >
            <Sparkles size={12} className="text-[#BAFF29]" />
            <span>{showToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Floating Bottom Controls: Camera circle on left + Waveform/Pause/Stop pill on right */}
      <div className="absolute bottom-6 left-0 right-0 z-30 pointer-events-none flex items-center justify-center gap-3 px-6">
        {/* Circular Snap Button */}
        <button
          type="button"
          onClick={handleCaptureSnapshot}
          className="w-11 h-11 rounded-full bg-[#1A1C20]/95 hover:bg-[#22252A] border border-white/10 backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.5)] flex items-center justify-center text-white/75 hover:text-white hover:border-[#BAFF29]/40 active:scale-95 transition-all pointer-events-auto cursor-pointer"
          title="Snap Slide"
        >
          <Camera size={17} />
        </button>

        {/* Main Recording Capsule */}
        <div className="h-11 px-4 rounded-full bg-[#1A1C20]/95 border border-white/10 backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.5)] flex items-center gap-3.5 pointer-events-auto">
          {/* Waveform Bars + Micro Monospace Timer */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 h-3">
              {[0.1, 0.3, 0.15, 0.4, 0.2].map((d, i) => (
                <span
                  key={i}
                  style={{
                    width: '2px',
                    height: isPaused ? '3px' : '12px',
                    borderRadius: '1px',
                    backgroundColor: isPaused ? 'rgba(255,255,255,0.25)' : '#BAFF29',
                    animation: isPaused ? 'none' : 'pulse 0.8s infinite',
                    animationDelay: `${d}s`,
                  }}
                />
              ))}
            </div>
            <span className="font-mono text-[11.5px] font-semibold text-white/60 select-none">
              {formatTime(elapsed)}
            </span>
          </div>

          <div className="w-[1px] h-3.5 bg-white/10" />

          {/* Pause / Resume Button */}
          <button
            type="button"
            onClick={handleTogglePause}
            className="p-1 rounded-full text-white/75 hover:text-white transition-colors cursor-pointer flex items-center justify-center active:scale-95"
            title={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? (
              <Play size={15} className="text-[#BAFF29] fill-current" />
            ) : (
              <Pause size={15} className="fill-current" />
            )}
          </button>

          {/* Stop / Finish Button: Sider-style rounded square */}
          <button
            type="button"
            onClick={handleStopAndSave}
            disabled={isLoading}
            className="w-4.5 h-4.5 rounded-[4px] bg-rose-500 hover:bg-rose-400 active:scale-90 transition-all cursor-pointer flex items-center justify-center shadow-xs"
            title="Finish & Save"
          >
            <Square size={8} fill="currentColor" className="text-white" />
          </button>
        </div>
      </div>

      {/* 5. Lightbox Modal for Snapshot Full Preview */}
      {selectedSnapshot && (
        <div
          onClick={() => setSelectedSnapshot(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-full max-h-[85vh] bg-[#141517] rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-3 border-b border-white/[0.06] bg-[#1A1C20]">
              <div className="flex items-center gap-2">
                <Camera size={14} className="text-[#BAFF29]" />
                <span className="text-[12px] font-bold text-white">
                  Slide Frame at {selectedSnapshot.time}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSnapshot(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <img
              src={selectedSnapshot.url}
              alt="Snapshot Full View"
              className="max-h-[60vh] object-contain w-full bg-black/40"
            />
            <div className="p-3 bg-[#141517] border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-[11px] text-white/40">Captured from tab stream</span>
              <button
                type="button"
                onClick={() => {
                  setSnapshots((prev) => {
                    const updated = prev.filter((s) => s.id !== selectedSnapshot.id);
                    chrome.storage.local.set({ [`note_snapshots_${session.id}`]: updated });
                    return updated;
                  });
                  setSelectedSnapshot(null);
                  triggerToast('Slide removed');
                }}
                className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 font-bold cursor-pointer"
              >
                <Trash2 size={12} />
                <span>Delete slide</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 6. Microphone Permission Guide Modal */}
      <MicrophoneGuideModal
        isOpen={showAudioGuideModal}
        onClose={() => setShowAudioGuideModal(false)}
        onPermissionGranted={() => {
          setMicBlocked(false);
          setShowMicAlert(false);
        }}
      />
    </div>
  );
}
