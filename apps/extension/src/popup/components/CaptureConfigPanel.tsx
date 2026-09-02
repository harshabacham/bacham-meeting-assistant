import React from 'react';
import type { CaptureConfig } from '@/shared/types';
import { MIN_SCREENSHOT_INTERVAL_MS, DEFAULT_SCREENSHOT_INTERVAL_MS } from '@/shared/constants/capture';
import { Mic, Video, Camera, AppWindow, Monitor } from 'lucide-react';

interface CaptureConfigPanelProps {
  readonly config: CaptureConfig;
  readonly onChange: (config: CaptureConfig) => void;
  readonly disabled?: boolean;
}

/**
 * Capture configuration panel — toggle audio, video, screenshot interval.
 */
export function CaptureConfigPanel({ config, onChange, disabled = false }: CaptureConfigPanelProps): React.ReactElement {
  const handleAudioToggle = (): void => {
    onChange({ ...config, audio: !config.audio });
  };

  const handleVideoToggle = (): void => {
    onChange({ ...config, video: !config.video });
  };

  const handleScreenshotToggle = (): void => {
    if (config.screenshotIntervalMs !== undefined) {
      // Disable: omit the property entirely
      const { screenshotIntervalMs: _removed, ...rest } = config;
      void _removed;
      onChange(rest);
    } else {
      // Enable with default interval
      onChange({ ...config, screenshotIntervalMs: DEFAULT_SCREENSHOT_INTERVAL_MS });
    }
  };

  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const ms = Number(e.target.value) * 1000;
    if (ms >= MIN_SCREENSHOT_INTERVAL_MS) {
      onChange({ ...config, screenshotIntervalMs: ms });
    }
  };

  const screenshotsEnabled = config.screenshotIntervalMs !== undefined;

  const captureMode = config.captureMode ?? 'tab';

  return (
    <div className="space-y-2" aria-label="Capture configuration">
      {/* Capture Mode selector */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => onChange({ ...config, captureMode: 'tab' })}
          disabled={disabled}
          className={[
            'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded text-sm transition-colors duration-fast border',
            captureMode === 'tab'
              ? 'bg-accent-purple/10 border-accent-purple text-accent-purple'
              : 'bg-surface-2 border-border-subtle text-text-secondary hover:bg-surface-3',
            disabled ? 'opacity-50 cursor-not-allowed' : '',
          ].join(' ')}
        >
          <AppWindow size={16} />
          Current Tab
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...config, captureMode: 'screen' })}
          disabled={disabled}
          className={[
            'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded text-sm transition-colors duration-fast border',
            captureMode === 'screen'
              ? 'bg-accent-purple/10 border-accent-purple text-accent-purple'
              : 'bg-surface-2 border-border-subtle text-text-secondary hover:bg-surface-3',
            disabled ? 'opacity-50 cursor-not-allowed' : '',
          ].join(' ')}
        >
          <Monitor size={16} />
          Entire Screen
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...config, captureMode: 'walkthrough' })}
          disabled={disabled}
          className={[
            'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded text-sm transition-colors duration-fast border',
            captureMode === 'walkthrough'
              ? 'bg-accent-purple/10 border-accent-purple text-accent-purple'
              : 'bg-surface-2 border-border-subtle text-text-secondary hover:bg-surface-3',
            disabled ? 'opacity-50 cursor-not-allowed' : '',
          ].join(' ')}
        >
          <Video size={16} />
          Walkthrough
        </button>
      </div>

      {/* Audio toggle */}
      <label
        className={[
          'flex items-center justify-between p-2.5 rounded bg-surface-2 border cursor-pointer',
          'transition-colors duration-fast hover:bg-surface-3',
          config.audio ? 'border-accent-purple/40' : 'border-border-subtle',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
        ].join(' ')}
      >
        <span className="flex items-center gap-2 text-sm text-text-secondary">
          <Mic size={14} className={config.audio ? 'text-accent-purple' : 'text-text-tertiary'} />
          Audio
        </span>
        <input
          type="checkbox"
          checked={config.audio}
          onChange={handleAudioToggle}
          disabled={disabled}
          aria-label="Capture audio"
          className="sr-only"
        />
        <ToggleIndicator active={config.audio} />
      </label>

      {/* Video toggle */}
      <label
        className={[
          'flex items-center justify-between p-2.5 rounded bg-surface-2 border cursor-pointer',
          'transition-colors duration-fast hover:bg-surface-3',
          config.video ? 'border-accent-purple/40' : 'border-border-subtle',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
        ].join(' ')}
      >
        <span className="flex items-center gap-2 text-sm text-text-secondary">
          <Video size={14} className={config.video ? 'text-accent-purple' : 'text-text-tertiary'} />
          Video
        </span>
        <input
          type="checkbox"
          checked={config.video}
          onChange={handleVideoToggle}
          disabled={disabled}
          aria-label="Capture video"
          className="sr-only"
        />
        <ToggleIndicator active={config.video} />
      </label>

      {/* Resolution Selector (Only if video is enabled) */}
      {config.video && (
        <div className="flex items-center gap-3 px-2.5 py-2 bg-surface-1 rounded border border-border-subtle">
          <label htmlFor="resolution-select" className="text-xs text-text-tertiary whitespace-nowrap">
            Resolution
          </label>
          <select
            id="resolution-select"
            value={config.resolution ?? 'auto'}
            onChange={(e) => onChange({ ...config, resolution: e.target.value as any })}
            disabled={disabled}
            className={[
              'flex-1 px-2 py-1 text-xs bg-surface-2 border border-border-default rounded',
              'text-text-primary focus:outline-none focus:border-accent-purple',
              'transition-colors duration-fast',
            ].join(' ')}
          >
            <option value="auto">Auto (Default)</option>
            <option value="720p">720p</option>
            <option value="1080p">1080p</option>
          </select>
        </div>
      )}

      {/* Screenshots toggle */}
      <label
        className={[
          'flex items-center justify-between p-2.5 rounded bg-surface-2 border cursor-pointer',
          'transition-colors duration-fast hover:bg-surface-3',
          screenshotsEnabled ? 'border-accent-purple/40' : 'border-border-subtle',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
        ].join(' ')}
      >
        <span className="flex items-center gap-2 text-sm text-text-secondary">
          <Camera size={14} className={screenshotsEnabled ? 'text-accent-purple' : 'text-text-tertiary'} />
          Screenshots
        </span>
        <input
          type="checkbox"
          checked={screenshotsEnabled}
          onChange={handleScreenshotToggle}
          disabled={disabled}
          aria-label="Enable interval screenshots"
          className="sr-only"
        />
        <ToggleIndicator active={screenshotsEnabled} />
      </label>

      {/* Screenshot interval */}
      {screenshotsEnabled ? (
        <div className="flex items-center gap-3 px-2.5 py-2 bg-surface-1 rounded border border-border-subtle">
          <label htmlFor="screenshot-interval" className="text-xs text-text-tertiary whitespace-nowrap">
            Every
          </label>
          <input
            id="screenshot-interval"
            type="number"
            min={Math.floor(MIN_SCREENSHOT_INTERVAL_MS / 1000)}
            step={5}
            value={Math.floor((config.screenshotIntervalMs ?? DEFAULT_SCREENSHOT_INTERVAL_MS) / 1000)}
            onChange={handleIntervalChange}
            disabled={disabled}
            className={[
              'w-16 px-2 py-1 text-xs bg-surface-2 border border-border-default rounded',
              'text-text-primary focus:outline-none focus:border-accent-purple',
              'transition-colors duration-fast',
            ].join(' ')}
          />
          <span className="text-xs text-text-tertiary">seconds</span>
        </div>
      ) : null}
    </div>
  );
}

function ToggleIndicator({ active }: { active: boolean }): React.ReactElement {
  return (
    <span
      className={[
        'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent',
        'transition-colors duration-normal',
        active ? 'bg-accent-purple' : 'bg-surface-4',
      ].join(' ')}
    >
      <span
        className={[
          'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow',
          'transition-transform duration-normal',
          active ? 'translate-x-4' : 'translate-x-0',
        ].join(' ')}
      />
    </span>
  );
}
