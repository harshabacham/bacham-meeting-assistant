# Chrome Web Store Submission Kit for BACHAM

This document contains **all copy-paste fields, reviewer notes, and instructions** required to submit the **BACHAM Chrome Extension** to the **Google Chrome Web Store Developer Dashboard**.

---

## 1. Quick Deployment Steps

### Step 1: Generate the Ready-to-Upload ZIP File
In your terminal, run:
```bash
cd apps/extension
pnpm run package
```
This builds, validates, and packages the extension into:
`apps/extension/release/bacham-extension-v0.1.0.zip`

### Step 2: Open the Developer Dashboard
1. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Log in with your Google Developer Account (requires a one-time $5 developer registration fee if you haven't set one up before).
3. Click the **"New Item"** button in the top-right.
4. Drag and drop `bacham-extension-v0.1.0.zip` (located in `apps/extension/release/`).

---

## 2. Store Listing Tab (Copy & Paste)

### Product Details

| Field | Value to Enter |
| :--- | :--- |
| **Title** | `BACHAM — AI Meeting & Lecture Capture` |
| **Short description (Summary)** | `Privacy-first lecture and meeting capture. Records tab audio and slides, syncing with the local BACHAM desktop assistant.` |
| **Category** | `Productivity` (or `Workflow & Planning`) |
| **Language** | `English` |

### Detailed Description (Copy & Paste Full Text Below)

```markdown
BACHAM is an open-source, privacy-first lecture and meeting capture engine designed for students, researchers, and professionals.

Capture audio, video, and slide screenshots directly from your browser tabs (including popular web conferencing and video platforms) and sync them with your local companion desktop assistant for instant transcription and smart structured notes.

✨ KEY FEATURES

🔴 High-Fidelity Tab Capture
Capture crystal-clear tab audio and presentation video with a single click. No clunky bots joining your meeting or awkward recording permissions.

🧠 Slide Change Detection & Visual Snapshots
Automatically detects slide transitions on presentation tabs and captures visual snapshots alongside meeting notes so you never miss a lecture slide.

🔒 100% Local-First & Privacy-Focused
Your recordings and transcripts belong entirely to you. Media is processed locally on your device or streamed to your local companion desktop app (127.0.0.1). Zero tracking, zero telemetry, and zero remote ad trackers.

📓 Side Panel Meeting Companion
Open BACHAM in Chrome's native side panel to see live notes, time-stamped action items, and capture controls right alongside your meeting or lecture.

⚡ Bring Your Own Key (BYOK) AI Summaries
Optionally connect your personal Google Gemini API key to generate instant on-demand meeting summaries, key decisions, and action items directly in your browser.

🎯 COMPATIBILITY
Works seamlessly on any web-based conferencing, educational, or video platform directly from your browser.

🛠️ OPEN SOURCE
BACHAM is free, transparent, and open-source.
Source code: https://github.com/harshabacham/bacham-meeting-assistant
```

---

## 3. Privacy Practices Tab (Critical for Approval)

Google reviewers inspect this tab very closely. Fill it out exactly as follows:

### Single Purpose Description
> "BACHAM captures browser tab audio, video, and slide screenshots during lectures and meetings, and synchronizes them with the user's local desktop assistant for note-taking."

### Permission Justifications

Copy and paste each exact justification below into the corresponding permission box:

| Permission | Justification Text to Paste |
| :--- | :--- |
| **tabCapture** | `Required to capture audio and video streams from the user's active meeting or lecture browser tab upon user initiation.` |
| **activeTab** | `Required to capture the visual display frame of the active tab for slide change detection and high-resolution presentation screenshots.` |
| **tabs** | `Required to read the title and hostname of the lecture tab to automatically tag meeting recordings with the course/event name and detect platform mute buttons.` |
| **storage** | `Required to persist user preferences (capture quality, theme), current recording state, and offline meeting notes across extension reloads.` |
| **unlimitedStorage** | `Required to safely buffer offline recorded media chunks and slide snapshots in IndexedDB before syncing with the desktop app.` |
| **alarms** | `Required to drive periodic slide change detection intervals and maintain a native messaging heartbeat with the desktop companion during long recordings.` |
| **nativeMessaging** | `Required to communicate securely via local IPC with the companion BACHAM Desktop Application for native AI transcription.` |
| **offscreen** | `Required by Manifest V3 to host HTML5 MediaStream recording and audio processing in an offscreen document without interrupting the service worker.` |
| **sidePanel** | `Required to render the capture controls, live notes, and slide reel directly within Chrome's native side panel next to the meeting.` |
| **Host Permissions** (`127.0.0.1`, `localhost`, `generativelanguage.googleapis.com`) | `Allows the extension to stream media to the local companion app on 127.0.0.1 and optionally call Google Gemini API if the user enters their own API key for live summaries.` |

### Data Usage Declarations
In the questionnaire:
1. **Audio/Video:** Select **Yes**, then check:
   - *"Only processed locally on the user's device and not transmitted to external servers."*
2. **Web History:** Select **No** (The extension only reads the active tab's title/URL during an active recording session).
3. **User Activity / Analytics:** Select **No**.
4. **Personal Info / Credentials:** Select **No**.
5. **Certifications Checkbox:** Check: *"I certify that this extension complies with the Developer Program Policies, including the Limited Use policy."*

### Privacy Policy URL
Enter:
`https://bacham.vercel.app/privacy`

---

## 4. Notes for the Reviewer (Guarantees Quick Acceptance)

In the **"Official / Notes for Reviewer"** field at the bottom of the submission form, paste the following text:

```text
Dear Review Team,

BACHAM is an open-source lecture and meeting capture assistant.

HOW TO TEST THE EXTENSION (No external hardware or desktop app required):
1. Install and pin the extension icon in Chrome.
2. Click the extension icon in the toolbar or open Chrome Side Panel (Ctrl+Shift+P or Cmd+Shift+P). The BACHAM side panel interface will open.
3. Open any webpage or video (for example, a YouTube video: https://www.youtube.com/watch?v=dQw4w9WgXcQ or Google Meet: https://meet.google.com).
4. Click "Start Recording" or the red record button in the extension. Chrome will prompt for tab audio/video sharing permission.
5. Click Allow. You will see the recording timer start, live status indicator, and slide snapshots.
6. Click "Pause", "Resume", and "Stop" to verify state machine transitions.
7. Click the "Notes" and "Settings" tabs in the side panel to view saved notes and test configuration.

The extension is fully functional in standalone mode inside Chrome, and safely buffers media locally if the optional desktop companion is not running.

Thank you for your review!
```

---

## 5. Visual Assets Checklist

- **Icon 128x128:** Included in `dist/icons/icon-128.png`.
- **Small Promo Tile (440x280):** Recommended format: PNG showing the BACHAM logo with dark slate/lime aesthetic and subtitle "AI Meeting & Lecture Capture".
- **Screenshots (1280x800):** Recommended 1 to 3 screenshots showing:
  1. The side panel open next to a Google Meet or lecture tab.
  2. The notes and transcript summary view.
  3. The capture controls and settings screen.
