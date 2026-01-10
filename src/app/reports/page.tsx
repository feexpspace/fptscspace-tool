// src/app/reports/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { Video, Channel } from "@/types";
import { RefreshCw, ExternalLink, Calendar } from "lucide-react";
import { getVideosFromDB, syncTikTokVideos } from "@/app/actions/report";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function ReportsPage() {
    const { user, loading } = useAuth();

    // State quản lý bộ lọc thời gian
    const currentDate = new Date();
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1); // 1-12

    // State dữ liệu
    const [videos, setVideos] = useState<Video[]>([]);
    const [channel, setChannel] = useState<Channel | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);

    const [channels, setChannels] = useState<Channel[]>([]);
    const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

    // Lấy danh sách 5 năm gần nhất
    const years = Array.from({ length: 8 }, (_, i) => currentDate.getFullYear() - i);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    // 1. Lấy thông tin Channel của User
    useEffect(() => {
        const fetchChannel = async () => {
            if (!user) return;
            const q = query(collection(db, "channels"), where("userId", "==", user.id));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                const chData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Channel;
                setChannel(chData);
            }
        };
        fetchChannel();
    }, [user]);

    // 2. Fetch dữ liệu Video khi thay đổi Năm/Tháng/Channel
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

    // Hàm xử lý đồng bộ
    const handleSync = async () => {
        if (!user || !channel) return;
        setIsSyncing(true);
        await syncTikTokVideos(user.id, channel.id);
        // Sau khi sync xong, load lại dữ liệu bảng hiện tại
        const data = await getVideosFromDB(channel.id, selectedYear, selectedMonth);
        setVideos(data);
        setIsSyncing(false);
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
            <Sidebar />

            <main className="flex-1 flex flex-col h-screen overflow-hidden p-8">

                {/* Header & Controls */}
                <div className="flex flex-col gap-6 mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">Báo cáo Video</h1>
                            <p className="text-zinc-500">
                                {channel ? `Dữ liệu kênh: ${channel.displayName}` : "Chưa kết nối kênh TikTok"}
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            {/* Chọn Năm */}
                            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-zinc-200 dark:bg-black dark:border-zinc-800">
                                <Calendar className="h-4 w-4 text-zinc-500" />
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                                    className="bg-transparent outline-none text-sm font-medium"
                                >
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>

                            {/* Nút Đồng bộ */}
                            <button
                                onClick={handleSync}
                                disabled={isSyncing || !channel}
                                className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black transition-all"
                            >
                                <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                                {isSyncing ? "Đang đồng bộ..." : "Đồng bộ từ TikTok"}
                            </button>
                        </div>
                    </div>

                    {/* Tab Tháng */}
                    <div className="flex overflow-x-auto border-b border-zinc-200 dark:border-zinc-800">
                        {months.map((m) => (
                            <button
                                key={m}
                                onClick={() => setSelectedMonth(m)}
                                className={cn(
                                    "px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                                    selectedMonth === m
                                        ? "border-black text-black dark:border-white dark:text-white"
                                        : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                )}
                            >
                                Tháng {m}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Bảng Dữ liệu */}
                <div className="flex-1 overflow-y-auto rounded-2xl bg-white shadow-sm border border-zinc-100 dark:bg-black dark:border-zinc-800">
                    {isLoadingData ? (
                        <div className="flex h-full items-center justify-center text-zinc-500">
                            Đang tải dữ liệu...
                        </div>
                    ) : videos.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center text-zinc-500">
                            <p>Không có video nào trong tháng {selectedMonth}/{selectedYear}.</p>
                            {channel && <p className="text-xs mt-2">Hãy nhấn Đồng bộ từ TikTok để cập nhật dữ liệu mới nhất.</p>}
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4 font-semibold w-16">STT</th>
                                    <th className="px-6 py-4 font-semibold w-32">Thời gian</th>
                                    <th className="px-6 py-4 font-semibold">Tên Video</th>
                                    <th className="px-6 py-4 font-semibold text-center w-24">Link</th>
                                    <th className="px-6 py-4 font-semibold text-right w-32">Lượt xem</th>
                                    <th className="px-6 py-4 font-semibold text-right w-32">Tương tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {videos.map((video, index) => {
                                    // Tính tổng tương tác (TikTok API List thường không trả 'save' trong gói basic, nên ta cộng like+share+comment)
                                    const interaction = (video.stats.like || 0) + (video.stats.comment || 0) + (video.stats.share || 0);

                                    return (
                                        <tr key={video.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                                            <td className="px-6 py-4 text-zinc-500">{index + 1}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium">{video.createTime.toLocaleDateString('vi-VN')}</div>
                                                <div className="text-xs text-zinc-500">{video.createTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {/* Ảnh thumbnail video */}
                                                    {video.coverImage && (
                                                        <div className="h-10 w-8 flex-shrink-0 overflow-hidden rounded bg-zinc-200">
                                                            <img src={video.coverImage} alt="" className="h-full w-full object-cover" />
                                                        </div>
                                                    )}
                                                    <span className="line-clamp-2 max-w-md" title={video.title}>
                                                        {video.title}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <Link href={video.link} target="_blank" className="inline-flex items-center justify-center h-8 w-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">
                                                    <ExternalLink className="h-4 w-4 text-blue-500" />
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium">
                                                {video.stats.view.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="font-medium text-green-600 dark:text-green-400">
                                                    {interaction.toLocaleString()}
                                                </div>
                                                <div className="text-[10px] text-zinc-400 mt-0.5">
                                                    {video.stats.like} ❤ • {video.stats.comment} 💬 • {video.stats.share} ↗
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>
        </div>
    );
}