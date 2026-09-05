import jsPDF from 'jspdf';
import { save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import type { Note } from '../NotesWorkspacePage';
import type { Screenshot } from '@/infrastructure/tauri-client';

export interface PdfExportOptions {
  fileName: string;
  folderName?: string;
  summary?: string;
  transcript?: string;
  screenshots?: Screenshot[];
  includeMetadata: boolean;
  includeSummary: boolean;
  includeActionItems: boolean;
  includeDiscussionPoints: boolean;
  includeNotes: boolean;
  includeTranscript: boolean;
  includeScreenshots: boolean;
}

// Clean unicode characters and emojis that corrupt standard WinAnsi/Helvetica PDF fonts
export function cleanPdfText(text: string): string {
  if (!text) return '';
  return text
    // Strip emojis
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2300}-\u{23FF}]|[\u{2B50}]|[\u{FE0F}]|[\u{200D}]/gu, '')
    // Replace smart quotes and dashes
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2026]/g, '...')
    .replace(/[\u00A0]/g, ' ')
    // Replace any remaining non-standard characters with safe characters
    .replace(/[^\x20-\x7E\r\n\t]/g, ' ')
    // Normalize spaces
    .replace(/[ \t]+/g, ' ')
    .trim();
}

// Convert HTML from TipTap into structured text blocks
function parseHtmlContent(html: string): Array<{ type: 'h1' | 'h2' | 'h3' | 'p' | 'li' | 'task'; text: string; checked?: boolean }> {
  if (!html) return [];
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  const blocks: Array<{ type: 'h1' | 'h2' | 'h3' | 'p' | 'li' | 'task'; text: string; checked?: boolean }> = [];

  function walk(node: Node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      if (tag === 'h1') {
        const text = cleanPdfText(el.textContent || '');
        if (text) blocks.push({ type: 'h1', text });
      } else if (tag === 'h2') {
        const text = cleanPdfText(el.textContent || '');
        if (text) blocks.push({ type: 'h2', text });
      } else if (tag === 'h3') {
        const text = cleanPdfText(el.textContent || '');
        if (text) blocks.push({ type: 'h3', text });
      } else if (tag === 'li') {
        const isTask = el.getAttribute('data-type') === 'taskItem';
        const checkbox = el.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
        const text = cleanPdfText(el.textContent || '');
        if (text) {
          if (isTask) {
            blocks.push({ type: 'task', text, checked: checkbox?.checked || false });
          } else {
            blocks.push({ type: 'li', text });
          }
        }
      } else if (tag === 'p') {
        if (el.parentElement?.tagName.toLowerCase() !== 'li') {
          const text = cleanPdfText(el.textContent || '');
          if (text) blocks.push({ type: 'p', text });
        }
      } else {
        node.childNodes.forEach(walk);
      }
    }
  }

  walk(tempDiv);
  return blocks;
}

// Format milliseconds duration into human readable string
function formatDuration(ms?: number): string {
  if (!ms || ms <= 0) return '';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}

export async function generateMeetingPdf(note: Note, options: PdfExportOptions): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 18;
  const contentWidth = pageWidth - marginX * 2; // 174mm
  const maxY = 265; // Safe bottom margin to prevent collision with footer at 283mm
  let currentY = 22;

  function ensureSpace(neededHeight: number) {
    if (currentY + neededHeight > maxY) {
      doc.addPage();
      currentY = 22;
    }
  }

  function addSectionHeader(title: string, color: [number, number, number] = [79, 70, 229]) {
    ensureSpace(16);
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(marginX, currentY, 3.5, 7, 0.8, 0.8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(30, 41, 59);
    doc.text(title.toUpperCase(), marginX + 6, currentY + 5.5);
    currentY += 11;
  }

  // Helper to render markdown lines into PDF components
  function renderMarkdownContent(rawMd: string) {
    const lines = rawMd.split(/\r?\n/);
    let i = 0;

    while (i < lines.length) {
      const rawLine = lines[i].trim();
      if (!rawLine) {
        i++;
        continue;
      }

      // Horizontal Rule: --- or ***
      if (/^---+$/.test(rawLine) || /^\*\*\*+$/.test(rawLine)) {
        ensureSpace(8);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(marginX, currentY, marginX + contentWidth, currentY);
        currentY += 6;
        i++;
        continue;
      }

      // Headers: #, ##, ###
      const headerMatch = rawLine.match(/^(#{1,3})\s+(.*)$/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const title = cleanPdfText(headerMatch[2].replace(/\*\*/g, ''));
        if (title) {
          const colorMap: Record<number, [number, number, number]> = {
            1: [79, 70, 229], // indigo
            2: [16, 185, 129], // emerald
            3: [59, 130, 246], // blue
          };
          addSectionHeader(title, colorMap[level] || [79, 70, 229]);
        }
        i++;
        continue;
      }

      // Action items / Deliverables: - [ ] Task or - [x] Task
      const taskMatch = rawLine.match(/^-\s+\[([ xX])\]\s+(.*)$/);
      if (taskMatch) {
        const isChecked = taskMatch[1].toLowerCase() === 'x';
        const cleanTask = cleanPdfText(taskMatch[2].replace(/\*\*/g, '').replace(/\*/g, ''));
        if (cleanTask) {
          const taskLines = doc.splitTextToSize(cleanTask, contentWidth - 10);
          ensureSpace(taskLines.length * 4.8 + 2.5);

          // Checkbox square
          doc.setDrawColor(156, 163, 175);
          doc.setLineWidth(0.35);
          doc.roundedRect(marginX + 1, currentY - 3.2, 4, 4, 0.6, 0.6, 'S');
          if (isChecked) {
            doc.setFillColor(79, 70, 229);
            doc.roundedRect(marginX + 1.8, currentY - 2.4, 2.4, 2.4, 0.4, 0.4, 'F');
          }

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9.5);
          doc.setTextColor(30, 41, 59);
          taskLines.forEach((tl: string, idx: number) => {
            doc.text(tl, marginX + 8, currentY + idx * 4.8);
          });
          currentY += taskLines.length * 4.8 + 2.5;
        }
        i++;
        continue;
      }

      // Bullet items: - Item or * Item
      const bulletMatch = rawLine.match(/^[-*]\s+(.*)$/);
      if (bulletMatch) {
        const cleanItem = cleanPdfText(bulletMatch[1].replace(/\*\*/g, '').replace(/\*/g, ''));
        if (cleanItem) {
          const itemLines = doc.splitTextToSize(cleanItem, contentWidth - 8);
          ensureSpace(itemLines.length * 4.8 + 2);

          doc.setFont('helvetica', 'bold');
          doc.setTextColor(79, 70, 229);
          doc.text('•', marginX + 1, currentY);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9.5);
          doc.setTextColor(51, 65, 85);
          itemLines.forEach((il: string, idx: number) => {
            doc.text(il, marginX + 7, currentY + idx * 4.8);
          });
          currentY += itemLines.length * 4.8 + 2;
        }
        i++;
        continue;
      }

      // Normal paragraph text (accumulate multiline paragraphs)
      let paraText = rawLine;
      while (
        i + 1 < lines.length &&
        lines[i + 1].trim() &&
        !/^[-*#]/.test(lines[i + 1].trim()) &&
        !/^---+$/.test(lines[i + 1].trim())
      ) {
        i++;
        paraText += ' ' + lines[i].trim();
      }

      const cleanPara = cleanPdfText(paraText.replace(/\*\*/g, '').replace(/\*/g, ''));
      if (cleanPara) {
        const paraLines = doc.splitTextToSize(cleanPara, contentWidth);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85);

        for (const pl of paraLines) {
          ensureSpace(4.8);
          doc.text(pl, marginX, currentY);
          currentY += 4.8;
        }
        currentY += 2.5;
      }
      i++;
    }
  }

  // ── 1. DOCUMENT HEADER & BRANDING ──────────────────────────────────────────
  // Top brand badge
  doc.setFillColor(243, 244, 246);
  doc.roundedRect(marginX, currentY, 52, 6, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(79, 70, 229);
  doc.text('BACHAM INTELLIGENCE', marginX + 3.5, currentY + 4.2);
  currentY += 10;

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // slate-900
  const cleanTitle = cleanPdfText(note.title || 'Untitled Meeting');
  const titleLines = doc.splitTextToSize(cleanTitle, contentWidth);
  for (const line of titleLines) {
    ensureSpace(8);
    doc.text(line, marginX, currentY);
    currentY += 7.5;
  }
  currentY += 2;

  // Metadata Card
  if (options.includeMetadata) {
    ensureSpace(24);
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, currentY, contentWidth, 20, 2, 2, 'FD');

    doc.setFontSize(8.5);
    const metaY = currentY + 6;

    // Date & Time
    const dateFormatted = note.eventDate || new Date(note.createdAt || Date.now()).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const timeFormatted = note.eventTime || new Date(note.createdAt || Date.now()).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('DATE & TIME:', marginX + 4, metaY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(`${dateFormatted} - ${timeFormatted}`, marginX + 28, metaY);

    // Duration
    const duration = formatDuration(note.meetingDurationMs);
    if (duration) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text('DURATION:', marginX + 110, metaY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(duration, marginX + 130, metaY);
    }

    // Folder & Tags Row
    const metaY2 = currentY + 14;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('FOLDER:', marginX + 4, metaY2);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(cleanPdfText(options.folderName || 'All Notes'), marginX + 28, metaY2);

    if (note.tags && note.tags.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text('TAGS:', marginX + 110, metaY2);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(79, 70, 229);
      const tagsStr = cleanPdfText(note.tags.map(t => `#${t}`).join(', '));
      doc.text(tagsStr, marginX + 125, metaY2);
    }

    currentY += 26;
  }

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(marginX, currentY, marginX + contentWidth, currentY);
  currentY += 8;

  // ── 2. AI EXECUTIVE SUMMARY & INTELLIGENCE ────────────────────────────────
  const rawSummary = options.summary || note.summary || '';
  if (options.includeSummary && rawSummary.trim()) {
    let parsedSummary: any = null;
    try {
      parsedSummary = JSON.parse(rawSummary);
    } catch {
      parsedSummary = null;
    }

    if (parsedSummary && typeof parsedSummary === 'object') {
      // Structured Gemini JSON
      if (parsedSummary.executive_summary) {
        addSectionHeader('Executive Summary', [16, 185, 129]); // emerald
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85);
        const cleanExec = cleanPdfText(parsedSummary.executive_summary);
        const lines = doc.splitTextToSize(cleanExec, contentWidth);
        for (const line of lines) {
          ensureSpace(5);
          doc.text(line, marginX, currentY);
          currentY += 4.8;
        }
        currentY += 5;
      }

      // Key Takeaways
      if (parsedSummary.key_takeaways && parsedSummary.key_takeaways.length > 0) {
        addSectionHeader('Key Takeaways', [79, 70, 229]);
        for (const takeaway of parsedSummary.key_takeaways) {
          const cleanItem = cleanPdfText(takeaway);
          const lines = doc.splitTextToSize(cleanItem, contentWidth - 8);
          ensureSpace(lines.length * 4.8 + 2);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(79, 70, 229);
          doc.text('•', marginX + 1, currentY);

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(51, 65, 85);
          lines.forEach((l: string, idx: number) => {
            doc.text(l, marginX + 7, currentY + idx * 4.8);
          });
          currentY += lines.length * 4.8 + 2;
        }
        currentY += 4;
      }

      // Discussion Points
      if (options.includeDiscussionPoints && parsedSummary.discussion_points && parsedSummary.discussion_points.length > 0) {
        addSectionHeader('Discussion Topics & Highlights', [59, 130, 246]);
        for (const point of parsedSummary.discussion_points) {
          ensureSpace(16);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(15, 23, 42);
          doc.text(cleanPdfText(point.topic || 'Discussion Item'), marginX + 2, currentY);

          if (point.timestamp) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            const cleanTs = cleanPdfText(point.timestamp);
            const tsWidth = doc.getTextWidth(cleanTs);
            doc.text(cleanTs, marginX + contentWidth - tsWidth, currentY);
          }
          currentY += 5;

          if (point.details) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(71, 85, 105);
            const detailLines = doc.splitTextToSize(cleanPdfText(point.details), contentWidth - 4);
            for (const dLine of detailLines) {
              ensureSpace(4.6);
              doc.text(dLine, marginX + 2, currentY);
              currentY += 4.5;
            }
          }
          currentY += 3;
        }
        currentY += 3;
      }

      // Action Items
      const actionItems = parsedSummary.crm_metadata?.action_items || [];
      if (options.includeActionItems && actionItems.length > 0) {
        addSectionHeader('Action Items & Deliverables', [239, 68, 68]);
        for (const item of actionItems) {
          let itemText = '';
          if (typeof item === 'object' && item !== null) {
            const parts: string[] = [];
            const ts = item.timestamp || item.timestamp_hint;
            if (ts) parts.push(`[${ts}]`);
            if (item.task) parts.push(item.task);
            if (item.owner && item.owner !== 'Unassigned' && item.owner !== 'Me') parts.push(`- @${item.owner}`);
            if (item.due_date) parts.push(`(Due: ${item.due_date})`);
            itemText = parts.join(' ');
          } else {
            itemText = String(item);
          }
          const cleanItem = cleanPdfText(itemText);
          const lines = doc.splitTextToSize(cleanItem, contentWidth - 10);
          ensureSpace(lines.length * 4.8 + 3);

          doc.setDrawColor(156, 163, 175);
          doc.setLineWidth(0.35);
          doc.roundedRect(marginX + 1, currentY - 3.2, 4, 4, 0.6, 0.6, 'S');

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9.5);
          doc.setTextColor(30, 41, 59);
          lines.forEach((l: string, idx: number) => {
            doc.text(l, marginX + 8, currentY + idx * 4.8);
          });
          currentY += lines.length * 4.8 + 2.5;
        }
        currentY += 4;
      }

      // Key Decisions
      const keyDecisions = parsedSummary.crm_metadata?.key_decisions || [];
      if (keyDecisions.length > 0) {
        addSectionHeader('Key Decisions', [249, 115, 22]);
        for (const decision of keyDecisions) {
          let decText = '';
          if (typeof decision === 'object' && decision !== null) {
            const ts = decision.timestamp || decision.timestamp_hint;
            const text = decision.decision || decision.text || '';
            decText = ts ? `[${ts}] ${text}` : text;
          } else {
            decText = String(decision);
          }
          const cleanDecision = cleanPdfText(decText);
          const lines = doc.splitTextToSize(cleanDecision, contentWidth - 8);
          ensureSpace(lines.length * 4.8 + 2);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(249, 115, 22);
          doc.text('•', marginX + 1, currentY);

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(51, 65, 85);
          lines.forEach((l: string, idx: number) => {
            doc.text(l, marginX + 7, currentY + idx * 4.8);
          });
          currentY += lines.length * 4.8 + 2;
        }
        currentY += 4;
      }
    } else {
      // Unstructured Markdown AI Summary (e.g. Gemini formatted markdown with ## headings and bullets)
      renderMarkdownContent(rawSummary);
      currentY += 5;
    }
  }

  // ── 3. MEETING NOTES & OBSERVATIONS (EDITOR) ──────────────────────────────
  if (options.includeNotes && note.content && note.content.trim()) {
    const blocks = parseHtmlContent(note.content);
    if (blocks.length > 0) {
      addSectionHeader('Meeting Notes & Agenda', [139, 92, 246]); // purple

      for (const block of blocks) {
        if (block.type === 'h1' || block.type === 'h2' || block.type === 'h3') {
          ensureSpace(10);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(block.type === 'h1' ? 12 : block.type === 'h2' ? 10.5 : 9.5);
          doc.setTextColor(30, 41, 59);
          const hLines = doc.splitTextToSize(block.text, contentWidth);
          for (const hl of hLines) {
            doc.text(hl, marginX, currentY);
            currentY += 5;
          }
          currentY += 2;
        } else if (block.type === 'task') {
          const lines = doc.splitTextToSize(block.text, contentWidth - 10);
          ensureSpace(lines.length * 4.8 + 2);
          doc.setDrawColor(156, 163, 175);
          doc.setLineWidth(0.35);
          doc.roundedRect(marginX + 1, currentY - 3.2, 4, 4, 0.6, 0.6, 'S');
          if (block.checked) {
            doc.setFillColor(79, 70, 229);
            doc.roundedRect(marginX + 1.8, currentY - 2.4, 2.4, 2.4, 0.4, 0.4, 'F');
          }
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(51, 65, 85);
          lines.forEach((l: string, idx: number) => {
            doc.text(l, marginX + 8, currentY + idx * 4.8);
          });
          currentY += lines.length * 4.8 + 2;
        } else if (block.type === 'li') {
          const lines = doc.splitTextToSize(block.text, contentWidth - 8);
          ensureSpace(lines.length * 4.8 + 2);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(139, 92, 246);
          doc.text('–', marginX + 2, currentY);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(51, 65, 85);
          lines.forEach((l: string, idx: number) => {
            doc.text(l, marginX + 7, currentY + idx * 4.8);
          });
          currentY += lines.length * 4.8 + 2;
        } else {
          // Paragraph
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(71, 85, 105);
          const lines = doc.splitTextToSize(block.text, contentWidth);
          for (const line of lines) {
            ensureSpace(4.8);
            doc.text(line, marginX, currentY);
            currentY += 4.6;
          }
          currentY += 2;
        }
      }
      currentY += 6;
    }
  }

  // ── 4. VERBATIM TRANSCRIPT ────────────────────────────────────────────────
  const rawTranscript = options.transcript || note.transcript || '';
  if (options.includeTranscript && rawTranscript.trim()) {
    addSectionHeader('Meeting Transcript', [71, 85, 105]); // slate
    const transcriptLines = rawTranscript.split(/\r?\n/);

    for (const line of transcriptLines) {
      if (!line.trim()) continue;
      const cleanLine = cleanPdfText(line.replace(/^\[.*?\]:\s*/, ''));
      if (!cleanLine) continue;
      const wrapped = doc.splitTextToSize(cleanLine, contentWidth);
      for (const wLine of wrapped) {
        ensureSpace(4.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(wLine, marginX, currentY);
        currentY += 4.2;
      }
      currentY += 1.5;
    }
    currentY += 6;
  }

  // ── 5. CAPTURED SCREENSHOTS / KEYFRAMES ────────────────────────────────────
  if (options.includeScreenshots && options.screenshots && options.screenshots.length > 0) {
    addSectionHeader(`Captured Visual Keyframes (${options.screenshots.length})`, [236, 72, 153]); // pink
    const imgWidth = 82; // mm
    const imgHeight = 46; // mm

    for (let i = 0; i < options.screenshots.length; i += 2) {
      const s1 = options.screenshots[i];
      const s2 = options.screenshots[i + 1];

      ensureSpace(imgHeight + 14);

      // Load and draw s1 via native Rust read_file_as_base64
      try {
        const b64_1 = await invoke<string>('read_file_as_base64', { path: s1.filePath });
        if (b64_1) {
          doc.addImage(`data:image/jpeg;base64,${b64_1}`, 'JPEG', marginX, currentY, imgWidth, imgHeight);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(100, 116, 139);
          const timeLabel = new Date(s1.capturedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          doc.text(`Keyframe ${i + 1} - ${timeLabel}`, marginX, currentY + imgHeight + 4);
        }
      } catch (err) {
        console.warn('Failed to embed screenshot 1 into PDF', err);
      }

      // Load and draw s2 if exists
      if (s2) {
        try {
          const b64_2 = await invoke<string>('read_file_as_base64', { path: s2.filePath });
          if (b64_2) {
            doc.addImage(`data:image/jpeg;base64,${b64_2}`, 'JPEG', marginX + imgWidth + 10, currentY, imgWidth, imgHeight);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139);
            const timeLabel2 = new Date(s2.capturedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            doc.text(`Keyframe ${i + 2} - ${timeLabel2}`, marginX + imgWidth + 10, currentY + imgHeight + 4);
          }
        } catch (err) {
          console.warn('Failed to embed screenshot 2 into PDF', err);
        }
      }

      currentY += imgHeight + 10;
    }
  }

  // ── 6. NUMBER OF PAGES & FOOTERS ──────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Divider at bottom
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 14, marginX + contentWidth, pageHeight - 14);

    // Footer Text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400

    doc.text('BACHAM Meeting Assistant', marginX, pageHeight - 9);

    const generatedDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    doc.text(generatedDate, marginX + contentWidth / 2 - doc.getTextWidth(generatedDate) / 2, pageHeight - 9);

    const pageStr = `Page ${i} of ${totalPages}`;
    doc.text(pageStr, marginX + contentWidth - doc.getTextWidth(pageStr), pageHeight - 9);
  }

  return doc;
}

export async function savePdfFile(doc: jsPDF, defaultFileName: string, targetDirectory?: string): Promise<string | null> {
  const sanitized = defaultFileName.replace(/[/\\?%*:|"<>]/g, '_').trim();
  const fullFileName = sanitized.endsWith('.pdf') ? sanitized : `${sanitized}.pdf`;

  let targetPath: string | null = null;

  // 1. If targetDirectory is provided, form the full path
  if (targetDirectory && targetDirectory.trim()) {
    const cleanDir = targetDirectory.trim().replace(/[/\\]+$/, '');
    const separator = cleanDir.includes('/') ? '/' : '\\';
    targetPath = `${cleanDir}${separator}${fullFileName}`;
  } else {
    // 2. Otherwise prompt the user with native Save dialog
    try {
      targetPath = await save({
        title: 'Save PDF Meeting Report',
        defaultPath: fullFileName,
        filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
      });
      if (!targetPath) {
        // User cancelled dialog
        return null;
      }
    } catch (e) {
      console.warn('Dialog save error:', e);
    }
  }

  // 3. Write via native Tauri Rust command (guaranteed OS file system write)
  if (targetPath) {
    try {
      const dataUri = doc.output('datauristring');
      const saved = await invoke<string>('save_pdf_base64', {
        path: targetPath,
        base64Content: dataUri,
      });
      return saved;
    } catch (err) {
      console.error('Tauri save_pdf_base64 command error:', err);
    }
  }

  // 4. Fallback for non-Tauri browser environments
  try {
    doc.save(fullFileName);
    return fullFileName;
  } catch (err) {
    console.error('Fallback doc.save failed:', err);
    return null;
  }
}

export async function openPdfFile(path: string): Promise<void> {
  try {
    await invoke('open_file_path', { path });
  } catch {
    import('@tauri-apps/plugin-shell')
      .then(({ open }) => open(path))
      .catch(console.error);
  }
}
