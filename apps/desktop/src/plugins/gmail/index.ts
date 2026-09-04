import { BachamPlugin } from '@/core/integrations/types';
import { openUrl } from '@tauri-apps/plugin-opener';

const PLUGIN_ID = 'bacham.gmail';

const GmailPlugin: BachamPlugin = {
  manifest: {
    id: PLUGIN_ID,
    name: 'Gmail & Email',
    version: '1.0.0',
    description: 'Email meeting summaries, action items, and notes via your default email client or Gmail.',
    icon: 'Mail',
    category: 'Communication',
    permissions: ['Send Email'],
    author: 'Bacham',
    setupGuide: {
      steps: [
        'Zero setup required! Bacham connects to your system\'s native email handler automatically.',
        'Ensure your operating system has a default email app configured (e.g. Gmail in Chrome/Edge, Outlook, Apple Mail, or Thunderbird).',
        'How to use: Open any meeting in the Notes Workspace, click "Share & Export", and choose "Share via Email".',
        'A pre-formatted email draft will immediately open with the meeting summary, decisions, and action items ready to send to your team.'
      ],
      whereToUse: 'Notes Editor ("Share & Export" > Share via Email)',
      note: '100% private. Never asks for your email password or OAuth tokens. Drafts open locally in your email client.'
    }
  },
  auth: {
    type: 'none',
    authenticate: async () => {},
    disconnect: async () => {},
    isConnected: async () => true,
  },
  actions: {
    export: async (data: any) => {
      try {
        const title = data.title || 'Meeting Summary';
        const bodyText = data.content || data.summary || 'Meeting notes from Bacham';
        const subject = encodeURIComponent(title);
        const body = encodeURIComponent(bodyText.slice(0, 2500));
        
        const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
        await openUrl(mailtoUrl);
        
        return { status: 'success', message: 'Opened draft in your email client.' };
      } catch (e: any) {
        console.error("Email export error", e);
        return { status: 'error', message: e?.message || 'Failed to open email client.' };
      }
    }
  }
};

export default GmailPlugin;
