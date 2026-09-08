import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Loader2, FolderOpen } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { open } from '@tauri-apps/plugin-dialog';
import type { Note } from '../NotesWorkspacePage';
import type { Screenshot } from '@/infrastructure/tauri-client';
import { generateMeetingPdf, savePdfFile, openPdfFile } from '../services/pdfExportService';

interface ExportPdfDialogProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note;
  folderName?: string;
  summary?: string;
  transcript?: string;
  screenshots?: Screenshot[];
}

export function ExportPdfDialog({
  isOpen,
  onClose,
  note,
  folderName,
  summary,
  transcript,
  screenshots = [],
}: ExportPdfDialogProps) {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  // Default clean file name
  const getDefaultName = () => {
    const rawTitle = note.title || 'Meeting_Notes';
    return rawTitle.replace(/[/\\?%*:|"<>]/g, '_').trim();
  };

  const [pdfName, setPdfName] = useState(getDefaultName);
  const [targetDirectory, setTargetDirectory] = useState<string>(() => {
    return localStorage.getItem('last_pdf_export_dir') || '';
  });
  const [isExporting, setIsExporting] = useState(false);

  // Content Selection Toggles
  const includeMetadata = true;
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeActionItems, setIncludeActionItems] = useState(true);
  const [includeDiscussionPoints, setIncludeDiscussionPoints] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeTranscript, setIncludeTranscript] = useState(true);
  const [includeScreenshots, setIncludeScreenshots] = useState(true);

  const hasSummary = Boolean((summary || note.summary)?.trim());
  const hasTranscript = Boolean((transcript || note.transcript)?.trim());
  const hasNotes = Boolean(note.content && note.content.trim() && note.content !== '<p></p>');
  const hasScreenshots = screenshots.length > 0;

  // Keydown Escape handler for closing modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isExporting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isExporting, onClose]);

  useEffect(() => {
    if (isOpen) {
      setPdfName(getDefaultName());
      setIsExporting(false);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 80);

      // Auto-detect default download or document folder if none selected
      if (!targetDirectory) {
        (async () => {
          try {
            const { downloadDir, documentDir } = await import('@tauri-apps/api/path');
            const dl = await downloadDir();
            if (dl) {
              setTargetDirectory(dl);
              return;
            }
            const docs = await documentDir();
            if (docs) setTargetDirectory(docs);
          } catch {
            // fallback
          }
        })();
      }
    }
  }, [isOpen, note.id, note.title]);

  const handleBrowseDirectory = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select PDF Destination Folder',
        defaultPath: targetDirectory || undefined,
      });

      if (selected && typeof selected === 'string') {
        setTargetDirectory(selected);
        localStorage.setItem('last_pdf_export_dir', selected);
      }
    } catch (err) {
      console.error('Failed to open directory picker', err);
    }
  };

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDirectory) {
      showToast('Please select a destination folder.', 'error');
      return;
    }

    const cleanName = (pdfName.trim() || getDefaultName()).replace(/[/\\?%*:|"<>]/g, '_');
    const finalFileName = cleanName.endsWith('.pdf') ? cleanName : `${cleanName}.pdf`;

    setIsExporting(true);
    try {
      // 1. Generate the PDF
      const doc = await generateMeetingPdf(note, {
        fileName: finalFileName,
        folderName,
        summary: includeSummary ? summary : undefined,
        transcript: includeTranscript ? transcript : undefined,
        screenshots: includeScreenshots ? screenshots : [],
        includeMetadata,
        includeSummary,
        includeActionItems,
        includeDiscussionPoints,
        includeNotes,
        includeTranscript,
        includeScreenshots,
      });

      // 2. Save file
      const savedPath = await savePdfFile(doc, finalFileName, targetDirectory);

      if (savedPath) {
        showToast(`Exported successfully to: ${savedPath}`, 'success');

        // Auto-open PDF file
        try {
          await openPdfFile(savedPath);
        } catch {
          // file opened or handled
        }
      }

      onClose();
    } catch (err: any) {
      console.error('PDF export failed', err);
      showToast(`PDF Export Failed: ${err?.message || err}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/35 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-[400px] bg-white dark:bg-[#18191B] border border-[#E5E4DC] dark:border-white/10 rounded-2xl shadow-xl overflow-hidden flex flex-col scale-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#E5E4DC] dark:border-white/10">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Export as PDF</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[#F4F3EE] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleExport} className="p-5 space-y-4">
          {/* File Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              File name
            </label>
            <div className="relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={pdfName}
                onChange={(e) => setPdfName(e.target.value)}
                placeholder="Meeting_Notes"
                disabled={isExporting}
                className="w-full pl-3.5 pr-12 py-2 bg-[#F4F3EE] dark:bg-white/[0.04] border border-[#E5E4DC] dark:border-white/10 rounded-xl text-xs font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)] transition-all"
              />
              <span className="absolute right-3 text-[11px] font-mono text-[var(--text-muted)] select-none">
                .pdf
              </span>
            </div>
          </div>

          {/* Destination Folder */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              Save location
            </label>
            <button
              type="button"
              onClick={handleBrowseDirectory}
              disabled={isExporting}
              className="w-full flex items-center justify-between px-3 py-2 bg-[#F4F3EE] dark:bg-white/[0.04] hover:bg-[#ECEBE4] dark:hover:bg-white/[0.08] border border-[#E5E4DC] dark:border-white/10 rounded-xl text-xs text-[var(--text-primary)] transition-colors cursor-pointer group text-left"
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <FolderOpen size={13} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors shrink-0" />
                <span className="truncate font-mono text-[11px] text-[var(--text-secondary)]">
                  {targetDirectory || 'Choose destination folder...'}
                </span>
              </div>
              <span className="text-[11px] font-medium text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors shrink-0">
                Change
              </span>
            </button>
          </div>

          {/* Included Sections (Only show available content) */}
          {(hasSummary || hasNotes || hasTranscript || hasScreenshots) && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Include
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {hasSummary && (
                  <>
                    <label className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#F4F3EE]/60 dark:bg-white/[0.03] hover:bg-[#F4F3EE] dark:hover:bg-white/[0.06] border border-[#E5E4DC]/70 dark:border-white/5 transition-colors cursor-pointer text-xs select-none">
                      <input
                        type="checkbox"
                        checked={includeSummary}
                        onChange={(e) => {
                          setIncludeSummary(e.target.checked);
                          setIncludeDiscussionPoints(e.target.checked);
                        }}
                        disabled={isExporting}
                        className="rounded border-[#E5E4DC] dark:border-white/20 text-[var(--text-primary)] focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[var(--text-secondary)] font-medium text-xs">Summary</span>
                    </label>

                    <label className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#F4F3EE]/60 dark:bg-white/[0.03] hover:bg-[#F4F3EE] dark:hover:bg-white/[0.06] border border-[#E5E4DC]/70 dark:border-white/5 transition-colors cursor-pointer text-xs select-none">
                      <input
                        type="checkbox"
                        checked={includeActionItems}
                        onChange={(e) => setIncludeActionItems(e.target.checked)}
                        disabled={isExporting}
                        className="rounded border-[#E5E4DC] dark:border-white/20 text-[var(--text-primary)] focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[var(--text-secondary)] font-medium text-xs">Action items</span>
                    </label>
                  </>
                )}

                {hasNotes && (
                  <label className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#F4F3EE]/60 dark:bg-white/[0.03] hover:bg-[#F4F3EE] dark:hover:bg-white/[0.06] border border-[#E5E4DC]/70 dark:border-white/5 transition-colors cursor-pointer text-xs select-none">
                    <input
                      type="checkbox"
                      checked={includeNotes}
                      onChange={(e) => setIncludeNotes(e.target.checked)}
                      disabled={isExporting}
                      className="rounded border-[#E5E4DC] dark:border-white/20 text-[var(--text-primary)] focus:ring-0 cursor-pointer"
                    />
                    <span className="text-[var(--text-secondary)] font-medium text-xs">Notes</span>
                  </label>
                )}

                {hasTranscript && (
                  <label className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#F4F3EE]/60 dark:bg-white/[0.03] hover:bg-[#F4F3EE] dark:hover:bg-white/[0.06] border border-[#E5E4DC]/70 dark:border-white/5 transition-colors cursor-pointer text-xs select-none">
                    <input
                      type="checkbox"
                      checked={includeTranscript}
                      onChange={(e) => setIncludeTranscript(e.target.checked)}
                      disabled={isExporting}
                      className="rounded border-[#E5E4DC] dark:border-white/20 text-[var(--text-primary)] focus:ring-0 cursor-pointer"
                    />
                    <span className="text-[var(--text-secondary)] font-medium text-xs">Transcript</span>
                  </label>
                )}

                {hasScreenshots && (
                  <label className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#F4F3EE]/60 dark:bg-white/[0.03] hover:bg-[#F4F3EE] dark:hover:bg-white/[0.06] border border-[#E5E4DC]/70 dark:border-white/5 transition-colors cursor-pointer text-xs select-none sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={includeScreenshots}
                      onChange={(e) => setIncludeScreenshots(e.target.checked)}
                      disabled={isExporting}
                      className="rounded border-[#E5E4DC] dark:border-white/20 text-[var(--text-primary)] focus:ring-0 cursor-pointer"
                    />
                    <span className="text-[var(--text-secondary)] font-medium text-xs">Screenshots ({screenshots.length})</span>
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E4DC] dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[#F4F3EE] dark:hover:bg-white/[0.06] transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isExporting}
              className="px-4 py-1.5 rounded-xl bg-[#1C1C1A] hover:bg-[#2C2E33] dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 text-xs font-medium transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download size={13} />
                  <span>Export PDF</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
