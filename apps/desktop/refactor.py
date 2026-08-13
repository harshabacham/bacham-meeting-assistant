import re

file_path = 'src/pages/LibraryPage.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Import useToast and useConfirmStore
content = content.replace("import { TauriClient } from '@/infrastructure/tauri-client';", "import { TauriClient } from '@/infrastructure/tauri-client';\nimport { useToast } from '@/components/ui/ToastProvider';\nimport { useConfirmStore } from '@/components/ui/ConfirmProvider';")

# 2. Add useConfirmStore to LibraryPage
content = content.replace("const [searchParams] = useSearchParams();", "const [searchParams] = useSearchParams();\n    const { showConfirm } = useConfirmStore();")

# 3. Remove local toastMessage state and showToast definition
content = re.sub(r'const \[toastMessage, setToastMessage\].*?\n', '', content)
content = re.sub(r'const showToast = useCallback\(\(.*?\};(?:\n        \}, 8000\);\n    \}, \[\]\);|(?:\n\s*setTimeout[^\n]*\n\s*setToastMessage[^\n]*\n\s*\}, 8000\);\n\s*\}, \[\]\);))', 'const { showToast } = useToast();', content, flags=re.DOTALL)

# 4. Remove the local toast UI rendering
content = re.sub(r'\{\/\* Toast Notification \*\/\}.*?<\/div>', '', content, flags=re.DOTALL)

# 5. Replace alerts with showToast(..., 'error') or 'info'
content = content.replace('alert("Error: " + e.message)', 'showToast("Error: " + e.message, "error")')
content = content.replace('alert("Import error: " + e.message)', 'showToast("Import error: " + e.message, "error")')
content = content.replace('alert("Folder not found.")', 'showToast("Folder not found.", "error")')
content = content.replace("alert('Generate Flashcards coming soon!')", "showToast('Generate Flashcards coming soon!', 'info')")
content = content.replace("alert('Summarize coming soon!')", "showToast('Summarize coming soon!', 'info')")

# 6. Replace confirm with showConfirm
content = content.replace(
    "if (confirm(`Are you sure you want to permanently delete ${idsToDelete.length} lectures? This cannot be undone.`)) {",
    "if (await showConfirm(`Are you sure you want to permanently delete ${idsToDelete.length} lectures? This cannot be undone.`)) {"
)
content = content.replace(
    "if (confirm('Are you sure you want to permanently delete all trashed lectures?')) {",
    "if (await showConfirm('Are you sure you want to permanently delete all trashed lectures?')) {"
)

# 7. Fix showToast in LibraryPage to use correct signature for undo actions
content = content.replace("showToast(`Moved ${idsToTrash.length} item(s) to trash`, {", "showToast(`Moved ${idsToTrash.length} item(s) to trash`, 'info', {")
content = content.replace("showToast('Moved to trash', {", "showToast('Moved to trash', 'info', {")
content = content.replace("showToast('Lecture archived', {", "showToast('Lecture archived', 'info', {")
content = content.replace("showToast(`Archived ${selectedIds.size} lecture(s)`, {", "showToast(`Archived ${selectedIds.size} lecture(s)`, 'info', {")
content = content.replace("showToast('Item deleted. You can restore it from Trash.', {", "showToast('Item deleted. You can restore it from Trash.', 'info', {")

# 8. Add useToast to LectureCard and LectureListRow
content = content.replace('const durationMin = Math.round(lecture.durationMs / 60000);', 'const durationMin = Math.round(lecture.durationMs / 60000);\n    const { showToast } = useToast();')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done replacing.')
