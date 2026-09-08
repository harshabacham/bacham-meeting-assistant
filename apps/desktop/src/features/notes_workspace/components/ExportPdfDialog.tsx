import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Download, Loader2, Sparkles, CheckSquare, List, AlignLeft, MessageSquare, Image, FolderOpen } from 'lucide-react';
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

  // Content Selection Toggles - All enabled by default for "all details"
  const [includeMetadata, setIncludeMetadata] = useState(true);
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

  const previewPath = () => {
    const fileName = (pdfName.trim() || getDefaultName()).replace(/[/\\?%*:|"<>]/g, '_');
    const fullFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    if (!targetDirectory) return fullFileName;
    const cleanDir = targetDirectory.replace(/[/\\]+$/, '');
    const separator = cleanDir.includes('/') ? '/' : '\\';
    return `${cleanDir}${separator}${fullFileName}`;
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 dark:bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-white dark:bg-[#18191B] border border-[#E5E4DC] dark:border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col scale-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E4DC] dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center shrink-0">
              <FileText size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Export as PDF</h2>
              <p className="text-xs text-[var(--text-muted)]">Generate a complete meeting report with all details</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[#F4F3EE] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleExport} className="p-6 space-y-4">
          {/* File Name & Destination Path */}
          <div className="space-y-3">
            {/* File Name Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                PDF Document Name
              </label>
              <div className="relative flex items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={pdfName}
                  onChange={(e) => setPdfName(e.target.value)}
                  placeholder="Meeting_Notes"
                  disabled={isExporting}
                  className="w-full pl-3.5 pr-14 py-2 bg-[#F4F3EE] dark:bg-white/[0.04] border border-[#E5E4DC] dark:border-white/10 rounded-xl text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)] transition-all"
                />
                <div className="absolute right-3 px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 border border-[#E5E4DC] dark:border-white/10 text-[11px] font-mono text-[var(--text-muted)] pointer-events-none select-none">
                  .pdf
                </div>
              </div>
            </div>

            {/* Destination Folder Path Picker */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Save Location / Folder Path
                </label>
                <button
                  type="button"
                  onClick={handleBrowseDirectory}
                  disabled={isExporting}
                  className="text-[11px] text-[var(--text-primary)] hover:underline font-medium flex items-center gap-1 cursor-pointer"
                >
                  <FolderOpen size={12} />
                  <span>Browse Folder</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={targetDirectory}
                  onChange={(e) => {
                    setTargetDirectory(e.target.value);
                    localStorage.setItem('last_pdf_export_dir', e.target.value);
                  }}
                  placeholder="Select destination folder..."
                  disabled={isExporting}
                  className="flex-1 px-3.5 py-2 bg-[#F4F3EE] dark:bg-white/[0.04] border border-[#E5E4DC] dark:border-white/10 rounded-xl text-xs font-mono text-[var(--text-secondary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)] transition-all truncate"
                />
                <button
                  type="button"
                  onClick={handleBrowseDirectory}
                  disabled={isExporting}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-[#18191B] hover:bg-[#F4F3EE] dark:hover:bg-white/[0.06] border border-[#E5E4DC] dark:border-white/10 text-xs font-medium text-[var(--text-primary)] rounded-xl transition-colors cursor-pointer shrink-0"
                  title="Browse destination folder"
                >
                  <FolderOpen size={14} className="opacity-70" />
                  <span>Browse</span>
                </button>
              </div>

              {/* Full Destination Path Preview */}
              <div className="mt-1.5 px-2.5 py-1 rounded-lg bg-[#F4F3EE] dark:bg-white/[0.04] border border-[#E5E4DC] dark:border-white/10 flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                <span className="font-semibold text-[var(--text-secondary)] shrink-0">Output:</span>
                <span className="font-mono text-[10.5px] text-[var(--text-primary)] truncate" title={previewPath()}>
                  {previewPath()}
                </span>
              </div>
            </div>
          </div>

          {/* Sections to Include ("all details") */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Included Meeting Details
              </label>
              <span className="text-[11px] text-[var(--text-muted)] font-medium">All Details Enabled</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[#F4F3EE]/60 dark:bg-white/[0.02] p-3 rounded-xl border border-[#E5E4DC] dark:border-white/10">
              {/* Meeting Info */}
              <label className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[#F4F3EE] dark:hover:bg-white/[0.04] transition-colors cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                  disabled={isExporting}
                  className="rounded border-[#E5E4DC] dark:border-white/20 text-[var(--text-primary)] focus:ring-0 cursor-pointer"
                />
                <span className="text-[var(--text-secondary)] font-medium">Header & Date/Duration</span>
              </label>

              {/* AI Summary */}
              <label className={`flex items-center gap-2.5 p-2 rounded-lg transition-colors text-xs ${hasSummary ? 'hover:bg-[#F4F3EE] dark:hover:bg-white/[0.04] cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}>
                <input
                  type="checkbox"
                  checked={includeSummary && hasSummary}
                  onChange={(e) => setIncludeSummary(e.target.checked)}
                  disabled={!hasSummary || isExporting}
                  className="rounded border-[#E5E4DC] dark:border-white/20 text-[var(--text-primary)] focus:ring-0 cursor-pointer"
                />
                <span className="text-[var(--text-secondary)] font-medium flex items-center gap-1.5">
                  <Sparkles size={12} className="text-emerald-500" />
                  Executive AI Summary
                </span>
              </label>

              {/* Action Items */}
              <label className={`flex items-center gap-2.5 p-2 rounded-lg transition-colors text-xs ${hasSummary ? 'hover:bg-[#F4F3EE] dark:hover:bg-white/[0.04] cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}>
                <input
                  type="checkbox"
                  checked={includeActionItems && hasSummary}
                  onChange={(e) => setIncludeActionItems(e.target.checked)}
                  disabled={!hasSummary || isExporting}
                  className="rounded border-[#E5E4DC] dark:border-white/20 text-[var(--text-primary)] focus:ring-0 cursor-pointer"
                />
                <span className="text-[var(--text-secondary)] font-medium flex items-center gap-1.5">
                  <CheckSquare size={12} className="text-red-500" />
                  Action Items Checklist
                </span>
              </label>

              {/* Discussion Points */}
              <label className={`flex items-center gap-2.5 p-2 rounded-lg transition-colors text-xs ${hasSummary ? 'hover:bg-[#F4F3EE] dark:hover:bg-white/[0.04] cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}>
                <input
                  type="checkbox"
                  checked={includeDiscussionPoints && hasSummary}
                  onChange={(e) => setIncludeDiscussionPoints(e.target.checked)}
                  disabled={!hasSummary || isExporting}
                  className="rounded border-[#E5E4DC] dark:border-white/20 text-[var(--text-primary)] focus:ring-0 cursor-pointer"
                />
                <span className="text-[var(--text-secondary)] font-medium flex items-center gap-1.5">
                  <List size={12} className="text-blue-500" />
                  Discussion Highlights
                </span>
              </label>

              {/* Editor Notes */}
              <label className={`flex items-center gap-2.5 p-2 rounded-lg transition-colors text-xs ${hasNotes ? 'hover:bg-[#F4F3EE] dark:hover:bg-white/[0.04] cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}>
                <input
                  type="checkbox"
                  checked={includeNotes && hasNotes}
                  onChange={(e) => setIncludeNotes(e.target.checked)}
                  disabled={!hasNotes || isExporting}
                  className="rounded border-[#E5E4DC] dark:border-white/20 text-[var(--text-primary)] focus:ring-0 cursor-pointer"
                />
                <span className="text-[var(--text-secondary)] font-medium flex items-center gap-1.5">
                  <AlignLeft size={12} className="text-purple-500" />
                  Editor Notes & Agenda
                </span>
              </label>

              {/* Verbatim Transcript */}
              <label className={`flex items-center gap-2.5 p-2 rounded-lg transition-colors text-xs ${hasTranscript ? 'hover:bg-[#F4F3EE] dark:hover:bg-white/[0.04] cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}>
                <input
                  type="checkbox"
                  checked={includeTranscript && hasTranscript}
                  onChange={(e) => setIncludeTranscript(e.target.checked)}
                  disabled={!hasTranscript || isExporting}
                  className="rounded border-[#E5E4DC] dark:border-white/20 text-[var(--text-primary)] focus:ring-0 cursor-pointer"
                />
                <span className="text-[var(--text-secondary)] font-medium flex items-center gap-1.5">
                  <MessageSquare size={12} className="text-slate-400" />
                  Verbatim Transcript
                </span>
              </label>

              {/* Visual Keyframes */}
              {hasScreenshots && (
                <label className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[#F4F3EE] dark:hover:bg-white/[0.04] transition-colors cursor-pointer text-xs sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={includeScreenshots}
                    onChange={(e) => setIncludeScreenshots(e.target.checked)}
                    disabled={isExporting}
                    className="rounded border-[#E5E4DC] dark:border-white/20 text-[var(--text-primary)] focus:ring-0 cursor-pointer"
                  />
                  <span className="text-[var(--text-secondary)] font-medium flex items-center gap-1.5">
                    <Image size={12} className="text-pink-500" />
                    Captured Visual Slides ({screenshots.length})
                  </span>
                </label>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E5E4DC] dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[#F4F3EE] dark:hover:bg-white/[0.06] transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isExporting}
              className="px-4 py-2 rounded-xl bg-[#1F2023] hover:bg-[#2C2E33] dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 text-xs font-medium transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Generating PDF...</span>
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
