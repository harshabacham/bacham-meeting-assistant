import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, ArrowUpRight } from 'lucide-react';
import { useCalendarStore } from '@/shared/stores/calendarStore';
import { useNavigate } from 'react-router-dom';
import { TauriClient } from '@/infrastructure/tauri-client';

export function ComingUpCalendarWidget() {
  const { events, isConnected, setSyncModalOpen, syncNow, eventFolderMapping } = useCalendarStore();
  const navigate = useNavigate();
  const [pageIndex, setPageIndex] = useState(0);
  const [folders, setFolders] = useState<any[]>([]);

  useEffect(() => {
    if (isConnected) {
      syncNow().catch(console.error);
    }
    TauriClient.listFolders()
      .then(res => setFolders(res || []))
      .catch(console.error);
  }, [isConnected, syncNow]);

  const pageSize = 3;
  const totalPages = Math.ceil(events.length / pageSize) || 1;
  const currentEvents = events.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  const handlePrev = () => setPageIndex((prev) => Math.max(0, prev - 1));
  const handleNext = () => setPageIndex((prev) => Math.min(totalPages - 1, prev + 1));

  const handleOpenEventNote = (evt: any) => {
    const title = evt.title || 'Meeting Note';
    const time = evt.timeRange || evt.startTime || '12:00 PM';
    const date = evt.dayOfWeek || evt.monthStr || 'Today';
    const folderId = eventFolderMapping[evt.id] || '';
    navigate(`/notes?eventTitle=${encodeURIComponent(title)}&eventTime=${encodeURIComponent(time)}&eventDate=${encodeURIComponent(date)}&folderId=${encodeURIComponent(folderId)}`);
  };

  if (!isConnected) {
    return (
      <div className="w-full flex items-center justify-between p-3.5 px-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-muted)] transition-all">
        <div className="flex items-center gap-2.5">
          <Calendar size={14} className="text-[var(--accent)]" />
          <span className="text-[var(--text-secondary)] font-medium">Connect Google Calendar to sync upcoming meetings & prepare notes</span>
        </div>
        <button
          onClick={() => setSyncModalOpen(true)}
          className="text-xs font-semibold text-[var(--accent)] hover:underline cursor-pointer flex items-center gap-1"
        >
          <span>Connect</span>
          <ArrowUpRight size={12} />
        </button>
      </div>
    );
  }

  if (events.length === 0) {
    return null; // Clean: If connected and no events today, don't waste vertical space!
  }

  return (
    <div className="w-full flex flex-col gap-2.5">
      {/* Widget Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            Today's Schedule
          </span>
          <span className="text-[10px] font-mono text-[var(--text-muted)] px-1.5 py-0.2 rounded bg-[var(--surface-raised)] border border-[var(--border)]">
            {events.length}
          </span>
        </div>

        {events.length > pageSize && (
          <div className="flex items-center gap-1 text-[var(--text-muted)]">
            <button
              onClick={handlePrev}
              disabled={pageIndex === 0}
              className="p-1 rounded hover:bg-[var(--surface-hover)] disabled:opacity-30 transition-colors cursor-pointer"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              onClick={handleNext}
              disabled={pageIndex >= totalPages - 1}
              className="p-1 rounded hover:bg-[var(--surface-hover)] disabled:opacity-30 transition-colors cursor-pointer"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Events Grid/List */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {currentEvents.map((evt) => {
          const folder = folders.find(f => f.id === eventFolderMapping[evt.id]);
          return (
            <div 
              key={evt.id}
              onClick={() => handleOpenEventNote(evt)}
              className="group p-3 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] hover:border-[var(--border-accent)] transition-all cursor-pointer flex flex-col justify-between min-h-[90px] shadow-xs relative"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[11px] font-mono font-medium text-[var(--accent)] tabular-nums">
                    {evt.timeRange || evt.startTime || 'Today'}
                  </span>
                  <div className="w-4 h-4 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-opacity">
                    <ArrowUpRight size={12} />
                  </div>
                </div>

                <p className="text-xs font-semibold text-[var(--text-primary)] truncate leading-snug">
                  {evt.title || 'Meeting'}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-[var(--border)]/50 text-[10px]">
                <span className="text-[var(--text-muted)] truncate">
                  {folder ? folder.name : 'Take notes'}
                </span>
                <span className="text-[var(--accent)] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Open →
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

