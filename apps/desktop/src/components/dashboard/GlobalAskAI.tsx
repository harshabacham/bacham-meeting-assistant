import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  CheckCircle2, Check, X, 
  Calendar, Clock, Video, CalendarPlus, FileText, Search,
  Play, Pause, RotateCcw, Copy, CheckSquare, ExternalLink, ArrowRight
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'agenda' | 'tasks' | 'focus'>('agenda');
  const [isMarking, setIsMarking] = useState(false);
  const [copiedDraft, setCopiedDraft] = useState(false);

  // Whisper query state
  const [whisperQuery, setWhisperQuery] = useState('');
  const whisperInputRef = useRef<HTMLInputElement>(null);

  const { selectedPetId, petSize, isTuckedAway, hidePet } = usePetStore();
  const currentPet = PET_DEFINITIONS.find(p => p.id === selectedPetId) || PET_DEFINITIONS[0];
  const navigate = useNavigate();
  const { showToast } = useToast();

  const cardRef = useRef<HTMLDivElement>(null);
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
    setMode: setFocusMode
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

  // Find next upcoming meeting on calendar (if none imminent)
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

  // Find prior related note for pre-meeting briefing
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

  // Whisper Search Query Results
  const whisperResults = useMemo<SearchResultItem[]>(() => {
    const query = whisperQuery.trim().toLowerCase();
    if (!query) return [];

    const results: SearchResultItem[] = [];

    tasks.forEach(t => {
      if (t.task.toLowerCase().includes(query) || (t.lectureTitle && t.lectureTitle.toLowerCase().includes(query))) {
        results.push({
          id: t.id,
          type: 'task',
          title: t.task,
          snippet: `Action item from "${t.lectureTitle || 'Workspace'}"`,
          lectureId: t.lectureId,
        });
      }
    });

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

  // Position persistence
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

  // Close on outside click
  useEffect(() => {
    if (!isExpanded) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  const toggleExpanded = () => {
    if (!isExpanded) {
      if (imminentMeeting || concludedMeeting || nextUpcomingMeeting) {
        setActiveTab('agenda');
      } else if (pendingTasks.length > 0) {
        setActiveTab('tasks');
      } else if (isFocusRunning) {
        setActiveTab('focus');
      }
    }
    setIsExpanded(prev => !prev);
  };

  const handleMarkAsDone = async (task: GlobalActionItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMarking) return;
    setIsMarking(true);
    try {
      await toggleTaskStatus(task);
      showToast('Action item completed!', 'success');
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
      : '- [ ] Finalize notes and deliverables from meeting\n- [ ] Follow up on agreed timeline';

    const draft = `Subject: Follow-up & Next Steps: ${event.title}

Hi everyone,

Thank you for our meeting "${event.title}". Here is a concise summary and next steps:

Key Takeaways:
- Discussed priority milestones and action items.
- Confirmed alignment on deliverables.

Action Items:
${actionItemsList}

Please let me know if anything needs adjustment.

Best regards,`;

    await navigator.clipboard.writeText(draft);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
    showToast('Follow-up email copied to clipboard!', 'success');
  };

  const formatTimerSeconds = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (isTuckedAway || hidePet) return null;

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
        {/* ─── AMBIENT EXECUTIVE CAPSULE (DOCKS BESIDE PET AVATAR) ─── */}
        <motion.button
          onClick={toggleExpanded}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="mr-3 mb-1.5 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] text-xs font-medium text-[var(--text-primary)] shadow-lg hover:border-[var(--border-accent)] hover:bg-[var(--surface-hover)] transition-all cursor-pointer group"
          title={`Click to open ${currentPet.name} Companion`}
        >
          {isFocusRunning ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-xs text-[var(--text-primary)] font-semibold">
                {formatTimerSeconds(focusTimeLeft)}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                Focusing
              </span>
            </>
          ) : imminentMeeting ? (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="text-xs font-semibold text-amber-400 truncate max-w-[150px]">
                {imminentMeeting.event.title}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] font-mono">
                {imminentMeeting.isOngoing ? 'Now' : `in ${imminentMeeting.minutesUntilStart}m`}
              </span>
              {imminentMeeting.event.meetingUrl && (
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleJoinMeeting(imminentMeeting.event.meetingUrl);
                  }}
                  className="px-2 py-0.5 rounded-md bg-emerald-500 text-zinc-950 font-bold text-[10px] hover:bg-emerald-400 transition-colors flex items-center gap-1"
                >
                  <Video size={10} />
                  Join
                </span>
              )}
            </>
          ) : concludedMeeting ? (
            <>
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span className="text-xs text-[var(--text-primary)] truncate max-w-[140px]">
                Debrief ready
              </span>
            </>
          ) : pendingTasks.length > 0 ? (
            <>
              <span 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: currentPet.color }}
              />
              <span className="text-xs text-[var(--text-primary)]">
                {pendingTasks.length} {pendingTasks.length === 1 ? 'task' : 'tasks'} due
              </span>
            </>
          ) : (
            <>
              <span 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: currentPet.color }}
              />
              <span className="text-xs text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
                {currentPet.name} Assistant
              </span>
            </>
          )}
        </motion.button>

        {/* ─── EXPANDED EXECUTIVE COMMAND CARD (NO TOY SPEECH TAIL, CLEAN RAYCAST STYLE) ─── */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              ref={cardRef}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 460, damping: 32 }}
              className="absolute bottom-full mb-3 right-0 w-[380px] max-w-[92vw] bg-[var(--surface-raised)] border border-[var(--border)] p-4 rounded-2xl shadow-2xl pointer-events-auto cursor-default text-left select-none"
              onPointerDown={(e) => e.stopPropagation()}
            >
              {/* Header: Persona Identity & Controls */}
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <PetAvatar 
                      id={selectedPetId} 
                      size={28} 
                      isHovered={false} 
                      isThinking={isFocusRunning} 
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-semibold text-[var(--text-primary)] leading-none">
                        {currentPet.name}
                      </h3>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] bg-[var(--surface)] px-1.5 py-0.5 rounded border border-[var(--border)]">
                        Copilot
                      </span>
                    </div>
                    <p className="text-[10.5px] text-[var(--text-muted)] mt-0.5 truncate max-w-[200px]">
                      {currentPet.description}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                  title="Close Assistant"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Navigation Segmented Bar (Agenda, Tasks, Focus) */}
              <div className="grid grid-cols-3 gap-1 bg-[var(--surface)] p-1 rounded-xl my-3 border border-[var(--border)]">
                <button
                  onClick={() => {
                    setActiveTab('agenda');
                    setWhisperQuery('');
                  }}
                  className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'agenda' && !whisperQuery
                      ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-xs border border-[var(--border)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Calendar size={12} className={imminentMeeting ? 'text-amber-400' : ''} />
                  <span>Agenda</span>
                  {imminentMeeting && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  )}
                </button>

                <button
                  onClick={() => {
                    setActiveTab('tasks');
                    setWhisperQuery('');
                  }}
                  className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'tasks' && !whisperQuery
                      ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-xs border border-[var(--border)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <CheckSquare size={12} />
                  <span>Tasks</span>
                  {pendingTasks.length > 0 && (
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">
                      ({pendingTasks.length})
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    setActiveTab('focus');
                    setWhisperQuery('');
                  }}
                  className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'focus' && !whisperQuery
                      ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-xs border border-[var(--border)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Clock size={12} className={isFocusRunning ? 'text-emerald-400' : ''} />
                  <span>Focus</span>
                  {isFocusRunning && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </button>
              </div>

              {/* ─── TAB 1: AGENDA (MEETING BRIEFING & PRE-FLIGHT) ─── */}
              {!whisperQuery && activeTab === 'agenda' && (
                <div className="flex flex-col gap-3 min-h-[160px]">
                  {imminentMeeting ? (
                    /* Imminent Meeting Hero Card */
                    <div className="flex flex-col gap-2.5 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                          {imminentMeeting.isOngoing ? 'Happening Now' : `Starts in ${imminentMeeting.minutesUntilStart}m`}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                          <Clock size={11} />
                          {imminentMeeting.event.timeRange || imminentMeeting.event.startTime}
                        </span>
                      </div>

                      <h4 className="text-xs font-semibold text-[var(--text-primary)] leading-snug">
                        {imminentMeeting.event.title}
                      </h4>

                      {relatedPriorNote && (
                        <div className="p-2 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] text-[11px] text-[var(--text-muted)] leading-relaxed">
                          <span className="font-semibold text-[var(--text-primary)]">Prior Note: </span>
                          <span className="line-clamp-2">
                            {((relatedPriorNote as any)?.summary || relatedPriorNote?.description || 'Review meeting topics').slice(0, 110)}...
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-[var(--border)]">
                        <button
                          onClick={handleSnoozeMeeting}
                          className="text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2 py-1 rounded-lg transition-colors cursor-pointer"
                        >
                          Snooze 5m
                        </button>

                        <div className="flex items-center gap-1.5">
                          {relatedPriorNote && (
                            <button
                              onClick={() => {
                                setIsExpanded(false);
                                navigate(`/lectures/${relatedPriorNote.id}`);
                              }}
                              className="text-[11px] font-medium bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] border border-[var(--border)] px-2.5 py-1.5 rounded-lg text-[var(--text-primary)] transition-all cursor-pointer flex items-center gap-1"
                            >
                              <FileText size={11} />
                              Note
                            </button>
                          )}

                          {imminentMeeting.event.meetingUrl ? (
                            <button
                              onClick={() => handleJoinMeeting(imminentMeeting.event.meetingUrl)}
                              className="text-[11px] font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                            >
                              <Video size={11} />
                              Join Now
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setIsExpanded(false);
                                navigate('/tasks?view=calendar');
                              }}
                              className="text-[11px] font-bold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-zinc-950 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                            >
                              <Calendar size={11} />
                              Calendar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : concludedMeeting ? (
                    /* Concluded Meeting Follow-up Card */
                    <div className="flex flex-col gap-2.5 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                          Concluded {concludedMeeting.minutesSinceEnd}m ago
                        </span>
                      </div>

                      <p className="text-xs font-medium text-[var(--text-primary)]">
                        "{concludedMeeting.event.title}" wrapped up. Send a quick follow-up while context is fresh.
                      </p>

                      <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-[var(--border)]">
                        <button
                          onClick={() => {
                            toggleEventCompleted(concludedMeeting.event.id);
                            setConcludedMeeting(null);
                            showToast('Meeting marked as done', 'success');
                          }}
                          className="text-[11px] font-medium text-[var(--text-muted)] hover:text-emerald-400 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                        >
                          Mark Done
                        </button>

                        <button
                          onClick={() => handleCopyFollowupDraft(concludedMeeting.event)}
                          className="text-[11px] font-bold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-zinc-950 px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                        >
                          {copiedDraft ? <Check size={11} /> : <Copy size={11} />}
                          {copiedDraft ? 'Copied!' : 'Copy Follow-up Draft'}
                        </button>
                      </div>
                    </div>
                  ) : nextUpcomingMeeting ? (
                    /* Next Upcoming Meeting Preview */
                    <div className="flex flex-col gap-2.5 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                          Next on Calendar Today
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)] font-mono">
                          {nextUpcomingMeeting.event.timeRange || nextUpcomingMeeting.event.startTime}
                        </span>
                      </div>

                      <h4 className="text-xs font-semibold text-[var(--text-primary)]">
                        {nextUpcomingMeeting.event.title}
                      </h4>

                      <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]">
                        <span className="text-[11px] text-[var(--text-muted)]">
                          Ready to prepare meeting notes?
                        </span>
                        <button
                          onClick={() => {
                            setIsExpanded(false);
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
                    /* All Caught Up */
                    <div className="flex flex-col items-center justify-center text-center py-6 gap-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <CheckCircle2 size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-[var(--text-primary)]">Schedule is Clear</h4>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">No more meetings scheduled for today.</p>
                      </div>
                      <button
                        onClick={() => {
                          setActiveTab('focus');
                          startSession(25, 'focus');
                        }}
                        className="mt-1 text-xs font-bold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-zinc-950 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                      >
                        <Play size={11} />
                        Start 25m Focus Block
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ─── TAB 2: TASKS & CALENDAR TIME-BLOCKING ─── */}
              {!whisperQuery && activeTab === 'tasks' && (
                <div className="flex flex-col gap-2 min-h-[160px] max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                  {pendingTasks.length > 0 ? (
                    pendingTasks.slice(0, 3).map((t) => (
                      <div
                        key={t.id}
                        className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex flex-col gap-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-medium text-[var(--text-primary)] leading-snug line-clamp-2">
                            "{t.task}"
                          </span>
                          {t.priority === 'urgent' ? (
                            <span className="text-[9px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 rounded uppercase shrink-0">
                              Urgent
                            </span>
                          ) : (
                            <span className="text-[9px] font-medium text-[var(--text-muted)] bg-[var(--surface-raised)] px-1.5 py-0.2 rounded shrink-0">
                              Task
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border)] text-[10.5px]">
                          <span className="text-[var(--text-muted)] truncate max-w-[140px]">
                            {t.lectureTitle || 'Workspace Note'}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => handleScheduleFocusBlock(t, e)}
                              className="px-2 py-1 rounded text-[10.5px] font-semibold bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] transition-colors flex items-center gap-1 cursor-pointer"
                              title="Block 30m Time on Calendar"
                            >
                              <CalendarPlus size={10} className="text-[var(--accent)]" />
                              30m Block
                            </button>

                            <button
                              onClick={(e) => handleMarkAsDone(t, e)}
                              disabled={isMarking}
                              className="px-2 py-1 rounded text-[10.5px] font-bold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-zinc-950 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title="Mark as completed"
                            >
                              <Check size={10} strokeWidth={3} />
                              Done
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-[var(--text-muted)] flex flex-col items-center gap-1.5">
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      <span>All action items cleared!</span>
                    </div>
                  )}

                  {pendingTasks.length > 3 && (
                    <button
                      onClick={() => {
                        setIsExpanded(false);
                        navigate('/tasks');
                      }}
                      className="text-center text-[11px] font-semibold text-[var(--accent)] hover:underline py-1"
                    >
                      View all {pendingTasks.length} tasks in Action Items →
                    </button>
                  )}
                </div>
              )}

              {/* ─── TAB 3: FOCUS MODE ─── */}
              {!whisperQuery && activeTab === 'focus' && (
                <div className="flex flex-col items-center gap-2 py-2 text-center min-h-[160px]">
                  <div className="flex items-center gap-1 bg-[var(--surface)] p-0.5 rounded-lg border border-[var(--border)]">
                    <button
                      onClick={() => setFocusMode('focus')}
                      className={`px-3 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                        focusMode === 'focus'
                          ? 'bg-[var(--surface-raised)] text-[var(--accent)] shadow-xs'
                          : 'text-[var(--text-muted)]'
                      }`}
                    >
                      Deep Focus
                    </button>
                    <button
                      onClick={() => setFocusMode('break')}
                      className={`px-3 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                        focusMode === 'break'
                          ? 'bg-[var(--surface-raised)] text-emerald-400 shadow-xs'
                          : 'text-[var(--text-muted)]'
                      }`}
                    >
                      Break (5m)
                    </button>
                  </div>

                  <span className="text-3xl font-bold font-mono tracking-tight text-[var(--text-primary)] my-1">
                    {formatTimerSeconds(focusTimeLeft)}
                  </span>

                  <div className="flex items-center gap-2 pt-1">
                    {isFocusRunning ? (
                      <button
                        onClick={pauseSession}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Pause size={11} />
                        Pause
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (focusTimeLeft > 0 && focusTimeLeft < focusTotalDuration) resumeSession();
                          else startSession(25, focusMode);
                        }}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-zinc-950 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                      >
                        <Play size={11} />
                        {focusTimeLeft > 0 && focusTimeLeft < focusTotalDuration ? 'Resume' : 'Start 25m Focus'}
                      </button>
                    )}

                    <button
                      onClick={resetSession}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                      title="Reset Session"
                    >
                      <RotateCcw size={12} />
                    </button>
                  </div>
                </div>
              )}

              {/* ─── SEARCH / WHISPER RESULTS VIEW ─── */}
              {whisperQuery && (
                <div className="flex flex-col gap-2 min-h-[160px] max-h-[220px] overflow-y-auto custom-scrollbar pr-1 mb-2">
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <span>Search results for "{whisperQuery}"</span>
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
                            setIsExpanded(false);
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
              )}

              {/* ─── BOTTOM INTEGRATED COMMAND / WHISPER BAR ─── */}
              <div className="pt-2.5 border-t border-[var(--border)] relative">
                <div className="relative flex items-center">
                  <Search size={12} className="absolute left-2.5 text-[var(--text-muted)] pointer-events-none" />
                  <input
                    ref={whisperInputRef}
                    type="text"
                    value={whisperQuery}
                    onChange={(e) => setWhisperQuery(e.target.value)}
                    placeholder={`Ask ${currentPet.name} anything about meetings, notes, or tasks...`}
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl py-1.5 pl-7 pr-7 text-[11px] font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-all"
                  />
                  {whisperQuery && (
                    <button
                      onClick={() => setWhisperQuery('')}
                      className="absolute right-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── PET AVATAR BUTTON ─── */}
        <motion.button
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={toggleExpanded}
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
        </motion.button>
      </motion.div>
    </div>
  );
};

export const GlobalAskAI: React.FC = () => {
  return <PetCompanionWidget />;
};



