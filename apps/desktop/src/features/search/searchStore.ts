import { create } from 'zustand';
import { TauriClient } from '@/infrastructure/tauri-client';
import { 
    UniversalSearchResults, 
    SearchSuggestion, 
    SearchHistoryEntry,
    SearchFilters,
    SearchSort
} from '@/infrastructure/tauri-client';

interface SearchState {
    // UI State
    isOpen: boolean;
    query: string;
    selectedResultIndex: number;
    
    // Data State
    results: UniversalSearchResults | null;
    suggestions: SearchSuggestion[];
    history: SearchHistoryEntry[];
    isLoading: boolean;
    error: string | null;

    // Filters
    filters: SearchFilters;
    sort: SearchSort;

    // Actions
    open: () => void;
    close: () => void;
    setQuery: (query: string) => void;
    executeSearch: () => Promise<void>;
    fetchSuggestions: (query: string) => Promise<void>;
    loadHistory: () => Promise<void>;
    clear: () => void;
    navigateResults: (direction: 'up' | 'down') => void;
    setFilters: (filters: Partial<SearchFilters>) => void;
    setSort: (sort: SearchSort) => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
    isOpen: false,
    query: '',
    selectedResultIndex: -1,
    
    results: null,
    suggestions: [],
    history: [],
    isLoading: false,
    error: null,

    filters: {},
    sort: 'relevance',

    open: () => {
        set({ isOpen: true });
        get().loadHistory();
    },

    close: () => set({ isOpen: false, query: '', selectedResultIndex: -1, results: null }),

    setQuery: (query: string) => {
        set({ query, selectedResultIndex: -1 });
        if (query.trim().length > 0) {
            get().executeSearch();
            get().fetchSuggestions(query);
        } else {
            set({ results: null, suggestions: [] });
            get().loadHistory();
        }
    },

    executeSearch: async () => {
        const { query, filters, sort } = get();
        if (!query.trim()) return;

        set({ isLoading: true, error: null });
        try {
            const results = await TauriClient.universalSearch(query, filters, sort, 10);
            set({ results, isLoading: false });
        } catch (error: any) {
            console.error('Search failed:', error);
            set({ error: error.message || 'Search failed', isLoading: false, results: null });
        }
    },

    fetchSuggestions: async (query: string) => {
        try {
            const suggestions = await TauriClient.getSearchSuggestions(query);
            set({ suggestions });
        } catch (error) {
            console.error('Failed to fetch suggestions:', error);
        }
    },

    loadHistory: async () => {
        try {
            const history = await TauriClient.listSearchHistory(10);
            set({ history });
        } catch (error) {
            console.error('Failed to load search history:', error);
        }
    },

    clear: () => set({ query: '', results: null, selectedResultIndex: -1, suggestions: [] }),

    navigateResults: (direction: 'up' | 'down') => {
        const state = get();
        const maxIndex = state.results ? state.results.bestOverall.length - 1 : 0; // Simplified for now
        
        if (maxIndex < 0) return;

        let newIndex = state.selectedResultIndex;
        if (direction === 'down') {
            newIndex = newIndex >= maxIndex ? 0 : newIndex + 1;
        } else {
            newIndex = newIndex <= 0 ? maxIndex : newIndex - 1;
        }
        
        set({ selectedResultIndex: newIndex });
    },

    setFilters: (newFilters) => {
        set((state) => ({ filters: { ...state.filters, ...newFilters } }));
        if (get().query.trim()) {
            get().executeSearch();
        }
    },

    setSort: (sort) => {
        set({ sort });
        if (get().query.trim()) {
            get().executeSearch();
        }
    }
}));
