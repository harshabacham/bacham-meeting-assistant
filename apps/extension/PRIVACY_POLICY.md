# Privacy Policy for BACHAM Chrome Extension

**Last Updated:** September 10, 2026  
**Effective Date:** September 10, 2026  

BACHAM ("we," "our," or "us") is dedicated to protecting your privacy. This Privacy Policy details how the **BACHAM — AI Meeting & Lecture Capture** browser extension collects, processes, and protects your information.

---

## 1. Core Principle: Local-First & Zero Telemetry

BACHAM is built on a **local-first, privacy-by-design architecture**:
- **No Remote Telemetry or Tracking:** We do not track your browsing history, clicks, search queries, or habits.
- **No Third-Party Analytics:** We do not include Google Analytics, Facebook Pixel, Mixpanel, or any advertising trackers.
- **Local Storage:** All recorded audio, video snippets, meeting notes, action items, and slide snapshots are stored locally on your machine via Chrome Extension local storage / IndexedDB or forwarded directly to your locally installed BACHAM Desktop Application (`http://127.0.0.1:1422`).

---

## 2. What Data We Access & Why

The extension only accesses data strictly necessary to capture lectures and meetings when initiated by the user:

### A. Active Tab & Screen Capture (`tabCapture`, `activeTab`, `offscreen`)
- **What:** Captures audio and visual display from the specific browser tab or window where you choose to record a lecture or meeting.
- **Why:** To generate real-time audio transcripts, slide change detection, and automated lecture notes.
- **Handling:** Video and audio streams are processed locally in an offscreen document and streamed directly to your local companion desktop application or saved in local storage. They are **never sent to external cloud servers** operated by BACHAM.

### B. Tab Metadata (`tabs`)
- **What:** Reads the tab's `title` and `URL` hostname (e.g., `meet.google.com`, `zoom.us`, `youtube.com`).
- **Why:** To automatically label your meeting recording with the course name or meeting title and apply platform-specific mute/caption detection.
- **Handling:** Kept locally on your device.

### C. Local State & Cache (`storage`, `unlimitedStorage`)
- **What:** Stores user preferences (audio quality, capture mode), session IDs, offline recording chunks, and API keys.
- **Why:** To preserve your settings across browser sessions and ensure recordings are not lost if disconnected from the desktop app.
- **Handling:** Stored strictly inside your browser's private local sandboxed storage (`chrome.storage.local` and IndexedDB).

### D. Desktop Companion Communication (`nativeMessaging`, `http://127.0.0.1/*`, `http://localhost/*`)
- **What:** Sends captured media and receives transcription results from the locally running BACHAM Desktop Companion application.
- **Handling:** Communication is strictly confined to your local machine (`127.0.0.1` loopback interface). No network data leaves your computer.

### E. AI Services (Bring Your Own Key - BYOK) (`https://generativelanguage.googleapis.com/*`)
- **What:** If you explicitly provide a Google Gemini API key in Settings, the extension sends meeting transcript excerpts to Google Generative Language API to produce on-demand summaries.
- **Handling:** Requests are sent directly from your browser to Google's official API using your personal API key. We do not proxy, store, or view your API keys or meeting transcripts.

---

## 3. Data We NEVER Collect

The extension **never**:
- Reads keystrokes, form fields, passwords, or personal account data.
- Collects browsing history across non-recorded tabs.
- Sells, rents, or monetizes any user data.
- Shares your data with data brokers or advertisers.

---

## 4. User Controls and Data Deletion

- **Stop / Discard at Any Time:** You have full control to start, pause, resume, stop, or completely discard any recording session with a single click.
- **Clear All Data:** You can delete all local notes, transcripts, and cached media at any time through the extension Settings screen or by uninstalling the extension.

---

## 5. Chrome Web Store Single Purpose Declaration

The BACHAM Chrome Extension has a single purpose: **to capture browser tab audio, video, and slide screenshots during lectures and meetings, and synchronize them with the local BACHAM desktop assistant.**

---

## 6. Contact Us

If you have questions about this Privacy Policy or data handling in BACHAM, please contact:
- **GitHub Repository:** [https://github.com/harshabacham/bacham-meeting-assistant](https://github.com/harshabacham/bacham-meeting-assistant)
- **Email:** support@bacham.app (or submit an issue on GitHub)
