import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import { Lecture } from '@/shared/types';

interface LectureHoverCardProps {
  lecture: Lecture;
  children: React.ReactNode;
}

export function LectureHoverCard({ lecture, children }: LectureHoverCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  let timeoutId: NodeJS.Timeout;

  const handleMouseEnter = () => {
    timeoutId = setTimeout(() => setIsHovered(true), 350);
  };

  const handleMouseLeave = () => {
    clearTimeout(timeoutId);
    setIsHovered(false);
  };

  const mins = Math.round((lecture.durationMs ?? 0) / 60000);

  return (
    <div className="relative inline-block" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
      {isHovered && (
        <div className="absolute left-0 top-full mt-2 z-40 w-64 p-3 bg-surface border border-border/80 rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
          <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground mb-1.5">
            <span className="truncate max-w-[140px] text-foreground font-bold">{lecture.title || 'Untitled'}</span>
            {mins > 0 && <span className="flex items-center gap-1"><Clock size={10} />{mins}m</span>}
          </div>
          {lecture.course && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono inline-block mb-2">
              {lecture.course}
            </span>
          )}
          <p className="text-[11px] text-muted-foreground/80 line-clamp-3 leading-snug">
            {lecture.courseLabel || 'Recorded lecture content ready for analysis & flashcard generation.'}
          </p>
        </div>
      )}
    </div>
  );
}
