// src/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Tv,
    FileText,
    ScrollText,
    LogOut,
    Settings,
    LifeBuoy
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { logoutUser } from "@/lib/auth-service";
import { useRouter } from "next/navigation";

const mainNavItems = [
    { name: "Statistics", href: "/", icon: LayoutDashboard },
    { name: "Members", href: "/members", icon: Users },
    { name: "Channels", href: "/channels", icon: Tv },
    { name: "Reports", href: "/reports", icon: FileText },
];

const docNavItems = [
    { name: "Scripts", href: "/scripts", icon: ScrollText },
];

export function Sidebar() {
    const pathname = usePathname();
    const { user } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await logoutUser();
        router.push("/auth/login");
    };

    return (
        <div className="flex h-screen w-64 flex-col justify-between border-r border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-black">
            <div>
                {/* Logo Area */}
                <div className="flex items-center gap-3 px-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white dark:bg-white dark:text-black">
                        <span className="text-xl font-bold">T</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold">TikTok Manager</span>
                        <span className="text-xs text-zinc-500">v1.0.0</span>
                    </div>
                </div>

                {/* Main Menu */}
                <div className="mt-10">
                    <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        Main
                    </div>
                    <nav className="space-y-1">
                        {mainNavItems.map((item) => (
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
                <div className="mt-8">
                    <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        Documentation
                    </div>
                    <nav className="space-y-1">
                        {docNavItems.map((item) => (
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
                    <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                    <div className="flex flex-col overflow-hidden">
                        <span className="truncate text-xs font-bold text-zinc-900 dark:text-white">{user?.name || "User"}</span>
                        <span className="truncate text-[10px] text-zinc-500">{user?.email}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}