import { useState, useEffect, useRef } from 'react';
import { useLectureStore } from '@/shared/stores/lectureStore';
import { useFolderStore } from '@/shared/stores/folderStore';
import { TauriClient } from '@/infrastructure/tauri-client';
import { X, Tag as TagIcon, Clock, BookOpen, User, Calendar, Hash, Sparkles, Folder as FolderIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface LecturePropertiesPanelProps {
    lectureId: string;
    onClose: () => void;
}

export function LecturePropertiesPanel({ lectureId, onClose }: LecturePropertiesPanelProps) {
    const { lectures, fetchLectures } = useLectureStore();
    const { folderTree } = useFolderStore();
    const lecture = lectures.find(l => l.id === lectureId);
    
    const [title, setTitle] = useState('');
    const [course, setCourse] = useState('');
    const [teacher, setTeacher] = useState('');
    const [subject, setSubject] = useState('');
    const [semester, setSemester] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [allTags, setAllTags] = useState<{ id: string, name: string, color?: string }[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [summary, setSummary] = useState<string | null>(null);
    const [isSummaryLoading, setIsSummaryLoading] = useState(false);
    
    const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Sync state when lecture changes
    useEffect(() => {
        if (lecture) {
            setTitle(lecture.title || '');
            setCourse(lecture.course || '');
            setTeacher(lecture.teacher || '');
            setSubject(lecture.subject || '');
            setSemester(lecture.semester || '');
            setTags(lecture.tags || []);
        }
    }, [lecture]);

    useEffect(() => {
        TauriClient.listTags().then(setAllTags);
    }, []);
    
    useEffect(() => {
        if (lecture && (lecture as any).hasSummary) {
            setIsSummaryLoading(true);
            TauriClient.getSummary(lecture.id)
                .then(setSummary)
                .catch(() => setSummary(null))
                .finally(() => setIsSummaryLoading(false));
        } else {
            setSummary(null);
        }
    }, [lecture?.id]);

    const handleSave = async (updates: any) => {
        await TauriClient.updateLecture({ id: lectureId, ...updates });
        fetchLectures();
    };

    const debouncedSave = (updates: any) => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            handleSave(updates);
        }, 500);
    };

    const handleChange = (field: string, value: string) => {
        if (field === 'title') setTitle(value);
        if (field === 'course') setCourse(value);
        if (field === 'teacher') setTeacher(value);
        if (field === 'subject') setSubject(value);
        if (field === 'semester') setSemester(value);
        debouncedSave({ [field]: value });
    };

    const handleAddTag = async (e?: React.KeyboardEvent) => {
        if (e && e.key !== 'Enter') return;
        const newTag = tagInput.trim();
        if (!newTag) return;
        if (!tags.includes(newTag)) {
            await TauriClient.addTagToLecture(lectureId, newTag);
            setTagInput('');
            fetchLectures();
            TauriClient.listTags().then(setAllTags);
        }
    };

    const handleRemoveTag = async (tagName: string) => {
        await TauriClient.removeTagFromLecture(lectureId, tagName);
        fetchLectures();
    };

    if (!lecture) return null;

    const folderName = lecture.folderId ? folderTree.find((f: any) => f.folder.id === lecture.folderId)?.folder.name : null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6"
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                onClick={e => e.stopPropagation()}
                className="bg-surface border border-border shadow-2xl rounded-[24px] w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-border/50 flex items-center justify-between bg-background/50">
                    <div>
                        <h2 className="text-lg font-bold text-foreground">Lecture Details</h2>
                        <p className="text-xs text-muted-foreground mt-1">Edit properties, metadata, and tags</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-hover text-muted-foreground transition-colors outline-none">
                        <X size={16} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
                    {/* Title */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Title</label>
                        <input 
                            value={title} 
                            onChange={e => handleChange('title', e.target.value)}
                            className="w-full text-lg font-semibold bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all shadow-sm"
                            placeholder="Lecture Title"
                        />
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <FolderIcon size={14} /> Location
                        </label>
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20 text-sm shadow-sm">
                            <FolderIcon size={18} className="text-primary" />
                            <span className="font-semibold text-primary">{folderName || "All Notes (Root)"}</span>
                        </div>
                    </div>
                    
                    {/* Grid for Metadata */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Properties */}
                        <div className="space-y-4 bg-background p-5 rounded-2xl border border-border shadow-sm">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Metadata</h4>
                            
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 group">
                                    <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0 group-focus-within:border-primary/50 group-focus-within:text-primary transition-colors">
                                        <BookOpen size={14} />
                                    </div>
                                    <input 
                                        value={course} 
                                        onChange={e => handleChange('course', e.target.value)}
                                        className="flex-1 bg-transparent border-b border-border/50 focus:border-primary/50 focus:outline-none py-1.5 text-sm transition-colors"
                                        placeholder="Course..."
                                    />
                                </div>
                                
                                <div className="flex items-center gap-3 group">
                                    <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0 group-focus-within:border-primary/50 group-focus-within:text-primary transition-colors">
                                        <User size={14} />
                                    </div>
                                    <input 
                                        value={teacher} 
                                        onChange={e => handleChange('teacher', e.target.value)}
                                        className="flex-1 bg-transparent border-b border-border/50 focus:border-primary/50 focus:outline-none py-1.5 text-sm transition-colors"
                                        placeholder="Teacher..."
                                    />
                                </div>
                                
                                <div className="flex items-center gap-3 group">
                                    <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0 group-focus-within:border-primary/50 group-focus-within:text-primary transition-colors">
                                        <Hash size={14} />
                                    </div>
                                    <input 
                                        value={subject} 
                                        onChange={e => handleChange('subject', e.target.value)}
                                        className="flex-1 bg-transparent border-b border-border/50 focus:border-primary/50 focus:outline-none py-1.5 text-sm transition-colors"
                                        placeholder="Subject..."
                                    />
                                </div>
                                
                                <div className="flex items-center gap-3 group">
                                    <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0 group-focus-within:border-primary/50 group-focus-within:text-primary transition-colors">
                                        <Calendar size={14} />
                                    </div>
                                    <input 
                                        value={semester} 
                                        onChange={e => handleChange('semester', e.target.value)}
                                        className="flex-1 bg-transparent border-b border-border/50 focus:border-primary/50 focus:outline-none py-1.5 text-sm transition-colors"
                                        placeholder="Semester..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Tags */}
                        <div className="space-y-4 bg-background p-5 rounded-2xl border border-border shadow-sm">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-1.5">
                                <TagIcon size={14} /> Tags
                            </h4>
                            
                            <div className="flex flex-wrap gap-2 mb-4 min-h-[40px] items-start content-start">
                                {tags.map(tag => (
                                    <span 
                                        key={tag} 
                                        className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-border bg-surface-raised text-foreground font-medium hover:border-destructive/50 transition-colors group cursor-default"
                                    >
                                        {tag}
                                        <button onClick={() => handleRemoveTag(tag)} className="text-muted-foreground group-hover:text-destructive transition-colors">
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                                {tags.length === 0 && (
                                    <span className="text-xs text-muted-foreground italic mt-1">No tags added yet.</span>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-2 relative mt-auto">
                                <input 
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    onKeyDown={handleAddTag}
                                    placeholder="Add a new tag..."
                                    className="w-full text-sm bg-surface border border-border rounded-xl pl-3 pr-16 py-2 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                                    list="available-tags"
                                />
                                <button 
                                    onClick={() => handleAddTag()}
                                    className="absolute right-1 top-1 bottom-1 px-3 text-xs font-bold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                >
                                    ADD
                                </button>
                                <datalist id="available-tags">
                                    {allTags.map(t => <option key={t.id} value={t.name} />)}
                                </datalist>
                            </div>
                        </div>
                    </div>

                    {/* AI Summary Preview */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Sparkles size={14} className="text-primary" /> AI Summary
                        </label>
                        <div className="p-5 rounded-2xl bg-surface-raised border border-border/50 text-sm text-foreground leading-relaxed shadow-inner">
                            {isSummaryLoading ? (
                                <div className="flex flex-col gap-3 opacity-50">
                                    <div className="h-2.5 bg-border rounded-full w-full animate-pulse"></div>
                                    <div className="h-2.5 bg-border rounded-full w-5/6 animate-pulse"></div>
                                    <div className="h-2.5 bg-border rounded-full w-4/6 animate-pulse"></div>
                                </div>
                            ) : summary ? (
                                <div className="line-clamp-4">{summary}</div>
                            ) : (
                                <span className="text-muted-foreground italic flex items-center gap-2">
                                    <BookOpen size={14} /> Open the lecture and use the AI Workspace to generate a summary.
                                </span>
                            )}
                        </div>
                    </div>

                </div>
                
                {/* Footer Stats */}
                <div className="p-4 border-t border-border/50 bg-background/50 flex items-center justify-between text-[11px] font-medium text-muted-foreground rounded-b-[24px]">
                    <span className="flex items-center gap-1.5 bg-surface px-2 py-1 rounded-md border border-border/50">
                        <Clock size={12}/> Added: {new Date(lecture.createdAt).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1.5 bg-surface px-2 py-1 rounded-md border border-border/50">
                        <Clock size={12}/> Updated: {new Date(lecture.updatedAt).toLocaleString()}
                    </span>
                </div>
            </motion.div>
        </motion.div>
    );
}

