import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Session } from '@/shared/types';
import {
  ArrowLeft,
  Menu,
  Camera,
  Pause,
  Play,
  Square,
  Sparkles,
} from 'lucide-react';
import { MessageType } from '@/shared/types';

interface RecordingScreenProps {
  readonly session: Session;
  readonly onPause: () => Promise<void>;
  readonly onStop: () => Promise<void>;
  readonly isLoading: boolean;
  readonly optimisticStart?: number | undefined;
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(m)}:${pad(sec)}`;
}

interface SnapshotItem {
  id: string;
  url: string;
  time: string;
  title?: string;
}

export function RecordingScreen({
  session,
  onPause,
  onStop,
  isLoading,
  optimisticStart,
}: RecordingScreenProps): React.ReactElement {
  const startMs = optimisticStart ?? new Date(session.startedAt).getTime();
  const [elapsed, setElapsed] = useState(() => Math.max(0, Date.now() - startMs - session.pausedDurationMs));
  const [isPaused, setIsPaused] = useState(session.state === 'paused');

  // Editable Title & Live Note Content
  const [title, setTitle] = useState(session.tabTitle || 'Meeting Note');
  const [noteContent, setNoteContent] = useState('');
  const [showToast, setShowToast] = useState<string | null>(null);

  // Live Captured Snapshots
  const [snapshots, setSnapshots] = useState<SnapshotItem[]>([
    {
      id: 's1',
      url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=60',
      time: '00:18',
    },
    {
      id: 's2',
      url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=60',
      time: '00:19',
    },
  ]);

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

  // Load saved note
  useEffect(() => {
    chrome.storage.local.get(`note_${session.id}`, (res) => {
      if (res[`note_${session.id}`]) {
        setNoteContent(res[`note_${session.id}`]);
      }
    });
  }, [session.id]);

  // Save note on edit
  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNoteContent(val);
    chrome.storage.local.set({ [`note_${session.id}`]: val });
    chrome.runtime.sendMessage({
      type: MessageType.LIVE_NOTE,
      payload: { text: val },
      sessionId: session.id,
    }).catch(() => {});
  };

  // Listen for live screenshot notifications
  useEffect(() => {
    const listener = (msg: any) => {
      if (msg?.type === MessageType.METADATA_READY && msg?.payload?.imageBase64) {
        setSnapshots((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            url: msg.payload.imageBase64,
            time: formatTime(elapsed),
          },
        ]);
        triggerToast('📸 Screenshot captured!');
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [elapsed]);

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 2500);
  };

  const handleCaptureSnapshot = () => {
    chrome.runtime.sendMessage({ type: MessageType.TRIGGER_SNAPSHOT });
    triggerToast('📸 Capturing screenshot...');
  };

  const handleTogglePause = async () => {
    if (isPaused) {
      await chrome.runtime.sendMessage({ type: MessageType.RESUME_SESSION });
      setIsPaused(false);
    } else {
      await onPause();
      setIsPaused(true);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white font-sans text-slate-900 select-none relative overflow-hidden">
      {/* 1. Top Navigation Bar: ← Back & ☰ Menu with red dot */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
        <button
          onClick={onStop}
          title="Back to Notes"
          className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-800 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-[11px] font-extrabold text-rose-600 font-mono">
              {formatTime(elapsed)}
            </span>
          </div>

          <div className="relative">
            <button className="p-2 -mr-2 rounded-full hover:bg-slate-100 text-slate-800">
              <Menu size={20} strokeWidth={2.5} />
            </button>
            <span className="absolute top-1.5 right-0 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </div>
        </div>
      </div>

      {/* Main Note & Screenshot Body (Screenshot 2 layout) */}
      <div className="flex-1 px-5 overflow-y-auto pb-28 space-y-4">
        {/* Editable Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note Title..."
          className="w-full text-[26px] font-extrabold text-slate-900 tracking-tight leading-tight outline-none border-none bg-transparent placeholder:text-slate-300"
        />

        {/* Subtitle / Live Note Textarea */}
        <textarea
          value={noteContent}
          onChange={handleNoteChange}
          placeholder="Type notes or let AI automatically transcribe..."
          rows={3}
          className="w-full text-[14px] text-slate-600 font-medium leading-relaxed outline-none border-none bg-transparent resize-none placeholder:text-slate-300"
        />

        {/* Visual Media & Screenshot Deck (Screenshot 2 layout) */}
        <div className="space-y-3 pt-2">
          {snapshots.map((snap) => (
            <motion.div
              key={snap.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative rounded-2xl overflow-hidden bg-[#0f172a] border border-slate-200/80 shadow-md group"
            >
              <img
                src={snap.url}
                alt="Meeting Frame"
                className="w-full h-48 object-cover"
              />
              <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-[#1e293b]/85 backdrop-blur-md text-white text-[11px] font-bold font-mono shadow-sm">
                {snap.time}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Floating Toast Bubble */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[12px] font-bold px-4 py-2 rounded-full shadow-xl flex items-center gap-2 z-40"
          >
            <Sparkles size={13} className="text-purple-400" />
            <span>{showToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Floating Bottom Control Dock (Exact Sider.ai Layout in Screenshot 2) */}
      <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between z-30 pointer-events-none">
        
        {/* Left: [ 📷 Capture Screenshot ] Pill */}
        <div className="flex flex-col items-center gap-1.5 pointer-events-auto">
          <button
            onClick={handleCaptureSnapshot}
            className="w-12 h-12 rounded-full bg-white hover:bg-slate-50 border border-slate-200 shadow-lg flex items-center justify-center text-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="Capture Screenshot"
          >
            <Camera size={20} className="text-slate-700" />
          </button>
        </div>

        {/* Right: [ ılı. (wave)  || (Pause)  ⏹ (Stop) ] Pill Dock */}
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-white border border-slate-200/90 shadow-xl pointer-events-auto">
          {/* Animated Waveform */}
          <div className="flex items-center gap-0.5 h-4 px-1">
            {[0.1, 0.3, 0.15, 0.4, 0.2].map((d, i) => (
              <span
                key={i}
                style={{
                  width: '2.5px',
                  height: isPaused ? '4px' : '14px',
                  borderRadius: '2px',
                  backgroundColor: isPaused ? '#cbd5e1' : '#7c3aed',
                  animation: isPaused ? 'none' : 'pulse 0.8s infinite',
                  animationDelay: `${d}s`,
                }}
              />
            ))}
          </div>

          {/* Pause / Resume Button */}
          <button
            onClick={handleTogglePause}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-700 transition-colors"
            title={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
          </button>

          {/* Stop Button (Red Square) */}
          <button
            onClick={onStop}
            disabled={isLoading}
            className="p-1.5 rounded-full hover:bg-rose-50 text-rose-600 transition-colors"
            title="Stop & Save"
          >
            <Square size={16} fill="currentColor" />
          </button>
        </div>

      </div>
    </div>
  );
}
