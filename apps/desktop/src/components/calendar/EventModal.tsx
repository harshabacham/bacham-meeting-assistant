import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Calendar, Clock, AlignLeft, MapPin, 
  Users, Bell, Trash2, Edit3, Copy, Video, Type 
} from 'lucide-react';
import { useCalendarStore, CalendarEvent } from '@/shared/stores/calendarStore';
import { useToast } from '@/components/ui/ToastProvider';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit?: CalendarEvent | null;
}

const COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#64748b'
];

export const EventModal: React.FC<EventModalProps> = ({ isOpen, onClose, eventToEdit }) => {
  const { addEvent, editEvent, deleteEvent } = useCalendarStore();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'view' | 'edit'>('edit');
  
  const [title, setTitle] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  
  // Optional fields
  const [location, setLocation] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (eventToEdit) {
      setMode('view');
      setTitle(eventToEdit.title);
      setDateStr(eventToEdit.dateStr || new Date().toISOString().split('T')[0]);
      
      const formatTimeForInput = (tStr: string) => {
        if (!tStr) return '';
        const match = tStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (match) {
            let h = parseInt(match[1]);
            const m = match[2];
            const ampm = match[3].toUpperCase();
            if (ampm === 'PM' && h < 12) h += 12;
            if (ampm === 'AM' && h === 12) h = 0;
            return `${h.toString().padStart(2, '0')}:${m}`;
        }
        return tStr; 
      };
      
      setStartTime(formatTimeForInput(eventToEdit.startTime || ''));
      setEndTime(formatTimeForInput(eventToEdit.endTime || ''));
      setDescription(eventToEdit.description || '');
      setColor(eventToEdit.color || COLORS[0]);
      
      setLocation(eventToEdit.meetingUrl || '');
      setReminderMinutes(eventToEdit.reminderMinutes ?? null);
      
    } else {
      setMode('edit');
      setTitle('');
      setDateStr(new Date().toISOString().split('T')[0]);
      setStartTime('');
      setEndTime('');
      setDescription('');
      setColor(COLORS[0]);
      setLocation('');
      setReminderMinutes(null);
    }
  }, [eventToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Format input time back to standard 12-hour string (e.g. 14:00 -> 2:00 PM)
    const formatTimeForSave = (tStr: string) => {
        if (!tStr) return '';
        const [h, m] = tStr.split(':');
        let hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        if (hour > 12) hour -= 12;
        if (hour === 0) hour = 12;
        return `${hour}:${m} ${ampm}`;
    };

    try {
      if (eventToEdit) {
        await editEvent(eventToEdit.id, {
          title: title || 'Untitled Event',
          dateStr,
          startTime: formatTimeForSave(startTime),
          endTime: formatTimeForSave(endTime),
          description,
          color,
          meetingUrl: location,
          reminderMinutes
        });
        showToast('Event updated successfully', 'success');
      } else {
        await addEvent({
          title: title || 'Untitled Event',
          dateStr,
          startTime: formatTimeForSave(startTime),
          endTime: formatTimeForSave(endTime),
          description,
          type: 'google',
          color: color,
          dayNum: new Date(dateStr).getDate(),
          monthStr: new Date(dateStr).toLocaleString('default', { month: 'short' }),
          dayOfWeek: new Date(dateStr).toLocaleString('default', { weekday: 'short' }),
          meetingUrl: location,
          reminderMinutes
        });
        showToast('Event added successfully', 'success');
      }
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Failed to save event', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (eventToEdit) {
      await deleteEvent(eventToEdit.id);
      showToast('Event deleted', 'info');
      onClose();
    }
  };

  if (!isOpen) return null;

  const displayDate = new Date(dateStr).toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const displayTime = `${eventToEdit?.startTime || startTime} ${eventToEdit?.endTime || endTime ? `- ${eventToEdit?.endTime || endTime}` : ''}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-lg overflow-hidden rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl flex flex-col max-h-[90vh]"
        >
          
          {/* Header */}
          <div className="flex items-center justify-end p-2 border-b border-[var(--border)] bg-[var(--surface-raised)] shrink-0">
             <div className="flex items-center gap-1 px-2">
                {mode === 'view' && (
                  <>
                    <button onClick={() => setMode('edit')} className="p-2 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] transition-colors" title="Edit Event">
                      <Edit3 size={16} />
                    </button>
                    <button onClick={handleDelete} className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500 transition-colors" title="Delete Event">
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] transition-colors" title="Close">
                  <X size={18} />
                </button>
             </div>
          </div>

          <div className="overflow-y-auto custom-scrollbar flex-1">
            {mode === 'view' ? (
              <div className="p-8 flex flex-col gap-6">
                 {/* Title Section */}
                 <div className="flex items-start gap-4">
                    <div className="mt-1.5 w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <div className="flex flex-col gap-1">
                      <h2 className="text-2xl font-bold text-[var(--text-primary)] leading-tight">{title || 'Untitled Event'}</h2>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{displayDate}</p>
                      <p className="text-sm text-[var(--text-muted)]">{displayTime || 'All Day'}</p>
                    </div>
                 </div>

                 <div className="h-px bg-[var(--border)] w-full my-2" />

                 {/* Details List */}
                 <div className="flex flex-col gap-4">
                    {location && (
                      <div className="flex items-start gap-4">
                        <Video size={18} className="text-[var(--text-muted)] shrink-0 mt-0.5" />
                        <div className="flex flex-col">
                           <span className="text-sm text-[var(--text-primary)] font-medium">{location}</span>
                           <button className="text-xs text-[var(--accent)] font-semibold text-left mt-0.5">Join Meeting</button>
                        </div>
                      </div>
                    )}
                    {description && (
                      <div className="flex items-start gap-4">
                        <AlignLeft size={18} className="text-[var(--text-muted)] shrink-0 mt-0.5" />
                        <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{description}</p>
                      </div>
                    )}
                 </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg">
                    <Type size={16} className="text-[var(--text-muted)]" />
                  </div>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-transparent border-b-2 border-[var(--border)] focus:border-[var(--accent)] outline-none text-xl font-bold text-[var(--text-primary)] placeholder:text-[var(--text-muted)] placeholder:font-medium transition-all"
                    placeholder="Event Title"
                  />
                </div>

                <div className="flex items-start gap-4">
                  <Clock size={18} className="text-[var(--text-muted)] shrink-0 mt-2.5" />
                  <div className="flex-1 grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                       <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Date</label>
                       <input
                         type="date"
                         required
                         value={dateStr}
                         onChange={(e) => setDateStr(e.target.value)}
                         className="w-full px-4 py-2 bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl focus:border-[var(--accent)] outline-none text-sm text-[var(--text-primary)]"
                       />
                     </div>
                     <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Start</label>
                          <input
                            type="time"
                            required
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="w-full px-2 py-2 bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl focus:border-[var(--accent)] outline-none text-sm text-[var(--text-primary)]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">End</label>
                          <input
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="w-full px-2 py-2 bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl focus:border-[var(--accent)] outline-none text-sm text-[var(--text-primary)]"
                          />
                        </div>
                     </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                   <MapPin size={18} className="text-[var(--text-muted)] shrink-0" />
                   <div className="flex-1">
                     <input
                       type="text"
                       value={location}
                       onChange={(e) => setLocation(e.target.value)}
                       className="w-full px-4 py-2 bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl focus:border-[var(--accent)] outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                       placeholder="Location or Video Call URL"
                     />
                   </div>
                </div>

                 <div className="flex items-center gap-4">
                   <Bell size={18} className="text-[var(--text-muted)] shrink-0" />
                   <div className="flex-1">
                     <select
                       value={reminderMinutes === null ? 'default' : reminderMinutes}
                       onChange={(e) => setReminderMinutes(e.target.value === 'default' ? null : parseInt(e.target.value))}
                       className="w-full px-4 py-2 bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl focus:border-[var(--accent)] outline-none text-sm text-[var(--text-primary)]"
                     >
                       <option value="default">Default calendar reminder</option>
                       <option value="0">At time of event</option>
                       <option value="5">5 minutes before</option>
                       <option value="10">10 minutes before</option>
                       <option value="15">15 minutes before</option>
                       <option value="30">30 minutes before</option>
                       <option value="60">1 hour before</option>
                       <option value="1440">1 day before</option>
                     </select>
                   </div>
                 </div>

                <div className="flex items-start gap-4">
                   <AlignLeft size={18} className="text-[var(--text-muted)] shrink-0 mt-2.5" />
                   <div className="flex-1">
                     <textarea
                       value={description}
                       onChange={(e) => setDescription(e.target.value)}
                       className="w-full px-4 py-3 bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl focus:border-[var(--accent)] outline-none text-sm text-[var(--text-primary)] h-24 resize-none placeholder:text-[var(--text-muted)]"
                       placeholder="Add description or attachments..."
                     />
                   </div>
                </div>

                {/* Color Picker */}
                <div className="flex items-center gap-4 pt-2">
                   <div className="w-[18px] shrink-0" />
                   <div className="flex gap-2">
                      {COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          className={`w-6 h-6 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-2 ring-offset-[var(--bg)] ring-[var(--accent)]' : 'hover:scale-110'}`}
                          style={{ backgroundColor: c }}
                          title={`Color ${c}`}
                        />
                      ))}
                   </div>
                </div>
                
                {/* Submit footer */}
                <div className="pt-6 mt-4 border-t border-[var(--border)] flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (eventToEdit) setMode('view');
                      else onClose();
                    }}
                    className="px-5 py-2 rounded-xl text-sm font-semibold text-[var(--text-primary)] bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] transition-colors border border-[var(--border)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 rounded-xl text-sm font-bold text-[var(--bg)] bg-[var(--accent)] hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Save'}
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
