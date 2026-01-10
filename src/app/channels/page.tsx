// src/app/channels/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Channel } from "@/types";
import { Plus, Trash2, ExternalLink, RefreshCw } from "lucide-react";
import Image from "next/image";

export default function ChannelsPage() {
    const { user, loading } = useAuth();
    const [channels, setChannels] = useState<Channel[]>([]);
    const [isConnecting, setIsConnecting] = useState(false);

    // Lắng nghe danh sách kênh realtime
    useEffect(() => {
        if (!user) return;

        const q = query(collection(db, "channels"), where("userId", "==", user.id));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Channel[];
            setChannels(data);
        });

        return () => unsubscribe();
    }, [user]);

    const handleConnectTikTok = () => {
        if (!user) return;
        setIsConnecting(true);
        // Gọi API Route login, truyền userId để biết ai đang connect
        window.location.href = `/api/tiktok/login?userId=${user.id}`;
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
            <Sidebar />

            <main className="flex-1 flex flex-col h-screen overflow-hidden p-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold">Quản lý Kênh TikTok</h1>
                        <p className="text-zinc-500">Kết nối và theo dõi chỉ số các kênh của bạn.</p>
                    </div>
                    <button
                        onClick={handleConnectTikTok}
                        disabled={isConnecting}
                        className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-white hover:bg-zinc-800 dark:bg-white dark:text-black transition-all"
                    >
                        {isConnecting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Thêm Kênh Mới
                    </button>
                </div>

                {/* Danh sách kênh */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {channels.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 p-12 text-zinc-500">
                            <p>Chưa có kênh nào được kết nối.</p>
                        </div>
                    ) : (
                        channels.map((channel) => (
                            <div key={channel.id} className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-zinc-100 dark:bg-black dark:border-zinc-800">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-16 w-16 relative rounded-full overflow-hidden border border-zinc-200">
                                            {channel.avatar ? (
                                                <Image src={channel.avatar} alt={channel.displayName} fill className="object-cover" />
                                            ) : (
                                                <div className="h-full w-full bg-zinc-200" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">{channel.displayName}</h3>
                                            <p className="text-sm text-zinc-500">@{channel.username}</p>
                                            {channel.isVerified && (
                                                <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                                                    Verified
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 grid grid-cols-3 gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                                    <div className="text-center">
                                        <div className="text-lg font-bold">{channel.follower.toLocaleString()}</div>
                                        <div className="text-xs text-zinc-500 uppercase">Followers</div>
                                    </div>
                                    <div className="text-center border-l border-zinc-100 dark:border-zinc-800">
                                        <div className="text-lg font-bold">{channel.like.toLocaleString()}</div>
                                        <div className="text-xs text-zinc-500 uppercase">Likes</div>
                                    </div>
                                    <div className="text-center border-l border-zinc-100 dark:border-zinc-800">
                                        <div className="text-lg font-bold">{channel.videoCount.toLocaleString()}</div>
                                        <div className="text-xs text-zinc-500 uppercase">Videos</div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}