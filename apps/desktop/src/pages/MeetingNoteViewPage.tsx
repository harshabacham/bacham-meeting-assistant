/**
 * MeetingNoteViewPage — Granola-style single-page meeting view.
 *
 * Layout (matching reference image):
 *   • Dark bg, large title
 *   • Tab bar: Edit | Summary (active) | Notes | Date | Add to project
 *   • Scrollable content: AI summary sections (Executive Summary, Topics Discussed, General Observations)
 *   • Bottom bar: waveform | Resume | Ask input | Mic
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLectureStore } from '@/shared/stores/lectureStore';
import { TauriClient } from '@/infrastructure/tauri-client';
import {
  Pencil, FileText, Calendar, FolderPlus, Copy, Share2,
  MoreHorizontal, Mic, Sparkles, Loader2, RefreshCw,
  ChevronDown, ChevronRight, X, BrainCircuit,
} from 'lucide-react';
import { AiChatTab } from '@/components/workspace/tabs/AiChatTab';
import { ExportPushDialog } from '@/components/workspace/ExportPushDialog';
import { useToast } from '@/components/ui/ToastProvider';

// ─── Types ───────────────────────────────────────────────────────────
type ActiveTab = 'edit' | 'summary' | 'transcript';

// ─── Helpers ─────────────────────────────────────────────────────────
function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function parseAiData(summary: string | null) {
  if (!summary) return null;
  try { return JSON.parse(summary); } catch { return { executive_summary: summary }; }
}

// ─── Sub-components ──────────────────────────────────────────────────

function BulletList({ items }: { items: string[] | undefined }) {
  if (!items || items.length === 0) return null;
  return (
    <ul className="space-y-1.5 mt-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-[14px] text-white/80 leading-relaxed">
          <span className="mt-[8px] w-[5px] h-[5px] rounded-full bg-white/50 shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function NestedList({ items }: { items: Array<{ topic?: string; title?: string; details?: string[]; subtopics?: string[] }> | undefined }) {
  if (!items || items.length === 0) return null;
  return (
    <ul className="space-y-3 mt-2">
      {items.map((item, i) => {
        const label = item.topic || item.title || '';
        const subs = item.details || item.subtopics || [];
        return (
          <li key={i}>
            <div className="flex gap-2.5 text-[14px] text-white leading-relaxed font-semibold">
              <span className="mt-[8px] w-[5px] h-[5px] rounded-full bg-white/70 shrink-0" />
              <span>{label}</span>
            </div>
            {subs.length > 0 && (
              <ul className="ml-6 mt-1 space-y-1">
                {subs.map((s, j) => (
                  <li key={j} className="flex gap-2.5 text-[13.5px] text-white/70 leading-relaxed">
                    <span className="mt-[8px] w-[4px] h-[4px] rounded-full bg-white/35 shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function SummarySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-[16px] font-bold text-white mb-1">{title}</h2>
      {children}
    </div>
  );
}

function TranscriptSection({
  blocks,
  isPipelineRunning,
  isPipelineError,
}: {
  blocks: string[];
  isPipelineRunning: boolean;
  isPipelineError: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-6 border-t border-white/8 pt-4">
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-2 text-[12px] font-semibold text-white/40 hover:text-white/60 transition-colors mb-3"
      >
        {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        Transcript {blocks.length > 0 ? `(${blocks.length} segments)` : ''}
      </button>

      {expanded && (
        <div className="space-y-3">
          {isPipelineRunning && (
            <div className="flex items-center gap-2 text-[12px] text-white/40">
              <Loader2 size={12} className="animate-spin" />
              Transcribing audio…
            </div>
          )}
          {isPipelineError && (
            <p className="text-[12px] text-rose-400">Transcription failed.</p>
          )}
          {blocks.length > 0 ? (
            blocks.map((block, i) => (
              <p key={i} className="text-[13px] text-white/60 leading-relaxed whitespace-pre-wrap">
                {block}
              </p>
            ))
          ) : !isPipelineRunning && !isPipelineError ? (
            <p className="text-[12px] text-white/30 italic">No transcript available yet.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────
export function MeetingNoteViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lectures } = useLectureStore();
  const { showToast } = useToast();

  const storedLecture = lectures.find(l => l.id === id);
  const [lecture, setLecture] = useState(storedLecture ?? null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('summary');
  const [transcript, setTranscript] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<{ status: string; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [chatPrompt, setChatPrompt] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Ask bar
  const [askValue, setAskValue] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);

  const transcriptBlocks = transcript ? transcript.split('\n\n').filter(Boolean) : [];
  const aiData = parseAiData(summary);

  // ── Load data ─────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [lec, txn, smry] = await Promise.all([
        TauriClient.getLecture(id),
        TauriClient.getTranscript(id),
        TauriClient.getSummary(id),
      ]);
      if (lec) setLecture(lec);
      setTranscript(txn);
      setSummary(smry);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Pipeline events ───────────────────────────────────────────────
  useEffect(() => {
    const unlistenProgress = TauriClient.onPipelineProgress(data => {
      if (data.sessionId === id) {
        setPipelineStatus({ status: data.status, message: data.message });
        if (data.status === 'complete') loadData();
        if (data.status === 'summarizing' || data.status === 'complete') {
          TauriClient.getTranscript(id!).then(t => { if (t) setTranscript(t); });
        }
      }
    });
    const unlistenTranscript = TauriClient.onTranscriptUpdate(data => {
      if (data.lectureId === id && data.content) setTranscript(data.content);
    });
    return () => {
      unlistenProgress.then(f => f());
      unlistenTranscript.then(f => f());
    };
  }, [id, loadData]);

  // ── Generate summary ──────────────────────────────────────────────
  const handleGenerateSummary = async () => {
    if (!id || isGenerating) return;
    if (!transcript) {
      setGenError('No transcript available yet. Wait for processing to complete.');
      return;
    }
    setIsGenerating(true);
    setGenError(null);
    try {
      const result = await TauriClient.generateSummary(id, transcript || '');
      setSummary(result);
      showToast('Summary generated!', 'success');
    } catch (e) {
      setGenError(`Failed: ${String(e)}`);
      showToast('Generation failed', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── AI Chat ───────────────────────────────────────────────────────
  const handleSendChat = async () => {
    if (!chatPrompt.trim() || isSendingChat || !id) return;
    const msg = chatPrompt;
    setChatPrompt('');
    setChatHistory(prev => [...prev, { role: 'user', content: msg }]);
    setIsSendingChat(true);
    try {
      const res = await TauriClient.chatTeachingMode(id, msg, 'general');
      setChatHistory(prev => [...prev, { role: 'model', content: res.answer }]);
    } catch (e) {
      setChatHistory(prev => [...prev, { role: 'model', content: `⚠️ ${String(e)}` }]);
    } finally {
      setIsSendingChat(false);
    }
  };

  const isPipelineRunning = Boolean(pipelineStatus && pipelineStatus.status !== 'complete' && pipelineStatus.status !== 'error');
  const isPipelineError = Boolean(pipelineStatus && pipelineStatus.status === 'error');

  if (isLoading && !lecture) {
    return (
      <div className="h-full flex items-center justify-center bg-[#141414]">
        <Loader2 size={22} className="animate-spin text-white/30" />
      </div>
    );
  }

  if (!lecture) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#141414] text-white/40 gap-3">
        <p className="text-sm">Meeting not found.</p>
        <button onClick={() => navigate('/lectures')} className="text-xs underline hover:text-white/60">Go back</button>
      </div>
    );
  }

  const dateLabel = formatDate(Number(lecture.createdAt) || Date.now());

  return (
    <div className="h-full flex overflow-hidden bg-[#141414]">
      {/* ── Main Content ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">

        {/* Top-right icon strip (no back button — use sidebar) */}
        <div className="flex justify-end items-center px-5 pt-4 pb-1 shrink-0 gap-2">
          <button onClick={() => navigator.clipboard.writeText(lecture.title).then(() => showToast('Copied!', 'success'))}
            className="p-1.5 rounded-lg hover:bg-white/8 text-white/30 hover:text-white/60 transition-colors">
            <Copy size={15} />
          </button>
          <button onClick={() => setIsExportOpen(true)}
            className="p-1.5 rounded-lg hover:bg-white/8 text-white/30 hover:text-white/60 transition-colors">
            <Share2 size={15} />
          </button>
          <button className="p-1.5 rounded-lg hover:bg-white/8 text-white/30 hover:text-white/60 transition-colors">
            <MoreHorizontal size={15} />
          </button>
        </div>

        {/* Title */}
        <div className="px-10 pb-3 shrink-0">
          <h1 className="text-[26px] font-bold text-white leading-tight tracking-tight">
            {lecture.title}
          </h1>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 px-9 pb-3 shrink-0">
          {/* Edit tab */}
          <button
            onClick={() => setActiveTab('edit')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
              activeTab === 'edit' ? 'bg-white/10 text-white border border-white/12' : 'text-white/35 hover:text-white/60'
            }`}
          >
            <Pencil size={12} />
          </button>

          {/* Summary tab */}
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
              activeTab === 'summary' ? 'bg-white/10 text-white border border-white/12' : 'text-white/35 hover:text-white/60'
            }`}
          >
            <FileText size={12} />
            Summary
          </button>

          {/* Transcript tab (icon-only) */}
          <button
            onClick={() => setActiveTab('transcript')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
              activeTab === 'transcript' ? 'bg-white/10 text-white border border-white/12' : 'text-white/35 hover:text-white/60'
            }`}
          >
            <FileText size={12} />
          </button>

          {/* Date badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-white/35 font-medium">
            <Calendar size={12} />
            {dateLabel}
          </div>

          {/* Add to project */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-white/35 hover:text-white/60 font-medium transition-colors">
            <FolderPlus size={12} />
            Add to project
          </button>

          {/* Spacer + Wingman */}
          <span className="flex-1" />
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
              isChatOpen ? 'bg-white/15 text-white border border-white/15' : 'text-white/35 hover:text-white/55'
            }`}
          >
            <BrainCircuit size={13} />
            Wingman
          </button>
        </div>

        {/* "Add to project" project-instructions banner */}
        <div className="mx-9 mb-3 flex items-center justify-between px-4 py-2.5 rounded-xl border border-white/8 bg-white/4 shrink-0">
          <div className="flex items-center gap-2 text-[12px] text-white/40">
            <span className="text-white/25">◎</span>
            Get a summary &amp; prep shaped by your project's instructions
          </div>
          <div className="flex items-center gap-2">
            <button className="text-[12px] font-semibold text-white/60 hover:text-white transition-colors">
              Add to project
            </button>
            <button className="text-white/25 hover:text-white/50 transition-colors">
              <X size={13} />
            </button>
          </div>
        </div>

        {/* ── Scrollable content ────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-10 pb-6 min-h-0">

          {/* ── SUMMARY TAB ── */}
          {activeTab === 'summary' && (
            <div>
              {/* Section header matching reference: "General status discussion" */}
              {aiData && (aiData.meeting_title || aiData.context) && (
                <h2 className="text-[19px] font-bold text-white mb-5 mt-1">
                  {aiData.meeting_title || aiData.context || 'Meeting Summary'}
                </h2>
              )}

              {/* Generating state */}
              {isGenerating && (
                <div className="flex items-center gap-2.5 py-8 text-white/40">
                  <Loader2 size={15} className="animate-spin" />
                  <span className="text-[13px]">Generating summary…</span>
                </div>
              )}

              {/* Error */}
              {genError && !isGenerating && (
                <div className="mb-4 px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[12px] text-rose-400 flex items-center justify-between">
                  <span>{genError}</span>
                  <button onClick={() => setGenError(null)}><X size={12} /></button>
                </div>
              )}

              {/* AI Summary content */}
              {aiData && !isGenerating ? (
                <div>
                  {/* Executive Summary */}
                  {(aiData.executive_summary || aiData.summary) && (
                    <SummarySection title="Executive Summary">
                      {typeof (aiData.executive_summary || aiData.summary) === 'string' ? (
                        <BulletList items={(aiData.executive_summary || aiData.summary).split('\n').filter((s: string) => s.trim())} />
                      ) : (
                        <BulletList items={aiData.executive_summary || aiData.summary} />
                      )}
                    </SummarySection>
                  )}

                  {/* Topics Discussed */}
                  {(aiData.topics_discussed || aiData.topics || aiData.key_topics) && (
                    <SummarySection title="Topics Discussed">
                      {Array.isArray(aiData.topics_discussed || aiData.topics || aiData.key_topics) ? (
                        <NestedList items={(aiData.topics_discussed || aiData.topics || aiData.key_topics).map((t: any) =>
                          typeof t === 'string' ? { topic: t, subtopics: [] } : t
                        )} />
                      ) : (
                        <BulletList items={[String(aiData.topics_discussed || aiData.topics)]} />
                      )}
                    </SummarySection>
                  )}

                  {/* Decisions */}
                  {aiData.decisions && aiData.decisions.length > 0 && (
                    <SummarySection title="Decisions Made">
                      <BulletList items={aiData.decisions.map((d: any) => typeof d === 'string' ? d : d.decision || d.text || JSON.stringify(d))} />
                    </SummarySection>
                  )}

                  {/* Action Items */}
                  {(aiData.action_items || aiData.actionItems) && (aiData.action_items || aiData.actionItems).length > 0 && (
                    <SummarySection title="Action Items">
                      <BulletList items={(aiData.action_items || aiData.actionItems).map((a: any) =>
                        typeof a === 'string' ? a : `${a.owner ? `${a.owner}: ` : ''}${a.task || a.text || JSON.stringify(a)}`
                      )} />
                    </SummarySection>
                  )}

                  {/* General Observations */}
                  {(aiData.general_observations || aiData.observations || aiData.key_takeaways) && (
                    <SummarySection title="General Observations">
                      <BulletList items={
                        Array.isArray(aiData.general_observations || aiData.observations || aiData.key_takeaways)
                          ? (aiData.general_observations || aiData.observations || aiData.key_takeaways)
                          : [String(aiData.general_observations || aiData.observations || aiData.key_takeaways)]
                      } />
                    </SummarySection>
                  )}

                  {/* Re-generate button */}
                  <button
                    onClick={handleGenerateSummary}
                    disabled={isGenerating}
                    className="flex items-center gap-1.5 mt-2 text-[11px] text-white/25 hover:text-white/50 transition-colors"
                  >
                    <RefreshCw size={11} />
                    Re-generate summary
                  </button>
                </div>
              ) : !isGenerating ? (
                /* No summary yet */
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mb-4">
                    <Sparkles size={18} className="text-white/30" />
                  </div>
                  <p className="text-[14px] font-semibold text-white/50 mb-1">No summary yet</p>
                  <p className="text-[12px] text-white/25 max-w-[220px] mb-5">
                    {transcript
                      ? 'Generate an AI-powered summary of this meeting.'
                      : 'Waiting for the transcript to be ready…'}
                  </p>
                  {transcript && (
                    <button
                      onClick={handleGenerateSummary}
                      disabled={isGenerating}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white text-black text-[13px] font-semibold hover:bg-white/90 transition-all disabled:opacity-50"
                    >
                      <Sparkles size={13} />
                      Generate AI Summary
                    </button>
                  )}
                  {isPipelineRunning && (
                    <div className="flex items-center gap-2 mt-4 text-[12px] text-white/35">
                      <Loader2 size={12} className="animate-spin" />
                      {pipelineStatus?.message}
                    </div>
                  )}
                </div>
              ) : null}

              {/* Transcript at the bottom of summary tab */}
              {aiData && (
                <TranscriptSection
                  blocks={transcriptBlocks}
                  isPipelineRunning={isPipelineRunning}
                  isPipelineError={isPipelineError}
                />
              )}
            </div>
          )}

          {/* ── EDIT TAB ── (editable notes) */}
          {activeTab === 'edit' && (
            <div>
              <p className="text-[13px] text-white/35 mb-4">Your shorthand notes from the meeting:</p>
              <textarea
                className="w-full min-h-[300px] bg-transparent text-[14px] text-white/80 leading-relaxed resize-none outline-none placeholder:text-white/20"
                placeholder="Start typing your meeting notes…&#10;&#10;• Key discussion points&#10;• Action items&#10;• Decisions made"
              />
            </div>
          )}

          {/* ── TRANSCRIPT TAB ── */}
          {activeTab === 'transcript' && (
            <div className="space-y-3">
              {isPipelineRunning && (
                <div className="flex items-center gap-2 text-[12px] text-white/40 mb-4">
                  <Loader2 size={12} className="animate-spin" />
                  {pipelineStatus?.message}
                </div>
              )}
              {transcriptBlocks.length > 0 ? (
                transcriptBlocks.map((block, i) => (
                  <p key={i} className="text-[13.5px] text-white/70 leading-relaxed whitespace-pre-wrap">
                    {block}
                  </p>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <FileText size={28} className="text-white/15 mb-3" />
                  <p className="text-[13px] text-white/30 italic">No transcript available yet.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Bottom "Ask Littlebird" Bar ───────────────────────────── */}
        <div className="shrink-0 border-t border-white/8 px-5 py-3 flex items-center gap-3 bg-[#141414]">
          {/* Waveform */}
          <button onClick={() => setIsPlaying(!isPlaying)} className="flex items-end gap-px h-4 shrink-0">
            {[2, 4, 3, 5, 2, 3].map((h, i) => (
              <span
                key={i}
                style={{ height: `${h * 2.5}px` }}
                className={`w-[3px] rounded-full transition-all ${isPlaying ? 'bg-white/50 animate-pulse' : 'bg-white/20'}`}
              />
            ))}
          </button>

          {/* Resume / Pause button */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/8 hover:bg-white/14 border border-white/10 text-[12.5px] font-semibold text-white/70 transition-all shrink-0"
          >
            {isPlaying ? (
              <><span className="flex gap-0.5 items-center"><span className="w-[3px] h-3 bg-white/70 rounded-sm" /><span className="w-[3px] h-3 bg-white/70 rounded-sm" /></span> Pause</>
            ) : (
              <><svg width="9" height="10" viewBox="0 0 9 10" fill="currentColor"><polygon points="0,0 9,5 0,10" /></svg> Resume</>
            )}
          </button>

          {/* Ask input */}
          <input
            value={askValue}
            onChange={e => setAskValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && askValue.trim()) {
                setChatPrompt(askValue);
                setAskValue('');
                setIsChatOpen(true);
                setTimeout(() => handleSendChat(), 50);
              }
            }}
            placeholder="Ask Bacham"
            className="flex-1 bg-transparent text-[13px] text-white/50 placeholder:text-white/20 outline-none min-w-0"
          />

          {/* Mic */}
          <Mic size={15} className="text-white/25 hover:text-white/50 cursor-pointer transition-colors shrink-0" />
        </div>
      </div>

      {/* ── Wingman AI Sidebar ────────────────────────────────────── */}
      {isChatOpen && (
        <div className="w-[380px] h-full border-l border-white/8 bg-[#0f0f0f] flex flex-col shrink-0 overflow-hidden">
          <AiChatTab
            chatHistory={chatHistory}
            prompt={chatPrompt}
            setPrompt={setChatPrompt}
            isSendingChat={isSendingChat}
            handleSendChat={handleSendChat}
            chatScrollRef={chatScrollRef}
          />
        </div>
      )}

      {/* ── Export Dialog ─────────────────────────────────────────── */}
      <ExportPushDialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        lectureId={id!}
        lectureTitle={lecture.title || 'Untitled'}
        summary={summary}
        artifacts={{}}
        transcript={transcript}
      />
    </div>
  );
}
