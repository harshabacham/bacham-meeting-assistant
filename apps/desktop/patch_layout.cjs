const fs = require('fs');

const filePath = 'C:\\Users\\harsh\\OneDrive\\Desktop\\Meeting\\apps\\desktop\\src\\pages\\LectureViewerPage.tsx';

let content = fs.readFileSync(filePath, 'utf-8');

const startIdx = content.indexOf('{/* 3-Pane Layout */}');
const endIdx = content.lastIndexOf('</div>\n    </div>\n  );\n}');

if (startIdx === -1 || endIdx === -1) {
    console.log("Could not find boundaries");
    process.exit(1);
}

const newJsx = `{/* 3-Pane Layout */}
      <div className="flex-1 min-h-0 w-full overflow-hidden border-t border-border/50">
        <LectureWorkspaceLayout
          showSidebar={showLeftPanel}
          showAssistant={showRightPanel}
          onToggleSidebar={() => setShowLeftPanel(true)}
          onToggleAssistant={() => setShowRightPanel(true)}
          sidebar={
            <div className="flex flex-col h-full bg-surface/20">
              <div className="p-3 border-b border-border/50 shrink-0 font-medium flex items-center justify-between gap-2 text-xs text-white/90">
                <div className="flex items-center gap-1.5">
                  <ListTree size={14} className="text-primary" /> Timeline
                </div>
                <button
                  className="lg:hidden text-muted-foreground hover:text-white transition-colors"
                  onClick={() => setShowLeftPanel(false)}
                >
                  <ChevronLeft size={14} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                <TimelineStrip 
                  events={timelineEvents} 
                  durationMs={lecture.durationMs}
                  onEventClick={(e) => jumpToTime(e.timestampMs)}
                />
                
                {screenshots.length > 0 && (
                  <div className="mt-6 px-1">
                    <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Key Frames</h3>
                    <div className="space-y-2">
                      {screenshots.map(s => (
                        <div 
                          key={s.id} 
                          className="group cursor-pointer rounded-lg overflow-hidden border border-border/40 hover:border-primary/50 transition-all"
                          onClick={() => jumpToTime(s.capturedAt || 0)}
                        >
                          <img src={screenshotImages[s.id]} alt="Screenshot" className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300" />
                          <div className="p-1.5 bg-surface text-[9px] text-muted-foreground flex justify-between">
                            <span>Frame</span>
                            <span className="font-mono opacity-60">{Math.floor((s.capturedAt || 0) / 60000)}:{Math.floor(((s.capturedAt || 0) % 60000) / 1000).toString().padStart(2, '0')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No data state while pipeline running */}
                {timelineEvents.length === 0 && screenshots.length === 0 && isPipelineRunning && (
                  <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                    <Loader2 size={20} className="animate-spin text-primary" />
                    <p className="text-[10px] text-center">Processing...</p>
                  </div>
                )}
              </div>
            </div>
          }
          main={
            <div className="flex flex-col bg-background h-full relative">
              {/* Content Tabs */}
              <div className="flex items-center gap-1 px-3 py-2 border-b border-border/50 shrink-0 overflow-x-auto no-scrollbar">
                {[
                  { id: 'overview', label: 'Overview', icon: BookOpen, show: true },
                  { id: 'summary', label: 'Intelligence', icon: BrainCircuit, show: true, check: !!summary },
                  { id: 'transcript', label: 'Transcript', icon: FileText, show: true, check: !!transcript },
                  { id: 'screenshots', label: 'Screenshots', icon: Video, show: true },
                  { id: 'formula_sheet', label: 'Formula Sheet', icon: ListTree, show: !!artifacts['formula_sheet']?.formulas?.length },
                  { id: 'code', label: 'Code', icon: Zap, show: !!artifacts['important_code']?.code_blocks?.length },
                  { id: 'diagrams', label: 'Diagrams', icon: Zap, show: false }, // Placeholder
                  { id: 'timeline', label: 'Timeline', icon: ListTree, show: true },
                  { id: 'notes', label: 'Notes', icon: BookOpen, show: true },
                  { id: 'flashcards', label: 'Flashcards', icon: Zap, show: true },
                  { id: 'quiz', label: 'Quiz', icon: BookOpen, show: true },
                  { id: 'bookmarks', label: 'Bookmarks', icon: BookOpen, show: true },
                  { id: 'ai_chat', label: 'AI Chat', icon: MessageSquare, show: true },
                  { id: 'resources', label: 'Resources', icon: BookOpen, show: false }, // Placeholder
                  { id: 'video', label: 'Video', icon: Play, show: !!videoSrc },
                ].filter(t => t.show).map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)} 
                    className={\`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap \${activeTab === tab.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-surface hover:text-white'}\`}
                  >
                    <tab.icon size={12} /> {tab.label}
                    {tab.check && <span className="inline-flex items-center justify-center w-4 h-4 bg-primary/20 text-primary text-[9px] rounded-full ml-0.5">✓</span>}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto relative p-4 sm:p-6 text-muted-foreground flex flex-col">
                 <div className="flex-1">
                   {activeTab === 'overview' && <div>Overview Content (Coming Soon)</div>}
                   {activeTab === 'video' && videoSrc && (
                     <div className="h-full flex items-center justify-center p-4 bg-black rounded-xl">
                       <video ref={videoRef} controls className="max-h-full max-w-full rounded-xl shadow-2xl" src={videoSrc} />
                     </div>
                   )}
                   {activeTab === 'summary' && (
                     <div className="prose prose-sm prose-invert max-w-4xl mx-auto">
                       {artifacts['lecture_intelligence'] ? (
                         <LectureIntelligenceView data={artifacts['lecture_intelligence']} />
                       ) : summary ? (
                         <ReactMarkdown>{summary}</ReactMarkdown>
                       ) : <div>No summary available</div>}
                     </div>
                   )}
                   {activeTab === 'transcript' && (
                     <div className="max-w-3xl mx-auto h-full" ref={transcriptScrollRef}>
                        <div className="prose prose-sm prose-invert max-w-none relative" style={{ height: transcriptBlocks.length > 0 ? \`\${transcriptVirtualizer.getTotalSize()}px\` : 'auto' }}>
                          {transcriptBlocks.map((block, i) => <div key={i} className="mb-4 text-white/90 leading-relaxed text-sm">{block}</div>)}
                        </div>
                     </div>
                   )}
                   {activeTab === 'notes' && <div>Notes Content (Coming Soon)</div>}
                   {activeTab === 'flashcards' && (
                      <div className="max-w-3xl mx-auto"><FlashcardManager lectureId={id!} onUpdate={() => {}} /></div>
                   )}
                   {activeTab === 'screenshots' && <div>Screenshots Content (Coming Soon)</div>}
                   {activeTab === 'formula_sheet' && <div>Formula Sheet Content (Coming Soon)</div>}
                   {activeTab === 'code' && <div>Code Content (Coming Soon)</div>}
                   {activeTab === 'timeline' && <div>Timeline Content (Coming Soon)</div>}
                   {activeTab === 'quiz' && <div>Quiz Content (Coming Soon)</div>}
                   {activeTab === 'bookmarks' && <div>Bookmarks Content (Coming Soon)</div>}
                   {activeTab === 'ai_chat' && <div>AI Chat Content (Coming Soon)</div>}
                 </div>
              </div>
            </div>
          }
          assistant={
            <div className="flex flex-col h-full bg-surface/30">
              <div className="p-3 border-b border-border/50 shrink-0 font-medium flex items-center justify-between gap-2 text-xs text-white/90">
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-5 bg-primary/20 rounded flex items-center justify-center">
                    <MessageSquare size={12} className="text-primary"/>
                  </div>
                  BACHAM Assistant
                </div>
                <button
                  className="lg:hidden text-muted-foreground hover:text-white transition-colors"
                  onClick={() => setShowRightPanel(false)}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-3" ref={chatScrollRef}>
                {chatHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="h-10 w-10 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 border border-white/10">
                      <BrainCircuit className="h-5 w-5 text-white/60" />
                    </div>
                    <h4 className="font-medium text-white/80 mb-1 text-xs">How can I help?</h4>
                    <p className="text-[10px] text-muted-foreground px-2">Ask questions about the lecture, request explanations, or generate practice questions.</p>
                  </div>
                ) : (
                  chatHistory.map((msg, i) => (
                    <div key={i} className={\`flex flex-col \${msg.role === 'user' ? 'items-end' : 'items-start'}\`}>
                      <div className={\`text-[9px] text-muted-foreground mb-0.5 px-1\`}>{msg.role === 'user' ? 'You' : 'Assistant'}</div>
                      <div className={\`p-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap shadow-sm border border-border/30 max-w-[92%]
                        \${msg.role === 'user' 
                          ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                          : 'bg-surface text-white/90 rounded-tl-sm'}\`}>
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
                {isSendingChat && (
                  <div className="flex flex-col items-start">
                    <div className="text-[9px] text-muted-foreground mb-0.5 px-1">Assistant</div>
                    <div className="p-2.5 rounded-2xl bg-surface border border-border/30 rounded-tl-sm flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-border/50 shrink-0 bg-surface/50 backdrop-blur-sm">
                <div className="relative">
                  <textarea 
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendChat();
                      }
                    }}
                    placeholder="Ask about this lecture..."
                    className="w-full bg-background border border-border/60 rounded-xl py-2.5 pl-3 pr-10 text-xs text-white resize-none h-10 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground"
                    disabled={isSendingChat}
                    rows={1}
                  />
                  <button 
                    onClick={handleSendChat}
                    disabled={isSendingChat || !prompt.trim()}
                    className="absolute right-2 top-1.5 h-7 w-7 bg-primary/10 text-primary rounded-lg flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
                  >
                    <Send size={12} />
                  </button>
                </div>
                <div className="text-[9px] text-center text-muted-foreground mt-1.5">
                  Enter to send · Shift+Enter for new line
                </div>
              </div>
            </div>
          }
        />`;

fs.writeFileSync(filePath, content.substring(0, startIdx) + newJsx + "\\n      </div>\\n    </div>\\n  );\\n}\\n");
console.log("Patched successfully");
