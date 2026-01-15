// src/app/reports/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { Video, Channel, Editor } from "@/types";
import { RefreshCw, ExternalLink, Calendar, ChevronDown, UserCog, BarChart3, Filter } from "lucide-react";
import { getVideosFromDB, syncTikTokVideos } from "@/app/actions/report";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { ReportsStats } from "@/components/ReportsStats";

export default function ReportsPage() {
    const { user, loading } = useAuth();

    // State thời gian
    const currentDate = new Date();
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);

    // State dữ liệu
    const [videos, setVideos] = useState<Video[]>([]);

    const [editors, setEditors] = useState<Editor[]>([]);

    // --- THAY ĐỔI: Quản lý danh sách kênh ---
    const [channels, setChannels] = useState<Channel[]>([]);
    const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
    // ----------------------------------------

    const [isSyncing, setIsSyncing] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);

    const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    // 1. Lấy tất cả Channel, Editor 
    useEffect(() => {
        const fetchInitialData = async () => {
            if (!user) return;

            // a. Lấy Channels
            const qChannel = query(collection(db, "channels"), where("userId", "==", user.id));
            const channelSnap = await getDocs(qChannel);

            if (!channelSnap.empty) {
                const channelsData = channelSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Channel[];
                setChannels(channelsData);
                if (channelsData.length > 0) setSelectedChannel(channelsData[0]);
            } else {
                setChannels([]);
                setSelectedChannel(null);
            }

            // b. MỚI: Lấy danh sách Editors (Giả sử collection tên là 'editors')
            // Bạn có thể lọc theo teamId nếu cần thiết
            try {
                const qEditor = query(collection(db, "editors"));
                const editorSnap = await getDocs(qEditor);
                const editorsData = editorSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Editor[];
                setEditors(editorsData);
            } catch (error) {
                console.error("Lỗi lấy danh sách editor:", error);
            }
        };

        fetchInitialData();
    }, [user]);

    // 2. Fetch dữ liệu Video khi thay đổi Năm/Tháng/KÊNH ĐANG CHỌN
    useEffect(() => {
        const fetchData = async () => {
            if (!selectedChannel) {
                setVideos([]);
                return;
            }

            setIsLoadingData(true);
            // Gọi hàm server action lấy dữ liệu từ DB
            const data = await getVideosFromDB(selectedChannel.id, selectedYear, selectedMonth);
            setVideos(data);
            setIsLoadingData(false);
        };
        fetchData();
    }, [selectedChannel, selectedYear, selectedMonth]);

    const statsData = useMemo(() => {
        // Mặc định bằng 0 nếu chưa có dữ liệu
        let totalViews = 0;
        let totalEngagement = 0;

        if (videos.length > 0) {
            // Tính tổng View của tất cả video trong tháng
            totalViews = videos.reduce((acc, curr) => acc + (curr.stats.view || 0), 0);

            // Tính tổng Tương tác (Like + Comment + Share)
            totalEngagement = videos.reduce((acc, curr) => {
                const engagement = (curr.stats.like || 0) + (curr.stats.comment || 0) + (curr.stats.share || 0);
                return acc + engagement;
            }, 0);
        }

        return {
            followers: selectedChannel?.follower || 0, // Lấy follower hiện tại của kênh
            videos: videos.length,                    // Số lượng video trong tháng
            views: totalViews,
            engagement: totalEngagement
        };
    }, [videos, selectedChannel]);

    const handleAssignEditor = async (videoId: string, newEditorId: string) => {
        if (!videoId) {
            console.error("Lỗi: Video ID bị thiếu (undefined/null)");
            return;
        }

        try {
            // 1. Tìm thông tin editor từ list (để lấy tên)
            const selectedEditor = editors.find(e => e.id === newEditorId);
            const editorName = selectedEditor ? selectedEditor.name : null;
            const editorId = selectedEditor ? selectedEditor.id : null;

            // 2. Cập nhật Optimistic UI (Cập nhật giao diện ngay lập tức)
            setVideos(prev => prev.map(v => {
                if (v.id === videoId) {
                    return { ...v, editorId: editorId || undefined, editorName: editorName || undefined };
                }
                return v;
            }));

            // 3. Cập nhật Firestore
            const videoRef = doc(db, "videos", videoId);
            await updateDoc(videoRef, {
                editorId: editorId,
                editorName: editorName
            });

        } catch (error) {
            console.error("Lỗi khi gán editor:", error);
        }
    };

    // Hàm xử lý đồng bộ cho kênh đang chọn
    const handleSync = async () => {
        if (!user || !selectedChannel) return;
        setIsSyncing(true);

        // Gọi API đồng bộ
        await syncTikTokVideos(user.id, selectedChannel.id);

        // Load lại dữ liệu mới nhất
        const data = await getVideosFromDB(selectedChannel.id, selectedYear, selectedMonth);
        setVideos(data);

        setIsSyncing(false);
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
            <Sidebar />

            <main className="flex-1 flex flex-col h-screen overflow-hidden">

                {/* Header & Controls */}
                <header className="h-16 flex items-center justify-between border-b border-zinc-800 px-6 bg-black shrink-0">
                    <div>
                        <h1 className="text-lg font-bold flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Báo cáo Video
                        </h1>
                    </div>
                    <button
                        onClick={handleSync}
                        disabled={isSyncing || !selectedChannel}
                        className="flex items-center gap-2 bg-white text-black px-4 py-1.5 text-sm font-bold rounded-full hover:bg-zinc-200 disabled:opacity-50 transition-colors"
                    >
                        <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                        {isSyncing ? "Đang đồng bộ..." : "Đồng bộ TikTok"}
                    </button>
                </header>

                {/* --- FILTER BAR --- */}
                <div className="border-b border-zinc-800 bg-black px-6 py-3 flex flex-wrap items-center gap-4 shrink-0">
                    {/* Chọn Kênh */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Filter className="h-4 w-4 text-zinc-500" />
                        </div>
                        <select
                            value={selectedChannel?.id || ""}
                            onChange={(e) => {
                                const ch = channels.find(c => c.id === e.target.value);
                                if (ch) setSelectedChannel(ch);
                            }}
                            className="appearance-none bg-zinc-900 border border-zinc-800 text-white text-sm rounded-lg pl-9 pr-8 py-2 focus:ring-2 focus:ring-zinc-700 focus:outline-none cursor-pointer min-w-50"
                        >
                            {channels.length > 0 ? (
                                channels.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.displayName} (@{c.username})
                                    </option>
                                ))
                            ) : (
                                <option value="" disabled>Chưa có kênh nào</option>
                            )}
                        </select>
                        <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-zinc-500 pointer-events-none" />
                    </div>

                    {/* Chọn Năm */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Calendar className="h-4 w-4 text-zinc-500" />
                        </div>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="appearance-none bg-zinc-900 border border-zinc-800 text-white text-sm rounded-lg pl-9 pr-8 py-2 focus:ring-2 focus:ring-zinc-700 focus:outline-none cursor-pointer"
                        >
                            {years.map(y => <option key={y} value={y}>Năm {y}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-zinc-500 pointer-events-none" />
                    </div>

                    {/* Chọn Tháng (Scroll ngang) */}
                    <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-2 custom-scrollbar">
                        {months.map((m) => (
                            <button
                                key={m}
                                onClick={() => setSelectedMonth(m)}
                                className={cn(
                                    "px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors",
                                    selectedMonth === m
                                        ? "bg-white text-black"
                                        : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                                )}
                            >
                                T{m}
                            </button>
                        ))}
                    </div>
                </div>
                {/* --- CONTENT --- */}
                <div className="flex-1 overflow-y-auto p-4 bg-black custom-scrollbar">
                    <div className="mb-4">
                        <ReportsStats stats={statsData} />
                    </div>

                    {/* Bảng Dữ liệu */}
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden shadow-sm min-h-100">
                        {isLoadingData ? (
                            <div className="flex h-full min-h-100 items-center justify-center text-zinc-500">
                                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                                Đang tải dữ liệu...
                            </div>
                        ) : videos.length === 0 ? (
                            <div className="flex h-full min-h-100 flex-col items-center justify-center text-zinc-500">
                                <p>Không có video nào trong tháng {selectedMonth}/{selectedYear}.</p>
                                {selectedChannel && <p className="text-xs mt-2 text-zinc-600">Hãy nhấn Đồng bộ TikTok để cập nhật dữ liệu mới nhất.</p>}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold w-16">STT</th>
                                            <th className="px-6 py-4 font-semibold w-32">Thời gian</th>
                                            <th className="px-6 py-4 font-semibold">Tên Video</th>
                                            <th className="px-6 py-4 font-semibold text-center w-24">Link</th>
                                            <th className="px-6 py-4 font-semibold text-center w-40">Editor</th>
                                            <th className="px-6 py-4 font-semibold text-right w-32">Lượt xem</th>
                                            <th className="px-6 py-4 font-semibold text-right w-40">Tương tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                        {videos.map((video, index) => {
                                            const interaction = (video.stats.like || 0) + (video.stats.comment || 0) + (video.stats.share || 0);

                                            return (
                                                <tr key={video.id ? `${video.id}-${index}` : index} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                                                    <td className="px-6 py-4 text-zinc-500">{index + 1}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium">{video.createTime.toLocaleDateString('vi-VN')}</div>
                                                        <div className="text-xs text-zinc-500">{video.createTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
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
                                                        <Link href={video.link} target="_blank" className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-blue-500 transition-colors">
                                                            <ExternalLink className="h-4 w-4 text-blue-500" />
                                                        </Link>
                                                    </td>

                                                    <td className="px-6 py-4">
                                                        <div className="relative group">
                                                            <select
                                                                value={video.editorId || ""}
                                                                onChange={(e) => {
                                                                    if (video.id) {
                                                                        handleAssignEditor(video.id, e.target.value);
                                                                    } else {
                                                                        console.warn("Video này chưa có ID, không thể cập nhật.");
                                                                    }
                                                                }}
                                                                className={cn(
                                                                    "w-full appearance-none rounded-md border py-1.5 pl-3 pr-8 text-sm outline-none transition-all cursor-pointer",
                                                                    "border-zinc-200 bg-white hover:border-zinc-300 focus:border-black focus:ring-1 focus:ring-black",
                                                                    "dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:focus:border-white dark:focus:ring-white",
                                                                    !video.editorId && "text-zinc-400 italic" // Style chữ nhạt nếu chưa chọn
                                                                )}
                                                            >
                                                                <option value="">Bạn</option>
                                                                {editors.map(editor => (
                                                                    <option key={editor.id} value={editor.id} className="text-zinc-900 dark:text-zinc-100 not-italic">
                                                                        {editor.name}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <UserCog className="absolute right-2.5 top-2 h-4 w-4 text-zinc-400 pointer-events-none group-hover:text-zinc-600 dark:group-hover:text-zinc-300" />
                                                        </div>
                                                    </td>

                                                    <td className="px-6 py-4 text-right font-bold tabular-nums">
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
            </main>
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