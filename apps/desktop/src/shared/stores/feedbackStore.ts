import { create } from 'zustand';

export type FeedbackCategory = 'bug' | 'suggestion' | 'general';
export type FeedbackRating = 'love' | 'good' | 'neutral' | 'frustrated';

export interface FeedbackData {
  category: FeedbackCategory;
  rating: FeedbackRating;
  message: string;
  email?: string;
  includeDiagnostics: boolean;
}

export interface SystemDiagnostics {
  appVersion: string;
  platform: string;
  screenResolution: string;
  timezone: string;
  currentPath: string;
  timestamp: string;
}

export function getSystemDiagnostics(): SystemDiagnostics {
  return {
    appVersion: '1.0.0',
    platform: typeof navigator !== 'undefined' ? (navigator.userAgent.includes('Windows') ? 'Windows' : navigator.platform) : 'Desktop',
    screenResolution: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'Unknown',
    timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC',
    currentPath: typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/',
    timestamp: new Date().toISOString(),
  };
}

export function getResolvedUserEmail(authEmail?: string | null, calendarEmail?: string | null): string {
  // Ignore dummy/guest mock emails
  if (authEmail && !authEmail.endsWith('@bacham.local') && !authEmail.endsWith('@bacham.app')) {
    return authEmail;
  }
  if (calendarEmail && calendarEmail.includes('@') && !calendarEmail.endsWith('@bacham.local') && !calendarEmail.endsWith('@bacham.app')) {
    return calendarEmail;
  }
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('bacham_feedback_email');
    if (saved && saved.includes('@') && !saved.endsWith('@bacham.local') && !saved.endsWith('@bacham.app')) {
      return saved;
    }
  }
  return '';
}

const DISCORD_WEBHOOK_URL =
  import.meta.env.VITE_DISCORD_FEEDBACK_WEBHOOK_URL ||
  'https://discord.com/api/webhooks/1545830015101440050/Qu6t5rlHFjucq6XySN3i6vdsOBpiLfUxdChmOf6EDtZY-yZBwUHvgP1SDPePyTAW6OUu';

const GITHUB_REPO_URL = 'https://github.com/harshabacham/bacham-meeting-assistant';

const CATEGORY_COLORS: Record<FeedbackCategory, number> = {
  bug: 0xef4444,        // Red
  suggestion: 0xf59e0b, // Amber / Gold
  general: 0x10b981,    // Emerald
};

const CATEGORY_EMOJIS: Record<FeedbackCategory, string> = {
  bug: '🐛 Bug Report',
  suggestion: '💡 Feature Suggestion',
  general: '⭐ General Feedback',
};

const RATING_LABELS: Record<FeedbackRating, string> = {
  love: '🤩 Loving it',
  good: '🙂 Good experience',
  neutral: '😐 Neutral / Okay',
  frustrated: '😕 Having trouble',
};

interface FeedbackState {
  isOpen: boolean;
  category: FeedbackCategory;
  rating: FeedbackRating;
  message: string;
  email: string;
  includeDiagnostics: boolean;
  isSubmitting: boolean;
  isSuccess: boolean;
  errorMessage: string | null;

  openModal: (initialCategory?: FeedbackCategory) => void;
  closeModal: () => void;
  setCategory: (category: FeedbackCategory) => void;
  setRating: (rating: FeedbackRating) => void;
  setMessage: (message: string) => void;
  setEmail: (email: string) => void;
  setIncludeDiagnostics: (include: boolean) => void;
  resetForm: () => void;

  submitFeedback: () => Promise<boolean>;
  openGitHubIssue: () => void;
}

export const useFeedbackStore = create<FeedbackState>((set, get) => ({
  isOpen: false,
  category: 'suggestion',
  rating: 'good',
  message: '',
  email: '',
  includeDiagnostics: true,
  isSubmitting: false,
  isSuccess: false,
  errorMessage: null,

  openModal: (initialCategory) => {
    set((state) => ({
      isOpen: true,
      category: initialCategory || state.category,
      isSuccess: false,
      errorMessage: null,
    }));
  },

  closeModal: () => {
    set({ isOpen: false });
  },

  setCategory: (category) => set({ category }),
  setRating: (rating) => set({ rating }),
  setMessage: (message) => set({ message }),
  setEmail: (email) => set({ email }),
  setIncludeDiagnostics: (includeDiagnostics) => set({ includeDiagnostics }),

  resetForm: () => {
    set({
      category: 'suggestion',
      rating: 'good',
      message: '',
      isSubmitting: false,
      isSuccess: false,
      errorMessage: null,
    });
  },

  submitFeedback: async () => {
    const { category, rating, message, email, includeDiagnostics } = get();

    if (!message.trim()) {
      set({ errorMessage: 'Please provide some details before submitting.' });
      return false;
    }

    set({ isSubmitting: true, errorMessage: null });

    try {
      const diagnostics = getSystemDiagnostics();
      const fields: Array<{ name: string; value: string; inline?: boolean }> = [
        {
          name: 'Category',
          value: CATEGORY_EMOJIS[category],
          inline: true,
        },
        {
          name: 'Sentiment',
          value: RATING_LABELS[rating],
          inline: true,
        },
        {
          name: 'Contact Email',
          value: email.trim() ? `\`${email.trim()}\`` : '*Anonymous*',
          inline: true,
        },
      ];

      if (includeDiagnostics) {
        fields.push(
          {
            name: 'App Version',
            value: `\`v${diagnostics.appVersion}\``,
            inline: true,
          },
          {
            name: 'Platform / OS',
            value: `\`${diagnostics.platform}\``,
            inline: true,
          },
          {
            name: 'Screen Resolution',
            value: `\`${diagnostics.screenResolution}\``,
            inline: true,
          },
          {
            name: 'Context Route',
            value: `\`${diagnostics.currentPath}\``,
            inline: false,
          }
        );
      }

      const summaryPreview = message.trim().slice(0, 100).replace(/\n/g, ' ');
      const embedTitle = `[${category.toUpperCase()}] ${summaryPreview}${message.length > 100 ? '...' : ''}`;

      const discordPayload = {
        username: 'Bacham Feedback Bot',
        avatar_url: 'https://raw.githubusercontent.com/harshabacham/bacham-meeting-assistant/main/apps/desktop/app-icon.png',
        embeds: [
          {
            title: embedTitle,
            description: message.trim(),
            color: CATEGORY_COLORS[category],
            fields,
            footer: {
              text: `Bacham Meeting Assistant • v${diagnostics.appVersion} • Open Source`,
            },
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const response = await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(discordPayload),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      if (typeof window !== 'undefined' && email.trim() && !email.endsWith('@bacham.local') && !email.endsWith('@bacham.app')) {
        try {
          localStorage.setItem('bacham_feedback_email', email.trim());
        } catch {}
      }

      set({ isSubmitting: false, isSuccess: true, errorMessage: null });
      return true;
    } catch (err: any) {
      console.error('Failed to send feedback to Discord webhook:', err);
      set({
        isSubmitting: false,
        errorMessage: 'Could not send feedback directly. You can also open an issue on GitHub below.',
      });
      return false;
    }
  },

  openGitHubIssue: () => {
    const { category, rating, message, includeDiagnostics } = get();
    const diagnostics = getSystemDiagnostics();

    const titlePrefix = category === 'bug' ? '[Bug]' : category === 'suggestion' ? '[Feature]' : '[Feedback]';
    const firstLine = message.trim().split('\n')[0] || 'Community Submission';
    const title = `${titlePrefix} ${firstLine.slice(0, 70)}`;

    let body = `### Description\n${message.trim() || '*(No description provided)*'}\n\n`;
    body += `**Category**: ${CATEGORY_EMOJIS[category]}\n`;
    body += `**User Sentiment**: ${RATING_LABELS[rating]}\n\n`;

    if (includeDiagnostics) {
      body += `### Environment & Diagnostics\n`;
      body += `- **App Version**: v${diagnostics.appVersion}\n`;
      body += `- **Platform**: ${diagnostics.platform}\n`;
      body += `- **Screen**: ${diagnostics.screenResolution}\n`;
      body += `- **Timezone**: ${diagnostics.timezone}\n`;
    }

    const githubUrl = `${GITHUB_REPO_URL}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
    import('@tauri-apps/plugin-shell')
      .then(({ open }) => open(githubUrl))
      .catch(() => {
        if (typeof window !== 'undefined') {
          window.open(githubUrl, '_blank', 'noopener,noreferrer');
        }
      });
  },
}));
