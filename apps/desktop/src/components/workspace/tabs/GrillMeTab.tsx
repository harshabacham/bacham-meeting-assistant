import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Mic, Send, Play, Square, Loader2, Bot, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/shared/utils/cn';

interface GrillMeTabProps {
  lectureId: string;
}

interface Message {
  role: 'ai' | 'user';
  text: string;
}

export function GrillMeTab({ lectureId }: GrillMeTabProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    
    // Initialize Web Speech API for Speech-to-Text
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        handleSend(transcript);
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const speakText = (text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel(); // Stop any current speech
    
    const utterance = new SpeechSynthesisUtterance(text);
    // Try to find a good authoritative voice
    const voices = synthRef.current.getVoices();
    const englishVoices = voices.filter(v => v.lang.startsWith('en'));
    if (englishVoices.length > 0) {
      utterance.voice = englishVoices.find(v => v.name.includes('Google') || v.name.includes('Microsoft')) || englishVoices[0];
    }
    
    utterance.rate = 1.0;
    utterance.pitch = 0.9; // Slightly lower pitch for professor persona
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    
    synthRef.current.speak(utterance);
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      if (synthRef.current) synthRef.current.cancel();
      setInputText("");
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const startRoleplay = async () => {
    setHasStarted(true);
    handleSend("I am ready to begin the oral exam. Ask me the first question.");
  };

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || inputText;
    if (!textToSend.trim()) return;

    if (synthRef.current) synthRef.current.cancel();

    const userMsg: Message = { role: 'user', text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsThinking(true);

    try {
      const response = await invoke<string>('grill_me_interaction', {
        lectureId,
        userMessage: textToSend,
        history: [] 
      });
      
      const aiMsg: Message = { role: 'ai', text: response };
      setMessages(prev => [...prev, aiMsg]);
      speakText(response);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'ai', text: "I'm having trouble connecting right now." }]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {!hasStarted ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 border border-primary/30">
            <Bot size={48} className="text-primary" />
          </div>
          <h2 className="text-2xl font-bold font-serif mb-3">Grill Me Mode 🎙️</h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Ready to defend your knowledge? The AI will adopt the persona of a rigorous professor and verbally quiz you on this lecture. Speak your answers aloud.
          </p>
          <button 
            onClick={startRoleplay}
            className="px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-full hover:scale-105 transition-transform flex items-center gap-2 shadow-lg shadow-primary/20"
          >
            <Play size={18} />
            Start Oral Exam
          </button>
        </div>
      ) : (
        <>
          {/* Visualizer Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={cn(
                    "max-w-[80%] rounded-2xl p-4 flex gap-3 items-start",
                    msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-surface border border-border text-foreground"
                  )}>
                    <div className="shrink-0 mt-0.5">
                      {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    <p className="text-[15px] leading-relaxed font-medium">{msg.text}</p>
                  </div>
                </motion.div>
              ))}
              {isThinking && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-surface border border-border p-4 rounded-2xl flex items-center gap-2 text-muted-foreground">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm">Professor is evaluating...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Voice Controls */}
          <div className="p-6 border-t border-border bg-surface-raised flex flex-col items-center gap-4">
            <div className="relative">
              {isRecording && (
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }} 
                  animate={{ scale: 1.5, opacity: 0 }} 
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute inset-0 bg-red-500 rounded-full z-0" 
                />
              )}
              {isSpeaking && !isRecording && (
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0.5 }} 
                  animate={{ scale: 1.2, opacity: 0 }} 
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 bg-primary rounded-full z-0" 
                />
              )}
              <button
                onClick={toggleRecording}
                disabled={isThinking || isSpeaking}
                className={cn(
                  "relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl",
                  isRecording ? "bg-red-500 text-white hover:bg-red-600 scale-110" : 
                  isSpeaking ? "bg-surface border-2 border-primary text-primary" :
                  "bg-surface border border-border text-foreground hover:bg-surface-hover hover:scale-105"
                )}
              >
                {isRecording ? <Square size={28} /> : <Mic size={28} />}
              </button>
            </div>
            
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
              {isRecording ? 'Listening...' : isSpeaking ? 'Professor speaking...' : 'Tap to speak'}
            </p>

            {/* Fallback Text Input */}
            <div className="w-full max-w-lg mt-4 flex gap-2">
              <input 
                type="text" 
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Or type your answer here..."
                className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50"
                disabled={isRecording || isThinking}
              />
              <button 
                onClick={() => handleSend()}
                disabled={!inputText.trim() || isRecording || isThinking}
                className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center disabled:opacity-50 hover:bg-primary/20"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
