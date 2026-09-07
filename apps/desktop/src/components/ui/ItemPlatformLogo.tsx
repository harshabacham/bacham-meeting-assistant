import React from 'react';
import { FileText, Video } from 'lucide-react';

export type PlatformType = 'google_meet' | 'zoom' | 'teams' | 'youtube' | 'chrome' | 'bacham' | 'meeting' | 'note';

export interface PlatformInfo {
  platform: PlatformType;
  label: string;
}

export function detectNotePlatform(note: {
  title?: string;
  content?: string;
  isMeeting?: boolean;
  source?: string;
  tags?: string[];
}): PlatformInfo {
  if (!note.isMeeting) {
    return { platform: 'note', label: 'Note' };
  }

  const t = (note.title || '').toLowerCase();
  const c = (note.content || '').toLowerCase();
  const s = (note.source || '').toLowerCase();

  // Google Meet
  if (
    t.includes('meet.google') ||
    t.includes('google meet') ||
    c.includes('meet.google.com') ||
    t.startsWith('meet:') ||
    t.includes(' gmeet')
  ) {
    return { platform: 'google_meet', label: 'Google Meet' };
  }

  // Zoom
  if (t.includes('zoom.us') || t.includes('zoom') || c.includes('zoom.us')) {
    return { platform: 'zoom', label: 'Zoom' };
  }

  // Microsoft Teams
  if (
    t.includes('teams.microsoft') ||
    t.includes('teams') ||
    c.includes('teams.microsoft.com') ||
    t.includes('ms teams')
  ) {
    return { platform: 'teams', label: 'Microsoft Teams' };
  }

  // YouTube (including browser tab unread count titles like '(745) $15 Trillion...')
  if (
    t.includes('youtube') ||
    t.includes('youtu.be') ||
    /^\(\d+\)/.test(note.title || '')
  ) {
    return { platform: 'youtube', label: 'YouTube' };
  }

  // Chrome Extension / Browser tab capture
  if (t.includes('extension') || t.includes('chrome') || s === 'extension') {
    return { platform: 'chrome', label: 'Chrome Extension' };
  }

  // Bacham Meeting / Desktop App Recording
  if (t.includes('bacham') || s === 'desktop') {
    return { platform: 'bacham', label: 'Bacham Meeting' };
  }

  return { platform: 'meeting', label: 'Meeting' };
}

interface ItemPlatformLogoProps {
  note: {
    title?: string;
    content?: string;
    isMeeting?: boolean;
    source?: string;
    tags?: string[];
  };
  size?: number;
  className?: string;
}

export const ItemPlatformLogo: React.FC<ItemPlatformLogoProps> = ({
  note,
  size = 16,
  className = '',
}) => {
  const { platform } = detectNotePlatform(note);

  switch (platform) {
    case 'google_meet':
      return (
        <svg
          style={{ width: size, height: size }}
          viewBox="0 0 24 24"
          fill="none"
          className={`shrink-0 ${className}`}
          aria-label="Google Meet"
        >
          <path d="M12 12L15 14.5L19 17L19.5 12L19 7L15 9.5L12 12Z" fill="#00832D" />
          <path d="M3 16V19C3 20.1 3.9 21 5 21H8L9 16.5L8 12H3V16Z" fill="#0066DA" />
          <path d="M8 3L3 7V12H8V3Z" fill="#E94235" />
          <path d="M8 12H3V16H8V12Z" fill="#2684FC" />
          <path d="M19 7L15 9.5V14.5L19 17L22 14.5V9.5L19 7Z" fill="#00AC47" />
          <path d="M15 12V7H8V12H15Z" fill="#00AC47" />
          <path d="M15 12H8V16.5H15V12Z" fill="#FFBA00" />
          <path d="M15 3H8V7H15V3Z" fill="#EA4335" />
          <path d="M15 16.5H8V21H15V16.5Z" fill="#00AA47" />
        </svg>
      );

    case 'zoom':
      return (
        <svg
          style={{ width: size, height: size }}
          viewBox="0 0 24 24"
          fill="none"
          className={`shrink-0 ${className}`}
          aria-label="Zoom"
        >
          <rect width="24" height="24" rx="5.5" fill="#2D8CFF" />
          <path
            d="M5.5 8.5C5.5 7.67 6.17 7 7 7H13C13.83 7 14.5 7.67 14.5 8.5V14.5C14.5 15.33 13.83 16 13 16H7C6.17 16 5.5 15.33 5.5 14.5V8.5Z"
            fill="white"
          />
          <path
            d="M15.5 10.2L18.7 7.8C19.1 7.5 19.7 7.8 19.7 8.3V14.7C19.7 15.2 19.1 15.5 18.7 15.2L15.5 12.8V10.2Z"
            fill="white"
          />
        </svg>
      );

    case 'teams':
      return (
        <svg
          style={{ width: size, height: size }}
          viewBox="0 0 24 24"
          fill="none"
          className={`shrink-0 ${className}`}
          aria-label="Microsoft Teams"
        >
          <rect width="24" height="24" rx="5.5" fill="#464EB8" />
          <circle cx="15.5" cy="7" r="1.75" fill="#7B83EB" />
          <path d="M13.5 10H17.5C18.3 10 19 10.7 19 11.5V14.5H13.5V10Z" fill="#7B83EB" />
          <circle cx="9" cy="5.5" r="2.25" fill="white" />
          <path
            d="M5 9.5H13C13.8 9.5 14.5 10.2 14.5 11V16.5C14.5 17.3 13.8 18 13 18H5C4.2 18 3.5 17.3 3.5 16.5V11C3.5 10.2 4.2 9.5 5 9.5Z"
            fill="white"
          />
          <rect x="3" y="9.5" width="7" height="8" rx="1.5" fill="#505AC9" />
          <text
            x="6.5"
            y="15.3"
            fontSize="5.5"
            fontWeight="bold"
            fill="white"
            textAnchor="middle"
            fontFamily="system-ui, sans-serif"
          >
            T
          </text>
        </svg>
      );

    case 'youtube':
      return (
        <svg
          style={{ width: size, height: size }}
          viewBox="0 0 24 24"
          fill="none"
          className={`shrink-0 ${className}`}
          aria-label="YouTube"
        >
          <rect width="24" height="24" rx="5.5" fill="#FF0000" />
          <path d="M10 8.5L16 12L10 15.5V8.5Z" fill="white" />
        </svg>
      );

    case 'chrome':
      return (
        <svg
          style={{ width: size, height: size }}
          viewBox="0 0 24 24"
          fill="none"
          className={`shrink-0 ${className}`}
          aria-label="Chrome Extension"
        >
          <circle cx="12" cy="12" r="10" fill="#ECEFF1" />
          <path
            d="M12 2C16.4 2 20.1 5 21.5 9.1L12 9.1L8.5 15L7.3 12.9C6.5 11.5 6 9.8 6 8C6 4.7 8.7 2 12 2Z"
            fill="#EA4335"
          />
          <path
            d="M21.5 9.1C21.8 10 22 11 22 12C22 17.5 17.5 22 12 22C10.5 22 9.1 21.7 7.8 21.1L12 13.8L15.5 13.8C17.4 13.8 19 12.2 19 10.3C19 9.9 18.9 9.5 18.8 9.1H21.5Z"
            fill="#4CAF50"
          />
          <path
            d="M7.8 21.1C4.3 19.5 2 16 2 12C2 9.2 3.1 6.6 5 4.7L8.5 10.8C8.2 11.1 8 11.5 8 12C8 13.9 9.3 15.5 11.1 15.9L7.8 21.1Z"
            fill="#FFC107"
          />
          <circle cx="12" cy="12" r="4.2" fill="white" />
          <circle cx="12" cy="12" r="3.2" fill="#1976D2" />
        </svg>
      );

    case 'bacham':
      return (
        <img
          src="/logo.png"
          alt="Bacham"
          style={{ width: size, height: size }}
          className={`shrink-0 object-contain rounded-xs ${className}`}
        />
      );

    case 'meeting':
      return (
        <Video
          style={{ width: size, height: size }}
          className={`shrink-0 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors ${className}`}
        />
      );

    case 'note':
    default:
      return (
        <FileText
          style={{ width: size, height: size }}
          className={`shrink-0 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors ${className}`}
        />
      );
  }
};
