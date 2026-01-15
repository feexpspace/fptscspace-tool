// src/app/editors/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { getEditors, createEditor, deleteEditor, updateEditor } from "@/app/actions/editor";
import { Editor } from "@/types";
import { Loader2, Plus, Pencil, Trash2, X, Mail, Users, UserRoundPen } from "lucide-react";
import { Sidebar } from "@/components/Sidebar"; // Import Sidebar

export default function EditorsPage() {
    const { user, isAdmin, isManager, loading } = useAuth();
    const router = useRouter();

    const [editors, setEditors] = useState<Editor[]>([]);
    const [isLoadingList, setIsLoadingList] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEditor, setEditingEditor] = useState<Editor | null>(null);

    // Form State
    const initialForm = { name: "", email: "" };
    const [formData, setFormData] = useState(initialForm);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Check quyền
    useEffect(() => {
        if (!loading) {
            if (!user) router.push("/auth/login");
            else if (!isAdmin && !isManager) router.push("/");
        }
    }, [user, isAdmin, isManager, loading, router]);

    // Load Data
    const fetchEditors = async () => {
        setIsLoadingList(true);
        const data = await getEditors();
        setEditors(data);
        setIsLoadingList(false);
    };

    useEffect(() => {
        if (isAdmin || isManager) fetchEditors();
    }, [isAdmin, isManager]);

    // Submit Handler
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
            closeModal();
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
        setFormData(initialForm);
        setIsModalOpen(true);
    };

    const openEditModal = (editor: Editor) => {
        setEditingEditor(editor);
        setFormData({
            name: editor.name,
            email: editor.email || "",
        });
        setIsModalOpen(true);
    };

    const closeModal = () => setIsModalOpen(false);

    if (loading || (!isAdmin && !isManager)) return <div className="flex h-screen items-center justify-center bg-black"><Loader2 className="animate-spin text-white" /></div>;

    return (
        <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
            {/* 1. SIDEBAR BÊN TRÁI */}
            <Sidebar />

            {/* 2. NỘI DUNG CHÍNH (NỀN ĐEN) */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Header */}
                <header className="h-16 flex items-center justify-between border-b border-zinc-800 px-6 bg-black shrink-0">
                    <div>
                        <h1 className="text-lg font-bold flex items-center gap-2">
                            <UserRoundPen className="h-5 w-5" />
                            Quản lý Editors
                        </h1>
                    </div>
                    <p className="text-zinc-500">
                        Danh sách các editor đang có trong hệ thống.
                    </p>
                    <button
                        onClick={openAddModal}
                        className="flex items-center gap-2 bg-white text-black px-4 py-1.5 text-sm font-bold rounded-full hover:bg-zinc-200 transition-colors"
                    >
                        <Plus className="h-4 w-4" /> Thêm Editor mới
                    </button>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-black">
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden max-w-5xl mx-auto">
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
                                        <tr key={editor.id} className="hover:bg-zinc-800/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-white">
                                                {editor.name}
                                            </td>
                                            <td className="px-6 py-4 text-zinc-400">
                                                {editor.email ? (
                                                    <span className="flex items-center gap-2"><Mail className="h-3 w-3" /> {editor.email}</span>
                                                ) : (
                                                    <span className="text-zinc-600 italic">Chưa cập nhật</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openEditModal(editor)}
                                                    className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
                                                    title="Sửa thông tin"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(editor.id)}
                                                    className="p-2 hover:bg-red-900/20 rounded-full text-red-500 hover:text-red-400 transition-colors"
                                                    title="Xóa"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-12 text-center text-zinc-500">
                                                Chưa có dữ liệu Editor nào.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </main>

            {/* Modal Form (Dark Theme) */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-sm p-6 relative animate-in zoom-in-95 duration-200">
                        <button onClick={closeModal} className="absolute top-4 right-4 text-zinc-500 hover:text-white">
                            <X className="h-5 w-5" />
                        </button>

                        <h2 className="text-xl font-bold mb-6 text-white">
                            {editingEditor ? "Cập nhật Editor" : "Thêm Editor mới"}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase">Tên Editor <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/50 transition-all"
                                    placeholder="Nhập tên..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase">Email (Tùy chọn)</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/50 transition-all"
                                    placeholder="email@example.com"
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 text-sm font-bold text-black bg-white hover:bg-zinc-200 rounded-lg disabled:opacity-50 flex items-center gap-2 transition-colors"
                                >
                                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {editingEditor ? "Lưu thay đổi" : "Tạo mới"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}