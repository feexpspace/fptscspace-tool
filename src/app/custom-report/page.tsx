// src/app/custom-report/page.tsx
"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getCustomReportData } from "@/app/actions/dashboard";
import { Channel, Statistic, MonthlyStatistic } from "@/types";
import { Loader2, Printer, LayoutDashboard } from "lucide-react";
import Image from "next/image";

import { OverviewCards } from "@/components/OverviewCards";
import { PerformanceChart } from "@/components/PerformanceChart";

function ReportContent() {
    const searchParams = useSearchParams();
    const idsParam = searchParams.get('ids');
    const yearParam = searchParams.get('year');

    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<{
        channels: Channel[];
        latestStats: Statistic[];
        monthlyStats: MonthlyStatistic[];
    }>({ channels: [], latestStats: [], monthlyStats: [] });

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

    // [THAY ĐỔI]: Biến selectedYear thành State để có thể cập nhật
    const [selectedYear, setSelectedYear] = useState(parseInt(yearParam || currentYear.toString(), 10));

    const currentMonth = new Date().getMonth() + 1;
    const [selectedMonthTab, setSelectedMonthTab] = useState(currentMonth);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    // [THAY ĐỔI]: Chạy lại useEffect mỗi khi selectedYear thay đổi
    useEffect(() => {
        const fetchData = async () => {
            if (!idsParam) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true); // Bật loading khi chuyển năm
            const ids = idsParam.split(',');
            const reportData = await getCustomReportData(ids, selectedYear);
            setData(reportData);
            setIsLoading(false);

            // Cập nhật lại thanh địa chỉ URL một cách im lặng để khi Copy Link vẫn đúng năm đang chọn
            const newUrl = `/custom-report?ids=${idsParam}&year=${selectedYear}`;
            window.history.replaceState(null, '', newUrl);
        };

        fetchData();
    }, [idsParam, selectedYear]);

    // ==========================================
    // CÁC KHỐI USEMEMO TÍNH TOÁN DỮ LIỆU
    // ==========================================

    const overviewFixedData = useMemo(() => {
        return data.channels.map((channel, index) => {
            const stat = data.latestStats.find(s => s.channelId === channel.id);
            return {
                stt: index + 1,
                id: channel.id,
                name: channel.displayName,
                username: channel.username,
                avatar: channel.avatar,
                followers: stat?.followerCount || channel.follower || 0,
                videos: stat?.videoCount || 0,
                views: stat?.totalViews || 0,
                interactions: stat?.totalInteractions || 0,
            };
        });
    }, [data.channels, data.latestStats]);

    const monthlyDataForTab = useMemo(() => {
        const targetMonthKey = `${selectedYear}-${selectedMonthTab.toString().padStart(2, '0')}`;
        return data.channels.map(channel => {
            const mStat = data.monthlyStats.find(s =>
                s.channelId === channel.id &&
                s.month === targetMonthKey
            );
            return {
                channelId: channel.id,
                channelName: channel.displayName,
                hasData: !!mStat,
                followers: mStat?.followerCount || 0,
                videos: mStat?.videoCount || 0,
                views: mStat?.totalViews || 0,
                interactions: mStat?.totalInteractions || 0,
            };
        });
    }, [data.channels, data.monthlyStats, selectedYear, selectedMonthTab]);

    const totalFixedStats = useMemo(() => {
        return overviewFixedData.reduce((acc, curr) => ({
            followers: acc.followers + curr.followers,
            videos: acc.videos + curr.videos,
            views: acc.views + curr.views,
            interactions: acc.interactions + curr.interactions,
        }), { followers: 0, videos: 0, views: 0, interactions: 0 });
    }, [overviewFixedData]);

    const totalMonthlyStats = useMemo(() => {
        return monthlyDataForTab.reduce((acc, curr) => ({
            followers: acc.followers + (curr.hasData ? curr.followers : 0),
            videos: acc.videos + (curr.hasData ? curr.videos : 0),
            views: acc.views + (curr.hasData ? curr.views : 0),
            interactions: acc.interactions + (curr.hasData ? curr.interactions : 0),
        }), { followers: 0, videos: 0, views: 0, interactions: 0 });
    }, [monthlyDataForTab]);

    // ==========================================
    // GIAO DIỆN HIỂN THỊ
    // ==========================================

    // Chỉ chặn hiển thị Loading toàn màn hình trong lần đầu tiên tải trang
    if (isLoading && data.channels.length === 0) {
        return (
            <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
                <Loader2 className="animate-spin text-zinc-500 h-8 w-8" />
            </div>
        );
    }

    if (data.channels.length === 0) {
        return (
            <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
                Không tìm thấy dữ liệu báo cáo.
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-4 md:p-8 font-sans relative">

            {/* Hiển thị thanh Loading nhỏ ở góc nếu đang tải dữ liệu khi chuyển năm */}
            {isLoading && (
                <div className="fixed top-4 right-4 bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg z-50">
                    <Loader2 className="animate-spin h-4 w-4" /> Đang tải dữ liệu...
                </div>
            )}

            <div className="max-w-7xl mx-auto space-y-10 bg-white dark:bg-zinc-950 p-6 md:p-10 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 print:border-none print:shadow-none">

                {/* HEADER */}
                <header className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-6 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <LayoutDashboard className="h-6 w-6" />
                            Báo Cáo Tùy Chỉnh
                        </h1>
                        <p className="text-sm text-zinc-500 mt-1">
                            Báo cáo tổng hợp cho <span className="font-bold text-black dark:text-white">{data.channels.length}</span> kênh được chọn
                        </p>
                    </div>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 bg-black text-white dark:bg-white dark:text-black px-5 py-2.5 rounded-lg font-bold shadow-sm hover:opacity-80 transition-opacity print:hidden"
                    >
                        <Printer className="h-4 w-4" /> In Báo Cáo
                    </button>
                </header>

                {/* BẢNG TỔNG HỢP TÍCH LŨY */}
                <div className="space-y-4">
                    <OverviewCards stats={totalFixedStats} title="Thống kê Kênh (Tích lũy toàn thời gian)" />

                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden print:border-zinc-300 print:shadow-none break-inside-avoid mt-4">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 print:bg-zinc-100 print:text-black">
                                    <tr>
                                        <th className="px-6 py-3 w-16 text-center">#</th>
                                        <th className="px-6 py-3">Tên Kênh</th>
                                        <th className="px-6 py-3 text-right">Followers</th>
                                        <th className="px-6 py-3 text-right">Videos</th>
                                        <th className="px-6 py-3 text-right">Views</th>
                                        <th className="px-6 py-3 text-right">Tương tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 print:divide-zinc-200">
                                    {overviewFixedData.length > 0 ? overviewFixedData.map((row) => (
                                        <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors break-inside-avoid">
                                            <td className="px-6 py-4 text-zinc-500 text-center print:text-black">{row.stt}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 rounded-full bg-zinc-200 dark:bg-zinc-800 relative overflow-hidden border border-zinc-200 dark:border-zinc-700">
                                                        {row.avatar && <Image src={row.avatar} alt="" fill className="object-cover" />}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-zinc-900 dark:text-zinc-100 print:text-black">{row.name}</div>
                                                        <div className="text-xs text-zinc-500 print:text-zinc-600">@{row.username}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-right tabular-nums text-zinc-700 dark:text-zinc-300 print:text-black">{row.followers.toLocaleString()}</td>
                                            <td className="px-6 py-4 font-medium text-right tabular-nums text-zinc-700 dark:text-zinc-300 print:text-black">{row.videos.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right font-bold tabular-nums text-blue-600 dark:text-blue-400 print:text-blue-700">{row.views.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right font-bold tabular-nums text-green-600 dark:text-green-400 print:text-green-700">{row.interactions.toLocaleString()}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-zinc-500 italic">Chưa có kênh nào trong báo cáo này.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* BẢNG CHI TIẾT THEO THÁNG */}
                <PerformanceChart
                    selectedYear={selectedYear}
                    setSelectedYear={setSelectedYear} // THÊM DÒNG NÀY
                    years={years} // THÊM DÒNG NÀY
                    months={months}
                    selectedMonthTab={selectedMonthTab}
                    setSelectedMonthTab={setSelectedMonthTab}
                    totalMonthlyStats={totalMonthlyStats}
                    monthlyDataForTab={monthlyDataForTab}
                />
            </div>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950">
                <Loader2 className="animate-spin text-zinc-500 h-8 w-8" />
            </div>
        }>
            <ReportContent />
        </Suspense>
    );
}