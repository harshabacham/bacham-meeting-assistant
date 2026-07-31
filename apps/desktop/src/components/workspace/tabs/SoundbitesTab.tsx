import { useState, useEffect } from 'react';
import { Scissors, Play, Trash2, Plus, Clock, Music2, Loader2 } from 'lucide-react';
import { TauriClient } from '@/infrastructure/tauri-client';

interface SoundbitesTabProps {
  lectureId: string;
  onJumpToTime: (ms: number) => void;
}

const COLORS = [
  { label: 'Indigo', value: 'indigo', bg: 'bg-indigo-500/15', border: 'border-indigo-500/30', text: 'text-indigo-400', dot: 'bg-indigo-400' },
  { label: 'Rose', value: 'rose', bg: 'bg-rose-500/15', border: 'border-rose-500/30', text: 'text-rose-400', dot: 'bg-rose-400' },
  { label: 'Emerald', value: 'emerald', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  { label: 'Amber', value: 'amber', bg: 'bg-amber-500/15', border: 'border-amber-500/30', text: 'text-amber-400', dot: 'bg-amber-400' },
  { label: 'Sky', value: 'sky', bg: 'bg-sky-500/15', border: 'border-sky-500/30', text: 'text-sky-400', dot: 'bg-sky-400' },
];

const getColor = (value: string) => COLORS.find(c => c.value === value) || COLORS[0];

function formatMs(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface Soundbite {
  id: string;
  lectureId: string;
  title: string;
  startMs: number;
  endMs: number;
  transcriptExcerpt: string;
  color: string;
  createdAt: string;
}

export function SoundbitesTab({ lectureId, onJumpToTime }: SoundbitesTabProps) {
  const [soundbites, setSoundbites] = useState<Soundbite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newStartMs, setNewStartMs] = useState('');
  const [newEndMs, setNewEndMs] = useState('');
  const [newColor, setNewColor] = useState('indigo');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await TauriClient.soundbitesList(lectureId);
      setSoundbites(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [lectureId]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const startMs = parseTimeInput(newStartMs);
    const endMs = parseTimeInput(newEndMs);
    if (endMs <= startMs) return;
    setIsCreating(true);
    try {
      const sb = await TauriClient.soundbitesCreate(lectureId, newTitle.trim(), startMs, endMs, '', newColor);
      setSoundbites(prev => [...prev, sb].sort((a, b) => a.startMs - b.startMs));
      setNewTitle('');
      setNewStartMs('');
      setNewEndMs('');
      setNewColor('indigo');
      setShowCreateForm(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSoundbites(prev => prev.filter(s => s.id !== id));
    await TauriClient.soundbitesDelete(id).catch(console.error);
  };

  // Parse m:ss or raw seconds
  function parseTimeInput(input: string): number {
    if (!input) return 0;
    if (input.includes(':')) {
      const [m, s] = input.split(':').map(Number);
      return ((m || 0) * 60 + (s || 0)) * 1000;
    }
    return parseFloat(input) * 1000;
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scissors size={18} className="text-[color:var(--accent)]" />
          <h2 className="text-base font-semibold text-foreground">Soundbites</h2>
          <span className="text-xs text-muted-foreground">({soundbites.length})</span>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-medium shadow-sm shadow-indigo-500/20 transition-all"
        >
          <Plus size={13} /> New Soundbite
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-surface border border-border/50 rounded-2xl p-4 space-y-3 shadow-lg">
          <p className="text-xs font-semibold text-foreground mb-1">Create Soundbite</p>
          <input
            type="text"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Title (e.g. 'Key Decision on Roadmap')"
            className="w-full bg-background/60 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
          />
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Start (m:ss)</label>
              <input
                type="text"
                value={newStartMs}
                onChange={e => setNewStartMs(e.target.value)}
                placeholder="0:00"
                className="w-full bg-background/60 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 mt-1"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">End (m:ss)</label>
              <input
                type="text"
                value={newEndMs}
                onChange={e => setNewEndMs(e.target.value)}
                placeholder="1:30"
                className="w-full bg-background/60 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 mt-1"
              />
            </div>
          </div>
          {/* Color picker */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Color:</span>
            {COLORS.map(c => (
              <button
                key={c.value}
                onClick={() => setNewColor(c.value)}
                className={`w-5 h-5 rounded-full ${c.dot} transition-transform ${newColor === c.value ? 'scale-125 ring-2 ring-white/40 ring-offset-1 ring-offset-background' : 'opacity-60 hover:opacity-100'}`}
              />
            ))}
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={() => setShowCreateForm(false)} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg transition-colors">Cancel</button>
            <button onClick={handleCreate} disabled={isCreating || !newTitle.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-medium transition-colors disabled:opacity-50">
              {isCreating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              Create
            </button>
          </div>
        </div>
      )}

      {/* Soundbite List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : soundbites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
          <Music2 className="h-12 w-12 opacity-20" />
          <p className="text-base font-medium text-foreground">No Soundbites Yet</p>
          <p className="text-sm text-center max-w-xs">
            Clip important moments from the transcript. You can also select text in the Transcript tab to create a soundbite.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {soundbites.map(sb => {
            const c = getColor(sb.color);
            const durationMs = sb.endMs - sb.startMs;
            return (
              <div key={sb.id}
                className={`group relative ${c.bg} border ${c.border} rounded-2xl p-4 transition-all hover:shadow-md`}>
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full ${c.dot} mt-1.5 shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{sb.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock size={10} /> {formatMs(sb.startMs)} – {formatMs(sb.endMs)}</span>
                      <span className={`${c.text} font-medium`}>{Math.round(durationMs / 1000)}s</span>
                    </div>
                    {sb.transcriptExcerpt && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2 italic">"{sb.transcriptExcerpt}"</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onJumpToTime(sb.startMs)}
                      className={`p-2 rounded-lg ${c.bg} ${c.text} hover:opacity-80 transition-opacity`}
                      title="Jump to this moment"
                    >
                      <Play size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(sb.id)}
                      className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                      title="Delete soundbite"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
