import { TauriClient } from '@/infrastructure/tauri-client';

export const SAMPLE_MEETING_ID = 'sample-bacham-architecture-demo';

export const SAMPLE_TRANSCRIPT = `[00:02] Alex (Product Lead): Welcome everyone. Today we are aligning on the core technical architecture for Bacham — our real-time meeting and lecture AI copilot.
[00:15] Maya (Systems Architect): Thanks Alex. The primary challenge we solved this sprint is dual-stream audio capture. Traditional meeting assistants often miss either the speaker's microphone or incoming attendee audio.
[00:32] Alex (Product Lead): Exactly. With our native loopback driver and Web Audio bridge, we can cleanly separate system audio and user voice while merging them into a unified transcript with accurate speaker attribution.
[00:50] David (AI Research): On the intelligence side, we run continuous chunking. As speech fragments come in from Whisper, our local agent identifies key decision points, question patterns, and pending deliverables in real time.
[01:12] Maya (Systems Architect): And critically, user privacy is paramount. Everything stays stored locally in SQLite with vector indexing for lightning-fast full-text and semantic search.
[01:30] Alex (Product Lead): Fantastic. Let's make sure the flashcard generator and quiz modules are tied directly to lecture timestamps so students and teams can review what was discussed in seconds. Meeting adjourned!`;

export const SAMPLE_NOTES = `# Bacham — Product Architecture & AI Strategy

> **Meeting Type:** Architecture & Technical Roadmap  
> **Date:** Current Session  
> **Participants:** Alex (Product Lead), Maya (Systems Architect), David (AI Research)  
> **Status:** Finalized & Ready for Production

---

## 🎯 Executive Summary
The engineering and design teams aligned on the production architecture of the **Bacham Meeting Assistant**. Key accomplishments include dual-channel audio synchronization, local-first privacy storage, and real-time streaming intelligence for actionable note synthesis.

---

## ⚡ Core Technical Pillars

1. **Dual-Stream Audio Pipeline**
   - Captures both **system loopback** (remote attendees on Zoom/Teams/Meet) and **local microphone** (your own voice).
   - Eliminates echo cancellation artifacts and ensures full conversational fidelity.

2. **Real-Time Intelligence & Streaming Whisper**
   - Transcripts are parsed in streaming chunks.
   - Micro-summaries and live action item detection fire dynamically as participants speak.

3. **Local-First & Zero Leakage Security**
   - All audio files, transcripts, and embeddings persist directly on user device storage.
   - Fast full-text search (FTS5) enables instant keyword retrieval without external latency.

---

## ✅ Action Items & Deliverables

- [ ] **@Maya**: Finalize low-latency loopback buffer configuration for Windows & macOS audio routing. \`[00:32]\`
- [ ] **@David**: Benchmark local Whisper model quantization options against cloud Gemini/Claude latency. \`[00:50]\`
- [ ] **@Alex**: Ship first-time user onboarding tour with interactive mic tester and sample playground. \`[01:30]\`
- [x] **@Team**: Verify study workspace integration with flashcard deck and quiz session triggers.

---

## 💡 Key Takeaways
- **No Lost Context:** Every action item automatically links back to the exact conversational second in the timeline.
- **Study Mode:** Any meeting or lecture can be converted into a revision deck in one click.`;

export const SAMPLE_FLASHCARDS = [
  {
    question: "What is Bacham's dual-channel audio capture architecture?",
    answer: "Bacham simultaneously captures output system audio (remote attendees) and input microphone audio (user voice), synchronizing them into a single timeline without echo artifacts.",
    difficulty: "medium",
  },
  {
    question: "How does Bacham guarantee privacy and data sovereignty?",
    answer: "All recordings, transcripts, and database indexes reside locally on your device in SQLite with zero unauthorized cloud storage or telemetry.",
    difficulty: "easy",
  },
  {
    question: "How are Action Items linked to meeting context in Bacham?",
    answer: "Action items are timestamped directly to the exact moment in the transcript where the deliverable was assigned, allowing instant audio replay.",
    difficulty: "easy",
  },
];

/**
 * Seeds a comprehensive sample meeting into the local database
 * so the user's library and workspace are immediately interactive.
 */
export async function seedSampleMeeting(): Promise<string> {
  const lectureId = 'sample-demo-' + Date.now();

  try {
    // 1. Create lecture via transcript_append
    await TauriClient.saveTranscriptChunk(lectureId, SAMPLE_TRANSCRIPT);

    // 2. Update lecture metadata
    await TauriClient.updateLecture({
      id: lectureId,
      title: 'Bacham — Product Architecture & Strategy',
      subject: 'Architecture',
      course: 'Product Engineering',
      teacher: 'Engineering Team',
      description: 'Comprehensive overview of Bacham dual-stream capture, local intelligence, and study workspace.',
      isFavorite: true,
    });

    // 3. Populate rich markdown notes
    await TauriClient.updateNotes(lectureId, SAMPLE_NOTES);

    // 4. Seed sample flashcards
    for (const card of SAMPLE_FLASHCARDS) {
      try {
        await TauriClient.createFlashcard(lectureId, card.question, card.answer, card.difficulty);
      } catch (err) {
        console.warn('Failed to seed individual flashcard:', err);
      }
    }

    return lectureId;
  } catch (error) {
    console.error('Failed to seed sample meeting:', error);
    // Non-blocking: Return the ID even if Tauri isn't available
    return lectureId;
  }
}
