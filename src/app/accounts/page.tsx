// src/app/accounts/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/Sidebar";
import { UserCog, Loader2, Trash2, Tv, ShieldAlert } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { cn } from "@/lib/utils";
import {
    getAllUsersWithChannels,
    changeUserRole,
    deleteUserAccount,
    UserWithChannels
} from "@/app/actions/account";

export default function AccountsPage() {
    const { user, isAdmin, loading } = useAuth();
    const router = useRouter();

    const [usersList, setUsersList] = useState<UserWithChannels[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);

    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: React.ReactNode;
        variant: 'danger' | 'info' | 'warning';
        onConfirm: () => Promise<void>;
        confirmText?: string;
    }>({
        isOpen: false,
        title: "",
        message: null,
        variant: 'info',
        onConfirm: async () => { },
    });

    useEffect(() => {
        if (!loading) {
            if (!user) router.push("/auth/login");
            else if (!isAdmin) router.push("/"); // Chỉ Admin mới được vào
            else fetchUsers();
        }
    }, [user, loading, isAdmin, router]);

    const fetchUsers = async () => {
        setIsLoadingData(true);
        try {
            const res = await getAllUsersWithChannels();
            if (res.success && res.data) {
                setUsersList(res.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingData(false);
        }
    };

    // --- ĐỔI ROLE ---
    const handleRoleChange = async (userId: string, newRole: string, userName: string) => {
        if (userId === user?.id) {
            alert("Bạn không thể tự đổi quyền của chính mình!");
            return;
        }

        setConfirmConfig({
            isOpen: true,
            title: "Xác nhận đổi quyền",
            message: <span>Bạn có chắc chắn muốn chuyển quyền của <b>{userName}</b> thành <b>{newRole.toUpperCase()}</b>?</span>,
            variant: 'warning',
            confirmText: "Đổi quyền",
            onConfirm: async () => {
                setIsActionLoading(true);
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const res = await changeUserRole(userId, newRole as any);
                    if (res.success) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
                    } else alert(res.error);
                } finally {
                    setIsActionLoading(false);
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    // --- XÓA USER ---
    const handleDeleteUser = async (userId: string, userName: string) => {
        if (userId === user?.id) {
            alert("Bạn không thể tự xóa chính mình!");
            return;
        }

        setConfirmConfig({
            isOpen: true,
            title: "Xóa người dùng vĩnh viễn",
            message: (
                <div className="space-y-2">
                    <p>Bạn có chắc chắn muốn xóa tài khoản <b>{userName}</b> không?</p>
                    <p className="text-red-500 font-bold text-xs"><ShieldAlert className="inline h-4 w-4 mb-0.5" /> Thao tác này sẽ xóa User khỏi Database và tất cả các Team. Các kênh (Channel) của User này sẽ bị mồ côi (Trống chủ sở hữu).</p>
                </div>
            ),
            variant: 'danger',
            confirmText: "Xóa vĩnh viễn",
            onConfirm: async () => {
                setIsActionLoading(true);
                try {
                    const res = await deleteUserAccount(userId);
                    if (res.success) {
                        setUsersList(prev => prev.filter(u => u.id !== userId));
                    } else alert(res.error);
                } finally {
                    setIsActionLoading(false);
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    if (loading || !isAdmin) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-zinc-500" /></div>;

    return (
        <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
            <Sidebar />

            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-16 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-6 bg-white dark:bg-zinc-950 shrink-0">
                    <h1 className="text-lg font-bold flex items-center gap-2">
                        <UserCog className="h-5 w-5" /> Quản lý Tài khoản (Admin)
                    </h1>
                </header>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {isLoadingData ? (
                        <div className="flex justify-center mt-20"><Loader2 className="animate-spin h-8 w-8 text-zinc-400" /></div>
                    ) : (
                        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-zinc-50 dark:bg-zinc-950 text-xs uppercase text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                                        <tr>
                                            <th className="px-6 py-4">Tài khoản</th>
                                            <th className="px-6 py-4 w-40">Phân quyền</th>
                                            <th className="px-6 py-4">Kênh quản lý</th>
                                            <th className="px-6 py-4 w-24 text-right">Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                        {usersList.map((u) => (
                                            <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-500">
                                                            {u.name?.charAt(0).toUpperCase() || "U"}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-zinc-900 dark:text-zinc-100">{u.name}</div>
                                                            <div className="text-xs text-zinc-500">{u.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <select
                                                        value={u.role}
                                                        onChange={(e) => handleRoleChange(u.id, e.target.value, u.name)}
                                                        disabled={u.id === user?.id || isActionLoading}
                                                        className={cn(
                                                            "text-xs font-bold uppercase rounded-lg px-2.5 py-1.5 border outline-none cursor-pointer transition-colors w-full",
                                                            u.role === 'admin' ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:border-red-900" :
                                                                u.role === 'manager' ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:border-blue-900" :
                                                                    "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300"
                                                        )}
                                                    >
                                                        <option value="admin">Admin</option>
                                                        <option value="manager">Manager</option>
                                                        <option value="member">Member</option>
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {u.channels.length > 0 ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {u.channels.map(ch => (
                                                                <span key={ch.id} className="flex items-center gap-1 text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-1 rounded-md text-zinc-600 dark:text-zinc-300">
                                                                    <Tv className="h-3 w-3" /> {ch.displayName || ch.username}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs italic text-zinc-400">Chưa gắn kênh nào</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleDeleteUser(u.id, u.name)}
                                                        disabled={u.id === user?.id || isActionLoading}
                                                        className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-50"
                                                        title="Xóa người dùng"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
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
                variant={confirmConfig.variant}
                confirmText={confirmConfig.confirmText}
            />
        </div>
    );
}