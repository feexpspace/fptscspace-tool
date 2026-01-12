import { Users, Video, Eye, Heart, Activity } from "lucide-react";

interface ReportsStatsProps {
    stats: {
        followers: number;
        videos: number;
        views: number;
        engagement: number; // Tổng tim + comment + share
    };
}

export function ReportsStats({ stats }: ReportsStatsProps) {
    // Hàm format số (VD: 12000 -> 12,000)
    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('vi-VN').format(num);
    };

    const items = [
        {
            label: "Followers",
            value: stats.followers,
            icon: Users,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
        },
        {
            label: "Số lượng Video",
            value: stats.videos,
            icon: Video,
            color: "text-purple-500",
            bg: "bg-purple-500/10",
        },
        {
            label: "Tổng Lượt xem",
            value: stats.views,
            icon: Eye,
            color: "text-green-500",
            bg: "bg-green-500/10",
        },
        {
            label: "Tương tác (Tim/Cmt)",
            value: stats.engagement,
            icon: Heart, // Hoặc dùng icon Activity
            color: "text-red-500",
            bg: "bg-red-500/10",
        },
    ];

    return (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {items.map((item, index) => (
                <div
                    key={index}
                    className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                    <div className="flex items-center gap-4">
                        {/* Icon Box */}
                        <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${item.bg}`}>
                            <item.icon className={`h-6 w-6 ${item.color}`} />
                        </div>

                        {/* Thông số */}
                        <div>
                            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                {item.label}
                            </p>
                            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">
                                {formatNumber(item.value)}
                            </h3>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}