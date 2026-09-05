import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Sparkles, CheckCircle2, ChevronRight, ChevronLeft, Check, X, 
  Calendar, Clock, Video, CalendarPlus, Bell, FileText, Search,
  Play, Pause, RotateCcw, Copy, CheckSquare, Target, ArrowRight,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePetStore, PET_DEFINITIONS } from '@/shared/stores/petStore';
import { PetAvatar } from '@/components/pets/PetAvatars';
import { 
  useCalendarStore, 
  findImminentMeeting, 
  findRecentlyConcludedMeeting, 
  parseEventDateTime,
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
  const [activeTab, setActiveTab] = useState<'briefing' | 'whisper' | 'focus' | 'tasks'>('briefing');
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

  // Ensure lectures are loaded for search & cheat sheet
  useEffect(() => {
    if (lectures.length === 0) {
      fetchLectures().catch(console.error);
    }
  }, [fetchLectures, lectures.length]);

  // Focus Timer 1-second interval
  useEffect(() => {
    if (!isFocusRunning) return;
    const timer = setInterval(() => {
      focusTick();
    }, 1000);
    return () => clearInterval(timer);
  }, [isFocusRunning, focusTick]);

  // Focus completion notification
  useEffect(() => {
    if (focusTimeLeft === 0 && !isFocusRunning) {
      if (focusMode === 'focus') {
        showToast('Focus session complete! Time for a refreshing break 🎉', 'success');
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
      // 1. Imminent check
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

      // 2. Concluded check
      const concluded = findRecentlyConcludedMeeting(events, 30);
      setConcludedMeeting(concluded);
    };

    checkMeetings();
    const interval = setInterval(checkMeetings, 20000);
    return () => clearInterval(interval);
  }, [events, snoozedMeetingId, snoozeUntil]);

  // Find next upcoming meeting on calendar (for non-empty Briefing tab)
  const nextUpcomingMeeting = useMemo(() => {
    const now = new Date();
    const upcoming = events
      .filter(e => !e.isCompleted)
      .map(e => {
        const parsed = parseEventDateTime(e);
        return { event: e, parsed };
      })
      .filter(item => item.parsed && item.parsed.start.getTime() > now.getTime())
      .sort((a, b) => a.parsed!.start.getTime() - b.parsed!.start.getTime());

    return upcoming[0] || null;
  }, [events]);

  // Find prior related note for the pre-meeting cheat sheet
  const activeMeetingForBriefing = imminentMeeting?.event || nextUpcomingMeeting?.event;
  const relatedPriorNote = useMemo(() => {
    if (!activeMeetingForBriefing) return null;
    const title = activeMeetingForBriefing.title.toLowerCase();
    const words = title.split(/\s+/).filter(w => w.length > 3);

    return lectures.find(l => {
      const lTitle = (l.title || '').toLowerCase();
      return words.some(w => lTitle.includes(w));
    }) || null;
  }, [activeMeetingForBriefing, lectures]);

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

  // Adjust task index when count shrinks
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

  // Close bubble on outside click (No annoying auto-dismiss timers!)
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
    if (showBubble) {
      setShowBubble(false);
    } else {
      // Auto-route to the most pertinent tab
      if (imminentMeeting || concludedMeeting) {
        setActiveTab('briefing');
      } else if (isFocusRunning) {
        setActiveTab('focus');
      } else if (pendingTasks.length > 0) {
        setActiveTab('tasks');
      } else {
        setActiveTab('briefing');
      }
      setShowBubble(true);
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

  // Focus ring calculation
  const focusProgress = focusTotalDuration > 0 
    ? ((focusTotalDuration - focusTimeLeft) / focusTotalDuration) * 100 
    : 0;

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
        {/* Docked Focus Timer Capsule (Visible beside pet when focus is active or paused) */}
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
            className="mr-3 mb-2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--surface-raised)]/95 backdrop-blur-md border border-[var(--border)] text-xs font-mono font-semibold text-[var(--text-primary)] shadow-lg cursor-pointer hover:bg-[var(--surface-hover)] transition-all"
            title="Open Focus Companion"
          >
            <span className={`w-2 h-2 rounded-full ${isFocusRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>{formatTimerSeconds(focusTimeLeft)}</span>
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-sans">
              {focusMode === 'focus' ? 'Focus' : 'Break'}
            </span>
          </motion.button>
        )}

        {/* Main Companion Popup Bubble */}
        <AnimatePresence>
          {showBubble && (
            <motion.div
              ref={bubbleRef}
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              className="absolute bottom-full mb-3 right-0 w-[390px] bg-[var(--surface)]/98 backdrop-blur-2xl border border-[var(--border)] p-4 rounded-2xl shadow-2xl pointer-events-auto cursor-default text-left"
              onPointerDown={(e) => e.stopPropagation()}
            >
              {/* Top Navigation: Ultra-Clean Segmented Control */}
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex-1 bg-[var(--surface-raised)] p-1 rounded-xl flex items-center justify-between border border-[var(--border)]/40 relative">
                  {[
                    {
                      id: 'briefing',
                      label: 'Briefing',
                      icon: Bell,
                      hasDot: Boolean(imminentMeeting || concludedMeeting),
                      dotColor: imminentMeeting ? 'bg-rose-500' : 'bg-emerald-400',
                    },
                    {
                      id: 'whisper',
                      label: 'Whisper',
                      icon: Search,
                    },
                    {
                      id: 'focus',
                      label: 'Focus',
                      icon: Clock,
                      hasDot: isFocusRunning,
                      dotColor: 'bg-emerald-400',
                    },
                    {
                      id: 'tasks',
                      label: `Tasks (${pendingTasks.length})`,
                      icon: CheckSquare,
                    },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id as any);
                          if (tab.id === 'whisper') {
                            setTimeout(() => searchInputRef.current?.focus(), 50);
                          }
                        }}
                        className={`relative flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer z-10 ${
                          isActive
                            ? 'text-[var(--text-primary)] shadow-sm'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeTabPill"
                            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                            className="absolute inset-0 bg-[var(--surface)] rounded-lg border border-[var(--border)]/70 shadow-xs z-[-1]"
                          />
                        )}
                        <Icon size={12} className={tab.hasDot && tab.id === 'briefing' ? 'animate-pulse text-rose-500' : ''} />
                        <span className="truncate">{tab.label}</span>
                        {tab.hasDot && (
                          <span className={`w-1.5 h-1.5 rounded-full ${tab.dotColor} shrink-0`} />
                        )}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setShowBubble(false)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer shrink-0"
                  title="Close"
                >
                  <X size={14} />
                </button>
              </div>

              {/* ─── TAB 1: BRIEFING (PRE-FLIGHT, POST-MEETING DEBRIEF, OR SCHEDULE PREVIEW) ─── */}
              {activeTab === 'briefing' && (
                <div className="flex flex-col gap-3">
                  {/* Case 1: Imminent Meeting (≤ 10m away or ongoing) */}
                  {imminentMeeting ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">
                              {imminentMeeting.isOngoing ? 'Happening Now' : `Starts in ${imminentMeeting.minutesUntilStart}m`}
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold text-[var(--text-primary)] mt-1.5 leading-snug">
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
                      <div className="bg-[var(--surface-raised)]/80 p-3 rounded-xl border border-[var(--border)]/60 flex flex-col gap-2">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--accent)]">
                          <span className="flex items-center gap-1.5">
                            <Target size={12} />
                            Pre-Flight Briefing
                          </span>
                          {relatedPriorNote && (
                            <span className="text-[10px] text-[var(--text-muted)] font-normal truncate max-w-[150px]">
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
                              <span>Review core discussion objectives & priority deliverables.</span>
                            </li>
                          )}

                          <li className="flex items-start gap-1.5 text-[11.5px] leading-relaxed">
                            <span className="text-amber-400 font-bold">•</span>
                            <span>
                              {pendingTasks.length > 0 
                                ? `${pendingTasks.length} pending action item${pendingTasks.length > 1 ? 's' : ''} ready to review.`
                                : 'All prior action items are cleared.'}
                            </span>
                          </li>
                        </ul>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border)]/60">
                        <button
                          onClick={handleSnoozeMeeting}
                          className="text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
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
                  ) : concludedMeeting ? (
                    /* Case 2: Concluded Meeting (Debrief) */
                    <div className="flex flex-col gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                          Concluded {concludedMeeting.minutesSinceEnd}m ago
                        </span>
                        <h4 className="text-sm font-semibold text-[var(--text-primary)] mt-1.5 leading-snug">
                          {concludedMeeting.event.title}
                        </h4>
                      </div>

                      <div className="bg-[var(--surface-raised)]/80 p-3 rounded-xl border border-[var(--border)]/60 flex flex-col gap-2">
                        <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                          Great session! Send a follow-up while context is fresh to keep momentum high.
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] font-mono">
                          <CheckCircle2 size={12} className="text-emerald-400" />
                          <span>Key action items organized and ready</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border)]/60">
                        <button
                          onClick={() => {
                            toggleEventCompleted(concludedMeeting.event.id);
                            setConcludedMeeting(null);
                            showToast('Marked meeting as completed on calendar', 'success');
                          }}
                          className="text-[11px] font-medium text-[var(--text-muted)] hover:text-emerald-400 hover:bg-[var(--surface-hover)] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
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
                  ) : nextUpcomingMeeting ? (
                    /* Case 3: Schedule Preview (Upcoming meeting later today) */
                    <div className="flex flex-col gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] bg-[var(--accent-dim)] px-2 py-0.5 rounded-full">
                          Upcoming Today
                        </span>
                        <h4 className="text-sm font-semibold text-[var(--text-primary)] mt-1.5 leading-snug">
                          {nextUpcomingMeeting.event.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                        <Clock size={12} className="shrink-0" />
                        <span>
                          {nextUpcomingMeeting.event.timeRange || nextUpcomingMeeting.event.startTime || 'Later today'}
                        </span>
                      </div>

                      <div className="bg-[var(--surface-raised)]/60 p-2.5 rounded-xl border border-[var(--border)]/40 flex items-center justify-between text-xs text-[var(--text-muted)]">
                        <span>Ready to prep notes early?</span>
                        <button
                          onClick={() => {
                            setShowBubble(false);
                            navigate('/tasks?view=calendar');
                          }}
                          className="text-[11px] font-semibold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          View Schedule
                          <ArrowRight size={11} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Case 4: Free Calendar - Ready for Deep Work */
                    <div className="flex flex-col items-center text-center gap-2.5 py-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <CheckCircle2 size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-[var(--text-primary)]">Schedule is Clear</h4>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">No upcoming meetings today — ideal for focused deep work.</p>
                      </div>
                      <button
                        onClick={() => {
                          setActiveTab('focus');
                          startSession(25, 'focus');
                        }}
                        className="mt-1 text-xs font-semibold bg-[var(--accent)] hover:brightness-110 text-white px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                      >
                        <Play size={11} />
                        Start 25m Focus Block
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ─── TAB 2: QUICK WHISPER SEARCH ─── */}
              {activeTab === 'whisper' && (
                <div className="flex flex-col gap-3">
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={`Ask ${currentPet.name} to find notes, decisions, or tasks...`}
                      className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl py-2 pl-8 pr-8 text-xs font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]/60 transition-all"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

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
                            className="p-2.5 rounded-xl bg-[var(--surface-raised)]/70 hover:bg-[var(--surface-raised)] border border-[var(--border)]/40 hover:border-[var(--border)] cursor-pointer transition-all flex flex-col gap-1 group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11.5px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] truncate flex items-center gap-1.5">
                                {res.type === 'task' ? <CheckSquare size={11} className="text-[var(--accent)]" /> : <FileText size={11} className="text-sky-400" />}
                                {res.title}
                              </span>
                              <ExternalLink size={11} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
                            </div>
                            <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                              {res.snippet}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="py-6 text-center text-xs text-[var(--text-muted)]">
                          No results found matching "{searchQuery}".
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 pt-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        Suggested Topics
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { label: '⚡ Urgent Tasks', query: 'urgent' },
                          { label: '📌 Key Decisions', query: 'decisions' },
                          { label: '📋 Action Items', query: 'action' },
                          { label: '🎯 Deliverables', query: 'deliverables' },
                        ].map((item) => (
                          <button
                            key={item.label}
                            onClick={() => setSearchQuery(item.query)}
                            className="text-left text-[11px] font-medium bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] border border-[var(--border)]/60 px-2.5 py-1.5 rounded-lg text-[var(--text-primary)] transition-colors cursor-pointer truncate"
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── TAB 3: FOCUS COMPANION (WITH CIRCULAR PROGRESS RING) ─── */}
              {activeTab === 'focus' && (
                <div className="flex flex-col items-center gap-3 py-1 text-center">
                  {/* Mode Selector */}
                  <div className="bg-[var(--surface-raised)] p-0.5 rounded-lg flex items-center gap-1 border border-[var(--border)]/60">
                    <button
                      onClick={() => setFocusMode('focus')}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                        focusMode === 'focus'
                          ? 'bg-[var(--surface)] text-[var(--accent)] shadow-xs'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Deep Focus
                    </button>
                    <button
                      onClick={() => setFocusMode('break')}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                        focusMode === 'break'
                          ? 'bg-[var(--surface)] text-emerald-400 shadow-xs'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Break (5m)
                    </button>
                  </div>

                  {/* Circular Timer Visual */}
                  <div className="relative flex items-center justify-center my-1">
                    <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
                      {/* Background track */}
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        className="stroke-[var(--surface-raised)] fill-none"
                        strokeWidth="6"
                      />
                      {/* Animated Progress */}
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        className={`fill-none transition-all duration-500 ${
                          focusMode === 'focus' ? 'stroke-[var(--accent)]' : 'stroke-emerald-400'
                        }`}
                        strokeWidth="6"
                        strokeDasharray={2 * Math.PI * 42}
                        strokeDashoffset={(2 * Math.PI * 42) * (1 - focusProgress / 100)}
                        strokeLinecap="round"
                      />
                    </svg>

                    <div className="absolute flex flex-col items-center">
                      <span className="text-2xl font-bold font-mono tracking-tight text-[var(--text-primary)]">
                        {formatTimerSeconds(focusTimeLeft)}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] font-medium mt-0.5">
                        {isFocusRunning ? (focusMode === 'focus' ? 'Focusing 🎧' : 'Resting ☕') : 'Ready'}
                      </span>
                    </div>
                  </div>

                  {/* Preset Buttons */}
                  {!isFocusRunning && (
                    <div className="flex items-center gap-1.5">
                      {[15, 25, 45].map((mins) => (
                        <button
                          key={mins}
                          onClick={() => startSession(mins, focusMode)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                            focusTotalDuration === mins * 60
                              ? 'bg-[var(--accent-dim)] border-[var(--accent)]/40 text-[var(--accent)]'
                              : 'bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] border-[var(--border)] text-[var(--text-primary)]'
                          }`}
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
                        className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Pause size={12} />
                        Pause
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (focusTimeLeft > 0 && focusTimeLeft < focusTotalDuration) resumeSession();
                          else startSession(25, focusMode);
                        }}
                        className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-[var(--accent)] hover:brightness-110 text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
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
                    <div className="text-[10px] text-[var(--text-muted)] font-mono">
                      Completed sessions today: {completedSessions} 🎯
                    </div>
                  )}
                </div>
              )}

              {/* ─── TAB 4: ACTION ITEMS ─── */}
              {activeTab === 'tasks' && (
                <div className="flex flex-col gap-3">
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
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setTaskIndex((prev) => (prev > 0 ? prev - 1 : pendingTasks.length - 1))}
                              className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                              title="Previous Task"
                            >
                              <ChevronLeft size={13} />
                            </button>
                            <button
                              onClick={() => setTaskIndex((prev) => (prev < pendingTasks.length - 1 ? prev + 1 : 0))}
                              className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                              title="Next Task"
                            >
                              <ChevronRight size={13} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Featured Task Card */}
                      <div className="bg-[var(--surface-raised)]/70 p-3 rounded-xl border border-[var(--border)]/50 flex flex-col gap-2">
                        <p className="text-sm text-[var(--text-primary)] leading-relaxed font-medium">
                          "{currentTask.task}"
                        </p>

                        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-1 border-t border-[var(--border)]/40">
                          <span className="truncate max-w-[190px]">
                            From: {currentTask.lectureTitle || 'Workspace Note'}
                          </span>
                          {currentTask.timestamp && (
                            <span className="font-mono text-[10px] text-[var(--accent)] bg-[var(--accent-dim)] px-1.5 py-0.5 rounded">
                              ⏱ {currentTask.timestamp}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-[var(--border)]/60">
                        <button
                          onClick={(e) => handleScheduleFocusBlock(currentTask, e)}
                          className="text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-hover)] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                          title="Block 30m Focus Time on Calendar"
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
                            className="text-[11px] font-semibold bg-[var(--accent)] hover:brightness-110 text-white px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50 shadow-sm"
                          >
                            {isMarking ? 'Done...' : 'Mark Done'}
                            <Check size={11} strokeWidth={3} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center gap-2 py-6">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <CheckCircle2 size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-[var(--text-primary)]">All Tasks Completed</h4>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">No pending action items found in your workspace.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pet Avatar Button (Clean, zero notification badges/overlays) */}
        <motion.button
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={toggleBubble}
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


