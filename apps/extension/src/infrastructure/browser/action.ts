/**
 * Typed wrapper over chrome.action API.
 *
 * No other file in the codebase may call chrome.action directly.
 */

/** Badge color presets for different session states. */
const BADGE_COLORS = {
  recording: '#f05555',
  paused: '#f0a855',
  error: '#f05555',
  idle: '#00000000', // transparent — hides the badge
} as const;

/** Set the extension toolbar badge text. Pass empty string to clear. */
export async function setBadgeText(text: string): Promise<void> {
  await chrome.action.setBadgeText({ text });
}

/** Set the toolbar badge background color from presets or a custom color. */
export async function setBadgeColor(
  preset: keyof typeof BADGE_COLORS | string,
): Promise<void> {
  const color = (BADGE_COLORS as Record<string, string>)[preset] ?? preset;
  await chrome.action.setBadgeBackgroundColor({ color });
}

/** Set the toolbar icon to indicate state (idle, recording, paused, error). */
export async function setIcon(
  state: 'idle' | 'recording' | 'paused' | 'error',
): Promise<void> {
  // All states share the same icon set for now — badge conveys state.
  // If per-state icon assets are added, switch on `state` here.
  void state;
  await chrome.action.setIcon({
    path: {
      16: '/icons/icon-16.png',
      32: '/icons/icon-32.png',
      48: '/icons/icon-48.png',
      128: '/icons/icon-128.png',
    },
  });
}

/** Open the extension popup programmatically (Chrome 127+). */
export async function openPopup(): Promise<void> {
  await chrome.action.openPopup();
}
