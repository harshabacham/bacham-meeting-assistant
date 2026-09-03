import React, { useMemo, useState, useEffect, useRef } from 'react';
import { CalendarEvent, useCalendarStore } from '@/shared/stores/calendarStore';
import { ChevronLeft, ChevronRight, Plus, Search, CheckSquare, ChevronDown } from 'lucide-react';
import { EventModal } from './EventModal';
import { useToast } from '@/components/ui/ToastProvider';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

// Helper to parse "10:30 AM" into hours (e.g. 10.5)
function parseTimeToHours(timeStr?: string): number {
  if (!timeStr) return 0;
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let h = parseInt(match[1]);
  const m = parseInt(match[2]);
  const ampm = match[3].toUpperCase();
  
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  
  return h + m / 60;
}

const truncate = (str: string, length: number) => {
  return str.length > length ? str.substring(0, length) + '...' : str;
};

const colorPalette = [
  { bg: 'bg-purple-500/20 hover:bg-purple-500/30', text: 'text-purple-700 dark:text-purple-300' },
  { bg: 'bg-emerald-500/20 hover:bg-emerald-500/30', text: 'text-emerald-700 dark:text-emerald-300' },
  { bg: 'bg-rose-500/20 hover:bg-rose-500/30', text: 'text-rose-700 dark:text-rose-300' },
  { bg: 'bg-amber-500/20 hover:bg-amber-500/30', text: 'text-amber-700 dark:text-amber-300' },
  { bg: 'bg-sky-500/20 hover:bg-sky-500/30', text: 'text-sky-700 dark:text-sky-300' },
  { bg: 'bg-indigo-500/20 hover:bg-indigo-500/30', text: 'text-indigo-700 dark:text-indigo-300' },
];

const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export function FullCalendarView() {
  const { events, editEvent, syncNow, autoSyncEnabled } = useCalendarStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);
  
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();

  // Real-Time Sync on window focus
  useEffect(() => {
    const handleFocus = () => {
      if (autoSyncEnabled) {
        syncNow().catch(console.error);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [autoSyncEnabled, syncNow]);

  // Drag and Drop Logic
  const handleDropEvent = async (eventId: string, newDateStr: string) => {
    const evt = events.find(e => e.id === eventId);
    if (evt && evt.dateStr !== newDateStr) {
      // Optimistically update
      await editEvent(eventId, { dateStr: newDateStr });
      showToast('Event rescheduled', 'success');
    }
  };

  // Navigation Logic
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Group events by day string "YYYY-MM-DD"
  const eventsByDay = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    events.forEach(evt => {
      const evtDate = new Date(evt.dateStr);
      const dStr = evtDate.toLocaleDateString('en-CA');
      if (!grouped[dStr]) grouped[dStr] = [];
      grouped[dStr].push(evt);
    });
    return grouped;
  }, [events]);

  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const shortMonthName = currentDate.toLocaleString('default', { month: 'short' });
  const yearStr = currentDate.getFullYear();
  const todayDate = currentDate.getDate();

  // Title formatting based on viewMode
  let titleSubtitle = '';
  let titleBadge = '';

  if (viewMode === 'month') {
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    titleSubtitle = `${firstDay.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })} – ${lastDay.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    titleBadge = 'Month View';
  } else if (viewMode === 'week') {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    titleSubtitle = `${startOfWeek.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })} – ${endOfWeek.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    titleBadge = `Week ${Math.ceil(currentDate.getDate() / 7)}`;
  } else {
    titleSubtitle = currentDate.toLocaleString('default', { weekday: 'long' });
    titleBadge = 'Day View';
  }

  return (
    <div className="flex flex-col h-full bg-black/40 text-[var(--text-primary)] font-sans rounded-2xl overflow-hidden shadow-2xl relative border border-white/5 backdrop-blur-xl">
      
      {/* Universal Header */}
      <div className="flex items-center justify-between py-4 px-6 border-b border-white/10 bg-white/5 backdrop-blur-md shrink-0 z-20 relative shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center justify-center bg-black/40 border border-white/5 rounded-xl w-14 h-14 shadow-inner">
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">{shortMonthName}</span>
            <span className="text-xl font-extrabold text-[var(--accent)] drop-shadow-md">{todayDate}</span>
          </div>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-white/90">
              {monthName} {yearStr}
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-white/10 text-white/60 bg-black/20 uppercase tracking-wider">
                {titleBadge}
              </span>
            </h2>
            <p className="text-sm text-white/50">{titleSubtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 relative">
          <button 
            onClick={() => showToast('Search functionality coming soon!', 'info')}
            className="text-white/50 hover:text-white/90 transition-colors p-2"
          >
            <Search size={18} />
          </button>
          
          {/* Segmented Control - View Mode */}
          <div className="flex items-center bg-black/40 rounded-lg p-1 border border-white/5 shadow-inner">
            {['month', 'week', 'day'].map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m as any)}
                className={`px-4 py-1.5 rounded-md text-[11px] uppercase tracking-wider font-bold transition-all ${viewMode === m ? 'bg-white/20 text-white shadow-sm' : 'text-white/40 hover:text-white/80'}`}
              >
                {m}
              </button>
            ))}
          </div>
          
          {/* Segmented Control - Date Nav */}
          <div className="flex items-center bg-black/40 rounded-lg p-1 border border-white/5 shadow-inner">
            <button onClick={handlePrev} className="p-1.5 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={handleToday} className="px-3 py-1.5 rounded-md text-[11px] uppercase tracking-wider font-bold hover:bg-white/10 transition-colors text-white/80 hover:text-white">
              Today
            </button>
            <button onClick={handleNext} className="p-1.5 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
          
          <button 
            onClick={() => navigate('/tasks')}
            className="flex items-center gap-2 bg-black/40 rounded-lg border border-white/5 shadow-inner h-9 px-3 text-[11px] uppercase tracking-wider font-bold text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <CheckSquare size={14} />
          </button>

          <button 
            onClick={() => { setEventToEdit(null); setIsEventModalOpen(true); }}
            className="flex items-center gap-1.5 px-4 h-9 rounded-lg bg-gradient-to-b from-[var(--accent)] to-[var(--accent-dark)] hover:brightness-110 shadow-[0_0_15px_var(--accent-alpha)] text-black text-[12px] font-bold transition-all"
          >
            <Plus size={16} strokeWidth={3} /> Add event
          </button>
        </div>
      </div>

      {/* View Content */}
      <div className="flex-1 overflow-hidden relative">
        {viewMode === 'month' && (
          <MonthView 
            currentDate={currentDate} 
            eventsByDay={eventsByDay} 
            onEditEvent={(e: any) => { setEventToEdit(e); setIsEventModalOpen(true); }}
            onAddEvent={(dateStr: string) => { setEventToEdit({ dateStr, startTime: '12:00 PM' } as any); setIsEventModalOpen(true); }}
            onDropEvent={handleDropEvent}
          />
        )}
        {viewMode === 'week' && (
          <TimelineView 
            mode="week"
            currentDate={currentDate} 
            eventsByDay={eventsByDay}
            onEditEvent={(e) => { setEventToEdit(e); setIsEventModalOpen(true); }}
            onAddEvent={(dateStr, timeStr) => { setEventToEdit({ dateStr, startTime: timeStr } as any); setIsEventModalOpen(true); }}
          />
        )}
        {viewMode === 'day' && (
          <TimelineView 
            mode="day"
            currentDate={currentDate} 
            eventsByDay={eventsByDay}
            onEditEvent={(e) => { setEventToEdit(e); setIsEventModalOpen(true); }}
            onAddEvent={(dateStr, timeStr) => { setEventToEdit({ dateStr, startTime: timeStr } as any); setIsEventModalOpen(true); }}
            onSelectDate={(d) => setCurrentDate(d)}
          />
        )}
      </div>
      
      <EventModal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} eventToEdit={eventToEdit} />
    </div>
  );
}

// -----------------------------------------------------------------------------
// MONTH VIEW
// -----------------------------------------------------------------------------
function MonthView({ currentDate, eventsByDay, onEditEvent, onAddEvent, onDropEvent }: any) {
  const gridDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay(); 
    
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();
    
    const totalCells = startOffset + totalDays > 35 ? 42 : 35;
    
    return Array.from({ length: totalCells }, (_, i) => {
      const dayOffset = i - startOffset;
      const d = new Date(year, month, 1 + dayOffset);
      return {
        date: d,
        isCurrentMonth: d.getMonth() === month,
        isToday: d.toLocaleDateString() === new Date().toLocaleDateString(),
        dateStr: d.toLocaleDateString('en-CA'),
      };
    });
  }, [currentDate]);

  return (
    <div className="flex flex-col h-full bg-black/20">
      <div className="grid grid-cols-7 border-b border-white/10 bg-black/20 backdrop-blur-md shrink-0 relative z-10">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center py-3 text-[12px] uppercase tracking-wider font-bold text-[var(--text-secondary)] border-r border-white/5 last:border-r-0">
            {day}
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-7 min-h-full auto-rows-fr">
          {gridDays.map((cell, i) => {
            const dayEvents = eventsByDay[cell.dateStr] || [];
            return (
              <div 
                key={i} 
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const eventId = e.dataTransfer.getData('text/plain');
                  if (eventId && onDropEvent) {
                    onDropEvent(eventId, cell.dateStr);
                  }
                }}
                className={`min-h-[140px] p-2 border-r border-b border-white/5 flex flex-col gap-1.5 transition-colors relative group ${
                  !cell.isCurrentMonth ? 'bg-gradient-to-br from-black/40 to-black/10 opacity-50' : 'bg-transparent hover:bg-white/5 cursor-pointer'
                }`}
                onClick={() => cell.isCurrentMonth && onAddEvent(cell.dateStr)}
              >
                <div className="flex justify-end mb-1">
                  <div className={`w-7 h-7 flex items-center justify-center rounded-full text-[13px] font-bold ${
                    cell.isToday 
                      ? 'bg-[var(--accent)] text-black shadow-lg shadow-[var(--accent)]/30' 
                      : !cell.isCurrentMonth 
                        ? 'text-white/30 font-medium' 
                        : 'text-white/80'
                  }`}>
                    {cell.date.getDate()}
                  </div>
                </div>
                <div className="flex flex-col gap-1 overflow-hidden">
                  {dayEvents.slice(0, 4).map((evt: any, idx: number) => {
                    const colorIndex = (evt.id.charCodeAt(0) + idx) % colorPalette.length;
                    const style = colorPalette[colorIndex];
                    const customRgba = evt.color ? hexToRgba(evt.color, 0.15) : null;
                    return (
                      <motion.div 
                        key={evt.id}
                        layoutId={evt.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.02, y: -2 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', evt.id);
                          e.stopPropagation();
                        }}
                        onClick={(e) => { e.stopPropagation(); onEditEvent(evt); }}
                        className={`px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold leading-tight flex items-center justify-between cursor-pointer border border-white/10 shadow-sm ${!customRgba ? style.bg : ''} ${!customRgba ? style.text : ''}`}
                        style={customRgba ? { backgroundColor: customRgba, color: evt.color } : {}}
                      >
                        <span className="truncate flex-1 pr-2">{evt.title}</span>
                        {evt.startTime && <span className="opacity-80 shrink-0 text-[10px] font-medium tracking-wide">{evt.startTime}</span>}
                      </motion.div>
                    );
                  })}
                  {dayEvents.length > 4 && (
                    <div className="text-[11px] font-medium text-[var(--text-muted)] pl-1 mt-0.5">
                      {dayEvents.length - 4} more...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// TIMELINE VIEW (Week and Day)
// -----------------------------------------------------------------------------
function TimelineView({ mode, currentDate, eventsByDay, onEditEvent, onAddEvent, onSelectDate }: any) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(new Date());

  // Scroll to 8 AM on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 8 * 60 - 20;
    }
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const days = useMemo(() => {
    if (mode === 'day') {
      return [currentDate];
    } else {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        return d;
      });
    }
  }, [currentDate, mode]);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="flex h-full w-full bg-black/20">
      {/* Main Timeline Area */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        
        {/* Day Headers */}
        <div className="flex border-b border-white/10 bg-black/20 backdrop-blur-md shrink-0 sticky top-0 z-20 shadow-sm">
          <div className="w-16 shrink-0 border-r border-white/5" />
          {days.map((day, i) => {
            const isToday = day.toLocaleDateString() === new Date().toLocaleDateString();
            return (
              <div key={i} className={`flex-1 min-w-[100px] border-r border-white/5 last:border-r-0 py-4 flex flex-col items-center justify-center`}>
                <span className={`text-[11px] uppercase tracking-wider font-bold ${isToday ? 'text-[var(--accent)]' : 'text-white/50'}`}>
                  {day.toLocaleString('default', { weekday: 'short' })}
                </span>
                <span className={`text-[22px] font-extrabold mt-1.5 w-10 h-10 flex items-center justify-center rounded-full transition-all ${isToday ? 'bg-[var(--accent)] text-black shadow-lg shadow-[var(--accent)]/30' : 'text-white/80 hover:bg-white/10 cursor-pointer'}`} onClick={() => onSelectDate(day)}>
                  {day.getDate()}
                </span>
              </div>
            );
          })}
        </div>

        {/* Scrollable Timeline */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative" ref={scrollRef}>
          
          <div className="flex relative" style={{ height: `${24 * 60}px` }}>
            {/* Time Labels */}
            <div className="w-16 shrink-0 border-r border-white/5 bg-transparent relative z-10">
              {hours.map((hour) => (
                <div 
                  key={hour} 
                  className="absolute w-full text-right pr-3 text-[10px] font-bold tracking-wider text-white/30 uppercase" 
                  style={{ top: `${hour * 60}px`, transform: 'translateY(-50%)' }}
                >
                  {hour === 0 ? '' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                </div>
              ))}
            </div>

            {/* Grid Columns */}
            {days.map((day, i) => {
              const dStr = day.toLocaleDateString('en-CA');
              const dayEvents = eventsByDay[dStr] || [];
              const isToday = day.toLocaleDateString() === now.toLocaleDateString();

              return (
                <div key={i} className="flex-1 min-w-[100px] border-r border-white/5 last:border-r-0 relative group">
                  {/* Grid Lines */}
                  {hours.map(hour => (
                    <div 
                      key={hour} 
                      className="absolute w-full border-t border-white/5" 
                      style={{ top: `${hour * 60}px` }} 
                    />
                  ))}
                  
                  {/* Clickable slot area */}
                  {hours.map(hour => (
                    <div 
                      key={`slot-${hour}`}
                      className="absolute w-full opacity-0 hover:opacity-100 hover:bg-white/5 transition-colors cursor-pointer"
                      style={{ top: `${hour * 60}px`, height: '60px', zIndex: 5 }}
                      onClick={() => onAddEvent(dStr, `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`)}
                    />
                  ))}

                  {/* Current Time Indicator */}
                  {isToday && (
                    <div 
                      className="absolute left-0 w-full z-20 pointer-events-none"
                      style={{ top: `${(now.getHours() * 60) + now.getMinutes()}px` }}
                    >
                      <div className="relative border-t-[2px] border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                        <div className="absolute left-[-4px] top-[-5px] w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                      </div>
                    </div>
                  )}

                  {/* Render Events */}
                  {dayEvents.map((evt: any, idx: number) => {
                    const startH = parseTimeToHours(evt.startTime);
                    let endH = parseTimeToHours(evt.endTime) || (startH + 1);
                    if (endH <= startH) endH = startH + 1;

                    const colorIndex = (evt.id.charCodeAt(0) + idx) % colorPalette.length;
                    const style = colorPalette[colorIndex];
                    const customRgba = evt.color ? hexToRgba(evt.color, 0.25) : null;

                    return (
                      <motion.div
                        key={evt.id}
                        layoutId={`timeline-${evt.id}`}
                        onClick={(e) => { e.stopPropagation(); onEditEvent(evt); }}
                        whileHover={{ scale: 1.02, zIndex: 30 }}
                        className={`absolute left-1.5 right-2.5 rounded-lg p-2.5 overflow-hidden cursor-pointer shadow-sm transition-shadow hover:shadow-lg hover:brightness-110 border border-white/10 ${!customRgba ? style.bg : ''} ${!customRgba ? style.text : ''}`}
                        style={{
                          top: `${startH * 60}px`,
                          height: `${(endH - startH) * 60}px`,
                          zIndex: 10,
                          ...(customRgba ? { backgroundColor: customRgba, color: evt.color } : {})
                        }}
                      >
                        <div className="text-[11.5px] font-bold leading-tight truncate">{evt.title}</div>
                        <div className="text-[10px] font-medium leading-tight opacity-80 mt-1 truncate">{evt.startTime} {evt.endTime && `- ${evt.endTime}`}</div>
                      </motion.div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Day View Sidebar */}
      {mode === 'day' && (
        <div className="w-[300px] shrink-0 border-l border-[var(--border)] bg-[var(--surface)] flex flex-col hidden lg:flex">
          {/* Mini Calendar */}
          <div className="p-6 border-b border-[var(--border)]">
             <div className="flex items-center justify-between mb-4">
               <button onClick={() => onSelectDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><ChevronLeft size={16}/></button>
               <span className="text-sm font-bold">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
               <button onClick={() => onSelectDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><ChevronRight size={16}/></button>
             </div>
             
             <div className="grid grid-cols-7 gap-y-2 text-center mb-2">
                {['S','M','T','W','T','F','S'].map((d, i) => (
                  <div key={i} className="text-[10px] font-bold text-[var(--text-muted)]">{d}</div>
                ))}
                {/* Simplified mini grid generation */}
                {Array.from({length: 42}, (_, i) => {
                   const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1 - new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() + i);
                   const isTargetMonth = d.getMonth() === currentDate.getMonth();
                   const isSelected = d.toDateString() === currentDate.toDateString();
                   return (
                     <div 
                       key={i} 
                       onClick={() => onSelectDate(d)}
                       className={`text-xs py-1.5 rounded-full font-medium cursor-pointer transition-colors ${
                         isSelected ? 'bg-[var(--accent)] text-[var(--bg)] shadow-sm' : 
                         !isTargetMonth ? 'text-[var(--text-muted)] opacity-50' : 'text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                       }`}
                     >
                       {d.getDate()}
                     </div>
                   );
                })}
             </div>
          </div>

          {/* Event Context (Mocking right sidebar detail panel) */}
          <div className="flex-1 p-6 overflow-y-auto">
             <h4 className="text-sm font-bold text-[var(--text-secondary)] mb-4 uppercase tracking-wider">Schedule</h4>
             
             {eventsByDay[currentDate.toLocaleDateString('en-CA')]?.length > 0 ? (
               <div className="flex flex-col gap-4">
                 {eventsByDay[currentDate.toLocaleDateString('en-CA')].map((evt: any, i: number) => {
                   const style = colorPalette[i % colorPalette.length];
                   return (
                     <div key={evt.id} className={`p-4 rounded-xl border ${style.bg} ${style.border}`}>
                       <h3 className={`font-bold text-[14px] mb-2 ${style.text}`}>{evt.title}</h3>
                       <p className={`text-[12px] font-medium opacity-80 ${style.text}`}>{currentDate.toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                       <p className={`text-[12px] font-medium opacity-80 ${style.text}`}>{evt.startTime} {evt.endTime ? `- ${evt.endTime}` : ''}</p>
                     </div>
                   );
                 })}
               </div>
             ) : (
               <p className="text-[13px] text-[var(--text-muted)] text-center mt-10">No events scheduled for this day.</p>
             )}
          </div>
        </div>
      )}
    </div>
  );
}
