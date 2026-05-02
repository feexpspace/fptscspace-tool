"use client";

import { useState, useMemo } from "react";
import { Eye, MessageCircle, Share2, Users, Video, Tv, RefreshCw, Link, Heart, ChevronDown, ChevronUp, FileSpreadsheet } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { StatCard } from "@/components/StatCard";
import { CustomSelect } from "@/components/CustomSelect";

export function ThongKeTab() {
    const { user, isAdmin } = useAuth();
    const { allVideos, channelTeamMap, allStats, teams, projects, hasChannel, metaLoading, dataLoading, syncing, doSync } = useData();
    const [selectedTeam, setSelectedTeam] = useState("");
    const [selectedChannel, setSelectedChannel] = useState("");
    const [selectedMonth, setSelectedMonth] = useState("");
    const [selectedProject, setSelectedProject] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'views', direction: 'desc' });

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

    const allChannels = useMemo(() => {
        const map = new Map<string, { id: string; displayName: string; username: string }>();
        allVideos.forEach(v => {
            if (!map.has(v.channelId)) {
                map.set(v.channelId, { id: v.channelId, displayName: v.channelDisplayName || v.channelUsername || v.channelId, username: v.channelUsername || '' });
            }
        });
        return Array.from(map.values());
    }, [allVideos]);

    const allProjectOptions = useMemo(() => projects.map(p => ({ value: p.id, label: p.name })), [projects]);

    const stats = useMemo(() => {
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

        let videosForPeriod = allVideos.filter(v => scopedChannelIds.has(v.channelId));
        if (selectedMonth) {
            const [year, mon] = selectedMonth.split('-').map(Number);
            videosForPeriod = videosForPeriod.filter(v => {
                return v.createTime.getFullYear() === year && (v.createTime.getMonth() + 1) === mon;
            });
        }
        if (selectedProject) {
            videosForPeriod = videosForPeriod.filter(v => v.projectId === selectedProject);
        }

        const totalViews = videosForPeriod.reduce((s, v) => s + (v.stats?.view || 0), 0);
        const totalLikes = videosForPeriod.reduce((s, v) => s + (v.stats?.like || 0), 0);
        const totalComments = videosForPeriod.reduce((s, v) => s + (v.stats?.comment || 0), 0);
        const totalShares = videosForPeriod.reduce((s, v) => s + (v.stats?.share || 0), 0);
        const totalVideos = videosForPeriod.length;
        const totalFollowers = scopedStats.reduce((s, ch) => s + ch.followerCount, 0);

        const byChannel = new Map<string, { views: number; comments: number; shares: number; videos: number }>();
        videosForPeriod.forEach(v => {
            const cur = byChannel.get(v.channelId) || { views: 0, comments: 0, shares: 0, videos: 0 };
            cur.views += v.stats?.view || 0;
            cur.comments += v.stats?.comment || 0;
            cur.shares += v.stats?.share || 0;
            cur.videos += 1;
            byChannel.set(v.channelId, cur);
        });

        let breakdown = scopedStats
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
                    truong: s.truong,
                    coSo: s.coSo,
                };
            })
            .filter(ch => ch.videoCount > 0 || !selectedMonth);

        breakdown.sort((a, b) => {
            let aVal = 0; let bVal = 0;
            if (sortConfig.key === 'views') { aVal = a.totalViews; bVal = b.totalViews; }
            else if (sortConfig.key === 'followers') { aVal = a.followerCount; bVal = b.followerCount; }
            else if (sortConfig.key === 'videos') { aVal = a.videoCount; bVal = b.videoCount; }
            else if (sortConfig.key === 'comments') { aVal = a.totalComments; bVal = b.totalComments; }
            else if (sortConfig.key === 'shares') { aVal = a.totalShares; bVal = b.totalShares; }

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return { totalViews, totalLikes, totalComments, totalShares, totalFollowers, totalVideos, activeChannels: scopedStats.length, channelBreakdown: breakdown };
    }, [allVideos, allStats, channelTeamMap, selectedTeam, selectedChannel, selectedMonth, selectedProject, sortConfig]);

    const handleExportExcel = async () => {
        if (!selectedMonth) return;
        const xlsxModule = await import('xlsx');
        const XLSX = xlsxModule.default ?? xlsxModule;

        const [year, mon] = selectedMonth.split('-').map(Number);
        const videosInMonth = allVideos.filter(v =>
            v.createTime.getFullYear() === year && (v.createTime.getMonth() + 1) === mon
        );

        // Filter channels by selected team
        const scopedStats = selectedTeam
            ? allStats.filter(s => channelTeamMap[s.channelId] === selectedTeam)
            : allStats;

        // Build per-channel rows
        const rows = scopedStats.map((s, idx) => {
            const chVideos = videosInMonth.filter(v => v.channelId === s.channelId);
            const total = chVideos.length;

            const v10k  = chVideos.filter(v => (v.stats?.view || 0) >= 10_000);
            const v100k = chVideos.filter(v => (v.stats?.view || 0) >= 100_000);
            const v1m   = chVideos.filter(v => (v.stats?.view || 0) >= 1_000_000);
            const v5m   = chVideos.filter(v => (v.stats?.view || 0) >= 5_000_000);

            const chiPhiHoTro = total * 100_000;
            const bonus =
                v10k.length  * 100_000 +
                v100k.length * 500_000 +
                v1m.length   * 2_000_000 +
                v5m.length   * 4_000_000;

            return {
                'STT': idx + 1,
                'Họ tên': s.channelOwnerName,
                'Kênh': s.channelUsername ? `@${s.channelUsername}` : '',
                'Trường': s.truong || '',
                'Cơ sở': s.coSo || '',
                'Số video trong tháng': total,
                'Số video trên 10k view': v10k.length,
                'Link video >10k': v10k.map(v => v.link).filter(Boolean).join('\n'),
                'Số video trên 100k view': v100k.length,
                'Link video >100k': v100k.map(v => v.link).filter(Boolean).join('\n'),
                'Số video trên 1 triệu view': v1m.length,
                'Link video >1tr': v1m.map(v => v.link).filter(Boolean).join('\n'),
                'Số video trên 5 triệu view': v5m.length,
                'Link video >5tr': v5m.map(v => v.link).filter(Boolean).join('\n'),
                'Chi phí hỗ trợ video': chiPhiHoTro,
                'Bonus': bonus,
                'Tổng cộng': chiPhiHoTro + bonus,
            };
        }).filter(r => r['Số video trong tháng'] > 0);

        const ws = XLSX.utils.json_to_sheet(rows);

        // Column widths
        ws['!cols'] = [
            { wch: 5 }, { wch: 20 }, { wch: 18 }, { wch: 20 }, { wch: 12 },
            { wch: 18 }, { wch: 20 }, { wch: 50 }, { wch: 22 }, { wch: 50 },
            { wch: 24 }, { wch: 50 }, { wch: 24 }, { wch: 50 },
            { wch: 22 }, { wch: 22 }, { wch: 22 },
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Tháng ${mon}-${year}`);
        XLSX.writeFile(wb, `baocao_thang${mon}_${year}.xlsx`);
    };

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
        setSortConfig({ key, direction });
    };

    const SortIcon = ({ sortKey }: { sortKey: string }) => {
        if (sortConfig.key !== sortKey) return <ChevronDown className="h-3 w-3 opacity-20 transition-opacity group-hover:opacity-100" />;
        return sortConfig.direction === 'asc'
            ? <ChevronUp className="h-3 w-3 text-blue-500" />
            : <ChevronDown className="h-3 w-3 text-blue-500" />;
    };

    return (
        <div className="space-y-6">
            {/* Header section */}
            <div className="flex items-center gap-2 w-full">
                <div className="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-none">
                    <div className="shrink-0 min-w-[130px] flex-1 max-w-[180px]">
                        <CustomSelect
                            value={selectedMonth}
                            onChange={setSelectedMonth}
                            options={monthOptions}
                            placeholder="Tất cả thời gian"
                        />
                    </div>

                    {isAdmin && (
                        <>
                            <div className="shrink-0 min-w-[120px] flex-1 max-w-[180px]">
                                <CustomSelect
                                    value={selectedTeam}
                                    onChange={(val) => { setSelectedTeam(val); setSelectedChannel(""); }}
                                    options={teams.map(t => ({ value: t.id, label: t.name }))}
                                    placeholder="Tất cả mảng"
                                />
                            </div>

                            <div className="shrink-0 min-w-[130px] flex-1 max-w-[200px]">
                                <CustomSelect
                                    value={selectedChannel}
                                    onChange={(val) => { setSelectedChannel(val); setSelectedTeam(""); }}
                                    options={allChannels.map(ch => ({ value: ch.id, label: ch.displayName }))}
                                    placeholder="Tất cả kênh"
                                />
                            </div>
                        </>
                    )}

                    <div className="shrink-0 min-w-[130px] flex-1 max-w-[200px]">
                        <CustomSelect
                            value={selectedProject}
                            onChange={setSelectedProject}
                            options={allProjectOptions}
                            placeholder="Tất cả dự án"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {isAdmin && selectedMonth && (
                        <button
                            onClick={handleExportExcel}
                            disabled={dataLoading}
                            className="flex items-center gap-1 rounded-lg border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 h-[34px] px-3 text-[12px] font-semibold text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
                        >
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                            Xuất Excel
                        </button>
                    )}
                    {!isAdmin && hasChannel === false && (
                        <a
                            href={`/api/tiktok/login?userId=${user?.id}`}
                            className="flex items-center cursor-pointer gap-1 rounded-lg bg-blue-600 h-[34px] px-3 text-[12px] font-semibold text-white hover:bg-blue-700 active:scale-[0.98] transition-all whitespace-nowrap"
                        >
                            <Link className="h-3.5 w-3.5 stroke-[2]" />
                            Kết nối
                        </a>
                    )}
                    {(isAdmin || hasChannel) && (
                        <button
                            onClick={doSync}
                            disabled={syncing || dataLoading}
                            className="flex items-center cursor-pointer gap-1 rounded-lg bg-blue-600 h-[34px] px-3 text-[12px] font-semibold text-white hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 stroke-[2] ${syncing ? "animate-spin" : ""}`} />
                            {syncing ? "Đồng bộ..." : "Đồng bộ"}
                        </button>
                    )}
                </div>
            </div>

            {/* Stat Cards */}
            {metaLoading ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
                                <div className="h-3 w-16 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                                <div className="h-7 w-24 rounded bg-zinc-200/70 dark:bg-zinc-700/50 animate-pulse" />
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
                                <div className="h-3 w-14 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                                <div className="h-7 w-20 rounded bg-zinc-200/70 dark:bg-zinc-700/50 animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <>
                    {isAdmin ? (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4">
                                <StatCard title="Lượt xem" value={stats.totalViews} icon={Eye} color="blue" />
                                <StatCard title="Người theo dõi" value={stats.totalFollowers} icon={Users} color="purple" />
                                <StatCard title="Kênh hoạt động" value={stats.activeChannels} icon={Tv} color="yellow" className="col-span-2 md:col-span-1" />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <StatCard title="Like" value={stats.totalLikes} icon={Heart} color="rose" />
                                <StatCard title="Bình luận" value={stats.totalComments} icon={MessageCircle} color="green" />
                                <StatCard title="Chia sẻ" value={stats.totalShares} icon={Share2} color="orange" />
                                <StatCard title="Tổng video" value={stats.totalVideos} icon={Video} color="red" />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
                                <StatCard title="Lượt xem" value={stats.totalViews} icon={Eye} color="blue" />
                                <StatCard title="Người theo dõi" value={stats.totalFollowers} icon={Users} color="purple" />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <StatCard title="Like" value={stats.totalLikes} icon={Heart} color="rose" />
                                <StatCard title="Bình luận" value={stats.totalComments} icon={MessageCircle} color="green" />
                                <StatCard title="Chia sẻ" value={stats.totalShares} icon={Share2} color="orange" />
                                <StatCard title="Tổng video" value={stats.totalVideos} icon={Video} color="red" />
                            </div>
                        </>
                    )}

                    {isAdmin && stats.channelBreakdown.length > 0 && (
                        <div className="overflow-x-auto rounded-xl border border-zinc-100/50 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:border-zinc-800/50 dark:bg-[#121212]">
                            <table className="w-full text-[11px] sm:text-[12px]">
                                <thead>
                                    <tr className="border-b border-zinc-100 dark:border-zinc-800/80">
                                        <th className="px-6 py-5 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50">Kênh</th>
                                        <th className="px-4 py-5 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50 whitespace-nowrap">Trường</th>
                                        <th className="px-4 py-5 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50 whitespace-nowrap">Cơ sở</th>
                                        <th className="px-6 py-5 text-right text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50 cursor-pointer group hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => handleSort('followers')}>
                                            <div className="flex items-center justify-end gap-1.5"><SortIcon sortKey="followers" /> Followers</div>
                                        </th>
                                        <th className="px-6 py-5 text-right text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50 cursor-pointer group hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => handleSort('videos')}>
                                            <div className="flex items-center justify-end gap-1.5"><SortIcon sortKey="videos" /> Video</div>
                                        </th>
                                        <th className="px-6 py-5 text-right text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50 cursor-pointer group hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => handleSort('views')}>
                                            <div className="flex items-center justify-end gap-1.5"><SortIcon sortKey="views" /> Lượt xem</div>
                                        </th>
                                        <th className="px-6 py-5 text-right text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50 cursor-pointer group hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => handleSort('comments')}>
                                            <div className="flex items-center justify-end gap-1.5"><SortIcon sortKey="comments" /> Bình luận</div>
                                        </th>
                                        <th className="px-6 py-5 text-right text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50 cursor-pointer group hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => handleSort('shares')}>
                                            <div className="flex items-center justify-end gap-1.5"><SortIcon sortKey="shares" /> Chia sẻ</div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.channelBreakdown.map((ch) => (
                                        <tr key={ch.channelId} className="border-b border-zinc-50/50 last:border-0 dark:border-zinc-800/30 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                                            <td className="px-6 py-5">
                                                <div>
                                                    <span className="font-medium text-zinc-900 dark:text-white">{ch.channelName}</span>
                                                    {ch.channelUsername && (
                                                        <span className="ml-1.5 text-zinc-400">@{ch.channelUsername}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                {ch.truong ? (
                                                    <span className="inline-flex rounded-lg px-2 py-0.5 text-[10px] font-semibold bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 whitespace-nowrap">
                                                        {ch.truong}
                                                    </span>
                                                ) : (
                                                    <span className="text-zinc-300 dark:text-zinc-600">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                {ch.coSo ? (
                                                    <span className="inline-flex rounded-lg px-2 py-0.5 text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 whitespace-nowrap">
                                                        {ch.coSo}
                                                    </span>
                                                ) : (
                                                    <span className="text-zinc-300 dark:text-zinc-600">—</span>
                                                )}
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
