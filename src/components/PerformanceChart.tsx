// src/components/PerformanceChart.tsx
"use client";

import { cn } from "@/lib/utils";
import { OverviewCards } from "./OverviewCards";

interface PerformanceChartProps {
    selectedYear: number;
    setSelectedYear: (year: number) => void; // Thêm Prop này
    years: number[]; // Thêm Prop này
    months: number[];
    selectedMonthTab: number;
    setSelectedMonthTab: (month: number) => void;
    totalMonthlyStats: {
        followers: number;
        videos: number;
        views: number;
        interactions: number;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    monthlyDataForTab: any[];
}

export function PerformanceChart({
    selectedYear,
    setSelectedYear,
    years,
    months,
    selectedMonthTab,
    setSelectedMonthTab,
    totalMonthlyStats,
    monthlyDataForTab
}: PerformanceChartProps) {
    return (
        <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 print:border-t-2 print:border-black print:mt-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                {/* TIÊU ĐỀ VÀ CHỌN NĂM */}
                <div className="flex items-center gap-3">
                    <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 border-l-4 border-black dark:border-white pl-3">
                        Chi tiết theo tháng trong năm
                    </h3>

                    {/* Dropdown chọn năm */}
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="appearance-none bg-zinc-100 border border-zinc-200 text-zinc-900 text-sm font-bold rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-zinc-200 focus:outline-none cursor-pointer dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 transition-all shadow-sm print:hidden"
                    >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>

                    {/* Text hiển thị năm khi in ấn */}
                    <span className="hidden print:inline-block font-bold text-lg text-black">({selectedYear})</span>
                </div>

                {/* Tabs Tháng (Ẩn khi in ấn) */}
                <div className="flex overflow-x-auto bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg custom-scrollbar print:hidden">
                    {months.map((m) => (
                        <button
                            key={m}
                            onClick={() => setSelectedMonthTab(m)}
                            className={cn(
                                "px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap",
                                selectedMonthTab === m
                                    ? "bg-white text-black shadow-sm dark:bg-zinc-800 dark:text-white"
                                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                            )}
                        >
                            T{m}
                        </button>
                    ))}
                </div>

                {/* Tiêu đề in ấn hiển thị tháng đang chọn */}
                <div className="hidden print:block font-bold text-xl text-black">
                    Tháng {selectedMonthTab}
                </div>
            </div>

            <OverviewCards stats={totalMonthlyStats} />

            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm mt-4 print:border-zinc-300">
                <div className="overflow-x-auto p-0">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400 print:bg-zinc-100 print:text-black">
                            <tr>
                                <th className="px-6 py-3 font-semibold w-16 text-center">#</th>
                                <th className="px-6 py-3 font-semibold">Tên Kênh</th>
                                <th className="px-6 py-3 font-semibold text-right">Followers</th>
                                <th className="px-6 py-3 font-semibold text-right">Videos (Tháng)</th>
                                <th className="px-6 py-3 font-semibold text-right">Views (Tháng)</th>
                                <th className="px-6 py-3 font-semibold text-right">Tương tác (Tháng)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 print:divide-zinc-200">
                            {monthlyDataForTab.length > 0 ? monthlyDataForTab.map((c, idx) => (
                                <tr key={c.channelId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors break-inside-avoid">
                                    <td className="px-6 py-4 text-zinc-400 text-center print:text-black">{idx + 1}</td>
                                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100 print:text-black">{c.channelName}</td>
                                    <td className="px-6 py-4 text-right text-zinc-500 dark:text-zinc-400 tabular-nums print:text-black">
                                        {c.hasData ? c.followers.toLocaleString() : "-"}
                                    </td>
                                    <td className="px-6 py-4 text-right text-zinc-500 dark:text-zinc-400 tabular-nums print:text-black">
                                        {c.hasData ? c.videos.toLocaleString() : "-"}
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-emerald-600 dark:text-emerald-400 tabular-nums print:text-emerald-700">
                                        {c.hasData ? c.views.toLocaleString() : "-"}
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-orange-600 dark:text-orange-500 tabular-nums print:text-orange-700">
                                        {c.hasData ? c.interactions.toLocaleString() : "-"}
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={6} className="p-8 text-center text-zinc-500">Chưa có kênh nào.</td></tr>
                            )}
                            {monthlyDataForTab.length > 0 && monthlyDataForTab.every(d => !d.hasData) && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-zinc-400 italic bg-zinc-50/50 dark:bg-zinc-900/50 print:bg-white print:text-black">
                                        Chưa có dữ liệu thống kê cho Tháng {selectedMonthTab}/{selectedYear}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}