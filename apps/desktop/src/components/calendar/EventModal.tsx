import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, AlignLeft } from 'lucide-react';
import { useCalendarStore, CalendarEvent } from '@/shared/stores/calendarStore';
import { useToast } from '@/components/ui/ToastProvider';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit?: CalendarEvent | null;
}

export const EventModal: React.FC<EventModalProps> = ({ isOpen, onClose, eventToEdit }) => {
  const { addEvent, editEvent } = useCalendarStore();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (eventToEdit) {
      setTitle(eventToEdit.title);
      // Try to parse YYYY-MM-DD from dateStr if it contains it, or just use today if unknown format
      setDateStr(eventToEdit.dateStr || new Date().toISOString().split('T')[0]);
      
      // Convert "12:00 PM" to "12:00" for input type="time"
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
        return tStr; // fallback
      };
      
      setStartTime(formatTimeForInput(eventToEdit.startTime || ''));
      setEndTime(formatTimeForInput(eventToEdit.endTime || ''));
      setDescription(eventToEdit.description || '');
    } else {
      setTitle('');
      setDateStr(new Date().toISOString().split('T')[0]);
      setStartTime('');
      setEndTime('');
      setDescription('');
    }
  }, [eventToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (eventToEdit) {
        await editEvent(eventToEdit.id, {
          title,
          dateStr,
          startTime,
          endTime,
          description
        });
        showToast('Event updated successfully', 'success');
      } else {
        await addEvent({
          title,
          dateStr,
          startTime,
          endTime,
          description,
          type: 'google',
          color: '#3b82f6',
          dayNum: new Date(dateStr).getDate(),
          monthStr: new Date(dateStr).toLocaleString('default', { month: 'short' }),
          dayOfWeek: new Date(dateStr).toLocaleString('default', { weekday: 'short' })
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-lg overflow-hidden rounded-2xl bg-surface border border-border shadow-2xl"
        >
          <div className="flex items-center justify-between p-4 border-b border-border bg-surface-raised">
            <h2 className="text-lg font-semibold text-foreground">
              {eventToEdit ? 'Edit Event' : 'Add New Event'}
            </h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-hover text-muted-foreground transition-colors">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Event Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 bg-surface-raised border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none text-foreground transition-all"
                placeholder="Team Sync"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Calendar size={12} /> Date
              </label>
              <input
                type="date"
                required
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full px-4 py-2 bg-surface-raised border border-border rounded-xl focus:border-primary outline-none text-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Clock size={12} /> Start Time
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-2 bg-surface-raised border border-border rounded-xl focus:border-primary outline-none text-foreground"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Clock size={12} /> End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-2 bg-surface-raised border border-border rounded-xl focus:border-primary outline-none text-foreground"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <AlignLeft size={12} /> Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 bg-surface-raised border border-border rounded-xl focus:border-primary outline-none text-foreground h-24 resize-none"
                placeholder="Meeting notes or details..."
              />
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-foreground bg-surface-hover hover:bg-border transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 rounded-xl text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Event'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
