"use client";

import { useState, useMemo, useEffect } from "react";
import { ExternalLink, Loader2, RefreshCw, Link } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { Pagination } from "@/components/Pagination";
import { CustomSelect } from "@/components/CustomSelect";

export function CaNhanTab() {
    const { user, isAdmin } = useAuth();
    const { allVideos, channelTeamMap, teams, myChannels, hasChannel, dataLoading, syncing, doSync } = useData();
    const [selectedChannel, setSelectedChannel] = useState(""); // admin: filter by channel
    const [selectedTeam, setSelectedTeam] = useState("");       // admin: filter by team
    const [selectedMonth, setSelectedMonth] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 20;

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

    // Derive unique channels from allVideos for the channel dropdown (admin)
    const allChannels = useMemo(() => {
        const map = new Map<string, { id: string; displayName: string; username: string }>();
        allVideos.forEach(v => {
            if (!map.has(v.channelId)) {
                map.set(v.channelId, {
                    id: v.channelId,
                    displayName: v.channelDisplayName || v.channelUsername || v.channelId,
                    username: v.channelUsername || '',
                });
            }
        });
        return Array.from(map.values());
    }, [allVideos]);

    // Client-side filtering — instant, no server call
    const filteredVideos = useMemo(() => {
        let videos = allVideos;

        if (isAdmin && selectedChannel) {
            videos = videos.filter(v => v.channelId === selectedChannel);
        } else if (isAdmin && selectedTeam) {
            videos = videos.filter(v => channelTeamMap[v.channelId] === selectedTeam);
        }

        if (selectedMonth) {
            const [year, mon] = selectedMonth.split('-').map(Number);
            videos = videos.filter(v => {
                const d = v.createTime;
                return d.getFullYear() === year && (d.getMonth() + 1) === mon;
            });
        }

        return videos;
    }, [allVideos, channelTeamMap, selectedChannel, selectedTeam, selectedMonth, isAdmin]);

    useEffect(() => { setPage(1); }, [selectedChannel, selectedTeam, selectedMonth]);

    const totalPages = Math.ceil(filteredVideos.length / pageSize);
    const pagedVideos = filteredVideos.slice((page - 1) * pageSize, page * pageSize);

    const extractHashtags = (text: string) => {
        const matches = text.match(/#\w+/g);
        return matches ? matches.join(" ") : "";
    };

    return (
        <div className="space-y-6">
            {/* Header section (Filters + Actions) */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 w-full">
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    <CustomSelect
                        value={selectedMonth}
                        onChange={v => { setSelectedMonth(v); setPage(1); }}
                        options={monthOptions}
                        placeholder="Tất cả thời gian"
                    />

                    {isAdmin && (
                        <>
                            <CustomSelect
                                value={selectedTeam}
                                onChange={v => { setSelectedTeam(v); setSelectedChannel(""); setPage(1); }}
                                options={teams.map(t => ({ value: t.id, label: t.name }))}
                                placeholder="Tất cả mảng"
                            />

                            <CustomSelect
                                value={selectedChannel}
                                onChange={v => { setSelectedChannel(v); setSelectedTeam(""); setPage(1); }}
                                options={allChannels.map(ch => ({ value: ch.id, label: `${ch.displayName}${ch.username ? ` (@${ch.username})` : ""}` }))}
                                placeholder="Tất cả kênh"
                                className="max-w-[200px]"
                            />
                        </>
                    )}

                    {!dataLoading && (
                        <span className="text-xs font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 px-3 py-1.5 rounded-lg">{filteredVideos.length} video</span>
                    )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-3">
                    {!isAdmin && hasChannel === false && (
                        <a
                            href={`/api/tiktok/login?userId=${user?.id}`}
                            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:bg-blue-700 hover:shadow-[0_4px_14px_rgba(37,99,235,0.35)] active:scale-[0.98] transition-all"
                        >
                            <Link className="h-4 w-4 stroke-[2]" />
                            Kết nối TikTok
                        </a>
                    )}
                    {(isAdmin || hasChannel) && (
                        <button
                            onClick={doSync}
                            disabled={syncing || dataLoading}
                            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:bg-blue-700 hover:shadow-[0_4px_14px_rgba(37,99,235,0.35)] active:scale-[0.98] disabled:opacity-50 transition-all"
                        >
                            <RefreshCw className={`h-4 w-4 stroke-[2] ${syncing ? "animate-spin" : ""}`} />
                            {syncing ? "Đang đồng bộ..." : isAdmin ? "Đồng bộ tất cả" : "Đồng bộ"}
                        </button>
                    )}
                </div>
            </div>

            {/* Video Table */}
            {dataLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                </div>
            ) : pagedVideos.length > 0 ? (
                <>
                    <div className="overflow-x-auto rounded-xl border border-zinc-100/50 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:border-zinc-800/50 dark:bg-[#121212]">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-zinc-100 dark:border-zinc-800/80">
                                    <th className="px-6 py-5 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-[#1a1a1a]/50 w-12">STT</th>
                                    <th className="px-6 py-5 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-[#1a1a1a]/50 w-28">Thời gian</th>
                                    {isAdmin && <th className="px-6 py-5 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-[#1a1a1a]/50">Kênh</th>}
                                    <th className="px-6 py-5 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-[#1a1a1a]/50">Caption</th>
                                    <th className="px-6 py-5 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-[#1a1a1a]/50">Hashtag</th>
                                    <th className="px-6 py-5 text-center text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-[#1a1a1a]/50 w-10">Link</th>
                                    <th className="px-6 py-5 text-right text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-[#1a1a1a]/50">Lượt xem</th>
                                    <th className="px-6 py-5 text-right text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-[#1a1a1a]/50">Like</th>
                                    <th className="px-6 py-5 text-right text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-[#1a1a1a]/50">Comment</th>
                                    <th className="px-6 py-5 text-right text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-[#1a1a1a]/50">Share</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagedVideos.map((video, index) => {
                                    const caption = video.title || video.description || "";
                                    const captionClean = caption.replace(/#\w+/g, "").trim();
                                    const hashtags = extractHashtags(caption);

                                    return (
                                        <tr key={video.id} className="border-b border-zinc-50/50 last:border-0 dark:border-zinc-800/30 hover:bg-zinc-50/50 dark:hover:bg-[#1a1a1a]/50 transition-colors">
                                            <td className="px-6 py-4 text-zinc-400 font-medium">
                                                {(page - 1) * pageSize + index + 1}
                                            </td>
                                            <td className="px-6 py-4 text-xs font-semibold text-zinc-500 whitespace-nowrap">
                                                {video.createTime.toLocaleDateString("vi-VN")}
                                            </td>
                                            {isAdmin && (
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-bold tracking-tight text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800 px-2 py-1.5 rounded-lg whitespace-nowrap">
                                                        {video.channelDisplayName || video.channelUsername}
                                                    </span>
                                                </td>
                                            )}
                                            <td className="px-6 py-4 max-w-xs">
                                                <span className="line-clamp-2 leading-relaxed text-zinc-600 dark:text-zinc-400 font-medium" title={captionClean}>
                                                    {captionClean || "—"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 max-w-[180px]">
                                                <span className="line-clamp-1 leading-relaxed text-xs font-bold text-blue-500 dark:text-blue-400" title={hashtags}>
                                                    {hashtags || "—"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {video.link && (
                                                    <a href={video.link} target="_blank" rel="noopener noreferrer"
                                                        className="inline-flex text-zinc-400 hover:text-blue-500 transition-colors bg-white hover:bg-blue-50 dark:bg-zinc-800 dark:hover:bg-blue-900/30 p-2 rounded-lg border border-zinc-100 dark:border-zinc-700/50">
                                                        <ExternalLink className="h-4 w-4 stroke-[2.5]" />
                                                    </a>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-zinc-900 dark:text-white">
                                                {(video.stats?.view || 0).toLocaleString("vi-VN")}
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-zinc-600 dark:text-zinc-400">
                                                {(video.stats?.like || 0).toLocaleString("vi-VN")}
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-zinc-600 dark:text-zinc-400">
                                                {(video.stats?.comment || 0).toLocaleString("vi-VN")}
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-zinc-600 dark:text-zinc-400">
                                                {(video.stats?.share || 0).toLocaleString("vi-VN")}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                </>
            ) : (
                <div className="flex items-center justify-center py-20 text-zinc-400">
                    Không có video nào
                </div>
            )}
        </div>
    );
}
