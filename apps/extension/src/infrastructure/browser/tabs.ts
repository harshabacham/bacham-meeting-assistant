/**
 * Typed wrapper over chrome.tabs API.
 *
 * No other file in the codebase may call chrome.tabs directly.
 */

/**
 * Get the currently active tab in the focused or current window.
 * Returns null if no active tab can be found.
 */
export async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  try {
    let tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) return tabs[0];

    tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tabs[0]?.id) return tabs[0];

    tabs = await chrome.tabs.query({ active: true });
    return tabs[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Get a tab by ID.
 * Returns null if the tab does not exist.
 */
export async function getTabById(tabId: number): Promise<chrome.tabs.Tab | null> {
  try {
    return await chrome.tabs.get(tabId);
  } catch {
    return null;
  }
}

/**
 * Capture a screenshot of the visible area of the specified tab.
 * Returns a data URL (image/png) or null if capture fails.
 */
export async function captureVisibleTab(
  windowId: number,
): Promise<string | null> {
  try {
    return await chrome.tabs.captureVisibleTab(windowId, { format: 'png' });
  } catch {
    return null;
  }
}

/**
 * Send a message to a content script running in a specific tab.
 * Returns the response or null on failure.
 */
export async function sendMessageToTab<T>(
  tabId: number,
  message: unknown,
): Promise<T | null> {
  try {
    return (await chrome.tabs.sendMessage(tabId, message)) as T;
  } catch {
    return null;
  }
}
