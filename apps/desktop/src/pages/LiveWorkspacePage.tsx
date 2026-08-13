import { LiveTranscriptViewer } from '@/components/live/LiveTranscriptViewer';
import { Square, MicVocal, Bot, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TauriClient } from '@/infrastructure/tauri-client';
import { useEffect, useState, useRef } from 'react';
import { getCurrentWindow, LogicalSize, PhysicalPosition } from '@tauri-apps/api/window';
import { currentMonitor } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { motion, AnimatePresence } from 'framer-motion';

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

  const transcriptBufferRef = useRef<string>('');
  const decisionBufferRef = useRef<string>('');
  const isAnalyzingRef = useRef<boolean>(false);
  const isDecisionAnalyzingRef = useRef<boolean>(false);


  // Handle Companion Mode Lifecycle
  useEffect(() => {
    async function setupCompanionMode() {
      try {
        const win = getCurrentWindow();
        // Set always on top so it floats above Chrome/Zoom
        await win.setAlwaysOnTop(true);
        
        // Resize to a wider companion sidebar (e.g. 450x850)
        await win.setSize(new LogicalSize(450, 850));
        
        // Move to right edge of screen
        const monitor = await currentMonitor();
        if (monitor) {
          const x = monitor.size.width - 460; // margin from right
          const y = 40; // margin from top
          await win.setPosition(new PhysicalPosition(x, y));
        }
      } catch (err) {
        console.error("Failed to setup companion mode:", err);
      }
    }

    setupCompanionMode();

    return () => {
      // Restore standard mode on unmount
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
    navigate('/');
    
    TauriClient.stopNativeRecording().catch(e => {
      console.error('Failed to stop recording:', e);
    });
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
      if (buffer.length < 20) return; // Not enough text to analyze yet
      
      isAnalyzingRef.current = true;
      try {
        const result = await TauriClient.analyzeInterviewLive({ transcriptBuffer: buffer });
        
        if (result && result.questionDetected && result.suggestedAnswer) {
          setCopilotAnswers(prev => [...prev, {
            id: Date.now().toString(),
            answer: result.suggestedAnswer!,
            timestamp: Date.now()
          }]);
          // Clear buffer after a successful question detection to wait for the NEXT question
          transcriptBufferRef.current = ''; 
        } else if (buffer.length > 2000) {
          // Prevent buffer from growing infinitely if no questions are detected
          transcriptBufferRef.current = buffer.slice(-1000);
        }
      } catch (err) {
        console.error("Copilot analysis failed:", err);
      } finally {
        isAnalyzingRef.current = false;
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [interviewMode]);

  // Periodic Decision Analysis (Evro style)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (isDecisionAnalyzingRef.current) return;
      const buffer = decisionBufferRef.current.trim();
      if (buffer.length < 50) return; // Wait for enough context
      
      isDecisionAnalyzingRef.current = true;
      try {
        const result = await TauriClient.detectDecisionsLive({ transcriptBuffer: buffer });
        if (result && result.decisionDetected && result.decisionText) {
          setProposedDecisions(prev => [...prev, {
            id: Date.now().toString(),
            text: result.decisionText!,
            timestamp: Date.now()
          }]);
          decisionBufferRef.current = ''; // Reset on success to wait for next decision
        } else if (buffer.length > 3000) {
          decisionBufferRef.current = buffer.slice(-1500); // Prevent infinite growth
        }
      } catch (err) {
        console.error("Decision analysis failed:", err);
      } finally {
        isDecisionAnalyzingRef.current = false;
      }
    }, 15000); // Check every 15 seconds (staggered from Copilot)

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


  return (
    <div className="flex flex-col h-full bg-[var(--bg)] text-[var(--text-primary)] border border-[var(--border)] overflow-hidden shadow-2xl rounded-2xl relative">
      {/* Compact Header */}
      <header className="flex items-center justify-between shrink-0 pl-4 pr-[100px] py-3 bg-[var(--surface)] border-b border-[var(--border)] z-10 window-drag">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          <h1 className="text-sm font-bold tracking-tight">Meeting Active</h1>
        </div>
        <div className="flex items-center gap-4">
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
            className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
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
