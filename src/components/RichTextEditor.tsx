/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/RichTextEditor.tsx
"use client";

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, List, ListOrdered, Strikethrough, Heading2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect } from 'react'

interface RichTextEditorProps {
    content: string
    onChange: (content: string) => void
    editable?: boolean
    placeholder?: string
}

const MenuBar = ({ editor }: { editor: any }) => {
    if (!editor) return null

    return (
        <div className="flex items-center gap-1 p-2 border-b border-zinc-800 bg-zinc-900/50">
            <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                disabled={!editor.can().chain().focus().toggleBold().run()}
                className={cn("p-1.5 rounded hover:bg-zinc-800 transition-colors", editor.isActive('bold') ? 'bg-zinc-800 text-white' : 'text-zinc-400')}
            >
                <Bold className="w-4 h-4" />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                disabled={!editor.can().chain().focus().toggleItalic().run()}
                className={cn("p-1.5 rounded hover:bg-zinc-800 transition-colors", editor.isActive('italic') ? 'bg-zinc-800 text-white' : 'text-zinc-400')}
            >
                <Italic className="w-4 h-4" />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleStrike().run()}
                disabled={!editor.can().chain().focus().toggleStrike().run()}
                className={cn("p-1.5 rounded hover:bg-zinc-800 transition-colors", editor.isActive('strike') ? 'bg-zinc-800 text-white' : 'text-zinc-400')}
            >
                <Strikethrough className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-zinc-700 mx-1" />
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={cn("p-1.5 rounded hover:bg-zinc-800 transition-colors", editor.isActive('heading', { level: 2 }) ? 'bg-zinc-800 text-white' : 'text-zinc-400')}
            >
                <Heading2 className="w-4 h-4" />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={cn("p-1.5 rounded hover:bg-zinc-800 transition-colors", editor.isActive('bulletList') ? 'bg-zinc-800 text-white' : 'text-zinc-400')}
            >
                <List className="w-4 h-4" />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={cn("p-1.5 rounded hover:bg-zinc-800 transition-colors", editor.isActive('orderedList') ? 'bg-zinc-800 text-white' : 'text-zinc-400')}
            >
                <ListOrdered className="w-4 h-4" />
            </button>
        </div>
    )
}

export default function RichTextEditor({ content, onChange, editable = true, placeholder }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: placeholder || 'Viết nội dung kịch bản...',
                emptyEditorClass: 'is-editor-empty before:content-[attr(data-placeholder)] before:text-zinc-600 before:float-left before:pointer-events-none',
            }),
        ],
        content: content,
        editable: editable,
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: 'prose prose-invert prose-sm sm:prose-base max-w-none focus:outline-none min-h-[200px] px-4 py-3 text-zinc-300',
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
    })

    // Cập nhật content khi props thay đổi (ví dụ: chọn kịch bản khác)
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content)
        }
    }, [content, editor])

    // Cập nhật trạng thái editable
    useEffect(() => {
        if (editor) {
            editor.setEditable(editable)
        }
    }, [editable, editor])

    return (
        <div className="flex flex-col border border-zinc-800 rounded-lg overflow-hidden bg-black/20 focus-within:border-zinc-600 transition-colors">
            {editable && <MenuBar editor={editor} />}
            <EditorContent editor={editor} />
        </div>
    )
}