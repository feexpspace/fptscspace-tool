/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/scripts-manager/page.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { Script, Feedback, ScriptStatus } from "@/types";
import {
    getManagerScripts,
    markScriptAsRead,
    updateScriptStatus,
    createFeedback,
    getScriptFeedbacks, // Hàm này lấy từ file script.ts cũ (cần đảm bảo đã export)
    deleteFeedback,
    saveScript
} from "@/app/actions/script";
import {
    Loader2, Search, Filter, MessageSquarePlus,
    CheckCircle, XCircle, Clock, AlertCircle, ChevronLeft,
    FileEdit,
    Trash2,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    Unlink,
    LinkIcon,
    Undo,
    Redo,
    Highlighter,
    Strikethrough,
    Italic,
    Bold,
    Type,
    PlusIcon,
    Heading2,
    ListIcon,
    ListOrdered,
    Quote,
    Check,
    PanelRightClose,
    MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

import { useEditor, EditorContent, Extension } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import LinkExtension from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import BubbleMenuExtension from '@tiptap/extension-bubble-menu';
import { CustomHighlight } from "@/components/extensions/CustomHighlight";
import { ConfirmModal } from "@/components/ConfirmModal";

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

const FullMenuBar = ({ editor }: { editor: any }) => {
    const [isColorOpen, setIsColorOpen] = useState(false);
    if (!editor) return null;
    const fontSizes = ["12px", "14px", "16px", "18px", "20px", "24px", "30px"];
    const setLink = () => {
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL:', previousUrl);
        if (url === null) return;
        if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    return (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900 rounded-t-lg">
            <div className="flex items-center gap-1 pr-2 border-r border-zinc-300 dark:border-zinc-700">
                <button onClick={() => editor.chain().focus().toggleBold().run()} className={cn("rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800", editor.isActive("bold") && "bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white")}><Bold className="h-4 w-4" /></button>
                <button onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800", editor.isActive("italic") && "bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white")}><Italic className="h-4 w-4" /></button>
                <button onClick={() => editor.chain().focus().toggleStrike().run()} className={cn("rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800", editor.isActive("strike") && "bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white")}><Strikethrough className="h-4 w-4" /></button>
                <button onClick={() => editor.chain().focus().toggleCustomHighlight().run()} className={cn("rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800", editor.isActive("highlight") && "bg-yellow-200 text-black")}><Highlighter className="h-4 w-4" /></button>
            </div>
            <div className="flex items-center gap-2 px-2 border-r border-zinc-300 dark:border-zinc-700">
                <div className="flex items-center gap-1">
                    <Type className="h-4 w-4 text-zinc-400" />
                    <select onChange={(e) => { const size = e.target.value; if (size) editor.commands.setFontSize(size); else editor.commands.unsetFontSize(); }} value={editor.getAttributes('textStyle').fontSize || ""} className="h-7 w-20 text-xs rounded border border-zinc-300 bg-white px-1 outline-none dark:border-zinc-700 dark:bg-black"><option value="">Auto</option>{fontSizes.map(size => <option key={size} value={size}>{size}</option>)}</select>
                </div>
                <div className="relative">
                    <button onClick={() => setIsColorOpen(!isColorOpen)} className="flex items-center justify-center px-1.5 pt-1.5 pb-0.5 rounded-t-sm hover:bg-zinc-200 dark:hover:bg-zinc-800 border-b-[3px]" style={{ borderBottomColor: editor.getAttributes('textStyle').color || '#000000', borderBottomWidth: '5px' }}><div className="text-md leading-none text-zinc-700 dark:text-zinc-300">A</div></button>
                    {isColorOpen && (
                        <>
                            <div className="fixed inset-0 z-20" onClick={() => setIsColorOpen(false)} />
                            <div className="absolute top-full left-0 mt-2 z-30 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl p-3 w-[260px] animate-in zoom-in-95 origin-top-left">
                                <div className="grid grid-cols-10 gap-1.5 mb-3">{COLOR_PALETTE.map((color) => (<button key={color} onClick={() => { editor.chain().focus().setColor(color).run(); setIsColorOpen(false); }} className={cn("w-5 h-5 rounded-full border border-zinc-100 dark:border-zinc-800 hover:scale-110", editor.isActive('textStyle', { color }) && "ring-2")} style={{ backgroundColor: color }}></button>))}</div>
                                <div className="border-t pt-2 flex flex-col gap-2"><div className="text-[10px] font-bold text-zinc-400">TÙY CHỈNH</div><div className="flex items-center gap-2"><label className="flex items-center gap-2 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 p-1.5 rounded-md flex-1"><div className="w-5 h-5 rounded-full border bg-gradient-to-br from-red-500 via-green-500 to-blue-500"><PlusIcon className="h-3 w-3 text-white" /></div><span className="text-xs">Thêm màu</span><input type="color" className="absolute inset-0 opacity-0" onInput={(e) => { const val = (e.target as HTMLInputElement).value; editor.chain().focus().setColor(val).run(); setIsColorOpen(false); }} /></label><button onClick={() => { editor.chain().focus().unsetColor().run(); setIsColorOpen(false); }} className="p-1.5 text-xs text-zinc-500 hover:text-red-500">Mặc định</button></div></div>
                            </div>
                        </>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-1 px-2 border-r border-zinc-300 dark:border-zinc-700">
                <button onClick={setLink} className={cn("rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800", editor.isActive("link") && "bg-zinc-200 text-blue-600")}><LinkIcon className="h-4 w-4" /></button>
                {editor.isActive("link") && <button onClick={() => editor.chain().focus().unsetLink().run()} className="rounded p-1.5 hover:bg-zinc-200"><Unlink className="h-4 w-4" /></button>}
            </div>
            <div className="flex items-center gap-1 px-2 border-r border-zinc-300 dark:border-zinc-700">
                <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={cn("rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800", editor.isActive({ textAlign: 'left' }) && "bg-zinc-200 text-black")}><AlignLeft className="h-4 w-4" /></button>
                <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={cn("rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800", editor.isActive({ textAlign: 'center' }) && "bg-zinc-200 text-black")}><AlignCenter className="h-4 w-4" /></button>
                <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={cn("rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800", editor.isActive({ textAlign: 'right' }) && "bg-zinc-200 text-black")}><AlignRight className="h-4 w-4" /></button>
                <button onClick={() => editor.chain().focus().setTextAlign('justify').run()} className={cn("rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800", editor.isActive({ textAlign: 'justify' }) && "bg-zinc-200 text-black")}><AlignJustify className="h-4 w-4" /></button>
            </div>
            <div className="flex items-center gap-1 px-2 border-zinc-300 dark:border-zinc-700">
                <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={cn("rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800", editor.isActive("bulletList") ? "bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white" : "text-zinc-500")} title="Bullet List"><ListIcon className="h-4 w-4" /></button>
                <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={cn("rounded p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800", editor.isActive("orderedList") ? "bg-zinc-200 text-black dark:bg-zinc-800 dark:text-white" : "text-zinc-500")} title="Ordered List"><ListOrdered className="h-4 w-4" /></button>
            </div>
            <div className="ml-auto flex items-center gap-1 pl-2 border-l border-zinc-300 dark:border-zinc-700">
                <button onClick={() => editor.chain().focus().undo().run()} className="rounded p-1.5 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"><Undo className="h-4 w-4" /></button>
                <button onClick={() => editor.chain().focus().redo().run()} className="rounded p-1.5 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"><Redo className="h-4 w-4" /></button>
            </div>
        </div>
    );
};
export default function ScriptsManagerPage() {
    const { user, isManager, isAdmin, loading } = useAuth();
    const router = useRouter();

    // Data State
    const [scripts, setScripts] = useState<Script[]>([]);
    const [selectedScript, setSelectedScript] = useState<Script | null>(null);
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);

    // UI State
    const [filterMode, setFilterMode] = useState<'all' | 'unread' | 'read'>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    const [isAutoSaving, setIsAutoSaving] = useState(false);
    const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // [RESPONSIVE STATE]
    const [isFeedbackSidebarOpen, setIsFeedbackSidebarOpen] = useState(false);

    // Feedback Input State (Trong Bubble Menu)
    const [feedbackText, setFeedbackText] = useState("");
    const [isFeedbackInputOpen, setIsFeedbackInputOpen] = useState(false);
    const [isSuggestMode, setIsSuggestMode] = useState(false);
    const [originalTextForEdit, setOriginalTextForEdit] = useState("");

    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: React.ReactNode;
        variant?: 'danger' | 'info' | 'warning';
        confirmText?: string;
        onConfirm: () => Promise<void>;
    }>({
        isOpen: false,
        title: "",
        message: null,
        onConfirm: async () => { },
    });

    const showAlert = (title: string, message: string, variant: 'info' | 'danger' = 'info') => {
        setConfirmConfig({
            isOpen: true,
            title,
            message,
            variant,
            confirmText: "Đóng",
            onConfirm: async () => setConfirmConfig(prev => ({ ...prev, isOpen: false }))
        });
    };

    // --- CHECK QUYỀN ---
    useEffect(() => {
        if (!loading) {
            if (!user) router.push("/auth/login");
            else if (!isManager && !isAdmin) router.push("/scripts"); // Redirect member ra ngoài
        }
    }, [user, isManager, isAdmin, loading, router]);

    // --- FETCH DATA ---
    const fetchScripts = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const data = await getManagerScripts(user.id);
            setScripts(data);
        } catch (error) {
            console.error("Lỗi lấy scripts:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (isManager || isAdmin) fetchScripts();
    }, [isManager, isAdmin, fetchScripts]);

    // --- LOGIC EDITOR (TIPTAP) ---
    const editor = useEditor({
        extensions: [
            StarterKit,
            TextStyle,
            Color,
            FontSize, // Nhớ copy extension này sang
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            LinkExtension.configure({ openOnClick: false, autolink: true }),
            CustomHighlight.configure({ multicolor: true }),
            Placeholder.configure({ placeholder: 'Nội dung kịch bản...' }),
            BubbleMenuExtension.configure({ pluginKey: 'bubbleMenuForFeedback' }),
        ],
        editable: true,
        content: '',
        onUpdate: ({ editor }) => {
            // [LOGIC AUTO SAVE DEBOUNCE]
            if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);

            autoSaveTimeoutRef.current = setTimeout(() => {
                performAutoSave(editor.getHTML());
            }, 2000); // Lưu sau 2s ngừng gõ
        },
        immediatelyRender: false,
    });

    useEffect(() => {
        if (editor && selectedScript) {
            // Ngăn auto save chạy ngay khi mới load content
            if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);

            editor.commands.setContent(selectedScript.content);
            getScriptFeedbacks(selectedScript.id).then(setFeedbacks);
        }
    }, [selectedScript, editor]);

    // --- HANDLERS ---

    const performAutoSave = async (content: string) => {
        if (!selectedScript || !user) return;
        setIsAutoSaving(true);

        await saveScript({
            id: selectedScript.id,
            userId: selectedScript.userId,
            userName: selectedScript.userName,
            teamId: selectedScript.teamId,
            title: selectedScript.title,
            content: content,
            channelId: selectedScript.channelId,
            channelDisplayName: selectedScript.channelDisplayName,
            channelUsername: selectedScript.channelUsername,
            status: selectedScript.status,
            managerId: user.id, // Truyền managerId để server biết ai sửa
            managerName: user.name
        });

        setIsAutoSaving(false);
    };

    const handleSelectScript = async (script: Script) => {
        setSelectedScript(script);
        setIsFeedbackSidebarOpen(false); // Đóng sidebar mobile

        // [CẬP NHẬT]: Check xem user hiện tại đã đọc chưa (trong mảng readBy)
        const isRead = script.readBy && script.readBy.includes(user!.id);

        if (!isRead) {
            // Gọi API đánh dấu đã đọc (Server sẽ push user.id vào mảng readBy)
            await markScriptAsRead(script.id, user!.id);

            // Cập nhật UI ngay lập tức
            setScripts(prev => prev.map(s => {
                if (s.id === script.id) {
                    // Thêm user.id vào mảng readBy nếu chưa có
                    const newReadBy = s.readBy ? [...s.readBy] : [];
                    if (!newReadBy.includes(user!.id)) newReadBy.push(user!.id);
                    return { ...s, readBy: newReadBy };
                }
                return s;
            }));
        }
    };

    const handleStartSuggestEdit = () => {
        if (!editor) return;
        const { from, to, empty } = editor.state.selection;
        if (empty) return;

        const text = editor.state.doc.textBetween(from, to, ' ');
        setOriginalTextForEdit(text);
        setFeedbackText(text);
        setIsSuggestMode(true);     // Bật cờ mode sửa
        setIsFeedbackInputOpen(true); // Mở popup
    };

    const handleStatusChange = async (status: ScriptStatus) => {
        if (!selectedScript) return;
        setIsProcessing(true);

        const res = await updateScriptStatus(selectedScript.id, status);
        if (res.success) {
            setSelectedScript({ ...selectedScript, status });
            setScripts(prev => prev.map(s => s.id === selectedScript.id ? { ...s, status } : s));
        } else {
            alert("Lỗi cập nhật trạng thái");
        }
        setIsProcessing(false);
    };

    const handleSubmitFeedback = async () => {
        if (!selectedScript || !user || !editor) return;

        setIsProcessing(true);
        const highlightId = crypto.randomUUID();
        let finalContent = "";
        let finalMarkedText = "";

        // --- TRƯỜNG HỢP 1: SỬA VĂN BẢN (Suggest Edit) ---
        if (isSuggestMode) {
            // 1. Thay thế text cũ bằng text mới manager vừa nhập
            editor.chain().focus().insertContent(feedbackText).run();

            // 2. Chọn lại đoạn text vừa chèn để highlight
            // (Logic chọn lại hơi phức tạp, ta dùng command set selection dựa trên độ dài text mới)
            const { from } = editor.state.selection;
            const newTextLength = feedbackText.length;

            // Lùi lại vị trí để bôi đen text mới
            editor.chain().setTextSelection({ from: from - newTextLength, to: from }).run();

            // 3. Highlight text mới
            editor.chain().focus().toggleCustomHighlight({ color: '#fef08a', id: highlightId }).run();

            // 4. Tạo nội dung feedback tự động
            finalContent = `Đã thay đổi nội dung từ:\n"${originalTextForEdit}"\n\nThành:\n"${feedbackText}"`;
            finalMarkedText = feedbackText; // Text được highlight là text mới
        }

        // --- TRƯỜNG HỢP 2: COMMENT BÌNH THƯỜNG ---
        else {
            const { from, to, empty } = editor.state.selection;
            if (empty) { setIsProcessing(false); return; }

            finalMarkedText = editor.state.doc.textBetween(from, to, ' ');
            finalContent = feedbackText;

            editor.chain().focus().toggleCustomHighlight({ color: '#fef08a', id: highlightId }).run();
        }

        // Lấy HTML mới
        const updatedHtml = editor.getHTML();

        // Gửi lên Server
        const res = await createFeedback({
            scriptId: selectedScript.id,
            content: finalContent,
            markedText: finalMarkedText,
            highlightId: highlightId,
            managerId: user.id,
            managerName: user.name,
            userId: selectedScript.userId,
            userName: selectedScript.userName,
            scriptContent: updatedHtml
        });

        if (res.success) {
            // Update UI
            const newFb: Feedback = {
                id: Math.random().toString(),
                markedText: finalMarkedText,
                content: finalContent,
                createdAt: new Date(),
                scriptId: selectedScript.id,
                managerId: user.id,
                managerName: user.name,
                userId: selectedScript.userId,
                userName: selectedScript.userName,
                status: 'unaddressed',
                highlightId: highlightId
            };
            setFeedbacks(prev => [newFb, ...prev]);

            // Reset
            setFeedbackText("");
            setIsFeedbackInputOpen(false);
            setIsSuggestMode(false); // Tắt mode sửa
            setOriginalTextForEdit("");
            setSelectedScript(prev => prev ? { ...prev, content: updatedHtml } : null);
        } else {
            showAlert("Lỗi", "Không thể gửi feedback", "danger");
            editor.chain().focus().undo().run();
        }
        setIsProcessing(false);
    };

    const handleFeedbackClick = (highlightId?: string, textToFind?: string) => {
        if (!editor) return;

        if (window.innerWidth < 1024) {
            setIsFeedbackSidebarOpen(false);
        }

        // Fallback: Tìm theo Text
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

        // Tìm theo ID
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
            editor.chain().focus().setTextSelection({ from: foundPos, to: foundPos + foundNodeSize }).scrollIntoView().run();
        } else {
            showAlert("Thông báo", "Không tìm thấy đoạn highlight này (có thể đã bị xóa).", "info");
        }
    };

    const handleDeleteFeedback = async (e: React.MouseEvent, feedbackId: string, highlightId?: string) => {
        e.stopPropagation(); // Ngăn chặn sự kiện click vào feedback (để không bị scroll)

        setConfirmConfig({
            isOpen: true,
            title: "Xóa nhận xét",
            message: "Bạn có chắc chắn muốn xóa nhận xét này không? Highlight trong bài viết sẽ được gỡ bỏ.",
            variant: "danger",
            confirmText: "Xóa",
            onConfirm: async () => {
                if (!editor || !selectedScript) return;
                setIsProcessing(true);

                if (highlightId) {
                    let foundPos = -1;
                    let foundNodeSize = 0;
                    editor.state.doc.descendants((node, pos) => {
                        if (foundPos !== -1) return false;
                        const mark = node.marks.find(m => m.type.name === 'highlight' && m.attrs.id === highlightId);
                        if (mark) { foundPos = pos; foundNodeSize = node.nodeSize; return false; }
                    });

                    if (foundPos !== -1) {
                        editor.chain().focus().setTextSelection({ from: foundPos, to: foundPos + foundNodeSize }).unsetCustomHighlight().run();
                    }
                }

                const updatedContent = editor.getHTML();
                const res = await deleteFeedback({ feedbackId, scriptId: selectedScript.id, newScriptContent: updatedContent });

                if (res.success) {
                    setFeedbacks(prev => prev.filter(fb => fb.id !== feedbackId));
                    setSelectedScript(prev => prev ? { ...prev, content: updatedContent } : null);
                    setConfirmConfig(prev => ({ ...prev, isOpen: false })); // Đóng modal sau khi xóa thành công
                } else {
                    showAlert("Lỗi", "Không thể xóa feedback", "danger");
                    editor.chain().undo().run();
                }
                setIsProcessing(false);
            }
        });
    };

    // Lọc danh sách hiển thị
    const filteredScripts = scripts.filter(s => {
        // Safe check for readBy array
        const isRead = s.readBy && s.readBy.includes(user!.id);

        if (filterMode === 'unread') return !isRead;
        if (filterMode === 'read') return isRead;
        return true;
    });

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
            <Sidebar />

            <main className="flex-1 flex h-screen overflow-hidden relative">

                {/* --- LEFT COLUMN: LIST SCRIPTS --- */}
                {/* [Responsive]: Ẩn trên mobile nếu đã chọn script */}
                <div className={cn(
                    "w-full md:w-80 flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black transition-all shrink-0",
                    selectedScript ? "hidden md:flex" : "flex"
                )}>
                    {/* Header List */}
                    <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 space-y-3">
                        <h2 className="font-bold text-lg">Kịch bản cần duyệt</h2>
                        <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg">
                            {(['all', 'unread', 'read'] as const).map((mode) => (
                                <button key={mode} onClick={() => setFilterMode(mode)} className={cn("flex-1 text-xs font-medium py-1.5 rounded-md transition-all capitalize", filterMode === mode ? "bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700")}>
                                    {mode === 'all' ? 'Tất cả' : mode === 'unread' ? 'Chưa đọc' : 'Đã đọc'}
                                </button>
                            ))}
                        </div>
                    </div>
                    {/* List Items */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                        {isLoading ? (
                            <div className="flex justify-center p-4"><Loader2 className="animate-spin h-5 w-5 text-zinc-400" /></div>
                        ) : filteredScripts.length === 0 ? (
                            <div className="text-center text-zinc-400 text-sm p-4">Không có kịch bản nào.</div>
                        ) : (
                            filteredScripts.map(script => {
                                // [CẬP NHẬT]: Check readBy array
                                const isRead = script.readBy && script.readBy.includes(user!.id);

                                return (
                                    <button key={script.id} onClick={() => handleSelectScript(script)} className={cn("w-full text-left p-3 rounded-xl border transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900 group relative", selectedScript?.id === script.id ? "border-black dark:border-zinc-500 bg-zinc-50 dark:bg-zinc-900" : "border-transparent bg-white dark:bg-black")}>

                                        {/* [CẬP NHẬT]: Hiện nút đỏ nếu chưa đọc */}
                                        {!isRead && <span className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse ring-2 ring-white dark:ring-black" />}

                                        <div className="text-sm font-bold line-clamp-1 pr-4">{script.title}</div>
                                        <div className="flex items-center justify-between mt-2">
                                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                                                <div className="h-5 w-5 rounded-full bg-zinc-200 flex items-center justify-center font-bold text-[9px] uppercase">{script.userName.charAt(0)}</div>
                                                <span>{script.userName}</span>
                                            </div>
                                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-bold uppercase", script.status === 'pending' ? "bg-orange-100 text-orange-600" : script.status === 'approved' ? "bg-green-100 text-green-600" : script.status === 'rejected' ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500")}>{script.status}</span>
                                        </div>
                                        <div className="text-[10px] text-zinc-400 mt-1">{script.createdAt.toLocaleDateString('vi-VN')}</div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* --- RIGHT COLUMN: DETAIL & EDITOR --- */}
                {selectedScript ? (
                    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-50 dark:bg-zinc-950 relative">
                        {/* Toolbar */}
                        <div className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-4 md:px-6 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <button onClick={() => setSelectedScript(null)} className="md:hidden p-2 -ml-2 hover:bg-zinc-100 rounded-full"><ChevronLeft className="h-5 w-5" /></button>
                                <div className="min-w-0">
                                    <h1 className="font-bold text-lg line-clamp-1">{selectedScript.title}</h1>
                                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                                        <span>Kênh: {selectedScript.channelDisplayName}</span>
                                        {/* [AUTO SAVE INDICATOR] */}
                                        {isAutoSaving && <span className="flex items-center gap-1 text-zinc-400"><Loader2 className="h-3 w-3 animate-spin" /> Đang lưu...</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Nút bật tắt Feedback Sidebar trên Mobile */}
                                <button
                                    onClick={() => setIsFeedbackSidebarOpen(true)}
                                    className="lg:hidden p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 relative"
                                >
                                    <MessageSquare className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
                                    {feedbacks.length > 0 && <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>}
                                </button>

                                <button onClick={() => handleStatusChange('rejected')} disabled={isProcessing} className="p-2 rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition-colors md:px-4 md:py-1.5 md:rounded-full md:flex md:items-center md:gap-2">
                                    <XCircle className="h-5 w-5 md:h-4 md:w-4" /> <span className="hidden md:inline text-sm font-bold">Từ chối</span>
                                </button>
                                <button onClick={() => handleStatusChange('approved')} disabled={isProcessing} className="p-2 rounded-full bg-black text-white hover:bg-zinc-800 transition-colors dark:bg-white dark:text-black md:px-4 md:py-1.5 md:rounded-full md:flex md:items-center md:gap-2">
                                    {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5 md:h-4 md:w-4" />} <span className="hidden md:inline text-sm font-bold">Duyệt bài</span>
                                </button>
                            </div>
                        </div>

                        {/* Editor + Feedback Container */}
                        <div className="flex-1 overflow-hidden p-4 relative flex">
                            {/* 1. EDITOR AREA */}
                            <div className="flex-1 flex flex-col h-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden relative">
                                {editor && (
                                    <>
                                        <FullMenuBar editor={editor} />

                                        {/* [TỐI ƯU KÍCH THƯỚC]: Thêm cursor-text và css min-h-full */}
                                        <div
                                            className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar cursor-text"
                                            onClick={() => editor.chain().focus().run()}
                                        >
                                            <BubbleMenu editor={editor} shouldShow={({ from, to }) => from !== to && !isFeedbackInputOpen}>
                                                <div className="bg-black text-white dark:bg-white dark:text-black rounded-lg shadow-xl px-2 py-1 flex items-center gap-1 animate-in zoom-in-95">
                                                    <button onClick={() => { setIsSuggestMode(false); setFeedbackText(""); setIsFeedbackInputOpen(true); }} className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-bold hover:opacity-80 transition-opacity border-r border-white/20 mr-1"><MessageSquarePlus className="h-4 w-4" /> Nhận xét</button>
                                                    <button onClick={handleStartSuggestEdit} className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-bold hover:opacity-80 transition-opacity text-yellow-300 dark:text-blue-600"><FileEdit className="h-4 w-4" /> Sửa & Báo lỗi</button>
                                                </div>
                                            </BubbleMenu>
                                            <EditorContent
                                                editor={editor}
                                                className={cn(
                                                    "prose dark:prose-invert max-w-none w-full h-full focus:outline-none",
                                                    "[&>.ProseMirror]:min-h-full [&>.ProseMirror]:outline-none"
                                                )}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* 2. FEEDBACK SIDEBAR [RESPONSIVE] */}
                            {/* Overlay Mobile */}
                            {isFeedbackSidebarOpen && (
                                <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsFeedbackSidebarOpen(false)} />
                            )}

                            {/* Sidebar Content */}
                            <div className={cn(
                                "fixed inset-y-0 right-0 z-50 w-80 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl transform transition-transform duration-300 ease-in-out lg:static lg:transform-none lg:shadow-none lg:rounded-xl lg:border lg:ml-4 lg:flex lg:flex-col lg:h-full lg:shrink-0",
                                isFeedbackSidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
                            )}>
                                {/* Mobile Close Button */}
                                <div className="lg:hidden absolute top-4 right-4 z-10">
                                    <button onClick={() => setIsFeedbackSidebarOpen(false)} className="p-1 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500">
                                        <PanelRightClose className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="p-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 shrink-0 flex items-center justify-between">
                                    <h3 className="font-bold text-sm uppercase text-zinc-500">Feedbacks ({feedbacks.length})</h3>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar h-full">
                                    {feedbacks.length === 0 ? (
                                        <div className="text-zinc-400 text-xs italic text-center py-10">Chưa có nhận xét nào.</div>
                                    ) : (
                                        feedbacks.map(fb => {
                                            const isResolved = fb.status === 'addressed';
                                            return (
                                                <div key={fb.id} onClick={() => handleFeedbackClick(fb.highlightId, fb.markedText)} className={cn("relative rounded-lg p-3 text-sm shadow-sm cursor-pointer transition-all group pr-12 border", isResolved ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800 opacity-80" : "bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800 hover:border-yellow-400")}>
                                                    <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                                                        {isResolved ? (
                                                            <div className="p-1.5 rounded-full bg-green-500 text-white border border-green-600 shadow-sm cursor-default"><Check className="h-3 w-3" strokeWidth={3} /></div>
                                                        ) : (
                                                            <button onClick={(e) => handleDeleteFeedback(e, fb.id, fb.highlightId)} className="p-1.5 rounded-full text-zinc-400 hover:bg-red-100 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 bg-white/50 dark:bg-black/50 backdrop-blur-sm" disabled={isProcessing}>{isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}</button>
                                                        )}
                                                    </div>
                                                    <div className="mb-2"><span className={cn("px-1.5 py-0.5 rounded text-[10px] font-mono break-all line-clamp-2 border", isResolved ? "bg-green-100 text-green-700 border-green-200" : "bg-yellow-200 text-yellow-800 border-yellow-300")}>&quot;{fb.markedText}&quot;</span></div>
                                                    <p className={cn("whitespace-pre-wrap transition-colors", isResolved ? "text-zinc-400 line-through decoration-zinc-400" : "text-zinc-800 dark:text-zinc-200")}>{fb.content}</p>
                                                    <div className={cn("mt-2 text-[10px] flex justify-between pt-2 border-t", isResolved ? "text-green-600/70 border-green-200" : "text-zinc-400 border-yellow-200")}><span>{fb.managerName}</span><span>{new Date(fb.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span></div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Input Popup (Overlay) */}
                        {isFeedbackInputOpen && (
                            <div className="absolute inset-0 z-50 bg-black/20 backdrop-blur-[1px] flex items-center justify-center p-4">
                                <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md p-4 border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95">
                                    <h3 className="font-bold mb-2 flex items-center gap-2">{isSuggestMode ? <><FileEdit className="h-4 w-4 text-blue-500" /> Sửa nội dung</> : <><MessageSquarePlus className="h-4 w-4" /> Nhận xét</>}</h3>
                                    {isSuggestMode && <div className="text-xs text-zinc-500 mb-2 bg-zinc-100 dark:bg-zinc-800 p-2 rounded">Gốc: <span className="font-mono text-zinc-700 dark:text-zinc-300">&quot;{originalTextForEdit}&quot;</span></div>}
                                    <textarea autoFocus value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} className="w-full p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-black focus:ring-2 focus:ring-black outline-none min-h-[100px] text-sm" placeholder={isSuggestMode ? "Nhập nội dung mới..." : "Nhập nhận xét của bạn..."} />
                                    <div className="flex justify-end gap-2 mt-3">
                                        <button onClick={() => { setIsFeedbackInputOpen(false); setFeedbackText(""); setIsSuggestMode(false); }} className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">Hủy</button>
                                        <button onClick={handleSubmitFeedback} disabled={!feedbackText.trim() || isProcessing} className="px-4 py-1.5 rounded-lg bg-black text-white text-xs font-bold hover:bg-zinc-800 dark:bg-white dark:text-black flex items-center gap-2">{isProcessing && <Loader2 className="h-3 w-3 animate-spin" />}{isSuggestMode ? "Lưu thay đổi" : "Gửi Feedback"}</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-400">
                        <div className="h-16 w-16 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-4"><Filter className="h-8 w-8 opacity-50" /></div>
                        <p>Chọn một kịch bản để bắt đầu duyệt.</p>
                    </div>
                )}
            </main>
            <ConfirmModal isOpen={confirmConfig.isOpen} onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} onConfirm={confirmConfig.onConfirm} title={confirmConfig.title} message={confirmConfig.message} variant={confirmConfig.variant || 'danger'} confirmText={confirmConfig.confirmText} />
        </div>
    );
}