"use client";

import { useState, useRef, useEffect } from "react";
import type { ElementType } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
    BarChart3,
    Video,
    Settings,
    LogOut,
    Bell,
    Menu,
    X,
    ChevronDown,
    Trophy
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { logoutUser } from "@/lib/auth-service";
import { ModeToggle } from "./ModeToggle";

interface TabItem {
    id: string;
    name: string;
    icon: ElementType;
    adminOnly?: boolean;
}

const tabs: TabItem[] = [
    { id: "thong-ke", name: "Thống kê", icon: BarChart3 },
    { id: "ca-nhan", name: "Videos", icon: Video },
    { id: "bang-xep-hang", name: "Bảng xếp hạng", icon: Trophy },
    { id: "quan-tri", name: "Quản trị", icon: Settings, adminOnly: true },
];

interface TopbarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export function Topbar({ activeTab, onTabChange }: TopbarProps) {
    const { user, role, isAdmin } = useAuth();
    const router = useRouter();
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const visibleTabs = tabs.filter(t => !t.adminOnly || isAdmin);

    const handleLogout = async () => {
        await logoutUser();
        router.push("/auth/login");
    };

    // Close dropdowns when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setUserDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-[#0a0a0a]/80">
            <div className="flex h-16 items-center px-4 md:px-6">
                {/* Logo */}
                <div className="flex items-center gap-2 sm:gap-3 cursor-pointer shrink-0 mr-2 sm:mr-0" onClick={() => onTabChange("thong-ke")}>
                    <div className="relative h-8 w-8 flex items-center justify-center font-bold text-blue-600 shrink-0 rounded-xl overflow-hidden shadow-sm border border-zinc-100 dark:border-zinc-800 bg-white">
                        <Image src="/logo.png" alt="Logo" fill className="object-cover" priority sizes="100px" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white hidden md:block">
                        FPTscSpace
                    </span>
                </div>

                {/* Navigation Tabs */}
                <nav className="flex items-center justify-center gap-1 sm:gap-2 flex-1 overflow-x-auto px-2 scrollbar-none">
                    {visibleTabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={cn(
                                "flex items-center cursor-pointer justify-center gap-1 sm:gap-2 rounded-xl text-[11px] sm:text-[13px] font-bold transition-all duration-200 shrink-0",
                                activeTab === tab.id
                                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white px-2 py-1.5 sm:px-5 sm:py-2"
                                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white px-1.5 py-1.5 sm:px-5 sm:py-2"
                            )}
                            title={tab.name}
                        >
                            <tab.icon className={cn("h-4 w-4 sm:h-5 sm:w-5", activeTab === tab.id ? "hidden sm:block" : "block sm:hidden")} />
                            <span className={cn(activeTab === tab.id ? "block" : "hidden sm:block")}>{tab.name}</span>
                        </button>
                    ))}
                </nav>

                {/* Right Actions */}
                <div className="flex items-center gap-3">
                    <div className="hidden sm:block mr-2">
                        <ModeToggle isCollapsed={true} />
                    </div>
                    
                    {/* User Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <button 
                            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                            className="flex items-center gap-2 rounded-xl p-1 transition-all focus:outline-none"
                        >
                            <div className="h-9 w-9 shrink-0 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400 ring-2 ring-white dark:ring-[#0a0a0a]">
                                {user?.name?.charAt(0) || "U"}
                            </div>
                            <div className="hidden lg:flex flex-col items-start mr-1">
                                <span className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">
                                    {user?.name || "User"}
                                </span>
                                <span className="text-[10px] uppercase font-bold text-zinc-500 leading-tight">
                                    {role === 'admin' ? "Admin" : "User"}
                                </span>
                            </div>
                            <ChevronDown className="h-4 w-4 text-zinc-400 hidden lg:block" />
                        </button>

                        {/* Dropdown Menu */}
                        {userDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-56 transform opacity-100 scale-100 transition-all rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-[#121212] py-2 z-50">
                                <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 mb-2">
                                    <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{user?.name}</p>
                                    <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
                                </div>
                                <div className="sm:hidden px-2 mb-2">
                                    <div className="px-2 py-1 flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
                                        Giao diện
                                        <ModeToggle isCollapsed={true} />
                                    </div>
                                </div>
                                <div className="px-2">
                                    <button
                                        onClick={handleLogout}
                                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Đăng xuất
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
