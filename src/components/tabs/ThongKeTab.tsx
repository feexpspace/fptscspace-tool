"use client";

import { useState, useMemo } from "react";
import { Eye, MessageCircle, Share2, Users, Video, Tv, RefreshCw, Link } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { StatCard } from "@/components/StatCard";

export function ThongKeTab() {
    const { user, isAdmin } = useAuth();
    const { allVideos, channelTeamMap, allStats, teams, hasChannel, dataLoading, syncing, syncMsg, doSync } = useData();
    const [selectedTeam, setSelectedTeam] = useState("");
    const [selectedChannel, setSelectedChannel] = useState("");
    const [selectedMonth, setSelectedMonth] = useState("");

    const monthOptions = useMemo(() => {
        const options: { value: string; label: string }[] = [];
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const value = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
            const label = `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
            options.push({ value, label });
        }
        return options;
    }, []);

    // Derive unique channels for filter dropdown
    const allChannels = useMemo(() => {
        const map = new Map<string, { id: string; displayName: string; username: string }>();
        allVideos.forEach(v => {
            if (!map.has(v.channelId)) {
                map.set(v.channelId, { id: v.channelId, displayName: v.channelDisplayName || v.channelUsername || v.channelId, username: v.channelUsername || '' });
            }
        });
        return Array.from(map.values());
    }, [allVideos]);

    // Client-side stats computation — instant filter, no server call
    const stats = useMemo(() => {
        // Determine which channels are in scope
        let scopedChannelIds: Set<string>;
        if (selectedChannel) {
            scopedChannelIds = new Set([selectedChannel]);
        } else if (selectedTeam) {
            scopedChannelIds = new Set(
                Object.entries(channelTeamMap)
                    .filter(([, tid]) => tid === selectedTeam)
                    .map(([cid]) => cid)
            );
        } else {
            scopedChannelIds = new Set(allStats.map(s => s.channelId));
            allVideos.forEach(v => scopedChannelIds.add(v.channelId));
        }

        const scopedStats = allStats.filter(s => scopedChannelIds.has(s.channelId));

        // Filter videos by scope + month
        let videosForPeriod = allVideos.filter(v => scopedChannelIds.has(v.channelId));
        if (selectedMonth) {
            const [year, mon] = selectedMonth.split('-').map(Number);
            videosForPeriod = videosForPeriod.filter(v => {
                return v.createTime.getFullYear() === year && (v.createTime.getMonth() + 1) === mon;
            });
        }

        const totalViews = videosForPeriod.reduce((s, v) => s + (v.stats?.view || 0), 0);
        const totalComments = videosForPeriod.reduce((s, v) => s + (v.stats?.comment || 0), 0);
        const totalShares = videosForPeriod.reduce((s, v) => s + (v.stats?.share || 0), 0);
        const totalVideos = videosForPeriod.length;
        const totalFollowers = scopedStats.reduce((s, ch) => s + ch.followerCount, 0);

        // Per-channel aggregation for breakdown table
        const byChannel = new Map<string, { views: number; comments: number; shares: number; videos: number }>();
        videosForPeriod.forEach(v => {
            const cur = byChannel.get(v.channelId) || { views: 0, comments: 0, shares: 0, videos: 0 };
            cur.views += v.stats?.view || 0;
            cur.comments += v.stats?.comment || 0;
            cur.shares += v.stats?.share || 0;
            cur.videos += 1;
            byChannel.set(v.channelId, cur);
        });

        const channelBreakdown = scopedStats
            .map(s => {
                const agg = byChannel.get(s.channelId) || { views: 0, comments: 0, shares: 0, videos: 0 };
                return {
                    channelId: s.channelId,
                    channelName: s.channelOwnerName,
                    channelUsername: s.channelUsername,
                    followerCount: s.followerCount,
                    videoCount: agg.videos,
                    totalViews: agg.views,
                    totalComments: agg.comments,
                    totalShares: agg.shares,
                };
            })
            .filter(ch => ch.videoCount > 0 || !selectedMonth); // hide empty channels when month filtered

        return { totalViews, totalComments, totalShares, totalFollowers, totalVideos, activeChannels: scopedStats.length, channelBreakdown };
    }, [allVideos, allStats, channelTeamMap, selectedTeam, selectedChannel, selectedMonth]);

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                    <select
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(e.target.value)}
                        className="appearance-none rounded-xl border border-zinc-200/80 bg-white pl-4 pr-10 py-2.5 text-[13px] font-medium shadow-[0_2px_10px_rgba(0,0,0,0.02)] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-800 dark:bg-[#121212] dark:text-white transition-all"
                    >
                        <option value="">Tất cả thời gian</option>
                        {monthOptions.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                </div>

                {isAdmin && (
                    <>
                        <div className="relative">
                            <select
                                value={selectedTeam}
                                onChange={e => { setSelectedTeam(e.target.value); setSelectedChannel(""); }}
                                className="appearance-none rounded-xl border border-zinc-200/80 bg-white pl-4 pr-10 py-2.5 text-[13px] font-medium shadow-[0_2px_10px_rgba(0,0,0,0.02)] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-800 dark:bg-[#121212] dark:text-white transition-all"
                            >
                                <option value="">Tất cả mảng</option>
                                {teams.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                        </div>

                        <div className="relative">
                            <select
                                value={selectedChannel}
                                onChange={e => { setSelectedChannel(e.target.value); setSelectedTeam(""); }}
                                className="appearance-none rounded-xl border border-zinc-200/80 bg-white pl-4 pr-10 py-2.5 text-[13px] font-medium shadow-[0_2px_10px_rgba(0,0,0,0.02)] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-800 dark:bg-[#121212] dark:text-white max-w-[200px] truncate transition-all"
                            >
                                <option value="">Tất cả kênh</option>
                                {allChannels.map(ch => (
                                    <option key={ch.id} value={ch.id}>{ch.displayName}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                        </div>
                    </>
                )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3">
                {!isAdmin && hasChannel === false && (
                    <a
                        href={`/api/tiktok/login?userId=${user?.id}`}
                        className="flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:bg-blue-700 hover:shadow-[0_4px_14px_rgba(37,99,235,0.35)] active:scale-[0.98] transition-all"
                    >
                        <Link className="h-4 w-4 stroke-[2]" />
                        Kết nối TikTok
                    </a>
                )}
                {(isAdmin || hasChannel) && (
                    <button
                        onClick={doSync}
                        disabled={syncing || dataLoading}
                        className="flex items-center gap-2 rounded-xl border border-zinc-200/80 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:bg-zinc-50 hover:shadow-[0_4px_14px_rgba(0,0,0,0.05)] active:scale-[0.98] disabled:opacity-50 dark:border-zinc-800/80 dark:bg-[#121212] dark:text-zinc-300 dark:hover:bg-[#1a1a1a] transition-all"
                    >
                        <RefreshCw className={`h-4 w-4 stroke-[2] ${syncing ? "animate-spin" : ""}`} />
                        {syncing ? "Đang đồng bộ..." : isAdmin ? "Đồng bộ tất cả" : "Đồng bộ"}
                    </button>
                )}
            </div>

            {syncMsg && (
                <span className="w-full text-xs text-zinc-500">{syncMsg}</span>
            )}

            {/* Stat Cards */}
            {dataLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-white" />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
                        <StatCard title="Lượt xem" value={stats.totalViews} icon={Eye} color="blue" />
                        <StatCard title="Bình luận" value={stats.totalComments} icon={MessageCircle} color="green" />
                        <StatCard title="Chia sẻ" value={stats.totalShares} icon={Share2} color="orange" />
                        <StatCard title="Người theo dõi" value={stats.totalFollowers} icon={Users} color="purple" />
                        <StatCard title="Tổng video" value={stats.totalVideos} icon={Video} color="red" />
                        {isAdmin && (
                            <StatCard title="Kênh hoạt động" value={stats.activeChannels} icon={Tv} color="yellow" />
                        )}
                    </div>

                    {isAdmin && stats.channelBreakdown.length > 0 && (
                        <div className="overflow-x-auto rounded-[1.5rem] border border-zinc-100/50 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:border-zinc-800/50 dark:bg-[#121212]">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-zinc-100 dark:border-zinc-800/80">
                                        <th className="px-6 py-5 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-[#1a1a1a]/50">Kênh</th>
                                        <th className="px-6 py-5 text-right text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-[#1a1a1a]/50">Followers</th>
                                        <th className="px-6 py-5 text-right text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-[#1a1a1a]/50">Video</th>
                                        <th className="px-6 py-5 text-right text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-[#1a1a1a]/50">Lượt xem</th>
                                        <th className="px-6 py-5 text-right text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-[#1a1a1a]/50">Bình luận</th>
                                        <th className="px-6 py-5 text-right text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-[#1a1a1a]/50">Chia sẻ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.channelBreakdown.map((ch) => (
                                        <tr key={ch.channelId} className="border-b border-zinc-50/50 last:border-0 dark:border-zinc-800/30 hover:bg-zinc-50/50 dark:hover:bg-[#1a1a1a]/50 transition-colors">
                                            <td className="px-6 py-5">
                                                <div>
                                                    <span className="font-medium text-zinc-900 dark:text-white">{ch.channelName}</span>
                                                    {ch.channelUsername && (
                                                        <span className="ml-2 text-xs text-zinc-400">@{ch.channelUsername}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300">{ch.followerCount.toLocaleString("vi-VN")}</td>
                                            <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300">{ch.videoCount.toLocaleString("vi-VN")}</td>
                                            <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300">{ch.totalViews.toLocaleString("vi-VN")}</td>
                                            <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300">{ch.totalComments.toLocaleString("vi-VN")}</td>
                                            <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300">{ch.totalShares.toLocaleString("vi-VN")}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
