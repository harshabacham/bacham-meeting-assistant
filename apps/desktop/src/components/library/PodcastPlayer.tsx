import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Headphones, Loader2 } from 'lucide-react';
import { Button } from '@/components';
import { TauriClient } from '@/infrastructure/tauri-client';

interface PodcastPlayerProps {
    lectureId: string;
    onClose: () => void;
}

export function PodcastPlayer({ lectureId, onClose }: PodcastPlayerProps) {
    const [script, setScript] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [progress, setProgress] = useState(0);
    
    // We will split the script into sentences for highlighting
    const [sentences, setSentences] = useState<string[]>([]);
    const [currentSentenceIndex, setCurrentSentenceIndex] = useState(-1);
    
    const synthRef = useRef(window.speechSynthesis);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            if (synthRef.current) {
                synthRef.current.cancel();
            }
        };
    }, []);

    const generateAndPlay = async () => {
        if (script) {
            startPlayback();
            return;
        }

        setIsGenerating(true);
        try {
            const rawScript = await TauriClient.generatePodcastScript(lectureId);
            setScript(rawScript);
            
            // Split into sentences for better tracking
            const splitRegex = /(?<=[.?!])\s+/;
            const parsed = rawScript.split(splitRegex).filter(s => s.trim().length > 0);
            setSentences(parsed);
            
            setTimeout(() => {
                startPlayback(parsed);
            }, 100);
            
        } catch (e: any) {
            alert("Error generating podcast: " + e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const startPlayback = (texts = sentences) => {
        if (!texts || texts.length === 0) return;
        
        synthRef.current.cancel();
        setIsPlaying(true);
        setIsPaused(false);
        setCurrentSentenceIndex(0);
        setProgress(0);
        
        playSentence(0, texts);
    };

    const playSentence = (index: number, texts: string[]) => {
        if (index >= texts.length) {
            setIsPlaying(false);
            setCurrentSentenceIndex(-1);
            return;
        }

        const text = texts[index];
        setCurrentSentenceIndex(index);
        setProgress((index / texts.length) * 100);

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Try to find a good voice (preferably a natural english one)
        const voices = synthRef.current.getVoices();
        const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha') || v.name.includes('Natural')) || voices[0];
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }
        
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onend = () => {
            playSentence(index + 1, texts);
        };
        
        utterance.onerror = (e) => {
            console.error("Speech synthesis error", e);
            setIsPlaying(false);
        };

        utteranceRef.current = utterance;
        synthRef.current.speak(utterance);
    };

    const togglePause = () => {
        if (isPaused) {
            synthRef.current.resume();
            setIsPaused(false);
        } else {
            synthRef.current.pause();
            setIsPaused(true);
        }
    };

    const stopPlayback = () => {
        synthRef.current.cancel();
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentSentenceIndex(-1);
        setProgress(0);
    };

    return (
        <div className="fixed bottom-6 right-6 w-96 bg-background/90 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col animate-in slide-in-from-bottom-10">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-border/50 bg-surface/50">
                <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                    <div className="w-6 h-6 rounded-md bg-purple-500/20 text-purple-500 flex items-center justify-center">
                        <Headphones size={14} />
                    </div>
                    Podcast Mode
                </div>
                <button onClick={() => { stopPlayback(); onClose(); }} className="text-muted-foreground hover:text-foreground">
                    <Square size={14} className="opacity-0 absolute" /> {/* just to import it */}
                    ✕
                </button>
            </div>

            {/* Content Area */}
            <div className="p-4 flex-1 h-48 overflow-y-auto scrollbar-hide text-sm leading-relaxed">
                {!script && !isGenerating ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                        <Headphones size={24} className="opacity-50" />
                        <p className="text-center text-xs px-4">Generate an AI-hosted podcast script from this lecture's summary to listen on the go.</p>
                        <Button onClick={generateAndPlay} className="bg-purple-600 hover:bg-purple-700 text-white mt-2">
                            Generate & Play
                        </Button>
                    </div>
                ) : isGenerating ? (
                    <div className="h-full flex flex-col items-center justify-center text-purple-500 gap-3">
                        <Loader2 size={24} className="animate-spin" />
                        <p className="text-xs font-medium">Writing podcast script...</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {sentences.map((sent, i) => (
                            <span 
                                key={i} 
                                className={`transition-colors duration-200 ${i === currentSentenceIndex ? 'bg-purple-500/20 text-purple-200 font-medium rounded px-1 -mx-1' : 'text-foreground/80'} `}
                            >
                                {sent}{' '}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Controls */}
            {(script || isPlaying) && (
                <div className="p-3 border-t border-border/50 bg-surface/80">
                    <div className="w-full h-1 bg-surface-raised rounded-full mb-3 overflow-hidden">
                        <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="flex items-center justify-center gap-4">
                        <button 
                            onClick={isPlaying ? togglePause : () => startPlayback(sentences)}
                            className="w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
                        >
                            {isPlaying && !isPaused ? <Pause size={18} /> : <Play size={18} className="ml-1" />}
                        </button>
                        <button 
                            onClick={stopPlayback}
                            disabled={!isPlaying}
                            className={`p-2 rounded-full transition-colors ${isPlaying ? 'text-muted-foreground hover:bg-surface-raised hover:text-foreground' : 'text-muted-foreground/30'}`}
                        >
                            <Square size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
