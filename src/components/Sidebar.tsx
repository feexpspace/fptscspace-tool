// src/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import {
    LayoutDashboard,
    Users,
    Tv,
    FileText,
    ScrollText,
    LogOut,
    Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { logoutUser } from "@/lib/auth-service";
import { UserRole } from "@/types/index"; // Import Type UserRole

// 1. Định nghĩa kiểu dữ liệu cho Item Menu
interface SidebarItem {
    name: string;
    href: string;
    icon: React.ElementType;
    allowedRoles: UserRole[]; // Mảng các role được phép xem
}

// 2. Cấu hình Menu và phân quyền
const mainNavItems: SidebarItem[] = [
    {
        name: "Statistics",
        href: "/",
        icon: LayoutDashboard,
        allowedRoles: ['admin', 'manager']
    },
    {
        name: "Teams",
        href: "/teams",
        icon: Users,
        allowedRoles: ['admin', 'manager', 'member']
    },
    {
        name: "Channels",
        href: "/channels",
        icon: Tv,
        allowedRoles: ['admin', 'manager', 'member']
    },
    {
        name: "Reports",
        href: "/reports",
        icon: FileText,
        allowedRoles: ['admin', 'manager', 'member']
    },
];

const docNavItems: SidebarItem[] = [
    {
        name: "Scripts",
        href: "/scripts",
        icon: ScrollText,
        allowedRoles: ['admin', 'manager', 'member']
    },
];

export function Sidebar() {
    const pathname = usePathname();
    // 3. Lấy user và role từ Context
    const { user, role } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await logoutUser();
        router.push("/auth/login");
    };

    // Hàm tiện ích để lọc menu
    const filterMenu = (items: SidebarItem[]) => {
        if (!role) return []; // Chưa có role thì không hiện gì
        return items.filter(item => item.allowedRoles.includes(role));
    };

    const filteredMainNav = filterMenu(mainNavItems);
    const filteredDocNav = filterMenu(docNavItems);

    return (
        <div className="flex h-screen w-64 flex-col justify-between border-r border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-black">
            <div>
                {/* Logo Area */}
                <div className="flex items-center gap-3 px-2">
                    <div className="relative h-10 w-10 flex-shrink-0">
                        <Image
                            src="/logof6.png"
                            alt="Logo"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold">TikTok Key Members Manager</span>
                        <span className="text-[10px] text-zinc-500">v1.0.0</span>
                    </div>
                </div>

                {/* Main Menu */}
                <div className="mt-10">
                    <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        Main
                    </div>
                    <nav className="space-y-1">
                        {filteredMainNav.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium transition-colors",
                                    pathname === item.href
                                        ? "bg-zinc-100 text-black dark:bg-zinc-800 dark:text-white"
                                        : "text-zinc-500 hover:bg-zinc-50 hover:text-black dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"
                                )}
                            >
                                <item.icon className="h-5 w-5" />
                                {item.name}
                            </Link>
                        ))}
                    </nav>
                </div>

                {/* Documentation Menu */}
                {/* Chỉ hiện section này nếu có item bên trong sau khi lọc */}
                {filteredDocNav.length > 0 && (
                    <div className="mt-8">
                        <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                            Documentation
                        </div>
                        <nav className="space-y-1">
                            {filteredDocNav.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium transition-colors",
                                        pathname === item.href
                                            ? "bg-zinc-100 text-black dark:bg-zinc-800 dark:text-white"
                                            : "text-zinc-500 hover:bg-zinc-50 hover:text-black dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"
                                    )}
                                >
                                    <item.icon className="h-5 w-5" />
                                    {item.name}
                                </Link>
                            ))}
                        </nav>
                    </div>
                )}
            </div>

            {/* Footer / User / Logout */}
            <div className="space-y-1">
                <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium text-zinc-500 hover:bg-zinc-50 hover:text-black dark:text-zinc-400 dark:hover:bg-zinc-900">
                    <Settings className="h-5 w-5" />
                    Settings
                </button>
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                >
                    <LogOut className="h-5 w-5" />
                    Log Out
                </button>

                {/* User Mini Profile */}
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                    <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500">
                        {/* Fallback avatar nếu không có ảnh */}
                        {user?.name?.charAt(0) || "U"}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <span className="truncate text-xs font-bold text-zinc-900 dark:text-white">
                            {user?.name || "User"}
                        </span>
                        <div className="flex items-center gap-1.5">
                            <span className="truncate text-[10px] text-zinc-500 max-w-[80px]">
                                {user?.email}
                            </span>
                            {/* Hiển thị Role Badge nhỏ */}
                            {role && (
                                <span className={cn(
                                    "px-1 py-0.5 rounded text-[9px] font-bold uppercase",
                                    role === 'admin' ? "bg-red-100 text-red-600" :
                                        role === 'manager' ? "bg-blue-100 text-blue-600" :
                                            "bg-gray-100 text-gray-600"
                                )}>
                                    {role}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}