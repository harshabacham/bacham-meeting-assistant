import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Folder, FolderOpen, HardDrive, Check, ArrowRight, 
  ShieldCheck, Database, FileCode
} from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { TauriClient } from '@/infrastructure/tauri-client';
import { useToast } from '@/components/ui/ToastProvider';

export const SetupStoragePage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [defaultPath, setDefaultPath] = useState<string>('Documents/BACHAM');
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Attempt to discover the real Documents path from Tauri
    (async () => {
      try {
        const { documentDir } = await import('@tauri-apps/api/path');
        const docDir = await documentDir();
        if (docDir) {
          const cleanDoc = docDir.replace(/[\\/]$/, '');
          setDefaultPath(`${cleanDoc}\\BACHAM`);
        }
      } catch (err) {
        console.warn("Could not retrieve system documentDir, using fallback:", err);
      }
    })();
  }, []);

  const handleBrowse = async () => {
    try {
      const result = await open({
        directory: true,
        multiple: false,
        title: 'Select Bacham Storage Vault Location',
        defaultPath: defaultPath || undefined,
      });

      if (result && typeof result === 'string') {
        setSelectedPath(result);
        setIsCustom(true);
      }
    } catch (err) {
      console.error("Browse directory error:", err);
      showToast("Unable to open folder selector", "error");
    }
  };

  const handleConfirm = async () => {
    setIsSaving(true);
    const targetPath = isCustom && selectedPath.trim() ? selectedPath.trim() : defaultPath;

    try {
      // Always call changeStorageLocation so the backend initializes the layout and records the location
      await TauriClient.changeStorageLocation(targetPath);
      localStorage.setItem('hasSetupStoragePath', 'true');
      localStorage.setItem('hasSeenOnboarding', 'true');
      localStorage.removeItem('needs_storage_setup');
      showToast('Storage location configured successfully.', 'success');
      navigate('/');
    } catch (err: any) {
      console.error("Save storage location error:", err);
      showToast(err?.message || "Failed to configure storage location.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#0A0A0C] text-[#F8F9FA] flex flex-col justify-between overflow-x-hidden select-none font-sans">
      {/* ─── Ambient Glow & Grid ─── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:24px_24px] opacity-60" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-lime/10 rounded-full blur-[140px] pointer-events-none" />
      </div>

      {/* ─── Header ─── */}
      <header className="relative z-20 w-full max-w-4xl mx-auto px-6 py-5 flex items-center justify-between border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Bacham Logo" className="w-7 h-7 rounded-lg object-contain shadow-sm" />
            <span className="font-bold text-lg tracking-tight text-white font-sans">
              Bacham
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-white/10 text-white/70 border border-white/10">
            v1.0.0
          </span>
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={isSaving}
          className="text-xs text-white/50 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
        >
          Use Default & Continue
        </button>
      </header>

      {/* ─── Main Content ─── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-10 w-full max-w-2xl mx-auto text-left">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="w-full space-y-6"
        >
          {/* Headline */}
          <div className="text-center space-y-2 max-w-md mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime/10 border border-lime/20 text-lime text-xs font-semibold">
              <HardDrive size={13} />
              <span>Storage Vault Setup</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Where should Bacham save your data?
            </h1>
            <p className="text-xs sm:text-sm text-white/60">
              All recordings, SQLite databases, transcripts, and AI notes are kept 100% private on your machine.
            </p>
          </div>

          {/* Location Selection Options */}
          <div className="space-y-3">
            {/* Option 1: Default */}
            <div
              onClick={() => setIsCustom(false)}
              className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex items-start gap-3.5 relative overflow-hidden ${
                !isCustom
                  ? 'border-lime bg-lime/[0.06] shadow-[0_0_24px_rgba(186,255,41,0.1)]'
                  : 'border-white/[0.08] bg-[#141517]/80 hover:bg-[#141517] hover:border-white/20'
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                !isCustom ? 'bg-lime text-black' : 'border border-white/40'
              }`}>
                {!isCustom && <Check size={12} strokeWidth={3} />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-xs text-white flex items-center gap-1.5">
                    <Folder size={14} className="text-lime" />
                    Default Documents Directory
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-lime/15 text-lime border border-lime/20">
                    Recommended
                  </span>
                </div>
                <p className="text-xs font-mono text-white/70 truncate mt-1 bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/[0.06]">
                  {defaultPath}
                </p>
                <p className="text-[11px] text-white/40 mt-1.5">
                  Standard directory. No additional configuration needed.
                </p>
              </div>
            </div>

            {/* Option 2: Custom Directory */}
            <div
              onClick={() => setIsCustom(true)}
              className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex items-start gap-3.5 relative overflow-hidden ${
                isCustom
                  ? 'border-lime bg-lime/[0.06] shadow-[0_0_24px_rgba(186,255,41,0.1)]'
                  : 'border-white/[0.08] bg-[#141517]/80 hover:bg-[#141517] hover:border-white/20'
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                isCustom ? 'bg-lime text-black' : 'border border-white/40'
              }`}>
                {isCustom && <Check size={12} strokeWidth={3} />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-xs text-white flex items-center gap-1.5">
                    <FolderOpen size={14} className="text-lime" />
                    Custom Storage Vault
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBrowse();
                    }}
                    className="px-3 py-1 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <FolderOpen size={12} />
                    <span>Browse...</span>
                  </button>
                </div>

                <p className="text-xs font-mono text-white/70 truncate mt-1 bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/[0.06]">
                  {selectedPath || 'Click Browse to select a custom folder...'}
                </p>
                <p className="text-[11px] text-white/40 mt-1.5">
                  Ideal if you want to store your meetings on an external drive or secondary partition.
                </p>
              </div>
            </div>
          </div>

          {/* Privacy & Architecture Points */}
          <div className="grid grid-cols-3 gap-2.5 pt-2">
            <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center gap-2 text-[11px] text-white/60">
              <ShieldCheck size={14} className="text-lime shrink-0" />
              <span>100% Local</span>
            </div>
            <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center gap-2 text-[11px] text-white/60">
              <Database size={14} className="text-lime shrink-0" />
              <span>SQLite Index</span>
            </div>
            <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center gap-2 text-[11px] text-white/60">
              <FileCode size={14} className="text-lime shrink-0" />
              <span>Open Formats</span>
            </div>
          </div>

          {/* Confirm Button */}
          <motion.button
            type="button"
            onClick={handleConfirm}
            disabled={isSaving}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full py-3.5 px-6 rounded-xl bg-lime hover:bg-[#aef520] text-black font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(186,255,41,0.25)] transition-all cursor-pointer"
          >
            <span>{isSaving ? 'Configuring Vault...' : 'Confirm & Enter Workspace'}</span>
            <ArrowRight size={16} strokeWidth={2.5} />
          </motion.button>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 w-full max-w-4xl mx-auto px-6 py-4 flex items-center justify-center text-xs text-white/30 border-t border-white/[0.06]">
        You can always change your storage location later in Settings → Storage.
      </footer>
    </div>
  );
};
export default SetupStoragePage;
