// src/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import {
    LayoutDashboard,
    Users,
    Tv,
    ScrollText,
    LogOut,
    Settings,
    UserRoundPen,
    BarChart3,
    ChevronRight,
    ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { logoutUser } from "@/lib/auth-service";
import { UserRole } from "@/types/index"; // Import Type UserRole
import { useEffect, useState } from "react";
import { ModeToggle } from "./ModeToggle";

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
        name: "Statistics",
        href: "/statistics-member",
        icon: LayoutDashboard,
        allowedRoles: ['member']
    },
    {
        name: "Teams",
        href: "/teams",
        icon: Users,
        allowedRoles: ['admin', 'manager', 'member']
    },
    {
        name: "Editors",
        href: "/editors",
        icon: UserRoundPen,
        allowedRoles: ['admin', 'manager']
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
        icon: BarChart3,
        allowedRoles: ['admin', 'manager', 'member']
    },
];

const docNavItems: SidebarItem[] = [
    {
        name: "Scripts",
        href: "/scripts",
        icon: ScrollText,
        allowedRoles: ['admin', 'member']
    },
    {
        name: "Scripts",
        href: "/scripts-manager",
        icon: ScrollText,
        allowedRoles: ['admin', 'manager']
    },
];

export function Sidebar() {
    const pathname = usePathname();
    // 3. Lấy user và role từ Context
    const { user, role } = useAuth();
    const router = useRouter();

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isTransitionEnabled, setIsTransitionEnabled] = useState(false);

    useEffect(() => {
        // 1. Đọc trạng thái từ localStorage ngay lập tức
        const savedState = localStorage.getItem("sidebar_collapsed");
        if (savedState === "true") {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsCollapsed(true);
        }

        // 2. Kích hoạt transition sau một khoảng thời gian ngắn
        // Điều này đảm bảo lần render đầu tiên (khi set width từ false -> true) không có animation
        const timer = setTimeout(() => {
            setIsTransitionEnabled(true);
        }, 100); // 100ms là đủ để render xong trạng thái ban đầu

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

    // Hàm tiện ích để lọc menu
    const filterMenu = (items: SidebarItem[]) => {
        if (!role) return []; // Chưa có role thì không hiện gì
        return items.filter(item => item.allowedRoles.includes(role));
    };

    const filteredMainNav = filterMenu(mainNavItems);
    const filteredDocNav = filterMenu(docNavItems);

    return (
        <div
            className={cn(
                "relative flex h-screen flex-col justify-between border-r border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-black",
                isTransitionEnabled ? "transition-all duration-300" : "",
                isCollapsed ? "w-20" : "w-64"
            )}
        >
            {/* 5. Nút Toggle nằm ở cạnh phải sidebar */}
            <button
                onClick={toggleSidebar}
                className="absolute -right-3 top-9 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors"
            >
                {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
            </button>

            <div>
                {/* Logo Area */}
                <div className={cn("flex items-center gap-3 px-2 h-10 overflow-hidden", isCollapsed ? "justify-center" : "")}>
                    <div className="relative h-10 w-10 shrink-0 rounded-full overflow-hidden shadow-sm border border-zinc-100 dark:border-zinc-800">
                        <Image
                            src="/logo.png"
                            alt="Logo"
                            fill
                            className="object-cover"
                            priority
                            sizes="400px"
                        />
                    </div>
                    {/* Ẩn text logo khi thu nhỏ */}
                    <div className={cn("flex flex-col transition-opacity duration-200", isCollapsed ? "opacity-0 w-0 hidden" : "opacity-100")}>
                        <span className="text-sm font-bold whitespace-nowrap">FPTscSpace Tool</span>
                        <span className="text-[10px] text-zinc-500">v1.0.0</span>
                    </div>
                </div>

                {/* Main Menu */}
                <div className="mt-10">
                    <div className={cn(
                        "mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 transition-all",
                        isCollapsed ? "text-center text-[10px]" : ""
                    )}>
                        {isCollapsed ? "Main" : "Main"}
                    </div>
                    <nav className="space-y-1">
                        {filteredMainNav.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                title={isCollapsed ? item.name : ""} // Tooltip khi thu nhỏ
                                className={cn(
                                    "flex items-center rounded-lg py-2.5 text-sm font-medium transition-colors",
                                    // Canh giữa icon khi thu nhỏ, canh trái khi mở rộng
                                    isCollapsed ? "justify-center px-0" : "gap-3 px-2",
                                    pathname === item.href
                                        ? "bg-zinc-100 text-black dark:bg-zinc-800 dark:text-white"
                                        : "text-zinc-500 hover:bg-zinc-50 hover:text-black dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"
                                )}
                            >
                                <item.icon className="h-5 w-5 shrink-0" />
                                {/* Ẩn text menu item */}
                                <span className={cn("transition-all duration-200 whitespace-nowrap overflow-hidden", isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100")}>
                                    {item.name}
                                </span>
                            </Link>
                        ))}
                    </nav>
                </div>

                {/* Documentation Menu */}
                {filteredDocNav.length > 0 && (
                    <div className="mt-8">
                        <div className={cn(
                            "mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 transition-all",
                            isCollapsed ? "text-center text-[10px]" : ""
                        )}>
                            {isCollapsed ? "Doc" : "Documentation"}
                        </div>
                        <nav className="space-y-1">
                            {filteredDocNav.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    title={isCollapsed ? item.name : ""}
                                    className={cn(
                                        "flex items-center rounded-lg py-2.5 text-sm font-medium transition-colors",
                                        isCollapsed ? "justify-center px-0" : "gap-3 px-2",
                                        pathname === item.href
                                            ? "bg-zinc-100 text-black dark:bg-zinc-800 dark:text-white"
                                            : "text-zinc-500 hover:bg-zinc-50 hover:text-black dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"
                                    )}
                                >
                                    <item.icon className="h-5 w-5 shrink-0" />
                                    <span className={cn("transition-all duration-200 whitespace-nowrap overflow-hidden", isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100")}>
                                        {item.name}
                                    </span>
                                </Link>
                            ))}
                        </nav>
                    </div>
                )}
            </div>

            {/* Footer / User / Logout */}
            <div className="space-y-1">
                {/* <button
                    title={isCollapsed ? "Settings" : ""}
                    className={cn(
                        "flex w-full items-center rounded-lg py-2.5 text-sm font-medium text-zinc-500 hover:bg-zinc-50 hover:text-black dark:text-zinc-400 dark:hover:bg-zinc-900",
                        isCollapsed ? "justify-center px-0" : "gap-3 px-2"
                    )}
                >
                    <Settings className="h-5 w-5 shrink-0" />
                    <span className={cn("transition-all duration-200 whitespace-nowrap overflow-hidden", isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100")}>
                        Settings
                    </span>
                </button> */}
                <ModeToggle isCollapsed={isCollapsed} />
                <button
                    onClick={handleLogout}
                    title={isCollapsed ? "Log Out" : ""}
                    className={cn(
                        "flex w-full items-center rounded-lg py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20",
                        isCollapsed ? "justify-center px-0" : "gap-3 px-2"
                    )}
                >
                    <LogOut className="h-5 w-5 shrink-0" />
                    <span className={cn("transition-all duration-200 whitespace-nowrap overflow-hidden", isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100")}>
                        Log Out
                    </span>
                </button>

                {/* User Mini Profile */}
                <div className={cn(
                    "mt-4 flex items-center rounded-xl border border-zinc-200 p-2 dark:border-zinc-800 transition-all",
                    isCollapsed ? "justify-center border-0 bg-transparent p-0" : "gap-3 p-3"
                )}>
                    <div className="h-8 w-8 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500">
                        {user?.name?.charAt(0) || "U"}
                    </div>

                    {/* Thông tin user sẽ ẩn đi khi collapse */}
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