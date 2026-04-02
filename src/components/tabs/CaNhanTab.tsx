"use client";

import { useState, useMemo, useEffect } from "react";
import { ExternalLink, Loader2, RefreshCw, Link } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { Pagination } from "@/components/Pagination";

export function CaNhanTab() {
    const { user, isAdmin } = useAuth();
    const { allVideos, channelTeamMap, teams, hasChannel, dataLoading, syncing, syncMsg, doSync } = useData();
    const [selectedTeam, setSelectedTeam] = useState("");
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

    // Client-side filtering — instant, no server call
    const filteredVideos = useMemo(() => {
        let videos = allVideos;

        if (selectedTeam) {
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
    }, [allVideos, channelTeamMap, selectedTeam, selectedMonth]);

    // Reset to page 1 on filter change
    useEffect(() => { setPage(1); }, [selectedTeam, selectedMonth]);

    const totalPages = Math.ceil(filteredVideos.length / pageSize);
    const pagedVideos = filteredVideos.slice((page - 1) * pageSize, page * pageSize);

    const extractHashtags = (text: string) => {
        const matches = text.match(/#\w+/g);
        return matches ? matches.join(" ") : "";
    };

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <select
                    value={selectedMonth}
                    onChange={e => { setSelectedMonth(e.target.value); setPage(1); }}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                >
                    <option value="">Tất cả thời gian</option>
                    {monthOptions.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                </select>

                {isAdmin && (
                    <select
                        value={selectedTeam}
                        onChange={e => { setSelectedTeam(e.target.value); setPage(1); }}
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                    >
                        <option value="">Tất cả Mảng</option>
                        {teams.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                )}

                {!dataLoading && (
                    <span className="text-xs text-zinc-400">
                        {filteredVideos.length} video
                    </span>
                )}

                <div className="ml-auto flex items-center gap-2">
                    {!isAdmin && hasChannel === false && (
                        <a
                            href={`/api/tiktok/login?userId=${user?.id}`}
                            className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
                        >
                            <Link className="h-4 w-4" />
                            Kết nối TikTok
                        </a>
                    )}

                    {(isAdmin || hasChannel) && (
                        <button
                            onClick={doSync}
                            disabled={syncing || dataLoading}
                            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        >
                            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                            {syncing ? "Đang đồng bộ..." : isAdmin ? "Đồng bộ tất cả" : "Đồng bộ"}
                        </button>
                    )}
                </div>

                {syncMsg && (
                    <span className="w-full text-xs text-zinc-500">{syncMsg}</span>
                )}
            </div>

            {/* Video Table */}
            {dataLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                </div>
            ) : pagedVideos.length > 0 ? (
                <>
                    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                                    <th className="px-3 py-3 text-left font-medium text-zinc-500 w-12">STT</th>
                                    <th className="px-3 py-3 text-left font-medium text-zinc-500 w-28">Thời gian</th>
                                    {isAdmin && <th className="px-3 py-3 text-left font-medium text-zinc-500">Kênh</th>}
                                    <th className="px-3 py-3 text-left font-medium text-zinc-500">Caption</th>
                                    <th className="px-3 py-3 text-left font-medium text-zinc-500">Hashtag</th>
                                    <th className="px-3 py-3 text-center font-medium text-zinc-500 w-10">Link</th>
                                    <th className="px-3 py-3 text-right font-medium text-zinc-500">Lượt xem</th>
                                    <th className="px-3 py-3 text-right font-medium text-zinc-500">Like</th>
                                    <th className="px-3 py-3 text-right font-medium text-zinc-500">Comment</th>
                                    <th className="px-3 py-3 text-right font-medium text-zinc-500">Share</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagedVideos.map((video, index) => {
                                    const caption = video.title || video.description || "";
                                    const captionClean = caption.replace(/#\w+/g, "").trim();
                                    const hashtags = extractHashtags(caption);

                                    return (
                                        <tr key={video.id} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                                            <td className="px-3 py-2.5 text-zinc-400">
                                                {(page - 1) * pageSize + index + 1}
                                            </td>
                                            <td className="px-3 py-2.5 text-xs text-zinc-500 whitespace-nowrap">
                                                {video.createTime.toLocaleDateString("vi-VN")}
                                            </td>
                                            {isAdmin && (
                                                <td className="px-3 py-2.5">
                                                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                                        {video.channelDisplayName || video.channelUsername}
                                                    </span>
                                                </td>
                                            )}
                                            <td className="px-3 py-2.5 max-w-xs">
                                                <span className="line-clamp-2 text-zinc-700 dark:text-zinc-300" title={captionClean}>
                                                    {captionClean || "—"}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 max-w-[180px]">
                                                <span className="line-clamp-1 text-xs text-blue-500" title={hashtags}>
                                                    {hashtags || "—"}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 text-center">
                                                {video.link && (
                                                    <a
                                                        href={video.link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex text-zinc-400 hover:text-blue-500 transition-colors"
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                    </a>
                                                )}
                                            </td>
                                            <td className="px-3 py-2.5 text-right font-medium text-zinc-700 dark:text-zinc-300">
                                                {(video.stats?.view || 0).toLocaleString("vi-VN")}
                                            </td>
                                            <td className="px-3 py-2.5 text-right text-zinc-600 dark:text-zinc-400">
                                                {(video.stats?.like || 0).toLocaleString("vi-VN")}
                                            </td>
                                            <td className="px-3 py-2.5 text-right text-zinc-600 dark:text-zinc-400">
                                                {(video.stats?.comment || 0).toLocaleString("vi-VN")}
                                            </td>
                                            <td className="px-3 py-2.5 text-right text-zinc-600 dark:text-zinc-400">
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
