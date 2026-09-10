# Bacham — Launch Teaser Video Assets

This folder contains the standalone SaaS "Launching Soon" teaser video assets for **Bacham**, completely separated from the landing page.

---

## Files

1. **`bacham-launch-teaser.webm`** (5.6 MB)
   - The rendered **1080p 60fps** video file.
   - Can be played in VLC, Windows Media Player, Chrome, QuickTime, or uploaded directly to YouTube, Twitter / X, LinkedIn, or Product Hunt.

2. **`teaser.html`**
   - Interactive 1080p HTML5 teaser player.
   - Includes real-time **Web Audio API sound synthesizers** (cinematic sweeps, sub-bass drops, chord milestones).
   - Features play/pause controls (`❚❚ PAUSE` / `▶ PLAY`), scrubber timeline seeking, and audio mute/unmute toggle (`🔊 AUDIO SYNTH: ON`).
   - To view: Double-click to open in Google Chrome, Microsoft Edge, Safari, or Firefox.

3. **`bacham-logo.png`**
   - High-resolution custom bubbly theme green wordmark asset (`#D1E043`).

4. **`record_teaser.py`**
   - Autonomous Playwright recording script.
   - To re-record the video at any time, run:
     ```bash
     python videos/record_teaser.py
     ```

---

## 4-Act Storyboard Structure
- **Act 1: The Problem (00:00 - 00:12)**: Uninvited meeting bot (`Meeting_Bot_409`) joining call, cloud data breach alert, and tedious audio scrubbing.
- **Act 2: The Reveal (00:12 - 00:24)**: Chartreuse glow, signature bubbly Bacham wordmark, and `NO BOTS · 100% BANNED` badge.
- **Act 3: Superpowers (00:24 - 00:42)**: Dual-stream WASAPI loopback vs. host microphone, active echo cancellation, real-time waveform bars, live AI workspace, and 4ms SQLite search.
- **Act 4: Launching Soon (00:42 - 00:52)**: Milestone `Version 1.0.0` announcement for macOS, Windows & Chrome, with GitHub Star CTA.
