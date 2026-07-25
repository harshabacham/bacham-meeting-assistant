const fs = require('fs');
const file = 'src/pages/LectureViewerPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove react-resizable-panels import
content = content.replace(/\/\/ @ts-ignore\s*import \{ Group, Panel, Separator \} from 'react-resizable-panels';\s*/g, '');

// 2. Replace Three-Panel State with original state
content = content.replace(
  /\/\/ Three-Panel State[\s\S]*?const \[visitedTabs, setVisitedTabs\] = useState<Set<string>>\(new Set\(\['transcript', 'video', 'ai_chat'\]\)\);/m,
  `const [activeTab, setActiveTab] = useState<string>('transcript');
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set(['transcript']));`
);

// 3. Update visitedTabs logic
// It actually works as is, since the logic uses activeTab. We just need to make sure the hook triggers on activeTab.
content = content.replace(
  /const next = new Set\(prev\);\s*next\.add\(activeTab\);\s*return next;\s*}\);\s*}, \[activeTab\]\);/g,
  `const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);`
);

// 4. Replace the entire return statement
const returnRegex = /return \([\s\S]*\);\n\}/m;
const newReturn = `return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Header */}
      <div className="h-14 border-b border-border/50 bg-surface flex flex-row items-center justify-between px-4 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/library')} className="p-2 hover:bg-surface-hover rounded-xl text-muted-foreground transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2 max-w-[300px]">
            {lecture.isPinned && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
            <h1 className="font-semibold text-sm truncate">{lecture.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isPollingData && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mr-2">
              <Loader2 size={12} className="animate-spin" />
              Syncing
            </span>
          )}
          
          <button onClick={handleRename} className="btn btn-ghost h-9 w-9 p-0 rounded-full text-muted-foreground"><Edit2 size={16}/></button>
          <button onClick={handleToggleFavorite} className={\`btn btn-ghost h-9 w-9 p-0 rounded-full \${lecture.isFavorite ? 'text-primary' : 'text-muted-foreground'}\`}>
            <Heart size={16} fill={lecture.isFavorite ? 'currentColor' : 'none'} />
          </button>
          <button onClick={handleAddGlobalBookmark} className="btn btn-ghost h-9 w-9 p-0 rounded-full text-muted-foreground"><Bookmark size={16}/></button>
          <button onClick={handleShare} className="btn btn-ghost h-9 w-9 p-0 rounded-full text-muted-foreground"><Share size={16}/></button>
          <button onClick={() => handleExport('pdf')} className="btn btn-ghost h-9 w-9 p-0 rounded-full text-muted-foreground"><Download size={16}/></button>
          <button onClick={handleDelete} className="btn btn-ghost h-9 w-9 p-0 rounded-full text-destructive hover:bg-destructive/10"><Trash2 size={16}/></button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-row bg-background">
        
        {/* LEFT SIDEBAR (Utilities) */}
        {!isFocusMode && (
          <div className="w-16 flex flex-col items-center py-4 border-r border-border/50 bg-surface z-10 shrink-0 gap-2">
            {[
              { id: 'transcript', icon: <FileText size={18} />, label: 'Transcript' },
              { id: 'summary', icon: <BrainCircuit size={18} />, label: 'AI Summary' },
              { id: 'timeline', icon: <ListTree size={18} />, label: 'Timeline' },
              { id: 'notes', icon: <BookOpen size={18} />, label: 'Notes' },
              { id: 'ai_chat', icon: <MessageSquare size={18} />, label: 'AI Chat' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={\`p-3 rounded-xl transition-all duration-300 relative group \${
                  activeTab === tab.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-surface-hover'
                }\`}
                title={tab.label}
              >
                {tab.icon}
                {activeTab === tab.id && (
                  <div className="absolute inset-0 border-2 border-primary rounded-xl" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* CENTER CONTENT */}
        <div className="flex-1 flex flex-col min-w-0 h-full relative">
            <div className="flex-1 flex flex-row h-full">
              {/* VIDEO COLUMN */}
              <div className={\`p-4 flex flex-col gap-4 border-r border-border/50 \${isFocusMode ? 'w-full' : 'w-1/2'}\`}>
                <VideoTab 
                  videoSrc={videoSrc}
                  videoRef={videoRef} 
                  isPipelineRunning={isPipelineRunning}
                  isPipelineError={isPipelineError}
                  pipelineStatusMessage={pipelineStatus?.message}
                />
              </div>
              
              {/* TAB COLUMN */}
              {!isFocusMode && (
                <div className="w-1/2 p-4 flex flex-col bg-surface overflow-hidden">
                  {activeTab === 'transcript' && (
                    <TranscriptTab
                      transcriptBlocks={transcriptBlocks}
                      transcriptVirtualizer={transcriptVirtualizer}
                      onRefresh={() => {}}
                      scrollRef={transcriptScrollRef}
                    />
                  )}
                  {activeTab === 'summary' && (
                    <LectureIntelligenceTab
                      artifacts={artifacts}
                      summary={summary}
                      isGeneratingSummary={isGeneratingSummary}
                      summaryError={summaryError}
                      transcript={transcript}
                      isPipelineRunning={isPipelineRunning}
                      onGenerateSummary={handleGenerateSummary}
                    />
                  )}
                  {activeTab === 'timeline' && (
                    <TimelineTab
                      timelineEvents={timelineEvents}
                      durationMs={lecture.durationMs}
                      isPipelineRunning={isPipelineRunning}
                      onJumpToTime={jumpToTime}
                    />
                  )}
                  {activeTab === 'notes' && (
                    <NotesTab lectureId={lecture.id} />
                  )}
                  {activeTab === 'ai_chat' && (
                    <AiChatTab
                      chatHistory={chatHistory}
                      prompt={prompt}
                      setPrompt={setPrompt}
                      isSendingChat={isSendingChat}
                      handleSendChat={handleSendChat}
                      chatScrollRef={chatScrollRef}
                    />
                  )}
                </div>
              )}
            </div>
        </div>
      </div>
    </div>
  );
}`;

content = content.replace(returnRegex, newReturn);
fs.writeFileSync(file, content);
console.log('Reverted LectureViewerPage.tsx');
