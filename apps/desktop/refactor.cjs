const fs = require('fs');

const filePath = 'src/pages/LibraryPage.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Import useToast and useConfirmStore
content = content.replace("import { TauriClient } from '@/infrastructure/tauri-client';", "import { TauriClient } from '@/infrastructure/tauri-client';\nimport { useToast } from '@/components/ui/ToastProvider';\nimport { useConfirmStore } from '@/components/ui/ConfirmProvider';");

// 2. Add useConfirmStore to LibraryPage
content = content.replace("const [searchParams] = useSearchParams();", "const [searchParams] = useSearchParams();\n    const { showConfirm } = useConfirmStore();");

// 3. Remove local toastMessage state and showToast definition
content = content.replace(/const \[toastMessage, setToastMessage\].*?\n/g, '');
content = content.replace(/const showToast = useCallback\(\(message: string, action\?: \{ label: string, onClick: \(\) => void \}\) => \{[\s\S]*?\}, \[\]\);/g, 'const { showToast } = useToast();');

// 4. Remove the local toast UI rendering
content = content.replace(/\{\/\* Toast Notification \*\/\}.*?<\/div>/s, '');

// 5. Replace alerts with showToast(..., 'error') or 'info'
content = content.replace(/alert\("Error: " \+ e\.message\)/g, 'showToast("Error: " + e.message, "error")');
content = content.replace(/alert\("Import error: " \+ e\.message\)/g, 'showToast("Import error: " + e.message, "error")');
content = content.replace(/alert\("Folder not found\."\)/g, 'showToast("Folder not found.", "error")');
content = content.replace(/alert\('Generate Flashcards coming soon!'\)/g, "showToast('Generate Flashcards coming soon!', 'info')");
content = content.replace(/alert\('Summarize coming soon!'\)/g, "showToast('Summarize coming soon!', 'info')");

// 6. Replace confirm with showConfirm
content = content.replace(
    "if (confirm(`Are you sure you want to permanently delete ${idsToDelete.length} lectures? This cannot be undone.`)) {",
    "if (await showConfirm(`Are you sure you want to permanently delete ${idsToDelete.length} lectures? This cannot be undone.`)) {"
);
content = content.replace(
    "if (confirm('Are you sure you want to permanently delete all trashed lectures?')) {",
    "if (await showConfirm('Are you sure you want to permanently delete all trashed lectures?')) {"
);

// 7. Fix showToast in LibraryPage to use correct signature for undo actions
content = content.replace(/showToast\(`Moved \$\{idsToTrash\.length\} item\(s\) to trash`, \{/g, "showToast(`Moved ${idsToTrash.length} item(s) to trash`, 'info', {");
content = content.replace(/showToast\('Moved to trash', \{/g, "showToast('Moved to trash', 'info', {");
content = content.replace(/showToast\('Lecture archived', \{/g, "showToast('Lecture archived', 'info', {");
content = content.replace(/showToast\(`Archived \$\{selectedIds\.size\} lecture\(s\)`\, \{/g, "showToast(`Archived ${selectedIds.size} lecture(s)`, 'info', {");
content = content.replace(/showToast\('Item deleted\. You can restore it from Trash\.', \{/g, "showToast('Item deleted. You can restore it from Trash.', 'info', {");

// 8. Add useToast to LectureCard and LectureListRow
content = content.replace(/const durationMin = Math\.round\(lecture\.durationMs \/ 60000\);/g, 'const durationMin = Math.round(lecture.durationMs / 60000);\n    const { showToast } = useToast();');

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Done replacing.');
