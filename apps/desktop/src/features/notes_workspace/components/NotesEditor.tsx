import { useRef, useEffect, useCallback, useState } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extension-placeholder';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Link } from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { cn } from '@/components';
import { Note } from '../NotesWorkspacePage';
import {
    Bold, Italic, Strikethrough, Code, List, ListOrdered,
    CheckSquare, Quote, Minus, Link2, Table as TableIcon,
    Heading1, Heading2, Heading3, Save, Check, Undo, Redo, Code2,
} from 'lucide-react';

interface NotesEditorProps {
    note: Note;
    focusMode: boolean;
    onUpdate: (patch: Partial<Note>) => void;
}

export function NotesEditor({ note, focusMode, onUpdate }: NotesEditorProps) {
    const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved');
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const triggerSave = useCallback(() => {
        setSaveState('saving');
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => setSaveState('saved'), 900);
    }, []);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
            }),
            Placeholder.configure({
                placeholder: 'Start writing your notes here...',
                emptyEditorClass: 'is-editor-empty',
            }),
            TaskList,
            TaskItem.configure({ nested: true }),
            Link.configure({ openOnClick: false }),
            Table.configure({ resizable: false }),
            TableRow,
            TableCell,
            TableHeader,
        ],
        content: note.content || '',
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            onUpdate({ content: html });
            triggerSave();
        },
        editorProps: {
            attributes: {
                class: 'bacham-editor-content outline-none min-h-[300px]',
                spellcheck: 'true',
            },
        },
    });

    // Sync content when switching notes (only on note ID change)
    const noteIdRef = useRef(note.id);
    useEffect(() => {
        if (!editor || note.id === noteIdRef.current) return;
        noteIdRef.current = note.id;
        editor.commands.setContent(note.content || '');
    }, [note.id, editor]);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdate({ title: e.target.value });
        triggerSave();
    };

    if (!editor) return null;

    return (
        <div className="flex flex-col h-full bg-[var(--bg)] overflow-hidden">

            {/* ── Toolbar ─────────────────────────────────────────────────── */}
            {!focusMode && (
                <div className="shrink-0 border-b border-[var(--border)] bg-[var(--surface)]/60 backdrop-blur-sm">
                    <div className="flex items-center gap-0.5 px-4 py-1.5 overflow-x-auto scrollbar-hide">

                        {/* Undo / Redo */}
                        <ToolbarGroup>
                            <TBtn
                                icon={<Undo size={13} />}
                                label="Undo (Ctrl+Z)"
                                onClick={() => editor.chain().focus().undo().run()}
                                disabled={!editor.can().undo()}
                            />
                            <TBtn
                                icon={<Redo size={13} />}
                                label="Redo (Ctrl+Y)"
                                onClick={() => editor.chain().focus().redo().run()}
                                disabled={!editor.can().redo()}
                            />
                        </ToolbarGroup>

                        <Div />

                        {/* Headings */}
                        <ToolbarGroup>
                            <TBtn
                                icon={<Heading1 size={14} />}
                                label="Heading 1"
                                active={editor.isActive('heading', { level: 1 })}
                                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                            />
                            <TBtn
                                icon={<Heading2 size={14} />}
                                label="Heading 2"
                                active={editor.isActive('heading', { level: 2 })}
                                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                            />
                            <TBtn
                                icon={<Heading3 size={14} />}
                                label="Heading 3"
                                active={editor.isActive('heading', { level: 3 })}
                                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                            />
                        </ToolbarGroup>

                        <Div />

                        {/* Inline formatting */}
                        <ToolbarGroup>
                            <TBtn
                                icon={<Bold size={13} />}
                                label="Bold (Ctrl+B)"
                                active={editor.isActive('bold')}
                                onClick={() => editor.chain().focus().toggleBold().run()}
                            />
                            <TBtn
                                icon={<Italic size={13} />}
                                label="Italic (Ctrl+I)"
                                active={editor.isActive('italic')}
                                onClick={() => editor.chain().focus().toggleItalic().run()}
                            />
                            <TBtn
                                icon={<Strikethrough size={13} />}
                                label="Strikethrough"
                                active={editor.isActive('strike')}
                                onClick={() => editor.chain().focus().toggleStrike().run()}
                            />
                            <TBtn
                                icon={<Code size={13} />}
                                label="Inline Code"
                                active={editor.isActive('code')}
                                onClick={() => editor.chain().focus().toggleCode().run()}
                            />
                        </ToolbarGroup>

                        <Div />

                        {/* Lists */}
                        <ToolbarGroup>
                            <TBtn
                                icon={<List size={13} />}
                                label="Bullet List"
                                active={editor.isActive('bulletList')}
                                onClick={() => editor.chain().focus().toggleBulletList().run()}
                            />
                            <TBtn
                                icon={<ListOrdered size={13} />}
                                label="Numbered List"
                                active={editor.isActive('orderedList')}
                                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                            />
                            <TBtn
                                icon={<CheckSquare size={13} />}
                                label="Task List"
                                active={editor.isActive('taskList')}
                                onClick={() => editor.chain().focus().toggleTaskList().run()}
                            />
                        </ToolbarGroup>

                        <Div />

                        {/* Blocks */}
                        <ToolbarGroup>
                            <TBtn
                                icon={<Quote size={13} />}
                                label="Blockquote"
                                active={editor.isActive('blockquote')}
                                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                            />
                            <TBtn
                                icon={<Code2 size={13} />}
                                label="Code Block"
                                active={editor.isActive('codeBlock')}
                                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                            />
                            <TBtn
                                icon={<Minus size={13} />}
                                label="Divider"
                                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                            />
                            <TBtn
                                icon={<TableIcon size={13} />}
                                label="Insert Table"
                                active={editor.isActive('table')}
                                onClick={() =>
                                    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
                                }
                            />
                            <LinkButton editor={editor} />
                        </ToolbarGroup>

                        {/* Autosave indicator */}
                        <div className="ml-auto flex items-center gap-1.5 text-[10px] font-semibold text-[var(--text-muted)] shrink-0 pl-3">
                            {saveState === 'saving'
                                ? <><Save size={11} className="animate-pulse" /> Saving…</>
                                : <><Check size={11} className="text-[var(--accent)]" /> Saved</>}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Editor Area ──────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto scroll-smooth">
                <div className={cn(
                    'w-full pb-24',
                    focusMode
                        ? 'max-w-3xl mx-auto px-16 pt-16'
                        : 'max-w-4xl mx-auto px-12 pt-10',
                )}>
                    {/* Note Title */}
                    <input
                        type="text"
                        value={note.title}
                        onChange={handleTitleChange}
                        placeholder="Untitled Note"
                        className="w-full bg-transparent text-[30px] font-extrabold text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/25 focus:outline-none tracking-tight mb-6 border-b border-[var(--border)] pb-4"
                    />

                    {/* TipTap Rich Text */}
                    <EditorContent editor={editor} />
                </div>
            </div>
        </div>
    );
}

/* ── Link Button with URL Prompt ──────────────────────────────────────────── */
function LinkButton({ editor }: { editor: Editor }) {
    const handleLink = () => {
        const prev = editor.getAttributes('link').href || '';
        const url = window.prompt('Enter URL:', prev);
        if (url === null) return;
        if (url === '') {
            editor.chain().focus().unsetLink().run();
        } else {
            editor.chain().focus().setLink({ href: url }).run();
        }
    };
    return (
        <TBtn
            icon={<Link2 size={13} />}
            label="Add Link"
            active={editor.isActive('link')}
            onClick={handleLink}
        />
    );
}

/* ── Toolbar Primitives ─────────────────────────────────────────────────────── */
function ToolbarGroup({ children }: { children: React.ReactNode }) {
    return <div className="flex items-center gap-0.5">{children}</div>;
}

function Div() {
    return <div className="w-px h-4 bg-[var(--border)] mx-1.5 shrink-0" />;
}

function TBtn({
    icon, label, onClick, active = false, disabled = false,
}: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            // onMouseDown prevents the editor losing focus before onClick fires
            onMouseDown={e => { e.preventDefault(); onClick(); }}
            title={label}
            disabled={disabled}
            className={cn(
                'p-1.5 rounded-md transition-all shrink-0 select-none',
                active
                    ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]',
                disabled && 'opacity-30 cursor-not-allowed',
            )}
        >
            {icon}
        </button>
    );
}
