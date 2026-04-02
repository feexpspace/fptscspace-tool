// src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Topbar } from "@/components/Topbar";
import { ThongKeTab } from "@/components/tabs/ThongKeTab";
import { CaNhanTab } from "@/components/tabs/CaNhanTab";
import { QuanTriTab } from "@/components/tabs/QuanTriTab";
import { BangXepHangTab } from "@/components/tabs/BangXepHangTab";
import { logoutUser } from "@/lib/auth-service";

const TAB_TITLES: Record<string, string> = {
    "thong-ke": "Thống kê",
    "ca-nhan": "Videos",
    "bang-xep-hang": "Bảng xếp hạng",
    "quan-tri": "Quản trị",
};

export default function HomePage() {
    const { user, loading, isAdmin, isPending } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("thong-ke");

    useEffect(() => {
        if (!loading && !user) {
            router.push("/auth/login");
        }
    }, [loading, user, router]);

    // Guard: non-admin trying to access admin tab
    useEffect(() => {
        if (activeTab === "quan-tri" && !isAdmin) {
            setActiveTab("thong-ke");
        }
    }, [activeTab, isAdmin]);

    if (loading || !user) {
        return (
            <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-white" />
            </div>
        );
    }

    if (isPending) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-zinc-950 px-4 text-center">
                <div className="rounded-full bg-yellow-100 p-4 dark:bg-yellow-900/30">
                    <svg className="h-8 w-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
                    </svg>
                </div>
                <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Chờ Admin duyệt tài khoản</h1>
                <p className="text-sm text-zinc-500 max-w-sm">
                    Tài khoản <strong>{user.email}</strong> đã được đăng ký thành công. Vui lòng chờ Admin phê duyệt để truy cập hệ thống.
                </p>
                <button
                    onClick={async () => { await logoutUser(); router.push("/auth/login"); }}
                    className="mt-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                    Đăng xuất
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-zinc-50 dark:bg-[#0a0a0a]">
            {/* Top Navigation Bar */}
            <Topbar activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto custom-scrollbar w-full">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
                    <div className="flex flex-col space-y-8">
                        {/* Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-transparent">
                            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
                                {TAB_TITLES[activeTab] || "Tổng quan"}
                            </h1>
                        </div>

                        {/* Content */}
                        <div className="w-full">
                            <div className={activeTab !== "thong-ke" ? "hidden" : ""}><ThongKeTab /></div>
                            <div className={activeTab !== "ca-nhan" ? "hidden" : ""}><CaNhanTab /></div>
                            <div className={activeTab !== "bang-xep-hang" ? "hidden" : ""}><BangXepHangTab /></div>
                            {isAdmin && <div className={activeTab !== "quan-tri" ? "hidden" : ""}><QuanTriTab /></div>}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
