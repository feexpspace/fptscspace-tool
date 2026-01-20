"use client";

import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import LinkExtension from "@tiptap/extension-link"; // Import Link
import Highlight from "@tiptap/extension-highlight";
import { Extension } from "@tiptap/core";
import { useState } from "react";

import {
    Bold,
    Italic,
    Strikethrough, // Icon gạch giữa
    List,
    ListOrdered,
    Heading2,
    Quote,
    Undo,
    Redo,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    Type,
    Palette,
    Link as LinkIcon, // Icon Link
    Unlink, // Icon Unlink
    Check,
    Plus,
    Baseline,
    Highlighter
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- CUSTOM EXTENSION: FONT SIZE (Giữ nguyên) ---
declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        fontSize: {
            setFontSize: (size: string) => ReturnType;
            unsetFontSize: () => ReturnType;
        };
    }
}

const FontSize = Extension.create({
    name: "fontSize",
    addOptions() {
        return {
            types: ["textStyle"],
        };
    },
    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: (element) => element.style.fontSize.replace(/['"]+/g, ""),
                        renderHTML: (attributes) => {
                            if (!attributes.fontSize) {
                                return {};
                            }
                            return {
                                style: `font-size: ${attributes.fontSize}`,
                            };
                        },
                    },
                },
            },
        ];
    },
    addCommands() {
        return {
            setFontSize:
                (fontSize) =>
                    ({ chain }) => {
                        return chain().setMark("textStyle", { fontSize }).run();
                    },
            unsetFontSize:
                () =>
                    ({ chain }) => {
                        return chain().setMark("textStyle", { fontSize: null }).run();
                    },
        };
    },
});

// --- DANH SÁCH MÀU SẮC (PRESETS) ---
const COLOR_PALETTE = [
    // Row 1: Grayscale
    "#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#d9d9d9", "#efefef", "#f3f3f3", "#ffffff",
    // Row 2: Base Colors
    "#980000", "#ff0000", "#ff9900", "#ffff00", "#00ff00", "#00ffff", "#4a86e8", "#0000ff", "#9900ff", "#ff00ff",
    // Row 3: Lightest 
    "#e6b8af", "#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3", "#c9daf8", "#cfe2f3", "#d9d2e9", "#ead1dc",
    // Row 4: Light
    "#dd7e6b", "#ea9999", "#f9cb9c", "#ffe599", "#b6d7a8", "#a2c4c9", `#a4c2f4`, `#9fc5e8`, `#b4a7d6`, `#d5a6bd`,
    // Row 5: Medium
    "#cc4125", "#e06666", "#f6b26b", "#ffd966", "#93c47d", "#76a5af", "#6d9eeb", "#6fa8dc", "#8e7cc3", "#c27ba0",
    // Row 6: Dark
    "#a61c00", "#cc0000", "#e69138", "#f1c232", "#6aa84f", "#45818e", "#3c78d8", "#3d85c6", "#674ea7", "#a64d79",
    // Row 7: Darker
    "#85200c", "#990000", "#b45f06", "#bf9000", "#38761d", "#134f5c", "#1155cc", "#0b5394", "#351c75", "#741b47",
    // Row 8: Darkest
    "#5b0f00", "#660000", "#783f04", "#7f6000", "#274e13", "#0c343d", "#1c4587", "#073763", "#20124d", "#4c1130"
];

interface RichTextEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
    editable?: boolean;
}

const MenuBar = ({ editor }: { editor: Editor | null }) => {
    const [isColorOpen, setIsColorOpen] = useState(false);

    if (!editor) {
        return null;
    }

    const fontSizes = ["12px", "14px", "16px", "18px", "20px", "24px", "30px"];

    // Hàm xử lý Link
    const setLink = () => {
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL:', previousUrl);

        // cancelled
        if (url === null) {
            return;
        }

        // empty
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        // update
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    return (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900 rounded-t-lg">

            {/* --- NHÓM FORMAT CƠ BẢN --- */}
            <div className="flex items-center gap-1 pr-2 border-r border-zinc-300 dark:border-zinc-700">
                <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    disabled={!editor.can().chain().focus().toggleBold().run()}
                    className={cn(
                        "rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors",
                        editor.isActive("bold") ? "bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white" : "text-zinc-500"
                    )}
                    title="Bold"
                >
                    <Bold className="h-4 w-4" />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    disabled={!editor.can().chain().focus().toggleItalic().run()}
                    className={cn(
                        "rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors",
                        editor.isActive("italic") ? "bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white" : "text-zinc-500"
                    )}
                    title="Italic"
                >
                    <Italic className="h-4 w-4" />
                </button>
                {/* [YÊU CẦU 1]: Giữ lại Strikethrough */}
                <button
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    disabled={!editor.can().chain().focus().toggleStrike().run()}
                    className={cn(
                        "rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors",
                        editor.isActive("strike") ? "bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white" : "text-zinc-500"
                    )}
                    title="Strikethrough"
                >
                    <Strikethrough className="h-4 w-4" />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleCustomHighlight().run()}
                    disabled={!editor.can().chain().focus().toggleCustomHighlight().run()}
                    className={cn("rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors", editor.isActive("highlight") ? "bg-yellow-200 text-black" : "text-zinc-500")}
                    title="Highlight"
                >
                    <Highlighter className="h-4 w-4" />
                </button>
            </div>

            {/* --- GROUP 2: FONT & COLOR --- */}
            <div className="flex items-center gap-2 px-2 border-r border-zinc-300 dark:border-zinc-700">
                <div className="flex items-center gap-1">
                    <Type className="h-4 w-4 text-zinc-400" />
                    <select
                        onChange={(e) => {
                            const size = e.target.value;
                            if (size) editor.commands.setFontSize(size);
                            else editor.commands.unsetFontSize();
                        }}
                        value={editor.getAttributes('textStyle').fontSize || ""}
                        className="h-7 w-20 text-xs rounded border border-zinc-300 bg-white px-1 outline-none dark:border-zinc-700 dark:bg-black"
                    >
                        <option value="">Auto</option>
                        {fontSizes.map(size => (
                            <option key={size} value={size}>{size}</option>
                        ))}
                    </select>
                </div>

                {/* --- BẢNG MÀU NÂNG CAO --- */}
                <div className="relative">
                    <button
                        onClick={() => setIsColorOpen(!isColorOpen)}
                        className="flex items-center justify-center px-1.5 pt-1.5 pb-0.5 rounded-t-sm hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors border-b-[3px]"
                        style={{ borderBottomColor: editor.getAttributes('textStyle').color || '#000000', borderBottomWidth: '5px' }}
                        title="Màu chữ"
                    >
                        <div className="text-md leading-none text-zinc-700 dark:text-zinc-300">
                            A
                        </div>
                    </button>

                    {isColorOpen && (
                        <>
                            <div className="fixed inset-0 z-20" onClick={() => setIsColorOpen(false)} />
                            <div className="absolute top-full left-0 mt-2 z-30 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl p-3 w-[260px] animate-in zoom-in-95 origin-top-left">

                                {/* Grid 10 cột cho 80 màu */}
                                <div className="grid grid-cols-10 gap-1.5 mb-3">
                                    {COLOR_PALETTE.map((color) => (
                                        <button
                                            key={color}
                                            onClick={() => {
                                                editor.chain().focus().setColor(color).run();
                                                setIsColorOpen(false);
                                            }}
                                            className={cn(
                                                "w-5 h-5 rounded-full border border-zinc-100 dark:border-zinc-800 hover:scale-110 hover:shadow-sm transition-transform flex items-center justify-center",
                                                editor.isActive('textStyle', { color }) && "ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-zinc-900"
                                            )}
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        >
                                        </button>
                                    ))}
                                </div>

                                <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2 flex flex-col gap-2">
                                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tùy chỉnh</div>
                                    <div className="flex items-center gap-2">
                                        {/* Nút Custom Color Picker */}
                                        <label className="flex items-center gap-2 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 p-1.5 rounded-md flex-1 transition-colors relative overflow-hidden group">
                                            <div className="w-5 h-5 rounded-full border border-zinc-300 flex items-center justify-center bg-gradient-to-br from-red-500 via-green-500 to-blue-500 group-hover:scale-110 transition-transform">
                                                <Plus className="h-3 w-3 text-white drop-shadow-md" />
                                            </div>
                                            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Thêm màu mới</span>
                                            <input
                                                type="color"
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                onInput={(e) => {
                                                    const val = (e.target as HTMLInputElement).value;
                                                    // Kiểm tra safe call cho setColor
                                                    if (editor.chain().focus().setColor) {
                                                        editor.chain().focus().setColor(val).run();
                                                    }
                                                    setIsColorOpen(false);
                                                }}
                                            />
                                        </label>

                                        {/* Nút Reset */}
                                        <button
                                            onClick={() => {
                                                editor.chain().focus().unsetColor().run();
                                                setIsColorOpen(false);
                                            }}
                                            className="p-1.5 text-xs text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                            title="Xóa màu (Mặc định)"
                                        >
                                            Mặc định
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* --- NHÓM LINK [YÊU CẦU 3] --- */}
            <div className="flex items-center gap-1 px-2 border-r border-zinc-300 dark:border-zinc-700">
                <button
                    onClick={setLink}
                    className={cn(
                        "rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors",
                        editor.isActive("link") ? "bg-zinc-200 text-blue-600 dark:bg-zinc-800 dark:text-blue-400" : "text-zinc-500"
                    )}
                    title="Chèn Link"
                >
                    <LinkIcon className="h-4 w-4" />
                </button>

                {editor.isActive("link") && (
                    <button
                        onClick={() => editor.chain().focus().unsetLink().run()}
                        className="rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-zinc-500"
                        title="Gỡ Link"
                    >
                        <Unlink className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* --- NHÓM CĂN LỀ --- */}
            <div className="flex items-center gap-1 px-2 border-r border-zinc-300 dark:border-zinc-700">
                <button
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    className={cn(
                        "rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors",
                        editor.isActive({ textAlign: 'left' }) ? "bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white" : "text-zinc-500"
                    )}
                    title="Align Left"
                >
                    <AlignLeft className="h-4 w-4" />
                </button>
                <button
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    className={cn(
                        "rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors",
                        editor.isActive({ textAlign: 'center' }) ? "bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white" : "text-zinc-500"
                    )}
                    title="Align Center"
                >
                    <AlignCenter className="h-4 w-4" />
                </button>
                <button
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    className={cn(
                        "rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors",
                        editor.isActive({ textAlign: 'right' }) ? "bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white" : "text-zinc-500"
                    )}
                    title="Align Right"
                >
                    <AlignRight className="h-4 w-4" />
                </button>
                <button
                    onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                    className={cn(
                        "rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors",
                        editor.isActive({ textAlign: 'justify' }) ? "bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white" : "text-zinc-500"
                    )}
                    title="Justify"
                >
                    <AlignJustify className="h-4 w-4" />
                </button>
            </div>

            {/* --- NHÓM HEADING & LIST --- */}
            <div className="flex items-center gap-1 pl-2">
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={cn(
                        "rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors",
                        editor.isActive("heading", { level: 2 }) ? "bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white" : "text-zinc-500"
                    )}
                    title="Heading 2"
                >
                    <Heading2 className="h-4 w-4" />
                </button>

                <button
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={cn(
                        "rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors",
                        editor.isActive("bulletList") ? "bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white" : "text-zinc-500"
                    )}
                    title="Bullet List"
                >
                    <List className="h-4 w-4" />
                </button>

                <button
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={cn(
                        "rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors",
                        editor.isActive("orderedList") ? "bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white" : "text-zinc-500"
                    )}
                    title="Ordered List"
                >
                    <ListOrdered className="h-4 w-4" />
                </button>

                <button
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className={cn(
                        "rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors",
                        editor.isActive("blockquote") ? "bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white" : "text-zinc-500"
                    )}
                    title="Quote"
                >
                    <Quote className="h-4 w-4" />
                </button>
            </div>

            {/* --- UNDO/REDO (Đẩy sang phải) --- */}
            <div className="ml-auto flex items-center gap-1 pl-2 border-l border-zinc-300 dark:border-zinc-700">
                <button
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().chain().focus().undo().run()}
                    className="rounded p-1.5 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-30"
                    title="Undo"
                >
                    <Undo className="h-4 w-4" />
                </button>
                <button
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().chain().focus().redo().run()}
                    className="rounded p-1.5 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-30"
                    title="Redo"
                >
                    <Redo className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
};

export default function RichTextEditor({
    content,
    onChange,
    placeholder,
    editable = true,
}: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            TextStyle,
            Color,
            FontSize,
            Highlight.configure({ multicolor: true }),
            LinkExtension.configure({
                openOnClick: false, // Để editor có thể edit link dễ dàng
                autolink: true,
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
        ],
        content: content,
        editable: editable,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: "prose dark:prose-invert max-w-none focus:outline-none min-h-[150px] px-4 py-3",
            },
        },
        immediatelyRender: false,
    });

    return (
        <div className="w-full rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black overflow-visible shadow-sm z-0">
            {/* Lưu ý: overflow-visible để popup màu không bị che */}
            {editable && <MenuBar editor={editor} />}
            <div className={cn(!editable && "bg-zinc-50 dark:bg-zinc-900/50 p-4")}>
                <EditorContent editor={editor} placeholder={placeholder} />
            </div>
        </div>
    );
}