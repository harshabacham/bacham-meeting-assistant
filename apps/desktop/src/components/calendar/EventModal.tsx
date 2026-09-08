import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Clock, AlignLeft, MapPin, 
  Trash2, Edit3, Video, Type, Check
} from 'lucide-react';
import { useCalendarStore, CalendarEvent } from '@/shared/stores/calendarStore';
import { useToast } from '@/components/ui/ToastProvider';
import { EDITORIAL_COLORS, getEventStyle, normalizeEventColor } from './calendarTheme';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit?: CalendarEvent | null;
}

const ensureYmd = (dStr?: string): string => {
  if (!dStr) return new Date().toISOString().split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return dStr;
  const d = new Date(dStr);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
};

const formatTimeForInput = (tStr?: string): string => {
  if (!tStr) return '';
  if (/^\d{1,2}:\d{2}$/.test(tStr.trim())) {
    const [h, m] = tStr.trim().split(':');
    return `${h.padStart(2, '0')}:${m}`;
  }
  const match = tStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = match[2].padStart(2, '0');
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${m}`;
  }
  return tStr;
};

const formatTimeForSave = (tStr?: string): string => {
  if (!tStr || !tStr.trim()) return '';
  const trimmed = tStr.trim();
  if (trimmed.includes('AM') || trimmed.includes('PM')) {
    return trimmed;
  }
  const [h, m] = trimmed.split(':');
  if (!h || m === undefined) return trimmed;
  let hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  if (hour > 12) hour -= 12;
  if (hour === 0) hour = 12;
  return `${hour}:${m.padStart(2, '0')} ${ampm}`;
};

export const EventModal: React.FC<EventModalProps> = ({ isOpen, onClose, eventToEdit }) => {
  const { addEvent, editEvent, deleteEvent } = useCalendarStore();
  const { showToast } = useToast();

  const isExistingEvent = Boolean(eventToEdit && eventToEdit.id);
  const [mode, setMode] = useState<'view' | 'edit'>('edit');
  
  const [title, setTitle] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(EDITORIAL_COLORS[0].hex);
  
  const [location, setLocation] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (eventToEdit && eventToEdit.id) {
      setMode('view');
      setTitle(eventToEdit.title || '');
      setDateStr(ensureYmd(eventToEdit.dateStr));
      setStartTime(formatTimeForInput(eventToEdit.startTime));
      setEndTime(formatTimeForInput(eventToEdit.endTime));
      setDescription(eventToEdit.description || '');
      setColor(normalizeEventColor(eventToEdit.color));
      setLocation(eventToEdit.meetingUrl || '');
      setReminderMinutes(eventToEdit.reminderMinutes ?? null);
    } else {
      setMode('edit');
      setTitle(eventToEdit?.title || '');
      setDateStr(ensureYmd(eventToEdit?.dateStr));
      setStartTime(formatTimeForInput(eventToEdit?.startTime || '12:00 PM'));
      setEndTime(formatTimeForInput(eventToEdit?.endTime || '12:30 PM'));
      setDescription(eventToEdit?.description || '');
      setColor(normalizeEventColor(eventToEdit?.color));
      setLocation(eventToEdit?.meetingUrl || '');
      setReminderMinutes(null);
    }
  }, [eventToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const safeTitle = title.trim() || 'Untitled Event';
    const safeDate = ensureYmd(dateStr);
    const safeStart = formatTimeForSave(startTime);
    const safeEnd = formatTimeForSave(endTime);

    try {
      if (eventToEdit && eventToEdit.id) {
        // Update existing event
        await editEvent(eventToEdit.id, {
          title: safeTitle,
          dateStr: safeDate,
          startTime: safeStart,
          endTime: safeEnd,
          description: description.trim(),
          color,
          meetingUrl: location.trim(),
          reminderMinutes: reminderMinutes ?? undefined
        });
        showToast('Event updated successfully', 'success');
      } else {
        // Create new event
        const dObj = new Date(safeDate + 'T00:00:00');
        await addEvent({
          title: safeTitle,
          dateStr: safeDate,
          startTime: safeStart,
          endTime: safeEnd,
          description: description.trim(),
          type: 'bacham',
          color: color,
          dayNum: dObj.getDate(),
          monthStr: dObj.toLocaleString('default', { month: 'short' }),
          dayOfWeek: dObj.toLocaleString('default', { weekday: 'short' }),
          meetingUrl: location.trim(),
          reminderMinutes: reminderMinutes ?? undefined
        });
        showToast('Event created successfully', 'success');
      }
      onClose();
    } catch (err) {
      console.error("Failed to save calendar event", err);
      showToast('Failed to save event', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (eventToEdit && eventToEdit.id) {
      await deleteEvent(eventToEdit.id);
      showToast('Event deleted', 'info');
      onClose();
    }
  };

  if (!isOpen) return null;

  const previewStyle = getEventStyle({ color, id: eventToEdit?.id });
  const viewStyle = getEventStyle(eventToEdit);

  const displayDate = dateStr ? new Date(dateStr + 'T00:00:00').toLocaleDateString('default', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  }) : '';
  const displayTime = `${eventToEdit?.startTime || formatTimeForSave(startTime)} ${
    (eventToEdit?.endTime || formatTimeForSave(endTime)) ? `- ${eventToEdit?.endTime || formatTimeForSave(endTime)}` : ''
  }`.trim();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.18 }}
          className="w-full max-w-lg overflow-hidden rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)] bg-[var(--surface-raised)]/40 shrink-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {mode === 'view' ? 'Event Details' : (isExistingEvent ? 'Edit Event' : 'New Event')}
            </h3>
            
            <div className="flex items-center gap-1.5">
              {mode === 'view' && isExistingEvent && (
                <>
                  <button 
                    type="button"
                    onClick={() => setMode('edit')} 
                    className="h-7.5 px-2.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer border border-[var(--border)] bg-[var(--surface)] shadow-xs" 
                    title="Edit Event"
                  >
                    <Edit3 size={12} />
                    <span>Edit</span>
                  </button>
                  <button 
                    type="button"
                    onClick={handleDelete} 
                    className="h-7.5 w-7.5 flex items-center justify-center rounded-lg hover:bg-rose-500/10 text-[var(--text-secondary)] hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer border border-transparent hover:border-rose-500/20" 
                    title="Delete Event"
                  >
                    <Trash2 size={13.5} />
                  </button>
                </>
              )}
              <button 
                type="button"
                onClick={onClose} 
                className="h-7.5 w-7.5 flex items-center justify-center rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer" 
                title="Close"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto custom-scrollbar flex-1">
            {mode === 'view' ? (
              <div className="p-7 flex flex-col gap-6">
                {/* Title Section */}
                <div className="flex items-start gap-3.5">
                  <div className={`mt-0.5 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border shrink-0 ${viewStyle.bg} ${viewStyle.text} ${viewStyle.border}`}>
                    <span className="w-2 h-2 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: viewStyle.dot }} />
                    <span>{viewStyle.name}</span>
                  </div>
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <h2 className="text-xl font-semibold text-[var(--text-primary)] leading-snug break-words">
                      {title || 'Untitled Event'}
                    </h2>
                    <p className="text-xs font-medium text-[var(--text-secondary)]">{displayDate}</p>
                    <p className="text-xs text-[var(--text-muted)] font-mono">{displayTime || 'All Day'}</p>
                  </div>
                </div>

                <div className="h-px bg-[var(--border)] w-full" />

                {/* Details List */}
                <div className="flex flex-col gap-3.5">
                  {location && (
                    <div className="flex items-start gap-3">
                      <Video size={16} className="text-[var(--text-muted)] shrink-0 mt-0.5" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs text-[var(--text-primary)] font-medium truncate">{location}</span>
                        {location.startsWith('http') && (
                          <a 
                            href={location} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-xs text-[var(--text-primary)] underline hover:opacity-80 font-medium mt-0.5"
                          >
                            Open Meeting Link →
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {description && (
                    <div className="flex items-start gap-3">
                      <AlignLeft size={16} className="text-[var(--text-muted)] shrink-0 mt-0.5" />
                      <p className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                        {description}
                      </p>
                    </div>
                  )}

                  {!location && !description && (
                    <p className="text-xs text-[var(--text-muted)] italic">No additional details recorded for this event.</p>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Title Input */}
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg shrink-0">
                    <Type size={16} className="text-[var(--text-muted)]" />
                  </div>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="flex-1 px-3 py-2 bg-transparent border-b border-[var(--border)] focus:border-[var(--text-primary)] outline-none text-base font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors"
                    placeholder="Event Title"
                    autoFocus
                  />
                </div>

                {/* Date & Time Grid */}
                <div className="flex items-start gap-3.5">
                  <Clock size={16} className="text-[var(--text-muted)] shrink-0 mt-2.5" />
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10.5px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Date</label>
                      <input
                        type="date"
                        required
                        value={dateStr}
                        onChange={(e) => setDateStr(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl focus:border-[var(--text-primary)]/40 outline-none text-xs font-medium text-[var(--text-primary)]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10.5px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Start</label>
                        <input
                          type="time"
                          required
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full px-2 py-1.5 bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl focus:border-[var(--text-primary)]/40 outline-none text-xs font-medium text-[var(--text-primary)]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10.5px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">End</label>
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full px-2 py-1.5 bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl focus:border-[var(--text-primary)]/40 outline-none text-xs font-medium text-[var(--text-primary)]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location / Meeting URL */}
                <div className="flex items-center gap-3.5">
                  <MapPin size={16} className="text-[var(--text-muted)] shrink-0" />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl focus:border-[var(--text-primary)]/40 outline-none text-xs font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                      placeholder="Location or Video Call URL (Zoom, Meet, Teams)"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="flex items-start gap-3.5">
                  <AlignLeft size={16} className="text-[var(--text-muted)] shrink-0 mt-2" />
                  <div className="flex-1">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl focus:border-[var(--text-primary)]/40 outline-none text-xs text-[var(--text-primary)] h-20 resize-none placeholder:text-[var(--text-muted)]"
                      placeholder="Add event notes, agenda, or deliverables..."
                    />
                  </div>
                </div>

                {/* Editorial Color Selector */}
                <div className="space-y-2.5 pt-2 border-t border-[var(--border)]/60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                      <span>Color Theme:</span>
                      <span className="font-bold text-[var(--text-primary)]">
                        {EDITORIAL_COLORS.find(c => c.hex.toLowerCase() === color.toLowerCase())?.name || 'Custom'}
                      </span>
                    </div>

                    {/* Live Preview Pill */}
                    <div className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 border transition-all shadow-2xs ${previewStyle.bg} ${previewStyle.text} ${previewStyle.border}`}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: previewStyle.dot }} />
                      <span className="truncate max-w-[140px]">{title.trim() || 'Event Preview'}</span>
                      <span className="opacity-75 text-[9.5px] shrink-0 font-medium">
                        {startTime ? formatTimeForSave(startTime) : '9:00 AM'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {EDITORIAL_COLORS.map(c => {
                      const isSelected = color.toLowerCase() === c.hex.toLowerCase();
                      return (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setColor(c.hex)}
                          className={`h-8 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all cursor-pointer ${
                            isSelected
                              ? `${c.style.bg} ${c.style.text} ${c.style.border} ring-2 ring-[var(--text-primary)]/20 shadow-xs scale-[1.02]`
                              : 'bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] border-[var(--border)] opacity-85 hover:opacity-100'
                          }`}
                          title={c.name}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span 
                              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" 
                              style={{ backgroundColor: c.hex }} 
                            />
                            <span className="truncate">{c.name}</span>
                          </div>
                          {isSelected && <Check size={12} className="shrink-0" strokeWidth={2.5} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                {/* Actions Footer */}
                <div className="pt-4 border-t border-[var(--border)] flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (eventToEdit && eventToEdit.id) setMode('view');
                      else onClose();
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] transition-colors border border-[var(--border)] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl text-xs font-semibold text-[var(--bg)] bg-[var(--text-primary)] hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {isSubmitting ? 'Saving...' : (isExistingEvent ? 'Save Changes' : 'Create Event')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
