import { useEffect, useState, useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { convertFileSrc } from '@tauri-apps/api/core';

import { useParams, useNavigate } from 'react-router-dom';
import { useLectureStore } from '@/shared/stores/lectureStore';
import { TauriClient, Screenshot, TimelineEvent } from '@/infrastructure/tauri-client';
import { Play, FileText, BrainCircuit, BookOpen, Zap, MessageSquare, ArrowLeft, RefreshCw, Video, ListTree, Loader2, AlertCircle, Clock, Edit2, Heart, Bookmark, Share, MoreVertical, Layers, CheckSquare, Headphones, Film } from 'lucide-react';
import { useLectureSyncStore } from '@/shared/stores/lectureSyncStore';
import { PodcastPlayer } from '@/components/library/PodcastPlayer';
import { OverviewTab } from '@/components/workspace/tabs/OverviewTab';
import { Toolbar, ToolbarItem } from '@/components/kokonutui/toolbar';
import { ProgressiveBlur } from '@/components/ui/skiper-ui/skiper41';
import { LectureIntelligenceTab } from '@/components/workspace/tabs/LectureIntelligenceTab';
import { TranscriptTab } from '@/components/workspace/tabs/TranscriptTab';
import { ScreenshotsTab } from '@/components/workspace/tabs/ScreenshotsTab';
import { FormulaSheetTab } from '@/components/workspace/tabs/FormulaSheetTab';
import { CodeViewerTab } from '@/components/workspace/tabs/CodeViewerTab';
import { DiagramsTab } from '@/components/workspace/tabs/DiagramsTab';
import { NotesTab } from '@/components/workspace/tabs/NotesTab';
import { BookmarksTab } from '@/components/workspace/tabs/BookmarksTab';
import { VideoTab } from '@/components/workspace/tabs/VideoTab';
import { AiChatTab } from '@/components/workspace/tabs/AiChatTab';
import { TimelineTab } from '@/components/workspace/tabs/TimelineTab';
import { FlashcardsTab } from '@/components/workspace/tabs/FlashcardsTab';
import { QuizTab } from '@/components/workspace/tabs/QuizTab';
import { SmartSkipTimeline } from '@/components/study/SmartSkipTimeline';
import { useLectureShortcuts } from '@/shared/hooks/useLectureShortcuts';
import { useLearningContext } from '@/shared/hooks/useLearningContext';

export function LectureViewerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lectures } = useLectureStore();
  const { seekTo } = useLectureSyncStore();
  
  const storedLecture = lectures.find(l => l.id === id);
  const [localLecture, setLocalLecture] = useState<import('@/shared/types').Lecture | null>(storedLecture ?? null);
  const lecture = storedLecture ?? localLecture;
  
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isChatOpen, setIsChatOpen] = useState(false);

  useLearningContext({
    type: activeTab === 'code' ? 'code' : activeTab === 'formula' ? 'formula' : activeTab === 'notes' ? 'notes' : 'lecture',
    title: lecture?.title || 'Lecture Workspace',
    course: lecture?.course || undefined,
    lectureId: id,
    subtitle: `Viewing Tab: ${activeTab.toUpperCase()}`,
  });
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set(['overview']));
  const [showPodcastPlayer, setShowPodcastPlayer] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [skipSegments, setSkipSegments] = useState<any[]>([]);
  const [autoSkipEnabled, setAutoSkipEnabled] = useState(true);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [screenshotImages, setScreenshotImages] = useState<Record<string, string>>({});
  const [artifacts, setArtifacts] = useState<Record<string, any>>({});
  const [artifactProgress, setArtifactProgress] = useState<Record<string, { status: string, error?: string }>>({});
  
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [flashcardError, setFlashcardError] = useState<string | null>(null);
  
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState<{status: string, message: string} | null>(null);
  const [isPollingData, setIsPollingData] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  
  useLectureShortcuts(videoRef);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const prevVideoPath = useRef<string | undefined>(undefined);

  // Split transcript for virtualization
  const transcriptBlocks = transcript ? transcript.split('\n\n') : [];
  
  const transcriptVirtualizer = useVirtualizer({
    count: transcriptBlocks.length,
    getScrollElement: () => transcriptScrollRef.current,
    estimateSize: () => 40,
    overscan: 5,
  });

  // Refresh all data for this lecture (lecture record + transcript + summary + screenshots + timeline)
  const refreshAllData = useCallback(async () => {
    if (!id) return;
    setIsPollingData(true);
    try {
      const [lec, txn, smry, timeline, shots] = await Promise.all([
        TauriClient.getLecture(id),
        TauriClient.getTranscript(id),
        TauriClient.getSummary(id),
        TauriClient.getTimeline(id).catch(() => [] as TimelineEvent[]),
        TauriClient.getScreenshots(id),
      ]);

      if (lec) setLocalLecture(lec);
      setTranscript(txn);
      setSummary(smry);
      setTimelineEvents(timeline);

      if (lec) {
        TauriClient.getLectureSkipSegments(id, lec.durationMs).then(setSkipSegments).catch(console.error);
      }
      
      if (shots.length > 0) {
        setScreenshots(shots);
        const images: Record<string, string> = {};
        shots.forEach(s => { images[s.id] = convertFileSrc(s.filePath); });
        setScreenshotImages(images);
      }

      // Load artifacts
      const metas = await TauriClient.listArtifacts(id);
      const newArtifacts: Record<string, any> = {};
      for (const meta of metas) {
        if (meta.status === 'done') {
          const art = await TauriClient.getArtifact(id, meta.artifactType);
          if (art) {
            try { newArtifacts[meta.artifactType] = JSON.parse(art.contentJson); }
            catch (e) { newArtifacts[meta.artifactType] = { content: art.contentJson }; }
          }
        }
      }
      // Load saved session state (Phase 2 Session Memory)
      const session = await TauriClient.getSessionState(id).catch(() => null);
      if (session) {
        if (session.activeTab) setActiveTab(session.activeTab);
      }
    } finally {
      setIsPollingData(false);
    }
  }, [id]);

  // Load data on mount
  useEffect(() => {
    if (!id) return;
    refreshAllData();
  }, [id, refreshAllData]);

  // Autosave session memory state (Phase 2)
  useEffect(() => {
    if (!id) return;
    TauriClient.saveSessionState({
      lectureId: id,
      videoTimestampMs: 0,
      activeTab,
      scrollPosition: 0,
    }).catch(console.error);
  }, [id, activeTab]);

  // Track visited tabs for lazy mounting
  useEffect(() => {
    setVisitedTabs(prev => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  // Set up event listeners
  useEffect(() => {
    let isMounted = true;
    const unlistenChat = TauriClient.onAiChatChunk((data) => {
      if (!isMounted) return;
      setChatHistory(prev => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'model') {
              const existingRefs = last.references || [];
              const newRefs = data.references || [];
              const mergedRefs = [...existingRefs];
              for (const nr of newRefs as any[]) {
                  if (!mergedRefs.find((r: any) => r.refType === nr.refType && r.excerpt === nr.value)) {
                      mergedRefs.push({ id: Math.random().toString(), refType: nr.refType, excerpt: nr.value, lectureId: '' });
                  }
              }
              return [...prev.slice(0, -1), { role: 'model', content: last.content + data.chunk, references: mergedRefs }];
          }
          const initialRefs = (data.references || []).map((nr: any) => ({ id: Math.random().toString(), refType: nr.refType, excerpt: nr.value, lectureId: '' }));
          return [...prev, { role: 'model', content: data.chunk, references: initialRefs }];
      });
      setIsSendingChat(false);
    });

    const unlistenFollowups = TauriClient.onAiChatFollowups((data) => {
        if (!isMounted) return;
        setChatHistory(prev => {
            if (prev.length === 0) return prev;
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === 'model') last.followups = data.suggestions;
            return updated;
        });
    });

    const unlistenProgress = TauriClient.onPipelineProgress((data) => {
      if (data.sessionId === id) {
        setPipelineStatus({ status: data.status, message: data.message });
        
        if (data.status === 'complete') {
          // Refresh ALL data including the lecture object (which now has videoPath)
          refreshAllData();
        }
        
        // Also refresh transcript immediately when transcription step completes
        if (data.status === 'summarizing' || data.status === 'complete') {
          TauriClient.getTranscript(id!).then(txn => { if (txn) setTranscript(txn); });
        }
      }
    });

    const unlistenArtifacts = TauriClient.onArtifactProgress((data) => {
      if (data.lectureId === id) {
        setArtifactProgress(prev => ({ ...prev, [data.artifactType]: { status: data.status, error: data.error } }));
        if (data.status === 'done') {
          TauriClient.getArtifact(id, data.artifactType).then(art => {
            if (art) {
              setArtifacts(prev => {
                try { return { ...prev, [data.artifactType]: JSON.parse(art.contentJson) }; }
                catch (e) { return { ...prev, [data.artifactType]: { content: art.contentJson } }; }
              });
            }
          });
        }
      }
    });

    // Listen for global lecture refresh — re-fetch our lecture to get updated videoPath etc.
    const unlistenRefresh = TauriClient.onRefreshLectures(() => {
      if (id) {
        refreshAllData();
      }
    });

    return () => {
      isMounted = false;
      unlistenChat.then(f => f()); 
      unlistenFollowups.then(f => f());
      unlistenProgress.then(f => f());
      unlistenArtifacts.then(f => f());
      unlistenRefresh.then(f => f());
    };
  }, [id, activeConversationId, refreshAllData]);

  // Load or Create Conversation
  useEffect(() => {
      if (id) {
          TauriClient.getOrCreateLectureConversation(id).then(conv => {
              setActiveConversationId(conv.id);
              TauriClient.getConversationHistory(conv.id).then(msgs => {
                  setChatHistory(msgs.map((m: any) => ({ 
                      role: m.role === 'assistant' ? 'model' : m.role, 
                      content: m.content, 
                      references: m.references 
                  })));
              }).catch(console.error);
          }).catch(console.error);
      }
  }, [id]);

  // Auto-switch to video tab when video first becomes available
  useEffect(() => {
    const currentVideoPath = lecture?.videoPath;
    if (currentVideoPath && !prevVideoPath.current) {
      // Video just became available — switch to video tab
      setActiveTab('video');
    }
    prevVideoPath.current = currentVideoPath;
  }, [lecture?.videoPath]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory, isSendingChat]);

  // Auto-generate summary when switching to summary tab (uses transcript and/or video screenshots via backend)
  useEffect(() => {
    const hasContent = Boolean(transcript || screenshots.length > 0);
    if (activeTab === 'summary' && !summary && !isGeneratingSummary && !summaryError && hasContent) {
      handleGenerateSummary();
    }
  }, [activeTab, summary, isGeneratingSummary, transcript, screenshots.length, summaryError]);

  useEffect(() => {
    if (activeTab === 'flashcards' && !isGeneratingFlashcards && !flashcardError && transcript) {
      TauriClient.listFlashcards(id!).then(cards => {
        if (cards.length === 0) {
          setIsGeneratingFlashcards(true);
          setFlashcardError(null);
          TauriClient.generateFlashcards(id!, transcript).then(() => {
            setIsGeneratingFlashcards(false);
          }).catch((e: any) => {
            setFlashcardError(String(e));
            setIsGeneratingFlashcards(false);
          });
        }
      });
    }
  }, [activeTab, id, transcript, isGeneratingFlashcards, flashcardError]);


  const handleRename = async () => {
    if (!id || !lecture) return;
    const newTitle = window.prompt('Enter new title for this lecture:', lecture.title);
    if (newTitle && newTitle.trim() !== '' && newTitle !== lecture.title) {
      try {
        await TauriClient.updateLecture({ id, title: newTitle.trim() });
        refreshAllData();
      } catch (e) {
        alert(`Failed to rename lecture: ${e}`);
      }
    }
  };

  const handleToggleFavorite = async () => {
    if (!id || !lecture) return;
    try {
      await TauriClient.updateLecture({ id, isFavorite: !lecture.isFavorite });
      refreshAllData();
    } catch (e) {
      console.error('Failed to toggle favorite', e);
    }
  };

  const handleAddGlobalBookmark = async () => {
    if (!id) return;
    try {
      const label = window.prompt('Enter bookmark label:');
      if (label && label.trim() !== '') {
        const { useLectureSyncStore } = await import('@/shared/stores/lectureSyncStore');
        const currentTimeMs = useLectureSyncStore.getState().currentTimeMs;
        await TauriClient.addBookmark(id, currentTimeMs, label.trim());
        refreshAllData();
        alert('Bookmark added!');
      }
    } catch (e) {
      console.error('Failed to add global bookmark', e);
    }
  };

  const handleShare = () => {
    if (!lecture) return;
    navigator.clipboard.writeText(`Lecture: ${lecture.title}\nCourse: ${lecture.courseLabel || 'Uncategorized'}`);
    alert('Lecture info copied to clipboard!');
  };

  const handleSendChat = async (persona?: string) => {
    if (!prompt.trim() || isSendingChat || !id) return;
    const currentPrompt = prompt;
    setPrompt('');
    const personaName = persona || 'general';
    const newHistory = [...chatHistory, { role: 'user', content: currentPrompt }];
    setChatHistory(newHistory);
    setIsSendingChat(true);
    try {
      if (personaName && personaName !== 'general') {
        const response = await TauriClient.chatTeachingMode(id, currentPrompt, personaName);
        setChatHistory(prev => [...prev, {
          role: 'model',
          content: response.answer,
          persona: response.persona,
          confidence: response.confidence,
          references: response.citations
        }]);
        setIsSendingChat(false);
      } else if (activeConversationId) {
        await TauriClient.sendMessage(activeConversationId, currentPrompt);
      } else {
        const response = await TauriClient.chatTeachingMode(id, currentPrompt, 'general');
        setChatHistory(prev => [...prev, {
          role: 'model',
          content: response.answer,
          persona: response.persona,
          confidence: response.confidence,
          references: response.citations
        }]);
        setIsSendingChat(false);
      }
    } catch (e) {
      setIsSendingChat(false);
      const errorStr = String(e);
      if (errorStr.includes('Rate limit exceeded')) {
          setChatHistory(prev => [...prev, { role: 'model', content: `⚠️ **Quota Exceeded**: ${errorStr}. Please wait and try again shortly.` }]);
      } else {
          setChatHistory(prev => [...prev, { role: 'model', content: `⚠️ AI chat failed: ${errorStr}` }]);
      }
    }
  };

  // Generate summary using BOTH transcript and video screenshots (multimodal via backend)
  const handleGenerateSummary = async () => {
    if (!id || isGeneratingSummary) return;
    if (!transcript && screenshots.length === 0) {
      setSummaryError('No transcript or screenshots available to summarize. Please wait for processing to complete.');
      return;
    }
    setIsGeneratingSummary(true);
    setSummaryError(null);
    try {
      // The backend summary_generate command already uses multimodal (transcript + key frame images)
      const result = await TauriClient.generateSummary(id, transcript || "");
      setSummary(result);
      await refreshAllData();
    } catch (e) {
      setSummaryError(`Summary generation failed: ${String(e)}`);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const jumpToTime = (ms: number) => {
    setActiveTab('video');
    seekTo(ms);
  };

  const handleGenerateHighlightsReel = async () => {
    if (!id) return;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      // Dummy segments based on timestamp hints if available, else standard first 10 seconds.
      const segments = [
        { startMs: 0, endMs: 10000, label: "Intro Snippet" }
      ];
      await invoke('generate_highlights_reel', { 
        lectureId: id,
        segments,
        dest: `${lecture?.title || 'Lecture'}_Highlights.txt` 
      });
      alert('Highlights reel task simulated successfully! (Saved as Highlights.txt in current folder)');
    } catch (e) {
      alert(`Failed to generate highlights reel: ${e}`);
    }
  };

  const isPipelineRunning = Boolean(pipelineStatus && 
    pipelineStatus.status !== 'complete' && 
    pipelineStatus.status !== 'error');
    
  const isPipelineError = Boolean(pipelineStatus && pipelineStatus.status === 'error');

  if (!lecture) return (
    <div className="p-10 flex h-full items-center justify-center text-muted-foreground animate-pulse">
      Loading Workspace...
    </div>
  );

  const videoSrc = lecture.videoPath ? convertFileSrc(lecture.videoPath) : null;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Unified App Bar */}
      <div className="flex items-center w-full shrink-0 border-b border-border/50 bg-background/90 backdrop-blur-md px-4 sm:px-6 py-2 relative z-20 gap-6">
        
        {/* Left: Branding & Title */}
        <div className="flex items-center gap-3 min-w-0 shrink-0 max-w-[400px]">
          <button onClick={() => navigate('/lectures')} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <ArrowLeft size={18} />
          </button>
          
          <div className="h-9 w-9 rounded-lg bg-surface border border-border/50 flex items-center justify-center overflow-hidden shrink-0 hidden sm:flex">
             {screenshots.length > 0 ? (
               <img src={screenshotImages[screenshots[0].id]} alt="Thumbnail" className="w-full h-full object-cover" />
             ) : (
               <Video className="text-muted-foreground/50" size={14} />
             )}
          </div>
          
          <div className="min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-tight text-foreground truncate">{lecture.title}</h1>
              <button onClick={handleRename} className="text-muted-foreground hover:text-foreground transition-colors shrink-0"><Edit2 size={12} /></button>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground truncate mt-0.5">
              <span className="text-[var(--accent)] font-medium bg-[var(--accent-dim)] px-1.5 py-0 rounded-full border border-[var(--border-accent)] truncate">
                {lecture.courseLabel || 'Uncategorized'}
              </span>
              <span>•</span>
              <Clock size={10} />
              <span>{Math.round(lecture.durationMs / 60000)}m</span>
            </div>
          </div>
        </div>
        
        {/* Center: Toolbar */}
        <div className="flex-1 flex justify-start min-w-0 overflow-x-auto no-scrollbar">
          {(() => {
            const toolbarItems: ToolbarItem[] = [
              { id: 'overview', title: 'Overview', icon: BookOpen },
              { id: 'summary', title: 'Intelligence', icon: BrainCircuit },
              { id: 'transcript', title: 'Transcript', icon: FileText },
              ...(artifacts['formula_sheet']?.formulas?.length ? [{ id: 'formula_sheet', title: 'Formulas', icon: ListTree }] : []),
              ...(artifacts['important_code']?.code_blocks?.length ? [{ id: 'code', title: 'Code', icon: Zap }] : []),
              { id: 'screenshots', title: 'Screenshots', icon: Video },
              { id: 'notes', title: 'Notes', icon: BookOpen },
              { id: 'flashcards', title: 'Flashcards', icon: Layers },
              { id: 'quiz', title: 'Quiz', icon: CheckSquare },
              ...(videoSrc ? [{ id: 'video', title: 'Video', icon: Play }] : []),
            ] as ToolbarItem[];

            return (
              <Toolbar 
                items={toolbarItems} 
                selected={activeTab} 
                onSelect={(id) => setActiveTab(id)} 
                className="shadow-none border-none bg-transparent p-0 m-0"
              />
            );
          })()}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          <div className="flex items-center gap-1.5 mr-2">
            {isPipelineRunning && (
              <span className="text-primary flex items-center gap-1 text-[10px] font-medium bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 hidden lg:flex">
                <Loader2 size={10} className="animate-spin" />
                {pipelineStatus!.message}
              </span>
            )}
            {artifactProgress['lecture_intelligence'] && artifactProgress['lecture_intelligence'].status !== 'done' && (
              <span className={`hidden lg:flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                artifactProgress['lecture_intelligence'].status === 'waiting_for_quota' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                artifactProgress['lecture_intelligence'].status === 'failed' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                artifactProgress['lecture_intelligence'].status === 'retry_scheduled' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                'bg-primary/10 text-primary border-primary/20'
              }`}>
                {(artifactProgress['lecture_intelligence'].status === 'pending' || artifactProgress['lecture_intelligence'].status === 'generating') && <Loader2 size={10} className="animate-spin" />}
                {artifactProgress['lecture_intelligence'].status === 'waiting_for_quota' && <Clock size={10} />}
                {artifactProgress['lecture_intelligence'].status === 'retry_scheduled' && <RefreshCw size={10} />}
                {artifactProgress['lecture_intelligence'].status === 'failed' && <Zap size={10} />}
                {artifactProgress['lecture_intelligence'].status.replace(/_/g, ' ')}
              </span>
            )}
            {isPipelineError && (
              <span className="text-destructive flex items-center gap-1 text-[10px] font-medium bg-destructive/10 px-2 py-0.5 rounded-full border border-destructive/20 hidden lg:flex">
                <AlertCircle size={10} />
                {pipelineStatus!.message}
              </span>
            )}
          </div>
          
          <button onClick={refreshAllData} disabled={isPollingData} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface transition-colors disabled:opacity-50">
            <RefreshCw size={14} className={isPollingData ? 'animate-spin' : ''} />
          </button>
          <div className="w-px h-4 bg-border/50 mx-0.5" />
          <button onClick={handleToggleFavorite} className={`p-1.5 rounded-md transition-colors ${lecture.isFavorite ? 'text-red-500 hover:text-red-400' : 'text-muted-foreground hover:text-foreground hover:bg-surface'}`}>
             <Heart size={14} className={lecture.isFavorite ? "fill-current" : ""} />
          </button>
          <button onClick={handleAddGlobalBookmark} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface transition-colors">
             <Bookmark size={14} />
          </button>
          <button onClick={handleGenerateHighlightsReel} className="p-1.5 rounded-md text-muted-foreground hover:text-[color:var(--accent)] hover:bg-surface transition-colors" title="Generate Highlights Reel">
             <Film size={14} />
          </button>
          <button 
              onClick={() => setShowPodcastPlayer(!showPodcastPlayer)} 
              className={`p-1.5 rounded-md transition-colors ${showPodcastPlayer ? 'text-purple-500 bg-purple-500/10' : 'text-muted-foreground hover:text-foreground hover:bg-surface'}`}
              title="Listen as Podcast"
          >
             <Headphones size={14} />
          </button>
          <button onClick={handleShare} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface transition-colors">
             <Share size={14} />
          </button>
          <div className="w-px h-4 bg-border/50 mx-0.5" />
          
          {/* Wingman Toggle */}
          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 font-medium text-[12px] ${isChatOpen ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-surface'}`}
          >
             <MessageSquare size={14} />
             Wingman
          </button>
          
          <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"><MoreVertical size={14} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative flex flex-row bg-background">
        <div className="flex-1 h-full relative flex flex-col min-w-0">
          <div className="flex-1 h-full relative">
            <ProgressiveBlur position="top" height="24px" blurAmount="4px" />
            <ProgressiveBlur position="bottom" height="24px" blurAmount="4px" />
               {visitedTabs.has('overview') && (
               <div className={`absolute inset-0 overflow-y-auto px-4 sm:px-8 py-6 ${activeTab === 'overview' ? 'block' : 'hidden'}`}>
                 <OverviewTab 
                   lecture={lecture}
                   artifacts={artifacts}
                   thumbnailSrc={screenshots.length > 0 ? screenshotImages[screenshots[0].id] : undefined}
                   onJumpToVideo={() => jumpToTime(0)}
                 />
               </div>
             )}
             {visitedTabs.has('video') && (
                <div className={`absolute inset-0 overflow-y-auto p-4 space-y-4 ${activeTab === 'video' ? 'block' : 'hidden'}`}>
                  {skipSegments.length > 0 && (
                     <SmartSkipTimeline
                       segments={skipSegments}
                       durationMs={lecture.durationMs}
                       onSeek={(ms) => jumpToTime(ms / 1000)}
                       autoSkipEnabled={autoSkipEnabled}
                       setAutoSkipEnabled={setAutoSkipEnabled}
                     />
                   )}
                   <VideoTab 
                     lectureId={lecture.id}
                     videoSrc={videoSrc}
                     videoRef={videoRef}
                     isPipelineRunning={isPipelineRunning}
                     isPipelineError={isPipelineError}
                     pipelineStatusMessage={pipelineStatus?.message}
                     autoSkipEnabled={autoSkipEnabled}
                     skipSegments={skipSegments}
                   />
                </div>
              )}
             {visitedTabs.has('summary') && (
               <div className={`absolute inset-0 overflow-y-auto px-4 sm:px-8 py-6 ${activeTab === 'summary' ? 'block' : 'hidden'}`}>
                 <LectureIntelligenceTab 
                   artifacts={artifacts}
                   summary={summary}
                   summaryError={summaryError}
                   isGeneratingSummary={isGeneratingSummary}
                   transcript={transcript}
                   hasVisuals={screenshots.length > 0}
                   isPipelineRunning={isPipelineRunning}
                   onGenerateSummary={handleGenerateSummary}
                 />
               </div>
             )}
             {visitedTabs.has('transcript') && (
               <div className={`absolute inset-0 overflow-y-auto px-4 sm:px-8 py-6 ${activeTab === 'transcript' ? 'block' : 'hidden'}`}>
                 <TranscriptTab 
                   transcriptBlocks={transcriptBlocks}
                   isPipelineError={isPipelineError}
                   isPipelineRunning={isPipelineRunning}
                   pipelineStatusMessage={pipelineStatus?.message}
                   transcriptVirtualizer={transcriptVirtualizer}
                   onRefresh={() => {}}
                   scrollRef={transcriptScrollRef}
                 />
               </div>
             )}
             {visitedTabs.has('notes') && (
               <div className={`absolute inset-0 overflow-y-auto px-4 sm:px-8 py-6 ${activeTab === 'notes' ? 'block' : 'hidden'}`}>
                 <NotesTab lectureId={lecture.id} />
               </div>
             )}
             {visitedTabs.has('screenshots') && (
               <div className={`absolute inset-0 overflow-y-auto ${activeTab === 'screenshots' ? 'block' : 'hidden'}`}>
                 <ScreenshotsTab 
                   lectureId={lecture.id}
                   screenshots={screenshots}
                   screenshotImages={screenshotImages}
                   onJumpToTime={jumpToTime}
                 />
               </div>
             )}
             {visitedTabs.has('formula_sheet') && (
               <div className={`absolute inset-0 overflow-y-auto px-4 sm:px-8 py-6 ${activeTab === 'formula_sheet' ? 'block' : 'hidden'}`}>
                 <FormulaSheetTab lectureId={lecture.id} formulas={artifacts['formula_sheet']?.formulas} />
               </div>
             )}
             {visitedTabs.has('flashcards') && (
               <div className={`absolute inset-0 overflow-y-auto px-4 sm:px-8 py-6 ${activeTab === 'flashcards' ? 'block' : 'hidden'}`}>
                 <FlashcardsTab lectureId={lecture.id} transcript={transcript} />
               </div>
             )}
             {visitedTabs.has('quiz') && (
               <div className={`absolute inset-0 overflow-y-auto px-4 sm:px-8 py-6 ${activeTab === 'quiz' ? 'block' : 'hidden'}`}>
                 <QuizTab lectureId={lecture.id} transcript={transcript} />
               </div>
             )}
             {visitedTabs.has('code') && (
               <div className={`absolute inset-0 overflow-y-auto px-4 sm:px-8 py-6 ${activeTab === 'code' ? 'block' : 'hidden'}`}>
                 <CodeViewerTab lectureId={lecture.id} codeBlocks={artifacts['important_code']?.code_blocks} />
               </div>
             )}
             {visitedTabs.has('diagrams') && (
               <div className={`absolute inset-0 overflow-y-auto ${activeTab === 'diagrams' ? 'block' : 'hidden'}`}>
                 <DiagramsTab />
               </div>
             )}
             {visitedTabs.has('timeline') && (
               <div className={`absolute inset-0 overflow-y-auto px-4 sm:px-8 py-6 ${activeTab === 'timeline' ? 'block' : 'hidden'}`}>
                 <TimelineTab 
                   timelineEvents={timelineEvents}
                   durationMs={lecture.durationMs}
                   isPipelineRunning={isPipelineRunning}
                   onJumpToTime={jumpToTime}
                 />
               </div>
             )}
             {visitedTabs.has('bookmarks') && (
               <div className={`absolute inset-0 overflow-y-auto px-4 sm:px-8 py-6 ${activeTab === 'bookmarks' ? 'block' : 'hidden'}`}>
                 <BookmarksTab 
                   lectureId={lecture.id} 
                   timelineEvents={timelineEvents}
                   onJumpToTime={jumpToTime}
                   onRefresh={refreshAllData}
                 />
               </div>
             )}
          </div>
        </div>

        {/* Persistent AI Sidebar */}
        {isChatOpen && (
          <div className="w-[400px] h-full border-l border-border/50 bg-surface/30 backdrop-blur-xl flex flex-col shrink-0 overflow-hidden relative z-10">
             <AiChatTab
               chatHistory={chatHistory}
               prompt={prompt}
               setPrompt={setPrompt}
               isSendingChat={isSendingChat}
               handleSendChat={handleSendChat}
               chatScrollRef={chatScrollRef}
             />
          </div>
        )}
      </div>
        {/* Global Podcast Player */}
      {showPodcastPlayer && lecture && (
          <PodcastPlayer 
              lectureId={lecture.id} 
              onClose={() => setShowPodcastPlayer(false)} 
          />
      )}
    </div>
  );
}