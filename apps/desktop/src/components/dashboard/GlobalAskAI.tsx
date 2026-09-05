import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Sparkles, CheckCircle2, ChevronRight, ChevronLeft, Check, X, 
  Calendar, Clock, Video, CalendarPlus, Bell, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePetStore, PET_DEFINITIONS } from '@/shared/stores/petStore';
import { PetAvatar } from '@/components/pets/PetAvatars';
import { useCalendarStore, findImminentMeeting, CalendarEvent } from '@/shared/stores/calendarStore';
import { useGlobalTasks, GlobalActionItem } from '@/shared/hooks/useGlobalTasks';
import { useToast } from '@/components/ui/ToastProvider';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useNavigate } from 'react-router-dom';

export const PetCompanionWidget: React.FC<{ isThinking?: boolean }> = ({ isThinking }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [activeTab, setActiveTab] = useState<'meeting' | 'tasks'>('tasks');
  const [taskIndex, setTaskIndex] = useState(0);
  const [isMarking, setIsMarking] = useState(false);

  const { selectedPetId, petSize, isTuckedAway, hidePet } = usePetStore();
  const currentPet = PET_DEFINITIONS.find(p => p.id === selectedPetId) || PET_DEFINITIONS[0];
  const navigate = useNavigate();
  const { showToast } = useToast();

  const bubbleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const dragConstraintsRef = useRef(null);

  const { events, addEvent } = useCalendarStore();
  const { tasks, toggleTaskStatus } = useGlobalTasks();

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

  const [imminentMeeting, setImminentMeeting] = useState<{
    event: CalendarEvent;
    minutesUntilStart: number;
    isOngoing: boolean;
  } | null>(null);

  const [snoozedMeetingId, setSnoozedMeetingId] = useState<string | null>(null);
  const [snoozeUntil, setSnoozeUntil] = useState<number | null>(null);

  useEffect(() => {
    const checkMeeting = () => {
      const imminent = findImminentMeeting(events, 10);
      if (imminent) {
        if (snoozedMeetingId === imminent.event.id && snoozeUntil && Date.now() < snoozeUntil) {
          setImminentMeeting(null);
          return;
        }
        setImminentMeeting(imminent);
      } else {
        setImminentMeeting(null);
      }
    };

    checkMeeting();
    const interval = setInterval(checkMeeting, 20000);
    return () => clearInterval(interval);
  }, [events, snoozedMeetingId, snoozeUntil]);

  useEffect(() => {
    if (taskIndex >= pendingTasks.length && pendingTasks.length > 0) {
      setTaskIndex(pendingTasks.length - 1);
    }
  }, [pendingTasks.length, taskIndex]);

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
    if (imminentMeeting) {
      setActiveTab('meeting');
    } else {
      setActiveTab('tasks');
    }
    setShowBubble(true);

    if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
    const duration = imminentMeeting ? 15000 : (pendingTasks.length > 0 ? 12000 : 5000);
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
        <AnimatePresence>
          {showBubble && (
            <motion.div
              ref={bubbleRef}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className="absolute bottom-full mb-3 right-2 w-[350px] bg-[var(--surface)] border border-[var(--border)] p-4 rounded-2xl shadow-xl pointer-events-auto cursor-default relative text-left"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3 border-b border-[var(--border)]/60 pb-2">
                <div className="flex items-center gap-1">
                  {imminentMeeting && (
                    <button
                      onClick={() => setActiveTab('meeting')}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        activeTab === 'meeting'
                          ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Bell size={12} className="animate-pulse" />
                      Meeting Alert
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTab('tasks')}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      activeTab === 'tasks'
                        ? 'bg-[var(--surface-raised)] text-[var(--accent)] border border-[var(--border)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Sparkles size={12} />
                    Actions ({pendingTasks.length})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowBubble(false);
                    if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
                  }}
                  className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                  title="Close"
                >
                  <X size={14} />
                </button>
              </div>

              {activeTab === 'meeting' && imminentMeeting ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">
                        {imminentMeeting.isOngoing ? 'Happening Now' : `Starts in ${imminentMeeting.minutesUntilStart}m`}
                      </span>
                      <h4 className="text-sm font-semibold text-[var(--text-primary)] mt-1 line-clamp-1">
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

                  {imminentMeeting.event.description && (
                    <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed bg-[var(--surface-raised)]/60 p-2 rounded-lg border border-[var(--border)]/40">
                      {imminentMeeting.event.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border)]/60">
                    <button
                      onClick={handleSnoozeMeeting}
                      className="text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      Snooze 5m
                    </button>

                    <div className="flex items-center gap-1.5">
                      {imminentMeeting.event.lectureId && (
                        <button
                          onClick={() => {
                            setShowBubble(false);
                            navigate(`/lectures/${imminentMeeting.event.lectureId}`);
                          }}
                          className="text-[11px] font-semibold bg-[var(--surface-hover)] hover:bg-[var(--surface-raised)] border border-[var(--border)] px-2.5 py-1.5 rounded-lg text-[var(--text-primary)] transition-all cursor-pointer flex items-center gap-1"
                        >
                          <FileText size={11} />
                          Note
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
                          Open Calendar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {activeTab === 'tasks' && currentTask ? (
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
              ) : null}

              {activeTab === 'tasks' && pendingTasks.length === 0 && !imminentMeeting && (
                <div className="flex items-center gap-3 py-2 pr-6">
                  <div className="w-9 h-9 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-emerald-400 shrink-0">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">All caught up!</p>
                    <p className="text-xs text-[var(--text-muted)]">No pending action items or imminent meetings.</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

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
          aria-label={`Open ${currentPet.name} Reminder`}
        >
          <div className="relative flex items-center justify-center w-full h-full">
            <PetAvatar id={selectedPetId} size={petSize} isHovered={isHovered} isThinking={isThinking} />
          </div>

          {imminentMeeting && (
            <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white shadow-md">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <Bell size={9} className="relative z-10" />
            </div>
          )}

          {!imminentMeeting && pendingTasks.length > 0 && (
            <div className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-[var(--accent)] text-white text-[9px] font-bold shadow-md">
              {pendingTasks.length > 9 ? '9+' : pendingTasks.length}
            </div>
          )}

          <AnimatePresence>
            {isHovered && !showBubble && (
              <motion.div
                initial={{ opacity: 0, x: 10, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 5, scale: 0.95 }}
                className="absolute right-[calc(100%+12px)] bg-[var(--surface-raised)]/95 backdrop-blur-xl border border-[var(--border)]/60 px-3 py-1.5 rounded-xl whitespace-nowrap text-xs font-semibold tracking-wide text-[var(--text-primary)] shadow-xl pointer-events-none flex items-center gap-2"
              >
                {imminentMeeting ? (
                  <>
                    <Bell size={12} className="text-rose-500 animate-pulse" />
                    <span>Meeting starts soon: {imminentMeeting.event.title}</span>
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
