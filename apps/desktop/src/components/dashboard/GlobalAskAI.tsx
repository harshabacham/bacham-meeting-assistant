import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Sparkles, CheckCircle2, ChevronRight, ChevronLeft, Check, X, 
  Calendar, Clock, Video, CalendarPlus, Bell, FileText, Search,
  Play, Pause, RotateCcw, Copy, CheckSquare, Target
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
  type: 'note' | 'task' | 'transcript';
  title: string;
  snippet: string;
  lectureId?: string;
  timestamp?: string;
}

export const PetCompanionWidget: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [activeTab, setActiveTab] = useState<'briefing' | 'search' | 'focus' | 'tasks'>('tasks');
  const [taskIndex, setTaskIndex] = useState(0);
  const [isMarking, setIsMarking] = useState(false);
  const [copiedDraft, setCopiedDraft] = useState(false);

  // Quick Whisper Search State
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { selectedPetId, petSize, isTuckedAway, hidePet } = usePetStore();
  const currentPet = PET_DEFINITIONS.find(p => p.id === selectedPetId) || PET_DEFINITIONS[0];
  const navigate = useNavigate();
  const { showToast } = useToast();

  const bubbleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
    completedSessions,
    startSession,
    pauseSession,
    resumeSession,
    resetSession,
    tick: focusTick,
    setMode: setFocusMode
  } = useFocusStore();

  // Ensure lectures are fetched for search & cheat sheet
  useEffect(() => {
    if (lectures.length === 0) {
      fetchLectures().catch(console.error);
    }
  }, [fetchLectures, lectures.length]);

  // Focus Timer 1s interval tick
  useEffect(() => {
    if (!isFocusRunning) return;
    const timer = setInterval(() => {
      focusTick();
    }, 1000);
    return () => clearInterval(timer);
  }, [isFocusRunning, focusTick]);

  // Handle focus session completion
  useEffect(() => {
    if (focusTimeLeft === 0 && !isFocusRunning) {
      if (focusMode === 'focus') {
        showToast('Focus session complete! Time for a 5m break 🎉', 'success');
      } else {
        showToast('Break finished! Ready for deep work?', 'info');
      }
    }
  }, [focusTimeLeft, isFocusRunning, focusMode, showToast]);

  // Pending action items (sorted urgent first, then recency)
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
      // 1. Check imminent meetings
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

      // 2. Check recently concluded meetings
      const concluded = findRecentlyConcludedMeeting(events, 30);
      setConcludedMeeting(concluded);
    };

    checkMeetings();
    const interval = setInterval(checkMeetings, 20000);
    return () => clearInterval(interval);
  }, [events, snoozedMeetingId, snoozeUntil]);

  // Find prior related note for the pre-meeting cheat sheet
  const relatedPriorNote = useMemo(() => {
    if (!imminentMeeting) return null;
    const title = imminentMeeting.event.title.toLowerCase();
    const words = title.split(/\s+/).filter(w => w.length > 3);

    return lectures.find(l => {
      const lTitle = (l.title || '').toLowerCase();
      // Match if lecture title shares significant keywords
      return words.some(w => lTitle.includes(w));
    }) || null;
  }, [imminentMeeting, lectures]);

  // Quick Whisper Search Execution
  const searchResults = useMemo<SearchResultItem[]>(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    const results: SearchResultItem[] = [];

    // Search in action items
    tasks.forEach(t => {
      if (t.task.toLowerCase().includes(query) || (t.lectureTitle && t.lectureTitle.toLowerCase().includes(query))) {
        results.push({
          id: t.id,
          type: 'task',
          title: t.task,
          snippet: `Action Item from "${t.lectureTitle || 'Workspace'}" (${t.status === 'done' ? 'Done' : 'Pending'})`,
          lectureId: t.lectureId,
        });
      }
    });

    // Search in lectures
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
        } else if (snippet.length > 120) {
          snippet = `${snippet.slice(0, 120)}...`;
        }

        results.push({
          id: l.id,
          type: 'note',
          title: l.title || 'Untitled Meeting Note',
          snippet: snippet || 'Meeting notes and discussion',
          lectureId: l.id,
        });
      }
    });

    return results.slice(0, 5);
  }, [searchQuery, tasks, lectures]);

  // Adjust current task index if list shrinks
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
        if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showBubble]);

  const triggerBubble = () => {
    if (concludedMeeting || imminentMeeting) {
      setActiveTab('briefing');
    } else if (isFocusRunning) {
      setActiveTab('focus');
    } else {
      setActiveTab('tasks');
    }
    setShowBubble(true);

    if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
    // Keep open longer if user is searching or in focus mode
    const duration = 25000;
    bubbleTimeoutRef.current = setTimeout(() => {
      setShowBubble(false);
    }, duration);
  };

  const handlePetClick = () => {
    if (showBubble) {
      setShowBubble(false);
      if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
    } else {
      triggerBubble();
    }
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
    setShowBubble(false);
    showToast('Meeting alert snoozed for 5 minutes', 'info');
  };

  // Copy Follow-up Email Draft (Feature 3: Post-Meeting Debrief)
  const handleCopyFollowupDraft = async (event: CalendarEvent) => {
    const matchingTasks = tasks.filter(t => t.lectureId === event.lectureId || t.status === 'todo').slice(0, 3);
    const actionItemsList = matchingTasks.length > 0 
      ? matchingTasks.map(t => `- [ ] ${t.task}`).join('\n')
      : '- [ ] Send meeting recap and finalized notes\n- [ ] Follow up on next milestones';

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

  // Format seconds to mm:ss
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
        {/* Floating Focus Timer Capsule alongside the pet button (when running or in session) */}
        {(isFocusRunning || (focusTimeLeft > 0 && focusTimeLeft < focusTotalDuration)) && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9, x: 10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: 10 }}
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab('focus');
              setShowBubble(true);
            }}
            className="mr-3 mb-2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--surface-raised)]/95 border border-[var(--border)] text-xs font-mono font-semibold text-[var(--text-primary)] shadow-lg cursor-pointer hover:bg-[var(--surface-hover)] transition-all"
            title="Open Focus Companion"
          >
            <span className={`w-2 h-2 rounded-full ${isFocusRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>{formatTimerSeconds(focusTimeLeft)}</span>
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-sans">
              {focusMode === 'focus' ? 'Focus' : 'Break'}
            </span>
          </motion.button>
        )}

        <AnimatePresence>
          {showBubble && (
            <motion.div
              ref={bubbleRef}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className="absolute bottom-full mb-3 right-2 w-[370px] bg-[var(--surface)] border border-[var(--border)] p-4 rounded-2xl shadow-xl pointer-events-auto cursor-default relative text-left"
              onPointerDown={(e) => e.stopPropagation()}
            >
              {/* Header Tab Bar */}
              <div className="flex items-center justify-between mb-3 border-b border-[var(--border)]/60 pb-2">
                <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pr-1">
                  {(imminentMeeting || concludedMeeting) && (
                    <button
                      onClick={() => setActiveTab('briefing')}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                        activeTab === 'briefing'
                          ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Bell size={11} className={imminentMeeting ? 'animate-pulse' : ''} />
                      {imminentMeeting ? 'Cheat Sheet' : 'Debrief'}
                    </button>
                  )}

                  <button
                    onClick={() => setActiveTab('tasks')}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                      activeTab === 'tasks'
                        ? 'bg-[var(--surface-raised)] text-[var(--accent)] border border-[var(--border)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Sparkles size={11} />
                    Tasks ({pendingTasks.length})
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('search');
                      setTimeout(() => searchInputRef.current?.focus(), 50);
                    }}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                      activeTab === 'search'
                        ? 'bg-[var(--surface-raised)] text-[var(--accent)] border border-[var(--border)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Search size={11} />
                    Whisper
                  </button>

                  <button
                    onClick={() => setActiveTab('focus')}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                      activeTab === 'focus'
                        ? 'bg-[var(--surface-raised)] text-emerald-400 border border-[var(--border)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Clock size={11} />
                    Focus
                  </button>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowBubble(false);
                    if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
                  }}
                  className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer shrink-0 ml-1"
                  title="Close"
                >
                  <X size={14} />
                </button>
              </div>

              {/* ─── TAB 1: BRIEFING (PRE-MEETING CHEAT SHEET & POST-MEETING DEBRIEF) ─── */}
              {activeTab === 'briefing' && (
                <div>
                  {/* Feature 1: Pre-Meeting 2-Minute Cheat Sheet */}
                  {imminentMeeting && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">
                            {imminentMeeting.isOngoing ? 'Happening Now' : `Starts in ${imminentMeeting.minutesUntilStart}m`}
                          </span>
                          <h4 className="text-sm font-semibold text-[var(--text-primary)] mt-1.5 line-clamp-1">
                            {imminentMeeting.event.title}
                          </h4>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                        <Clock size={12} className="shrink-0" />
                        <span>
                          {imminentMeeting.event.timeRange || imminentMeeting.event.startTime || 'Scheduled time'}
                        </span>
                      </div>

                      {/* 2-Minute Pre-Meeting Cheat Sheet Content */}
                      <div className="bg-[var(--surface-raised)]/70 p-2.5 rounded-xl border border-[var(--border)]/50 flex flex-col gap-2">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--accent)]">
                          <span className="flex items-center gap-1">
                            <Target size={12} />
                            Pre-Flight Briefing
                          </span>
                          {relatedPriorNote && (
                            <span className="text-[10px] text-[var(--text-muted)] font-normal">
                              Matched from "{relatedPriorNote.title}"
                            </span>
                          )}
                        </div>

                        <ul className="text-xs text-[var(--text-primary)] space-y-1.5">
                          {(relatedPriorNote as any)?.summary || relatedPriorNote?.description ? (
                            <li className="flex items-start gap-1.5 text-[11.5px] leading-relaxed">
                              <span className="text-[var(--accent)] font-bold">•</span>
                              <span className="line-clamp-2">
                                Prior Context: {((relatedPriorNote as any)?.summary || relatedPriorNote?.description || '').slice(0, 110)}...
                              </span>
                            </li>
                          ) : (
                            <li className="flex items-start gap-1.5 text-[11.5px] leading-relaxed">
                              <span className="text-[var(--accent)] font-bold">•</span>
                              <span>Review project goals & target deliverables for this session.</span>
                            </li>
                          )}

                          <li className="flex items-start gap-1.5 text-[11.5px] leading-relaxed">
                            <span className="text-amber-400 font-bold">•</span>
                            <span>
                              {pendingTasks.length > 0 
                                ? `${pendingTasks.length} open action item${pendingTasks.length > 1 ? 's' : ''} ready to review.`
                                : 'No blocking pending action items detected.'}
                            </span>
                          </li>
                        </ul>
                      </div>

                      {/* Actions for Pre-Meeting */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border)]/60">
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
                              className="text-[11px] font-semibold bg-[var(--surface-hover)] hover:bg-[var(--surface-raised)] border border-[var(--border)] px-2.5 py-1.5 rounded-lg text-[var(--text-primary)] transition-all cursor-pointer flex items-center gap-1"
                            >
                              <FileText size={11} />
                              Prior Note
                            </button>
                          )}

                          {imminentMeeting.event.meetingUrl ? (
                            <button
                              onClick={() => handleJoinMeeting(imminentMeeting.event.meetingUrl)}
                              className="text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                            >
                              <Video size={12} />
                              Join Now
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setShowBubble(false);
                                navigate('/tasks?view=calendar');
                              }}
                              className="text-[11px] font-semibold bg-[var(--accent)] hover:brightness-110 text-white px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Calendar size={11} />
                              Calendar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Feature 3: Post-Meeting Debrief */}
                  {concludedMeeting && !imminentMeeting && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                            Meeting Concluded {concludedMeeting.minutesSinceEnd}m ago
                          </span>
                          <h4 className="text-sm font-semibold text-[var(--text-primary)] mt-1.5 line-clamp-1">
                            {concludedMeeting.event.title}
                          </h4>
                        </div>
                      </div>

                      <div className="bg-[var(--surface-raised)]/70 p-2.5 rounded-xl border border-[var(--border)]/50 flex flex-col gap-2">
                        <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                          Great session! Follow up while context is fresh to keep momentum high.
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] font-mono">
                          <CheckCircle2 size={12} className="text-emerald-400" />
                          <span>Action items ready to share</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border)]/60">
                        <button
                          onClick={() => {
                            toggleEventCompleted(concludedMeeting.event.id);
                            setConcludedMeeting(null);
                            showToast('Marked meeting as completed on calendar', 'success');
                          }}
                          className="text-[11px] font-medium text-[var(--text-muted)] hover:text-emerald-400 hover:bg-[var(--surface-hover)] px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          Mark Done
                        </button>

                        <button
                          onClick={() => handleCopyFollowupDraft(concludedMeeting.event)}
                          className="text-[11px] font-semibold bg-[var(--accent)] hover:brightness-110 text-white px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                        >
                          {copiedDraft ? <Check size={12} /> : <Copy size={12} />}
                          {copiedDraft ? 'Copied!' : 'Copy Follow-up Draft'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── TAB 2: QUICK WHISPER SEARCH (FEATURE 2) ─── */}
              {activeTab === 'search' && (
                <div className="flex flex-col gap-3">
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={`Ask ${currentPet.name} anything about notes...`}
                      className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl py-2 pl-8 pr-7 text-xs font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]/60 transition-all"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* Search Results */}
                  {searchQuery ? (
                    <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                      {searchResults.length > 0 ? (
                        searchResults.map((res) => (
                          <div
                            key={res.id}
                            onClick={() => {
                              if (res.lectureId) {
                                setShowBubble(false);
                                navigate(res.lectureId.startsWith('note_') ? '/notes' : `/lectures/${res.lectureId}`);
                              }
                            }}
                            className="p-2.5 rounded-xl bg-[var(--surface-raised)]/60 hover:bg-[var(--surface-raised)] border border-[var(--border)]/40 hover:border-[var(--border)] cursor-pointer transition-all flex flex-col gap-1 group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11.5px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] truncate flex items-center gap-1.5">
                                {res.type === 'task' ? <CheckSquare size={11} /> : <FileText size={11} />}
                                {res.title}
                              </span>
                              <ChevronRight size={12} className="text-[var(--text-muted)] group-hover:translate-x-0.5 transition-transform" />
                            </div>
                            <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                              {res.snippet}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="py-6 text-center text-xs text-[var(--text-muted)]">
                          No notes or action items found matching "{searchQuery}"
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Suggested Query Chips */
                    <div className="flex flex-col gap-2">
                      <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        Suggested Inquiries
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          'Urgent Tasks',
                          'Recent Decisions',
                          'Action Items',
                          'Today Summary'
                        ].map((chip) => (
                          <button
                            key={chip}
                            onClick={() => setSearchQuery(chip)}
                            className="text-[11px] font-medium bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] border border-[var(--border)]/60 px-2.5 py-1 rounded-lg text-[var(--text-primary)] transition-colors cursor-pointer"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── TAB 3: FOCUS MODE & POMODORO (FEATURE 5) ─── */}
              {activeTab === 'focus' && (
                <div className="flex flex-col items-center gap-3 py-1 text-center">
                  {/* Mode & Preset Pills */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setFocusMode('focus')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        focusMode === 'focus'
                          ? 'bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent)]/30'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Deep Focus
                    </button>
                    <button
                      onClick={() => setFocusMode('break')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        focusMode === 'break'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Break
                    </button>
                  </div>

                  {/* Big Monospace Timer Display */}
                  <div className="flex flex-col items-center my-1">
                    <span className="text-4xl font-bold font-mono tracking-tight text-[var(--text-primary)]">
                      {formatTimerSeconds(focusTimeLeft)}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)] mt-1">
                      {isFocusRunning ? `${currentPet.name} is focusing alongside you 🎧` : 'Ready to start session'}
                    </span>
                  </div>

                  {/* Preset Duration Buttons (when not running) */}
                  {!isFocusRunning && (
                    <div className="flex items-center gap-1.5">
                      {[15, 25, 45].map((mins) => (
                        <button
                          key={mins}
                          onClick={() => startSession(mins, focusMode)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] transition-colors cursor-pointer"
                        >
                          {mins}m
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Timer Controls */}
                  <div className="flex items-center justify-center gap-2 pt-2 w-full border-t border-[var(--border)]/60">
                    {isFocusRunning ? (
                      <button
                        onClick={pauseSession}
                        className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Pause size={12} />
                        Pause
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (focusTimeLeft > 0) resumeSession();
                          else startSession(25, focusMode);
                        }}
                        className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent)] hover:brightness-110 text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                      >
                        <Play size={12} />
                        {focusTimeLeft > 0 && focusTimeLeft < focusTotalDuration ? 'Resume' : 'Start Focus'}
                      </button>
                    )}

                    <button
                      onClick={resetSession}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                      title="Reset Timer"
                    >
                      <RotateCcw size={13} />
                    </button>
                  </div>

                  {completedSessions > 0 && (
                    <div className="text-[10.5px] text-[var(--text-muted)] font-mono">
                      Completed sessions today: {completedSessions} 🎯
                    </div>
                  )}
                </div>
              )}

              {/* ─── TAB 4: ACTION ITEMS CAROUSEL ─── */}
              {activeTab === 'tasks' && (
                <div>
                  {currentTask ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {currentTask.priority === 'urgent' ? (
                            <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-md uppercase">
                              Urgent
                            </span>
                          ) : currentTask.priority === 'high' ? (
                            <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-md uppercase">
                              High
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-[var(--accent)] bg-[var(--accent-dim)] px-1.5 py-0.5 rounded-md uppercase">
                              Action Item
                            </span>
                          )}
                          <span className="text-[11px] text-[var(--text-muted)] font-mono">
                            {taskIndex + 1} of {pendingTasks.length}
                          </span>
                        </div>

                        {pendingTasks.length > 1 && (
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => setTaskIndex((prev) => (prev > 0 ? prev - 1 : pendingTasks.length - 1))}
                              className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                              title="Previous Task"
                            >
                              <ChevronLeft size={13} />
                            </button>
                            <button
                              onClick={() => setTaskIndex((prev) => (prev < pendingTasks.length - 1 ? prev + 1 : 0))}
                              className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                              title="Next Task"
                            >
                              <ChevronRight size={13} />
                            </button>
                          </div>
                        )}
                      </div>

                      <p className="text-sm text-[var(--text-primary)] leading-relaxed font-medium">
                        "{currentTask.task}"
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                        <span className="truncate max-w-[170px]">
                          From: {currentTask.lectureTitle || 'Workspace Note'}
                        </span>
                        {currentTask.timestamp && (
                          <span className="font-mono text-[10.5px] text-[var(--accent)] bg-[var(--accent-dim)] px-1.5 py-0.5 rounded">
                            ⏱ {currentTask.timestamp}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-[var(--border)]/60">
                        <button
                          onClick={(e) => handleScheduleFocusBlock(currentTask, e)}
                          className="text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-hover)] px-2 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                          title="Block 30m on Calendar"
                        >
                          <CalendarPlus size={12} />
                          Block Time
                        </button>

                        <div className="flex items-center gap-1.5">
                          {currentTask.lectureId && (
                            <button
                              onClick={() => {
                                setShowBubble(false);
                                navigate(
                                  currentTask.lectureId?.startsWith('note_')
                                    ? '/notes'
                                    : `/lectures/${currentTask.lectureId}`
                                );
                              }}
                              className="text-[11px] font-semibold bg-[var(--surface-hover)] hover:bg-[var(--surface-raised)] border border-[var(--border)] px-2.5 py-1.5 rounded-lg text-[var(--text-primary)] transition-all cursor-pointer flex items-center gap-1"
                            >
                              Open
                              <ChevronRight size={11} />
                            </button>
                          )}

                          <button
                            onClick={(e) => handleMarkAsDone(currentTask, e)}
                            disabled={isMarking}
                            className="text-[11px] font-semibold bg-[var(--accent)] hover:brightness-110 text-white px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                          >
                            {isMarking ? 'Done...' : 'Mark Done'}
                            <Check size={11} strokeWidth={3} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 py-2 pr-6">
                      <div className="w-9 h-9 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-emerald-400 shrink-0">
                        <CheckCircle2 size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">All caught up!</p>
                        <p className="text-xs text-[var(--text-muted)]">No pending action items in your workspace.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pet Avatar Button (Zero notification badges/icons overlay) */}
        <motion.button
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handlePetClick}
          style={{ width: petSize, height: petSize }}
          className="relative flex items-center justify-center cursor-pointer focus:outline-none bg-transparent border-none p-0 outline-none shadow-none group pointer-events-auto"
          whileHover={{ y: -4, scale: 1.05 }}
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
                initial={{ opacity: 0, x: 10, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 5, scale: 0.95 }}
                className="absolute right-[calc(100%+12px)] bg-[var(--surface-raised)]/95 backdrop-blur-xl border border-[var(--border)]/60 px-3 py-1.5 rounded-xl whitespace-nowrap text-xs font-semibold tracking-wide text-[var(--text-primary)] shadow-xl pointer-events-none flex items-center gap-2"
              >
                {isFocusRunning ? (
                  <>
                    <Clock size={12} className="text-emerald-400 animate-spin" />
                    <span>Focusing: {formatTimerSeconds(focusTimeLeft)} remaining</span>
                  </>
                ) : imminentMeeting ? (
                  <>
                    <Bell size={12} className="text-rose-500 animate-pulse" />
                    <span>Meeting starts soon: {imminentMeeting.event.title}</span>
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

