import { useState } from 'react';
import { useFolderStore } from '@/shared/stores/folderStore';
import { Folder } from '@/shared/types';
import { X, Lock, Unlock, Download, Check, Loader2, Folder as FolderIcon } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { motion, AnimatePresence } from 'framer-motion';

interface FolderSettingsDialogProps {
    folder: Folder;
    onClose: () => void;
}

const PRESET_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#6366f1', '#eab308'];

export function FolderSettingsDialog({ folder, onClose }: FolderSettingsDialogProps) {
    const { updateFolder, lockFolder, unlockFolder, exportFolder } = useFolderStore();
    const { showToast } = useToast();
    
    const [name, setName] = useState(folder.name);
    const [description, setDescription] = useState(folder.description || '');
    const [color, setColor] = useState(folder.color || '#3b82f6');
    const [icon, setIcon] = useState(folder.icon || '');
    const [passcode, setPasscode] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isLocking, setIsLocking] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) {
            showToast('Folder name cannot be empty', 'error');
            return;
        }
        setIsSaving(true);
        try {
            await updateFolder(folder.id, name.trim(), color, icon, description.trim());
            showToast('Folder settings saved', 'success');
            onClose();
        } catch (e: any) {
            showToast(`Error saving folder: ${e.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLock = async () => {
        if (!passcode.trim()) {
            showToast('Enter a passcode to lock folder', 'error');
            return;
        }
        setIsLocking(true);
        try {
            await lockFolder(folder.id, passcode.trim());
            setPasscode('');
            showToast('Folder locked successfully', 'success');
        } catch (e: any) {
            showToast(`Lock error: ${e.message}`, 'error');
        } finally {
            setIsLocking(false);
        }
    };

    const handleUnlock = async () => {
        if (!passcode.trim()) {
            showToast('Enter passcode to unlock', 'error');
            return;
        }
        setIsLocking(true);
        try {
            const ok = await unlockFolder(folder.id, passcode.trim());
            if (!ok) {
                showToast('Incorrect passcode', 'error');
            } else {
                setPasscode('');
                showToast('Folder unlocked', 'success');
            }
        } catch (e: any) {
            showToast(`Unlock error: ${e.message}`, 'error');
        } finally {
            setIsLocking(false);
        }
    };

    const handleExport = async () => {
        try {
            const dest = await (window as any).__TAURI__?.dialog?.save({
                filters: [{ name: 'BACHAM Bundle', extensions: ['bacham'] }]
            });
            if (dest) {
                await exportFolder(folder.id, dest, { includeMedia: true, includeStudyMaterials: true });
                showToast('Folder exported successfully', 'success');
            }
        } catch (e: any) {
            showToast(`Export error: ${e.message}`, 'error');
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.96, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 8 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                        <div className="flex items-center gap-2.5">
                            <div 
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shadow-xs border border-white/10"
                                style={{ backgroundColor: color + '25', color: color }}
                            >
                                {icon || <FolderIcon size={16} />}
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Folder Settings</h2>
                                <p className="text-[11px] text-[var(--text-muted)]">Configure details, privacy, and export</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-xl transition-colors cursor-pointer"
                        >
                            <X size={16} />
                        </button>
                    </div>
                    
                    {/* Body */}
                    <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                        {/* Name */}
                        <div>
                            <label className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                                Folder Name
                            </label>
                            <input 
                                className="w-full bg-[var(--surface)] border border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-all"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Folder name..."
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                                Description
                            </label>
                            <textarea 
                                className="w-full bg-[var(--surface)] border border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-all h-20 resize-none"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Optional folder description..."
                            />
                        </div>

                        {/* Color & Emoji */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                                    Color
                                </label>
                                <div className="flex items-center gap-1.5 flex-wrap p-2 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                                    {PRESET_COLORS.map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setColor(c)}
                                            style={{ backgroundColor: c }}
                                            className={`w-5 h-5 rounded-full transition-transform cursor-pointer shrink-0 ${color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-[var(--surface)] scale-110' : 'hover:scale-105 opacity-80'}`}
                                        />
                                    ))}
                                    <input 
                                        type="color"
                                        className="w-5 h-5 p-0 border-0 rounded-full cursor-pointer bg-transparent"
                                        value={color}
                                        onChange={e => setColor(e.target.value)}
                                        title="Custom color"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                                    Emoji Icon
                                </label>
                                <input 
                                    className="w-full text-center text-lg h-[41px] bg-[var(--surface)] border border-[var(--border)] focus:border-[var(--accent)] rounded-xl text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-muted)]"
                                    value={icon}
                                    onChange={e => setIcon(e.target.value.substring(0, 2))}
                                    placeholder="📁"
                                />
                            </div>
                        </div>

                        {/* Security / Privacy */}
                        <div className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-2.5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                                    {folder.isLocked ? (
                                        <Lock size={14} className="text-amber-400" />
                                    ) : (
                                        <Unlock size={14} className="text-[var(--text-muted)]" />
                                    )}
                                    <span>Passcode Protection</span>
                                </h3>
                                {folder.isLocked && (
                                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                        Locked
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                                {folder.isLocked 
                                    ? 'This folder is currently locked. Enter passcode to remove protection.' 
                                    : 'Locking requires a passcode before opening or editing note contents.'}
                            </p>
                            
                            <div className="flex items-center gap-2 pt-0.5">
                                <input 
                                    type="password"
                                    className="flex-1 bg-[var(--surface-raised)] border border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-3 py-2 text-xs font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-all"
                                    placeholder={folder.isLocked ? "Enter passcode to unlock" : "Set new passcode"}
                                    value={passcode}
                                    onChange={e => setPasscode(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            folder.isLocked ? handleUnlock() : handleLock();
                                        }
                                    }}
                                />
                                {folder.isLocked ? (
                                    <button 
                                        type="button"
                                        onClick={handleUnlock} 
                                        disabled={isLocking}
                                        className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 transition-all whitespace-nowrap cursor-pointer disabled:opacity-50"
                                    >
                                        {isLocking ? 'Unlocking...' : 'Unlock'}
                                    </button>
                                ) : (
                                    <button 
                                        type="button"
                                        onClick={handleLock} 
                                        disabled={isLocking}
                                        className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] transition-all whitespace-nowrap cursor-pointer disabled:opacity-50"
                                    >
                                        {isLocking ? 'Locking...' : 'Lock'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Data Portability */}
                        <div className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-2">
                            <h3 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                                <Download size={14} className="text-[var(--text-muted)]" /> 
                                <span>Data Portability</span>
                            </h3>
                            <button 
                                type="button"
                                onClick={handleExport} 
                                className="w-full flex items-center justify-center gap-2 bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                            >
                                <Download size={13} />
                                <span>Export Folder Bundle (.bacham)</span>
                            </button>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-3.5 border-t border-[var(--border)] bg-[var(--surface)] flex justify-end items-center gap-2 shrink-0">
                        <button 
                            type="button"
                            onClick={onClose} 
                            className="px-4 py-2 text-xs font-medium rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button 
                            type="button"
                            onClick={handleSave} 
                            disabled={isSaving} 
                            className="px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--text-primary)] text-[var(--bg)] hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 size={13} className="animate-spin" />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <Check size={13} />
                                    <span>Save Changes</span>
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
