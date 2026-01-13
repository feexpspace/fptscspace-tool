/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/ChannelSpecificReport.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { Video, Channel } from "@/types";
import { RefreshCw, ExternalLink, Calendar } from "lucide-react";
import { getVideosFromDB, syncTikTokVideos } from "@/app/actions/report";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { ReportsStats } from "@/components/ReportsStats";

interface ChannelSpecificReportProps {
    channel: Channel;
    user: any; // Thông tin user đang login
}

export function ChannelSpecificReport({ channel, user }: ChannelSpecificReportProps) {
    const currentDate = new Date();
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);

    const [videos, setVideos] = useState<Video[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);

    const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    // Lấy dữ liệu Video
    useEffect(() => {
        const fetchData = async () => {
            if (!channel) return;
            setIsLoadingData(true);
            const data = await getVideosFromDB(channel.id, selectedYear, selectedMonth);
            setVideos(data);
            setIsLoadingData(false);
        };
        fetchData();
    }, [channel, selectedYear, selectedMonth]);

    const statsData = useMemo(() => {
        let totalViews = 0;
        let totalEngagement = 0;

        if (videos.length > 0) {
            totalViews = videos.reduce((acc, curr) => acc + (curr.stats.view || 0), 0);
            totalEngagement = videos.reduce((acc, curr) => {
                const engagement = (curr.stats.like || 0) + (curr.stats.comment || 0) + (curr.stats.share || 0);
                return acc + engagement;
            }, 0);
        }

        return {
            followers: channel.follower || 0,
            videos: videos.length,
            views: totalViews,
            engagement: totalEngagement
        };
    }, [videos, channel]);

    const handleSync = async () => {
        if (!user || !channel) return;
        setIsSyncing(true);
        await syncTikTokVideos(user.id, channel.id);
        const data = await getVideosFromDB(channel.id, selectedYear, selectedMonth);
        setVideos(data);
        setIsSyncing(false);
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Controls */}
            <div className="flex flex-col gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* Chọn Năm */}
                        <div className="flex items-center gap-2 bg-zinc-100 px-3 py-2 rounded-lg dark:bg-zinc-800">
                            <Calendar className="h-4 w-4 text-zinc-500" />
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="bg-transparent outline-none text-sm font-medium cursor-pointer"
                            >
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>

                        {/* Chọn Tháng */}
                        <div className="flex items-center gap-2">
                            {months.map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setSelectedMonth(m)}
                                    className={cn(
                                        "h-8 w-8 flex items-center justify-center rounded-full text-xs font-medium transition-all",
                                        selectedMonth === m
                                            ? "bg-black text-white dark:bg-white dark:text-black"
                                            : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
                                    )}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black text-sm font-medium transition-all"
                    >
                        <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                        {isSyncing ? "Đang đồng bộ..." : "Đồng bộ TikTok"}
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <ReportsStats stats={statsData} />

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-black">
                {isLoadingData ? (
                    <div className="flex h-64 items-center justify-center text-zinc-500">
                        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                        Đang tải dữ liệu...
                    </div>
                ) : videos.length === 0 ? (
                    <div className="flex h-64 flex-col items-center justify-center text-zinc-500">
                        <p>Không có video nào trong tháng {selectedMonth}/{selectedYear}.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900">
                                <tr>
                                    <th className="px-6 py-4 font-semibold w-10">#</th>
                                    <th className="px-6 py-4 font-semibold">Video</th>
                                    <th className="px-6 py-4 font-semibold text-center">Link</th>
                                    <th className="px-6 py-4 font-semibold">Editor</th>
                                    <th className="px-6 py-4 font-semibold text-right">Views</th>
                                    <th className="px-6 py-4 font-semibold text-right">Interact</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {videos.map((video, index) => {
                                    const interaction = (video.stats.like || 0) + (video.stats.comment || 0) + (video.stats.share || 0);
                                    return (
                                        <tr key={video.id || index} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                                            <td className="px-6 py-4 text-zinc-500">{index + 1}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {video.coverImage && (
                                                        <div className="h-10 w-8 relative rounded bg-zinc-200 overflow-hidden shrink-0">
                                                            <Image src={video.coverImage} alt="cover" fill className="object-cover" />
                                                        </div>
                                                    )}
                                                    <div className="max-w-xs">
                                                        <div className="font-medium line-clamp-2" title={video.title}>{video.title}</div>
                                                        <div className="text-xs text-zinc-500 mt-1">
                                                            {video.createTime.toLocaleDateString('vi-VN')}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <Link href={video.link} target="_blank" className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-zinc-100">
                                                    <ExternalLink className="h-4 w-4 text-blue-500" />
                                                </Link>
                                            </td>
                                            {/* --- THAY ĐỔI Ở ĐÂY: Hiển thị tên Editor dạng text --- */}
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "font-medium",
                                                    video.editorName
                                                        ? "text-zinc-900 dark:text-zinc-100"
                                                        : "text-zinc-400 italic"
                                                )}>
                                                    {video.editorName || "Tự edit"}
                                                </span>
                                            </td>
                                            {/* ----------------------------------------------------- */}
                                            <td className="px-6 py-4 text-right font-bold tabular-nums">{video.stats.view.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="font-bold text-green-600 tabular-nums">{interaction.toLocaleString()}</div>
                                                <div className="text-[10px] text-zinc-400">{video.stats.like} ❤</div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}