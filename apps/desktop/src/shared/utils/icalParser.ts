import { invoke } from '@tauri-apps/api/core';
import { CalendarEvent } from '../stores/calendarStore';

/**
 * Parses raw iCal (.ics) text data from Google Calendar into structured CalendarEvent items.
 */
export function parseICSData(icsText: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const veventRegex = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g;

  let match;
  let index = 1;

  while ((match = veventRegex.exec(icsText)) !== null) {
    const eventBlock = match[1];

    // Extract Summary / Title
    const summaryMatch = eventBlock.match(/SUMMARY:(.*)/i);
    const title = summaryMatch ? summaryMatch[1].trim().replace(/\\,/g, ',') : 'Google Calendar Event';

    // Extract Description
    const descMatch = eventBlock.match(/DESCRIPTION:(.*)/i);
    const description = descMatch ? descMatch[1].trim().replace(/\\n/g, '\n').replace(/\\,/g, ',') : undefined;

    // Extract Location / Meeting URL
    const locationMatch = eventBlock.match(/LOCATION:(.*)/i);
    const location = locationMatch ? locationMatch[1].trim() : '';

    let meetingUrl: string | undefined = undefined;
    if (location.includes('meet.google.com') || location.includes('zoom.us') || location.includes('teams.microsoft.com')) {
      const urlMatch = location.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) meetingUrl = urlMatch[1];
    } else if (description && (description.includes('meet.google.com') || description.includes('zoom.us'))) {
      const urlMatch = description.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) meetingUrl = urlMatch[1];
    }

    // Extract DTSTART (e.g. 20260724T120000Z or 20260724)
    const dtstartMatch = eventBlock.match(/DTSTART(?:;[^:]+)?:(\d{8})(?:T(\d{4,6}))?/i);
    
    let dateObj = new Date();
    let startTimeStr = '12:00 PM';
    let endTimeStr = '12:30 PM';

    if (dtstartMatch) {
      const datePart = dtstartMatch[1];
      const year = parseInt(datePart.substring(0, 4), 10);
      const month = parseInt(datePart.substring(4, 6), 10) - 1;
      const day = parseInt(datePart.substring(6, 8), 10);

      if (dtstartMatch[2]) {
        const timePart = dtstartMatch[2];
        const hour = parseInt(timePart.substring(0, 2), 10);
        const minute = parseInt(timePart.substring(2, 4), 10);
        dateObj = new Date(Date.UTC(year, month, day, hour, minute));

        const formattedHour = dateObj.getHours() % 12 || 12;
        const ampm = dateObj.getHours() >= 12 ? 'PM' : 'AM';
        const formattedMin = dateObj.getMinutes().toString().padStart(2, '0');
        startTimeStr = `${formattedHour}:${formattedMin} ${ampm}`;

        const endHour = (dateObj.getHours() + 1) % 12 || 12;
        const endAmpm = (dateObj.getHours() + 1) >= 12 ? 'PM' : 'AM';
        endTimeStr = `${endHour}:${formattedMin} ${endAmpm}`;
      } else {
        dateObj = new Date(year, month, day);
      }
    }

    const dayNum = dateObj.getDate() || (20 + index);
    const monthStr = dateObj.toLocaleString('en-US', { month: 'long' }) || 'July';
    const dayOfWeek = dateObj.toLocaleString('en-US', { weekday: 'short' }) || 'Thu';
    const dateStr = dateObj.toISOString().split('T')[0];

    // Determine indicator color based on title keywords
    let color = '#3b82f6'; // default blue
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('exam') || lowerTitle.includes('quiz') || lowerTitle.includes('test') || lowerTitle.includes('final')) {
      color = '#ef4444'; // red for exams
    } else if (lowerTitle.includes('lecture') || lowerTitle.includes('class') || lowerTitle.includes('chapter')) {
      color = '#10b981'; // emerald for lectures
    } else if (lowerTitle.includes('review') || lowerTitle.includes('study') || lowerTitle.includes('prep')) {
      color = '#f97316'; // orange for study
    }

    events.push({
      id: `gcal_${Date.now()}_${index++}`,
      title,
      description,
      dateStr,
      dayNum,
      monthStr,
      dayOfWeek,
      startTime: startTimeStr,
      endTime: endTimeStr,
      timeRange: `${startTimeStr} – ${endTimeStr}`,
      type: 'google',
      color,
      meetingUrl,
    });
  }

  return events;
}

/**
 * Fetches live Google Calendar iCal feed in real time.
 */
export async function fetchLiveGoogleCalendarEvents(iCalUrl: string): Promise<CalendarEvent[]> {
  try {
    const icsText = await invoke<string>('fetch_ical_feed', { url: iCalUrl });
    const parsedEvents = parseICSData(icsText);
    return parsedEvents;
  } catch (error) {
    console.error("Failed to fetch live Google Calendar feed via Rust backend", error);
    throw error;
  }
}

export function parseGCalEvents(gcalItems: any[]): CalendarEvent[] {
  return gcalItems.map((item: any, index: number) => {
    const title = item.summary || 'Untitled Event';
    const description = item.description;
    const meetingUrl = item.hangoutLink || undefined;

    let dateObj = new Date();
    let startTimeStr = '12:00 PM';
    let endTimeStr = '12:30 PM';
    let timeRange = '';

    if (item.start?.dateTime) {
      dateObj = new Date(item.start.dateTime);
      const startD = new Date(item.start.dateTime);
      const endD = new Date(item.end?.dateTime || item.start.dateTime);

      // format start time
      const startHour = startD.getHours() % 12 || 12;
      const startMin = startD.getMinutes().toString().padStart(2, '0');
      const startAmpm = startD.getHours() >= 12 ? 'PM' : 'AM';
      startTimeStr = `${startHour}:${startMin} ${startAmpm}`;

      // format end time
      const endHour = endD.getHours() % 12 || 12;
      const endMin = endD.getMinutes().toString().padStart(2, '0');
      const endAmpm = endD.getHours() >= 12 ? 'PM' : 'AM';
      endTimeStr = `${endHour}:${endMin} ${endAmpm}`;

      timeRange = `${startTimeStr} – ${endTimeStr}`;
    } else if (item.start?.date) {
      dateObj = new Date(item.start.date);
      timeRange = 'All day';
    }

    const dayNum = dateObj.getDate();
    const monthStr = dateObj.toLocaleString('en-US', { month: 'long' });
    const dayOfWeek = dateObj.toLocaleString('en-US', { weekday: 'short' });
    const dateStr = dateObj.toISOString().split('T')[0];

    // Color code
    let color = '#3b82f6';
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('exam') || lowerTitle.includes('quiz') || lowerTitle.includes('test')) {
      color = '#ef4444';
    } else if (lowerTitle.includes('lecture') || lowerTitle.includes('class')) {
      color = '#10b981';
    } else if (lowerTitle.includes('review') || lowerTitle.includes('study')) {
      color = '#f97316';
    }

    return {
      id: item.id || `gcal_${Date.now()}_${index}`,
      title,
      description,
      dateStr,
      dayNum,
      monthStr,
      dayOfWeek,
      startTime: startTimeStr,
      endTime: endTimeStr,
      timeRange,
      type: 'google',
      color,
      meetingUrl,
    };
  });
}

export async function fetchLiveGoogleCalendarEventsOAuth(accessToken: string): Promise<CalendarEvent[]> {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const timeMin = startOfToday.toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&singleEvents=true&orderBy=startTime&maxResults=30`;
    
    const jsonText = await invoke<string>('fetch_url_with_auth', { url, token: accessToken });
    const response = JSON.parse(jsonText);
    
    if (response.error) {
      throw new Error(response.error.message || "Google Calendar API error");
    }

    if (response.items) {
      return parseGCalEvents(response.items);
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch live Google Calendar events via OAuth", error);
    throw error;
  }
}
