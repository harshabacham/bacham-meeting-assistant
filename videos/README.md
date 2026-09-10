# Bacham — Official Launch Trailer (Apple Keynote × Halmarr Style)

This directory houses the standalone, cinematic **Product Reveal & Launch Trailer** for **Bacham**, completely decoupled from the landing page.

---

## 🎬 Deliverables

### 1. `bacham-launch-teaser.webm` (1080p 60FPS)
- **High-Bitrate Master Video File:** 1920×1080 Full HD, rendered at 60 frames per second.
- **Pacing & Polish:** Apple Keynote-style camera motion, kinetic typography, dynamic macOS window frame, real-time waveform visualizers, 3D flipping flashcard, and cartoon tactile sticker animations.
- **Ready for Distribution:** Can be uploaded directly to X (Twitter), YouTube, LinkedIn, Product Hunt, or played locally in Windows Media Player, VLC, and Chrome.

### 2. `teaser.html` (Interactive 1080p Player)
- **Standalone HTML5 Player:** Open directly in any web browser (Chrome, Edge, Safari, Firefox).
- **Integrated Web Audio Sound Engine:** Cinematic sub-bass boom, cartoon sticker pop, UI click transitions, and milestone major-9th chord harmonies.
- **Interactive Controls:**
  - `❚❚ PAUSE` / `▶ PLAY` toggle
  - Click-to-seek scrubber progress timeline
  - `🔊 AUDIO: ON / OFF` toggle
  - Responsive auto-scaler (adapts to 4K, 1440p, 1080p, or laptop screens)

### 3. `record_teaser.py`
- Headless Playwright automation script to re-record the video at any time:
  ```powershell
  python videos/record_teaser.py
  ```

---

## 📖 4-Chapter Narrative Structure

1. **Chapter 1: The Tension (00:00 – 00:11)**
   - *The Problem:* Confidential executive boardroom call interrupted by uninvited `Meeting_Bot_409`.
   - *Pain Point:* Raw audio streaming to 3rd-party cloud, wasting 1 hour scrubbing audio for 1 lost action item.
2. **Chapter 2: Introducing Bacham (00:11 – 00:23)**
   - *Hero Reveal:* Apple-style typography zoom: *"Introducing"* ➔ Signature bubbly chartreuse green `#D1E043` **Bacham** wordmark.
   - *Cartoon Sticker Stamp:* `NO BOTS · 100% BANNED` sticker slams down with tactile physics bounce and audible pop.
   - *Core Promise:* *"The AI meeting & lecture copilot that lives on your machine. 100% on your SSD."*
3. **Chapter 3: Superpowers in Motion (00:23 – 00:43)**
   - *Sleek UI Demo:* macOS floating window with traffic lights.
   - *Feature 1:* **Dual-Stream Audio Loopback** (WASAPI/CoreAudio system stream vs. host microphone with active echo cancellation).
   - *Feature 2:* **Live AI Diarization** (Harsha & Alex speaker tags, instant live transcription).
   - *Feature 3:* **1-Click Flashcards (3D Flip)** (Action item card flips 180° in 3D perspective into an active-recall study flashcard).
   - *Feature 4:* **4ms Offline SQLite Brain** (Sub-5ms search across entire discussion history).
4. **Chapter 4: The Climax & "Launching Soon" (00:43 – 00:54)**
   - *Visual Climax:* Chartreuse ambient lighting surge and milestone badge.
   - *Headline:* **Version 1.0.0**
   - *Callout:* **"Launching Soon."**
   - *Availability:* macOS, Windows 10/11, and Chrome Extension.
   - *Call to Action:* Early access & GitHub Star.
