import { useState, useEffect, useRef } from 'react';
import { Bot, Loader2, Play, Square, BrainCircuit } from 'lucide-react';
import { listen } from '@tauri-apps/api/event';
import { TauriClient } from '@/infrastructure/tauri-client';
import { Markdown as ReactMarkdown } from '@/components/ui/markdown';
import { useSettingsStore } from '@/shared/stores/settingsStore';

export function LiveCopilotWidget() {
  const language = useSettingsStore(state => state.settings?.language || 'en');
  const [isEnabled, setIsEnabled] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  
  const bufferRef = useRef<string>('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let unlisten: () => void;

    const setupListener = async () => {
      unlisten = await listen<{ lectureId: string; content: string }>('live_caption_received', (event) => {
        if (!isEnabled) return;

        // Append to buffer
        bufferRef.current += ' ' + event.payload.content;

        // Reset debounce timer
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
          processBuffer();
        }, 2000); // 2 second pause detection
      });
    };

    setupListener();

    return () => {
      if (unlisten) unlisten();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isEnabled]);

  const processBuffer = async () => {
    const textToProcess = bufferRef.current.trim();
    bufferRef.current = ''; // Clear buffer for next turn immediately

    // Filter out very short utterances (e.g. "yeah", "okay")
    const words = textToProcess.split(/\s+/).filter(w => w.length > 0);
    if (words.length < 5) return;

    setIsThinking(true);
    try {
      const prompt = `You are a stealth interview copilot. 
Read the following transcript snippet that just occurred.
If the speaker is asking a question or prompting the candidate to explain something, output a 3-bullet concise cheat sheet to answer it.
If the speaker is NOT asking a question (just making a statement, filler, or normal talk), output exactly the word: NULL.
Do not output anything else.

CRITICAL INSTRUCTION: You MUST output your entire response natively in the language code: ${language}.

Transcript Snippet:
"${textToProcess}"`;

      const response = await TauriClient.sendGlobalMemoryChat(prompt);
      
      if (response && !response.includes('NULL') && response.trim().length > 5) {
        setAiResponse(response.trim());
      }
    } catch (e) {
      console.error("Copilot processing failed:", e);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="flex flex-col bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm h-full">
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--surface)]/50 shrink-0">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-indigo-500" />
          <h2 className="text-sm font-semibold tracking-wide text-[var(--text-primary)]">Interview Copilot</h2>
        </div>
        <button 
          onClick={() => {
            setIsEnabled(!isEnabled);
            if (isEnabled) {
              setAiResponse(null);
              bufferRef.current = '';
            }
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-xs font-bold tracking-wide ${
            isEnabled 
              ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' 
              : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
          }`}
        >
          {isEnabled ? (
            <><Square className="w-3 h-3 fill-current" /> Stop Listening</>
          ) : (
            <><Play className="w-3 h-3 fill-current" /> Enable Copilot</>
          )}
        </button>
      </div>
      <div className="p-4 flex-1 overflow-y-auto relative">
        {!isEnabled ? (
          <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] p-4 text-center space-y-3">
            <Bot className="w-8 h-8 opacity-20" />
            <p className="text-xs">Copilot is OFF. Enable it during an interview to automatically detect questions and generate live answers.</p>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-emerald-500 bg-emerald-500/10 py-1.5 px-3 rounded-full self-center mb-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Auto-Listening for Pauses...
            </div>
            
            {isThinking && (
              <div className="absolute bottom-4 right-4 bg-indigo-500/10 text-indigo-500 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" /> Analyzing...
              </div>
            )}

            {aiResponse ? (
              <div className="prose prose-sm prose-invert max-w-none text-[var(--text-primary)] animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
                  <h4 className="text-indigo-400 font-bold mb-2 flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4" /> Suggested Answer
                  </h4>
                  <ReactMarkdown>{aiResponse}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-xs text-center px-4">
                Waiting for the interviewer to ask a question...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
