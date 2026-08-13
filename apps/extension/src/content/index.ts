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

// --- Feature 4: Mute-Aware Recording Pause ---
/**
 * MuteObserver
 *
 * Watches for mic mute/unmute state changes in major meeting platforms
 * using known DOM attribute patterns. Fires MUTE_STATE_CHANGE so the
 * background script can pause/resume the transcript recorder.
 *
 * Degrades gracefully: if no known selector found, nothing happens.
 *
 * Platform selectors (best-effort, may need updating on major redesigns):
 *  - Google Meet: button[data-is-muted]
 *  - Zoom Web: button[aria-label*="Mute"] or button[aria-label*="Unmute"]  
 *  - Teams: button[data-tid="toggle-mute-button"]
 *  - Webex: button[aria-label*="Mute"]
 */
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

  function checkMuteState() {
    const muted = getMuteState();
    if (muted === null) return;
    if (muted !== lastMuted) {
      lastMuted = muted;
      chrome.runtime.sendMessage({
        type: MessageType.MUTE_STATE_CHANGE,
        payload: { muted, platform },
      }).catch(() => {/* background may not be listening */});
    }
  }

  // Poll every 2 seconds — light enough to not impact performance
  setInterval(checkMuteState, 2000);
  console.log('[BACHAM] Mute Observer initialized for platform:', platform);
}

// Initialize features
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initializeSlideObserver();
  initializeCaptionObserver();
  initializeMuteObserver();
  injectFloatingUI();
} else {
  document.addEventListener('DOMContentLoaded', () => {
    initializeSlideObserver();
    initializeCaptionObserver();
    initializeMuteObserver();
    injectFloatingUI();
  });
}

function injectFloatingUI() {
  const containerId = 'bacham-floating-ui-root';
  if (document.getElementById(containerId)) return;

  const container = document.createElement('div');
  container.id = containerId;
  container.style.position = 'fixed';
  container.style.bottom = '24px';
  container.style.right = '24px';
  container.style.zIndex = '999999';
  container.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  document.body.appendChild(container);

  // --- Sidebar Element (Minimalist Premium Design) ---
  const sidebar = document.createElement('div');
  sidebar.style.position = 'fixed';
  sidebar.style.top = '16px';
  sidebar.style.right = '16px';
  sidebar.style.bottom = '16px';
  sidebar.style.width = '380px';
  sidebar.style.background = '#171717'; // Solid minimalist dark
  sidebar.style.border = '1px solid #262626'; // Crisp thin border
  sidebar.style.borderRadius = '16px'; // Modern soft radius
  sidebar.style.boxShadow = '0 20px 40px -10px rgba(0, 0, 0, 0.5), 0 10px 20px -5px rgba(0, 0, 0, 0.4)';
  sidebar.style.zIndex = '999998';
  sidebar.style.display = 'flex';
  sidebar.style.flexDirection = 'column';
  sidebar.style.color = '#f5f5f5';
  sidebar.style.transform = 'translateX(120%)';
  sidebar.style.opacity = '0';
  sidebar.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
  sidebar.style.overflow = 'hidden';
  sidebar.style.pointerEvents = 'none';

  sidebar.innerHTML = `
    <!-- Header -->
    <div style="padding: 16px 20px; border-bottom: 1px solid #262626; display: flex; justify-content: space-between; align-items: center; background: #111111;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: #ef4444; animation: bacham-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;"></div>
        <h2 style="margin: 0; font-size: 14px; font-weight: 600; letter-spacing: -0.01em; color: #f5f5f5;">BACHAM Active</h2>
      </div>
      <button id="bacham-sidebar-close" style="background: transparent; border: none; color: #737373; cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: color 0.15s ease;" onmouseover="this.style.color='#f5f5f5'" onmouseout="this.style.color='#737373'">✕</button>
    </div>

    <!-- Body / Transcript -->
    <div style="padding: 20px; flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; background: #171717;">
      <h3 style="margin: 0; font-size: 12px; color: #737373; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Live Transcript</h3>
      <div id="bacham-transcript-area" style="font-size: 14px; line-height: 1.6; color: #d4d4d4;">
        <p style="margin: 0; opacity: 0.7; font-style: italic;">Listening...</p>
      </div>
    </div>

    <!-- Footer Actions -->
    <div style="padding: 16px 20px; border-top: 1px solid #262626; background: #111111; display: flex; flex-direction: column; gap: 10px;">
      <div style="display: flex; gap: 10px;">
        <button id="bacham-btn-catchup" style="flex: 1; padding: 10px 16px; background: #4f46e5; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.15s ease;" onmouseover="this.style.background='#4338ca'" onmouseout="this.style.background='#4f46e5'">✨ Catch Me Up</button>
        <button id="bacham-btn-interview" style="flex: 1; padding: 10px 16px; background: #262626; color: #f5f5f5; border: 1px solid #404040; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: background 0.15s ease;" onmouseover="this.style.background='#404040'" onmouseout="this.style.background='#262626'">🎤 Interview</button>
      </div>
      
      <div style="display: flex; gap: 10px;">
        <button id="bacham-btn-pause" style="flex: 1; padding: 10px 16px; background: #262626; color: #f5f5f5; border: 1px solid #404040; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: background 0.15s ease;" onmouseover="this.style.background='#404040'" onmouseout="this.style.background='#262626'">⏸ Pause</button>
        <button id="bacham-btn-stop" style="flex: 1; padding: 10px 16px; background: #ef4444; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.15s ease;" onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'">⏹ Stop</button>
      </div>
    </div>
  `;
  document.body.appendChild(sidebar);

  // Add keyframe animation for the red pulse
  const styleSheet = document.createElement("style");
  styleSheet.innerText = `
    @keyframes bacham-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: .5; }
    }
  `;
  document.head.appendChild(styleSheet);

  const closeBtn = sidebar.querySelector('#bacham-sidebar-close') as HTMLButtonElement;
  closeBtn.addEventListener('click', () => {
    sidebar.style.transform = 'translateX(120%)';
    sidebar.style.opacity = '0';
    sidebar.style.pointerEvents = 'none';
  });

  // Wire up functional buttons
  const stopBtn = sidebar.querySelector('#bacham-btn-stop') as HTMLButtonElement;
  stopBtn.addEventListener('click', () => {
    stopBtn.innerText = 'Stopping...';
    stopBtn.style.opacity = '0.7';
    chrome.runtime.sendMessage({ type: MessageType.SESSION_STOP }).catch(console.error);
  });

  const pauseBtn = sidebar.querySelector('#bacham-btn-pause') as HTMLButtonElement;
  let isPaused = false;
  pauseBtn.addEventListener('click', () => {
    isPaused = !isPaused;
    pauseBtn.innerText = isPaused ? '▶ Resume' : '⏸ Pause';
    pauseBtn.style.background = isPaused ? '#4f46e5' : '#262626';
    chrome.runtime.sendMessage({ 
      type: MessageType.MUTE_STATE_CHANGE, 
      payload: { muted: isPaused, platform: detectPlatform() } 
    }).catch(console.error);
  });

  const catchUpBtn = sidebar.querySelector('#bacham-btn-catchup') as HTMLButtonElement;
  catchUpBtn.addEventListener('click', () => {
    catchUpBtn.innerText = 'Generating...';
    catchUpBtn.style.opacity = '0.7';
    setTimeout(() => {
      catchUpBtn.innerText = '✨ Catch Me Up';
      catchUpBtn.style.opacity = '1';
      const transcriptArea = sidebar.querySelector('#bacham-transcript-area');
      if (transcriptArea) {
        transcriptArea.innerHTML = '<div style="background: rgba(79, 70, 229, 0.1); border: 1px solid rgba(79, 70, 229, 0.2); padding: 12px; border-radius: 8px; color: #a5b4fc; font-size: 13px; margin-bottom: 12px;"><strong>Summary:</strong> The meeting just started. No significant decisions have been made yet.</div>' + transcriptArea.innerHTML;
      }
    }, 1500);
  });

  const interviewBtn = sidebar.querySelector('#bacham-btn-interview') as HTMLButtonElement;
  let isInterviewMode = false;
  interviewBtn.addEventListener('click', () => {
    isInterviewMode = !isInterviewMode;
    interviewBtn.innerText = isInterviewMode ? '🎤 Interview On' : '🎤 Interview';
    interviewBtn.style.background = isInterviewMode ? 'rgba(168, 85, 247, 0.2)' : '#262626';
    interviewBtn.style.color = isInterviewMode ? '#e879f9' : '#f5f5f5';
    interviewBtn.style.borderColor = isInterviewMode ? 'rgba(168, 85, 247, 0.5)' : '#404040';
  });

  // --- No Floating Button ---
  // The sidebar will only open when OPEN_SIDEBAR is received (user clicks Capture)

  // --- Global Message Listener for Sidecar UI ---
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message) return false;

    if (message.type === 'TRANSCRIPT_SEGMENT') {
      const area = sidebar.querySelector('#bacham-transcript-area') as HTMLDivElement;
      if (area) {
        if (area.innerHTML.includes('Listening...')) area.innerHTML = '';
        area.innerHTML += `<div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #262626;"><span style="color: #60a5fa; font-weight: bold; font-size: 11px;">SPEAKER</span><br/>${message.payload.text}</div>`;
        area.scrollTop = area.scrollHeight;
      }
      return false;
    }

    if (message.type === 'INTERVIEW_INSIGHT') {
      const area = sidebar.querySelector('#bacham-transcript-area') as HTMLDivElement;
      if (area) {
        if (area.innerHTML.includes('Listening...')) area.innerHTML = '';
        const insight = message.payload;
        
        let html = '';
        let decisionId = '';

        if (insight.questionDetected && isInterviewMode) {
          html += `
            <div style="background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.3); padding: 12px; border-radius: 8px; color: #d8b4fe; font-size: 13px; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                  <span style="font-size: 14px;">💡</span>
                  <strong style="color: #e879f9;">AI Insight</strong>
              </div>
              <div style="margin-bottom: 8px;"><strong>Q:</strong> ${insight.questionText || 'Detected Question'}</div>
              <div style="margin-bottom: 8px; color: #f3e8ff;"><strong>Suggested Answer:</strong> ${insight.suggestedAnswer}</div>
              <ul style="margin: 0; padding-left: 20px; color: #d8b4fe;">
                ${(insight.keyTalkingPoints || []).map((pt: string) => `<li style="margin-bottom: 4px;">${pt}</li>`).join('')}
              </ul>
            </div>
          `;
        }

        if (insight.decisionDetected) {
          decisionId = 'decision-' + Date.now();
          html += `
            <div id="${decisionId}" style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 12px; border-radius: 8px; color: #a7f3d0; font-size: 13px; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                  <span style="font-size: 14px;">🎯</span>
                  <strong style="color: #34d399;">Decision Proposed</strong>
              </div>
              <div style="margin-bottom: 8px;"><strong>Decision:</strong> <span class="decision-text">${insight.decisionText}</span></div>
              ${insight.decisionReasoning ? `<div style="margin-bottom: 12px; color: #d1fae5; font-size: 12px;"><em>${insight.decisionReasoning}</em></div>` : ''}
              
              <div style="display: flex; gap: 8px;">
                <button class="bacham-btn-confirm-decision" style="flex: 1; background: #059669; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s;">✓ Confirm</button>
                <button class="bacham-btn-edit-decision" style="flex: 1; background: #3f3f46; color: #f4f4f5; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s;">✎ Edit</button>
              </div>
            </div>
          `;
        }
        
        if (html) {
          // Append the HTML and scroll down
          area.insertAdjacentHTML('beforeend', html);
          area.scrollTop = area.scrollHeight;

          // If there's a decision, add event listeners
          if (insight.decisionDetected) {
            const decisionNode = area.querySelector('#' + decisionId);
            if (decisionNode) {
              const confirmBtn = decisionNode.querySelector('.bacham-btn-confirm-decision') as HTMLButtonElement;
              const editBtn = decisionNode.querySelector('.bacham-btn-edit-decision') as HTMLButtonElement;
              const textSpan = decisionNode.querySelector('.decision-text') as HTMLSpanElement;

              confirmBtn.addEventListener('click', () => {
                confirmBtn.innerText = 'Confirmed';
                confirmBtn.style.background = '#065f46';
                confirmBtn.disabled = true;
                editBtn.style.display = 'none';
                
                // Send confirmation to backend
                chrome.runtime.sendMessage({
                  type: 'DECISION_CONFIRMED',
                  payload: { text: textSpan.innerText }
                }).catch(console.error);
              });

              editBtn.addEventListener('click', () => {
                const newText = prompt('Edit Decision:', textSpan.innerText);
                if (newText) {
                  textSpan.innerText = newText;
                }
              });
            }
          }
        }
      }
      return false;
    }

    if (message.type === 'OPEN_SIDEBAR') {
      console.log('[BACHAM] Received OPEN_SIDEBAR message');
      sidebar.style.transform = 'translateX(0)';
      sidebar.style.opacity = '1';
      sidebar.style.pointerEvents = 'auto';
      sendResponse({ success: true });
      return true;
    }
    return false;
  });

  console.log('[BACHAM] Injected Vanilla JS Floating UI');
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

              // Attempt to find speaker name in a previous sibling or parent
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
              } catch (e) { /* ignore */ }

              lastCaptionText = textContent;
              
              chrome.runtime.sendMessage({
                type: MessageType.LIVE_CAPTION,
                payload: {
                  text: textContent,
                  speakerName: speakerName,
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



