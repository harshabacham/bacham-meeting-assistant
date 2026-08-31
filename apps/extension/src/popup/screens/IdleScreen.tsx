import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { StartSessionIntent, LectureSummary } from '@/shared/types';
import { useCapture } from '@/shared/hooks/useCapture';
import { useSession } from '@/shared/hooks/useSession';
import {
  Menu,
  Plus,
  Search,
  SlidersHorizontal,
  Mic,
  MicOff,
  ChevronDown,
  Video,
  Volume2,
  Sliders,
  X,
  Clock,
  ArrowLeft,
} from 'lucide-react';

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
  snapshots?: Array<{ url: string; time: string }>;
}

export function IdleScreen({ onStart, isLoading, onReturnToRecording }: IdleScreenProps): React.ReactElement {
  const { captureConfig, updateConfig } = useCapture();
  const { fetchHistory, sessionState } = useSession();

  // Dropdown states
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);

  // Selected saved note to view details
  const [selectedNote, setSelectedNote] = useState<SavedNoteItem | null>(null);

  // Real Saved Notes (Starts empty, loads from local storage / desktop history)
  const [savedNotes, setSavedNotes] = useState<SavedNoteItem[]>([]);

  // Load saved notes from storage & desktop companion app
  useEffect(() => {
    // 1. Load locally saved notes
    chrome.storage.local.get(['bacham_saved_notes'], (res) => {
      if (res.bacham_saved_notes && Array.isArray(res.bacham_saved_notes)) {
        setSavedNotes(res.bacham_saved_notes);
      }
    });

    // 2. Fetch history from desktop app
    fetchHistory?.().then((data) => {
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
    });
  }, [fetchHistory]);

  const isVideoMode = captureConfig.video !== false && captureConfig.captureMode !== 'audio';
  const isMicEnabled = !!captureConfig.includeMicrophone;

  const handleSourceSelect = (mode: 'video' | 'audio') => {
    if (mode === 'audio') {
      void updateConfig({
        ...captureConfig,
        captureMode: 'audio',
        audio: true,
        video: false,
      });
    } else {
      void updateConfig({
        ...captureConfig,
        captureMode: 'tab',
        audio: true,
        video: true,
      });
    }
    setSourceDropdownOpen(false);
  };

  const handleToggleVideo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isVideoMode) {
      void updateConfig({ ...captureConfig, video: false, captureMode: 'audio' });
    } else {
      void updateConfig({ ...captureConfig, video: true, captureMode: 'tab' });
    }
  };

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

  // Note Details View (Screenshot 2 style)
  if (selectedNote) {
    return (
      <div className="flex flex-col h-full bg-white font-sans text-slate-900 p-5 overflow-y-auto animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => setSelectedNote(null)}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-700 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="relative">
            <button className="p-2 rounded-full hover:bg-slate-100 text-slate-700">
              <Menu size={20} />
            </button>
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
          </div>
        </div>

        <h1 className="text-[26px] font-extrabold text-slate-900 tracking-tight leading-tight mb-2">
          {selectedNote.title}
        </h1>

        <p className="text-[14px] text-slate-600 font-medium leading-relaxed mb-5">
          {selectedNote.notes || 'No live notes recorded for this session.'}
        </p>

        {selectedNote.snapshots && selectedNote.snapshots.length > 0 && (
          <div className="space-y-3 mb-6">
            {selectedNote.snapshots.map((snap, idx) => (
              <div key={idx} className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200/80 shadow-sm">
                <img src={snap.url} alt="Meeting Keyframe" className="w-full h-44 object-cover" />
                <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-bold font-mono">
                  {snap.time}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-[12px] text-slate-400 font-medium">
          <span className="flex items-center gap-1.5">
            <Clock size={13} />
            <span>{selectedNote.date}</span>
          </span>
          {selectedNote.duration && <span>Duration: {selectedNote.duration}</span>}
        </div>
      </div>
    );
  }

  // Sider.ai REC Note Home View (Screenshot 1)
  return (
    <div className="flex flex-col h-full bg-white font-sans text-slate-900 select-none overflow-hidden">
      {/* 1. Header: REC Note + Menu with red notification dot */}
      <div className="flex items-center justify-between px-5 pt-6 pb-3">
        <h1 className="text-[26px] font-extrabold text-slate-900 tracking-tight">
          REC Note
        </h1>
        <div className="relative">
          <button
            onClick={() => setSettingsModalOpen(!settingsModalOpen)}
            className="p-2 -mr-2 rounded-xl hover:bg-slate-100 text-slate-800 transition-colors cursor-pointer"
          >
            <Menu size={22} strokeWidth={2.5} />
          </button>
          <span className="absolute top-1.5 right-0.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 px-5 space-y-4 overflow-y-auto pr-4">
        
        {/* 2. Top Capture Config Bar (Two Options: Video + Audio & Audio Only) */}
        <div className="flex items-center gap-2 relative z-30">
          
          {/* Source Dropdown Button */}
          <div className="relative flex-1">
            <button
              onClick={() => setSourceDropdownOpen(!sourceDropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all text-slate-700 text-[13px] font-semibold shadow-xs"
            >
              <div className="flex items-center gap-2">
                {isVideoMode ? (
                  <Video size={16} className="text-purple-600" />
                ) : (
                  <Volume2 size={16} className="text-slate-600" />
                )}
                <span className="truncate">{isVideoMode ? 'Video + Audio' : 'Audio Only'}</span>
                <ChevronDown size={14} className="text-slate-400 shrink-0" />
              </div>

              {/* Purple Toggle Switch */}
              <div
                onClick={handleToggleVideo}
                className="toggle-switch shrink-0"
                data-state={isVideoMode ? 'checked' : 'unchecked'}
              >
                <span className="toggle-switch-thumb" />
              </div>
            </button>

            {/* Source Dropdown Menu (Only Video + Audio & Audio Only) */}
            <AnimatePresence>
              {sourceDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute top-full left-0 right-0 mt-1.5 p-1.5 rounded-2xl bg-white border border-slate-200 shadow-xl z-50 flex flex-col gap-1"
                >
                  <button
                    onClick={() => handleSourceSelect('video')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12.5px] font-semibold transition-colors text-left ${
                      isVideoMode ? 'bg-purple-50 text-purple-700' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Video size={16} />
                    <span>Video + Audio</span>
                  </button>

                  <button
                    onClick={() => handleSourceSelect('audio')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12.5px] font-semibold transition-colors text-left ${
                      !isVideoMode ? 'bg-purple-50 text-purple-700' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Volume2 size={16} />
                    <span>Audio Only</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Microphone Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => {
                void updateConfig({ ...captureConfig, includeMicrophone: !isMicEnabled });
              }}
              title={isMicEnabled ? 'Microphone On' : 'Microphone Muted'}
              className={`flex items-center gap-1 px-2.5 py-2 rounded-xl border transition-all text-[13px] font-semibold shadow-xs ${
                isMicEnabled
                  ? 'border-purple-200 bg-purple-50 text-purple-700'
                  : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'
              }`}
            >
              {isMicEnabled ? <Mic size={16} /> : <MicOff size={16} />}
              <ChevronDown size={12} className="text-slate-400" />
            </button>
          </div>

          {/* Settings / Sliders Button */}
          <button
            onClick={() => setSettingsModalOpen(!settingsModalOpen)}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-xs"
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
            className="w-full py-3.5 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-md shadow-emerald-500/25 transition-all cursor-pointer"
          >
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span>Return to Active Recording</span>
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStartCapture}
            disabled={isLoading}
            className="w-full py-3.5 px-6 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-md shadow-purple-500/25 transition-all cursor-pointer"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Plus size={18} strokeWidth={2.5} />
                <span>New REC Note</span>
              </>
            )}
          </motion.button>
        )}

        {/* Divider */}
        <div className="border-t border-slate-100 my-2" />

        {/* 4. My Notes Section Header */}
        <div className="flex items-center justify-between pt-1">
          <h2 className="text-[17px] font-bold text-slate-900 tracking-tight">
            My Notes
          </h2>
          <div className="flex items-center gap-2 text-slate-400">
            <button
              onClick={() => setShowSearchInput(!showSearchInput)}
              className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <Search size={16} />
            </button>
            <button className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-colors">
              <Sliders size={16} />
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
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[12.5px] text-slate-800 outline-none focus:border-purple-500 transition-all"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 5. Clean Rounded Notes Cards List */}
        <div className="space-y-3 pb-6">
          {savedNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed border-slate-200 text-center bg-slate-50/50">
              <span className="text-[13px] font-bold text-slate-700">No notes recorded yet</span>
              <span className="text-[11.5px] text-slate-400 mt-1 max-w-[200px]">
                Click "+ New REC Note" above to capture your first meeting!
              </span>
            </div>
          ) : (
            savedNotes
              .filter((n) => !searchQuery || n.title.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((note) => (
                <motion.div
                  key={note.id}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setSelectedNote(note)}
                  className="p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-purple-300 transition-all cursor-pointer shadow-xs flex flex-col justify-between min-h-[86px]"
                >
                  <h3 className="text-[14.5px] font-bold text-slate-900 leading-tight">
                    {note.title}
                  </h3>
                  <div className="flex items-center justify-between mt-3 text-[12px] text-slate-400 font-medium">
                    <span>{note.date}</span>
                    {note.duration && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-semibold text-[10.5px]">
                        {note.duration}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))
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
            className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex flex-col justify-end"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white rounded-t-3xl p-5 border-t border-slate-200 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[16px] font-bold text-slate-900">Recording Options</h3>
                <button
                  onClick={() => setSettingsModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Snapshot Interval */}
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <div>
                  <span className="text-[13px] font-bold text-slate-800 block">Auto Snapshots</span>
                  <span className="text-[11px] text-slate-400">Capture visual slides for notes</span>
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
                    className="w-14 px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[12px] font-bold text-center text-slate-800"
                  />
                  <span className="text-[12px] text-slate-500 font-medium">sec</span>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between text-[12px] text-slate-500 pt-1">
                <span>Transport</span>
                <span className="font-bold text-purple-700">100% Local (127.0.0.1)</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
