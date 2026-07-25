import { Network, Search, Filter } from 'lucide-react';
import { useState } from 'react';

interface KnowledgeGraphViewProps {
  data?: any;
}

export function KnowledgeGraphView({ data: _data }: KnowledgeGraphViewProps) {
  const [activeTab, setActiveTab] = useState<'concepts' | 'formulas' | 'applications'>('concepts');

  return (
    <div className="w-full h-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Network className="w-5 h-5" />
          <h2 className="text-sm font-semibold tracking-wide uppercase">Knowledge Graph</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center px-3 py-1.5 bg-surface-raised rounded-lg border border-border/50 text-xs text-muted-foreground focus-within:border-primary/50 transition-colors">
            <Search className="w-3.5 h-3.5 mr-2 opacity-50" />
            <input type="text" placeholder="Search concepts..." className="bg-transparent border-none outline-none w-32" />
          </div>
          <button className="p-1.5 rounded-lg border border-border/50 bg-surface text-muted-foreground hover:bg-surface-hover transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex p-1 bg-surface-raised border border-border/50 rounded-xl overflow-hidden shadow-sm self-start">
        <button onClick={() => setActiveTab('concepts')} className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'concepts' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-surface-hover'}`}>
          Core Concepts
        </button>
        <button onClick={() => setActiveTab('formulas')} className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'formulas' ? 'bg-indigo-500/10 text-indigo-400' : 'text-muted-foreground hover:bg-surface-hover'}`}>
          Formulas & Math
        </button>
        <button onClick={() => setActiveTab('applications')} className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'applications' ? 'bg-amber-500/10 text-amber-400' : 'text-muted-foreground hover:bg-surface-hover'}`}>
          Real World Applications
        </button>
      </div>

      <div className="flex-1 bg-surface border border-border/50 rounded-xl p-8 flex flex-col items-center justify-center text-center">
        <Network className="w-12 h-12 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">Knowledge Graph Building...</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          The AI is currently analyzing semantic concepts, visual formulas, and real-world applications across the lecture. 
        </p>
      </div>
    </div>
  );
}
