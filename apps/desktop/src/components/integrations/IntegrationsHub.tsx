import React, { useState, useMemo } from 'react';
import { pluginManager } from '@/core/integrations/PluginManager';
import { IntegrationCard } from './IntegrationCard';
import { Search, Filter, X } from 'lucide-react';

type CategoryFilter = 'all' | 'connected' | 'ai' | 'tools';

export const IntegrationsHub: React.FC = () => {
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

  const aiCount = useMemo(() => {
    return allPlugins.filter(p => p.manifest.category === 'AI Providers').length;
  }, [allPlugins]);

  const toolsCount = useMemo(() => {
    return allPlugins.filter(p => p.manifest.category !== 'AI Providers').length;
  }, [allPlugins]);

  // Filter plugins based on category & search
  const filteredPlugins = useMemo(() => {
    return allPlugins.filter(plugin => {
      // 1. Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = plugin.manifest.name.toLowerCase().includes(query);
        const matchesDesc = plugin.manifest.description.toLowerCase().includes(query);
        const matchesCategory = plugin.manifest.category.toLowerCase().includes(query);
        const matchesId = plugin.manifest.id.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesCategory && !matchesId) {
          return false;
        }
      }

      // 2. Category filter
      if (selectedCategory === 'connected') {
        return connectedMap[plugin.manifest.id] === true;
      }
      if (selectedCategory === 'ai') {
        return plugin.manifest.category === 'AI Providers';
      }
      if (selectedCategory === 'tools') {
        return plugin.manifest.category !== 'AI Providers';
      }

      return true;
    });
  }, [allPlugins, searchQuery, selectedCategory, connectedMap]);

  const handleStatusChange = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const tabs: { id: CategoryFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All Integrations', count: allPlugins.length },
    { id: 'connected', label: 'Connected', count: connectedCount },
    { id: 'ai', label: 'AI Inference', count: aiCount },
    { id: 'tools', label: 'Apps & Storage', count: toolsCount },
  ];

  return (
    <div className="space-y-6 w-full pb-10">
      {/* Header & Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Integrations Hub</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Connect calendars, cloud storage vaults, team messaging, and LLM inference providers.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72 shrink-0">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search integrations..."
            className="w-full bg-surface border border-border rounded-xl pl-9 pr-8 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map(tab => {
          const isActive = selectedCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-foreground text-background font-bold shadow-sm'
                  : 'bg-surface border border-border text-muted-foreground hover:text-foreground hover:bg-surface-raised'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                isActive 
                  ? 'bg-background/20 text-background font-bold' 
                  : 'bg-surface-raised text-muted-foreground border border-border/50'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Clean 3-Column Responsive Grid */}
      {filteredPlugins.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center bg-surface border border-border rounded-2xl border-dashed">
          <Filter size={32} className="text-muted-foreground/40 mb-2" />
          <h3 className="text-sm font-bold text-foreground">No integrations found</h3>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">
            Try adjusting your search query or reset filters.
          </p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
            className="mt-3 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:brightness-105 transition-all cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlugins.map(plugin => (
            <IntegrationCard 
              key={plugin.manifest.id} 
              plugin={plugin} 
              onStatusChange={handleStatusChange} 
            />
          ))}
        </div>
      )}
    </div>
  );
};
