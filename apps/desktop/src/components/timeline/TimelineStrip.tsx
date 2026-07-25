import { useCallback, useMemo } from 'react';
import { TimelineEvent } from '@/infrastructure/tauri-client';

const EVENT_COLORS: Record<string, string> = {
    slide_change: 'var(--overlay-40)',
    code_appeared: '#4DFF91',
    formula_appeared: '#FFB84D',
    bookmark: 'var(--accent)',
    ai_insight: '#818CF8',
    topic_change: '#F472B6',
    important_explanation: '#38BDF8',
    question_asked: '#818CF8',
};

interface TimelineStripProps {
    events: TimelineEvent[];
    durationMs: number;
    onEventClick?: (event: TimelineEvent) => void;
    currentPositionMs?: number;
}

export function TimelineStrip({ events, durationMs, onEventClick, currentPositionMs }: TimelineStripProps) {
    const getPosition = useCallback((timestampMs: number) => {
        if (durationMs <= 0) return 0;
        return Math.min(100, Math.max(0, (timestampMs / durationMs) * 100));
    }, [durationMs]);

    const eventGroups = useMemo(() => {
        const typeOrder = ['slide_change', 'code_appeared', 'formula_appeared', 'bookmark', 'ai_insight', 'topic_change'];
        return typeOrder.map(type => ({
            type,
            events: events.filter(e => e.eventType === type),
        })).filter(g => g.events.length > 0);
    }, [events]);

    if (events.length === 0) {
        return (
            <div className="flex items-center justify-center py-8" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                No timeline events yet. Start a recording to see the lecture timeline.
            </div>
        );
    }

    return (
        <div className="space-y-4 px-2 py-4 animate-fade-in">
            {/* Timeline track */}
            <div className="relative">
                <div
                    className="relative h-1.5 rounded-full overflow-visible"
                    style={{ background: 'var(--overlay-08)' }}
                >
                    {/* Current position indicator */}
                    {currentPositionMs !== undefined && durationMs > 0 && (
                        <div
                            className="absolute top-0 h-full rounded-full"
                            style={{
                                width: `${getPosition(currentPositionMs)}%`,
                                background: 'linear-gradient(90deg, var(--accent), rgba(166,255,0,0.3))',
                                transition: 'width 0.3s ease',
                            }}
                        />
                    )}

                    {/* Event markers */}
                    {events.map(event => {
                        const color = EVENT_COLORS[event.eventType] || 'var(--text-secondary)';
                        const pos = getPosition(event.timestampMs);

                        return (
                            <button
                                key={event.id}
                                onClick={() => onEventClick?.(event)}
                                className="absolute top-1/2"
                                style={{
                                    left: `${pos}%`,
                                    transform: 'translate(-50%, -50%)',
                                    width: 14,
                                    height: 14,
                                    borderRadius: '50%',
                                    background: color,
                                    border: '2px solid var(--bg)',
                                    cursor: 'pointer',
                                    transition: 'transform 0.15s var(--ease-spring)',
                                    zIndex: 1,
                                }}
                                onMouseEnter={e => (e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.5)')}
                                onMouseLeave={e => (e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)')}
                                title={event.label}
                            />
                        );
                    })}
                </div>

                {/* Time labels */}
                <div className="flex justify-between mt-1.5" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    <span>0:00</span>
                    {durationMs > 0 && (
                        <>
                            <span>{formatTime(durationMs / 2)}</span>
                            <span>{formatTime(durationMs)}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Event list grouped by type */}
            <div className="space-y-3">
                {eventGroups.map(group => {
                    return (
                        <div key={group.type}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium" style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                                    {group.type.replace('_', ' ')} ({group.events.length})
                                </span>
                            </div>
                            <div className="space-y-1 pl-5">
                                {group.events.map(event => (
                                    <button
                                        key={event.id}
                                        onClick={() => onEventClick?.(event)}
                                        className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
                                        style={{ background: 'transparent' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--overlay-04)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <span
                                            className="inline-block rounded px-1.5 py-0.5 font-mono flex-shrink-0"
                                            style={{ fontSize: 10, background: 'var(--overlay-06)', color: 'var(--text-secondary)' }}
                                        >
                                            {event.timestampMs > 0 ? formatTime(event.timestampMs) : '—'}
                                        </span>
                                        <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                                            {event.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
