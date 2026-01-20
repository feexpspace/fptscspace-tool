/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Users, Heart, Play, Video, Eye, TrendingUp, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMemberOverview, MemberOverview } from "../actions/statistics-member";
import Image from "next/image";

// Component con: Thẻ thống kê (Card)
const StatCard = ({ title, value, icon: Icon, colorClass }: { title: string, value: number, icon: any, colorClass: string }) => (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex items-center justify-between shadow-sm hover:border-zinc-700 transition-all">
        <div>
            <p className="text-zinc-400 text-sm font-medium mb-1">{title}</p>
            <h3 className="text-3xl font-bold text-white">{value.toLocaleString('vi-VN')}</h3>
        </div>
        <div className={cn("p-4 rounded-full bg-opacity-20", colorClass)}>
            <Icon className={cn("h-6 w-6", colorClass.replace("bg-", "text-").replace("/20", ""))} />
        </div>
    </div>
);

export default function StatisticsMemberPage() {
    const { user } = useAuth();
    const [data, setData] = useState<MemberOverview | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            setIsLoading(true);
            const res = await getMemberOverview(user.id);
            setData(res);
            setIsLoading(false);
        };
        fetchData();
    }, [user]);

    if (isLoading) return <div className="flex h-screen items-center justify-center bg-black"><Loader2 className="animate-spin text-white" /></div>;

    return (
        <div className="flex h-screen w-full bg-black text-zinc-100 font-sans">
            <Sidebar />

            <main className="flex-1 flex flex-col h-screen overflow-hidden">

                {/* Header */}
                <header className="h-16 flex items-center justify-between border-b border-zinc-800 px-6 bg-black shrink-0">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <TrendingUp className="h-6 w-6 text-blue-500" />
                            Tổng quan kênh
                        </h1>
                    </div>
                    <p className="text-zinc-400 mt-1">Thống kê tổng hợp từ {data?.channelCount} kênh TikTok của bạn.</p>
                </header>

                {/* Overview Cards Grid */}
                <div className="flex-1 overflow-y-auto p-6 bg-black">
                    {/* [CẬP NHẬT]: Grid chuyển thành 5 cột (lg:grid-cols-5) hoặc giữ 4 cột và để dòng dưới */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
                        <StatCard
                            title="Tổng Follower"
                            value={data?.totalFollowers || 0}
                            icon={Users}
                            colorClass="bg-blue-500/20 text-blue-500"
                        />
                        <StatCard
                            title="Tổng Lượt thích"
                            value={data?.totalLikes || 0}
                            icon={Heart}
                            colorClass="bg-red-500/20 text-red-500"
                        />
                        <StatCard
                            title="Tổng Lượt xem"
                            value={data?.totalViews || 0}
                            icon={Eye}
                            colorClass="bg-yellow-500/20 text-yellow-500"
                        />
                        <StatCard
                            title="Tổng Tương tác"
                            value={data?.totalInteractions || 0}
                            icon={BarChart3}
                            colorClass="bg-green-500/20 text-green-500"
                        />
                        <StatCard
                            title="Số lượng Video"
                            value={data?.totalVideos || 0}
                            icon={Video}
                            colorClass="bg-purple-500/20 text-purple-500"
                        />
                    </div>

                    {/* Detail Table */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-zinc-800">
                            <h2 className="font-bold text-lg">Chi tiết theo kênh</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-zinc-950/50 text-zinc-500 font-medium">
                                    <tr>
                                        <th className="px-6 py-4">Tên kênh</th>
                                        <th className="px-6 py-4">Username</th>
                                        <th className="px-6 py-4 text-right">Follower</th>
                                        <th className="px-6 py-4 text-right">Likes</th>
                                        <th className="px-6 py-4 text-right">Views</th>
                                        <th className="px-6 py-4 text-right">Tương tác</th>
                                        <th className="px-6 py-4 text-right">Video</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800">
                                    {data?.channels.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                                                Chưa có dữ liệu kênh nào.
                                            </td>
                                        </tr>
                                    ) : (
                                        data?.channels.map((channel) => (
                                            <tr key={channel.id} className="hover:bg-zinc-800/50 transition-colors">
                                                <td className="px-6 py-4 font-medium flex items-center gap-3">
                                                    {channel.avatar ? (
                                                        <div className="h-8 w-8 rounded-full bg-zinc-200 relative overflow-hidden">
                                                            {channel.avatar && <Image src={channel.avatar} alt="" fill className="object-cover" />}
                                                        </div>
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-zinc-700" />
                                                    )}
                                                    {channel.displayName}
                                                </td>
                                                <td className="px-6 py-4 text-zinc-400">@{channel.username}</td>
                                                <td className="px-6 py-4 text-right">{channel.follower.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right">{channel.like.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right font-medium text-yellow-500">
                                                    {channel.views.toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-right font-medium text-green-500">
                                                    {channel.interactions.toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-right">{channel.videoCount}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}