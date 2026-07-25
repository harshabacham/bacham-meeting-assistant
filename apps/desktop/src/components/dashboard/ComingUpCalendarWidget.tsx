import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCalendarStore } from '@/shared/stores/calendarStore';

function getRelativeDate(daysOffset: number) {
  const dateObj = new Date();
  dateObj.setDate(dateObj.getDate() + daysOffset);
  
  const dayNum = dateObj.getDate();
  const monthStr = dateObj.toLocaleString('en-US', { month: 'long' });
  const dayOfWeek = dateObj.toLocaleString('en-US', { weekday: 'short' });
  const dateStr = dateObj.toISOString().split('T')[0];

  return { dayNum, monthStr, dayOfWeek, dateStr };
}

export function ComingUpCalendarWidget() {
  const { events, isConnected, setSyncModalOpen, syncNow } = useCalendarStore();
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    if (isConnected) {
      syncNow().catch(console.error);
    }
  }, [isConnected, syncNow]);

  // Dynamically shift sample/default events to be relative to today
  const processedEvents = events.map((evt) => {
    if (evt.id === 'gcal_live_1' || evt.id === 'evt_1') {
      return { ...evt, ...getRelativeDate(0) }; // Today
    }
    if (evt.id === 'gcal_live_2' || evt.id === 'evt_2') {
      return { ...evt, ...getRelativeDate(1) }; // Tomorrow
    }
    if (evt.id === 'gcal_live_3' || evt.id === 'evt_3') {
      return { ...evt, ...getRelativeDate(8) }; // Next week
    }
    return evt;
  });

  // Pagination slicing (3 events per page view)
  const pageSize = 3;
  const totalPages = Math.ceil(processedEvents.length / pageSize) || 1;
  const currentEvents = processedEvents.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  const handlePrev = () => setPageIndex((prev) => Math.max(0, prev - 1));
  const handleNext = () => setPageIndex((prev) => Math.min(totalPages - 1, prev + 1));

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Widget Header matching Granola */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-medium text-foreground tracking-tight">
          Coming up
        </h2>

        {/* Pagination Controls */}
        <div className="flex items-center gap-1 text-muted-foreground">
          <button
            onClick={handlePrev}
            disabled={pageIndex === 0}
            className="p-1 rounded-lg hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Previous Range"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={handleNext}
            disabled={pageIndex >= totalPages - 1}
            className="p-1 rounded-lg hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Next Range"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Main Agenda Card matching Granola */}
      <div className="w-full bg-surface/90 backdrop-blur-xl border border-border/80 rounded-2xl p-5 shadow-sm flex flex-col divide-y divide-border/40">
        {!isConnected ? (
          <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-3">
            <p>Connect Google Calendar to sync your classes, study sessions, and exams.</p>
            <button
              onClick={() => setSyncModalOpen(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 transition-opacity active:scale-95 shadow-sm"
            >
              Connect Google Calendar
            </button>
          </div>
        ) : currentEvents.length === 0 ? (
          <div className="py-6 text-xs text-muted-foreground">
            No upcoming events today.
          </div>
        ) : (
          currentEvents.map((evt) => (
            <div key={evt.id} className="py-3.5 first:pt-1 last:pb-1 flex items-center gap-6">
              {/* Date Column */}
              <div className="flex items-baseline gap-2 shrink-0 min-w-[110px]">
                <span className="text-2xl font-mono font-bold text-foreground">
                  {evt.dayNum}
                </span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                  <span>{evt.monthStr}</span>
                  <span>{evt.dayOfWeek}</span>
                  {evt.id === 'evt_1' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block ml-0.5" />}
                </div>
              </div>

              {/* Event Content with Vertical Line */}
              <div className="flex-1 flex items-center gap-4 min-w-0">
                {/* Vertical Bar Indicator */}
                <div
                  className="w-[2px] h-8 rounded-full shrink-0"
                  style={{ backgroundColor: evt.color || '#ef4444' }}
                />

                <div className="min-w-0 flex-1 flex items-baseline justify-between gap-4">
                  <span className="text-xs text-foreground/90 truncate">
                    {evt.title}
                  </span>
                  {evt.timeRange && (
                    <span className="text-[11px] font-mono text-muted-foreground/80 shrink-0">
                      {evt.timeRange}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
