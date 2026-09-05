import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Sparkles, CheckCircle2, ChevronRight, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePetStore, PET_DEFINITIONS } from '@/shared/stores/petStore';
import { PetAvatar } from '@/components/pets/PetAvatars';
import { useLectureStore } from '@/shared/stores/lectureStore';
import { TauriClient } from '@/infrastructure/tauri-client';
import { useNavigate } from 'react-router-dom';

interface PendingTask {
  id: string;
  noteId: string;
  noteTitle: string;
  text: string;
  originalLine: string;
}

const PetCompanionWidget = ({ pendingTasks, isThinking }: { pendingTasks: PendingTask[], isThinking?: boolean }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [activeTask, setActiveTask] = useState<PendingTask | null>(null);
  
  const { selectedPetId, petSize, isTuckedAway, hidePet } = usePetStore();
  const currentPet = PET_DEFINITIONS.find(p => p.id === selectedPetId) || PET_DEFINITIONS[0];
  const navigate = useNavigate();

  const [isMarking, setIsMarking] = useState(false);
  const bubbleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  
  // Need access to store to update it locally and trigger refetch
  const { lectures, fetchLectures } = useLectureStore();

  const dragConstraintsRef = useRef(null);

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
    if (pendingTasks.length > 0) {
      // Pick the most recent task (since tasks are now sorted by recency)
      setActiveTask(pendingTasks[0]);
    } else {
      setActiveTask(null);
    }
    
    setShowBubble(true);
    
    // Auto-hide after 5s if all caught up, 10s if active task
    if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
    bubbleTimeoutRef.current = setTimeout(() => {
      setShowBubble(false);
    }, pendingTasks.length > 0 ? 10000 : 5000);
  };

  const handleMarkAsDone = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!activeTask || isMarking) return;
      setIsMarking(true);
      
      try {
          const note = lectures.find(l => l.id === activeTask.noteId) as any;
          if (note) {
              // We need to replace `- [ ] taskText` with `- [x] taskText`
              let newContent = note.content || '';
              if (newContent.includes(activeTask.originalLine)) {
                  newContent = newContent.replace(
                      activeTask.originalLine,
                      activeTask.originalLine.replace(/\[\s\]/, '[x]')
                  );
              }

              // Also try updating summary just in case the task was found there
              let newSummary = note.summary || '';
              if (newSummary.includes(activeTask.originalLine)) {
                  newSummary = newSummary.replace(
                      activeTask.originalLine,
                      activeTask.originalLine.replace(/\[\s\]/, '[x]')
                  );
              }

              // Update backend. TauriClient.updateNotes takes (id, content) for meeting notes.
              await TauriClient.updateNotes(note.id, newContent);
              
              // We will just fetch lectures again to update the store and the tasks queue
              await fetchLectures();
              
              // Hide the bubble immediately for a snappy feel
              setShowBubble(false);
              if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
          }
      } catch (err) {
          console.error("Failed to mark task as done", err);
      } finally {
          setIsMarking(false);
      }
  };

  const handlePetClick = () => {
    if (showBubble) {
        setShowBubble(false);
        if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
    } else {
        triggerBubble();
    }
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
      <AnimatePresence>
        {showBubble && (
          <motion.div
            ref={bubbleRef}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="absolute bottom-full mb-3 right-2 w-[340px] bg-[var(--surface)] border border-[var(--border)] p-5 rounded-2xl shadow-xl pointer-events-auto cursor-default relative"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowBubble(false);
                if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
              }}
              className="absolute top-3 right-3 p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
              title="Close"
            >
              <X size={14} />
            </button>

            {activeTask ? (
                <div className="flex flex-col gap-3 pr-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)]">
                            <Sparkles size={13} />
                            <span>Pending Action Item</span>
                        </div>
                    </div>
                    <p className="text-sm text-[var(--text-primary)] leading-relaxed font-medium">
                        "{activeTask.text}"
                    </p>
                    <div className="flex items-center justify-between mt-3 gap-2">
                        <span className="text-[11px] text-[var(--text-muted)] truncate max-w-[120px]">
                            From: {activeTask.noteTitle}
                        </span>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => {
                                    setShowBubble(false);
                                    navigate(`/note/${activeTask.noteId}`);
                                }}
                                className="text-[11px] font-semibold bg-[var(--surface-hover)] hover:bg-[var(--surface-raised)] border border-[var(--border)] px-2.5 py-1.5 rounded-lg text-[var(--text-primary)] transition-all cursor-pointer flex items-center gap-1"
                            >
                                Open
                                <ChevronRight size={11} />
                            </button>
                            <button 
                                onClick={handleMarkAsDone}
                                disabled={isMarking}
                                className="text-[11px] font-semibold bg-[var(--accent)] hover:brightness-110 text-white px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                            >
                                {isMarking ? 'Marking...' : 'Mark Done'}
                                <Check size={11} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-3 pr-6">
                    <div className="w-9 h-9 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-emerald-400 shrink-0">
                        <CheckCircle2 size={18} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">All caught up!</p>
                        <p className="text-xs text-[var(--text-muted)]">No pending action items found in your notes.</p>
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
        whileHover={{ y: -6, scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        aria-label={`Open ${currentPet.name} Reminder`}
      >
        <div className="relative flex items-center justify-center w-full h-full">
          <PetAvatar id={selectedPetId} size={petSize} isHovered={isHovered} isThinking={isThinking} />
        </div>

        {/* Small tooltip hint when not showing the big bubble */}
        <AnimatePresence>
          {isHovered && !showBubble && (
            <motion.div
              initial={{ opacity: 0, x: 10, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 5, scale: 0.95 }}
              className="absolute right-[calc(100%+12px)] bg-[var(--surface-raised)]/95 backdrop-blur-xl border border-[var(--border)]/60 px-3.5 py-2 rounded-2xl whitespace-nowrap text-xs font-semibold tracking-wide text-[var(--text-primary)] shadow-2xl pointer-events-none flex items-center gap-2"
            >
              <Sparkles size={13} style={{ color: currentPet.color }} />
              <span>{pendingTasks.length > 0 ? `${pendingTasks.length} pending tasks` : `Hi from ${currentPet.name}!`}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
      </motion.div>
    </div>
  );
};

export const GlobalAskAI: React.FC = () => {
  const { lectures, fetchLectures } = useLectureStore();

  useEffect(() => {
    // Ensure we have lectures loaded so the pet has something to parse
    if (lectures.length === 0) {
      fetchLectures();
    }
  }, []);

  const pendingTasks = useMemo(() => {
    const tasks: PendingTask[] = [];
    // Matches markdown checkboxes that are empty: - [ ] or * [ ]
    const checkboxRegex = /([-*]\s*\[\s\]\s+(.*))/g;

    // Sort lectures by recency (updatedAt descending)
    const sortedLectures = [...lectures].sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
    });

    sortedLectures.forEach((note: any) => {
        let match;
        // Search in content
        if (note.content) {
            while ((match = checkboxRegex.exec(note.content)) !== null) {
                tasks.push({
                    id: Math.random().toString(36).substr(2, 9),
                    noteId: note.id,
                    noteTitle: note.title || 'Untitled Note',
                    text: match[2].trim(),
                    originalLine: match[1]
                });
            }
        }
        // Search in summary
        if (note.summary) {
            while ((match = checkboxRegex.exec(note.summary)) !== null) {
                tasks.push({
                    id: Math.random().toString(36).substr(2, 9),
                    noteId: note.id,
                    noteTitle: note.title || 'Untitled Note',
                    text: match[2].trim(),
                    originalLine: match[1]
                });
            }
        }
    });
    return tasks;
  }, [lectures]);

  return <PetCompanionWidget pendingTasks={pendingTasks} />;
};
