import React from 'react';
import { CalendarCheck } from 'lucide-react';

export const PreMeetingBriefWidget: React.FC = () => {
  // Real calendar integration would fetch actual events here.
  // For now, we display the Inbox Zero empty state.
  const upcomingMeeting = null;

  if (!upcomingMeeting) {
    return (
      <div className="bg-surface border border-border/50 rounded-2xl p-5 w-full flex flex-col items-center justify-center text-center gap-3 py-8">
         <div className="w-12 h-12 bg-surface-raised border border-border/50 rounded-2xl flex items-center justify-center mb-1 text-muted-foreground">
           <CalendarCheck size={20} />
         </div>
         <div>
            <h3 className="text-sm font-semibold text-foreground">No Upcoming Meetings</h3>
            <p className="text-[11px] text-muted-foreground mt-1 max-w-[200px] mx-auto">Your schedule is clear. Take a deep breath and focus on deep work.</p>
         </div>
      </div>
    );
  }

  return null;
}
