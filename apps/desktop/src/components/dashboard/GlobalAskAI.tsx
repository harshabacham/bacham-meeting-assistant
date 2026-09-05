import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Sparkles, CheckCircle2, ChevronRight, ChevronLeft, Check, X, 
  Calendar, Clock, Video, CalendarPlus, Bell, FileText, Search,
  Play, Pause, RotateCcw, Copy, CheckSquare,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePetStore, PET_DEFINITIONS } from '@/shared/stores/petStore';
import { PetAvatar } from '@/components/pets/PetAvatars';
import { 
  useCalendarStore, 
  findImminentMeeting, 
  findRecentlyConcludedMeeting, 
  CalendarEvent 
} from '@/shared/stores/calendarStore';
import { useGlobalTasks, GlobalActionItem } from '@/shared/hooks/useGlobalTasks';
import { useLectureStore } from '@/shared/stores/lectureStore';
import { useFocusStore } from '@/shared/stores/focusStore';
import { useToast } from '@/components/ui/ToastProvider';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useNavigate } from 'react-router-dom';

interface SearchResultItem {
  id: string;
  type: 'note' | 'task';
  title: string;
  snippet: string;
  lectureId?: string;
}

export const PetCompanionWidget: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [taskIndex, setTaskIndex] = useState(0);
  const [isMarking, setIsMarking] = useState(false);
  const [copiedDraft, setCopiedDraft] = useState(false);

  // Whisper query state
  const [whisperQuery, setWhisperQuery] = useState('');
  const whisperInputRef = useRef<HTMLInputElement>(null);

  const { selectedPetId, petSize, isTuckedAway, hidePet } = usePetStore();
  const currentPet = PET_DEFINITIONS.find(p => p.id === selectedPetId) || PET_DEFINITIONS[0];
  const navigate = useNavigate();
  const { showToast } = useToast();

  const bubbleRef = useRef<HTMLDivElement>(null);
  const dragConstraintsRef = useRef(null);

  // Stores
  const { events, addEvent, toggleEventCompleted } = useCalendarStore();
  const { tasks, toggleTaskStatus } = useGlobalTasks();
  const { lectures, fetchLectures } = useLectureStore();
  const { 
    isRunning: isFocusRunning, 
    timeLeft: focusTimeLeft, 
    totalDuration: focusTotalDuration, 
    mode: focusMode, 
    startSession,
    pauseSession,
    resumeSession,
    resetSession,
    tick: focusTick,
  } = useFocusStore();

  // Load lectures on mount
  useEffect(() => {
    if (lectures.length === 0) {
      fetchLectures().catch(console.error);
    }
  }, [fetchLectures, lectures.length]);

  // Focus Timer 1s interval
  useEffect(() => {
    if (!isFocusRunning) return;
    const timer = setInterval(() => {
      focusTick();
    }, 1000);
    return () => clearInterval(timer);
  }, [isFocusRunning, focusTick]);

  // Completion notification
  useEffect(() => {
    if (focusTimeLeft === 0 && !isFocusRunning) {
      if (focusMode === 'focus') {
        showToast('Focus session complete! Time for a refreshing break 🎉', 'success');
      } else {
        showToast('Break finished! Ready for deep work?', 'info');
      }
    }
  }, [focusTimeLeft, isFocusRunning, focusMode, showToast]);

  // Pending action items (urgent first)
  const pendingTasks = useMemo(() => {
    return tasks
      .filter(t => t.status === 'todo')
      .sort((a, b) => {
        const priorityWeight: Record<string, number> = { urgent: 3, high: 2, medium: 1, low: 0 };
        const pDiff = (priorityWeight[b.priority] ?? 1) - (priorityWeight[a.priority] ?? 1);
        if (pDiff !== 0) return pDiff;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
  }, [tasks]);

  // Imminent meeting detection & snooze state
  const [imminentMeeting, setImminentMeeting] = useState<{
    event: CalendarEvent;
    minutesUntilStart: number;
    isOngoing: boolean;
  } | null>(null);

  // Concluded meeting detection (within last 30m)
  const [concludedMeeting, setConcludedMeeting] = useState<{
    event: CalendarEvent;
    minutesSinceEnd: number;
  } | null>(null);

  const [snoozedMeetingId, setSnoozedMeetingId] = useState<string | null>(null);
  const [snoozeUntil, setSnoozeUntil] = useState<number | null>(null);

  // Monitor imminent and concluded meetings every 20s
  useEffect(() => {
    const checkMeetings = () => {
      const imminent = findImminentMeeting(events, 10);
      if (imminent) {
        if (snoozedMeetingId === imminent.event.id && snoozeUntil && Date.now() < snoozeUntil) {
          setImminentMeeting(null);
        } else {
          setImminentMeeting(imminent);
        }
      } else {
        setImminentMeeting(null);
      }

      const concluded = findRecentlyConcludedMeeting(events, 30);
      setConcludedMeeting(concluded);
    };

    checkMeetings();
    const interval = setInterval(checkMeetings, 20000);
    return () => clearInterval(interval);
  }, [events, snoozedMeetingId, snoozeUntil]);

  // Find prior related note for pre-meeting briefing
  const relatedPriorNote = useMemo(() => {
    if (!imminentMeeting) return null;
    const title = imminentMeeting.event.title.toLowerCase();
    const words = title.split(/\s+/).filter(w => w.length > 3);

    return lectures.find(l => {
      const lTitle = (l.title || '').toLowerCase();
      return words.some(w => lTitle.includes(w));
    }) || null;
  }, [imminentMeeting, lectures]);

  // Whisper Search Query Results
  const whisperResults = useMemo<SearchResultItem[]>(() => {
    const query = whisperQuery.trim().toLowerCase();
    if (!query) return [];

    const results: SearchResultItem[] = [];

    // Search tasks
    tasks.forEach(t => {
      if (t.task.toLowerCase().includes(query) || (t.lectureTitle && t.lectureTitle.toLowerCase().includes(query))) {
        results.push({
          id: t.id,
          type: 'task',
          title: t.task,
          snippet: `Task from "${t.lectureTitle || 'Workspace'}"`,
          lectureId: t.lectureId,
        });
      }
    });

    // Search lectures
    lectures.forEach(l => {
      const anyL = l as any;
      const titleMatch = (l.title || '').toLowerCase().includes(query);
      const summaryMatch = (anyL.summary || anyL.description || '').toLowerCase().includes(query);
      const contentMatch = (anyL.content || '').toLowerCase().includes(query);

      if (titleMatch || summaryMatch || contentMatch) {
        let snippet = anyL.summary || anyL.description || '';
        if (contentMatch && !summaryMatch) {
          const idx = (anyL.content || '').toLowerCase().indexOf(query);
          const start = Math.max(0, idx - 40);
          const end = Math.min((anyL.content || '').length, idx + 100);
          snippet = `...${(anyL.content || '').slice(start, end)}...`;
        } else if (snippet.length > 100) {
          snippet = `${snippet.slice(0, 100)}...`;
        }

        results.push({
          id: l.id,
          type: 'note',
          title: l.title || 'Untitled Meeting Note',
          snippet: snippet || 'Discussion and meeting notes',
          lectureId: l.id,
        });
      }
    });

    return results.slice(0, 4);
  }, [whisperQuery, tasks, lectures]);

  // Adjust task index when list shrinks
  useEffect(() => {
    if (taskIndex >= pendingTasks.length && pendingTasks.length > 0) {
      setTaskIndex(pendingTasks.length - 1);
    }
  }, [pendingTasks.length, taskIndex]);

  // Saved position persistence
  const [savedPosition, setSavedPosition] = useState(() => {
    const saved = localStorage.getItem('pet-position');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return { x: 0, y: 0 };
  });

  const handleDragEnd = (_event: any, info: any) => {
    setSavedPosition((prev: any) => {
      const newPos = { x: prev.x + info.offset.x, y: prev.y + info.offset.y };
      localStorage.setItem('pet-position', JSON.stringify(newPos));
      return newPos;
    });
  };

  // Close bubble on outside click
  useEffect(() => {
    if (!showBubble) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) {
        setShowBubble(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showBubble]);

  const toggleBubble = () => {
    setShowBubble(prev => !prev);
  };

  const handleMarkAsDone = async (task: GlobalActionItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMarking) return;
    setIsMarking(true);
    try {
      await toggleTaskStatus(task);
      showToast('Action item completed!', 'success');
      if (pendingTasks.length <= 1) {
        setShowBubble(false);
      }
    } catch (err) {
      console.error('Failed to mark task as done', err);
      showToast('Failed to update task', 'error');
    } finally {
      setIsMarking(false);
    }
  };

  const handleScheduleFocusBlock = async (task: GlobalActionItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const now = new Date();
      const start = new Date(now.getTime() + 15 * 60000);
      const end = new Date(start.getTime() + 30 * 60000);

      const formatTime = (d: Date) => {
        let h = d.getHours();
        const m = d.getMinutes().toString().padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        h = h ? h : 12;
        return `${h}:${m} ${ampm}`;
      };

      const dateStr = start.toISOString().split('T')[0];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      await addEvent({
        title: `Focus: ${task.task}`,
        description: `Dedicated focus block for action item${task.lectureTitle ? ` from "${task.lectureTitle}"` : ''}`,
        dateStr,
        dayNum: start.getDate(),
        monthStr: monthNames[start.getMonth()],
        dayOfWeek: dayNames[start.getDay()],
        startTime: formatTime(start),
        endTime: formatTime(end),
        timeRange: `${formatTime(start)} – ${formatTime(end)}`,
        type: 'bacham',
        color: '#6366f1',
        lectureId: task.lectureId,
      });

      showToast('Scheduled 30m focus block on calendar!', 'success');
    } catch (err) {
      console.error('Failed to schedule focus time', err);
      showToast('Could not schedule calendar block', 'error');
    }
  };

  const handleJoinMeeting = async (url?: string) => {
    if (!url) return;
    try {
      await openUrl(url);
    } catch {
      window.open(url, '_blank');
    }
  };

  const handleSnoozeMeeting = () => {
    if (!imminentMeeting) return;
    setSnoozedMeetingId(imminentMeeting.event.id);
    setSnoozeUntil(Date.now() + 5 * 60 * 1000);
    setImminentMeeting(null);
    showToast('Meeting alert snoozed for 5 minutes', 'info');
  };

  const handleCopyFollowupDraft = async (event: CalendarEvent) => {
    const matchingTasks = tasks.filter(t => t.lectureId === event.lectureId || t.status === 'todo').slice(0, 3);
    const actionItemsList = matchingTasks.length > 0 
      ? matchingTasks.map(t => `- [ ] ${t.task}`).join('\n')
      : '- [ ] Send meeting recap and finalized notes\n- [ ] Follow up on next milestone';

    const draft = `Subject: Follow-up & Next Steps: ${event.title}

Hi everyone,

Thank you for your time during "${event.title}". Here is a brief recap of our discussion and next steps:

Key Takeaways:
- Discussed core project milestones and updates.
- Aligned on priority deliverables for this week.

Action Items:
${actionItemsList}

Please let me know if anything was missed or needs adjustment.

Best regards,`;

    await navigator.clipboard.writeText(draft);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
    showToast('Follow-up draft copied to clipboard!', 'success');
  };

  const formatTimerSeconds = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (isTuckedAway || hidePet) return null;

  const currentTask = pendingTasks[taskIndex];

  return (
    <div ref={dragConstraintsRef} className="fixed inset-0 z-50 pointer-events-none">
      <motion.div
        drag
        dragConstraints={dragConstraintsRef}
        dragElastic={0.1}
        dragMomentum={false}
        initial={savedPosition}
        onDragEnd={handleDragEnd}
        className="absolute bottom-6 right-6 flex items-end justify-end pointer-events-auto"
      >
        {/* Docked Focus Capsule (When focus is running or paused) */}
        {(isFocusRunning || (focusTimeLeft > 0 && focusTimeLeft < focusTotalDuration)) && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9, x: 10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: 10 }}
            onClick={(e) => {
              e.stopPropagation();
              setShowBubble(true);
            }}
            className="mr-3 mb-2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] text-xs font-mono font-semibold text-[var(--text-primary)] shadow-md cursor-pointer hover:bg-[var(--surface-hover)] transition-all"
            title="Focus Session Active"
          >
            <span className={`w-2 h-2 rounded-full ${isFocusRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>{formatTimerSeconds(focusTimeLeft)}</span>
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-sans">
              {focusMode === 'focus' ? 'Focus' : 'Break'}
            </span>
          </motion.button>
        )}

        {/* ─── CONTEXTUAL SPEECH BUBBLE COMPANION ─── */}
        <AnimatePresence>
          {showBubble && (
            <motion.div
              ref={bubbleRef}
              initial={{ opacity: 0, y: 10, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 480, damping: 30 }}
              className="absolute bottom-full mb-3 right-0 w-[320px] bg-[var(--surface-raised)] border border-[var(--border)] p-3.5 rounded-2xl shadow-xl pointer-events-auto cursor-default text-left relative"
              onPointerDown={(e) => e.stopPropagation()}
            >
              {/* Speech Bubble Directional Tail (Points down to the pet avatar) */}
              <div 
                className="absolute -bottom-1.5 right-6 w-3 h-3 bg-[var(--surface-raised)] border-r border-b border-[var(--border)] rotate-45 pointer-events-none" 
              />

              {/* Header: Pet Persona Identity & Close */}
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: currentPet.color }}
                  />
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    {currentPet.name}
                  </span>
                  {imminentMeeting ? (
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 rounded-md">
                      Alert
                    </span>
                  ) : isFocusRunning ? (
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 rounded-md">
                      Focusing
                    </span>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => setShowBubble(false)}
                  className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                  title="Dismiss"
                >
                  <X size={13} />
                </button>
              </div>

              {/* ─── BODY: CONTEXTUAL MICRO-BRIEFING ─── */}
              {whisperQuery ? (
                /* Whisper Search Results View */
                <div className="flex flex-col gap-2 min-h-[140px] max-h-[220px] overflow-y-auto custom-scrollbar pr-1 mb-2.5">
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <span>Results for "{whisperQuery}"</span>
                    <button 
                      onClick={() => setWhisperQuery('')}
                      className="text-[10px] text-[var(--accent)] hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>

                  {whisperResults.length > 0 ? (
                    whisperResults.map((res) => (
                      <div
                        key={res.id}
                        onClick={() => {
                          if (res.lectureId) {
                            setShowBubble(false);
                            navigate(res.lectureId.startsWith('note_') ? '/notes' : `/lectures/${res.lectureId}`);
                          }
                        }}
                        className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] cursor-pointer transition-all flex flex-col gap-0.5 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] truncate flex items-center gap-1.5">
                            {res.type === 'task' ? <CheckSquare size={11} className="text-[var(--accent)]" /> : <FileText size={11} className="text-sky-400" />}
                            {res.title}
                          </span>
                          <ExternalLink size={10} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
                        </div>
                        <p className="text-[10.5px] text-[var(--text-muted)] line-clamp-2">
                          {res.snippet}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                      No matching notes or action items found.
                    </div>
                  )}
                </div>
              ) : imminentMeeting ? (
                /* Case 1: Imminent Meeting Briefing */
                <div className="flex flex-col gap-2.5 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                      {imminentMeeting.isOngoing ? 'Happening Now' : `Starts in ${imminentMeeting.minutesUntilStart}m`}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                      <Clock size={11} />
                      {imminentMeeting.event.timeRange || imminentMeeting.event.startTime}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-[var(--text-primary)] leading-snug">
                    "{imminentMeeting.event.title}"
                  </p>

                  {relatedPriorNote && (
                    <div className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[11px] text-[var(--text-muted)] leading-relaxed">
                      <span className="font-semibold text-[var(--text-primary)]">Prior Note: </span>
                      <span className="line-clamp-2">
                        {((relatedPriorNote as any)?.summary || relatedPriorNote?.description || 'Review goals & deliverables').slice(0, 95)}...
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-1.5 pt-1">
                    <button
                      onClick={handleSnoozeMeeting}
                      className="text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      Snooze 5m
                    </button>

                    <div className="flex items-center gap-1.5">
                      {relatedPriorNote && (
                        <button
                          onClick={() => {
                            setShowBubble(false);
                            navigate(`/lectures/${relatedPriorNote.id}`);
                          }}
                          className="text-[11px] font-medium bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] px-2.5 py-1.5 rounded-lg text-[var(--text-primary)] transition-all cursor-pointer flex items-center gap-1"
                        >
                          <FileText size={11} />
                          Note
                        </button>
                      )}

                      {imminentMeeting.event.meetingUrl ? (
                        <button
                          onClick={() => handleJoinMeeting(imminentMeeting.event.meetingUrl)}
                          className="text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                        >
                          <Video size={11} />
                          Join Now
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setShowBubble(false);
                            navigate('/tasks?view=calendar');
                          }}
                          className="text-[11px] font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-zinc-950 font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Calendar size={11} />
                          Calendar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : concludedMeeting ? (
                /* Case 2: Post-Meeting Wrap-up & Debrief */
                <div className="flex flex-col gap-2.5 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      Concluded {concludedMeeting.minutesSinceEnd}m ago
                    </span>
                  </div>

                  <p className="text-xs text-[var(--text-primary)] leading-snug">
                    "{concludedMeeting.event.title}" wrapped up. Send a quick follow-up while context is fresh?
                  </p>

                  <div className="flex items-center justify-between gap-1.5 pt-1">
                    <button
                      onClick={() => {
                        toggleEventCompleted(concludedMeeting.event.id);
                        setConcludedMeeting(null);
                        showToast('Meeting marked as done', 'success');
                      }}
                      className="text-[11px] font-medium text-[var(--text-muted)] hover:text-emerald-400 px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      Mark Done
                    </button>

                    <button
                      onClick={() => handleCopyFollowupDraft(concludedMeeting.event)}
                      className="text-[11px] font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-zinc-950 font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                    >
                      {copiedDraft ? <Check size={11} /> : <Copy size={11} />}
                      {copiedDraft ? 'Copied!' : 'Copy Follow-up'}
                    </button>
                  </div>
                </div>
              ) : isFocusRunning || (focusTimeLeft > 0 && focusTimeLeft < focusTotalDuration) ? (
                /* Case 3: Focus Session Controls */
                <div className="flex flex-col items-center gap-2 py-1 text-center mb-2.5">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-400">
                    {focusMode === 'focus' ? 'Deep Focus Session' : 'Rest Break'}
                  </span>
                  <span className="text-2xl font-bold font-mono tracking-tight text-[var(--text-primary)]">
                    {formatTimerSeconds(focusTimeLeft)}
                  </span>

                  <div className="flex items-center gap-1.5 pt-1">
                    {isFocusRunning ? (
                      <button
                        onClick={pauseSession}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Pause size={11} />
                        Pause
                      </button>
                    ) : (
                      <button
                        onClick={resumeSession}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-zinc-950 font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                      >
                        <Play size={11} />
                        Resume
                      </button>
                    )}

                    <button
                      onClick={resetSession}
                      className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                      title="Reset Session"
                    >
                      <RotateCcw size={12} />
                    </button>
                  </div>
                </div>
              ) : currentTask ? (
                /* Case 4: Action Item Recommendation */
                <div className="flex flex-col gap-2.5 mb-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {currentTask.priority === 'urgent' ? (
                        <span className="text-[9.5px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded uppercase">
                          Urgent
                        </span>
                      ) : (
                        <span className="text-[9.5px] font-bold text-[var(--accent)] bg-[var(--accent-dim)] px-1.5 py-0.5 rounded uppercase">
                          Action Item
                        </span>
                      )}
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">
                        {taskIndex + 1} of {pendingTasks.length}
                      </span>
                    </div>

                    {pendingTasks.length > 1 && (
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => setTaskIndex((prev) => (prev > 0 ? prev - 1 : pendingTasks.length - 1))}
                          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] cursor-pointer"
                        >
                          <ChevronLeft size={11} />
                        </button>
                        <button
                          onClick={() => setTaskIndex((prev) => (prev < pendingTasks.length - 1 ? prev + 1 : 0))}
                          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] cursor-pointer"
                        >
                          <ChevronRight size={11} />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-xs font-medium text-[var(--text-primary)] leading-snug">
                    "{currentTask.task}"
                  </p>

                  <div className="flex items-center justify-between gap-1.5 pt-1">
                    <button
                      onClick={(e) => handleScheduleFocusBlock(currentTask, e)}
                      className="text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-hover)] px-2 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      title="Block 30m Time on Calendar"
                    >
                      <CalendarPlus size={11} />
                      Block Time
                    </button>

                    <button
                      onClick={(e) => handleMarkAsDone(currentTask, e)}
                      disabled={isMarking}
                      className="text-[11px] font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-zinc-950 font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50 shadow-sm"
                    >
                      {isMarking ? 'Done...' : 'Mark Done'}
                      <Check size={11} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              ) : (
                /* Case 5: All Caught Up - Focus Sprint Suggestion */
                <div className="flex flex-col items-center text-center gap-2 py-2 mb-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--text-primary)]">All caught up!</h4>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Your schedule is clear. Ready for a focus sprint?</p>
                  </div>
                  <button
                    onClick={() => startSession(25, 'focus')}
                    className="mt-0.5 text-xs font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-zinc-950 font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Play size={11} />
                    Start 25m Focus Block
                  </button>
                </div>
              )}

              {/* ─── INTEGRATED WHISPER INPUT BAR (ASK PET ANYTHING) ─── */}
              <div className="pt-2 border-t border-[var(--border)] relative">
                <div className="relative flex items-center">
                  <Search size={11} className="absolute left-2.5 text-[var(--text-muted)] pointer-events-none" />
                  <input
                    ref={whisperInputRef}
                    type="text"
                    value={whisperQuery}
                    onChange={(e) => setWhisperQuery(e.target.value)}
                    placeholder={`Ask ${currentPet.name} anything...`}
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl py-1.5 pl-7 pr-7 text-[11px] font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-all"
                  />
                  {whisperQuery ? (
                    <button
                      onClick={() => setWhisperQuery('')}
                      className="absolute right-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      <X size={11} />
                    </button>
                  ) : null}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── PET AVATAR BUTTON (CLEAN SURFACE, SOLID TOOLTIP, NO OVERLAY BADGES) ─── */}
        <motion.button
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={toggleBubble}
          style={{ width: petSize, height: petSize }}
          className="relative flex items-center justify-center cursor-pointer focus:outline-none bg-transparent border-none p-0 outline-none shadow-none group pointer-events-auto"
          whileHover={{ y: -3, scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          aria-label={`Open ${currentPet.name} Companion`}
        >
          <div className="relative flex items-center justify-center w-full h-full">
            <PetAvatar 
              id={selectedPetId} 
              size={petSize} 
              isHovered={isHovered} 
              isThinking={isFocusRunning} 
            />
          </div>

          <AnimatePresence>
            {isHovered && !showBubble && (
              <motion.div
                initial={{ opacity: 0, x: 8, scale: 0.92 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 4, scale: 0.95 }}
                className="absolute right-[calc(100%+12px)] bg-[var(--surface-raised)] border border-[var(--border)] px-3 py-1.5 rounded-xl whitespace-nowrap text-xs font-semibold tracking-wide text-[var(--text-primary)] shadow-md pointer-events-none flex items-center gap-2"
              >
                {isFocusRunning ? (
                  <>
                    <Clock size={12} className="text-emerald-400 animate-spin" />
                    <span>Focusing: {formatTimerSeconds(focusTimeLeft)}</span>
                  </>
                ) : imminentMeeting ? (
                  <>
                    <Bell size={12} className="text-amber-400 animate-pulse" />
                    <span>Starts in {imminentMeeting.minutesUntilStart}m: {imminentMeeting.event.title}</span>
                  </>
                ) : concludedMeeting ? (
                  <>
                    <CheckCircle2 size={12} className="text-emerald-400" />
                    <span>Debrief ready: {concludedMeeting.event.title}</span>
                  </>
                ) : pendingTasks.length > 0 ? (
                  <>
                    <Sparkles size={12} style={{ color: currentPet.color }} />
                    <span>{pendingTasks.length} pending action items</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={12} style={{ color: currentPet.color }} />
                    <span>Hi from {currentPet.name}!</span>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </motion.div>
    </div>
  );
};

export const GlobalAskAI: React.FC = () => {
  return <PetCompanionWidget />;
};



