import React, { useState, useMemo } from 'react';
import { pluginManager } from '@/core/integrations/PluginManager';
import { IntegrationCard } from './IntegrationCard';
import { 
  Search, ShieldCheck, CheckSquare, FileText, 
  Calendar, BrainCircuit, Filter, CheckCircle2,
  PlugZap, ArrowUpRight, Lock, X
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCalendarStore } from '@/shared/stores/calendarStore';

type CategoryFilter = 'all' | 'tasks' | 'notes' | 'calendar' | 'ai' | 'connected';

export const IntegrationsHub: React.FC = () => {
  const navigate = useNavigate();
  const { setSyncModalOpen } = useCalendarStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const allPlugins = useMemo(() => {
    return pluginManager.getPlugins();
  }, [refreshTrigger]);

  // Determine connected count asynchronously on mount/trigger
  const [connectedMap, setConnectedMap] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    let isMounted = true;
    const updateStatuses = async () => {
      const results: Record<string, boolean> = {};
      for (const p of allPlugins) {
        if (p.auth?.type === 'none') {
          results[p.manifest.id] = true;
        } else if (p.auth?.isConnected) {
          try {
            results[p.manifest.id] = await p.auth.isConnected();
          } catch {
            results[p.manifest.id] = false;
          }
        }
      }
      if (isMounted) {
        setConnectedMap(results);
      }
    };
    updateStatuses();
    return () => { isMounted = false; };
  }, [allPlugins, refreshTrigger]);

  const connectedCount = useMemo(() => {
    return Object.values(connectedMap).filter(Boolean).length;
  }, [connectedMap]);

  // Filter plugins based on category & search
  const filteredPlugins = useMemo(() => {
    return allPlugins.filter(plugin => {
      // 1. Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = plugin.manifest.name.toLowerCase().includes(query);
        const matchesDesc = plugin.manifest.description.toLowerCase().includes(query);
        const matchesCategory = plugin.manifest.category.toLowerCase().includes(query);
        const matchesWhere = plugin.manifest.setupGuide?.whereToUse?.toLowerCase().includes(query) || false;
        if (!matchesName && !matchesDesc && !matchesCategory && !matchesWhere) {
          return false;
        }
      }

      // 2. Category filter
      if (selectedCategory === 'connected') {
        return connectedMap[plugin.manifest.id] === true;
      }
      if (selectedCategory === 'tasks') {
        return plugin.manifest.id === 'bacham.slack' || plugin.manifest.id === 'bacham.notion';
      }
      if (selectedCategory === 'notes') {
        return ['bacham.notion', 'bacham.localfolder', 'bacham.google-drive', 'bacham.gmail'].includes(plugin.manifest.id);
      }
      if (selectedCategory === 'calendar') {
        return plugin.manifest.category === 'Calendar';
      }
      if (selectedCategory === 'ai') {
        return plugin.manifest.category === 'AI Providers';
      }

      return true;
    });
  }, [allPlugins, searchQuery, selectedCategory, connectedMap]);

  const handleStatusChange = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Hero Header Card */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-3xl bg-surface/70 border border-border/80 p-8 shadow-2xl backdrop-blur-xl"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold shadow-sm">
              <PlugZap size={13} />
              <span>Bacham App Ecosystem</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Integrations & Tools Hub
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Connect your favorite workflow tools, note-taking apps, calendar schedules, and AI inference models. All API tokens and webhooks remain 100% on this device.
            </p>
          </div>

          {/* Quick Stats Bento */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="p-4 rounded-2xl bg-surface-raised/70 border border-border/60 shadow-inner flex flex-col justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span>Active</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-foreground">{connectedCount}</span>
                <span className="text-xs text-muted-foreground">/ {allPlugins.length} tools</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-raised/70 border border-border/60 shadow-inner flex flex-col justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>Security</span>
              </div>
              <div className="mt-2">
                <span className="text-xs font-bold text-emerald-400 block">AES-GCM</span>
                <span className="text-[10px] text-muted-foreground">On-device only</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mt-8">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search integrations by name, tool, or keyword (e.g. Slack, Notion, Obsidian, Llama)..."
            className="w-full bg-background/90 border border-border/80 rounded-2xl pl-11 pr-10 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </motion.div>

      {/* Popular Workflows Bento Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {/* Workflow 1: Tasks Sync */}
        <div 
          onClick={() => setSelectedCategory('tasks')}
          className="group relative overflow-hidden rounded-3xl bg-surface/40 border border-border/60 hover:border-primary/40 p-5 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between"
        >
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <CheckSquare size={16} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                View Tools <ArrowUpRight size={12} />
              </span>
            </div>
            <h3 className="text-sm font-bold text-foreground">Push Tasks to Slack & Notion</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Extract meeting action items automatically and dispatch checklists straight into your team's channels.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-border/40 flex items-center gap-2 text-[11px] font-bold text-primary">
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); navigate('/tasks'); }}
              className="hover:underline flex items-center gap-1"
            >
              <span>Go to Tasks Page</span>
              <ArrowUpRight size={12} />
            </button>
          </div>
        </div>

        {/* Workflow 2: Calendar Auto-Record */}
        <div 
          onClick={() => setSelectedCategory('calendar')}
          className="group relative overflow-hidden rounded-3xl bg-surface/40 border border-border/60 hover:border-blue-500/40 p-5 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between"
        >
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                <Calendar size={16} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-blue-400 transition-colors flex items-center gap-1">
                View Tools <ArrowUpRight size={12} />
              </span>
            </div>
            <h3 className="text-sm font-bold text-foreground">Auto-Record Calendar Calls</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Sync scheduled meetings from Google Calendar to detect Zoom & Google Meet calls and auto-record on time.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-border/40 flex items-center gap-2 text-[11px] font-bold text-blue-400">
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); setSyncModalOpen(true); }}
              className="hover:underline flex items-center gap-1"
            >
              <span>Sync Google Calendar</span>
              <ArrowUpRight size={12} />
            </button>
          </div>
        </div>

        {/* Workflow 3: Offline Private AI */}
        <div 
          onClick={() => setSelectedCategory('ai')}
          className="group relative overflow-hidden rounded-3xl bg-surface/40 border border-border/60 hover:border-cyan-500/40 p-5 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between"
        >
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
                <Lock size={16} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-cyan-400 transition-colors flex items-center gap-1">
                View Tools <ArrowUpRight size={12} />
              </span>
            </div>
            <h3 className="text-sm font-bold text-foreground">100% Private Offline AI</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Run local open-source models with Ollama or LM Studio. Zero cloud requests, zero subscriptions, complete confidentiality.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-border/40 flex items-center gap-2 text-[11px] font-bold text-cyan-400">
            <span>Ollama & LM Studio ready</span>
          </div>
        </div>
      </motion.div>

      {/* Filter Tabs Ribbon */}
      <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-4 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-2">
          {[
            { id: 'all', label: 'All Tools', count: allPlugins.length, icon: PlugZap },
            { id: 'tasks', label: 'Tasks & Team', count: 2, icon: CheckSquare },
            { id: 'notes', label: 'Notes & Vaults', count: 4, icon: FileText },
            { id: 'calendar', label: 'Calendar', count: 1, icon: Calendar },
            { id: 'ai', label: 'AI Inference', count: 7, icon: BrainCircuit },
            { id: 'connected', label: 'Connected', count: connectedCount, icon: CheckCircle2 },
          ].map(tab => {
            const isActive = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id as CategoryFilter)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
                    : 'bg-surface border border-border/70 text-muted-foreground hover:text-foreground hover:bg-surface-hover'
                }`}
              >
                <tab.icon size={13} />
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-black/20 text-primary-foreground' : 'bg-muted/70 text-muted-foreground'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active counter pill */}
        <div className="text-xs font-medium text-muted-foreground shrink-0 hidden md:block">
          Showing <span className="font-bold text-foreground">{filteredPlugins.length}</span> integrations
        </div>
      </div>

      {/* Integration Cards Grid */}
      {filteredPlugins.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center bg-surface/30 border border-border/60 rounded-3xl border-dashed">
          <Filter size={36} className="text-muted-foreground/40 mb-3" />
          <h3 className="text-sm font-bold text-foreground">No integrations match your search</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Try a different search term or select "All Tools" to browse all available plugins.
          </p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
            className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-sm"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[minmax(220px,auto)]">
          {filteredPlugins.map(plugin => (
            <IntegrationCard 
              key={plugin.manifest.id} 
              plugin={plugin} 
              onStatusChange={handleStatusChange} 
            />
          ))}
        </div>
      )}

      {/* Privacy Guarantee Footer */}
      <div className="p-6 rounded-3xl bg-surface/30 border border-border/50 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div>
            <p className="font-bold text-foreground">Privacy & Security First</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              All credentials are encrypted with AES-GCM and stored solely in your local machine's operating system vault.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[11px] shrink-0 font-medium">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Zero Cloud Storage of Keys
          </span>
        </div>
      </div>
    </div>
  );
};
