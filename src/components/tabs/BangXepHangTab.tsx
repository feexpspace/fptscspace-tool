"use client";

import { useState, useEffect, useMemo } from "react";
import { Trophy, Medal, Star } from "lucide-react";
import { getGlobalLeaderboard, ChannelBreakdown } from "@/app/actions/stats";
import { CustomSelect } from "@/components/CustomSelect";

export function BangXepHangTab() {
    const [leaderboard, setLeaderboard] = useState<ChannelBreakdown[]>([]);
    const [loading, setLoading] = useState(true);
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

    useEffect(() => {
        let isMounted = true;
        const fetchLeaderboard = async () => {
            setLoading(true);
            const data = await getGlobalLeaderboard(selectedMonth || undefined);
            if (isMounted) {
                setLeaderboard(data);
                setLoading(false);
            }
        };
        fetchLeaderboard();
        return () => { isMounted = false; };
    }, [selectedMonth]);

    return (
        <div className="space-y-6">
            {/* Header / Filter */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                        <Trophy className="h-6 w-6 text-yellow-500" />
                        Bảng Xếp Hạng Kênh
                    </h2>
                    <p className="text-sm text-zinc-500 mt-1 dark:text-zinc-400">
                        Top các kênh xuất sắc nhất theo lượt xem
                    </p>
                </div>
                <div className="w-48">
                    <CustomSelect
                        value={selectedMonth}
                        onChange={setSelectedMonth}
                        options={[{ value: "", label: "Tất cả thời gian" }, ...monthOptions]}
                        placeholder="Tất cả thời gian"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-zinc-100/50 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:border-zinc-800/50 dark:bg-[#121212]">
                <table className="w-full text-sm relative">
                    <thead>
                        <tr className="border-b border-zinc-100 dark:border-zinc-800/80">
                            <th className="px-6 py-5 text-center w-20 text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50">Top</th>
                            <th className="px-6 py-5 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50">Kênh</th>
                            <th className="px-6 py-5 text-right text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50">View</th>
                            <th className="px-6 py-5 text-right text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50">Follow</th>
                            <th className="px-6 py-5 text-right text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50">Video</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="py-20 text-center">
                                    <div className="flex items-center justify-center">
                                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-white" />
                                    </div>
                                </td>
                            </tr>
                        ) : leaderboard.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-12 text-center text-zinc-500 font-medium">
                                    Không có dữ liệu trong khoảng thời gian này.
                                </td>
                            </tr>
                        ) : (
                            leaderboard.map((ch, index) => {
                                const rank = index + 1;
                                return (
                                    <tr key={ch.channelId} className="border-b border-zinc-50/50 last:border-0 dark:border-zinc-800/30 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                                        <td className="px-6 py-5 text-center">
                                            {rank === 1 ? (
                                                <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400 font-bold shadow-sm ring-1 ring-yellow-200 dark:ring-yellow-800/50">
                                                    <Trophy className="h-4 w-4" />
                                                </div>
                                            ) : rank === 2 ? (
                                                <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300 font-bold shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
                                                    <Medal className="h-4 w-4" />
                                                </div>
                                            ) : rank === 3 ? (
                                                <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 font-bold shadow-sm ring-1 ring-orange-200 dark:ring-orange-800/50">
                                                    <Medal className="h-4 w-4" />
                                                </div>
                                            ) : (
                                                <div className="font-bold text-zinc-400 dark:text-zinc-500">
                                                    {rank}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div>
                                                    <span className={`font-bold ${rank <= 3 ? 'text-zinc-900 dark:text-white text-[15px]' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                                        {ch.channelName}
                                                    </span>
                                                    {ch.channelUsername && (
                                                        <span className="block mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">@{ch.channelUsername}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <span className={`font-bold ${rank === 1 ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-900 dark:text-white'}`}>
                                                {ch.totalViews.toLocaleString("vi-VN")}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right font-medium text-zinc-600 dark:text-zinc-400">
                                            {ch.followerCount.toLocaleString("vi-VN")}
                                        </td>
                                        <td className="px-6 py-5 text-right font-medium text-zinc-600 dark:text-zinc-400">
                                            {ch.videoCount.toLocaleString("vi-VN")}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
