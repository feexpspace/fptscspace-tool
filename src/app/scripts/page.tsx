/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/scripts/page.tsx
"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { Script, Channel, ScriptStatus, Feedback, FeedbackStatus } from "@/types";
import { getScripts, getUserChannels, saveScript, getScriptFeedbacks, deleteScript, updateFeedbackStatus } from "@/app/actions/script";
import {
    Plus, ScrollText, Loader2, ArrowLeft, Save, Send,
    Clock, CheckCircle, XCircle, FileEdit, MessageSquare, Trash2,
    LayoutGrid, List, Tv, ChevronDown,
    // Icons cho Toolbar
    Bold, Italic, Strikethrough, Undo, Redo,
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Heading2, Quote, List as ListIcon, ListOrdered,
    Type, Palette, Link as LinkIcon, Unlink, Highlighter, Baseline, Check, Plus as PlusIcon,
    ArrowUpDown,
    Search,
    Calendar,
    PanelRightClose
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/ConfirmModal";

// --- TIPTAP IMPORTS ---
import { useEditor, EditorContent, Editor, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import LinkExtension from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
// [QUAN TRỌNG]: Import CustomHighlight
import { CustomHighlight } from "@/components/extensions/CustomHighlight";

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
    addOptions() { return { types: ["textStyle"] }; },
    addGlobalAttributes() {
        return [{
            types: this.options.types,
            attributes: {
                fontSize: {
                    default: null,
                    parseHTML: (element) => element.style.fontSize.replace(/['"]+/g, ""),
                    renderHTML: (attributes) => {
                        if (!attributes.fontSize) return {};
                        return { style: `font-size: ${attributes.fontSize}` };
                    },
                },
            },
        }];
    },
    addCommands() {
        return {
            setFontSize: (fontSize) => ({ chain }) => chain().setMark("textStyle", { fontSize }).run(),
            unsetFontSize: () => ({ chain }) => chain().setMark("textStyle", { fontSize: null }).run(),
        };
    },
});

const COLOR_PALETTE = [
    "#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#d9d9d9", "#efefef", "#f3f3f3", "#ffffff",
    "#980000", "#ff0000", "#ff9900", "#ffff00", "#00ff00", "#00ffff", "#4a86e8", "#0000ff", "#9900ff", "#ff00ff",
    "#e6b8af", "#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3", "#c9daf8", "#cfe2f3", "#d9d2e9", "#ead1dc",
    "#dd7e6b", "#ea9999", "#f9cb9c", "#ffe599", "#b6d7a8", "#a2c4c9", `#a4c2f4`, `#9fc5e8`, `#b4a7d6`, `#d5a6bd`,
    "#cc4125", "#e06666", "#f6b26b", "#ffd966", "#93c47d", "#76a5af", "#6d9eeb", "#6fa8dc", "#8e7cc3", "#c27ba0",
    "#a61c00", "#cc0000", "#e69138", "#f1c232", "#6aa84f", "#45818e", "#3c78d8", "#3d85c6", "#674ea7", "#a64d79",
    "#85200c", "#990000", "#b45f06", "#bf9000", "#38761d", "#134f5c", "#1155cc", "#0b5394", "#351c75", "#741b47",
    "#5b0f00", "#660000", "#783f04", "#7f6000", "#274e13", "#0c343d", "#1c4587", "#073763", "#20124d", "#4c1130"
];

// --- 2. FULL MENU BAR COMPONENT ---
export const FullMenuBar = ({ editor }: { editor: Editor | null }) => {
    const [isColorOpen, setIsColorOpen] = useState(false);

    if (!editor) return null;

    const fontSizes = ["12px", "14px", "16px", "18px", "20px", "24px", "30px"];

    const setLink = () => {
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL:', previousUrl);
        if (url === null) return;
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    return (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900 rounded-t-lg">

            {/* GROUP 1: FORMAT */}
            <div className="flex items-center gap-1 pr-2 border-r border-zinc-300 dark:border-zinc-700">
                <button onClick={() => editor.chain().focus().toggleBold().run()} disabled={!editor.can().chain().focus().toggleBold().run()} className={cn("rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors", editor.isActive("bold") ? "bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white" : "text-zinc-500")} title="Bold"><Bold className="h-4 w-4" /></button>
                <button onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!editor.can().chain().focus().toggleItalic().run()} className={cn("rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors", editor.isActive("italic") ? "bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white" : "text-zinc-500")} title="Italic"><Italic className="h-4 w-4" /></button>
                <button onClick={() => editor.chain().focus().toggleStrike().run()} disabled={!editor.can().chain().focus().toggleStrike().run()} className={cn("rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors", editor.isActive("strike") ? "bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white" : "text-zinc-500")} title="Strikethrough"><Strikethrough className="h-4 w-4" /></button>

                {/* [QUAN TRỌNG]: Dùng toggleCustomHighlight */}
                <button onClick={() => editor.chain().focus().toggleCustomHighlight().run()} disabled={!editor.can().chain().focus().toggleCustomHighlight().run()} className={cn("rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors", editor.isActive("highlight") ? "bg-yellow-200 text-black" : "text-zinc-500")} title="Highlight"><Highlighter className="h-4 w-4" /></button>
            </div>

            {/* GROUP 2: FONT & COLOR */}
            <div className="flex items-center gap-2 px-2 border-r border-zinc-300 dark:border-zinc-700">
                <div className="flex items-center gap-1">
                    <Type className="h-4 w-4 text-zinc-400" />
                    <select onChange={(e) => { const size = e.target.value; if (size) editor.commands.setFontSize(size); else editor.commands.unsetFontSize(); }} value={editor.getAttributes('textStyle').fontSize || ""} className="h-7 w-20 text-xs rounded border border-zinc-300 bg-white px-1 outline-none dark:border-zinc-700 dark:bg-black">
                        <option value="">Auto</option>
                        {fontSizes.map(size => <option key={size} value={size}>{size}</option>)}
                    </select>
                </div>

                <div className="relative">
                    <button onClick={() => setIsColorOpen(!isColorOpen)} className="flex items-center justify-center px-1.5 pt-1.5 pb-0.5 rounded-t-sm hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors border-b-[3px]" style={{ borderBottomColor: editor.getAttributes('textStyle').color || '#000000', borderBottomWidth: '5px' }} title="Màu chữ">
                        <div className="text-md leading-none text-zinc-700 dark:text-zinc-300">A</div>
                    </button>
                    {isColorOpen && (
                        <>
                            <div className="fixed inset-0 z-20" onClick={() => setIsColorOpen(false)} />
                            <div className="absolute top-full left-0 mt-2 z-30 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl p-3 w-[260px] animate-in zoom-in-95 origin-top-left">
                                <div className="grid grid-cols-10 gap-1.5 mb-3">
                                    {COLOR_PALETTE.map((color) => (
                                        <button key={color} onClick={() => { editor.chain().focus().setColor(color).run(); setIsColorOpen(false); }} className={cn("w-5 h-5 rounded-full border border-zinc-100 dark:border-zinc-800 hover:scale-110 hover:shadow-sm transition-transform flex items-center justify-center", editor.isActive('textStyle', { color }) && "ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-zinc-900")} style={{ backgroundColor: color }} title={color}></button>
                                    ))}
                                </div>
                                <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2 flex flex-col gap-2">
                                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tùy chỉnh</div>
                                    <div className="flex items-center gap-2">
                                        <label className="flex items-center gap-2 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 p-1.5 rounded-md flex-1 transition-colors relative overflow-hidden group">
                                            <div className="w-5 h-5 rounded-full border border-zinc-300 flex items-center justify-center bg-gradient-to-br from-red-500 via-green-500 to-blue-500 group-hover:scale-110 transition-transform"><PlusIcon className="h-3 w-3 text-white drop-shadow-md" /></div>
                                            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Thêm màu mới</span>
                                            <input type="color" className="absolute inset-0 opacity-0 cursor-pointer" onInput={(e) => { const val = (e.target as HTMLInputElement).value; if (editor.chain().focus().setColor) { editor.chain().focus().setColor(val).run(); } setIsColorOpen(false); }} />
                                        </label>
                                        <button onClick={() => { editor.chain().focus().unsetColor().run(); setIsColorOpen(false); }} className="p-1.5 text-xs text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors" title="Xóa màu (Mặc định)">Mặc định</button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* GROUP 3: LINK */}
            <div className="flex items-center gap-1 px-2 border-r border-zinc-300 dark:border-zinc-700">
                <button onClick={setLink} className={cn("rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors", editor.isActive("link") ? "bg-zinc-200 text-blue-600 dark:bg-zinc-800 dark:text-blue-400" : "text-zinc-500")} title="Chèn Link"><LinkIcon className="h-4 w-4" /></button>
                {editor.isActive("link") && <button onClick={() => editor.chain().focus().unsetLink().run()} className="rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-zinc-500" title="Gỡ Link"><Unlink className="h-4 w-4" /></button>}
            </div>

            {/* GROUP 4: ALIGN */}
            <div className="flex items-center gap-1 px-2 border-r border-zinc-300 dark:border-zinc-700">
                <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={cn("rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800", editor.isActive({ textAlign: 'left' }) ? "bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white" : "text-zinc-500")} title="Align Left"><AlignLeft className="h-4 w-4" /></button>
                <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={cn("rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800", editor.isActive({ textAlign: 'center' }) ? "bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white" : "text-zinc-500")} title="Align Center"><AlignCenter className="h-4 w-4" /></button>
                <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={cn("rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800", editor.isActive({ textAlign: 'right' }) ? "bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white" : "text-zinc-500")} title="Align Right"><AlignRight className="h-4 w-4" /></button>
                <button onClick={() => editor.chain().focus().setTextAlign('justify').run()} className={cn("rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800", editor.isActive({ textAlign: 'justify' }) ? "bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white" : "text-zinc-500")} title="Justify"><AlignJustify className="h-4 w-4" /></button>
            </div>

            {/* GROUP 5: LISTS */}
            <div className="flex items-center gap-1 pl-2">
                <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={cn("rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800", editor.isActive("heading", { level: 2 }) ? "bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white" : "text-zinc-500")} title="Heading 2"><Heading2 className="h-4 w-4" /></button>
                <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={cn("rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800", editor.isActive("bulletList") ? "bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white" : "text-zinc-500")} title="Bullet List"><ListIcon className="h-4 w-4" /></button>
                <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={cn("rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800", editor.isActive("orderedList") ? "bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white" : "text-zinc-500")} title="Ordered List"><ListOrdered className="h-4 w-4" /></button>
                <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={cn("rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800", editor.isActive("blockquote") ? "bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white" : "text-zinc-500")} title="Quote"><Quote className="h-4 w-4" /></button>
            </div>

            {/* GROUP 6: HISTORY */}
            <div className="ml-auto flex items-center gap-1 pl-2 border-l border-zinc-300 dark:border-zinc-700">
                <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().chain().focus().undo().run()} className="rounded p-1.5 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-30" title="Undo"><Undo className="h-4 w-4" /></button>
                <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().chain().focus().redo().run()} className="rounded p-1.5 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-30" title="Redo"><Redo className="h-4 w-4" /></button>
            </div>
        </div>
    );
};

const statusConfig: Record<ScriptStatus, { color: string; label: string; icon: any }> = {
    draft: { color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400", label: "Bản nháp", icon: FileEdit },
    pending: { color: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400", label: "Chờ duyệt", icon: Clock },
    approved: { color: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400", label: "Đã duyệt", icon: CheckCircle },
    rejected: { color: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400", label: "Từ chối", icon: XCircle },
};

type SortOption = 'updated_desc' | 'created_desc' | 'title_asc';

export default function ScriptsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [scripts, setScripts] = useState<Script[]>([]);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);

    const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<SortOption>('updated_desc');
    const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');

    const [isMobileFeedbackOpen, setIsMobileFeedbackOpen] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);


    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: React.ReactNode;
        onConfirm: () => Promise<void>;
    }>({
        isOpen: false,
        title: "",
        message: null,
        onConfirm: async () => { },
    });

    const [editorData, setEditorData] = useState<{
        id?: string;
        title: string;
        content: string;
        channelId: string;
        status: ScriptStatus;
    }>({
        title: "",
        content: "",
        channelId: "",
        status: "draft"
    });

    const originalDataRef = useRef<string>("");

    useEffect(() => {
        const savedLayout = localStorage.getItem("scriptsLayoutMode");
        if (savedLayout === 'grid' || savedLayout === 'list') {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLayoutMode(savedLayout);
        }
    }, []);

    // [HÀM MỚI]: Đổi Layout và lưu vào LocalStorage
    const handleLayoutChange = (mode: 'grid' | 'list') => {
        setLayoutMode(mode);
        localStorage.setItem("scriptsLayoutMode", mode);
    };

    const editor = useEditor({
        extensions: [
            StarterKit,
            TextStyle,
            Color,
            CustomHighlight.configure({ multicolor: true }),
            LinkExtension.configure({ openOnClick: false, autolink: true }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Placeholder.configure({ placeholder: 'Bắt đầu viết kịch bản...' }),
        ],
        content: '',
        onUpdate: ({ editor }) => {
            setEditorData(prev => ({ ...prev, content: editor.getHTML() }));
        },
        immediatelyRender: false,
    });

    useEffect(() => {
        if (!user) return;
        const initData = async () => {
            setIsLoading(true);
            const [scriptsData, channelsData] = await Promise.all([
                getScripts(user.id),
                getUserChannels(user.id)
            ]);
            setScripts(scriptsData);
            setChannels(channelsData);
            setIsLoading(false);
        };
        initData();
    }, [user]);

    const processedScripts = useMemo(() => {
        let result = [...scripts];

        // 1. Filter theo Search
        if (searchQuery.trim()) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(s => s.title.toLowerCase().includes(lowerQuery));
        }

        // 2. Sort
        result.sort((a, b) => {
            const dateA = new Date(a.updatedAt || a.createdAt).getTime();
            const dateB = new Date(b.updatedAt || b.createdAt).getTime();

            switch (sortBy) {
                case 'updated_desc':
                    return dateB - dateA;
                case 'created_desc':
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                case 'title_asc':
                    return a.title.localeCompare(b.title);
                default:
                    return 0;
            }
        });

        return result;
    }, [scripts, searchQuery, sortBy]);

    const handleOpenEditor = async (script?: Script) => {
        if (script) {
            setEditorData({
                id: script.id,
                title: script.title,
                content: script.content,
                channelId: script.channelId,
                status: script.status,
            });
            originalDataRef.current = JSON.stringify({ title: script.title, content: script.content, channelId: script.channelId });

            if (editor) {
                editor.commands.setContent(script.content);
            }

            const fbs = await getScriptFeedbacks(script.id);
            setFeedbacks(fbs);
        } else {
            setEditorData({
                title: "",
                content: "",
                channelId: channels.length > 0 ? channels[0].id : "",
                status: "draft"
            });
            setFeedbacks([]);
            originalDataRef.current = JSON.stringify({ title: "", content: "", channelId: channels.length > 0 ? channels[0].id : "" });

            if (editor) {
                editor.commands.setContent("");
            }
        }
        setViewMode('editor');
    };

    const handleFeedbackClick = (highlightId?: string, textToFind?: string) => {
        if (!editor) return;

        // Fallback: Tìm theo Text (cho data cũ chưa có ID)
        if (!highlightId && textToFind) {
            let foundPos = -1;
            editor.state.doc.descendants((node, pos) => {
                if (foundPos !== -1) return false;
                if (node.isText && node.text) {
                    const isHighlighted = node.marks.find(m => m.type.name === 'highlight');
                    if (isHighlighted && node.text.includes(textToFind)) {
                        foundPos = pos + node.text.indexOf(textToFind);
                        return false;
                    }
                }
            });
            if (foundPos !== -1) {
                editor.chain().focus().setTextSelection({ from: foundPos, to: foundPos + textToFind.length }).scrollIntoView().run();
            }
            return;
        }

        if (!highlightId) return;

        let foundPos = -1;
        let foundNodeSize = 0;

        // Tìm Node có mark highlight chứa ID khớp
        editor.state.doc.descendants((node, pos) => {
            if (foundPos !== -1) return false;
            const mark = node.marks.find(m => m.type.name === 'highlight' && m.attrs.id === highlightId);
            if (mark) {
                foundPos = pos;
                foundNodeSize = node.nodeSize;
                return false;
            }
        });

        if (foundPos !== -1) {
            editor.chain()
                .focus()
                .setTextSelection({ from: foundPos, to: foundPos + foundNodeSize })
                .scrollIntoView()
                .run();
        } else {
            // Không alert lỗi để tránh khó chịu nếu highlight đã bị xóa
            console.warn("Highlight not found");
        }
    };

    const handleSave = async (targetStatus: ScriptStatus, isAutoSave = false) => {
        if (!user) return;

        let titleToSave = editorData.title.trim();

        if (!titleToSave) {
            if (isAutoSave) {
                titleToSave = "Kịch bản chưa đặt tên";
            } else {
                alert("Vui lòng nhập tiêu đề kịch bản");
                return;
            }
        }

        if (!user.teamId && !isAutoSave) {
            alert("Bạn cần tham gia một Team để gửi kịch bản.");
            return;
        }

        setIsSaving(true);
        const selectedChannel = channels.find(c => c.id === editorData.channelId);

        const contentToSave = editor ? editor.getHTML() : editorData.content;

        const result = await saveScript({
            id: editorData.id,
            userId: user.id,
            userName: user.name,
            teamId: user.teamId,
            title: titleToSave,
            content: contentToSave,
            channelId: editorData.channelId,
            channelDisplayName: selectedChannel?.displayName || "",
            channelUsername: selectedChannel?.username || "",
            status: targetStatus
        });

        setIsSaving(false);

        if (result.success) {
            const updatedScripts = await getScripts(user.id);
            setScripts(updatedScripts);
            setViewMode('list');
        } else {
            if (!isAutoSave) alert(result.error);
        }
    };

    const handleBack = async () => {
        // Lấy content từ editor nếu có
        const currentHTML = editor ? editor.getHTML() : editorData.content;
        const plainText = editor ? editor.getText().trim() : "";

        const hasContent = plainText.length > 0;
        const hasTitle = editorData.title.trim().length > 0;

        if (!hasTitle && !hasContent) {
            setViewMode('list');
            return;
        }

        const currentString = JSON.stringify({
            title: editorData.title,
            content: currentHTML,
            channelId: editorData.channelId
        });
        const isDirty = currentString !== originalDataRef.current;

        if (isDirty) {
            setEditorData(prev => ({ ...prev, content: currentHTML }));
        }

        if (isDirty && editorData.status !== 'approved') {
            await handleSave(editorData.status, true);
        } else {
            setViewMode('list');
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, script: Script) => {
        e.stopPropagation();
        setConfirmConfig({
            isOpen: true,
            title: "Xóa kịch bản",
            message: (
                <span>
                    Bạn có chắc chắn muốn xóa kịch bản <b>{script.title}</b> không?<br />
                    Hành động này không thể hoàn tác.
                </span>
            ),
            onConfirm: async () => {
                const res = await deleteScript(script.id);
                if (res.success) {
                    setScripts(prev => prev.filter(s => s.id !== script.id));
                } else {
                    alert(res.error || "Có lỗi xảy ra");
                }
            }
        });
    };

    const handleResolveFeedback = async (e: React.MouseEvent, feedback: Feedback) => {
        e.stopPropagation();

        if (feedback.status === 'addressed') return;
        if (!editor) return;
        setIsSaving(true);

        // --- [LOGIC MỚI]: Thay màu vàng bằng trong suốt (giữ lại ID) ---
        if (feedback.highlightId) {
            let foundPos = -1;
            let foundNodeSize = 0;

            editor.state.doc.descendants((node, pos) => {
                if (foundPos !== -1) return false;
                const mark = node.marks.find(m => m.type.name === 'highlight' && m.attrs.id === feedback.highlightId);
                if (mark) {
                    foundPos = pos;
                    foundNodeSize = node.nodeSize;
                    return false;
                }
            });

            if (foundPos !== -1) {
                editor.chain()
                    .focus()
                    .setTextSelection({ from: foundPos, to: foundPos + foundNodeSize })
                    // [THAY ĐỔI QUAN TRỌNG]: Không dùng unset, mà set màu thành 'transparent'
                    // Điều này giúp giữ lại thẻ mark và ID trong HTML
                    .setCustomHighlight({ color: 'transparent', id: feedback.highlightId })
                    .run();
            }
        }

        // Lấy nội dung mới (Lúc này thẻ mark vẫn còn, nhưng style="background-color: transparent")
        const updatedContent = editor.getHTML();

        // Optimistic Update
        setFeedbacks(prev => prev.map(fb => fb.id === feedback.id ? { ...fb, status: 'addressed' } : fb));

        // Gửi lên Server
        const res = await updateFeedbackStatus({
            feedbackId: feedback.id,
            status: 'addressed',
            scriptId: editorData.id,
            newScriptContent: updatedContent
        });

        if (res.success) {
            setEditorData(prev => ({ ...prev, content: updatedContent }));
            originalDataRef.current = JSON.stringify({
                title: editorData.title,
                content: updatedContent,
                channelId: editorData.channelId
            });
        } else {
            alert("Lỗi kết nối. Vui lòng thử lại.");
            editor.chain().undo().run();
            setFeedbacks(prev => prev.map(fb => fb.id === feedback.id ? { ...fb, status: 'unaddressed' } : fb));
        }

        setIsSaving(false);
    };

    if (authLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
            <Sidebar />

            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-16 flex items-center justify-between border-b border-zinc-200 px-6 bg-white dark:bg-black dark:border-zinc-800 shrink-0 gap-4">

                    {/* --- LEFT SECTION: Back + Title + Channel --- */}
                    <div className="flex items-center gap-3 flex-1 overflow-hidden">
                        {/* 1. Back Button */}
                        {viewMode === 'editor' ? (
                            <button
                                onClick={handleBack}
                                className="p-2 -ml-2 hover:bg-zinc-100 rounded-full dark:hover:bg-zinc-800 transition-colors shrink-0"
                                title="Quay lại"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <ScrollText className="h-5 w-5" />
                                <h1 className="text-lg font-bold">Kịch bản của tôi</h1>
                            </div>
                        )}

                        {/* 2. Inputs (Chỉ hiện ở Editor Mode) */}
                        {viewMode === 'editor' && (
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                {/* Title Input - Hiển thị viền khi hover */}
                                <div className="relative group flex-1 max-w-md">
                                    <input
                                        type="text"
                                        value={editorData.title}
                                        onChange={(e) => setEditorData({ ...editorData, title: e.target.value })}
                                        placeholder="Nhập tên kịch bản..."
                                        className="w-full bg-transparent text-lg font-bold outline-none text-zinc-900 dark:text-zinc-100 
                                                 border border-transparent hover:border-zinc-300 focus:border-zinc-400 focus:bg-zinc-50 dark:focus:bg-zinc-900
                                                 rounded-md px-2 py-1 transition-all placeholder:font-normal placeholder:text-zinc-400"
                                        disabled={editorData.status === 'approved'}
                                    />
                                </div>

                                {/* Divider */}
                                <div className="h-6 w-px bg-zinc-300 dark:bg-zinc-700 hidden sm:block"></div>

                                {/* Channel Select - Chữ to hơn, đặt ngang hàng */}
                                <div className="flex items-center gap-2 group relative">
                                    <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-md">
                                        <Tv className="h-4 w-4 text-zinc-500" />
                                    </div>
                                    <div className="relative">
                                        <select
                                            value={editorData.channelId}
                                            onChange={(e) => setEditorData({ ...editorData, channelId: e.target.value })}
                                            className="appearance-none bg-transparent pr-8 py-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300 
                                                     outline-none cursor-pointer hover:text-black dark:hover:text-white transition-colors"
                                            disabled={editorData.status === 'approved'}
                                        >
                                            {channels.length > 0 ? (
                                                channels.map(c => (
                                                    <option key={c.id} value={c.id}>{c.displayName}</option>
                                                ))
                                            ) : (
                                                <option value="">Chưa có kênh</option>
                                            )}
                                        </select>
                                        <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* --- RIGHT SECTION: Action Buttons --- */}
                    <div className="flex items-center gap-2 shrink-0">
                        {viewMode === 'list' && (
                            <div className="flex items-center gap-3">

                                <button onClick={() => handleOpenEditor()} disabled={!user?.teamId} className="flex items-center gap-2 bg-black text-white px-4 py-1.5 text-sm font-bold rounded-full hover:bg-zinc-800 transition-colors disabled:opacity-50 dark:bg-white dark:text-black">
                                    <Plus className="h-4 w-4" /> Tạo Kịch Bản
                                </button>
                            </div>
                        )}

                        {viewMode === 'editor' && (
                            <>
                                <button
                                    onClick={() => setIsMobileFeedbackOpen(true)}
                                    className="lg:hidden p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 relative"
                                >
                                    <MessageSquare className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
                                    {feedbacks.length > 0 && <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>}
                                </button>

                                {editorData.status !== 'approved' && (
                                    <button onClick={() => handleSave('draft', false)} disabled={isSaving} className="flex items-center gap-2 px-3 md:px-4 py-1.5 text-sm font-bold rounded-full border border-zinc-200 hover:bg-zinc-100 transition-colors dark:border-zinc-700 dark:hover:bg-zinc-800">
                                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        <span className="hidden sm:inline">Lưu Nháp</span>
                                    </button>
                                )}
                                <button onClick={() => handleSave('pending', false)} disabled={isSaving || !user?.teamId} className="flex items-center gap-2 bg-black text-white px-3 md:px-4 py-1.5 text-sm font-bold rounded-full hover:bg-zinc-800 transition-colors disabled:opacity-50 dark:bg-white dark:text-black">
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    <span className="hidden sm:inline">{editorData.status === 'approved' ? 'Cập nhật' : 'Gửi Duyệt'}</span>
                                </button>
                            </>
                        )}
                    </div>
                </header>
                <div className="flex-1 overflow-hidden p-4 md:p-6 bg-zinc-50 dark:bg-zinc-950 flex flex-col">

                    {viewMode === 'list' && (
                        <div className="flex flex-col h-full">
                            <div className="pb-4 flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center shrink-0">
                                <div className="relative w-full lg:w-96 group">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Tìm kiếm kịch bản..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm rounded-lg pl-9 pr-4 py-2 focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 focus:outline-none focus:border-zinc-400 transition-all shadow-sm"
                                    />
                                </div>
                                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
                                    <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
                                        <button onClick={() => handleLayoutChange('grid')} className={cn("p-1.5 rounded-md transition-all", layoutMode === 'grid' ? "bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300")}><LayoutGrid className="h-4 w-4" /></button>
                                        <button onClick={() => handleLayoutChange('list')} className={cn("p-1.5 rounded-md transition-all", layoutMode === 'list' ? "bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300")}><List className="h-4 w-4" /></button>
                                    </div>

                                    <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm self-start lg:self-auto">
                                        <ArrowUpDown className="h-4 w-4 text-zinc-500" />
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                                            className="bg-transparent text-sm font-medium outline-none cursor-pointer text-zinc-700 dark:text-zinc-300"
                                        >
                                            <option value="updated_desc">Lần cập nhật gần nhất</option>
                                            <option value="created_desc">Lần tạo gần nhất</option>
                                            <option value="title_asc">Tên (A-Z)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {isLoading ? (
                                    <div className="flex justify-center pt-20"><Loader2 className="animate-spin h-8 w-8 text-zinc-400" /></div>
                                ) : processedScripts.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center pt-20 text-zinc-400">
                                        <ScrollText className="h-12 w-12 mb-2 opacity-50" />
                                        <p>{searchQuery ? "Không tìm thấy kịch bản nào." : "Bạn chưa có kịch bản nào."}</p>
                                    </div>
                                ) : (
                                    <>
                                        {layoutMode === 'grid' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
                                                {processedScripts.map((script) => {
                                                    const StatusIcon = statusConfig[script.status].icon;
                                                    const displayDate = script.updatedAt ? new Date(script.updatedAt) : new Date(script.createdAt);
                                                    const dateLabel = script.updatedAt ? "Cập nhật:" : "Tạo:";

                                                    return (
                                                        <div
                                                            key={script.id}
                                                            onClick={() => handleOpenEditor(script)}
                                                            className="group relative cursor-pointer bg-white dark:bg-black rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 hover:shadow-md transition-all hover:border-black dark:hover:border-zinc-600"
                                                        >
                                                            <button
                                                                onClick={(e) => handleDeleteClick(e, script)}
                                                                className="absolute top-3 right-3 p-1.5 rounded-full text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 dark:hover:bg-red-900/30"
                                                                title="Xóa kịch bản"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>

                                                            {script.isFeedbacked && (
                                                                <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 animate-pulse ring-2 ring-white dark:ring-black" title="Có phản hồi mới từ Manager" />
                                                            )}

                                                            <div className="flex justify-between items-start mb-3 pr-6">
                                                                <span className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide", statusConfig[script.status].color)}>
                                                                    <StatusIcon className="h-3 w-3" />
                                                                    {statusConfig[script.status].label}
                                                                </span>
                                                            </div>

                                                            <h3 className="font-bold text-lg line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
                                                                {script.title}
                                                            </h3>

                                                            <div className="flex items-center justify-between text-xs text-zinc-500 mt-4">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                                                                        @{script.channelUsername}
                                                                    </span>
                                                                </div>

                                                                {/* [CẬP NHẬT]: Hiển thị ngày tháng */}
                                                                <span className="flex items-center gap-1" title={`${dateLabel} ${displayDate.toLocaleString('vi-VN')}`}>
                                                                    <Calendar className="h-3 w-3" />
                                                                    {displayDate.toLocaleDateString('vi-VN')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}

                                        {layoutMode === 'list' && (
                                            <div className="bg-white dark:bg-black rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm mb-10">
                                                <div className="overflow-x-auto custom-scrollbar">
                                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                                        <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                                                            <tr>
                                                                <th className="px-6 py-4 font-semibold text-zinc-500">Tiêu đề</th>
                                                                <th className="px-6 py-4 font-semibold text-zinc-500">Kênh</th>
                                                                <th className="px-6 py-4 font-semibold text-zinc-500">Trạng thái</th>
                                                                <th className="px-6 py-4 font-semibold text-zinc-500">
                                                                    {sortBy.includes('updated') ? 'Cập nhật' : 'Ngày tạo'}
                                                                </th>
                                                                <th className="px-6 py-4 font-semibold text-zinc-500 text-right">Hành động</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                                            {processedScripts.map((script) => {
                                                                const StatusIcon = statusConfig[script.status].icon;
                                                                const displayDate = sortBy.includes('updated')
                                                                    ? (script.updatedAt ? new Date(script.updatedAt) : new Date(script.createdAt))
                                                                    : new Date(script.createdAt);

                                                                return (
                                                                    <tr
                                                                        key={script.id}
                                                                        onClick={() => handleOpenEditor(script)}
                                                                        className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer transition-colors group"
                                                                    >
                                                                        <td className="px-6 py-4">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="font-medium group-hover:text-blue-600 transition-colors">
                                                                                    {script.title}
                                                                                </span>
                                                                                {script.isFeedbacked && (
                                                                                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" title="Có phản hồi mới" />
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-6 py-4 text-zinc-500">
                                                                            @{script.channelUsername}
                                                                        </td>
                                                                        <td className="px-6 py-4">
                                                                            <span className={cn("flex w-fit items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide", statusConfig[script.status].color)}>
                                                                                <StatusIcon className="h-3 w-3" />
                                                                                {statusConfig[script.status].label}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-6 py-4 text-zinc-500 text-xs">
                                                                            {displayDate.toLocaleString('vi-VN', {
                                                                                hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
                                                                            })}
                                                                        </td>
                                                                        <td className="px-6 py-4 text-right">
                                                                            <button
                                                                                onClick={(e) => handleDeleteClick(e, script)}
                                                                                className="p-2 rounded-full text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-colors dark:hover:bg-red-900/30"
                                                                                title="Xóa kịch bản"
                                                                            >
                                                                                <Trash2 className="h-4 w-4" />
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                )
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {viewMode === 'editor' && (
                        // Layout 2 cột (Editor & Feedback)
                        <div className="h-full flex flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 relative">

                            {/* 1. MAIN EDITOR AREA (Cuộn riêng) */}
                            <div className="flex-1 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden relative flex flex-col">
                                {editor && (
                                    <>
                                        <FullMenuBar editor={editor} />

                                        {/* [CẬP NHẬT]: Thêm cursor-text và sự kiện onClick để focus editor */}
                                        <div
                                            className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar cursor-text"
                                            onClick={() => editor.chain().focus().run()}
                                        >
                                            <EditorContent
                                                editor={editor}
                                                className={cn(
                                                    "prose dark:prose-invert max-w-none w-full h-full focus:outline-none",
                                                    // [CẬP NHẬT]: CSS này giúp vùng nhập liệu (ProseMirror) luôn full chiều cao
                                                    "[&>.ProseMirror]:min-h-full [&>.ProseMirror]:outline-none"
                                                )}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* 2. FEEDBACK SIDEBAR (Luôn hiển thị) */}
                            {isMobileFeedbackOpen && (
                                <div
                                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                                    onClick={() => setIsMobileFeedbackOpen(false)}
                                />
                            )}

                            <div className={cn(
                                "fixed inset-y-0 right-0 z-50 w-80 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl transform transition-transform duration-300 ease-in-out lg:static lg:transform-none lg:shadow-none lg:rounded-xl lg:border lg:flex lg:flex-col lg:h-full lg:shrink-0",
                                isMobileFeedbackOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
                            )}>
                                {/* Nút đóng sidebar trên Mobile */}
                                <div className="lg:hidden absolute top-4 right-4 z-10">
                                    <button onClick={() => setIsMobileFeedbackOpen(false)} className="p-1 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500">
                                        <PanelRightClose className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 shrink-0 flex justify-between items-center">
                                    <h3 className="font-bold text-sm uppercase text-zinc-500 flex items-center gap-2">
                                        <MessageSquare className="h-4 w-4" /> Feedbacks ({feedbacks.length})
                                    </h3>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar h-full">
                                    {feedbacks.length === 0 ? (
                                        <div className="text-zinc-400 text-xs italic text-center mt-10">Chưa có nhận xét nào.</div>
                                    ) : (
                                        feedbacks.map(fb => {
                                            const isResolved = fb.status === 'addressed';
                                            return (
                                                <div
                                                    key={fb.id}
                                                    onClick={() => handleFeedbackClick(fb.highlightId, fb.markedText)}
                                                    className={cn(
                                                        "relative rounded-lg p-3 text-sm shadow-sm cursor-pointer transition-all group pr-12 border",
                                                        isResolved
                                                            ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800 opacity-80 hover:opacity-100"
                                                            : "bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800 hover:border-yellow-400"
                                                    )}
                                                >
                                                    <button
                                                        onClick={(e) => handleResolveFeedback(e, fb)}
                                                        disabled={isResolved || isSaving}
                                                        className={cn(
                                                            "absolute top-2 right-2 p-1 rounded-full transition-all z-10 border",
                                                            isResolved
                                                                ? "bg-green-500 text-white border-green-600 opacity-100 cursor-default"
                                                                : "bg-white text-zinc-300 border-zinc-200 hover:border-green-500 hover:text-green-500 opacity-0 group-hover:opacity-100 dark:bg-black dark:border-zinc-700 cursor-pointer"
                                                        )}
                                                        title={isResolved ? "Đã xử lý xong" : "Đánh dấu đã xử lý"}
                                                    >
                                                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                                                    </button>

                                                    <div className="mb-2">
                                                        <span className={cn(
                                                            "px-1.5 py-0.5 rounded text-[10px] font-mono break-all line-clamp-2 border",
                                                            isResolved
                                                                ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                                                                : "bg-yellow-200 text-yellow-800 border-yellow-300 dark:bg-yellow-800 dark:text-yellow-200 dark:border-yellow-700"
                                                        )}>
                                                            &quot;{fb.markedText}&quot;
                                                        </span>
                                                    </div>

                                                    <p className={cn(
                                                        "whitespace-pre-wrap transition-colors",
                                                        isResolved
                                                            ? "text-zinc-400 dark:text-zinc-500 line-through decoration-zinc-400"
                                                            : "text-zinc-800 dark:text-zinc-200"
                                                    )}>
                                                        {fb.content}
                                                    </p>

                                                    <div className={cn(
                                                        "mt-2 text-[10px] flex justify-between pt-2 border-t",
                                                        isResolved
                                                            ? "text-green-600/70 border-green-200 dark:border-green-800/30"
                                                            : "text-zinc-400 border-yellow-200 dark:border-yellow-800/30"
                                                    )}>
                                                        <span>{fb.managerName}</span>
                                                        <span>{new Date(fb.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <ConfirmModal
                isOpen={confirmConfig.isOpen}
                onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmConfig.onConfirm}
                title={confirmConfig.title}
                message={confirmConfig.message}
                variant="danger"
                confirmText="Xóa Kịch Bản"
            />
        </div>
    );
}