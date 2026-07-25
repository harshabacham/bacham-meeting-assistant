import { useState } from "react";
import { Bookmark, Clock, Plus } from 'lucide-react';
import { TimelineEvent, TauriClient } from '@/infrastructure/tauri-client';
import { useLectureSyncStore } from '@/shared/stores/lectureSyncStore';
import { Button } from '@/components/ui/button';

interface BookmarksTabProps {
  lectureId: string;
  timelineEvents: TimelineEvent[];
  onJumpToTime: (ms: number) => void;
  onRefresh: () => void;
}

export function BookmarksTab({ lectureId, timelineEvents, onJumpToTime, onRefresh }: BookmarksTabProps) {
  const bookmarks = timelineEvents.filter(e => e.eventType === 'bookmark').sort((a, b) => a.timestampMs - b.timestampMs);
  const { currentTimeMs } = useLectureSyncStore();
  const [newBookmarkLabel, setNewBookmarkLabel] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleAddBookmark = async () => {
    if (!newBookmarkLabel.trim()) return;
    setIsAdding(true);
    try {
      await TauriClient.addBookmark(lectureId, currentTimeMs, newBookmarkLabel.trim());
      setNewBookmarkLabel('');
      onRefresh(); // Refresh timeline events
    } catch (err) {
      console.error("Failed to add bookmark", err);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full p-2 sm:p-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Bookmark size={18} className="text-[var(--accent)]" />
          Bookmarks
        </h3>
      </div>
      
      {/* Add Bookmark form */}
      <div className="bg-surface/30 rounded-2xl border border-border/50 p-4 mb-6 flex gap-3 items-center">
        <div className="font-mono text-xs text-[var(--accent)] bg-[var(--glass-bg)] px-2 py-1 rounded">
          {formatTime(currentTimeMs)}
        </div>
        <input 
          type="text" 
          value={newBookmarkLabel}
          onChange={e => setNewBookmarkLabel(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleAddBookmark();
          }}
          placeholder="Add a bookmark at current time..."
          className="flex-1 bg-transparent border-none focus:outline-none text-sm text-foreground placeholder:text-muted-foreground"
        />
        <Button 
          size="sm" 
          onClick={handleAddBookmark} 
          disabled={!newBookmarkLabel.trim() || isAdding}
          className="rounded-full bg-[var(--accent)] text-background hover:bg-[var(--accent)]/90"
        >
          <Plus size={16} className="mr-1" /> Add
        </Button>
      </div>

      {bookmarks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-4 text-muted-foreground bg-surface/10 rounded-2xl border border-border/20">
          <Bookmark className="h-8 w-8 opacity-30" />
          <p className="text-sm">No bookmarks yet. Add one to remember this exact moment.</p>
        </div>
      ) : (
        <div className="space-y-3 flex-1 overflow-y-auto pr-2 no-scrollbar">
          {bookmarks.map((b) => (
            <div 
              key={b.id} 
              className="group bg-surface/30 hover:bg-surface border border-border/50 hover:border-[var(--border-accent)] rounded-xl p-4 flex items-center gap-4 transition-all duration-300 cursor-pointer"
              onClick={() => onJumpToTime(b.timestampMs)}
            >
              <div className="bg-[var(--glass-bg)] text-[var(--accent)] font-mono text-xs px-2.5 py-1 rounded-md shrink-0">
                {formatTime(b.timestampMs)}
              </div>
              <div className="flex-1 text-sm text-foreground font-medium">
                {b.label}
              </div>
              <Clock size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
