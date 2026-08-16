import { LiveTranscriptViewer } from '@/components/live/LiveTranscriptViewer';
import { Square, MicVocal, Bot, Sparkles, Volume2, VolumeX, ChevronDown, Check, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TauriClient } from '@/infrastructure/tauri-client';
import { useEffect, useState, useRef } from 'react';
import { getCurrentWindow, LogicalSize, PhysicalPosition } from '@tauri-apps/api/window';
import { currentMonitor } from '@tauri-apps/api/window';
import { listen, emit } from '@tauri-apps/api/event';
import { motion, AnimatePresence } from 'framer-motion';
import { encodeWavBase64 } from '@/utils/wavEncoder';

const MULTILINGUAL_CATALOG = [
    { code: 'auto', label: 'Auto Detect (99+ Languages)', nativeName: 'Automatic', flag: '🌐', bcp: 'en-US' },
    { code: 'te', label: 'Telugu (తెలుగు)', nativeName: 'తెలుగు', flag: '🇮🇳', bcp: 'te-IN' },
    { code: 'hi', label: 'Hindi (हिन्दी)', nativeName: 'हिन्दी', flag: '🇮🇳', bcp: 'hi-IN' },
    { code: 'en', label: 'English (US/UK/Global)', nativeName: 'English', flag: '🇺🇸', bcp: 'en-US' },
    { code: 'ta', label: 'Tamil (தமிழ்)', nativeName: 'தமிழ்', flag: '🇮🇳', bcp: 'ta-IN' },
    { code: 'kn', label: 'Kannada (ಕನ್ನಡ)', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳', bcp: 'kn-IN' },
    { code: 'ml', label: 'Malayalam (മലയാളം)', nativeName: 'മലയാളം', flag: '🇮🇳', bcp: 'ml-IN' },
    { code: 'bn', label: 'Bengali (বাংলা)', nativeName: 'বাংলা', flag: '🇮🇳', bcp: 'bn-IN' },
    { code: 'mr', label: 'Marathi (मराठी)', nativeName: 'मराठी', flag: '🇮🇳', bcp: 'mr-IN' },
    { code: 'gu', label: 'Gujarati (ગુજરાતી)', nativeName: 'ગુજરાતી', flag: '🇮🇳', bcp: 'gu-IN' },
    { code: 'pa', label: 'Punjabi (ਪੰਜਾਬੀ)', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳', bcp: 'pa-IN' },
    { code: 'es', label: 'Spanish (Español)', nativeName: 'Español', flag: '🇪🇸', bcp: 'es-ES' },
    { code: 'fr', label: 'French (Français)', nativeName: 'Français', flag: '🇫🇷', bcp: 'fr-FR' },
    { code: 'de', label: 'German (Deutsch)', nativeName: 'Deutsch', flag: '🇩🇪', bcp: 'de-DE' },
    { code: 'ja', label: 'Japanese (日本語)', nativeName: '日本語', flag: '🇯🇵', bcp: 'ja-JP' },
    { code: 'zh', label: 'Chinese (中文)', nativeName: '中文', flag: '🇨🇳', bcp: 'zh-CN' },
    { code: 'ar', label: 'Arabic (العربية)', nativeName: 'العربية', flag: '🇸🇦', bcp: 'ar-SA' },
];

interface CopilotAnswer {
  id: string;
  answer: string;
  timestamp: number;
}

interface Decision {
  id: string;
  text: string;
  timestamp: number;
}

export function LiveWorkspacePage() {
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const lectureId = searchParams.get('id');

  const [interviewMode, setInterviewMode] = useState(false);
  const [notes, setNotes] = useState('');
  const [copilotAnswers, setCopilotAnswers] = useState<CopilotAnswer[]>([]);
  const [proposedDecisions, setProposedDecisions] = useState<Decision[]>([]);
  const [, setConfirmedCount] = useState(0);
  const [isSystemAudioActive, setIsSystemAudioActive] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [langSearch, setLangSearch] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);

  const transcriptBufferRef = useRef<string>('');
  const decisionBufferRef = useRef<string>('');
  const isAnalyzingRef = useRef<boolean>(false);
  const isDecisionAnalyzingRef = useRef<boolean>(false);
  const systemStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mixedDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const speechRecRef = useRef<any>(null);

  const activeLangObj = MULTILINGUAL_CATALOG.find(l => l.code === selectedLanguage) || MULTILINGUAL_CATALOG[0];

  const toggleSystemAudio = async () => {
    if (isSystemAudioActive) {
      if (systemStreamRef.current) {
        systemStreamRef.current.getTracks().forEach(t => t.stop());
        systemStreamRef.current = null;
      }
      setIsSystemAudioActive(false);
      return;
    }
    try {
      const sysStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      });
      systemStreamRef.current = sysStream;
      setIsSystemAudioActive(true);

      if (audioCtxRef.current && mixedDestRef.current) {
        try {
          const sysSource = audioCtxRef.current.createMediaStreamSource(sysStream);
          sysSource.connect(mixedDestRef.current);
        } catch (err) {
          console.warn("Error connecting sysSource to mixer:", err);
        }
      }

      sysStream.getVideoTracks().forEach(track => track.stop());

      if (sysStream.getAudioTracks().length > 0) {
        sysStream.getAudioTracks()[0].onended = () => {
          setIsSystemAudioActive(false);
          systemStreamRef.current = null;
        };
      }
    } catch (err) {
      console.warn("System audio share notice:", err);
    }
  };

  // Live Hardware Audio Capture & Multimodal Gemini Slicing Pipeline
  useEffect(() => {
    TauriClient.startNativeRecording().catch(console.error);

    // 1. High-Accuracy Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = activeLangObj.bcp;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event: any) => {
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              const text = event.results[i][0].transcript.trim();
              if (text) {
                emit('live_caption_received', {
                  sessionId: lectureId || 'live-session',
                  text,
                  timestamp: Date.now(),
                  platform: 'desktop'
                }).catch(() => {});
              }
            }
          }
        };
        recognition.start();
        speechRecRef.current = recognition;
      } catch (err) {
        console.warn("WebSpeech init notice:", err);
      }
    }

    // 2. High-Precision 16kHz PCM WAV Audio Streaming Pipeline
    let mediaStream: MediaStream | null = null;
    let audioCtx: AudioContext | null = null;
    let processor: ScriptProcessorNode | null = null;
    let isTranscribingChunk = false;
    let pcmBuffer: number[] = [];
    let windowMaxRms = 0;

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
          channelCount: 1
        }
      }).then((stream) => {
        mediaStream = stream;
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          audioCtx = new AudioContextClass({ sampleRate: 16000 });
          audioCtxRef.current = audioCtx;
          if (audioCtx.state === 'suspended') {
            audioCtx.resume();
          }

          const micSource = audioCtx.createMediaStreamSource(stream);
          processor = audioCtx.createScriptProcessor(4096, 1, 1);

          processor.onaudioprocess = async (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            
            let sum = 0;
            for (let i = 0; i < inputData.length; i++) {
              const val = inputData[i];
              sum += val * val;
              pcmBuffer.push(val);
            }
            const rms = Math.sqrt(sum / inputData.length);
            if (rms > windowMaxRms) windowMaxRms = rms;
            setAudioLevel(Math.min(100, Math.round(rms * 600)));

            // When buffer reaches ~2.0s (32,000 samples at 16kHz)
            if (pcmBuffer.length >= 32000) {
              const samplesToProcess = pcmBuffer.slice(0, 32000);
              // Keep 3200 samples (200ms) overlap to avoid cutting words on boundary
              pcmBuffer = pcmBuffer.slice(28800);
              const hadVoice = windowMaxRms > 0.006;
              windowMaxRms = 0;

              if (hadVoice && !isTranscribingChunk) {
                isTranscribingChunk = true;
                try {
                  const floatArr = new Float32Array(samplesToProcess);
                  const wavBase64 = encodeWavBase64(floatArr, 16000);
                  const res = await TauriClient.transcribeLiveAudioChunk(wavBase64, 'audio/wav', selectedLanguage);
                  
                  if (res && res.text && res.text.trim()) {
                    const trimmed = res.text.trim();
                    emit('live_caption_received', {
                      sessionId: lectureId || 'live-session',
                      text: trimmed,
                      timestamp: Date.now(),
                      platform: 'desktop'
                    }).catch(() => {});
                  }
                } catch (apiErr) {
                  console.warn("PCM WAV Transcription error:", apiErr);
                } finally {
                  isTranscribingChunk = false;
                }
              }
            }
          };

          micSource.connect(processor);
          processor.connect(audioCtx.destination);
        } catch (err) {
          console.warn("AudioContext setup notice:", err);
        }
      }).catch(err => {
        console.warn("Mic access notice:", err);
      });
    }

    return () => {
      TauriClient.stopNativeRecording().catch(console.error);
      if (speechRecRef.current) {
        try { speechRecRef.current.stop(); } catch (_) {}
        speechRecRef.current = null;
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach(t => t.stop());
      }
      if (processor) {
        try { processor.disconnect(); } catch (_) {}
      }
    };
  }, [selectedLanguage, lectureId]);

  // Handle Companion Mode Lifecycle
  useEffect(() => {
    async function setupCompanionMode() {
      try {
        const win = getCurrentWindow();
        await win.setAlwaysOnTop(true);
        await win.setSize(new LogicalSize(480, 850));
        
        const monitor = await currentMonitor();
        if (monitor) {
          const x = monitor.size.width - 490;
          const y = 40;
          await win.setPosition(new PhysicalPosition(x, y));
        }
      } catch (err) {
        console.error("Failed to setup companion mode:", err);
      }
    }

    setupCompanionMode();

    return () => {
      async function restoreMode() {
        try {
          const win = getCurrentWindow();
          await win.setAlwaysOnTop(false);
          await win.setSize(new LogicalSize(1200, 800));
          await win.center();
        } catch (err) {
          console.error("Failed to restore window mode:", err);
        }
      }
      restoreMode();
    };
  }, []);

  const handleStopRecording = () => {
    sessionStorage.setItem('ignore_live_nav', 'true');
    if (systemStreamRef.current) {
      systemStreamRef.current.getTracks().forEach(t => t.stop());
      systemStreamRef.current = null;
    }
    TauriClient.stopNativeRecording().catch(console.error);
    navigate('/');
  };

  // Listen to live transcripts for Copilot and Decision Tracker
  useEffect(() => {
    const unlistenCaption = listen<{text: string}>('live_caption_received', (event) => {
      if (interviewMode) {
        transcriptBufferRef.current += " " + event.payload.text;
      }
      decisionBufferRef.current += " " + event.payload.text;
    });
    return () => {
      unlistenCaption.then(f => f());
    };
  }, [interviewMode]);

  // Periodic Copilot Analysis
  useEffect(() => {
    if (!interviewMode) return;
    
    const interval = setInterval(async () => {
      if (isAnalyzingRef.current) return;
      const buffer = transcriptBufferRef.current.trim();
      if (buffer.length < 20) return;
      
      isAnalyzingRef.current = true;
      try {
        const result = await TauriClient.analyzeInterviewLive({ transcriptBuffer: buffer });
        
        if (result && result.questionDetected && result.suggestedAnswer) {
          setCopilotAnswers(prev => [...prev, {
            id: Date.now().toString(),
            answer: result.suggestedAnswer!,
            timestamp: Date.now()
          }]);
          transcriptBufferRef.current = ''; 
        } else if (buffer.length > 2000) {
          transcriptBufferRef.current = buffer.slice(-1000);
        }
      } catch (err) {
        console.error("Copilot analysis failed:", err);
      } finally {
        isAnalyzingRef.current = false;
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [interviewMode]);

  // Periodic Decision Analysis
  useEffect(() => {
    const interval = setInterval(async () => {
      if (isDecisionAnalyzingRef.current) return;
      const buffer = decisionBufferRef.current.trim();
      if (buffer.length < 50) return;
      
      isDecisionAnalyzingRef.current = true;
      try {
        const result = await TauriClient.detectDecisionsLive({ transcriptBuffer: buffer });
        if (result && result.decisionDetected && result.decisionText) {
          setProposedDecisions(prev => [...prev, {
            id: Date.now().toString(),
            text: result.decisionText!,
            timestamp: Date.now()
          }]);
          decisionBufferRef.current = '';
        } else if (buffer.length > 3000) {
          decisionBufferRef.current = buffer.slice(-1500);
        }
      } catch (err) {
        console.error("Decision analysis failed:", err);
      } finally {
        isDecisionAnalyzingRef.current = false;
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const handleConfirmDecision = async (id: string, text: string) => {
    try {
      await TauriClient.confirmLiveDecision({ lectureId: lectureId!, decisionText: text });
      setProposedDecisions(prev => prev.filter(d => d.id !== id));
      setConfirmedCount(c => c + 1);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectDecision = (id: string) => {
    setProposedDecisions(prev => prev.filter(d => d.id !== id));
  };

  const filteredLanguages = MULTILINGUAL_CATALOG.filter(l => 
    l.label.toLowerCase().includes(langSearch.toLowerCase()) || 
    l.nativeName.toLowerCase().includes(langSearch.toLowerCase())
  );


  return (
    <div className="flex flex-col h-full bg-[var(--bg)] text-[var(--text-primary)] border border-[var(--border)] overflow-hidden shadow-2xl rounded-2xl relative">
      {/* Compact Header */}
      <header className="flex items-center justify-between shrink-0 pl-4 pr-[100px] py-3 bg-[var(--surface)] border-b border-[var(--border)] z-10 window-drag">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          <h1 className="text-sm font-bold tracking-tight">Meeting Active</h1>
          
          {/* Live Audio Level Visualizer */}
          <div className="flex items-center gap-0.5 h-3.5 px-1 ml-1" title={`Input Level: ${audioLevel}%`}>
            <span className="w-1 bg-emerald-500 rounded-full transition-all duration-75" style={{ height: `${Math.max(3, Math.min(14, audioLevel * 0.2 + 3))}px` }} />
            <span className="w-1 bg-emerald-500 rounded-full transition-all duration-75" style={{ height: `${Math.max(4, Math.min(14, audioLevel * 0.3 + 4))}px` }} />
            <span className="w-1 bg-emerald-500 rounded-full transition-all duration-75" style={{ height: `${Math.max(3, Math.min(14, audioLevel * 0.22 + 3))}px` }} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* System Audio Toggle */}
          <button
            type="button"
            onClick={toggleSystemAudio}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
              isSystemAudioActive
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-[var(--surface-hover)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)]'
            }`}
            title={isSystemAudioActive ? "System & Speaker Voice Active (Zoom/Meet)" : "Click to Capture System/Speaker Audio"}
          >
            {isSystemAudioActive ? <Volume2 size={12} className="text-emerald-400 animate-pulse" /> : <VolumeX size={12} />}
            <span>{isSystemAudioActive ? 'System Voice: ON' : '+ System Voice'}</span>
          </button>

          {/* Language Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-[var(--text-primary)] bg-[var(--surface-hover)] border border-[var(--border)] cursor-pointer"
            >
              <span>{activeLangObj.flag}</span>
              <span>{activeLangObj.label.split(' ')[0]}</span>
              <ChevronDown size={10} className="text-[var(--text-muted)]" />
            </button>

            {isLangMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-60 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl p-2 z-50">
                <div className="relative mb-2">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={langSearch}
                    onChange={e => setLangSearch(e.target.value)}
                    placeholder="Search languages..."
                    className="w-full pl-7 pr-2 py-1 rounded-md bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                    autoFocus
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {filteredLanguages.map(l => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => { setSelectedLanguage(l.code); setIsLangMenuOpen(false); }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center justify-between cursor-pointer ${
                        selectedLanguage === l.code ? 'text-[var(--accent)] bg-[var(--surface-hover)] font-semibold' : 'text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span>{l.flag}</span>
                        <span className="truncate">{l.label}</span>
                      </div>
                      {selectedLanguage === l.code && <Check size={12} className="text-[var(--accent)]" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setInterviewMode(!interviewMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${
              interviewMode
                ? 'bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                : 'bg-[var(--surface-hover)] text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'
            }`}
          >
            <MicVocal className="w-3.5 h-3.5" />
            Interview Mode
          </button>
          
          <button 
            onClick={handleStopRecording}
            className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            <Square className="w-3 h-3 fill-current" />
            Stop
          </button>
        </div>
      </header>

      {/* Split View: Notepad (Top) and Transcript (Bottom) */}
      <div className="flex-1 min-h-0 flex flex-col bg-[var(--surface)]">
        
        {/* Top Pane: Notes OR Copilot */}
        <div className="flex-1 flex flex-col min-h-[40%] border-b border-[var(--border)] relative overflow-hidden bg-[var(--surface)]">
          {interviewMode ? (
            <div className="absolute inset-0 flex flex-col p-4 z-10 overflow-y-auto scrollbar-hide">
              <div className="flex items-center gap-2 mb-4 shrink-0">
                 <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                   <Sparkles className="w-4 h-4 text-purple-400" />
                 </div>
                 <div>
                   <h2 className="text-sm font-bold text-foreground">AI Copilot</h2>
                   <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Listening to interviewer...</p>
                 </div>
              </div>
              
              <div className="flex-1 flex flex-col gap-4">
                <AnimatePresence>
                  {copilotAnswers.map((item) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="bg-primary/5 border border-primary/20 rounded-xl p-4 shadow-sm"
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <Bot className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-bold text-primary">Suggested Answer</span>
                      </div>
                      <div className="text-sm text-foreground prose-sm prose-p:my-1 prose-ul:my-1 prose-li:my-0 whitespace-pre-wrap leading-relaxed">
                        {item.answer}
                      </div>
                    </motion.div>
                  ))}
                  {copilotAnswers.length === 0 && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex-1 flex flex-col items-center justify-center text-center opacity-50 pt-8"
                    >
                      <MicVocal className="w-8 h-8 mb-2" />
                      <p className="text-xs max-w-[200px]">Waiting for the interviewer to ask a question...</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <>
              <div className="absolute top-3 left-4 right-4 flex justify-between items-center pointer-events-none">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Meeting Notes</span>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Jot down important thoughts here..."
                className="w-full flex-1 bg-transparent border-none resize-none p-4 pt-10 text-sm leading-relaxed text-[var(--text-primary)] focus:ring-0 placeholder:text-[var(--text-muted)] outline-none scrollbar-hide"
                spellCheck={false}
              />
            </>
          )}
        </div>

        {/* Live Transcript View */}
        <div className="flex-[1.2] relative overflow-hidden flex flex-col bg-[var(--bg)]">
          <div className="absolute top-3 left-4 right-4 flex justify-between items-center z-10 pointer-events-none bg-gradient-to-b from-[var(--bg)] via-[var(--bg)] to-transparent pb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
               <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
               Live Transcript
            </span>
          </div>
          <div className="flex-1 overflow-hidden pt-8">
            <LiveTranscriptViewer />
          </div>
        </div>
      </div>
      {/* Floating Decision Tracker UI */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-3 z-50 pointer-events-none w-80">
        <AnimatePresence>
          {proposedDecisions.map(decision => (
            <motion.div
              key={decision.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-surface/90 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] shadow-blue-500/10 pointer-events-auto"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-xs font-bold tracking-wider text-blue-500 uppercase">Decision Proposed</span>
                </div>
              </div>
              <p className="text-sm font-medium text-foreground leading-relaxed mb-4">
                "{decision.text}"
              </p>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleConfirmDecision(decision.id, decision.text)}
                  className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg shadow-sm active:scale-95 transition-all"
                >
                  Confirm
                </button>
                <button 
                  onClick={() => handleRejectDecision(decision.id)}
                  className="flex-1 py-2 bg-foreground/5 hover:bg-foreground/10 text-foreground text-xs font-semibold rounded-lg active:scale-95 transition-all"
                >
                  Reject
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
