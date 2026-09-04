import React from 'react';
import { CalendarCheck, Calendar, ArrowRight } from 'lucide-react';
import { useCalendarStore } from '@/shared/stores/calendarStore';

export const PreMeetingBriefWidget: React.FC = () => {
  const { isConnected, events, setSyncModalOpen } = useCalendarStore();

  // Find next upcoming uncompleted event
  const upcomingMeeting = React.useMemo(() => {
    if (!events || events.length === 0) return null;
    return events.find(e => !e.isCompleted) || null;
  }, [events]);

  if (!isConnected) {
    return (
      <div className="bg-surface border border-border/50 rounded-2xl p-5 w-full flex flex-col items-center justify-center text-center gap-3 py-6">
        <div className="w-10 h-10 bg-primary/10 text-primary border border-primary/20 rounded-xl flex items-center justify-center">
          <Calendar size={18} />
        </div>
        <div>
          <h3 className="text-xs font-semibold text-foreground">Sync Your Calendar</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[220px] mx-auto">
            Connect Google Calendar to see upcoming meetings and auto-attach notes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSyncModalOpen(true)}
          className="px-3 py-1.5 bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
        >
          <span>Connect Calendar</span>
          <ArrowRight size={12} />
        </button>
      </div>
    );
  }

  if (!upcomingMeeting) {
    return (
      <div className="bg-surface border border-border/50 rounded-2xl p-5 w-full flex flex-col items-center justify-center text-center gap-3 py-8">
        <div className="w-12 h-12 bg-surface-raised border border-border/50 rounded-2xl flex items-center justify-center mb-1 text-muted-foreground">
          <CalendarCheck size={20} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">No Upcoming Meetings</h3>
          <p className="text-[11px] text-muted-foreground mt-1 max-w-[200px] mx-auto">
            Your schedule is clear. Take a deep breath and focus on deep work.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border/50 rounded-2xl p-4 w-full flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
          <Calendar size={18} />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Upcoming Meeting</div>
          <div className="text-xs font-semibold text-foreground truncate">{upcomingMeeting.title}</div>
          <div className="text-[11px] text-muted-foreground">
            {upcomingMeeting.dateStr} {upcomingMeeting.timeRange ? `• ${upcomingMeeting.timeRange}` : ''}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setSyncModalOpen(true)}
        className="px-2.5 py-1.5 rounded-lg bg-surface-hover hover:bg-surface-raised border border-border/50 text-[11px] font-medium text-foreground transition-colors shrink-0"
      >
        View
      </button>
    </div>
  );
};

