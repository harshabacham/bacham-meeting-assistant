
import { FilterQuery, FilterCondition } from '@/infrastructure/tauri-client';
import { Plus, Trash2, Filter } from 'lucide-react';

interface FilterPanelProps {
    currentFilter: FilterQuery | null;
    onChange: (filter: FilterQuery | null) => void;
}

export function FilterPanel({ currentFilter, onChange }: FilterPanelProps) {
    

    const addCondition = () => {
        const filter = currentFilter || { matchType: 'All', conditions: [] };
        onChange({
            ...filter,
            conditions: [...filter.conditions, { field: 'tags', operator: 'contains', value: '' }]
        });
    };

    const updateCondition = (index: number, updates: Partial<FilterCondition>) => {
        if (!currentFilter) return;
        const newConditions = [...currentFilter.conditions];
        newConditions[index] = { ...newConditions[index], ...updates };
        onChange({ ...currentFilter, conditions: newConditions });
    };

    const removeCondition = (index: number) => {
        if (!currentFilter) return;
        const newConditions = [...currentFilter.conditions];
        newConditions.splice(index, 1);
        if (newConditions.length === 0) {
            onChange(null);
        } else {
            onChange({ ...currentFilter, conditions: newConditions });
        }
    };



    return (
        <div className="bg-surface border-b p-4 space-y-4" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Filter size={14} /> Active Filters
                </h3>
                {currentFilter && (
                    <div className="flex items-center gap-2 text-xs">
                        <span>Match</span>
                        <select 
                            className="input-field py-1 px-2 h-auto text-xs"
                            value={currentFilter.matchType}
                            onChange={e => onChange({ ...currentFilter, matchType: e.target.value as 'All' | 'Any' })}
                        >
                            <option value="All">All rules</option>
                            <option value="Any">Any rule</option>
                        </select>
                    </div>
                )}
            </div>

            <div className="space-y-2">
                {currentFilter?.conditions.map((cond, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <select 
                            className="input-field text-xs flex-1"
                            value={cond.field}
                            onChange={e => updateCondition(i, { field: e.target.value })}
                        >
                            <option value="tags">Tags</option>
                            <option value="title">Title</option>
                            <option value="course">Course</option>
                            <option value="teacher">Teacher</option>
                            <option value="subject">Subject</option>
                            <option value="isFavorite">Favorite</option>
                            <option value="isArchived">Archived</option>
                        </select>

                        <select 
                            className="input-field text-xs flex-1"
                            value={cond.operator}
                            onChange={e => updateCondition(i, { operator: e.target.value as any })}
                        >
                            <option value="contains">Contains</option>
                            <option value="equals">Equals</option>
                            {(cond.field === 'isFavorite' || cond.field === 'isArchived') && (
                                <>
                                    <option value="is_true">Is True</option>
                                    <option value="is_false">Is False</option>
                                </>
                            )}
                        </select>

                        {cond.operator !== 'is_true' && cond.operator !== 'is_false' && (
                            <input 
                                className="input-field text-xs flex-1"
                                placeholder="Value..."
                                value={cond.value as string}
                                onChange={e => updateCondition(i, { value: e.target.value })}
                            />
                        )}

                        <button 
                            className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            onClick={() => removeCondition(i)}
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between pt-2">
                <button 
                    className="btn btn-secondary text-xs flex items-center gap-1"
                    onClick={addCondition}
                >
                    <Plus size={12} /> Add Rule
                </button>
            </div>
        </div>
    );
}
