import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  CheckSquare,
  Image as ImageIcon,
  MessageSquare,
  Send,
  Camera,
  Play,
  Pause,
  Square,
  Copy,
  Check,
  Search,
  Plus,
  Trash2,
  Volume2,
  Zap,
} from 'lucide-react';
import { MascotAvatar, MascotMood } from './MascotAvatar';
import { MessageType } from '@/shared/types';

interface InjectedSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ActionItem {
  id: string;
  text: string;
  completed: boolean;
  tag: 'action' | 'decision' | 'idea' | 'note';
  timestamp: number;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: number;
}

interface SlideSnapshot {
  id: string;
  imageUrl: string;
  timestamp: number;
  title: string;
  ocrSnippet?: string;
}

export const InjectedSidebar: React.FC<InjectedSidebarProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'copilot' | 'notes' | 'slides' | 'transcript'>('copilot');
  const [mascotMood, setMascotMood] = useState<MascotMood>('happy');

  // Session & Recording State
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'bot',
      text: "👋 Hey there! I'm your Bacham AI Copilot. I'm actively taking notes in this meeting. What would you like to know?",
      timestamp: Date.now(),
    },
  ]);

  // Notes & Action Items
  const [actions, setActions] = useState<ActionItem[]>([
    { id: 'a1', text: 'Review project milestones for next sprint', completed: false, tag: 'action', timestamp: Date.now() - 60000 },
    { id: 'a2', text: 'Agreed on adopting local-first desktop ingestion architecture', completed: true, tag: 'decision', timestamp: Date.now() - 120000 },
    { id: 'a3', text: 'Explore Web Audio API for seamless microphone mixing', completed: true, tag: 'idea', timestamp: Date.now() - 180000 },
  ]);
  const [newActionText, setNewActionText] = useState('');
  const [newActionTag, setNewActionTag] = useState<'action' | 'decision' | 'idea'>('action');

  // Slide Reel
  const [slides] = useState<SlideSnapshot[]>([
    {
      id: 's1',
      imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=60',
      timestamp: Date.now() - 300000,
      title: 'Slide 1: Architecture Overview',
      ocrSnippet: 'System Architecture • Core Engine • Pipeline Coordinator',
    },
    {
      id: 's2',
      imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=60',
      timestamp: Date.now() - 120000,
      title: 'Slide 2: Execution Matrix',
      ocrSnippet: 'Key Milestones: Q3 Deployment • Privacy Benchmarks',
    },
  ]);

  // Transcript Feed
  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [captions, setCaptions] = useState<Array<{ id: string; speaker: string; text: string; time: string }>>([
    { id: 'c1', speaker: 'Speaker 1', text: 'Welcome everyone! Today we will walk through the meeting capture engine and user experience.', time: '10:00 AM' },
    { id: 'c2', speaker: 'You', text: 'I have verified that our Manifest V3 offscreen pipeline is working without user gesture errors.', time: '10:02 AM' },
    { id: 'c3', speaker: 'Speaker 1', text: 'Super! Let us make sure the sidebar matches Sider.ai standards with friendly cartoon aesthetics.', time: '10:04 AM' },
  ]);

  // Toast / Copy Feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync with background recording status
  useEffect(() => {
    const fetchState = () => {
      chrome.runtime.sendMessage({ type: MessageType.GET_STATE }, (res) => {
        if (res?.success && res.data) {
          const state = res.data.sessionState;
          if (res.data.session?.id) {
            setSessionId(res.data.session.id);
          }
          setIsRecording(state === 'recording' || state === 'paused');
          setIsPaused(state === 'paused');
          if (state === 'recording') setMascotMood('recording');
        }
      });
    };

    fetchState();
    const interval = setInterval(fetchState, 3000);
    return () => clearInterval(interval);
  }, []);

  // Timer tick
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRecording && !isPaused) {
      timer = setInterval(() => setRecordingSeconds((prev) => prev + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording, isPaused]);

  // Listen for live captions and incoming insights
  useEffect(() => {
    const listener = (msg: any) => {
      if (msg?.type === MessageType.LIVE_CAPTION && msg.payload) {
        const { text, speakerName } = msg.payload;
        setCaptions((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            speaker: speakerName || 'Speaker',
            text: text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        setMascotMood('listening');
        setTimeout(() => setMascotMood(isRecording ? 'recording' : 'happy'), 2000);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [isRecording]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Handle Chat Submit
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || chatInput;
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: textToSend,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setChatInput('');
    setIsThinking(true);
    setMascotMood('thinking');

    try {
      // Send catch-up request or Gemini prompt
      const res = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage(
          {
            type: MessageType.CATCHUP_REQUEST,
            payload: { prompt: textToSend },
          },
          (response) => resolve(response)
        );
      });

      const botReply = res?.data?.summary || "✨ Here is a quick synthesis of the latest meeting discussion based on live notes and visual context.";

      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'bot',
          text: botReply,
          timestamp: Date.now(),
        },
      ]);
      setMascotMood('success');
      setTimeout(() => setMascotMood(isRecording ? 'recording' : 'happy'), 2500);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'bot',
          text: "I've noted that! You can also check the Smart Notes tab for automatically extracted action items.",
          timestamp: Date.now(),
        },
      ]);
      setMascotMood('happy');
    } finally {
      setIsThinking(false);
    }
  };

  // Toggle Action item completion
  const toggleAction = (id: string) => {
    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, completed: !a.completed } : a))
    );
  };

  const addActionItem = () => {
    if (!newActionText.trim()) return;
    const newNoteText = newActionText.trim();
    setActions((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        text: newNoteText,
        completed: false,
        tag: newActionTag,
        timestamp: Date.now(),
      },
    ]);
    
    if (sessionId) {
      chrome.runtime.sendMessage({
        type: 'APPEND_LIVE_NOTE',
        payload: { text: `[${newActionTag.toUpperCase()}] ${newNoteText}` },
        sessionId,
      }).catch(() => {});
    }

    setNewActionText('');
    setMascotMood('success');
    setTimeout(() => setMascotMood(isRecording ? 'recording' : 'happy'), 1500);
  };

  const deleteActionItem = (id: string) => {
    setActions((prev) => prev.filter((a) => a.id !== id));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const completedCount = actions.filter((a) => a.completed).length;
  const progressPercent = actions.length > 0 ? Math.round((completedCount / actions.length) * 100) : 0;

  const quickPrompts = [
    { label: '⚡ Catch me up', prompt: 'What was just discussed in the last 5 minutes?' },
    { label: '🎯 List Action Items', prompt: 'Extract all action items and assignees mentioned so far.' },
    { label: '💡 Key Decisions', prompt: 'Summarize all major decisions agreed upon in this meeting.' },
    { label: '📧 Draft Follow-up', prompt: 'Draft a short, professional follow-up email summarizing the next steps.' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%', opacity: 0, scale: 0.98 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: '100%', opacity: 0, scale: 0.98 }}
          transition={{ type: 'spring', damping: 26, stiffness: 220 }}
          style={{
            position: 'fixed',
            top: '12px',
            right: '12px',
            width: '420px',
            height: 'calc(100vh - 24px)',
            background: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08) inset',
            zIndex: 9999999,
            display: 'flex',
            flexDirection: 'column',
            color: '#f8fafc',
            fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.4) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Mascot + Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <MascotAvatar mood={mascotMood} size={42} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
                    Bacham Copilot
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '6px',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      color: '#fff',
                      boxShadow: '0 2px 6px rgba(99, 102, 241, 0.3)',
                    }}
                  >
                    AI 1.5
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: isRecording ? '#ef4444' : '#10b981',
                      boxShadow: isRecording ? '0 0 8px #ef4444' : '0 0 8px #10b981',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 500 }}>
                    {isRecording ? `Recording (${formatTimer(recordingSeconds)})` : 'Ready to capture'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={onClose}
                title="Minimize Copilot"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Sider.ai-Style Tab Navigation Pills */}
          <div
            style={{
              display: 'flex',
              padding: '10px 14px',
              gap: '6px',
              background: 'rgba(15, 23, 42, 0.6)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            {[
              { id: 'copilot', label: 'Copilot', icon: MessageSquare, badge: null },
              { id: 'notes', label: 'Notes & Tasks', icon: CheckSquare, badge: actions.length },
              { id: 'slides', label: 'Slides', icon: ImageIcon, badge: slides.length },
              { id: 'transcript', label: 'Transcript', icon: Volume2, badge: null },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    flex: 1,
                    padding: '8px 6px',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(139, 92, 246, 0.2))'
                      : 'transparent',
                    color: isActive ? '#a5b4fc' : 'rgba(255, 255, 255, 0.6)',
                    boxShadow: isActive ? '0 2px 8px rgba(99, 102, 241, 0.2), 0 0 0 1px rgba(99, 102, 241, 0.4) inset' : 'none',
                  }}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                  {tab.badge !== null && (
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '1px 5px',
                        borderRadius: '10px',
                        background: isActive ? '#6366f1' : 'rgba(255, 255, 255, 0.15)',
                        color: '#fff',
                      }}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Main Content Area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* TAB 1: COPILOT CHAT */}
            {activeTab === 'copilot' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
                {/* Quick Prompts Carousel */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>
                    Quick Insights
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    {quickPrompts.map((qp, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(qp.prompt)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          color: '#e2e8f0',
                          fontSize: '11px',
                          fontWeight: 600,
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)';
                          e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                        }}
                      >
                        <span>{qp.label}</span>
                        <Zap size={12} style={{ color: '#818cf8', opacity: 0.8 }} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Messages Feed */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '85%',
                          padding: '12px 14px',
                          borderRadius: msg.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          background:
                            msg.sender === 'user'
                              ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                              : 'rgba(30, 41, 59, 0.7)',
                          border: msg.sender === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#fff',
                          fontSize: '13px',
                          lineHeight: 1.5,
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        }}
                      >
                        {msg.text}
                      </div>
                      <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)', marginTop: '4px', padding: '0 4px' }}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </motion.div>
                  ))}

                  {isThinking && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '16px', background: 'rgba(30, 41, 59, 0.5)', width: 'fit-content' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#818cf8', animation: 'pulse 1s infinite' }} />
                      <span style={{ fontSize: '12px', color: '#a5b4fc', fontWeight: 600 }}>Bacham AI is thinking...</span>
                    </div>
                  )}
                </div>

                {/* Chat Input Box */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '16px',
                    background: 'rgba(30, 41, 59, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask anything about this meeting... 💭"
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  />
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!chatInput.trim() || isThinking}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '10px',
                      background: chatInput.trim() ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      border: 'none',
                      cursor: chatInput.trim() ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease',
                      boxShadow: chatInput.trim() ? '0 4px 12px rgba(99, 102, 241, 0.4)' : 'none',
                    }}
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: SMART NOTES & ACTIONS */}
            {activeTab === 'notes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%' }}>
                {/* Progress Bar Card */}
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.08))',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={14} style={{ color: '#818cf8' }} />
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>Meeting Action Progress</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#a5b4fc' }}>
                      {completedCount}/{actions.length} Done ({progressPercent}%)
                    </span>
                  </div>
                  {/* Progress Line */}
                  <div style={{ width: '100%', height: '6px', borderRadius: '3px', background: 'rgba(255, 255, 255, 0.1)', overflow: 'hidden' }}>
                    <motion.div
                      style={{ height: '100%', borderRadius: '3px', background: 'linear-gradient(90deg, #6366f1, #34d399)' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>

                {/* Add New Note / Action Input */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {(['action', 'decision', 'idea'] as const).map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setNewActionTag(tag)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '8px',
                          border: 'none',
                          fontSize: '10px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textTransform: 'capitalize',
                          background:
                            newActionTag === tag
                              ? tag === 'action'
                                ? '#6366f1'
                                : tag === 'decision'
                                ? '#10b981'
                                : '#f59e0b'
                              : 'rgba(255, 255, 255, 0.08)',
                          color: '#fff',
                        }}
                      >
                        {tag === 'action' ? '🎯 Action' : tag === 'decision' ? '⚖️ Decision' : '💡 Idea'}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      value={newActionText}
                      onChange={(e) => setNewActionText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addActionItem()}
                      placeholder="Add personal note or task..."
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '12px',
                        background: 'rgba(30, 41, 59, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#fff',
                        fontSize: '12px',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={addActionItem}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '12px',
                        background: '#6366f1',
                        border: 'none',
                        color: '#fff',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Action Items Checklist */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {actions.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '14px',
                        background: item.completed ? 'rgba(30, 41, 59, 0.3)' : 'rgba(30, 41, 59, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        onClick={() => toggleAction(item.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, cursor: 'pointer' }}
                      >
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '6px',
                            border: item.completed ? 'none' : '2px solid rgba(255, 255, 255, 0.3)',
                            background: item.completed ? '#10b981' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {item.completed && <Check size={12} color="#fff" strokeWidth={3} />}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: item.completed ? 'rgba(255, 255, 255, 0.4)' : '#fff',
                              textDecoration: item.completed ? 'line-through' : 'none',
                              lineHeight: 1.4,
                            }}
                          >
                            {item.text}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              color:
                                item.tag === 'decision'
                                  ? '#34d399'
                                  : item.tag === 'idea'
                                  ? '#fbbf24'
                                  : '#818cf8',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              marginTop: '2px',
                            }}
                          >
                            {item.tag}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => deleteActionItem(item.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'rgba(255, 255, 255, 0.3)',
                          cursor: 'pointer',
                          padding: '4px',
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.color = '#ef4444')}
                        onMouseOut={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.3)')}
                      >
                        <Trash2 size={13} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: VISUAL SLIDE REEL */}
            {activeTab === 'slides' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                    Captured Slides ({slides.length})
                  </span>
                  <button
                    onClick={() => {
                      chrome.runtime.sendMessage({ type: MessageType.TRIGGER_SNAPSHOT });
                      setMascotMood('recording');
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: 'rgba(99, 102, 241, 0.2)',
                      border: '1px solid rgba(99, 102, 241, 0.4)',
                      color: '#a5b4fc',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Camera size={12} />
                    <span>Snap Now</span>
                  </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {slides.map((slide) => (
                    <div
                      key={slide.id}
                      style={{
                        borderRadius: '16px',
                        background: 'rgba(30, 41, 59, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <div style={{ position: 'relative', height: '140px', width: '100%', background: '#020617' }}>
                        <img
                          src={slide.imageUrl}
                          alt={slide.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <button
                          onClick={() => copyToClipboard(slide.ocrSnippet || slide.title, slide.id)}
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            padding: '6px',
                            borderRadius: '8px',
                            background: 'rgba(0, 0, 0, 0.6)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                          }}
                        >
                          {copiedId === slide.id ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                        </button>
                      </div>
                      <div style={{ padding: '12px' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                          {slide.title}
                        </h4>
                        {slide.ocrSnippet && (
                          <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.4 }}>
                            {slide.ocrSnippet}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: LIVE TRANSCRIPT */}
            {activeTab === 'transcript' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>
                {/* Search Transcript */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    background: 'rgba(30, 41, 59, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <Search size={14} color="rgba(255, 255, 255, 0.4)" />
                  <input
                    type="text"
                    value={transcriptSearch}
                    onChange={(e) => setTranscriptSearch(e.target.value)}
                    placeholder="Search spoken dialogue..."
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '12px' }}
                  />
                </div>

                {/* Transcript Stream */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {captions
                    .filter((c) => !transcriptSearch || c.text.toLowerCase().includes(transcriptSearch.toLowerCase()))
                    .map((item) => (
                      <div
                        key={item.id}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '12px',
                          background: 'rgba(30, 41, 59, 0.4)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: item.speaker === 'You' ? '#818cf8' : '#38bdf8' }}>
                            {item.speaker}
                          </span>
                          <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)' }}>{item.time}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.4 }}>
                          {item.text}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Live Recording Control Bar */}
          {isRecording && (
            <div
              style={{
                padding: '12px 16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(15, 23, 42, 0.95)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: isPaused ? '#f59e0b' : '#ef4444',
                    animation: isPaused ? 'none' : 'pulse 1.5s infinite',
                  }}
                />
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>
                  {isPaused ? 'PAUSED' : 'RECORDING'}
                </span>
                <span style={{ fontSize: '12px', color: '#a5b4fc', fontWeight: 700, marginLeft: '4px' }}>
                  {formatTimer(recordingSeconds)}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => chrome.runtime.sendMessage({ type: isPaused ? MessageType.RESUME_SESSION : MessageType.PAUSE_SESSION })}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  {isPaused ? <Play size={12} /> : <Pause size={12} />}
                  <span>{isPaused ? 'Resume' : 'Pause'}</span>
                </button>

                <button
                  onClick={() => chrome.runtime.sendMessage({ type: MessageType.STOP_SESSION })}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    background: '#ef4444',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                  }}
                >
                  <Square size={12} />
                  <span>Stop</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
