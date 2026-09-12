import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, RefreshCw, Link as LogOut, Plus } from 'lucide-react';
import { useCalendarStore } from '@/shared/stores/calendarStore';
import { openUrl } from '@tauri-apps/plugin-opener';

export function GoogleCalendarSyncModal() {
  const {
    isSyncModalOpen,
    setSyncModalOpen,
    isConnected,
    calendarEmail,
    iCalUrl,
    isSyncing,
    connectGoogleCalendar,
    connectGoogleCalendarOAuth,
    disconnectCalendar,
    syncNow,
    addEvent,
    syncError,
  } = useCalendarStore();

  const [activeTab, setActiveTab] = useState<'account' | 'event'>('account');
  const [localError, setLocalError] = useState<string | null>(null);
  const [customIcalUrl, setCustomIcalUrl] = useState('');
  const [showIcalInput, setShowIcalInput] = useState(false);

  React.useEffect(() => {
    setLocalError(null);
  }, [calendarEmail, iCalUrl]);

  // New Event Form State
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('2026-07-25');
  const [eventTime, setEventTime] = useState('14:00 – 15:00 PM');
  const [eventColor, setEventColor] = useState('#f97316');

  if (!isSyncModalOpen) return null;

  const renderError = (error: string) => {
    const calendarApiRegex = /https:\/\/console\.developers\.google\.com[^\s]*/i;
    const match = error.match(calendarApiRegex);
    
    if (match) {
      const url = match[0];
      return (
        <div className="w-full space-y-2 text-left">
          <p className="font-semibold text-destructive">
            Google Calendar API is disabled in your project.
          </p>
          <button
            type="button"
            onClick={() => {
              openUrl(url).catch(console.error);
            }}
            className="w-full py-2 bg-destructive text-white rounded-lg font-bold hover:bg-destructive/95 hover:shadow transition-all flex items-center justify-center gap-1.5 active:scale-[0.99]"
          >
            <span>Enable Google Calendar API</span>
          </button>
          <p className="text-[10px] text-muted-foreground leading-normal mt-1">
            Click the button above to enable the Calendar API in Google Cloud Console, then click Connect again.
          </p>
        </div>
      );
    }

    if (
      error.toLowerCase().includes("invalid authentication credentials") ||
      error.toLowerCase().includes("oauth 2 access token") ||
      error.toLowerCase().includes("unauthorized")
    ) {
      return (
        <div className="w-full space-y-2 text-left">
          <p className="font-semibold text-destructive">
            Your Google Calendar session has expired.
          </p>
          <button
            type="button"
            onClick={async () => {
              try {
                await connectGoogleCalendarOAuth();
              } catch (e) {
                console.error(e);
              }
            }}
            className="w-full py-2 bg-destructive text-white rounded-lg font-bold hover:bg-destructive/95 hover:shadow transition-all flex items-center justify-center gap-1.5 active:scale-[0.99]"
          >
            <span>Reconnect Google Account</span>
          </button>
          <p className="text-[10px] text-muted-foreground leading-normal mt-1">
            Google Calendar credentials expire periodically. Click above to sign in again and restore sync.
          </p>
        </div>
      );
    }
    
    return <span className="font-semibold">{error}</span>;
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    const dateObj = new Date(eventDate);
    const dayNum = dateObj.getDate() || 25;
    const monthStr = dateObj.toLocaleString('en-US', { month: 'long' }) || 'July';
    const dayOfWeek = dateObj.toLocaleString('en-US', { weekday: 'short' }) || 'Sat';

    addEvent({
      title: eventTitle.trim(),
      dateStr: eventDate,
      dayNum,
      monthStr,
      dayOfWeek,
      timeRange: eventTime,
      type: 'google',
      color: eventColor,
    });

    setEventTitle('');
    setSyncModalOpen(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md bg-surface border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between bg-surface-raised/50 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <Calendar size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Google Calendar Integration</h2>
                <p className="text-[11px] text-muted-foreground">Sync your study sessions & events</p>
              </div>
            </div>
            <button
              onClick={() => setSyncModalOpen(false)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Sub Navigation */}
          <div className="flex border-b border-border/40 px-6 bg-surface-raised/20">
            <button
              onClick={() => setActiveTab('account')}
              className={`py-2.5 text-xs font-semibold border-b-2 transition-all mr-4 ${
                activeTab === 'account'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Account Sync
            </button>
            <button
              onClick={() => setActiveTab('event')}
              className={`py-2.5 text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'event'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              + Create Event
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4 text-xs">
            {activeTab === 'account' ? (
              <div className="space-y-5">
                {/* Error Banner */}
                {(localError || syncError) && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs flex items-center gap-2 w-full">
                    {renderError(localError || syncError || '')}
                  </div>
                )}

                {/* Connection Status Card */}
                <div className="p-3.5 rounded-xl bg-surface-raised border border-border/60 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-primary animate-pulse' : 'bg-zinc-500'}`} />
                    <div>
                      <div className="font-bold text-foreground">
                        {isConnected ? 'Google Calendar Connected' : 'Calendar Disconnected'}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {calendarEmail ? `Synced to ${calendarEmail}` : 'Connect your account to sync'}
                      </div>
                    </div>
                  </div>

                  {isConnected && (
                    <button
                      type="button"
                      onClick={() => syncNow()}
                      disabled={isSyncing}
                      className="p-2 rounded-lg bg-surface-hover hover:bg-surface-raised text-foreground transition-colors"
                      title="Sync Now"
                    >
                      <RefreshCw size={14} className={isSyncing ? 'animate-spin text-primary' : ''} />
                    </button>
                  )}
                </div>

                {!isConnected ? (
                  <div className="space-y-4 pt-1">
                    {isSyncing ? (
                      <div className="flex flex-col items-center justify-center p-5 bg-surface-raised/80 border border-primary/30 rounded-xl space-y-3 text-center">
                        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                          <RefreshCw size={18} className="animate-spin" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-foreground">Waiting for Google Authorization...</p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Sign in with your Google account in the browser tab that just opened. Bacham will automatically detect and sync your calendar.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            useCalendarStore.setState({ isSyncing: false, syncError: null });
                          }}
                          className="text-[11px] text-muted-foreground hover:text-destructive underline decoration-dotted underline-offset-2 pt-1 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          setLocalError(null);
                          try {
                            await connectGoogleCalendarOAuth();
                          } catch (err: any) {
                            setLocalError(err.message || "OAuth Sign-In failed or was cancelled.");
                          }
                        }}
                        className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.99] cursor-pointer"
                      >
                        <svg className="w-4 h-4 mr-0.5" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                        Connect Google Account
                      </button>
                    )}

                    {/* Alternative: Secret Address (iCal URL) Zero-OAuth Sync */}
                    <div className="pt-2 border-t border-border/40">
                      {!showIcalInput ? (
                        <button
                          type="button"
                          onClick={() => setShowIcalInput(true)}
                          className="w-full py-2 text-[11px] text-muted-foreground hover:text-foreground hover:bg-surface-hover/50 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                          <span>Or sync directly with Secret Address URL (Zero-OAuth)</span>
                        </button>
                      ) : (
                        <div className="space-y-2.5 p-3 rounded-xl bg-surface-raised/60 border border-border/50">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-foreground">Google Calendar Secret Address</span>
                            <button
                              type="button"
                              onClick={() => setShowIcalInput(false)}
                              className="text-[10px] text-muted-foreground hover:text-foreground"
                            >
                              Cancel
                            </button>
                          </div>
                          <input
                            type="url"
                            value={customIcalUrl}
                            onChange={(e) => setCustomIcalUrl(e.target.value)}
                            placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
                            className="w-full px-3 py-2 text-xs bg-surface border border-border/80 rounded-lg text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary transition-all font-mono"
                          />
                          <p className="text-[10px] text-muted-foreground leading-relaxed">
                            Found in Google Calendar Settings &rarr; Integrate Calendar &rarr; "Secret address in iCal format".
                          </p>
                          <button
                            type="button"
                            disabled={!customIcalUrl.trim() || isSyncing}
                            onClick={async () => {
                              setLocalError(null);
                              try {
                                await connectGoogleCalendar("Google Calendar", customIcalUrl.trim());
                              } catch (err: any) {
                                setLocalError(err.message || "Failed to sync via iCal URL.");
                              }
                            }}
                            className="w-full py-2 bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary rounded-lg text-xs font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            {isSyncing ? <RefreshCw size={12} className="animate-spin" /> : <Calendar size={12} />}
                            <span>Sync with Secret Address</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={disconnectCalendar}
                      className="px-4 py-2.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white text-red-400 rounded-xl text-xs font-bold transition-all flex items-center gap-2 active:scale-95"
                    >
                      <LogOut size={14} />
                      Disconnect Google Calendar
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleAddEvent} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Event Title
                  </label>
                  <input
                    type="text"
                    required
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="e.g. Operating Systems Exam Study Review"
                    className="w-full px-3.5 py-2.5 text-xs bg-[#1A1C20] border border-border/80 rounded-xl text-white placeholder:text-muted-foreground/60 outline-none focus:border-primary transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Date
                    </label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#1A1C20] border border-border/80 rounded-xl text-white outline-none focus:border-primary transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Time Range
                    </label>
                    <input
                      type="text"
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                      placeholder="12:00 – 12:30 PM"
                      className="w-full px-3 py-2 text-xs bg-[#1A1C20] border border-border/80 rounded-xl text-white outline-none focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Indicator Color
                  </label>
                  <div className="flex items-center gap-3">
                    {['#f97316', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6'].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setEventColor(color)}
                        style={{ backgroundColor: color }}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${
                          eventColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-80'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 shadow-md mt-2"
                >
                  <Plus size={14} /> Add Event to Agenda
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
