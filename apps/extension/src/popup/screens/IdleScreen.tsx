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
  Sliders,
  X,
  ArrowLeft,
  Pencil,
  FileText,
  Sparkles,
  Calendar,
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
  snapshotCount?: number;
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

  // Note Detail View — matches BACHAM theme (dark slate, tabbed, AI summary)
  if (selectedNote) {
    const tabs = ['Edit', 'Summary', 'Transcript'];
    const [activeDetailTab, setActiveDetailTab] = React.useState('Summary');
    const [askQuery, setAskQuery] = React.useState('');
    const [isPlaying, setIsPlaying] = React.useState(false);

    return (
      <div className="flex flex-col h-full bg-[#0A0A0C] font-sans text-white animate-fade-in overflow-hidden">
        {/* Top icon bar — three-dot / share / copy */}
        <div className="flex justify-end px-4 pt-4 pb-2 gap-3 shrink-0">
          <button onClick={() => setSelectedNote(null)} className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </button>
          <span className="flex-1" />
          <button className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          </button>
          <button className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
          </button>
          <button className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
          </button>
        </div>

        {/* Title */}
        <div className="px-5 pb-3 shrink-0">
          <h1 className="text-[22px] font-bold text-white leading-tight tracking-tight">
            {selectedNote.title}
          </h1>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 px-4 pb-3 border-b border-white/8 shrink-0 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveDetailTab(tab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all ${
                activeDetailTab === tab
                  ? 'bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {tab === 'Edit' && <Pencil size={11} />}
              {tab === 'Summary' && <FileText size={11} />}
              {tab}
            </button>
          ))}
          <span className="flex-1" />
          <span className="flex items-center gap-1 text-[11px] text-white/30 font-medium px-2 shrink-0">
            <Calendar size={11} />
            {selectedNote.date}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {activeDetailTab === 'Summary' && (
            <div className="space-y-5">
              {/* Executive Summary */}
              <div>
                <h2 className="text-[15px] font-bold text-white mb-2">Executive Summary</h2>
                <ul className="space-y-2">
                  {selectedNote.notes ? (
                    selectedNote.notes.split('\n').filter(Boolean).map((line, i) => (
                      <li key={i} className="flex gap-2.5 text-[13px] text-white/70 leading-relaxed">
                        <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
                        <span>{line}</span>
                      </li>
                    ))
                  ) : (
                    <>
                      <li className="flex gap-2.5 text-[13px] text-white/70 leading-relaxed">
                        <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
                        <span>No live notes were recorded during this session.</span>
                      </li>
                      <li className="flex gap-2.5 text-[13px] text-white/70 leading-relaxed">
                        <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-white/40 shrink-0" />
                        <span>Open the BACHAM desktop app for the full AI-generated summary and transcript.</span>
                      </li>
                    </>
                  )}
                </ul>
              </div>

              {/* Session Details */}
              <div>
                <h2 className="text-[15px] font-bold text-white mb-2">Session Details</h2>
                <ul className="space-y-2">
                  <li className="flex gap-2.5 text-[13px] text-white/70 leading-relaxed">
                    <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-white/30 shrink-0" />
                    <span>Recorded on {selectedNote.date}{selectedNote.duration ? ` · Duration: ${selectedNote.duration}` : ''}.</span>
                  </li>
                  {selectedNote.snapshotCount != null && selectedNote.snapshotCount > 0 && (
                    <li className="flex gap-2.5 text-[13px] text-white/70 leading-relaxed">
                      <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-white/30 shrink-0" />
                      <span>{selectedNote.snapshotCount} screenshot{selectedNote.snapshotCount !== 1 ? 's' : ''} were captured during this session.</span>
                    </li>
                  )}
                </ul>
              </div>

              {/* General Observations */}
              <div>
                <h2 className="text-[15px] font-bold text-white mb-2">General Observations</h2>
                <ul className="space-y-2">
                  <li className="flex gap-2.5 text-[13px] text-white/70 leading-relaxed">
                    <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-white/30 shrink-0" />
                    <span>Full AI meeting summary, action items, and transcript are available in the desktop companion app.</span>
                  </li>
                </ul>
              </div>

              {/* Open in App CTA */}
              <button
                onClick={() => chrome.runtime.sendMessage({ type: 'OPEN_APP' })}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-[#BAFF29] hover:bg-[#a3e622] text-[#0A0A0C] text-[13px] font-extrabold transition-all active:scale-98 shadow-lg shadow-[#BAFF29]/20 mt-2 cursor-pointer"
              >
                <Sparkles size={14} className="text-[#0A0A0C]" />
                Open Full Summary in App
              </button>
            </div>
          )}

          {activeDetailTab === 'Edit' && (
            <div>
              <p className="text-[13px] text-white/40 mb-3">Notes captured during session:</p>
              <p className="text-[13px] text-white/70 leading-relaxed whitespace-pre-wrap">
                {selectedNote.notes || 'No notes were typed during this recording.'}
              </p>
            </div>
          )}

          {activeDetailTab === 'Transcript' && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <Mic size={20} className="text-[var(--accent)]" />
              </div>
              <p className="text-[13px] font-bold text-white/70 mb-1">Transcript in Desktop App</p>
              <p className="text-[11px] text-white/35 max-w-[200px]">
                Open the BACHAM desktop app to view the full meeting transcript and AI analysis.
              </p>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="shrink-0 border-t border-white/8 px-4 py-3 flex items-center gap-3 bg-[#141517]">
          {/* Waveform / Play */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <div className="flex items-end gap-px h-4">
              {[2, 4, 3, 5, 2].map((h, i) => (
                <span
                  key={i}
                  style={{ height: `${h * 2}px` }}
                  className={`w-0.5 rounded-full transition-all ${isPlaying ? 'bg-[#BAFF29] animate-pulse' : 'bg-white/25'}`}
                />
              ))}
            </div>
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/8 hover:bg-white/15 border border-white/10 text-[12px] font-semibold text-white/80 transition-all shrink-0 cursor-pointer"
          >
            {isPlaying ? (
              <><span className="w-2 h-2 flex gap-0.5"><span className="w-0.5 h-2 bg-white/70 rounded" /><span className="w-0.5 h-2 bg-white/70 rounded" /></span> Pause</>
            ) : (
              <><svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><polygon points="0,0 10,5 0,10" /></svg> Resume</>
            )}
          </button>

          <input
            value={askQuery}
            onChange={(e) => setAskQuery(e.target.value)}
            placeholder="Ask about this meeting..."
            className="flex-1 bg-transparent text-[12.5px] text-white/70 placeholder:text-white/25 outline-none min-w-0"
          />

          <Mic size={15} className="text-white/40 hover:text-[var(--accent)] cursor-pointer transition-colors shrink-0" />
        </div>
      </div>
    );
  }

  // BACHAM REC Note Home View
  return (
    <div className="flex flex-col h-full bg-[#0A0A0C] font-sans text-white select-none overflow-hidden">
      {/* 1. Header: REC Note */}
      <div className="flex items-center justify-between px-5 pt-6 pb-3">
        <h1 className="text-[24px] font-extrabold text-white tracking-tight flex items-center gap-2">
          <span>REC Note</span>
          <span className="w-2 h-2 rounded-full bg-[#BAFF29] shadow-[0_0_8px_rgba(186,255,41,0.6)]" />
        </h1>
        <div className="relative">
          {/* Top right icon */}
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
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-white/10 bg-[#141517] hover:bg-[#1A1C20] transition-all text-white text-[13px] font-semibold shadow-xs"
            >
              <div className="flex items-center gap-2">
                {isVideoMode ? (
                  <Video size={16} className="text-[#BAFF29]" />
                ) : (
                  <Volume2 size={16} className="text-white/70" />
                )}
                <span className="truncate">{isVideoMode ? 'Video + Audio' : 'Audio Only'}</span>
                <ChevronDown size={14} className="text-white/40 shrink-0" />
              </div>

              {/* Lime Toggle Switch */}
              <div
                onClick={handleToggleVideo}
                className="toggle-switch shrink-0"
                data-state={isVideoMode ? 'checked' : 'unchecked'}
              >
                <span className="toggle-switch-thumb" />
              </div>
            </button>

            {/* Source Dropdown Menu */}
            <AnimatePresence>
              {sourceDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute top-full left-0 right-0 mt-1.5 p-1.5 rounded-2xl bg-[#1A1C20] border border-white/10 shadow-2xl z-50 flex flex-col gap-1 backdrop-blur-xl"
                >
                  <button
                    onClick={() => handleSourceSelect('video')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12.5px] font-semibold transition-colors text-left cursor-pointer ${
                      isVideoMode ? 'bg-[var(--accent-dim)] text-[var(--accent)] font-bold' : 'text-white/80 hover:bg-white/5'
                    }`}
                  >
                    <Video size={16} />
                    <span>Video + Audio</span>
                  </button>

                  <button
                    onClick={() => handleSourceSelect('audio')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12.5px] font-semibold transition-colors text-left cursor-pointer ${
                      !isVideoMode ? 'bg-[var(--accent-dim)] text-[var(--accent)] font-bold' : 'text-white/80 hover:bg-white/5'
                    }`}
                  >
                    <Volume2 size={16} />
                    <span>Audio Only</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Microphone Toggle Button */}
          <div className="relative">
            <button
              onClick={() => {
                void updateConfig({ ...captureConfig, includeMicrophone: !isMicEnabled });
              }}
              title={isMicEnabled ? 'Microphone On' : 'Microphone Muted'}
              className={`flex items-center gap-1 px-2.5 py-2.5 rounded-xl border transition-all text-[13px] font-semibold shadow-xs cursor-pointer ${
                isMicEnabled
                  ? 'border-[var(--border-accent)] bg-[var(--accent-dim)] text-[var(--accent)]'
                  : 'border-white/10 bg-[#141517] text-white/40 hover:bg-[#1A1C20]'
              }`}
            >
              {isMicEnabled ? <Mic size={16} /> : <MicOff size={16} />}
              <ChevronDown size={12} className="text-white/40" />
            </button>
          </div>

          {/* Settings / Sliders Button */}
          <button
            onClick={() => setSettingsModalOpen(!settingsModalOpen)}
            className="p-2.5 rounded-xl border border-white/10 bg-[#141517] hover:bg-[#1A1C20] text-white/70 hover:text-white transition-colors shadow-xs cursor-pointer"
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
            className="w-full py-3.5 px-6 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
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

        {/* Divider */}
        <div className="border-t border-white/8 my-2" />

        {/* 4. My Notes Section Header */}
        <div className="flex items-center justify-between pt-1">
          <h2 className="text-[17px] font-bold text-white tracking-tight">
            My Notes
          </h2>
          <div className="flex items-center gap-2 text-white/40">
            <button
              onClick={() => setShowSearchInput(!showSearchInput)}
              className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              title="Search notes"
            >
              <Search size={16} />
            </button>
            <button 
              className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              title="Filter"
            >
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#141517] border border-white/10 text-[12.5px] text-white placeholder:text-white/30 outline-none focus:border-[#BAFF29] transition-all"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 5. Clean Rounded Notes Cards List */}
        <div className="space-y-3 pb-6">
          {savedNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed border-white/10 text-center bg-[#141517]/50">
              <span className="text-[13px] font-bold text-white/70">No notes recorded yet</span>
              <span className="text-[11.5px] text-white/40 mt-1 max-w-[200px]">
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
                  className="p-4 rounded-2xl border border-white/8 bg-[#141517] hover:border-[var(--border-accent)] hover:bg-[#1A1C20] transition-all cursor-pointer shadow-xs flex flex-col justify-between min-h-[86px]"
                >
                  <h3 className="text-[14.5px] font-bold text-white leading-tight">
                    {note.title}
                  </h3>
                  <div className="flex items-center justify-between mt-3 text-[12px] text-white/40 font-medium">
                    <span>{note.date}</span>
                    {note.duration && (
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-white/60 font-semibold text-[10.5px]">
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
            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col justify-end"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-[#141517] rounded-t-3xl p-5 border-t border-white/10 shadow-2xl space-y-4 text-white"
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
              <div className="flex items-center justify-between py-2 border-b border-white/8">
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
                    className="w-14 px-2 py-1 bg-[#1A1C20] border border-white/10 rounded-lg text-[12px] font-bold text-center text-white outline-none focus:border-[#BAFF29]"
                  />
                  <span className="text-[12px] text-white/50 font-medium">sec</span>
                </div>
              </div>

              {/* Resolution */}
              <div className="flex items-center justify-between py-2 border-b border-white/8">
                <div>
                  <span className="text-[13px] font-bold text-white block">Resolution</span>
                  <span className="text-[11px] text-white/40">Capture video quality</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <select
                    value={captureConfig.resolution || 'auto'}
                    onChange={(e) => void updateConfig({ ...captureConfig, resolution: e.target.value as any })}
                    className="px-2.5 py-1.5 bg-[#1A1C20] border border-white/15 rounded-lg text-[12px] font-bold text-white outline-none focus:border-[#BAFF29] cursor-pointer"
                  >
                    <option value="auto" className="bg-[#141517] text-white">Auto (Balanced)</option>
                    <option value="720p" className="bg-[#141517] text-white">720p (Battery Saver)</option>
                    <option value="1080p" className="bg-[#141517] text-white">1080p (Full HD)</option>
                    <option value="1440p" className="bg-[#141517] text-white">1440p (2K Quad HD)</option>
                    <option value="4k" className="bg-[#141517] text-[#BAFF29]">4K / Native (1:1 Pixel-Perfect) ⚡</option>
                  </select>
                </div>
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
    </div>
  );
}
