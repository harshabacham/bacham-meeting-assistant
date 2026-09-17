import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Folder, Search, Plus, Check, RefreshCw } from 'lucide-react';
import { useCalendarStore } from '@/shared/stores/calendarStore';
import { useNavigate } from 'react-router-dom';
import { TauriClient } from '@/infrastructure/tauri-client';

export function ComingUpCalendarWidget() {
  const { events, isConnected, setSyncModalOpen, syncNow, eventFolderMapping, setEventFolder } = useCalendarStore();
  const navigate = useNavigate();
  const [pageIndex, setPageIndex] = useState(0);
  const [folders, setFolders] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
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

  // Strictly use real calendar events (no synthetic mock offset shifting)
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

  const filteredFolders = folders.filter(f => !folderSearch || f.name.toLowerCase().includes(folderSearch.toLowerCase()));

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Widget Header matching Granola */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-2xl font-serif font-medium text-[var(--text-primary)] tracking-tight">
          Coming up
        </h2>

        <div className="flex items-center gap-3 text-[var(--text-muted)]">
          <button 
            onClick={() => navigate('/tasks?view=calendar')} 
            className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
          >
            View all
          </button>

          {isConnected && (
            <button
              onClick={async () => {
                if (isSyncing) return;
                setIsSyncing(true);
                try {
                  await syncNow();
                } finally {
                  setTimeout(() => setIsSyncing(false), 500);
                }
              }}
              disabled={isSyncing}
              className="p-1 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title="Sync Calendar Events"
            >
              <RefreshCw size={13} className={isSyncing ? "animate-spin text-primary" : ""} />
            </button>
          )}

          {/* Pagination Controls */}
          <div className="flex items-center gap-1">
            <button
            onClick={handlePrev}
            disabled={pageIndex === 0}
            className="p-1 rounded-lg hover:bg-[var(--surface-hover)] disabled:opacity-30 transition-colors"
            title="Previous Range"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={handleNext}
            disabled={pageIndex >= totalPages - 1}
            className="p-1 rounded-lg hover:bg-[var(--surface-hover)] disabled:opacity-30 transition-colors"
            title="Next Range"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>

    {/* Main Agenda Card matching Granola */}
      <div className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm flex flex-col divide-y divide-dashed divide-[var(--border)] relative">
        {!isConnected ? (
          <div className="py-8 text-center text-xs text-[var(--text-muted)] flex flex-col items-center gap-3">
            <p>Connect Google Calendar to sync your real meetings, study sessions, and events.</p>
            <button
              onClick={() => setSyncModalOpen(true)}
              className="px-4 py-2 bg-[var(--text-primary)] text-[var(--bg)] rounded-xl text-xs font-bold hover:opacity-90 transition-opacity active:scale-95 shadow-sm"
            >
              Connect Google Calendar
            </button>
          </div>
        ) : currentEvents.length === 0 ? (
          <div className="py-6 text-xs text-[var(--text-muted)] text-center">
            No upcoming events scheduled in your calendar.
          </div>
        ) : (
          currentEvents.map((evt, index) => (
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
              className="py-3.5 flex items-start group hover:bg-[var(--surface-hover)]/30 transition-colors cursor-pointer relative -mx-2 px-2 rounded-xl"
              onClick={() => handleOpenEventNote(evt)}
            >
              {/* Date Column (Fixed Width to guarantee divider alignment) */}
              <div className="w-[115px] shrink-0 flex items-start gap-2.5 overflow-hidden">
                <span className="text-2xl font-serif font-medium leading-[0.8] text-[var(--text-primary)] tracking-tight mt-0.5">
                  {evt.dayNum}
                </span>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-1.5 text-[12.5px] text-[var(--text-primary)] leading-none">
                    <span className="truncate">{evt.monthStr}</span>
                    {/* Add a red dot for the first item on the first page as a stand-in for 'Today' if not explicitly defined */}
                    {(evt.isToday || (index === 0 && pageIndex === 0)) && (
                      <div className="w-1 h-1 rounded-full bg-[#E5483B] shrink-0" />
                    )}
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)] leading-none mt-0.5 truncate">{evt.dayOfWeek}</span>
                </div>
              </div>

              {/* Event Content with Vertical Line */}
              <div className="flex-1 flex items-start gap-5 min-w-0 pl-1">
                <div
                  className="w-[2px] h-[28px] rounded-full shrink-0"
                  style={{ backgroundColor: evt.color || (evt.title === 'No events today' ? '#D1D5DB' : '#E5483B') }}
                />

                <div className="min-w-0 flex-1 flex flex-col justify-center mt-[-2px]">
                  <span className={`text-[13px] truncate ${evt.title === 'No events today' ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)] font-medium'}`}>
                    {evt.title || 'No events today'}
                  </span>
                  {evt.timeRange && (
                    <span className="text-[12px] text-[var(--text-muted)] mt-0.5 shrink-0">
                      {evt.timeRange}
                    </span>
                  )}
                </div>
              </div>

              {/* Add to Folder Action Pill */}
              <div className="shrink-0 relative mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenFolderEvtId(openFolderEvtId === evt.id ? null : evt.id);
                  }}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                    eventFolderMapping[evt.id]
                      ? 'bg-[var(--accent)]/10 border-[var(--accent)]/20 text-[var(--accent)] hover:border-[var(--accent)]/40'
                      : 'bg-[var(--surface-hover)] border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--border-accent)]'
                  }`}
                >
                  <span className="max-w-[100px] truncate">
                    {eventFolderMapping[evt.id] 
                      ? (folders.find(f => f.id === eventFolderMapping[evt.id])?.name || 'Folder') 
                      : 'Add to folder'}
                  </span>
                  <ChevronDown size={11} className={eventFolderMapping[evt.id] ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} />
                </button>

                {/* Folder Selector Dropdown Popover */}
                {openFolderEvtId === evt.id && (
                  <div 
                    ref={popoverRef}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-8 z-50 bg-[var(--surface-raised,var(--surface))] border border-[var(--border-accent)] rounded-2xl shadow-2xl p-2 w-64 animate-in fade-in zoom-in-95 duration-100 text-xs"
                  >
                    {/* Search Input */}
                    <div className="relative mb-2">
                      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        value={folderSearch}
                        onChange={e => setFolderSearch(e.target.value)}
                        placeholder="Search folders..."
                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl pl-7 pr-2 py-1.5 text-xs text-[var(--text-primary)] outline-none"
                      />
                    </div>

                    {/* Folder Items */}
                    <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
                      <button
                        onClick={() => { setEventFolder(evt.id, null); setOpenFolderEvtId(null); }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-[var(--surface-hover)] font-semibold text-[var(--text-primary)] text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Folder size={13} className="text-[var(--text-muted)]" />
                          <span>My notes</span>
                        </div>
                        {!eventFolderMapping[evt.id] && <Check size={13} className="text-[var(--accent)]" />}
                      </button>

                      {filteredFolders.map((f: any) => (
                        <button
                          key={f.id}
                          onClick={() => { setEventFolder(evt.id, f.id); setOpenFolderEvtId(null); }}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-[var(--surface-hover)] font-semibold text-[var(--text-primary)] text-xs truncate"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Folder size={13} className="text-[var(--accent)] shrink-0" />
                            <span className="truncate">{f.name}</span>
                          </div>
                          {eventFolderMapping[evt.id] === f.id && <Check size={13} className="text-[var(--accent)] shrink-0" />}
                        </button>
                      ))}
                    </div>

                    <div className="my-1 border-t border-[var(--border)]" />

                    <button
                      onClick={async () => {
                        const name = prompt('Folder name:');
                        if (name) {
                          const created = await TauriClient.createFolder(name);
                          setFolders(prev => [created, ...prev]);
                          setEventFolder(evt.id, created.id);
                          setOpenFolderEvtId(null);
                        }
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[var(--accent)] font-bold text-xs hover:bg-[var(--surface-hover)]"
                    >
                      <Plus size={13} /> New folder
                    </button>
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
