import { useState, useEffect, useRef } from 'react';
import { Tag } from '@/infrastructure/tauri-client';
import { TauriClient } from '@/infrastructure/tauri-client';
import { X, Tag as TagIcon } from 'lucide-react';
import { cn } from '@/components';

interface TagInputProps {
    lectureId: string;
    existingTags: string[];
    onTagsChange: () => void;
}

export function TagInput({ lectureId, existingTags, onTagsChange }: TagInputProps) {
    const [availableTags, setAvailableTags] = useState<Tag[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        TauriClient.listTags().then(setAvailableTags).catch(console.error);
    }, []);

    const handleAdd = async (tagName: string) => {
        if (!tagName.trim()) return;
        if (existingTags.includes(tagName)) {
            setInputValue('');
            return;
        }
        await TauriClient.addTagToLecture(lectureId, tagName.trim());
        setInputValue('');
        onTagsChange();
        // Refresh available tags to include newly created ones
        TauriClient.listTags().then(setAvailableTags).catch(console.error);
    };

    const handleRemove = async (tagName: string) => {
        await TauriClient.removeTagFromLecture(lectureId, tagName);
        onTagsChange();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd(inputValue);
        } else if (e.key === 'Backspace' && !inputValue && existingTags.length > 0) {
            handleRemove(existingTags[existingTags.length - 1]);
        }
    };

    const filteredSuggestions = availableTags
        .filter(t => t.name.toLowerCase().includes(inputValue.toLowerCase()) && !existingTags.includes(t.name))
        .slice(0, 5);

    return (
        <div className="relative">
            <div 
                className={cn(
                    "flex flex-wrap items-center gap-1.5 p-1.5 min-h-[36px] bg-background border rounded-md transition-colors",
                    isFocused ? "border-primary shadow-[0_0_0_2px_rgba(166,255,0,0.1)]" : "border-border hover:border-border/80"
                )}
                onClick={() => inputRef.current?.focus()}
            >
                <TagIcon size={14} className="text-muted-foreground ml-1 mr-0.5 shrink-0" />
                
                {existingTags.map(tag => (
                    <span 
                        key={tag}
                        className="flex items-center gap-1 px-2 py-0.5 bg-surface-hover text-foreground text-xs rounded-full border border-border"
                    >
                        {tag}
                        <button 
                            className="hover:text-destructive transition-colors rounded-full p-0.5 hover:bg-background"
                            onClick={(e) => { e.stopPropagation(); handleRemove(tag); }}
                        >
                            <X size={10} />
                        </button>
                    </span>
                ))}
                
                <input
                    ref={inputRef}
                    className="flex-1 min-w-[80px] bg-transparent outline-none text-sm px-1 py-0.5 text-foreground placeholder-muted-foreground"
                    placeholder={existingTags.length === 0 ? "Add tags..." : ""}
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                />
            </div>

            {/* Autocomplete Dropdown */}
            {isFocused && inputValue && filteredSuggestions.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-md shadow-lg overflow-hidden">
                    {filteredSuggestions.map(tag => (
                        <div
                            key={tag.id}
                            className="px-3 py-2 text-sm text-foreground hover:bg-surface-hover cursor-pointer"
                            onClick={() => handleAdd(tag.name)}
                        >
                            {tag.name}
                        </div>
                    ))}
                    {!filteredSuggestions.find(t => t.name.toLowerCase() === inputValue.toLowerCase()) && (
                        <div
                            className="px-3 py-2 text-sm text-primary hover:bg-surface-hover cursor-pointer font-medium"
                            onClick={() => handleAdd(inputValue)}
                        >
                            Create "{inputValue}"
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
