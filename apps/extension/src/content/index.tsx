/**
 * BACHAM Content Script
 *
 * Runs in every tab (document_idle) to assist with metadata extraction.
 * STRICT SCOPE: This script reads ONLY:
 *   - document.title (page title)
 *   - window.location.href (page URL)
 *   - Detectable platform indicators (hostname only)
 *
 * It NEVER reads:
 *   - Form data
 *   - Page content / text
 *   - Cookies or storage
 *   - Any user-generated content
 */

import { MessageType } from '@/shared/types';
import type { InternalMessage, InternalResponse } from '@/shared/types';

function isContextValid(): boolean {
  try {
    return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
  } catch {
    return false;
  }
}

function safeSendMessage(message: unknown): void {
  if (!isContextValid()) return;
  try {
    chrome.runtime.sendMessage(message).catch(() => {});
  } catch {}
}

/** Detectable lecture platform based on hostname only. */
function detectPlatform(): string {
  const host = window.location.hostname;
  if (/zoom\.us$/.test(host)) return 'zoom';
  if (/meet\.google\.com$/.test(host)) return 'google-meet';
  if (/youtube\.com$|youtu\.be$/.test(host)) return 'youtube';
  if (/teams\.microsoft\.com$/.test(host)) return 'teams';
  if (/webex\.com$/.test(host)) return 'webex';
  return 'unknown';
}

/** Metadata visible from the content script. */
interface ContentMetadata {
  title: string;
  url: string;
  platform: string;
}

function getMetadata(): ContentMetadata {
  return {
    title: document.title,
    url: window.location.href,
    platform: detectPlatform(),
  };
}

// Listen for metadata requests from the background script
if (isContextValid()) {
  chrome.runtime.onMessage.addListener(
    (
      rawMessage: unknown,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: InternalResponse<ContentMetadata>) => void,
    ): boolean => {
      if (!isContextValid()) return false;
      if (
        typeof rawMessage !== 'object' ||
        rawMessage === null ||
        !('type' in rawMessage)
      ) {
        return false;
      }

      const message = rawMessage as InternalMessage;

      if (message.type === MessageType.METADATA_READY) {
        sendResponse({ success: true, data: getMetadata() });
        return true;
      }
      return false;
    },
  );
}

// --- Feature 1: Context-Aware Visual Capture (Auto-Slide Detection) ---
let lastSlideChangeTimestamp = 0;

function initializeSlideObserver() {
  const platform = detectPlatform();
  
  const observer = new MutationObserver((mutations) => {
    if (!isContextValid()) {
      observer.disconnect();
      return;
    }
    const now = Date.now();
    // Debounce slide change detection (at most once every 5 seconds)
    if (now - lastSlideChangeTimestamp < 5000) return;

    let significantChange = false;
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 5) {
        significantChange = true;
        break;
      }
      if (mutation.type === 'attributes' && mutation.target instanceof Element && mutation.target.tagName === 'CANVAS') {
        significantChange = true;
        break;
      }
    }

    if (significantChange) {
      lastSlideChangeTimestamp = now;
      safeSendMessage({
        type: MessageType.TRIGGER_SNAPSHOT,
        payload: {
          reason: 'slide_change',
          platform,
        },
      });
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src', 'style', 'class'],
  });
}

// --- Feature 4: Mute-Aware Recording Pause ---
function initializeMuteObserver() {
  const platform = detectPlatform();
  if (platform === 'unknown') return;

  let lastMuted: boolean | null = null;

  function getMuteState(): boolean | null {
    // Google Meet
    const meetBtn = document.querySelector<HTMLElement>('button[data-is-muted]');
    if (meetBtn) {
      return meetBtn.getAttribute('data-is-muted') === 'true';
    }

    // Zoom Web
    const zoomBtn = document.querySelector<HTMLElement>(
      'button[aria-label*="Unmute"], button[aria-label*="Mute My Audio"], button[aria-label*="Mute me"]'
    );
    if (zoomBtn) {
      const label = zoomBtn.getAttribute('aria-label') ?? '';
      return label.toLowerCase().includes('unmute');
    }

    // Microsoft Teams
    const teamsBtn = document.querySelector<HTMLElement>('[data-tid="toggle-mute-button"]');
    if (teamsBtn) {
      const pressed = teamsBtn.getAttribute('aria-pressed');
      return pressed === 'true';
    }

    // Webex
    const webexBtn = document.querySelector<HTMLElement>('[aria-label*="Mute"][aria-label*="microphone"]');
    if (webexBtn) {
      const label = webexBtn.getAttribute('aria-label') ?? '';
      return label.toLowerCase().includes('unmute');
    }

    return null;
  }

  const intervalId = setInterval(() => {
    if (!isContextValid()) {
      clearInterval(intervalId);
      return;
    }
    const muted = getMuteState();
    if (muted === null) return;
    if (muted !== lastMuted) {
      lastMuted = muted;
      safeSendMessage({
        type: MessageType.MUTE_STATE_CHANGE,
        payload: { muted, platform },
      });
    }
  }, 2000);
}

// --- Feature 2: Live Captions Observer ---
function initializeCaptionObserver() {
  const platform = detectPlatform();
  if (platform !== 'google-meet') return;

  let lastCaptionText = '';

  const observer = new MutationObserver((mutations) => {
    if (!isContextValid()) {
      observer.disconnect();
      return;
    }
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            const textContent = element.textContent?.trim();
            
            if (textContent && textContent.length > 3 && textContent !== lastCaptionText && element.tagName !== 'SCRIPT' && element.tagName !== 'STYLE') {
              if (textContent.length > 200) return;

              let speakerName = 'Unknown Speaker';
              try {
                const parent = element.parentElement?.parentElement;
                if (parent && parent.textContent) {
                  const fullText = parent.textContent;
                  if (fullText.length > textContent.length) {
                    const possibleName = fullText.substring(0, fullText.indexOf(textContent)).trim();
                    if (possibleName && possibleName.length < 30) {
                      speakerName = possibleName;
                    }
                  }
                }
              } catch {}

              lastCaptionText = textContent;
              
              safeSendMessage({
                type: MessageType.LIVE_CAPTION,
                payload: {
                  text: textContent,
                  speakerName: speakerName,
                  timestamp: Date.now(),
                  platform,
                },
              });
            }
          }
        });
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Initialize observers
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initializeSlideObserver();
  initializeCaptionObserver();
  initializeMuteObserver();
} else {
  document.addEventListener('DOMContentLoaded', () => {
    initializeSlideObserver();
    initializeCaptionObserver();
    initializeMuteObserver();
  });
}
