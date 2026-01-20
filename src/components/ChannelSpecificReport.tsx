/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/ChannelSpecificReport.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { Video, Channel } from "@/types";
import { RefreshCw, ExternalLink, Calendar, Video as VideoIcon } from "lucide-react";
import { getMonthlyStatistics, getVideosFromDB, syncTikTokVideos } from "@/app/actions/report";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { ReportsStats } from "@/components/ReportsStats";

interface ChannelSpecificReportProps {
    channel: Channel;
    user: any;
}

export function ChannelSpecificReport({ channel, user }: ChannelSpecificReportProps) {
    const currentDate = new Date();
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);

    const [videos, setVideos] = useState<Video[]>([]);
    const [statsData, setStatsData] = useState({
        followers: 0,
        videos: 0,
        views: 0,
        engagement: 0
    });
    const [isSyncing, setIsSyncing] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);

    const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    useEffect(() => {
        const fetchData = async () => {
            if (!channel) return;
            setIsLoadingData(true);

            // Gọi song song 2 API
            const [videosData, monthlyStats] = await Promise.all([
                getVideosFromDB(channel.id, selectedYear, selectedMonth),
                getMonthlyStatistics(channel.id, selectedYear, selectedMonth)
            ]);

            setVideos(videosData);

            // Cập nhật StatsData
            if (monthlyStats) {
                // Ưu tiên dùng dữ liệu từ bảng thống kê tháng
                setStatsData({
                    followers: monthlyStats.followerCount || channel.follower || 0,
                    videos: monthlyStats.videoCount || 0,
                    views: monthlyStats.totalViews || 0,
                    engagement: monthlyStats.totalInteractions || 0
                });
            } else {
                // Fallback: Nếu chưa có record tháng, tính tạm từ list video (UX tốt hơn là hiện số 0)
                const totalViews = videosData.reduce((acc, curr) => acc + (curr.stats.view || 0), 0);
                const totalEngagement = videosData.reduce((acc, curr) => {
                    return acc + (curr.stats.like || 0) + (curr.stats.comment || 0) + (curr.stats.share || 0);
                }, 0);

                setStatsData({
                    followers: channel.follower || 0,
                    videos: videosData.length,
                    views: totalViews,
                    engagement: totalEngagement
                });
            }

            setIsLoadingData(false);
        };
        fetchData();
    }, [channel, selectedYear, selectedMonth]);

    const handleSync = async () => {
        if (!user || !channel) return;
        setIsSyncing(true);

        // 1. Đồng bộ TikTok
        await syncTikTokVideos(user.id, channel.id);

        // 2. Load lại dữ liệu mới nhất (gọi lại giống useEffect)
        const [videosData, monthlyStats] = await Promise.all([
            getVideosFromDB(channel.id, selectedYear, selectedMonth),
            getMonthlyStatistics(channel.id, selectedYear, selectedMonth)
        ]);

        setVideos(videosData);

        if (monthlyStats) {
            setStatsData({
                followers: monthlyStats.followerCount || channel.follower || 0,
                videos: monthlyStats.videoCount || 0,
                views: monthlyStats.totalViews || 0,
                engagement: monthlyStats.totalInteractions || 0
            });
        } else {
            // Fallback logic giống trên
            const totalViews = videosData.reduce((acc, curr) => acc + (curr.stats.view || 0), 0);
            const totalEngagement = videosData.reduce((acc, curr) =>
                acc + (curr.stats.like || 0) + (curr.stats.comment || 0) + (curr.stats.share || 0), 0);

            setStatsData({
                followers: channel.follower || 0,
                videos: videosData.length,
                views: totalViews,
                engagement: totalEngagement
            });
        }

        setIsSyncing(false);
    };

    return (
        <div className="space-y-4 animate-in fade-in">
            {/* Header Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold text-lg">
                        <VideoIcon className="h-5 w-5" />
                        <span>Video Report</span>
                    </div>

                    <div className="relative group">
                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500 pointer-events-none" />
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="appearance-none bg-zinc-100 dark:bg-black border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-sm rounded-lg pl-9 pr-8 py-2 focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none cursor-pointer font-medium"
                        >
                            {years.map(y => <option key={y} value={y}>Năm {y}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-50 md:max-w-none no-scrollbar">
                        {months.map((m) => (
                            <button
                                key={m}
                                onClick={() => setSelectedMonth(m)}
                                className={cn(
                                    "h-8 w-8 shrink-0 flex items-center justify-center rounded-lg text-xs font-bold transition-all",
                                    selectedMonth === m
                                        ? "bg-black text-white dark:bg-white dark:text-black"
                                        : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                )}
                            >
                                T{m}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black text-sm font-bold transition-all"
                >
                    <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                    {isSyncing ? "Đang đồng bộ..." : "Đồng bộ TikTok"}
                </button>
            </div>

            {/* Stats Cards */}
            <ReportsStats stats={statsData} />

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
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
                    <div className="overflow-x-auto custom-scrollbar pb-2">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                                <tr>
                                    <th className="px-6 py-4 font-semibold w-16 text-center">STT</th>
                                    {/* CỘT MỚI: THỜI GIAN */}
                                    <th className="px-6 py-4 font-semibold w-32">THỜI GIAN</th>
                                    <th className="px-6 py-4 font-semibold">TÊN VIDEO</th>
                                    <th className="px-6 py-4 font-semibold text-center w-20">LINK</th>
                                    <th className="px-6 py-4 font-semibold w-32">EDITOR</th>
                                    <th className="px-6 py-4 font-semibold text-right w-32">LƯỢT XEM</th>
                                    <th className="px-6 py-4 font-semibold text-right w-40">TƯƠNG TÁC</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {videos.map((video, index) => {
                                    const interaction = (video.stats.like || 0) + (video.stats.comment || 0) + (video.stats.share || 0);

                                    // Format Date: 12/1/2026
                                    const dateStr = video.createTime.toLocaleDateString('vi-VN');
                                    // Format Time: 20:27
                                    const timeStr = video.createTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

                                    return (
                                        <tr key={video.id || index} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                                            <td className="px-6 py-4 text-center text-zinc-500">{index + 1}</td>

                                            {/* CỘT THỜI GIAN */}
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-zinc-900 dark:text-zinc-100">{dateStr}</div>
                                                <div className="text-xs text-zinc-500 mt-0.5">{timeStr}</div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {video.coverImage && (
                                                        <div className="h-10 w-8 shrink-0 relative overflow-hidden rounded bg-zinc-200">
                                                            <Image
                                                                src={video.coverImage}
                                                                alt="cover"
                                                                fill
                                                                className="object-cover"
                                                                sizes="32px"
                                                            />
                                                        </div>
                                                    )}
                                                    <ExpandableVideoTitle title={video.title} />
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 text-center">
                                                <Link
                                                    href={video.link}
                                                    target="_blank"
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-blue-500 transition-colors"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </Link>
                                            </td>

                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "px-2 py-1 rounded text-xs border font-medium",
                                                    video.editorName
                                                        ? "bg-zinc-100 border-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300"
                                                        : "bg-transparent border-zinc-300 text-zinc-400 italic"
                                                )}>
                                                    {video.editorName || "Tự edit"}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4 text-right font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                                                {video.stats.view.toLocaleString()}
                                            </td>

                                            <td className="px-6 py-4 text-right">
                                                <div className="font-bold text-green-600 dark:text-green-400 tabular-nums">
                                                    {interaction.toLocaleString()}
                                                </div>
                                                <div className="text-[10px] text-zinc-400 mt-1 flex items-center justify-end gap-2">
                                                    <span title="Likes">{video.stats.like} ❤</span>
                                                    <span title="Comments">{video.stats.comment} 💬</span>
                                                    <span title="Shares">{video.stats.share} ↗</span>
                                                </div>
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

function ExpandableVideoTitle({ title }: { title: string }) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Chỉ hiện nút "Xem thêm" nếu tiêu đề dài hơn 60 ký tự
    const isLongText = title.length > 60;

    return (
        <div className="flex flex-col items-start">
            <span
                className={cn(
                    "font-medium text-zinc-700 dark:text-zinc-300 transition-all wrap-break-word max-w-md",
                    !isExpanded && isLongText ? "line-clamp-2" : "" // Nếu chưa mở rộng thì giới hạn 2 dòng
                )}
                title={title}
            >
                {title}
            </span>

            {isLongText && (
                <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="mt-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline focus:outline-none"
                >
                    {isExpanded ? "Ẩn bớt" : "Xem thêm"}
                </button>
            )}
        </div>
    );
}