"use client";

import { UsersRound, PlayCircle, Eye, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface OverviewCardsProps {
    stats: {
        followers: number;
        videos: number;
        views: number;
        interactions: number;
    };
    title?: string;
}

// 1. Đưa StatCard ra BÊN NGOÀI OverviewCards
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const StatCard = ({ label, value, icon: Icon, colorClass }: { label: string, value: number, icon: any, colorClass: string }) => (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm flex items-center gap-4 print:border-zinc-300 print:shadow-none break-inside-avoid">
        <div className={cn("p-3 rounded-lg", colorClass)}>
            <Icon className="h-5 w-5" />
        </div>
        <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium uppercase tracking-wide">{label}</p>
            <h4 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 leading-none mt-1">{value.toLocaleString()}</h4>
        </div>
    </div>
);

// 2. Component chính
export function OverviewCards({ stats, title }: OverviewCardsProps) {
    return (
        <div className="space-y-4">
            {title && (
                <h3 className="font-bold text-lg mb-2 text-zinc-900 dark:text-zinc-100 border-l-4 border-black dark:border-white pl-3">
                    {title}
                </h3>
            )}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Tổng Followers" value={stats.followers} icon={UsersRound} colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
                <StatCard label="Tổng Videos" value={stats.videos} icon={PlayCircle} colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
                <StatCard label="Tổng Views" value={stats.views} icon={Eye} colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
                <StatCard label="Tổng Tương tác" value={stats.interactions} icon={Heart} colorClass="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" />
            </div>
        </div>
    );
}