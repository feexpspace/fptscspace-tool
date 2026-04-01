// src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/Sidebar";
import { ThongKeTab } from "@/components/tabs/ThongKeTab";
import { CaNhanTab } from "@/components/tabs/CaNhanTab";
import { QuanTriTab } from "@/components/tabs/QuanTriTab";

const TAB_TITLES: Record<string, string> = {
    "thong-ke": "Thống kê",
    "ca-nhan": "Cá nhân",
    "quan-tri": "Quản trị",
};

export default function HomePage() {
    const { user, loading, isAdmin } = useAuth();
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

    return (
        <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950">
            <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

            <main className="flex flex-1 flex-col overflow-hidden">
                {/* Header */}
                <div className="flex h-14 shrink-0 items-center border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-black">
                    <h1 className="text-lg font-bold text-zinc-900 dark:text-white">
                        {TAB_TITLES[activeTab] || "FPTscSpace"}
                    </h1>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === "thong-ke" && <ThongKeTab />}
                    {activeTab === "ca-nhan" && <CaNhanTab />}
                    {activeTab === "quan-tri" && isAdmin && <QuanTriTab />}
                </div>
            </main>
        </div>
    );
}
