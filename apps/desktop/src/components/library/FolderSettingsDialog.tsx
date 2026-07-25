import { useState } from 'react';
import { useFolderStore } from '@/shared/stores/folderStore';
import { Folder } from '@/shared/types';
import { X, Lock, Unlock, Download, Save } from 'lucide-react';
interface FolderSettingsDialogProps {
    folder: Folder;
    onClose: () => void;
}

export function FolderSettingsDialog({ folder, onClose }: FolderSettingsDialogProps) {
    const { updateFolder, lockFolder, unlockFolder, exportFolder } = useFolderStore();
    
    const [name, setName] = useState(folder.name);
    const [description, setDescription] = useState(folder.description || '');
    const [color, setColor] = useState(folder.color || '#3b82f6');
    const [icon, setIcon] = useState(folder.icon || '');
    const [passcode, setPasscode] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateFolder(folder.id, name, color, icon, description);
            onClose();
        } catch (e: any) {
            alert(`Error saving folder: ${e.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleLock = async () => {
        if (!passcode) return alert('Enter a passcode');
        try {
            await lockFolder(folder.id, passcode);
            setPasscode('');
            alert('Folder locked successfully.');
        } catch (e: any) {
            alert(`Lock error: ${e.message}`);
        }
    };

    const handleUnlock = async () => {
        if (!passcode) return alert('Enter a passcode');
        try {
            const ok = await unlockFolder(folder.id, passcode);
            if (!ok) alert('Incorrect passcode');
            else {
                setPasscode('');
                alert('Folder unlocked.');
            }
        } catch (e: any) {
            alert(`Unlock error: ${e.message}`);
        }
    };

    const handleExport = async () => {
        const dest = await (window as any).__TAURI__.dialog.save({
            filters: [{ name: 'BACHAM Bundle', extensions: ['bacham'] }]
        });
        if (dest) {
            try {
                await exportFolder(folder.id, dest, { includeMedia: true, includeStudyMaterials: true });
                alert('Folder exported successfully.');
            } catch (e: any) {
                alert(`Export error: ${e.message}`);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-[var(--glass-bg)] backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="text-lg font-semibold text-foreground">Folder Settings</h2>
                    <button onClick={onClose} className="p-1 text-muted-foreground hover:bg-surface-hover hover:text-foreground rounded">
                        <X size={18} />
                    </button>
                </div>
                
                <div className="p-4 space-y-4 overflow-y-auto">
                    {/* Basic Info */}
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Name</label>
                            <input 
                                className="input-field w-full"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                            <textarea 
                                className="input-field w-full h-20 resize-none"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Optional description..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Color</label>
                                <input 
                                    type="color"
                                    className="w-10 h-10 p-0 border-0 rounded cursor-pointer"
                                    value={color}
                                    onChange={e => setColor(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Emoji Icon</label>
                                <input 
                                    className="input-field w-full text-center text-lg h-10"
                                    value={icon}
                                    onChange={e => setIcon(e.target.value.substring(0, 2))}
                                    placeholder="📁"
                                />
                            </div>
                        </div>
                    </div>

                    <hr className="border-border" />

                    {/* Security */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            {folder.isLocked ? <Lock size={16} className="text-amber-500" /> : <Unlock size={16} className="text-muted-foreground" />}
                            Privacy
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Locking a folder requires a passcode to view or modify its contents. Note: This is local protection, not end-to-end encryption.
                        </p>
                        
                        <div className="flex items-center gap-2">
                            <input 
                                type="password"
                                className="input-field flex-1"
                                placeholder={folder.isLocked ? "Enter passcode to unlock" : "Enter new passcode"}
                                value={passcode}
                                onChange={e => setPasscode(e.target.value)}
                            />
                            {folder.isLocked ? (
                                <button onClick={handleUnlock} className="btn-secondary whitespace-nowrap">
                                    Unlock
                                </button>
                            ) : (
                                <button onClick={handleLock} className="btn-secondary whitespace-nowrap">
                                    Lock
                                </button>
                            )}
                        </div>
                    </div>

                    <hr className="border-border" />

                    {/* Export / Import */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Download size={16} /> Data Portability
                        </h3>
                        <div className="flex gap-2">
                            <button onClick={handleExport} className="btn-secondary flex-1 justify-center">
                                <Download size={14} className="mr-2" /> Export Bundle
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-border bg-surface-hover flex justify-end gap-2">
                    <button onClick={onClose} className="btn-ghost">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className="btn-primary flex items-center gap-2">
                        <Save size={16} /> Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
