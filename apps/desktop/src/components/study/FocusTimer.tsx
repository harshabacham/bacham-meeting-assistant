import { useState, useEffect } from 'react';
import { Play, Square, TimerReset } from 'lucide-react';
import { cn } from '@/components';

export function FocusTimer() {
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isRunning, setIsRunning] = useState(false);
    const [mode, setMode] = useState<'focus' | 'break'>('focus');

    const totalTime = mode === 'focus' ? 25 * 60 : 5 * 60;
    const progress = ((totalTime - timeLeft) / totalTime) * 100;

    useEffect(() => {
        let timer: any;
        if (isRunning && timeLeft > 0) {
            timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        } else if (isRunning && timeLeft === 0) {
            setIsRunning(false);
            const msg = mode === 'focus' ? "Focus session complete! Time for a 5-minute break." : "Break is over! Ready to focus?";
            
            // Try to notify the user natively
            if ('Notification' in window) {
                if (Notification.permission === 'granted') {
                    new Notification("BACHAM Timer", { body: msg });
                } else if (Notification.permission !== 'denied') {
                    Notification.requestPermission().then(permission => {
                        if (permission === 'granted') new Notification("BACHAM Timer", { body: msg });
                    });
                }
            } else {
                alert(msg);
            }

            if (mode === 'focus') {
                setMode('break');
                setTimeLeft(5 * 60);
            } else {
                setMode('focus');
                setTimeLeft(25 * 60);
            }
        }
        return () => clearInterval(timer);
    }, [isRunning, timeLeft, mode]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleReset = () => {
        setIsRunning(false);
        setTimeLeft(mode === 'focus' ? 25 * 60 : 5 * 60);
    };

    return (
        <div className="card p-6 flex flex-col items-center justify-center relative overflow-hidden h-full">
            <h3 className="text-sm font-semibold mb-6 flex items-center gap-2">
                {mode === 'focus' ? '🎯 Focus Session' : '☕ Break Time'}
            </h3>
            
            <div className="relative w-40 h-40 flex items-center justify-center mb-6">
                <svg className="absolute inset-0 w-full h-full progress-ring" viewBox="0 0 100 100">
                    <circle
                        className="progress-ring-track"
                        cx="50" cy="50" r="45"
                        fill="transparent"
                        strokeWidth="4"
                    />
                    <circle
                        className="progress-ring-fill"
                        cx="50" cy="50" r="45"
                        fill="transparent"
                        strokeWidth="4"
                        strokeDasharray={283}
                        strokeDashoffset={283 - (283 * progress) / 100}
                        style={{ stroke: mode === 'focus' ? 'var(--accent)' : 'var(--success)' }}
                    />
                </svg>
                <div className="text-4xl font-mono font-bold tracking-tight z-10 text-[var(--text-primary)]">
                    {formatTime(timeLeft)}
                </div>
            </div>

            <div className="flex gap-3 z-10">
                <button 
                    className={cn(
                        "btn w-12 h-12 rounded-full flex items-center justify-center",
                        isRunning ? "btn-danger" : "btn-primary"
                    )}
                    onClick={() => setIsRunning(!isRunning)}
                >
                    {isRunning ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
                </button>
                <button 
                    className="btn btn-secondary w-12 h-12 rounded-full flex items-center justify-center"
                    onClick={handleReset}
                >
                    <TimerReset size={18} />
                </button>
            </div>
            
            <div className="absolute top-0 right-0 p-4">
                <button 
                    className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors uppercase tracking-wider font-bold"
                    onClick={() => {
                        const newMode = mode === 'focus' ? 'break' : 'focus';
                        setMode(newMode);
                        setTimeLeft(newMode === 'focus' ? 25 * 60 : 5 * 60);
                        setIsRunning(false);
                    }}
                >
                    Skip to {mode === 'focus' ? 'Break' : 'Focus'}
                </button>
            </div>
        </div>
    );
}
