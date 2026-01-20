// src/app/editors/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { getEditors, createEditor, deleteEditor, updateEditor, getEditorStats } from "@/app/actions/editor"; // Import thêm getEditorStats
import { Editor, Video } from "@/types";
import { Loader2, Plus, Pencil, Trash2, X, Mail, UserRoundPen, BarChart3, Calendar, ExternalLink, PlayCircle } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

export default function EditorsPage() {
    const { user, isAdmin, isManager, loading } = useAuth();
    const router = useRouter();

    const [editors, setEditors] = useState<Editor[]>([]);
    const [isLoadingList, setIsLoadingList] = useState(true);

    // Modal Add/Edit State
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingEditor, setEditingEditor] = useState<Editor | null>(null);
    const [formData, setFormData] = useState({ name: "", email: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Modal Stats State
    const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
    const [selectedEditor, setSelectedEditor] = useState<Editor | null>(null);

    // Check quyền
    useEffect(() => {
        if (!loading) {
            if (!user) router.push("/auth/login");
            else if (!isAdmin && !isManager) router.push("/");
        }
    }, [user, isAdmin, isManager, loading, router]);

    // Load Data Editors
    const fetchEditors = async () => {
        setIsLoadingList(true);
        const data = await getEditors();
        setEditors(data);
        setIsLoadingList(false);
    };

    useEffect(() => {
        if (isAdmin || isManager) fetchEditors();
    }, [isAdmin, isManager]);

    // --- CRUD HANDLERS ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingEditor) {
                await updateEditor(editingEditor.id, formData);
            } else {
                await createEditor(formData);
            }
            await fetchEditors();
            closeFormModal();
        } catch (error) {
            console.error(error);
            alert("Có lỗi xảy ra");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Bạn có chắc chắn muốn xóa Editor này?")) {
            await deleteEditor(id);
            setEditors(prev => prev.filter(e => e.id !== id));
        }
    };

    const openAddModal = () => {
        setEditingEditor(null);
        setFormData({ name: "", email: "" });
        setIsFormModalOpen(true);
    };

    const openEditModal = (editor: Editor) => {
        setEditingEditor(editor);
        setFormData({ name: editor.name, email: editor.email || "" });
        setIsFormModalOpen(true);
    };

    const closeFormModal = () => setIsFormModalOpen(false);

    // --- STATS HANDLERS ---
    const openStatsModal = (editor: Editor) => {
        setSelectedEditor(editor);
        setIsStatsModalOpen(true);
    };

    const closeStatsModal = () => {
        setIsStatsModalOpen(false);
        setSelectedEditor(null);
    };

    if (loading || (!isAdmin && !isManager)) return <div className="flex h-screen items-center justify-center bg-black"><Loader2 className="animate-spin text-white" /></div>;

    return (
        <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
            <Sidebar />

            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-16 flex items-center justify-between border-b border-zinc-800 px-6 bg-black shrink-0">
                    <div>
                        <h1 className="text-lg font-bold flex items-center gap-2 text-white">
                            <UserRoundPen className="h-5 w-5" />
                            Quản lý Editors
                        </h1>
                    </div>
                    <button
                        onClick={openAddModal}
                        className="flex items-center gap-2 bg-white text-black px-4 py-1.5 text-sm font-bold rounded-full hover:bg-zinc-200 transition-colors"
                    >
                        <Plus className="h-4 w-4" /> Thêm Editor
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-6 bg-black">
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden max-w-6xl mx-auto">
                        {isLoadingList ? (
                            <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-zinc-500" /></div>
                        ) : (
                            <table className="w-full text-left text-sm">
                                <thead className="bg-zinc-950 text-xs uppercase text-zinc-500 border-b border-zinc-800">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold">Tên Editor</th>
                                        <th className="px-6 py-4 font-semibold">Email</th>
                                        <th className="px-6 py-4 font-semibold text-right">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800">
                                    {editors.length > 0 ? editors.map((editor) => (
                                        <tr key={editor.id} className="hover:bg-zinc-800/50 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-white">
                                                {editor.name}
                                            </td>
                                            <td className="px-6 py-4 text-zinc-400">
                                                {editor.email ? (
                                                    <span className="flex items-center gap-2"><Mail className="h-3 w-3" /> {editor.email}</span>
                                                ) : <span className="text-zinc-600 italic">--</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                                {/* Nút Xem Thống Kê */}
                                                <button
                                                    onClick={() => openStatsModal(editor)}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg transition-all text-xs font-bold mr-2"
                                                >
                                                    <BarChart3 className="h-3.5 w-3.5" /> Thống kê
                                                </button>

                                                <button onClick={() => openEditModal(editor)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => handleDelete(editor.id)} className="p-2 hover:bg-red-900/20 rounded-full text-red-500 hover:text-red-400 transition-colors">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={3} className="px-6 py-12 text-center text-zinc-500">Chưa có editor nào.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </main>

            {/* --- MODAL FORM THÊM/SỬA --- */}
            {isFormModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-sm p-6 relative animate-in zoom-in-95">
                        <button onClick={closeFormModal} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X className="h-5 w-5" /></button>
                        <h2 className="text-xl font-bold mb-6 text-white">{editingEditor ? "Cập nhật" : "Thêm mới"}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase">Tên Editor <span className="text-red-500">*</span></label>
                                <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-white/50" placeholder="Nhập tên..." />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase">Email</label>
                                <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-white/50" placeholder="email@example.com" />
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={closeFormModal} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white">Hủy</button>
                                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-bold text-black bg-white hover:bg-zinc-200 rounded-lg flex items-center gap-2">
                                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />} Lưu
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL THỐNG KÊ CHI TIẾT --- */}
            {isStatsModalOpen && selectedEditor && (
                <EditorStatsModal editor={selectedEditor} onClose={closeStatsModal} />
            )}
        </div>
    );
}

// --- SUB-COMPONENT: EDITOR STATS MODAL ---
function EditorStatsModal({ editor, onClose }: { editor: Editor, onClose: () => void }) {
    const currentDate = new Date();
    const [year, setYear] = useState(currentDate.getFullYear());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [data, setData] = useState<any | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);

    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true);
            const res = await getEditorStats(editor.id, year);
            setData(res);
            setIsLoading(false);
        };
        fetchStats();
    }, [editor.id, year]);

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col animate-in zoom-in-95">

                {/* 1. Header Modal */}
                <div className="flex items-center justify-between p-6 border-b border-zinc-800 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-blue-500" />
                            Thống kê: {editor.name}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* 2. Content Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 bg-black custom-scrollbar">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-zinc-500 h-8 w-8" /></div>
                    ) : data ? (
                        <div className="space-y-8">

                            {/* --- SECTION 1: BỘ LỌC & TỔNG QUAN --- */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-zinc-400 text-sm font-bold uppercase tracking-wider">Tổng quan Năm {year}</h3>

                                    <div className="relative">
                                        <select
                                            value={year}
                                            onChange={(e) => setYear(Number(e.target.value))}
                                            className="appearance-none bg-zinc-900 border border-zinc-800 text-white text-sm font-bold px-4 py-2 rounded-lg cursor-pointer hover:border-zinc-700 focus:outline-none pr-8"
                                        >
                                            {years.map(y => <option key={y} value={y} className="bg-zinc-900">Năm {y}</option>)}
                                        </select>
                                        <Calendar className="absolute right-2.5 top-2.5 h-4 w-4 text-zinc-500 pointer-events-none" />
                                    </div>
                                </div>

                                {/* 3 Card Thông số Tổng (Giữ nguyên) */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800 flex flex-col items-center text-center">
                                        <div className="p-3 bg-blue-500/10 rounded-full mb-3 text-blue-500"><PlayCircle className="h-6 w-6" /></div>
                                        <p className="text-zinc-500 text-xs uppercase font-bold mb-1">Tổng Video</p>
                                        <p className="text-3xl font-bold text-white">{data.overview.totalVideos}</p>
                                    </div>
                                    <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800 flex flex-col items-center text-center">
                                        <div className="p-3 bg-yellow-500/10 rounded-full mb-3 text-yellow-500"><ExternalLink className="h-6 w-6" /></div>
                                        <p className="text-zinc-500 text-xs uppercase font-bold mb-1">Tổng Views</p>
                                        <p className="text-3xl font-bold text-yellow-500">{data.overview.totalViews.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800 flex flex-col items-center text-center">
                                        <div className="p-3 bg-green-500/10 rounded-full mb-3 text-green-500"><BarChart3 className="h-6 w-6" /></div>
                                        <p className="text-zinc-500 text-xs uppercase font-bold mb-1">Tổng Tương tác</p>
                                        <p className="text-3xl font-bold text-green-500">{data.overview.totalEngagement.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full h-px bg-zinc-800 my-6"></div>

                            {/* --- SECTION 2: DANH SÁCH THEO THÁNG --- */}
                            <div className="space-y-8">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {data.monthlyGroups.length > 0 ? (
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    data.monthlyGroups.map((group: any) => (
                                        <div key={group.month} className="animate-in fade-in slide-in-from-bottom-4">
                                            {/* Header của Tháng */}
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="bg-white text-black text-xs font-bold px-2 py-1 rounded">
                                                    THÁNG {group.month}
                                                </div>
                                                <span className="text-zinc-500 text-xs font-medium">
                                                    ({group.videos.length} video • {group.totalViews.toLocaleString()} views)
                                                </span>
                                            </div>

                                            {/* Bảng Video của Tháng đó */}
                                            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-zinc-950 text-xs uppercase text-zinc-500 border-b border-zinc-800">
                                                        <tr>
                                                            <th className="px-4 py-3 w-10 text-center">#</th>
                                                            <th className="px-4 py-3">Video</th>
                                                            <th className="px-4 py-3 text-right w-24">Views</th>
                                                            <th className="px-4 py-3 text-right w-32">Tương tác</th>
                                                            <th className="px-4 py-3 text-right w-32">Ngày đăng</th>
                                                            <th className="px-4 py-3 text-center w-16">Link</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-zinc-800">
                                                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                        {group.videos.map((video: Video, idx: number) => {
                                                            // Tính tổng tương tác
                                                            const interactions = (video.stats.like || 0) + (video.stats.comment || 0) + (video.stats.share || 0);

                                                            return (
                                                                <tr key={video.id} className="hover:bg-zinc-800/50 transition-colors">
                                                                    <td className="px-4 py-3 text-center text-zinc-600 font-mono text-xs">{idx + 1}</td>
                                                                    <td className="px-4 py-3">
                                                                        <div className="flex items-center gap-3">
                                                                            {video.coverImage && (
                                                                                <div className="h-9 w-7 relative rounded overflow-hidden bg-zinc-800 shrink-0 border border-zinc-700">
                                                                                    <Image src={video.coverImage} alt="" fill className="object-cover" />
                                                                                </div>
                                                                            )}
                                                                            <span className="font-medium text-zinc-300 line-clamp-1" title={video.title}>
                                                                                {video.title}
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right font-mono text-yellow-500 font-medium">
                                                                        {video.stats.view.toLocaleString()}
                                                                    </td>
                                                                    {/* [CẬP NHẬT]: Hiển thị cột Tương tác */}
                                                                    <td className="px-4 py-3 text-right font-mono text-green-500 font-medium">
                                                                        {interactions.toLocaleString()}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right text-zinc-500 text-xs">
                                                                        {new Date(video.createTime).toLocaleDateString('vi-VN')}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        <Link href={video.link} target="_blank" className="inline-flex p-1.5 bg-zinc-800 hover:bg-zinc-700 hover:text-blue-400 rounded-full text-zinc-400 transition-colors">
                                                                            <ExternalLink className="h-3.5 w-3.5" />
                                                                        </Link>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12 text-zinc-500 bg-zinc-900/50 rounded-xl border border-zinc-800 border-dashed">
                                        Không có video nào trong năm {year}.
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}