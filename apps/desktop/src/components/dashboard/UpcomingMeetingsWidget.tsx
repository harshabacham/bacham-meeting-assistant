import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, Video, CheckCircle2, ChevronRight, Clock, AlertCircle, Settings } from 'lucide-react';
import { useCalendarStore } from '@/shared/stores/calendarStore';
import { TauriClient } from '@/infrastructure/tauri-client';

function parseEventTime(dateStr: string, timeStr?: string): Date {
    // If the date string has no timezone, appending T00:00:00 parses it in local time
    const d = new Date(`${dateStr}T00:00:00`);
    if (!timeStr || timeStr.toLowerCase() === 'all day') {
        d.setHours(23, 59, 59); // Assume it lasts until end of day
        return d;
    }
    try {
        const [time, ampm] = timeStr.split(' ');
        let [hours, mins] = time.split(':').map(Number);
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        d.setHours(hours, mins, 0, 0);
    } catch (e) {
        // Fallback for parsing errors
    }
    return d;
}

export function UpcomingMeetingsWidget() {
    const { events, isConnected, connectGoogleCalendarOAuth, calendarEmail, syncNow, setSyncModalOpen } = useCalendarStore();
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        // Fetch new events on mount if connected
        if (isConnected) syncNow();
        
        // Update the current time every 30 seconds to recalculate "Happening Now"
        const interval = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(interval);
    }, [isConnected, syncNow]);

    const upcomingEvents = useMemo(() => {
        return events.filter(evt => {
            const endTime = parseEventTime(evt.dateStr, evt.endTime || evt.startTime);
            return endTime > now; // Keep if it hasn't ended yet
        }).slice(0, 5);
    }, [events, now]);
    
    const nextEvent = upcomingEvents[0];
    const laterEvents = upcomingEvents.slice(1);
    
    const isHappeningNow = useMemo(() => {
        if (!nextEvent) return false;
        const startTime = parseEventTime(nextEvent.dateStr, nextEvent.startTime);
        return startTime <= now;
    }, [nextEvent, now]);

    const handleRecord = () => {
        TauriClient.startNativeRecording();
    };

    if (!isConnected) {
        return (
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full bg-surface/50 backdrop-blur-xl border border-border rounded-[2rem] p-8 flex flex-col items-center justify-center text-center gap-6 h-full min-h-[400px] shadow-sm relative overflow-hidden group"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                <motion.div 
                    animate={{ y: [0, -10, 0] }} 
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-primary shadow-inner shadow-primary/20 relative z-10"
                >
                    <CalendarIcon size={36} strokeWidth={1.5} />
                </motion.div>
                <div className="relative z-10">
                    <h3 className="text-base font-bold text-foreground">Connect Calendar</h3>
                    <p className="text-sm text-muted-foreground mt-2 px-6 leading-relaxed max-w-[280px]">
                        See your upcoming meetings and jump straight into recording like magic.
                    </p>
                </div>
                <button
                    onClick={() => connectGoogleCalendarOAuth()}
                    className="relative z-10 mt-2 px-6 py-3 bg-foreground text-background font-bold text-sm rounded-xl hover:scale-105 hover:shadow-xl hover:shadow-foreground/20 transition-all active:scale-95"
                >
                    Connect Google Calendar
                </button>
            </motion.div>
        );
    }

    return (
        <div className="w-full flex flex-col gap-5 h-full">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2 text-foreground font-semibold">
                    <CalendarIcon size={16} className="text-primary" />
                    <span className="text-sm tracking-tight">Today's Schedule</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider bg-surface px-2 py-1 rounded-md border border-border">
                        {calendarEmail?.split('@')[0]}
                    </span>
                    <button 
                        onClick={() => setSyncModalOpen(true)}
                        className="p-1.5 rounded-md hover:bg-surface-hover hover:text-foreground text-muted-foreground transition-colors"
                        title="Calendar Settings"
                    >
                        <Settings size={14} />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
                <AnimatePresence>
                    {nextEvent ? (
                        <motion.div
                            key={nextEvent.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative group bg-primary/10 border border-primary/30 rounded-2xl p-4 flex flex-col gap-3 overflow-hidden shadow-[0_0_20px_rgba(var(--primary),0.1)]"
                        >
                            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                            <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/20 blur-2xl rounded-full pointer-events-none group-hover:scale-150 transition-transform duration-700" />
                            
                            <div className="flex justify-between items-start z-10">
                                <div>
                                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                        {isHappeningNow ? 'Happening Now' : 'Up Next'}
                                    </span>
                                    <h4 className="text-sm font-semibold text-foreground leading-tight max-w-[200px] truncate">
                                        {nextEvent.title}
                                    </h4>
                                    <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
                                        {isHappeningNow ? <AlertCircle size={10} className="text-primary" /> : <Clock size={10} />} 
                                        {nextEvent.timeRange || 'All Day'}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 mt-2 z-10">
                                {nextEvent.meetingUrl ? (
                                    <a 
                                        href={nextEvent.meetingUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="py-2.5 bg-surface-hover/80 hover:bg-surface-hover text-foreground text-[11px] font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-border/50"
                                    >
                                        <Video size={12} />
                                        Join Link
                                    </a>
                                ) : (
                                    <div className="py-2.5 bg-surface-hover/30 text-muted-foreground/50 text-[11px] font-semibold rounded-xl flex items-center justify-center gap-1.5 border border-border/30 cursor-not-allowed">
                                        <Video size={12} />
                                        No Link
                                    </div>
                                )}
                                
                                <button
                                    onClick={handleRecord}
                                    className="py-2.5 bg-primary text-primary-foreground text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 hover:shadow-[0_0_15px_rgba(var(--primary),0.4)] hover:scale-[1.02] transition-all active:scale-95"
                                >
                                    Record
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="py-8 text-center bg-surface border border-dashed border-border/60 rounded-2xl">
                            <CheckCircle2 size={24} className="text-muted-foreground/30 mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground">No upcoming meetings today.</p>
                        </div>
                    )}

                    {laterEvents.map((evt, idx) => (
                        <motion.div
                            key={evt.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * (idx + 1) }}
                            className="bg-surface/60 border border-border/60 rounded-xl p-3.5 flex items-center gap-3 hover:bg-surface hover:border-border transition-colors group cursor-pointer"
                        >
                            <div className="w-10 text-center shrink-0">
                                <p className="text-[10px] font-bold text-muted-foreground">{evt.startTime?.split(' ')[0]}</p>
                                <p className="text-[9px] text-muted-foreground/60 uppercase">{evt.startTime?.split(' ')[1]}</p>
                            </div>
                            
                            <div className="w-[2px] h-8 bg-border group-hover:bg-primary/50 transition-colors rounded-full" />
                            
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate">{evt.title}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{evt.dayOfWeek}, {evt.monthStr} {evt.dayNum}</p>
                            </div>

                            <ChevronRight size={14} className="text-muted-foreground/30 group-hover:text-foreground/50 transition-colors" />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
            
            {events.length > 0 && (
                <button 
                    onClick={() => setSyncModalOpen(true)}
                    className="w-full py-2 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest hover:text-foreground transition-colors mt-2"
                >
                    Calendar Settings
                </button>
            )}
        </div>
    );
}
