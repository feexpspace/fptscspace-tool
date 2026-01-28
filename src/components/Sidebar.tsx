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
    UserRoundPen,
    BarChart3,
    ChevronRight,
    ChevronLeft,
    Shield,
    Lock,
    MessageSquareText // Icon gợi ý cho Communication (hoặc dùng icon khác tùy bạn)
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { logoutUser } from "@/lib/auth-service";
import { UserRole } from "@/types/index";
import { useEffect, useState } from "react";
import { ModeToggle } from "./ModeToggle";

interface SidebarItem {
    name: string;
    href: string;
    icon: React.ElementType;
    allowedRoles: UserRole[];
}

// 1. MANAGEMENT (Cũ là Main)
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

// 2. COMMUNICATION (Mới - Chứa Scripts)
const commNavItems: SidebarItem[] = [
    {
        name: "Scripts",
        href: "/scripts",
        icon: ScrollText,
        allowedRoles: ['admin', 'member']
    },
    {
        name: "Scripts Manager",
        href: "/scripts-manager",
        icon: ScrollText,
        allowedRoles: ['admin', 'manager']
    },
];

// 3. DOCUMENTATION (Chứa Terms)
const docNavItems: SidebarItem[] = [
    {
        name: "Terms of Service",
        href: "/terms",
        icon: Shield,
        allowedRoles: ['admin', 'manager', 'member']
    },
    {
        name: "Privacy Policy",
        href: "/privacy",
        icon: Lock,
        allowedRoles: ['admin', 'manager', 'member']
    },
];

export function Sidebar() {
    const pathname = usePathname();
    const { user, role } = useAuth();
    const router = useRouter();

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isTransitionEnabled, setIsTransitionEnabled] = useState(false);

    useEffect(() => {
        const savedState = localStorage.getItem("sidebar_collapsed");
        if (savedState === "true") {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsCollapsed(true);
        }
        const timer = setTimeout(() => {
            setIsTransitionEnabled(true);
        }, 100);
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

    const filterMenu = (items: SidebarItem[]) => {
        if (!role) return [];
        return items.filter(item => item.allowedRoles.includes(role));
    };

    const filteredMainNav = filterMenu(mainNavItems);
    const filteredCommNav = filterMenu(commNavItems); // Lọc Communication
    const filteredDocNav = filterMenu(docNavItems);   // Lọc Documentation

    // Helper render menu group để code gọn hơn
    const renderMenuGroup = (title: string, shortTitle: string, items: SidebarItem[]) => {
        if (items.length === 0) return null;
        return (
            <div className="mb-6">
                <div className={cn(
                    "mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 transition-all",
                    isCollapsed ? "text-center text-[10px]" : ""
                )}>
                    {isCollapsed ? shortTitle : title}
                </div>
                <nav className="space-y-1">
                    {items.map((item) => (
                        <Link
                            key={item.href} // Dùng href làm key cho chắc chắn
                            href={item.href}
                            title={isCollapsed ? item.name : ""}
                            className={cn(
                                "flex items-center rounded-lg py-2.5 text-sm font-medium transition-colors",
                                isCollapsed ? "px-3" : "gap-3 px-2",
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
        );
    };

    return (
        <div
            className={cn(
                "relative flex h-screen flex-col justify-between border-r border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-black",
                isTransitionEnabled ? "transition-[width] duration-300 ease-in-out" : "",
                isCollapsed ? "w-20" : "w-64"
            )}
        >
            {/* Toggle Button */}
            <button
                onClick={toggleSidebar}
                className="absolute -right-3 top-9 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors"
            >
                {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
            </button>

            {/* TOP SECTION */}
            <div className="flex-1 overflow-y-auto no-scrollbar"> {/* Thêm overflow để scroll nếu menu dài */}

                {/* Logo Area */}
                <div className={cn("flex items-center gap-3 px-2 h-10 overflow-hidden mb-8", isCollapsed ? "justify-center" : "")}>
                    <div className="relative h-10 w-10 shrink-0 rounded-full overflow-hidden shadow-sm border border-zinc-100 dark:border-zinc-800">
                        <Image
                            src="/logo.png"
                            alt="Logo"
                            fill
                            className="object-cover"
                            priority
                            sizes="100px"
                        />
                    </div>
                    <div className={cn("flex flex-col transition-opacity duration-200", isCollapsed ? "opacity-0 w-0 hidden" : "opacity-100")}>
                        <span className="text-sm font-bold whitespace-nowrap">FPTscSpace Tool</span>
                        <span className="text-[10px] text-zinc-500">v1.0.0</span>
                    </div>
                </div>

                {/* --- 1. MANAGEMENT --- */}
                {renderMenuGroup("Management", "Mng", filteredMainNav)}

                {/* --- 2. COMMUNICATION --- */}
                {renderMenuGroup("Communication", "Com", filteredCommNav)}

                {/* --- 3. DOCUMENTATION --- */}
                {renderMenuGroup("Documentation", "Doc", filteredDocNav)}

            </div>

            {/* BOTTOM SECTION: Settings / Logout / User */}
            <div className="mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div className="space-y-1">
                    <ModeToggle isCollapsed={isCollapsed} />

                    <button
                        onClick={handleLogout}
                        title={isCollapsed ? "Log Out" : ""}
                        className={cn(
                            "flex w-full items-center rounded-lg py-2.5 text-sm font-medium transition-colors",
                            "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20",
                            isCollapsed ? "justify-center px-0" : "gap-3 px-2"
                        )}
                    >
                        <LogOut className="h-5 w-5 shrink-0" />
                        <span className={cn("transition-all duration-200 whitespace-nowrap overflow-hidden", isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100")}>
                            Log Out
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