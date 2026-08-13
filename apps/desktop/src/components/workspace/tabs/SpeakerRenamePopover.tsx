import { useState, useRef, useEffect, useCallback } from 'react';
import { UserRound, Check, Pencil } from 'lucide-react';
import { useSettingsStore } from '@/shared/stores/settingsStore';

interface SpeakerRenamePopoverProps {
  speakerName: string;
  /** Called when user confirms a new name. */
  onRename: (from: string, to: string) => void;
}

/** Hash-based color derived from a speaker name — stable and deterministic. */
function speakerColor(name: string): string {
  const palette = [
    '#a78bfa', // violet
    '#34d399', // emerald
    '#60a5fa', // blue
    '#fb923c', // orange
    '#f472b6', // pink
    '#facc15', // yellow
    '#2dd4bf', // teal
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

/**
 * SpeakerRenamePopover
 *
 * Renders an inline clickable speaker badge. On click, expands into
 * an input field allowing the user to type a real name.
 * Persists via settingsStore.speakerMapping so all transcript blocks
 * retroactively show the correct name.
 */
export function SpeakerRenamePopover({ speakerName, onRename }: SpeakerRenamePopoverProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const color = speakerColor(speakerName);
  const settings = useSettingsStore(s => s.settings);
  const updateSettings = useSettingsStore(s => s.updateSettings);

  // Resolve display name through speakerMapping
  const displayName = settings?.speakerMapping?.[speakerName] ?? speakerName;

  useEffect(() => {
    if (isEditing) {
      setDraft(displayName);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isEditing, displayName]);

  const handleConfirm = useCallback(async () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== displayName) {
      await updateSettings({
        speakerMapping: {
          ...(settings?.speakerMapping ?? {}),
          [speakerName]: trimmed,
        },
      });
      onRename(speakerName, trimmed);
    }
    setIsEditing(false);
  }, [draft, displayName, speakerName, settings, updateSettings, onRename]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') void handleConfirm();
    if (e.key === 'Escape') setIsEditing(false);
  };

  if (isEditing) {
    return (
      <span className="inline-flex items-center gap-1 align-middle">
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => void handleConfirm()}
          className="text-xs font-bold px-2 py-0.5 rounded-md border border-[var(--border-accent)] bg-[var(--bg)] outline-none w-28"
          style={{ color }}
          placeholder="Enter name…"
        />
        <button
          onMouseDown={e => { e.preventDefault(); void handleConfirm(); }}
          className="p-0.5 rounded-full text-emerald-500 hover:bg-emerald-500/10 transition-colors"
          title="Save"
        >
          <Check size={11} />
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="group inline-flex items-center gap-1 align-middle px-1.5 py-0.5 rounded-md hover:bg-white/5 transition-colors cursor-pointer"
      title={`Rename "${displayName}"`}
    >
      <UserRound size={10} style={{ color }} />
      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color }}>
        {displayName}
      </span>
      <Pencil
        size={9}
        className="opacity-0 group-hover:opacity-60 transition-opacity"
        style={{ color }}
      />
    </button>
  );
}
