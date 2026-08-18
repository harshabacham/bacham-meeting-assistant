import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Search, Check, Calendar, ArrowUpRight } from 'lucide-react';
import { useCalendarStore } from '@/shared/stores/calendarStore';
import { useNavigate } from 'react-router-dom';
import { TauriClient } from '@/infrastructure/tauri-client';

export function ComingUpCalendarWidget() {
  const { events, isConnected, setSyncModalOpen, syncNow, eventFolderMapping, setEventFolder } = useCalendarStore();
  const navigate = useNavigate();
  const [pageIndex, setPageIndex] = useState(0);
  const [folders, setFolders] = useState<any[]>([]);
  // Folder selector popover state
  const [openFolderEvtId, setOpenFolderEvtId] = useState<string | null>(null);
  const [folderSearch, setFolderSearch] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isConnected) {
      syncNow().catch(console.error);
    }
    TauriClient.listFolders()
      .then(res => setFolders(res || []))
      .catch(console.error);
  }, [isConnected, syncNow]);

  useEffect(() => {
    if (!openFolderEvtId) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpenFolderEvtId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openFolderEvtId]);

  const pageSize = 3;
  const totalPages = Math.ceil(events.length / pageSize) || 1;
  const currentEvents = events.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  const handlePrev = () => setPageIndex((prev) => Math.max(0, prev - 1));
  const handleNext = () => setPageIndex((prev) => Math.min(totalPages - 1, prev + 1));

  const handleOpenEventNote = (evt: any) => {
    const title = evt.title || 'Meeting Note';
    const time = evt.timeRange || evt.startTime || '12:00 PM';
    const date = evt.dayOfWeek || evt.monthStr || 'Today';
    navigate(`/notes?eventTitle=${encodeURIComponent(title)}&eventTime=${encodeURIComponent(time)}&eventDate=${encodeURIComponent(date)}`);
  };

  const filteredFolders = folders.filter(f => !folderSearch || f.name.toLowerCase().includes(folderSearch.toLowerCase()));

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Widget Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-serif font-medium text-[var(--text-primary)] tracking-tight">
            Coming up
          </h2>
          <span className="text-[11px] font-mono text-[var(--text-muted)] px-2 py-0.5 rounded-full bg-[var(--surface-raised)] border border-[var(--border)]">
            {events.length} upcoming
          </span>
        </div>

        {/* Action / Pagination Controls */}
        <div className="flex items-center gap-2">
          {!isConnected && (
            <button
              onClick={() => setSyncModalOpen(true)}
              className="text-[11px] font-medium text-[var(--accent)] hover:underline flex items-center gap-1 transition-opacity"
            >
              <Calendar size={12} />
              <span>Connect Calendar</span>
            </button>
          )}

          {events.length > pageSize && (
            <div className="flex items-center gap-1 text-[var(--text-muted)] border border-[var(--border)] rounded-lg p-0.5 bg-[var(--surface)]">
              <button
                onClick={handlePrev}
                disabled={pageIndex === 0}
                className="p-1 rounded hover:bg-[var(--surface-hover)] disabled:opacity-30 transition-colors"
                title="Previous Range"
              >
                <ChevronLeft size={13} />
              </button>
              <button
                onClick={handleNext}
                disabled={pageIndex >= totalPages - 1}
                className="p-1 rounded hover:bg-[var(--surface-hover)] disabled:opacity-30 transition-colors"
                title="Next Range"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Agenda Card — Ultra-Clean 1px Hairline Surface (No Muddy Shadows) */}
      <div className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden flex flex-col divide-y divide-[var(--border)]">
        {!isConnected ? (
          <div className="py-7 px-6 text-center text-xs text-[var(--text-muted)] flex flex-col sm:flex-row items-center justify-between gap-4 bg-[var(--surface)]">
            <div className="flex items-center gap-3 text-left">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent-dim)] border border-[var(--border-accent)] flex items-center justify-center text-[var(--accent)] shrink-0">
                <Calendar size={15} />
              </div>
              <div>
                <p className="font-semibold text-[var(--text-primary)]">Sync with Google Calendar</p>
                <p className="text-[11px] text-[var(--text-muted)]">Automatically load meetings and prepare real-time AI notes.</p>
              </div>
            </div>
            <button
              onClick={() => setSyncModalOpen(true)}
              className="px-3.5 py-1.5 bg-[var(--text-primary)] text-[var(--bg)] rounded-lg text-xs font-semibold hover:opacity-90 transition-all shrink-0 cursor-pointer"
            >
              Connect Calendar
            </button>
          </div>
        ) : currentEvents.length === 0 ? (
          <div className="py-6 px-4 text-xs text-[var(--text-muted)] text-center">
            No upcoming events scheduled in your calendar today.
          </div>
        ) : (
          currentEvents.map((evt) => (
            <div 
              key={evt.id} 
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData('application/x-calendar-event', JSON.stringify({
                  id: evt.id,
                  title: evt.title || 'Meeting Note',
                  timeRange: evt.timeRange || evt.startTime || '12:00 PM',
                  dateStr: evt.dateStr || evt.dayOfWeek || evt.monthStr || 'Today'
                }));
                e.dataTransfer.effectAllowed = 'copyMove';
              }}
              className="py-3 px-4 flex items-center gap-5 group hover:bg-[var(--surface-hover)] transition-colors cursor-pointer relative"
              onClick={() => handleOpenEventNote(evt)}
            >
              {/* Date Column */}
              <div className="flex items-baseline gap-2 shrink-0 min-w-[100px]">
                <span className="text-xl font-mono font-bold text-[var(--text-primary)] tabular-nums">
                  {evt.dayNum}
                </span>
                <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] font-medium">
                  <span>{evt.monthStr}</span>
                  <span>{evt.dayOfWeek}</span>
                </div>
              </div>

              {/* Event Content with Line Indicator */}
              <div className="flex-1 flex items-center gap-3.5 min-w-0">
                <div
                  className="w-[2px] h-7 rounded-full shrink-0"
                  style={{ backgroundColor: evt.color || '#3b82f6' }}
                />

                <div className="min-w-0 flex-1 flex items-center justify-between gap-4">
                  <span className="text-[13px] text-[var(--text-primary)] font-medium truncate group-hover:text-[var(--accent)] transition-colors">
                    {evt.title}
                  </span>
                  {evt.timeRange && (
                    <span className="text-[11px] font-mono text-[var(--text-muted)] shrink-0 tabular-nums">
                      {evt.timeRange}
                    </span>
                  )}
                </div>
              </div>

              {/* Add to Folder Action Pill */}
              <div className="shrink-0 relative flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenFolderEvtId(openFolderEvtId === evt.id ? null : evt.id);
                  }}
                  className={`px-2.5 py-1 rounded-md border text-[11px] font-medium transition-colors flex items-center gap-1 ${
                    eventFolderMapping[evt.id]
                      ? 'bg-[var(--accent-dim)] border-[var(--border-accent)] text-[var(--accent)]'
                      : 'bg-transparent border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)]/30'
                  }`}
                >
                  <span className="max-w-[90px] truncate">
                    {eventFolderMapping[evt.id] 
                      ? (folders.find(f => f.id === eventFolderMapping[evt.id])?.name || 'Folder') 
                      : 'Add folder'}
                  </span>
                  <ChevronDown size={10} className={eventFolderMapping[evt.id] ? 'text-[var(--accent)]' : 'opacity-60'} />
                </button>

                <div className="w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-opacity">
                  <ArrowUpRight size={13} />
                </div>

                {/* Folder Selector Dropdown Popover */}
                {openFolderEvtId === evt.id && (
                  <div 
                    ref={popoverRef}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-8 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg p-2 w-60 animate-in fade-in zoom-in-95 duration-100 text-xs"
                  >
                    {/* Search Input */}
                    <div className="relative mb-2">
                      <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        value={folderSearch}
                        onChange={e => setFolderSearch(e.target.value)}
                        placeholder="Search folders..."
                        autoFocus
                        className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg pl-6 pr-2 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                      />
                    </div>

                    {/* Folder Items List */}
                    <div className="max-h-40 overflow-y-auto space-y-0.5 custom-scrollbar">
                      {eventFolderMapping[evt.id] && (
                        <button
                          onClick={() => {
                            setEventFolder(evt.id, '');
                            setOpenFolderEvtId(null);
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 flex items-center justify-between text-[11px]"
                        >
                          <span>Remove from folder</span>
                        </button>
                      )}
                      
                      {filteredFolders.map(f => {
                        const isSelected = eventFolderMapping[evt.id] === f.id;
                        return (
                          <button
                            key={f.id}
                            onClick={() => {
                              setEventFolder(evt.id, f.id);
                              setOpenFolderEvtId(null);
                            }}
                            className={`w-full text-left px-2 py-1.5 rounded-md flex items-center justify-between text-[11px] transition-colors ${
                              isSelected 
                                ? 'bg-[var(--accent-dim)] text-[var(--accent)] font-semibold' 
                                : 'text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                            }`}
                          >
                            <span className="truncate">{f.name}</span>
                            {isSelected && <Check size={11} className="text-[var(--accent)]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
