import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  X, Check, Copy, ExternalLink, Loader2, 
  CheckSquare, Send, ChevronDown, ChevronUp, Hash, BookOpen
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { AuthManager } from '@/core/integrations/AuthManager';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { GlobalActionItem } from '@/pages/TasksPage';

interface SyncTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: GlobalActionItem[];
  filterTab?: string;
}

export const SyncTasksModal: React.FC<SyncTasksModalProps> = ({
  isOpen,
  onClose,
  tasks,
  filterTab = 'all'
}) => {
  const { showToast } = useToast();

  // Connection states
  const [slackConnected, setSlackConnected] = useState(false);
  const [notionConnected, setNotionConnected] = useState(false);

  // Inline configuration states
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [notionSecret, setNotionSecret] = useState('');
  const [notionPageId, setNotionPageId] = useState('');

  const [expandedSection, setExpandedSection] = useState<'none' | 'slack_config' | 'notion_config'>('none');
  const [isSavingSlack, setIsSavingSlack] = useState(false);
  const [isSavingNotion, setIsSavingNotion] = useState(false);

  // Sending states
  const [isSendingSlack, setIsSendingSlack] = useState(false);
  const [isSendingNotion, setIsSendingNotion] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  // Load auth status
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const checkAuth = async () => {
      try {
        const hasSlack = await AuthManager.isAuthenticated('bacham.slack');
        const hasNotion = await AuthManager.isAuthenticated('bacham.notion');
        
        if (isMounted) {
          setSlackConnected(hasSlack);
          setNotionConnected(hasNotion);
        }
      } catch (err) {
        console.error('Failed to check auth status', err);
      }
    };

    checkAuth();
    return () => { isMounted = false; };
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter tasks to only pending/todo items by default
  const pendingTasks = tasks.filter(t => t.status === 'todo');
  const targetTasks = pendingTasks.length > 0 ? pendingTasks : tasks;

  // Helper: Format tasks to Markdown
  const buildTasksMarkdown = () => {
    const today = new Date().toLocaleDateString(undefined, { 
      year: 'numeric', month: 'short', day: 'numeric' 
    });
    const lines = [
      `# 🚀 Action Items — ${today}`,
      `*Exported from BACHAM Meeting Assistant (${targetTasks.length} tasks)*\n`
    ];

    targetTasks.forEach((item) => {
      const owner = item.owner ? ` *(@${item.owner})*` : '';
      const due = item.dueDate ? ` — Due: ${item.dueDate}` : '';
      const ts = item.timestamp ? ` \`[${item.timestamp}]\`` : '';
      const source = item.lectureTitle ? ` *(Source: ${item.lectureTitle})*` : '';
      const checkMark = item.status === 'done' ? '[x]' : '[ ]';
      lines.push(`- ${checkMark} ${item.task}${owner}${due}${ts}${source}`);
    });

    return lines.join('\n');
  };

  // 1. Send to Slack Handler
  const handlePushToSlack = async () => {
    const webhookUrl = await AuthManager.getToken('bacham.slack');
    if (!webhookUrl) {
      setExpandedSection('slack_config');
      showToast('Please enter your Slack Webhook URL first.', 'error');
      return;
    }

    setIsSendingSlack(true);
    try {
      const taskListText = targetTasks.slice(0, 30).map((t, idx) => {
        const owner = t.owner ? ` *(@${t.owner})*` : '';
        const due = t.dueDate ? ` — Due: ${t.dueDate}` : '';
        const ts = t.timestamp ? ` \`[${t.timestamp}]\`` : '';
        return `• [ ] *${idx + 1}.* ${t.task}${owner}${due}${ts}`;
      }).join('\n');

      const title = `Action Items Digest (${targetTasks.length} tasks)`;
      await invoke('execute_integration', {
        input: {
          pluginId: 'bacham.slack',
          action: 'export',
          payload: {
            title,
            content: taskListText,
            summary: `Here are the latest pending action items extracted by BACHAM:`
          },
          authToken: webhookUrl.trim()
        }
      });

      showToast(`Sent ${targetTasks.length} action items to Slack!`, 'success');
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      console.error('Slack push failed', err);
      showToast(`Slack Push Failed: ${err?.message || err}`, 'error');
    } finally {
      setIsSendingSlack(false);
    }
  };

  // 2. Send to Notion Handler
  const handlePushToNotion = async () => {
    const rawToken = await AuthManager.getToken('bacham.notion');
    if (!rawToken) {
      setExpandedSection('notion_config');
      showToast('Please configure your Notion token & Page ID first.', 'error');
      return;
    }

    let secret = '';
    let pageId = '';
    try {
      const parsed = JSON.parse(rawToken);
      secret = parsed.secret || parsed.token || '';
      pageId = parsed.pageId || parsed.page_id || '';
    } catch {
      secret = rawToken;
    }

    if (!secret || !pageId) {
      setExpandedSection('notion_config');
      showToast('Missing Notion Secret or Page ID.', 'error');
      return;
    }

    setIsSendingNotion(true);
    try {
      const today = new Date().toLocaleDateString(undefined, { 
        year: 'numeric', month: 'short', day: 'numeric' 
      });
      const content = buildTasksMarkdown();
      const title = `Action Items — ${today} (${targetTasks.length} tasks)`;

      await invoke('push_task_to_notion', {
        input: {
          token: secret.trim(),
          pageId: pageId.trim(),
          title,
          content
        }
      });

      showToast(`Synced ${targetTasks.length} action items to Notion!`, 'success');
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      console.error('Notion push failed', err);
      showToast(`Notion Sync Failed: ${err?.message || err}`, 'error');
    } finally {
      setIsSendingNotion(false);
    }
  };

  // 3. Save Slack Webhook Inline
  const handleSaveSlackConfig = async () => {
    if (!slackWebhookUrl.trim()) {
      showToast('Please enter a valid Slack webhook URL', 'error');
      return;
    }
    setIsSavingSlack(true);
    try {
      await AuthManager.setToken('bacham.slack', slackWebhookUrl.trim());
      setSlackConnected(true);
      setExpandedSection('none');
      showToast('Slack Webhook connected successfully!', 'success');
    } catch (err: any) {
      showToast(`Failed to save: ${err?.message || err}`, 'error');
    } finally {
      setIsSavingSlack(false);
    }
  };

  // 4. Save Notion Config Inline
  const handleSaveNotionConfig = async () => {
    if (!notionSecret.trim() || !notionPageId.trim()) {
      showToast('Both Notion Secret and Page ID are required', 'error');
      return;
    }
    setIsSavingNotion(true);
    try {
      const payload = JSON.stringify({
        secret: notionSecret.trim(),
        pageId: notionPageId.trim()
      });
      await AuthManager.setToken('bacham.notion', payload);
      setNotionConnected(true);
      setExpandedSection('none');
      showToast('Notion connected successfully!', 'success');
    } catch (err: any) {
      showToast(`Failed to save: ${err?.message || err}`, 'error');
    } finally {
      setIsSavingNotion(false);
    }
  };

  // 5. Copy Markdown to Clipboard
  const handleCopyMarkdown = async () => {
    try {
      const text = buildTasksMarkdown();
      await navigator.clipboard.writeText(text);
      setCopiedMarkdown(true);
      showToast('Checklist copied to clipboard!', 'success');
      setTimeout(() => setCopiedMarkdown(false), 2000);
    } catch (err) {
      console.error(err);
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border)]/60 flex items-center justify-between bg-[var(--surface-raised)]/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <CheckSquare size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span>Sync Action Items</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                  {targetTasks.length} Tasks
                </span>
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                Dispatch detected meeting tasks directly into your team tools
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Target 1: Slack */}
          <div className="p-4 rounded-xl bg-[var(--surface-raised)]/40 border border-[var(--border)] space-y-3 transition-all">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Hash size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--text-primary)]">Slack Channel</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      slackConnected 
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/20'
                    }`}>
                      {slackConnected ? 'Connected' : 'Setup Required'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Post checklist with owners & timestamps to your team channel
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {!slackConnected ? (
                  <button
                    type="button"
                    onClick={() => setExpandedSection(expandedSection === 'slack_config' ? 'none' : 'slack_config')}
                    className="px-3 py-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary text-xs font-semibold transition-all flex items-center gap-1"
                  >
                    <span>Connect</span>
                    {expandedSection === 'slack_config' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePushToSlack}
                    disabled={isSendingSlack}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {isSendingSlack ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                    <span>{isSendingSlack ? 'Sending...' : 'Post to Slack'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Inline Slack Config Form */}
            {expandedSection === 'slack_config' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-3 border-t border-[var(--border)]/40 space-y-2.5"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-[var(--text-secondary)]">Incoming Webhook URL</span>
                  <button
                    type="button"
                    onClick={() => openUrl('https://api.slack.com/messaging/webhooks')}
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    <span>Get Webhook</span>
                    <ExternalLink size={10} />
                  </button>
                </div>
                <input
                  type="url"
                  value={slackWebhookUrl}
                  onChange={(e) => setSlackWebhookUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  className="w-full px-3 py-2 text-xs bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] outline-none focus:border-primary transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={handleSaveSlackConfig}
                  disabled={isSavingSlack || !slackWebhookUrl.trim()}
                  className="w-full py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingSlack ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  <span>Save & Connect Slack</span>
                </button>
              </motion.div>
            )}
          </div>

          {/* Target 2: Notion */}
          <div className="p-4 rounded-xl bg-[var(--surface-raised)]/40 border border-[var(--border)] space-y-3 transition-all">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center shrink-0">
                  <BookOpen size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--text-primary)]">Notion Workspace</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      notionConnected 
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/20'
                    }`}>
                      {notionConnected ? 'Connected' : 'Setup Required'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Create a dedicated page with interactive checkboxes in Notion
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {!notionConnected ? (
                  <button
                    type="button"
                    onClick={() => setExpandedSection(expandedSection === 'notion_config' ? 'none' : 'notion_config')}
                    className="px-3 py-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary text-xs font-semibold transition-all flex items-center gap-1"
                  >
                    <span>Connect</span>
                    {expandedSection === 'notion_config' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePushToNotion}
                    disabled={isSendingNotion}
                    className="px-3.5 py-1.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 text-violet-300 text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {isSendingNotion ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                    <span>{isSendingNotion ? 'Syncing...' : 'Push to Notion'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Inline Notion Config Form */}
            {expandedSection === 'notion_config' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-3 border-t border-[var(--border)]/40 space-y-2.5"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-[var(--text-secondary)]">Internal Integration Secret</span>
                  <button
                    type="button"
                    onClick={() => openUrl('https://www.notion.so/my-integrations')}
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    <span>Get Secret</span>
                    <ExternalLink size={10} />
                  </button>
                </div>
                <input
                  type="password"
                  value={notionSecret}
                  onChange={(e) => setNotionSecret(e.target.value)}
                  placeholder="secret_..."
                  className="w-full px-3 py-2 text-xs bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] outline-none focus:border-primary transition-all font-mono"
                />

                <div className="text-[11px] font-semibold text-[var(--text-secondary)]">
                  Target Page ID
                </div>
                <input
                  type="text"
                  value={notionPageId}
                  onChange={(e) => setNotionPageId(e.target.value)}
                  placeholder="Page ID from Notion page URL (32 characters)"
                  className="w-full px-3 py-2 text-xs bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] outline-none focus:border-primary transition-all font-mono"
                />

                <button
                  type="button"
                  onClick={handleSaveNotionConfig}
                  disabled={isSavingNotion || !notionSecret.trim() || !notionPageId.trim()}
                  className="w-full py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingNotion ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  <span>Save & Connect Notion</span>
                </button>
              </motion.div>
            )}
          </div>

          {/* Target 3: Copy as Markdown Checklist */}
          <div className="p-4 rounded-xl bg-[var(--surface-raised)]/40 border border-[var(--border)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                <Copy size={18} />
              </div>
              <div>
                <span className="text-xs font-bold text-[var(--text-primary)]">Copy as Markdown Checklist</span>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Ready to paste into Jira, Linear, GitHub Issues, or Slack
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="px-3.5 py-1.5 rounded-lg bg-[var(--surface-hover)] hover:bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {copiedMarkdown ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copiedMarkdown ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[var(--border)]/60 bg-[var(--surface-raised)]/20 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-[var(--text-muted)]">
            Showing {targetTasks.length} {filterTab === 'urgent' ? 'urgent' : ''} action items
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[var(--surface-hover)] hover:bg-[var(--surface-raised)] text-[var(--text-primary)] text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
