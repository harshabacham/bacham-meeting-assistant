/**
 * SummaryTranscriptTab — combines Summary + Transcript into one scrollable page.
 * Summary section at the top, Transcript section below, separated by a divider.
 */
import { useState, useEffect } from 'react';
import {
  BrainCircuit, Sparkles, Loader2, FileText,
  AlertCircle, RefreshCw, MessageSquare, Send, X,
  Scissors, Image, Languages, Trash2, UserCheck, Play,
} from 'lucide-react';
import { LectureIntelligenceView } from '@/components/study/LectureIntelligenceView';
import { Button } from '@/components/ui/button';
import { SpeakerRenamePopover } from './SpeakerRenamePopover';
import { TauriClient } from '@/infrastructure/tauri-client';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { useToast } from '@/components/ui/ToastProvider';
import { useLectureSyncStore } from '@/shared/stores/lectureSyncStore';

interface Screenshot {
  id: string;
  filePath: string;
  capturedAt: number;
  isKeyFrame: boolean;
}

interface TranscriptComment {
  id: string;
  blockIndex: number;
  text: string;
  author: string;
  createdAt: string;
}

interface SummaryTranscriptTabProps {
  // Summary props
  summary?: string | null;
  summaryError?: string | null;
  isGeneratingSummary?: boolean;
  onGenerateSummary?: () => void;
  artifacts?: Record<string, any>;

  // Transcript props
  lectureId: string;
  transcriptBlocks: string[];
  isPipelineError: boolean;
  isPipelineRunning: boolean;
  pipelineStatusMessage: string | undefined;
  transcriptVirtualizer: any;
  onRefresh: () => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  screenshots?: Screenshot[];
  onJumpToTime?: (ms: number) => void;
  durationMs?: number;
  videoPath?: string;
  onDeleteVideo?: () => void;
}

export function SummaryTranscriptTab({
  summary,
  summaryError,
  isGeneratingSummary = false,
  onGenerateSummary,
  artifacts = {},
  lectureId,
  transcriptBlocks,
  isPipelineError,
  isPipelineRunning,
  pipelineStatusMessage,
  transcriptVirtualizer,
  onRefresh,
  scrollRef,
  screenshots = [],
  onJumpToTime,
  durationMs = 0,
  videoPath,
  onDeleteVideo,
}: SummaryTranscriptTabProps) {

  // ── Summary ───────────────────────────────────────────────────────
  const aiIntelligenceData = artifacts['lecture_intelligence'] || (() => {
    if (!summary) return null;
    try { return JSON.parse(summary); } catch { return { executive_summary: summary }; }
  })();

  // ── Transcript ────────────────────────────────────────────────────
  const [comments, setComments] = useState<TranscriptComment[]>([]);
  const [commentingOnBlock, setCommentingOnBlock] = useState<number | null>(null);
  const [commentText, setCommentText] = useState('');
  const [hoveredBlock, setHoveredBlock] = useState<number | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);
  const [showSoundbitePrompt, setShowSoundbitePrompt] = useState(false);
  const [soundbiteTitle, setSoundbiteTitle] = useState('');
  const [soundbiteBlockMs, setSoundbiteMsForBlock] = useState(0);
  const [isTranslating, setIsTranslating] = useState(false);

  const { settings, updateSettings } = useSettingsStore();
  const speakerMapping = settings?.speakerMapping || {};
  const { showToast } = useToast();
  const { currentTimeMs, seekTo } = useLectureSyncStore();

  useEffect(() => {
    TauriClient.transcriptCommentsList(lectureId).then(setComments).catch(console.error);
  }, [lectureId]);

  const getBlockMs = (blockIndex: number): number => {
    if (durationMs === 0 || transcriptBlocks.length === 0) return 0;
    return Math.floor((blockIndex / transcriptBlocks.length) * durationMs);
  };

  const getScreenshotForBlock = (blockIndex: number): Screenshot | null => {
    if (screenshots.length === 0 || durationMs === 0) return null;
    const blockMs = getBlockMs(blockIndex);
    return screenshots.find(s => Math.abs(s.capturedAt - blockMs) < 5000) || null;
  };

  const handleAddComment = async (blockIndex: number) => {
    if (!commentText.trim()) return;
    const blockMs = getBlockMs(blockIndex);
    try {
      const comment = await TauriClient.transcriptCommentsAdd(lectureId, blockMs, blockIndex, commentText.trim(), 'You');
      setComments(prev => [...prev, comment]);
      setCommentText('');
      setCommentingOnBlock(null);
    } catch (e) { console.error(e); }
  };

  const handleDeleteComment = async (id: string) => {
    setComments(prev => prev.filter(c => c.id !== id));
    await TauriClient.transcriptCommentsDelete(id).catch(console.error);
  };

  const handleTextSelect = (blockIndex: number) => {
    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 10) {
      setSelectedText(sel.toString().trim());
      setSelectedBlockIndex(blockIndex);
      setSoundbiteMsForBlock(getBlockMs(blockIndex));
      setShowSoundbitePrompt(true);
    }
  };

  const handleCreateSoundbite = async () => {
    if (!soundbiteTitle.trim() || selectedBlockIndex === null) return;
    const startMs = soundbiteBlockMs;
    const endMs = startMs + 30000;
    await TauriClient.soundbitesCreate(lectureId, soundbiteTitle.trim(), startMs, endMs, selectedText, 'indigo').catch(console.error);
    setShowSoundbitePrompt(false);
    setSoundbiteTitle('');
    setSelectedText('');
    setSelectedBlockIndex(null);
  };

  const handleTranslate = async (lang: string) => {
    setIsTranslating(true);
    try {
      await TauriClient.translateTranscript(lectureId, lang);
      showToast(`Translated to ${lang}!`, 'success');
      onRefresh();
    } catch (e) { console.error(e); }
    finally { setIsTranslating(false); }
  };

  const handleTrimBlock = async (blockIndex: number) => {
    const startMs = getBlockMs(blockIndex);
    const endMs = startMs + 10000;
    try {
      await TauriClient.trimVideoByTimestamps(lectureId, [{ startMs, endMs }]);
      showToast('Trimmed out of video successfully!', 'success');
      onRefresh();
    } catch (e) {
      showToast('Failed to trim video.', 'error');
    }
  };

  const handleTagSpeaker = () => {
    const original = prompt("Enter the original speaker name:");
    if (!original) return;
    const realName = prompt(`What is the real name for '${original}'?`);
    if (!realName) return;
    updateSettings({ speakerMapping: { ...speakerMapping, [original]: realName } });
  };

  const renderBlockText = (text: string) => {
    let output = text;
    for (const [original, mapped] of Object.entries(speakerMapping)) {
      output = output.replace(new RegExp(`\\b${original}\\b`, 'gi'), mapped);
    }
    const speakerMatch = output.match(/^\[(.*?)\]:\s*(.*)/s);
    let speakerName = null;
    let restText = output;
    if (speakerMatch) { speakerName = speakerMatch[1]; restText = speakerMatch[2]; }

    const lowerText = restText.toLowerCase();
    const insights: { label: string, color: string }[] = [];
    if (lowerText.includes('action item') || lowerText.includes('todo') || lowerText.includes('will do') || lowerText.includes('follow up'))
      insights.push({ label: 'Action Item', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' });
    if (lowerText.includes('fact check') || lowerText.includes('is that true') || lowerText.includes('double check'))
      insights.push({ label: 'Fact Check', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' });
    if (lowerText.includes('risk') || lowerText.includes('objection') || lowerText.includes('expensive') || lowerText.includes('security'))
      insights.push({ label: 'Risk/Objection', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' });

    return (
      <span className="flex flex-col gap-1.5">
        {(speakerName || insights.length > 0) && (
          <div className="flex items-center flex-wrap gap-2">
            {speakerName && (
              <SpeakerRenamePopover speakerName={speakerName} onRename={() => {}} />
            )}
            {insights.map((insight, idx) => (
              <span key={idx} className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${insight.color}`}>
                {insight.label}
              </span>
            ))}
          </div>
        )}
        <span className="block text-foreground/90">{restText}</span>
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background" ref={scrollRef}>

      {/* ═══════════════════════ SUMMARY SECTION ═══════════════════════ */}
      <div className="max-w-4xl mx-auto w-full px-6 pt-6 pb-4">
        {/* Summary header row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <BrainCircuit size={14} className="text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60">AI Intelligence</p>
              <h2 className="text-lg font-bold text-foreground leading-tight">Executive Summary</h2>
            </div>
          </div>
          {onGenerateSummary && (
            <Button
              onClick={onGenerateSummary}
              disabled={isGeneratingSummary}
              size="sm"
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 h-auto rounded-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm disabled:opacity-50"
            >
              {isGeneratingSummary ? (
                <><Loader2 size={11} className="animate-spin" /> Generating…</>
              ) : (
                <><Sparkles size={11} /> {aiIntelligenceData ? 'Re-generate' : 'Generate AI Summary'}</>
              )}
            </Button>
          )}
        </div>

        {/* Error strip */}
        {summaryError && (
          <div className="mb-4 px-4 py-2.5 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive flex items-center justify-between">
            <span>⚠️ {summaryError}</span>
            {onGenerateSummary && (
              <button onClick={onGenerateSummary} className="underline font-semibold ml-2 hover:opacity-80">Retry</button>
            )}
          </div>
        )}

        {/* Summary content */}
        {aiIntelligenceData ? (
          <LectureIntelligenceView data={aiIntelligenceData} />
        ) : isGeneratingSummary ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center border border-dashed border-border/40 rounded-2xl bg-surface/5">
            <div className="h-14 w-14 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
              <BrainCircuit className="h-7 w-7 text-primary animate-spin" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Synthesizing Intelligence</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">Analyzing audio transcript, visual keyframes, and shorthand notes…</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center border border-dashed border-border/50 rounded-2xl bg-surface/5">
            <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-1 max-w-xs">
              <h4 className="text-sm font-semibold text-foreground">No executive summary generated yet</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Generate an AI-powered executive summary, discussion highlights, decisions, and action items directly from this note.
              </p>
            </div>
            {onGenerateSummary && (
              <Button onClick={onGenerateSummary} className="rounded-xl bg-foreground text-background font-semibold text-xs px-5 py-2 h-auto mt-1">
                <Sparkles size={12} className="mr-1.5" /> Generate AI Summary
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ════════════ DIVIDER ════════════ */}
      <div className="max-w-4xl mx-auto w-full px-6 py-2">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border/40" />
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
            <FileText size={11} />
            Transcript
          </div>
          <div className="flex-1 h-px bg-border/40" />
        </div>
      </div>

      {/* ═══════════════════════ TRANSCRIPT SECTION ═══════════════════════ */}
      <div className="max-w-4xl mx-auto w-full relative flex-1">
        {/* Soundbite prompt */}
        {showSoundbitePrompt && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-surface border border-indigo-500/30 rounded-2xl shadow-2xl p-4 w-80 space-y-3 animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scissors size={14} className="text-indigo-400" />
                <span className="text-sm font-semibold text-foreground">🎬 Clip as Soundbite</span>
              </div>
              <button onClick={() => setShowSoundbitePrompt(false)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
            </div>
            <p className="text-[11px] text-muted-foreground italic line-clamp-2">"{selectedText}"</p>
            <input
              type="text" value={soundbiteTitle} onChange={e => setSoundbiteTitle(e.target.value)}
              placeholder="Name this soundbite..." autoFocus
              className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-indigo-500/50"
              onKeyDown={e => { if (e.key === 'Enter') handleCreateSoundbite(); }}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowSoundbitePrompt(false)} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg transition-colors">Cancel</button>
              <button onClick={handleCreateSoundbite} disabled={!soundbiteTitle.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-xs font-medium disabled:opacity-50">
                <Scissors size={11} /> Save Clip
              </button>
            </div>
          </div>
        )}

        {/* Translate toolbar */}
        <div className="flex justify-end px-4 pb-2 pt-1">
          <button onClick={() => handleTranslate('Spanish')} disabled={isTranslating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface border border-border/40 rounded-lg hover:bg-surface-hover transition-colors disabled:opacity-50">
            {isTranslating ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />}
            Translate to Spanish
          </button>
        </div>

        {/* Video player (if available) */}
        {videoPath && (
          <div className="mx-4 mb-4 bg-black/10 border border-border/20 rounded-xl overflow-hidden relative group">
            <video
              src={convertFileSrc(videoPath)} controls
              className="w-full max-h-[40vh] rounded-xl"
            />
            <button
              onClick={() => onDeleteVideo?.()}
              className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-rose-500/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              title="Delete Video"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}

        {/* Transcript blocks */}
        <div className="prose prose-sm prose-invert max-w-none relative px-4 pb-12"
          style={{ height: transcriptBlocks.length > 0 ? `${transcriptVirtualizer.getTotalSize()}px` : 'auto' }}>
          {transcriptBlocks.length > 0 ? (
            transcriptVirtualizer.getVirtualItems().map((virtualRow: any) => {
              const blockIndex = virtualRow.index;
              const blockComments = comments.filter(c => c.blockIndex === blockIndex);
              const inlineShot = getScreenshotForBlock(blockIndex);
              return (
                <div
                  key={virtualRow.index}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualRow.start}px)` }}
                  ref={transcriptVirtualizer.measureElement}
                  data-index={virtualRow.index}
                >
                  {inlineShot && blockIndex > 0 && (
                    <div className="mb-3 flex items-start gap-2 group/shot">
                      <div className="relative overflow-hidden rounded-lg border border-border/40 bg-surface flex-shrink-0 w-24 h-14 cursor-pointer hover:border-primary/40 transition-colors"
                        onClick={() => onJumpToTime?.(inlineShot.capturedAt)}>
                        <img src={convertFileSrc(inlineShot.filePath)} alt="Slide" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover/shot:bg-black/20 transition-colors flex items-center justify-center">
                          <Image size={14} className="text-white opacity-0 group-hover/shot:opacity-100 transition-opacity" />
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className="text-[10px] text-muted-foreground/60 italic">Slide updated</span>
                      </div>
                    </div>
                  )}

                  <div className={`relative group/block rounded-lg p-2 -mx-2 transition-colors ${
                    currentTimeMs >= getBlockMs(blockIndex) && (blockIndex === transcriptBlocks.length - 1 || currentTimeMs < getBlockMs(blockIndex + 1))
                      ? 'bg-primary/5 border border-primary/20' : 'hover:bg-surface-hover'
                  }`}
                    onMouseUp={() => handleTextSelect(blockIndex)}
                    onMouseEnter={() => setHoveredBlock(blockIndex)}
                    onMouseLeave={() => setHoveredBlock(null)}>
                    <p className="mb-3 text-foreground leading-relaxed text-sm sm:text-base pr-8 whitespace-pre-wrap">
                      {renderBlockText(transcriptBlocks[blockIndex])}
                    </p>

                    {hoveredBlock === blockIndex && (
                      <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover/block:opacity-100 transition-opacity">
                        <button onClick={() => seekTo(getBlockMs(blockIndex))}
                          className="p-1 rounded-md bg-surface border border-border/50 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-colors" title="Play from here">
                          <Play size={11} fill="currentColor" />
                        </button>
                        <button onClick={handleTagSpeaker}
                          className="p-1 rounded-md bg-surface border border-border/50 text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500/40 transition-colors" title="Tag speaker">
                          <UserCheck size={11} />
                        </button>
                        <button onClick={() => handleTrimBlock(blockIndex)}
                          className="p-1 rounded-md bg-surface border border-border/50 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 transition-colors" title="Trim out">
                          <Scissors size={11} />
                        </button>
                        <button onClick={() => { setCommentingOnBlock(blockIndex); setCommentText(''); }}
                          className="p-1 rounded-md bg-surface border border-border/50 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors" title="Comment">
                          <MessageSquare size={11} />
                        </button>
                      </div>
                    )}

                    {commentingOnBlock === blockIndex && (
                      <div className="mb-3 flex gap-2 items-start animate-in slide-in-from-top-1">
                        <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">Y</div>
                        <div className="flex-1 flex gap-2">
                          <input type="text" value={commentText} onChange={e => setCommentText(e.target.value)}
                            placeholder="Add a comment..." autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') handleAddComment(blockIndex); if (e.key === 'Escape') setCommentingOnBlock(null); }}
                            className="flex-1 bg-surface/80 border border-border/50 rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50" />
                          <button onClick={() => handleAddComment(blockIndex)} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"><Send size={11} /></button>
                          <button onClick={() => setCommentingOnBlock(null)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"><X size={11} /></button>
                        </div>
                      </div>
                    )}

                    {blockComments.length > 0 && (
                      <div className="mb-3 space-y-2 pl-2 border-l-2 border-primary/20">
                        {blockComments.map(c => (
                          <div key={c.id} className="flex items-start gap-2 group/comment">
                            <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-[9px] font-bold shrink-0">{c.author[0]}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2">
                                <span className="text-[11px] font-semibold text-foreground">{c.author}</span>
                                <span className="text-[10px] text-muted-foreground">{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className="text-xs text-foreground/80 mt-0.5">{c.text}</p>
                            </div>
                            <button onClick={() => handleDeleteComment(c.id)}
                              className="opacity-0 group-hover/comment:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive transition-all"><X size={10} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
              {isPipelineError ? (
                <>
                  <AlertCircle className="h-10 w-10 text-destructive mb-2" />
                  <p className="text-lg font-medium text-foreground">Processing Failed</p>
                  <p className="text-sm text-center max-w-xs text-destructive">{pipelineStatusMessage}</p>
                  <Button variant="outline" size="sm" onClick={onRefresh} className="mt-4 rounded-full border-border/50 text-xs bg-surface hover:bg-surface-hover">
                    <RefreshCw size={12} className="mr-2" /> Retry Later
                  </Button>
                </>
              ) : isPipelineRunning ? (
                <>
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-lg font-medium text-foreground">Processing Audio...</p>
                  <p className="text-sm text-center max-w-xs">{pipelineStatusMessage}</p>
                  <p className="text-xs text-muted-foreground">Transcript will appear automatically when ready</p>
                </>
              ) : (
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="italic">No transcript available.</p>
                  <p className="text-xs mt-2">Record a session or check if the pipeline completed.</p>
                  <Button variant="outline" size="sm" onClick={onRefresh} className="mt-4 rounded-full">
                    <RefreshCw size={12} className="mr-2" /> Refresh
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
