import { useState, useEffect } from 'react';
import { TauriClient } from '@/infrastructure/tauri-client';
import {
  BarChart2, Brain, Loader2, RefreshCw, Zap, MessageCircle, TrendingUp,
  TrendingDown, Minus, Award, Clock, AlignLeft, Sparkles
} from 'lucide-react';

interface AnalyticsTabProps {
  lectureId: string;
  transcript: string | null;
}

const SENTIMENT_COLORS = {
  positive: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40', dot: 'bg-emerald-400' },
  neutral:  { bg: 'bg-blue-500/20',    text: 'text-blue-400',    border: 'border-blue-500/40',    dot: 'bg-blue-400' },
  negative: { bg: 'bg-rose-500/20',    text: 'text-rose-400',    border: 'border-rose-500/40',    dot: 'bg-rose-400' },
};

const SPEAKER_COLORS = [
  'from-violet-500 to-purple-600',
  'from-sky-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
];

function EngagementGauge({ score }: { score: number }) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const angle = (clampedScore / 100) * 180 - 90; // -90 to +90 degrees
  const color = clampedScore >= 70 ? '#10b981' : clampedScore >= 40 ? '#f59e0b' : '#ef4444';
  const label = clampedScore >= 70 ? 'High' : clampedScore >= 40 ? 'Medium' : 'Low';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-16 overflow-hidden">
        {/* Track */}
        <svg viewBox="0 0 120 60" className="w-full h-full">
          <path d="M 10 60 A 50 50 0 0 1 110 60" stroke="#1e2030" strokeWidth="12" fill="none" strokeLinecap="round" />
          <path
            d="M 10 60 A 50 50 0 0 1 110 60"
            stroke={color}
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${(clampedScore / 100) * 157} 157`}
            style={{ transition: 'stroke-dasharray 1s ease, stroke 0.5s ease' }}
          />
          {/* Needle */}
          <line
            x1="60" y1="60"
            x2={60 + 40 * Math.cos((angle - 90) * (Math.PI / 180))}
            y2={60 + 40 * Math.sin((angle - 90) * (Math.PI / 180))}
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            style={{ transition: 'all 1s ease', transformOrigin: '60px 60px' }}
          />
          <circle cx="60" cy="60" r="4" fill="white" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-foreground">{clampedScore}</p>
        <p className="text-xs font-medium" style={{ color }}>{label} Engagement</p>
      </div>
    </div>
  );
}

function SentimentTimeline({ points, durationMs }: { points: any[]; durationMs: number }) {
  if (!points || points.length === 0) return null;
  const width = 600;
  const height = 80;
  const padding = { left: 10, right: 10, top: 10, bottom: 10 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const toX = (ms: number) => padding.left + (ms / (durationMs || 1)) * innerW;
  const toY = (score: number) => padding.top + ((1 - (score + 1) / 2) * innerH); // score -1..1 → y top..bottom

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.timestampMs)} ${toY(p.score)}`).join(' ');
  const areaData = `${pathData} L ${toX(points[points.length-1].timestampMs)} ${padding.top + innerH} L ${padding.left} ${padding.top + innerH} Z`;

  return (
    <div className="w-full overflow-hidden rounded-xl bg-surface/50 border border-border/40 p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={14} className="text-emerald-400" />
        <span className="text-xs font-semibold text-foreground">Sentiment Over Time</span>
        <div className="ml-auto flex items-center gap-3 text-[10px]">
          {(['positive','neutral','negative'] as const).map(s => (
            <span key={s} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${SENTIMENT_COLORS[s].dot}`} />
              <span className="text-muted-foreground capitalize">{s}</span>
            </span>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none" style={{ height: '80px' }}>
        <defs>
          <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        {/* Zero line */}
        <line x1={padding.left} y1={padding.top + innerH/2} x2={padding.left+innerW} y2={padding.top + innerH/2} stroke="#1e2030" strokeWidth="1" strokeDasharray="4,4" />
        <path d={areaData} fill="url(#sentGrad)" />
        <path d={pathData} stroke="#6366f1" strokeWidth="2" fill="none" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={toX(p.timestampMs)} cy={toY(p.score)} r="3"
            fill={p.sentiment === 'positive' ? '#10b981' : p.sentiment === 'negative' ? '#ef4444' : '#3b82f6'} />
        ))}
      </svg>
    </div>
  );
}

export function AnalyticsTab({ lectureId, transcript }: AnalyticsTabProps) {
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async () => {
    if (!transcript) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await TauriClient.analyzeConversation(lectureId);
      setAnalytics(result);
    } catch (e: any) {
      setError(String(e));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Auto-load if transcript is available
    if (transcript && !analytics) {
      loadAnalytics();
    }
  }, [lectureId, transcript]);

  const formatDuration = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  };

  if (!transcript) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
        <BarChart2 className="h-12 w-12 opacity-20" />
        <p className="text-lg font-medium text-foreground">No Transcript Yet</p>
        <p className="text-sm text-center max-w-xs">Analytics will be available once the transcript is processed.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="relative">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <Brain className="h-5 w-5 absolute inset-0 m-auto text-primary/60" />
        </div>
        <p className="text-lg font-medium text-foreground">Analyzing Conversation...</p>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          AI is detecting speakers, analyzing sentiment, and identifying key topics.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Zap className="h-12 w-12 text-destructive opacity-60" />
        <p className="text-sm text-destructive text-center max-w-sm p-3 bg-destructive/10 rounded-lg">{error}</p>
        <button onClick={loadAnalytics} className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 text-sm font-medium transition-colors">
          <RefreshCw size={14} /> Retry Analysis
        </button>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <BarChart2 className="h-12 w-12 text-primary/40" />
        <p className="text-lg font-medium text-foreground">Conversation Analytics</p>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          Analyze speaker talk-time, sentiment, filler words, and engagement metrics.
        </p>
        <button onClick={loadAnalytics} className="mt-2 flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/20 transition-all">
          <Sparkles size={14} /> Run Analysis
        </button>
      </div>
    );
  }

  const fillerWords = analytics.fillerWords as Record<string, number>;
  const totalFillers = Object.values(fillerWords).reduce((a: number, b: any) => a + Number(b), 0);

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 size={18} className="text-[color:var(--accent)]" />
          <h2 className="text-base font-semibold text-foreground">Conversation Analytics</h2>
        </div>
        <button onClick={loadAnalytics} disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors">
          <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} /> Re-analyze
        </button>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Words', value: analytics.totalWords?.toLocaleString() || '—', icon: AlignLeft, color: 'text-blue-400' },
          { label: 'Avg WPM', value: analytics.avgWordsPerMinute ? Math.round(analytics.avgWordsPerMinute) : '—', icon: Zap, color: 'text-amber-400' },
          { label: 'Filler Words', value: totalFillers || '—', icon: MessageCircle, color: 'text-rose-400' },
          { label: 'Longest Talk', value: analytics.longestMonologueMs ? formatDuration(analytics.longestMonologueMs) : '—', icon: Clock, color: 'text-violet-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-surface border border-border/50 rounded-xl p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Icon size={13} className={color} />
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Engagement Score */}
        <div className="bg-surface border border-border/50 rounded-xl p-5 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 w-full mb-1">
            <Award size={14} className="text-amber-400" />
            <span className="text-xs font-semibold text-foreground">Engagement Score</span>
          </div>
          <EngagementGauge score={analytics.engagementScore || 0} />
          {analytics.meetingEffectiveness && (
            <p className="text-[11px] text-muted-foreground text-center mt-1 leading-relaxed line-clamp-3">
              {analytics.meetingEffectiveness}
            </p>
          )}
        </div>

        {/* Speaker Talk-time */}
        <div className="lg:col-span-2 bg-surface border border-border/50 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={14} className="text-indigo-400" />
            <span className="text-xs font-semibold text-foreground">Speaker Talk-time</span>
          </div>
          <div className="space-y-3">
            {(analytics.speakerStats || []).map((speaker: any, i: number) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{speaker.name}</span>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span>{speaker.wordCount?.toLocaleString()} words</span>
                    <span className="font-semibold text-foreground">{Math.round(speaker.percentage)}%</span>
                  </div>
                </div>
                <div className="h-2.5 bg-background rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${SPEAKER_COLORS[i % SPEAKER_COLORS.length]} transition-all duration-1000 ease-out`}
                    style={{ width: `${speaker.percentage}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">{formatDuration(speaker.totalMs)}</p>
              </div>
            ))}
            {(!analytics.speakerStats || analytics.speakerStats.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">Speaker data not available</p>
            )}
          </div>
        </div>
      </div>

      {/* Sentiment Timeline */}
      {analytics.sentimentTimeline && analytics.sentimentTimeline.length > 0 && (
        <SentimentTimeline points={analytics.sentimentTimeline} durationMs={analytics.longestMonologueMs || 3600000} />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Top Topics */}
        {analytics.topTopics && analytics.topTopics.length > 0 && (
          <div className="bg-surface border border-border/50 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-sky-400" />
              <span className="text-xs font-semibold text-foreground">Top Topics</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {analytics.topTopics.map((topic: string, i: number) => (
                <span key={i} className="px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-medium">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Filler Words */}
        {totalFillers > 0 && (
          <div className="bg-surface border border-border/50 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle size={14} className="text-rose-400" />
              <span className="text-xs font-semibold text-foreground">Filler Words</span>
              <span className="ml-auto text-[10px] text-muted-foreground">{totalFillers} total</span>
            </div>
            <div className="space-y-2">
              {Object.entries(fillerWords)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 6)
                .map(([word, count]) => {
                  const pct = ((count as number) / totalFillers) * 100;
                  return (
                    <div key={word} className="flex items-center gap-2">
                      <span className="w-16 text-[11px] font-medium text-foreground truncate">"{word}"</span>
                      <div className="flex-1 h-1.5 bg-background rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500/60 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] text-muted-foreground w-6 text-right">{count as number}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Sentiment Summary Badges */}
      {analytics.sentimentTimeline && analytics.sentimentTimeline.length > 0 && (() => {
        const counts = analytics.sentimentTimeline.reduce((acc: any, p: any) => {
          acc[p.sentiment] = (acc[p.sentiment] || 0) + 1; return acc;
        }, {} as Record<string, number>);
        const dominant = Object.entries(counts).sort(([,a], [,b]) => (b as number) - (a as number))[0];

        return (
          <div className="bg-surface border border-border/50 rounded-xl p-4 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              {dominant?.[0] === 'positive' ? <TrendingUp size={16} className="text-emerald-400" /> :
               dominant?.[0] === 'negative' ? <TrendingDown size={16} className="text-rose-400" /> :
               <Minus size={16} className="text-blue-400" />}
              <span className="text-sm font-medium text-foreground">
                Dominant Tone: <span className={
                  dominant?.[0] === 'positive' ? 'text-emerald-400' :
                  dominant?.[0] === 'negative' ? 'text-rose-400' : 'text-blue-400'
                }>{dominant?.[0] || 'Neutral'}</span>
              </span>
            </div>
            <div className="flex gap-2 ml-auto flex-wrap">
              {Object.entries(counts).map(([s, c]) => {
                const colors = SENTIMENT_COLORS[s as keyof typeof SENTIMENT_COLORS] || SENTIMENT_COLORS.neutral;
                return (
                  <span key={s} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${colors.bg} ${colors.text} ${colors.border}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                    {s}: {c as number}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
