"use client";

import { useState, useMemo, useEffect } from "react";
import { ExternalLink, RefreshCw, Link, ChevronUp, ChevronDown, Eye, Heart, MessageCircle, Share2, Film } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { Pagination } from "@/components/Pagination";
import { CustomSelect } from "@/components/CustomSelect";

export function CaNhanTab() {
    const { user, isAdmin } = useAuth();
    const { allVideos, channelTeamMap, teams, myChannels, hasChannel, videosLoading, metaLoading, syncing, doSync } = useData();
    const [selectedChannel, setSelectedChannel] = useState(""); // admin: filter by channel
    const [selectedTeam, setSelectedTeam] = useState("");       // admin: filter by team
    const [selectedMonth, setSelectedMonth] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
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

        // Apply sorting
        videos.sort((a, b) => {
            let aValue: number = 0;
            let bValue: number = 0;
            
            if (sortConfig.key === 'date') {
                aValue = a.createTime.getTime();
                bValue = b.createTime.getTime();
            } else if (sortConfig.key === 'view') {
                aValue = a.stats?.view || 0;
                bValue = b.stats?.view || 0;
            } else if (sortConfig.key === 'like') {
                aValue = a.stats?.like || 0;
                bValue = b.stats?.like || 0;
            } else if (sortConfig.key === 'comment') {
                aValue = a.stats?.comment || 0;
                bValue = b.stats?.comment || 0;
            } else if (sortConfig.key === 'share') {
                aValue = a.stats?.share || 0;
                bValue = b.stats?.share || 0;
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return videos;
    }, [allVideos, channelTeamMap, selectedChannel, selectedTeam, selectedMonth, isAdmin, sortConfig]);

    const statsSummary = useMemo(() => {
        let views = 0, likes = 0, comments = 0, shares = 0;
        filteredVideos.forEach(v => {
            views += v.stats?.view || 0;
            likes += v.stats?.like || 0;
            comments += v.stats?.comment || 0;
            shares += v.stats?.share || 0;
        });
        return { views, likes, comments, shares };
    }, [filteredVideos]);

    useEffect(() => { setPage(1); }, [selectedChannel, selectedTeam, selectedMonth]);

    const totalPages = Math.ceil(filteredVideos.length / pageSize);
    const pagedVideos = filteredVideos.slice((page - 1) * pageSize, page * pageSize);

    const extractHashtags = (text: string) => {
        const matches = text.match(/#\w+/g);
        return matches ? matches.join(" ") : "";
    };

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
        setPage(1);
    };

    const SortIcon = ({ sortKey }: { sortKey: string }) => {
        if (sortConfig.key !== sortKey) return <ChevronDown className="h-3 w-3 opacity-20 transition-opacity group-hover:opacity-100" />;
        return sortConfig.direction === 'asc' 
            ? <ChevronUp className="h-3 w-3 text-blue-500" /> 
            : <ChevronDown className="h-3 w-3 text-blue-500" />;
    };

    return (
        <div className="space-y-6">
            {/* Header section — luôn 1 hàng */}
            <div className="flex items-center gap-2 w-full">
                {/* Filters — flex-1 */}
                <div className="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-none">
                    <div className="shrink-0 min-w-[130px] flex-1 max-w-[180px]">
                        <CustomSelect
                            value={selectedMonth}
                            onChange={v => { setSelectedMonth(v); setPage(1); }}
                            options={monthOptions}
                            placeholder="Tất cả thời gian"
                        />
                    </div>

                    {isAdmin && (
                        <>
                            <div className="shrink-0 min-w-[120px] flex-1 max-w-[180px]">
                                <CustomSelect
                                    value={selectedTeam}
                                    onChange={v => { setSelectedTeam(v); setSelectedChannel(""); setPage(1); }}
                                    options={teams.map(t => ({ value: t.id, label: t.name }))}
                                    placeholder="Tất cả mảng"
                                />
                            </div>

                            <div className="shrink-0 min-w-[130px] flex-1 max-w-[200px]">
                                <CustomSelect
                                    value={selectedChannel}
                                    onChange={v => { setSelectedChannel(v); setSelectedTeam(""); setPage(1); }}
                                    options={allChannels.map(ch => ({ value: ch.id, label: `${ch.displayName}${ch.username ? ` (@${ch.username})` : ""}` }))}
                                    placeholder="Tất cả kênh"
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Actions — shrink-0 */}
                <div className="flex items-center gap-2 shrink-0">
                    {!isAdmin && hasChannel === false && !metaLoading && (
                        <a
                            href={`/api/tiktok/login?userId=${user?.id}`}
                            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-[12px] font-semibold text-white hover:bg-blue-700 active:scale-[0.98] transition-all whitespace-nowrap"
                        >
                            <Link className="h-3.5 w-3.5 stroke-[2]" />
                            Kết nối
                        </a>
                    )}
                    {(isAdmin || hasChannel) && (
                        <button
                            onClick={doSync}
                            disabled={syncing || videosLoading}
                            className="flex items-center cursor-pointer gap-1 rounded-lg bg-blue-600 px-3 py-2 text-[12px] font-semibold text-white hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 stroke-[2] ${syncing ? "animate-spin" : ""}`} />
                            {syncing ? "Đồng bộ..." : "Đồng bộ"}
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Summary row */}
            <div className="flex items-center flex-wrap gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
                {videosLoading ? (
                    <>
                        {[56, 80, 72, 80, 72].map((w, i) => (
                            <div key={i} className="h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" style={{ width: w }} />
                        ))}
                    </>
                ) : (
                    <>
                        {/* Video count */}
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 px-2.5 py-1.5 rounded-lg whitespace-nowrap">
                            <Film className="h-3.5 w-3.5" />
                            <span>{filteredVideos.length}</span>
                        </span>
                        {filteredVideos.length > 0 && (
                            <>
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 px-2.5 py-1.5 rounded-lg whitespace-nowrap">
                                    <Eye className="h-3.5 w-3.5" />
                                    <span>{statsSummary.views.toLocaleString('vi-VN')}</span>
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/30 dark:text-red-400 px-2.5 py-1.5 rounded-lg whitespace-nowrap">
                                    <Heart className="h-3.5 w-3.5" />
                                    <span>{statsSummary.likes.toLocaleString('vi-VN')}</span>
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-500 bg-green-50 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-1.5 rounded-lg whitespace-nowrap">
                                    <MessageCircle className="h-3.5 w-3.5" />
                                    <span>{statsSummary.comments.toLocaleString('vi-VN')}</span>
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-500 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400 px-2.5 py-1.5 rounded-lg whitespace-nowrap">
                                    <Share2 className="h-3.5 w-3.5" />
                                    <span>{statsSummary.shares.toLocaleString('vi-VN')}</span>
                                </span>
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Video Table */}
            {videosLoading ? (
                // Skeleton table rows
                <div className="overflow-x-auto rounded-xl border border-zinc-100/50 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:border-zinc-800/50 dark:bg-zinc-900">
                    <table className="w-full text-[11px] sm:text-[12px]">
                        <thead>
                            <tr className="border-b border-zinc-100 dark:border-zinc-800/80">
                                {['40px','80px',isAdmin ? '100px' : null,'1fr','120px','56px','80px','72px','80px','72px'].filter(Boolean).map((w, i) => (
                                    <th key={i} className="px-3 py-4 bg-zinc-50/50 dark:bg-zinc-900/50" style={{ width: w ?? 'auto' }}>
                                        <div className="h-3 rounded bg-zinc-200/70 dark:bg-zinc-700/50 animate-pulse" />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: 8 }).map((_, i) => (
                                <tr key={i} className="border-b border-zinc-50/50 last:border-0 dark:border-zinc-800/30">
                                    {[40, 70, ...(isAdmin ? [90] : []), 180, 100, 40, 60, 50, 60, 50].map((w, j) => (
                                        <td key={j} className="px-3 py-4">
                                            <div
                                                className="h-3.5 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse"
                                                style={{ width: w, opacity: 1 - i * 0.08 }}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : pagedVideos.length > 0 ? (
                <>
                    <div className="overflow-x-auto rounded-xl border border-zinc-100/50 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:border-zinc-800/50 dark:bg-zinc-900">
                        <table className="w-full text-[11px] sm:text-[12px]">
                            <thead>
                                <tr className="border-b border-zinc-100 dark:border-zinc-800/80">
                                    <th className="px-3 py-4 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50 min-w-[40px]" />
                                    <th className="px-3 py-4 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50 w-24 cursor-pointer group hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => handleSort('date')}>
                                        <div className="flex items-center gap-1.5">Thời gian <SortIcon sortKey="date" /></div>
                                    </th>
                                    {isAdmin && <th className="px-3 py-4 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50">Kênh</th>}
                                    <th className="px-3 py-4 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50">Caption</th>
                                    <th className="px-3 py-4 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50">Hashtag</th>
                                    <th className="px-3 py-4 text-center text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50 w-10">Link</th>
                                    <th className="px-3 py-4 text-right text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50 cursor-pointer group hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => handleSort('view')}>
                                        <div className="flex items-center justify-end gap-1.5"><SortIcon sortKey="view" /> <Eye className="h-3.5 w-3.5" /></div>
                                    </th>
                                    <th className="px-3 py-4 text-right text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50 cursor-pointer group hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => handleSort('like')}>
                                        <div className="flex items-center justify-end gap-1.5"><SortIcon sortKey="like" /> <Heart className="h-3.5 w-3.5" /></div>
                                    </th>
                                    <th className="px-3 py-4 text-right text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50 cursor-pointer group hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => handleSort('comment')}>
                                        <div className="flex items-center justify-end gap-1.5"><SortIcon sortKey="comment" /> <MessageCircle className="h-3.5 w-3.5" /></div>
                                    </th>
                                    <th className="px-3 py-4 text-right text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50 cursor-pointer group hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => handleSort('share')}>
                                        <div className="flex items-center justify-end gap-1.5"><SortIcon sortKey="share" /> <Share2 className="h-3.5 w-3.5" /></div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagedVideos.map((video, index) => {
                                    const caption = video.title || video.description || "";
                                    const captionClean = caption.replace(/#\w+/g, "").trim();
                                    const hashtags = extractHashtags(caption);

                                    return (
                                        <tr key={video.id} className="border-b border-zinc-50/50 last:border-0 dark:border-zinc-800/30 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                                            <td className="px-3 py-4 text-zinc-400 font-medium">
                                                {(page - 1) * pageSize + index + 1}
                                            </td>
                                            <td className="px-3 py-4 font-semibold text-zinc-500 whitespace-nowrap">
                                                {video.createTime.toLocaleDateString("vi-VN")}
                                            </td>
                                            {isAdmin && (
                                                <td className="px-3 py-4">
                                                    <span className="font-bold tracking-tight text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800 px-2 py-1.5 rounded-lg whitespace-nowrap">
                                                        {video.channelDisplayName || video.channelUsername}
                                                    </span>
                                                </td>
                                            )}
                                            <td className="px-3 py-4 max-w-[180px] md:max-w-[220px] relative group cursor-help hover:z-50">
                                                <div className="line-clamp-2 leading-relaxed text-zinc-600 dark:text-zinc-400 font-medium">
                                                    {captionClean || "—"}
                                                </div>
                                                {captionClean && (
                                                    <div className="absolute left-10 top-full mt-2 z-[100] hidden group-hover:block rounded-xl border border-zinc-200 bg-white p-3.5 font-medium leading-relaxed text-zinc-700 shadow-[0_10px_40px_rgba(0,0,0,0.12)] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 w-max max-w-[320px] whitespace-pre-wrap">
                                                        {captionClean}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3 py-4 max-w-[120px] md:max-w-[160px] relative group cursor-help hover:z-50">
                                                <div className="line-clamp-1 leading-relaxed font-bold text-blue-500 dark:text-blue-400 break-all whitespace-pre-wrap">
                                                    {hashtags || "—"}
                                                </div>
                                                {hashtags && (
                                                    <div className="absolute left-10 top-full mt-2 z-[100] hidden group-hover:block rounded-xl border border-blue-200/80 bg-blue-50 p-3.5 font-bold leading-relaxed text-blue-600 shadow-[0_10px_40px_rgba(37,99,235,0.12)] dark:border-blue-900/50 dark:bg-blue-950 dark:text-blue-400 w-max max-w-[280px] whitespace-pre-wrap">
                                                        {hashtags}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3 py-4 text-center">
                                                {video.link && (
                                                    <a href={video.link} target="_blank" rel="noopener noreferrer"
                                                        className="inline-flex text-zinc-400 hover:text-blue-500 transition-colors bg-white hover:bg-blue-50 dark:bg-zinc-800 dark:hover:bg-blue-900/30 p-2 rounded-lg border border-zinc-100 dark:border-zinc-700/50">
                                                        <ExternalLink className="h-4 w-4 stroke-[2.5]" />
                                                    </a>
                                                )}
                                            </td>
                                            <td className="px-3 py-4 text-right font-bold text-zinc-900 dark:text-white">
                                                {(video.stats?.view || 0).toLocaleString("vi-VN")}
                                            </td>
                                            <td className="px-3 py-4 text-right font-medium text-zinc-600 dark:text-zinc-400">
                                                {(video.stats?.like || 0).toLocaleString("vi-VN")}
                                            </td>
                                            <td className="px-3 py-4 text-right font-medium text-zinc-600 dark:text-zinc-400">
                                                {(video.stats?.comment || 0).toLocaleString("vi-VN")}
                                            </td>
                                            <td className="px-3 py-4 text-right font-medium text-zinc-600 dark:text-zinc-400">
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
