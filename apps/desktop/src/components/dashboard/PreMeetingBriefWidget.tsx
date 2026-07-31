import React, { useState, useEffect } from 'react';
import { Calendar, Users, Loader2, Sparkles, Clock } from 'lucide-react';
import { TauriClient } from '@/infrastructure/tauri-client';

export const PreMeetingBriefWidget: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [brief, setBrief] = useState<string | null>(null);
  
  // Simulated upcoming meeting for demonstration purposes
  const upcomingMeeting = {
    title: "Q3 Roadmap Alignment",
    time: "2:00 PM - 3:00 PM",
    attendees: ["John Doe", "Jane Smith"]
  };

  const generateBrief = async () => {
    setLoading(true);
    try {
      const result = await TauriClient.generatePreMeetingBrief(
        upcomingMeeting.attendees, 
        upcomingMeeting.title
      );
      setBrief(result);
    } catch (err) {
      console.error(err);
      setBrief("Failed to generate brief.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface border border-border/50 rounded-2xl p-5 w-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-semibold text-foreground">Next Meeting</h3>
        </div>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          In 30 mins
        </span>
      </div>

      <div className="bg-background/50 border border-border/40 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">{upcomingMeeting.title}</h4>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {upcomingMeeting.time}
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {upcomingMeeting.attendees.join(', ')}
          </div>
        </div>
      </div>

      {!brief && !loading && (
        <button 
          onClick={generateBrief}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors text-xs font-semibold"
        >
          <Sparkles className="w-4 h-4" />
          Generate Pre-Meeting AI Brief
        </button>
      )}

      {loading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
          <span className="ml-2 text-xs text-muted-foreground">Analyzing past transcripts...</span>
        </div>
      )}

      {brief && (
        <div className="mt-2 bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 animate-in slide-in-from-top-2">
          <h5 className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider mb-2">AI Preparation Brief</h5>
          <div className="prose prose-sm prose-invert max-w-none text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">
            {brief}
          </div>
        </div>
      )}
    </div>
  );
};
