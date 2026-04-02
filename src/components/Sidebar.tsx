// src/components/Sidebar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import {
    BarChart3,
    Video,
    Settings,
    LogOut,
    ChevronRight,
    ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { logoutUser } from "@/lib/auth-service";
import { useEffect, useState } from "react";
import { ModeToggle } from "./ModeToggle";
import { useRouter } from "next/navigation";

interface TabItem {
    id: string;
    name: string;
    icon: React.ElementType;
    adminOnly?: boolean;
}

const tabs: TabItem[] = [
    { id: "thong-ke", name: "Thống kê", icon: BarChart3 },
    { id: "ca-nhan", name: "Cá nhân", icon: Video },
    { id: "quan-tri", name: "Quản trị", icon: Settings, adminOnly: true },
];

interface SidebarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
    const { user, role, isAdmin } = useAuth();
    const router = useRouter();

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isTransitionEnabled, setIsTransitionEnabled] = useState(false);

    useEffect(() => {
        const savedState = localStorage.getItem("sidebar_collapsed");
        if (savedState === "true") {
            setIsCollapsed(true);
        }
        const timer = setTimeout(() => setIsTransitionEnabled(true), 100);
        return () => clearTimeout(timer);
    }, []);

    const toggleSidebar = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem("sidebar_collapsed", String(newState));
    };

    const handleLogout = async () => {
        await logoutUser();
        router.push("/auth/login");
    };

    const visibleTabs = tabs.filter(t => !t.adminOnly || isAdmin);

    return (
        <div
            className={cn(
                "relative flex h-screen flex-col justify-between border-r border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-black",
                isTransitionEnabled ? "transition-[width] duration-300 ease-in-out" : "",
                isCollapsed ? "w-20" : "w-56"
            )}
        >
            {/* Toggle Button */}
            <button
                onClick={toggleSidebar}
                className="absolute -right-3 top-9 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors"
            >
                {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
            </button>

            {/* TOP */}
            <div className="flex-1">
                {/* Logo */}
                <div className={cn("flex items-center gap-3 px-2 h-10 overflow-hidden mb-8", isCollapsed ? "justify-center" : "")}>
                    <div className="relative h-10 w-10 shrink-0 rounded-full overflow-hidden shadow-sm border border-zinc-100 dark:border-zinc-800">
                        <Image src="/logo.png" alt="Logo" fill className="object-cover" priority sizes="100px" />
                    </div>
                    <div className={cn("flex flex-col transition-opacity duration-200", isCollapsed ? "opacity-0 w-0 hidden" : "opacity-100")}>
                        <span className="text-sm font-bold whitespace-nowrap">FPTscSpace</span>
                    </div>
                </div>

                {/* Tabs */}
                <nav className="space-y-1">
                    {visibleTabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            title={isCollapsed ? tab.name : ""}
                            className={cn(
                                "flex w-full items-center rounded-lg py-2.5 text-sm font-medium transition-colors",
                                isCollapsed ? "justify-center px-3" : "gap-3 px-2",
                                activeTab === tab.id
                                    ? "bg-zinc-100 text-black dark:bg-zinc-800 dark:text-white"
                                    : "text-zinc-500 hover:bg-zinc-50 hover:text-black dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"
                            )}
                        >
                            <tab.icon className="h-5 w-5 shrink-0" />
                            <span className={cn("transition-all duration-200 whitespace-nowrap overflow-hidden", isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100")}>
                                {tab.name}
                            </span>
                        </button>
                    ))}
                </nav>
            </div>

            {/* BOTTOM */}
            <div className="mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div className="space-y-1">
                    <ModeToggle isCollapsed={isCollapsed} />

                    <button
                        onClick={handleLogout}
                        title={isCollapsed ? "Đăng xuất" : ""}
                        className={cn(
                            "flex w-full items-center rounded-lg py-2.5 text-sm font-medium transition-colors",
                            "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20",
                            isCollapsed ? "justify-center px-0" : "gap-3 px-2"
                        )}
                    >
                        <LogOut className="h-5 w-5 shrink-0" />
                        <span className={cn("transition-all duration-200 whitespace-nowrap overflow-hidden", isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100")}>
                            Đăng xuất
                        </span>
                    </button>
                </div>

                {/* User Profile */}
                <div className={cn(
                    "mt-4 flex items-center rounded-xl border border-zinc-200 p-2 dark:border-zinc-800 transition-all",
                    isCollapsed ? "justify-center border-0 bg-transparent p-0" : "gap-3 p-3"
                )}>
                    <div className="h-8 w-8 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500">
                        {user?.name?.charAt(0) || "U"}
                    </div>
                    <div className={cn("flex flex-col overflow-hidden transition-all duration-200", isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100")}>
                        <span className="truncate text-xs font-bold text-zinc-900 dark:text-white">
                            {user?.name || "User"}
                        </span>
                        <div className="flex items-center gap-1.5">
                            <span className="truncate text-[10px] text-zinc-500 max-w-20">
                                {user?.email}
                            </span>
                            {role && (
                                <span className={cn(
                                    "px-1 py-0.5 rounded text-[9px] font-bold uppercase shrink-0",
                                    role === 'admin' ? "bg-red-100 text-red-600" :
                                    "bg-gray-100 text-gray-600"
                                )}>
                                    {role}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Terms & Privacy - minimal */}
                <div className={cn("mt-3 flex justify-center gap-2 text-[10px] text-zinc-400", isCollapsed ? "hidden" : "")}>
                    <Link href="/terms" className="hover:text-zinc-600 dark:hover:text-zinc-300">Điều khoản</Link>
                    <span>·</span>
                    <Link href="/privacy" className="hover:text-zinc-600 dark:hover:text-zinc-300">Bảo mật</Link>
                </div>
            </div>
        </div>
    );
}
