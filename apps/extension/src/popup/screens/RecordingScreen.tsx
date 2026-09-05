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
  Plus,
  FileText,
  Video,
  Volume2,
  Trash2,
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
      {/* 1. Top Navigation Bar: ← Back, Live Monospace Timer & Audio Guide */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0 bg-[#0A0A0C]">
        <button
          type="button"
          onClick={onBack}
          className="px-2.5 py-1.5 rounded-xl bg-[#141517] hover:bg-[#1A1C20] border border-white/[0.06] text-white/70 hover:text-white transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95"
          title="Back to Notes (Recording continues)"
        >
          <ArrowLeft size={15} />
          <span className="text-[12px] font-semibold tracking-tight">Back</span>
        </button>

        {/* Monospace Status Pill */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full shadow-xs border ${
            isPaused
              ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
              : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isPaused ? 'bg-amber-400' : 'bg-rose-500 animate-pulse'
            }`}
          />
          <span className="text-[12px] font-extrabold font-mono tracking-wider">
            {isPaused ? `PAUSED ${formatTime(elapsed)}` : formatTime(elapsed)}
          </span>
        </div>

        {/* Audio & Mic Guide Icon */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAudioGuideModal(true)}
            className="p-2 rounded-xl bg-[#141517] hover:bg-[#1A1C20] border border-white/[0.06] text-white/60 hover:text-white transition-colors cursor-pointer"
            title="Audio & Microphone Setup"
          >
            <HelpCircle size={15} />
            {micBlocked && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-[#141517] animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Whisper-Thin Divider Line */}
      <div className="h-[1px] w-full bg-white/[0.05]" />

      {/* 2. Microphone Blocked Banner (If applicable) */}
      <AnimatePresence>
        {micBlocked && showMicAlert && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-4 mt-3 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-start justify-between gap-2.5 shrink-0 shadow-xs"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold text-amber-300">Microphone Blocked</span>
                  <button
                    type="button"
                    onClick={() => setShowAudioGuideModal(true)}
                    className="text-[11px] font-bold text-[#BAFF29] underline hover:text-white cursor-pointer"
                  >
                    Instructions
                  </button>
                </div>
                <p className="text-[11px] text-white/70 leading-tight">
                  Your mic is muted by browser permissions. Tab/meeting audio is still capturing normally.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowMicAlert(false)}
              className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer shrink-0"
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Main Scrollable Workspace */}
      <div className="flex-1 px-4 py-3 space-y-3.5 overflow-y-auto pb-24">
        {/* Meeting Header & Mode Badge */}
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#BAFF29]/10 border border-[#BAFF29]/20 text-[#BAFF29] text-[10.5px] font-bold tracking-wider uppercase">
              {captureConfig.video === false ? <Volume2 size={11} /> : <Video size={11} />}
              <span>{captureConfig.video === false ? 'Audio Only' : 'Video + Audio'}</span>
            </span>
            <span className="text-[11px] text-white/40 font-medium">
              Started {new Date(startMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Meeting Title..."
            spellCheck={false}
            className="w-full text-[19px] font-extrabold text-white tracking-tight leading-tight outline-none border-b border-transparent focus:border-white/15 bg-transparent placeholder:text-white/20 pb-0.5 transition-all"
          />
        </div>

        {/* Live Notes Card */}
        <div className="rounded-2xl bg-[#141517] border border-white/[0.06] p-3.5 space-y-2 shadow-xs focus-within:border-[#BAFF29]/30 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-white/40 text-[11px] font-bold uppercase tracking-wider">
              <FileText size={12} className="text-[#BAFF29]" />
              <span>Live Notes</span>
            </div>
            <span className="text-[10.5px] text-white/30 font-medium">Auto-saved</span>
          </div>

          <textarea
            value={noteContent}
            onChange={handleNoteChange}
            placeholder="Type key discussion points, decisions, or action items..."
            spellCheck={false}
            rows={5}
            className="w-full text-[13px] text-white/90 font-normal leading-relaxed outline-none border-none bg-transparent resize-none placeholder:text-white/25"
          />
        </div>

        {/* Visual Slides & Screenshots Section */}
        {snapshots.length === 0 ? (
          <div className="rounded-2xl bg-[#141517] border border-white/[0.06] p-3 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#1A1C20] border border-white/[0.05] flex items-center justify-center text-white/50">
                <Camera size={15} />
              </div>
              <div>
                <span className="text-[12px] font-bold text-white/80 block leading-tight">Visual Slides (0)</span>
                <span className="text-[10.5px] text-white/40 leading-tight">Auto-snaps every 30s or snap manually</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCaptureSnapshot}
              className="px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-[#BAFF29] text-white/80 hover:text-[#0A0A0C] text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95"
            >
              <Plus size={12} strokeWidth={3} />
              <span>Snap</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[12px] font-bold text-white/70">
                Captured Slides ({snapshots.length})
              </span>
              <button
                type="button"
                onClick={handleCaptureSnapshot}
                className="text-[11px] font-bold text-[#BAFF29] hover:underline cursor-pointer flex items-center gap-1"
              >
                <Plus size={11} strokeWidth={3} />
                <span>Snap another</span>
              </button>
            </div>

            <div className="flex gap-2.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
              {snapshots.map((snap) => (
                <div
                  key={snap.id}
                  onClick={() => setSelectedSnapshot(snap)}
                  className="w-36 h-24 rounded-xl overflow-hidden bg-[#1A1C20] border border-white/[0.06] shrink-0 relative group cursor-pointer shadow-md hover:border-[#BAFF29]/40 transition-all"
                  title="Click to preview slide"
                >
                  <img
                    src={snap.url}
                    alt="Slide"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-[#0A0A0C]/90 text-[#BAFF29] text-[9.5px] font-bold font-mono border border-white/10">
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
            className="absolute top-16 left-1/2 -translate-x-1/2 bg-[#1A1C20]/95 backdrop-blur-md text-white text-[12px] font-bold px-3.5 py-1.5 rounded-full shadow-2xl flex items-center gap-2 z-40 whitespace-nowrap border border-[#BAFF29]/30"
          >
            <Sparkles size={13} className="text-[#BAFF29]" />
            <span>{showToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Unified Floating Control Dock at Bottom */}
      <div className="absolute bottom-4 left-4 right-4 z-30 pointer-events-none">
        <div className="p-1.5 px-2 rounded-2xl bg-[#141517]/95 border border-white/[0.08] backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.7)] flex items-center justify-between gap-2 pointer-events-auto">
          {/* Left: Snap Slide Button */}
          <button
            type="button"
            onClick={handleCaptureSnapshot}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.06] text-white/80 hover:text-white text-[12px] font-semibold transition-all cursor-pointer active:scale-95"
            title="Capture current video frame"
          >
            <Camera size={14} className="text-[#BAFF29]" />
            <span>Snap Slide</span>
          </button>

          {/* Center: Waveform + Pause/Resume Button */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white/[0.03] border border-white/[0.04]">
            <div className="flex items-center gap-0.5 h-3.5">
              {[0.1, 0.3, 0.15, 0.4, 0.2].map((d, i) => (
                <span
                  key={i}
                  style={{
                    width: '2px',
                    height: isPaused ? '3px' : '12px',
                    borderRadius: '2px',
                    backgroundColor: isPaused ? 'rgba(255,255,255,0.25)' : '#BAFF29',
                    animation: isPaused ? 'none' : 'pulse 0.8s infinite',
                    animationDelay: `${d}s`,
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={handleTogglePause}
              className="p-1 rounded-lg hover:bg-white/[0.1] text-white/75 hover:text-white transition-colors cursor-pointer"
              title={isPaused ? 'Resume Recording' : 'Pause Recording'}
            >
              {isPaused ? (
                <Play size={14} className="text-[#BAFF29] fill-current" />
              ) : (
                <Pause size={14} className="fill-current" />
              )}
            </button>
          </div>

          {/* Right: Stop & Save (Finish) Button */}
          <button
            type="button"
            onClick={handleStopAndSave}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[12px] font-bold shadow-md shadow-rose-600/30 transition-all cursor-pointer active:scale-95"
            title="Finish & Save Note"
          >
            <Square size={12} fill="currentColor" />
            <span>Finish</span>
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
