import { useState, useEffect } from 'react';
import { AlertCircle, Loader2, FileText, RefreshCw, MessageSquare, Send, X, Scissors, Image, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TauriClient } from '@/infrastructure/tauri-client';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useSettingsStore } from '@/shared/stores/settingsStore';
import { UserCheck } from 'lucide-react';

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

interface TranscriptTabProps {
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
}

export function TranscriptTab({
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
}: TranscriptTabProps) {
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
    } catch (e) {
      console.error(e);
    }
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
    const endMs = startMs + 30000; // default 30s
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
      // Wait for it to save to DB, but for now we just show a toast or rely on a refresh
      alert(`Translated to ${lang}! You can load it from the backend if wired up.`);
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleTrimBlock = async (blockIndex: number) => {
    const startMs = getBlockMs(blockIndex);
    const endMs = startMs + 10000; // approximate block length
    try {
      await TauriClient.trimVideoByTimestamps(lectureId, [{ startMs, endMs }]);
      alert("Trimmed out of video successfully!");
      onRefresh();
    } catch (e) {
      console.error(e);
      alert("Failed to trim video.");
    }
  };

  const handleTagSpeaker = () => {
    const original = prompt("Enter the original speaker name (e.g., 'Speaker 1' or 'Unknown'):");
    if (!original) return;
    const realName = prompt(`What is the real name for '${original}'?`);
    if (!realName) return;

    updateSettings({
      speakerMapping: {
        ...speakerMapping,
        [original]: realName
      }
    });
  };

  const renderBlockText = (text: string) => {
    let output = text;
    for (const [original, mapped] of Object.entries(speakerMapping)) {
       output = output.replace(new RegExp(`\\b${original}\\b`, 'gi'), mapped);
    }
    return output;
  };

  return (
    <div className="max-w-3xl mx-auto h-full relative" ref={scrollRef}>
      {/* Soundbite clip prompt (floating) */}
      {showSoundbitePrompt && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-surface border border-indigo-500/30 rounded-2xl shadow-2xl p-4 w-80 space-y-3 animate-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scissors size={14} className="text-indigo-400" />
              <span className="text-sm font-semibold text-foreground">🎬 Clip as Soundbite</span>
            </div>
            <button onClick={() => setShowSoundbitePrompt(false)} className="text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground italic line-clamp-2">"{selectedText}"</p>
          <input
            type="text"
            value={soundbiteTitle}
            onChange={e => setSoundbiteTitle(e.target.value)}
            placeholder="Name this soundbite..."
            autoFocus
            className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-indigo-500/50"
            onKeyDown={e => { if (e.key === 'Enter') handleCreateSoundbite(); }}
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowSoundbitePrompt(false)} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg transition-colors">Cancel</button>
            <button onClick={handleCreateSoundbite} disabled={!soundbiteTitle.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-xs font-medium transition-colors disabled:opacity-50">
              <Scissors size={11} /> Save Clip
            </button>
          </div>
        </div>
      )}

      {/* Translation Toolbar */}
      <div className="flex justify-end p-2 border-b border-border/10">
        <button onClick={() => handleTranslate('Spanish')} disabled={isTranslating} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface border border-border/40 rounded-lg hover:bg-surface-hover transition-colors disabled:opacity-50">
           {isTranslating ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />}
           Translate to Spanish
        </button>
      </div>

      <div className="prose prose-sm prose-invert max-w-none relative px-4 py-4"
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
                {/* Inline screenshot injection */}
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

                {/* Transcript block */}
                <div className="relative group/block"
                  onMouseUp={() => handleTextSelect(blockIndex)}
                  onMouseEnter={() => setHoveredBlock(blockIndex)}
                  onMouseLeave={() => setHoveredBlock(null)}>
                  <p className="mb-3 text-foreground leading-relaxed text-sm sm:text-base pr-8 whitespace-pre-wrap">
                    {renderBlockText(transcriptBlocks[blockIndex])}
                  </p>

                  {/* Action buttons on hover */}
                  {hoveredBlock === blockIndex && (
                    <div className="absolute right-0 top-0 flex gap-1 opacity-0 group-hover/block:opacity-100 transition-opacity">
                      <button
                        onClick={handleTagSpeaker}
                        className="p-1 rounded-md bg-surface border border-border/50 text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500/40 transition-colors"
                        title="Tag Speaker globally"
                      >
                        <UserCheck size={11} />
                      </button>
                      <button
                        onClick={() => handleTrimBlock(blockIndex)}
                        className="p-1 rounded-md bg-surface border border-border/50 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 transition-colors"
                        title="Trim this out of video"
                      >
                        <Scissors size={11} />
                      </button>
                      <button
                        onClick={() => {
                          setCommentingOnBlock(blockIndex);
                          setCommentText('');
                        }}
                        className="p-1 rounded-md bg-surface border border-border/50 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                        title="Add comment"
                      >
                        <MessageSquare size={11} />
                      </button>
                    </div>
                  )}

                  {/* Comment input */}
                  {commentingOnBlock === blockIndex && (
                    <div className="mb-3 flex gap-2 items-start animate-in slide-in-from-top-1">
                      <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">Y</div>
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={commentText}
                          onChange={e => setCommentText(e.target.value)}
                          placeholder="Add a comment..."
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleAddComment(blockIndex);
                            if (e.key === 'Escape') setCommentingOnBlock(null);
                          }}
                          className="flex-1 bg-surface/80 border border-border/50 rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
                        />
                        <button onClick={() => handleAddComment(blockIndex)}
                          className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                          <Send size={11} />
                        </button>
                        <button onClick={() => setCommentingOnBlock(null)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                          <X size={11} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Existing comments */}
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
                            className="opacity-0 group-hover/comment:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive transition-all">
                            <X size={10} />
                          </button>
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
  );
}
