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
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { FloatingActionMenu } from './components/FloatingActionMenu';

/** Detectable lecture platform based on hostname only. */
function detectPlatform(): string {
  const host = window.location.hostname;
  if (/zoom\.us$/.test(host)) return 'zoom';
  if (/meet\.google\.com$/.test(host)) return 'google-meet';
  if (/youtube\.com$|youtu\.be$/.test(host)) return 'youtube';
  if (/teams\.microsoft\.com$/.test(host)) return 'teams';
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
chrome.runtime.onMessage.addListener(
  (
    rawMessage: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: InternalResponse<ContentMetadata>) => void,
  ): boolean => {
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

// --- Feature 1: Context-Aware Visual Capture (Auto-Slide Detection) ---
let lastSlideChangeTimestamp = 0;

function initializeSlideObserver() {
  const platform = detectPlatform();
  
  // Basic heuristic: look for large DOM changes or specific class name changes
  // typical in Google Meet / Zoom Web presentation areas.
  const observer = new MutationObserver((mutations) => {
    const now = Date.now();
    // Debounce slide change detection (e.g., at most once every 5 seconds)
    if (now - lastSlideChangeTimestamp < 5000) return;

    let significantChange = false;
    for (const mutation of mutations) {
      // In Google Meet, presentation changes often involve massive node tree changes 
      // or attribute changes on specific canvas/video/div elements.
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
      console.log('[BACHAM] Significant visual change detected (possible slide change).');
      // Forward this trigger to the background script to take a snapshot
      chrome.runtime.sendMessage({
        type: MessageType.TRIGGER_SNAPSHOT,
        payload: {
          reason: 'slide_change',
          platform
        }
      });
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src', 'style', 'class'] // Common attributes that change during presentation
  });
}

// --- Feature 3: One-Click Workflow Integrations (DOM Injection) ---
function injectFloatingUI() {
  const containerId = 'bacham-floating-ui-root';
  if (document.getElementById(containerId)) return;

  const container = document.createElement('div');
  container.id = containerId;
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(createElement(FloatingActionMenu));
  console.log('[BACHAM] Injected Floating UI');
}

// --- Feature 2: Live "Agentic" Knowledge Retrieval (Live Captions) ---
function initializeCaptionObserver() {
  const platform = detectPlatform();
  if (platform !== 'google-meet') return; // For now, specifically targeting Google Meet

  // Google Meet captions are typically rendered in a specific container.
  // We look for text being added rapidly to the DOM.
  let lastCaptionText = '';

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            // Google Meet caption text heuristic:
            // Usually, they are deep in the DOM tree, often within a known class but classes are obfuscated.
            // We can look for divs with a certain role, or just monitor all text additions and debounce.
            const textContent = element.textContent?.trim();
            
            // Basic heuristic for demo: if it's a short burst of text in a deep div
            if (textContent && textContent.length > 3 && textContent !== lastCaptionText && element.tagName !== 'SCRIPT' && element.tagName !== 'STYLE') {
              // Ignore massive DOM changes (likely not a caption)
              if (textContent.length > 200) return;

              // Check if it's likely a caption (e.g., it has a speaker name pattern or is just text)
              lastCaptionText = textContent;
              
              chrome.runtime.sendMessage({
                type: MessageType.LIVE_CAPTION,
                payload: {
                  text: textContent,
                  timestamp: Date.now(),
                  platform
                }
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
  console.log('[BACHAM] Live Caption Observer initialized');
}

// Initialize features
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initializeSlideObserver();
  initializeCaptionObserver();
  injectFloatingUI();
} else {
  document.addEventListener('DOMContentLoaded', () => {
    initializeSlideObserver();
    initializeCaptionObserver();
    injectFloatingUI();
  });
}
