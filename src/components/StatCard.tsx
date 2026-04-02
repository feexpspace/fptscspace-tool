"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
    title: string;
    value: number;
    icon: LucideIcon;
    color: "blue" | "green" | "emerald" | "orange" | "purple" | "red" | "rose" | "yellow";
    className?: string;
    featured?: boolean;
}

const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
    green: "bg-green-50 text-green-600 dark:bg-green-950/50 dark:text-green-400",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
    orange: "bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400",
    red: "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400",
    yellow: "bg-yellow-50 text-yellow-600 dark:bg-yellow-950/50 dark:text-yellow-400",
};

export function StatCard({ title, value, icon: Icon, color, className, featured }: StatCardProps) {
    return (
        <div className={cn(
            "rounded-xl p-6 flex flex-col gap-5 transition-all min-w-0 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] relative overflow-hidden",
            featured 
                ? "bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-500 border-transparent shadow-[0_8px_30px_rgba(37,99,235,0.2)]" 
                : "bg-white border border-zinc-100/50 dark:border-zinc-800/50 dark:bg-[#121212]",
            className
        )}>
            {/* Subtle mesh background block for featured card */}
            {featured && (
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-white opacity-10 blur-3xl mix-blend-overlay pointer-events-none"></div>
            )}
            
            <div className="flex items-center justify-between relative z-10">
                <div className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                    featured 
                        ? "bg-white text-blue-600 shadow-sm" 
                        : colorMap[color]
                )}>
                    <Icon className="h-6 w-6 stroke-[1.5]" />
                </div>
            </div>
            <div className="min-w-0 relative z-10">
                <p className={cn(
                    "text-2xl md:text-3xl xl:text-[32px] font-bold tracking-tight mb-1.5 truncate",
                    featured ? "text-white" : "text-zinc-900 dark:text-white"
                )}>
                    {value.toLocaleString("vi-VN")}
                </p>
                <p className={cn(
                    "text-[13px] md:text-sm font-medium capitalize truncate",
                    featured ? "text-blue-100" : "text-zinc-500 dark:text-zinc-400"
                )}>
                    {title}
                </p>
            </div>
        </div>
    );
}
