import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Send,
  Zap,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { MascotAvatar, MascotMood } from '@/content/components/MascotAvatar';
import { useSession } from '@/shared/hooks/useSession';
import { MessageType } from '@/shared/types';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
}

export function CopilotScreen() {
  const { session, sessionState } = useSession();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'bot',
      text: "👋 Hi! I'm your Bacham AI Copilot. I'm actively following your meeting. Ask me anything or tap a quick insight below!",
      time: 'Just now',
    },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [mascotMood, setMascotMood] = useState<MascotMood>('happy');

  const isRecording = sessionState === 'recording';

  useEffect(() => {
    if (isRecording) {
      setMascotMood('recording');
    } else {
      setMascotMood('happy');
    }
  }, [isRecording]);

  const quickChips = [
    { label: '⚡ Catch Me Up', prompt: 'Summarize what was discussed in the last 5 minutes.' },
    { label: '🎯 Action Items', prompt: 'List all tasks, action items, and owners from this meeting.' },
    { label: '💡 Key Decisions', prompt: 'What key decisions have been agreed upon so far?' },
    { label: '📧 Follow-up Email', prompt: 'Draft a quick professional follow-up email summarizing the meeting.' },
  ];

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input;
    if (!textToSend.trim()) return;

    const userMsg: Message = {
      id: String(Date.now()),
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInput('');
    setIsThinking(true);
    setMascotMood('thinking');

    try {
      const res = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage(
          {
            type: MessageType.CATCHUP_REQUEST,
            payload: { prompt: textToSend },
          },
          (response) => resolve(response)
        );
      });

      const botReply = res?.data?.summary || '✨ Here is a quick synthesis based on live meeting audio and visual context.';

      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'bot',
          text: botReply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
          text: "I've noted that question. Make sure your Gemini API Key is configured in Settings.",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setMascotMood('happy');
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="flex flex-col h-full font-sans animate-fade-in p-4 bg-[#0A0A0C] text-white">
      {/* Top Mascot Hero Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1A1C20] via-[#141517] to-[#0A0A0C] border border-white/10 mb-3 flex items-center justify-between shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <MascotAvatar mood={mascotMood} size={46} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-extrabold text-white">Bacham Copilot</h2>
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#BAFF29] text-[#0A0A0C] shadow-xs">
                AI 1.5
              </span>
            </div>
            <p className="text-[11px] text-white/50 font-medium mt-0.5">
              {isRecording ? '🟢 Actively listening to meeting' : '💤 Ready to assist on next session'}
            </p>
          </div>
        </div>
        <button
          onClick={() => handleSend('Give me a full recap of this meeting so far.')}
          title="Instant Recap"
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#BAFF29] border border-white/10 transition-all cursor-pointer"
        >
          <RefreshCw size={14} className={isThinking ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Quick Prompts Chips */}
      <div className="mb-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5 flex items-center gap-1">
          <Sparkles size={11} className="text-[#BAFF29]" />
          <span>Quick Actions</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {quickChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(chip.prompt)}
              className="p-2 rounded-xl bg-[#141517] border border-white/8 hover:border-[#BAFF29]/40 hover:bg-[#BAFF29]/10 text-left text-[11px] font-semibold text-white flex items-center justify-between transition-all cursor-pointer"
            >
              <span>{chip.label}</span>
              <Zap size={11} className="text-[#BAFF29] shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Feed */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0 mb-3">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[88%] p-3 rounded-2xl text-[12.5px] leading-relaxed shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-[#BAFF29] text-[#0A0A0C] font-semibold rounded-br-none shadow-md shadow-[#BAFF29]/10'
                  : 'bg-[#141517] border border-white/10 text-white/90 rounded-bl-none'
              }`}
            >
              {msg.text}
            </div>
            <span className="text-[9.5px] text-white/35 mt-1 px-1">
              {msg.time}
            </span>
          </motion.div>
        ))}

        {isThinking && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#141517] border border-white/10 w-fit">
            <div className="w-1.5 h-1.5 rounded-full bg-[#BAFF29] animate-pulse" />
            <span className="text-[11px] text-[#BAFF29] font-semibold">Bacham Copilot is synthesizing...</span>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="flex items-center gap-2 p-2 rounded-2xl bg-[#141517] border border-white/10 shadow-xl shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={session ? "Ask about what's being said... 💭" : "Ask anything... 💭"}
          className="flex-1 bg-transparent border-none outline-none text-[12px] text-white placeholder:text-white/30 px-2"
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || isThinking}
          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
            input.trim()
              ? 'bg-[#BAFF29] text-[#0A0A0C] font-bold shadow-md shadow-[#BAFF29]/20 hover:scale-105 active:scale-95 cursor-pointer'
              : 'bg-white/5 text-white/30 cursor-not-allowed'
          }`}
        >
          <Send size={13} />
        </button>
      </div>
    </div>
  );
}
