import { Play, Clock, BookOpen, Hash, BarChart } from 'lucide-react';
import { Lecture } from '@/shared/types';

interface OverviewTabProps {
  lecture: Lecture;
  artifacts: Record<string, any>;
  thumbnailSrc?: string;
  onJumpToVideo: () => void;
}

export function OverviewTab({ lecture, artifacts, thumbnailSrc, onJumpToVideo }: OverviewTabProps) {
  const summaryData = artifacts['lecture_intelligence'];
  const executiveSummary = summaryData?.executive_summary || "No summary available yet. Waiting for AI processing to complete.";
  const keyConcepts = summaryData?.key_concepts || [];
  const chapters = summaryData?.chapter_breakdown || [];
  
  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* Hero Card */}
      <div className="bg-surface border border-border/50 rounded-2xl overflow-hidden flex flex-col md:flex-row group hover:-translate-y-1 hover:shadow-2xl transition-all duration-300">
        <div className="md:w-1/3 relative h-48 md:h-auto bg-background shrink-0">
          {thumbnailSrc ? (
            <img src={thumbnailSrc} alt="Thumbnail" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-surface-hover">
               <BookOpen size={48} className="text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
          <button 
            onClick={onJumpToVideo} 
            className="absolute bottom-4 left-4 flex items-center gap-2 bg-[var(--accent)] text-background px-4 py-2 rounded-full font-bold text-xs sm:text-sm shadow-lg hover:scale-[0.97] transition-transform active:scale-95"
          >
            <Play size={14} fill="currentColor" />
            Jump Back In
          </button>
        </div>
        
        <div className="p-6 md:p-8 flex-1 flex flex-col justify-center">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">{lecture.title}</h2>
          <div className="text-muted-foreground text-sm leading-relaxed max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {Array.isArray(executiveSummary) ? (
              <div className="space-y-4">
                {executiveSummary.map((sec: any, idx: number) => (
                  <div key={idx}>
                    {sec.section_title && <strong className="block text-foreground mb-1">{sec.section_title}</strong>}
                    <span className="text-muted-foreground">{sec.content || sec}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">{executiveSummary}</span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Clock} label="Duration" value={`${Math.round(lecture.durationMs / 60000)} min`} />
        <StatCard icon={Hash} label="Chapters" value={chapters.length.toString()} />
        <StatCard icon={BarChart} label="Difficulty" value="Adaptive" />
        <StatCard icon={BookOpen} label="Concepts" value={keyConcepts.length.toString()} />
      </div>

      {/* Key Concepts Tags */}
      {keyConcepts.length > 0 && (
        <div className="bg-surface border border-border/50 rounded-2xl p-6 md:p-8 group hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Hash size={18} className="text-[var(--accent)]" /> 
            Core Concepts
          </h3>
          <div className="flex flex-wrap gap-2">
            {keyConcepts.map((concept: any, idx: number) => {
              const text = typeof concept === 'string' ? concept : concept.term || concept.concept || JSON.stringify(concept);
              return (
                <span key={idx} className="bg-background border border-border/60 text-muted-foreground px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 hover:border-[var(--border-accent)] hover:text-foreground transition-colors cursor-default">
                  {text}
                </span>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="bg-surface border border-border/50 rounded-xl p-4 flex flex-col gap-2 group hover:-translate-y-1 hover:border-[var(--border-accent)] transition-all duration-300">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon size={14} />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-xl sm:text-2xl font-semibold text-foreground">{value}</div>
    </div>
  );
}
