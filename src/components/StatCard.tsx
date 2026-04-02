"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
    title: string;
    value: number;
    icon: LucideIcon;
    color: "blue" | "green" | "orange" | "purple" | "red" | "yellow";
}

const colorMap = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
    green: "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400",
    orange: "bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
    red: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
    yellow: "bg-yellow-50 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400",
};

export function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
    return (
        <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm dark:border-zinc-800/50 dark:bg-[#121212] flex flex-col justify-between h-full gap-4 transition-all hover:shadow-md">
            <div className="flex items-start justify-between">
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mr-2">{title}</p>
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]", colorMap[color])}>
                    <Icon className="h-4 w-4" />
                </div>
            </div>
            <div>
                <p className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                    {value.toLocaleString("vi-VN")}
                </p>
                {/* Optional small text below, keeping it clean for now */}
            </div>
        </div>
    );
}
