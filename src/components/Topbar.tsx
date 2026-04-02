"use client";

import { useState, useRef, useEffect } from "react";
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
    ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { logoutUser } from "@/lib/auth-service";
import { ModeToggle } from "./ModeToggle";

interface TabItem {
    id: string;
    name: string;
    icon: React.ElementType;
    adminOnly?: boolean;
}

const tabs: TabItem[] = [
    { id: "thong-ke", name: "Thống kê", icon: BarChart3 },
    { id: "ca-nhan", name: "Videos", icon: Video },
    { id: "quan-tri", name: "Quản trị", icon: Settings, adminOnly: true },
];

interface TopbarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export function Topbar({ activeTab, onTabChange }: TopbarProps) {
    const { user, role, isAdmin } = useAuth();
    const router = useRouter();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
                
                {/* Mobile Menu Button */}
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="mr-4 inline-flex items-center justify-center rounded-md p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 md:hidden"
                >
                    {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>

                {/* Logo */}
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => onTabChange("thong-ke")}>
                    <div className="relative h-8 w-8 flex items-center justify-center font-bold text-blue-600 shrink-0 rounded-xl overflow-hidden shadow-sm border border-zinc-100 dark:border-zinc-800 bg-white">
                        <Image src="/logo.png" alt="Logo" fill className="object-cover" priority sizes="100px" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white hidden sm:block">
                        FPTscSpace
                    </span>
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center justify-center gap-2 flex-1">
                    {visibleTabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={cn(
                                "flex items-center gap-2 rounded-xl px-5 py-2 text-[13px] font-bold transition-all duration-200",
                                activeTab === tab.id
                                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white"
                                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                            )}
                        >
                            {/* Option: hide icon on desktop to make it cleaner, or keep it. Let's keep a subtle icon */}
                            {false && <tab.icon className="h-4 w-4" />}
                            {tab.name}
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
                            className="flex items-center gap-2 rounded-xl p-1 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 transition-all focus:outline-none"
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

            {/* Mobile Navigation Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0a0a0a]">
                    <nav className="flex flex-col space-y-1 px-4 py-4">
                        {visibleTabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    onTabChange(tab.id);
                                    setMobileMenuOpen(false);
                                }}
                                className={cn(
                                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                                    activeTab === tab.id
                                        ? "bg-zinc-100 text-black dark:bg-zinc-800 dark:text-white"
                                        : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
                                )}
                            >
                                <tab.icon className="h-5 w-5" />
                                {tab.name}
                            </button>
                        ))}
                    </nav>
                </div>
            )}
        </header>
    );
}
