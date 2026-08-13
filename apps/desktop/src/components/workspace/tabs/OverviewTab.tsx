import { Play, Clock, BookOpen, Hash, BarChart } from 'lucide-react';
import { motion } from 'framer-motion';
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
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="relative overflow-hidden bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl flex flex-col md:flex-row group shadow-2xl"
      >
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
      </motion.div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Clock} label="Duration" value={`${Math.round(lecture.durationMs / 60000)} min`} />
        <StatCard icon={Hash} label="Chapters" value={chapters.length.toString()} />
        <StatCard icon={BarChart} label="Difficulty" value="Adaptive" />
        <StatCard icon={BookOpen} label="Concepts" value={keyConcepts.length.toString()} />
      </div>

      {/* Key Concepts Tags */}
      {keyConcepts.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
          className="relative overflow-hidden bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl"
        >
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
        </motion.div>
      )}

    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="relative overflow-hidden bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col gap-2 shadow-xl group"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <Icon size={14} />
          <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
        </div>
        <div className="text-xl sm:text-2xl font-semibold text-foreground">{value}</div>
      </div>
    </motion.div>
  );
}
