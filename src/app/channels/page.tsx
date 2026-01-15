"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, deleteDoc, doc, getDocs, writeBatch } from "firebase/firestore";
import { Channel } from "@/types";
import { Plus, RefreshCw, LogOut, X, AlertTriangle, Tv } from "lucide-react"; // Import thêm icon
import Image from "next/image";

export default function ChannelsPage() {
    const { user, loading } = useAuth();
    const [channels, setChannels] = useState<Channel[]>([]);
    const [isConnecting, setIsConnecting] = useState(false);

    // State quản lý kênh đang muốn xóa (để hiện popup xác nhận)
    const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

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
        const redirectUri = process.env.NEXT_PUBLIC_TIKTOK_REDIRECT_URI || window.location.origin + "/api/tiktok/callback";
        window.location.href = `/api/tiktok/login?userId=${user.id}`;
    };

    // Hàm xử lý Đăng xuất (Xóa kênh và Token)
    const handleConfirmLogout = async () => {
        if (!channelToDelete) return;
        setIsDeleting(true);

        try {
            // Khởi tạo Batch (Ghi theo lô)
            const batch = writeBatch(db);

            // 1. Lấy tham chiếu đến Channel cần xóa
            const channelRef = doc(db, "channels", channelToDelete.id);
            batch.delete(channelRef);

            // 2. Tìm và xóa tất cả Token của kênh này
            const tokensQuery = query(collection(db, "tokens"), where("channelId", "==", channelToDelete.id));
            const tokensSnapshot = await getDocs(tokensQuery);
            tokensSnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });

            // 3. Tìm và xóa tất cả VIDEO của kênh này (Logic mới thêm)
            const videosQuery = query(collection(db, "videos"), where("channelId", "==", channelToDelete.id));
            const videosSnapshot = await getDocs(videosQuery);
            videosSnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });

            // 4. Thực thi tất cả lệnh xóa cùng lúc
            // Lưu ý: Batch giới hạn 500 thao tác/lần. Nếu kênh > 500 video, cần chia nhỏ batch (nhưng thường kênh quản lý sẽ ok)
            await batch.commit();

            console.log(`Đã xóa Channel: ${channelToDelete.displayName} và ${videosSnapshot.size} video.`);

            // Đóng modal
            setChannelToDelete(null);
        } catch (error) {
            console.error("Lỗi khi xóa dữ liệu kênh:", error);
            alert("Đã có lỗi xảy ra khi xóa dữ liệu. Vui lòng thử lại.");
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
            <Sidebar />

            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-16 flex items-center justify-between border-b border-zinc-800 px-6 bg-black shrink-0">
                    <div>
                        <h1 className="text-lg font-bold flex items-center gap-2">
                            <Tv className="h-5 w-5" />
                            Quản lý Kênh TikTok
                        </h1>
                    </div>
                    <p className="text-zinc-500">Kết nối và theo dõi chỉ số các kênh của bạn.</p>
                    <button
                        onClick={handleConnectTikTok}
                        disabled={isConnecting}
                        className="flex items-center gap-2 bg-white text-black px-4 py-1.5 text-sm font-bold rounded-full hover:bg-zinc-200 transition-colors"
                    >
                        {isConnecting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Thêm Channel Mới
                    </button>
                </header>

                {/* Danh sách kênh */}
                <div className="flex-1 overflow-y-auto p-6 bg-black">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-20">
                        {channels.length === 0 ? (
                            <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 p-12 text-zinc-500">
                                <p>Chưa có kênh nào được kết nối.</p>
                            </div>
                        ) : (
                            channels.map((channel) => (
                                <div key={channel.id} className="relative group overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-zinc-100 dark:bg-black dark:border-zinc-800 transition-all hover:shadow-md">

                                    {/* --- NÚT ĐĂNG XUẤT (Góc trên bên phải) --- */}
                                    <button
                                        onClick={() => setChannelToDelete(channel)}
                                        className="absolute top-4 right-4 p-2 rounded-full bg-zinc-100 text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:bg-zinc-800 dark:hover:bg-red-900/30 transition-colors z-10"
                                        title="Đăng xuất kênh này"
                                    >
                                        <LogOut className="h-4 w-4" />
                                    </button>
                                    {/* ----------------------------------------- */}

                                    <div className="flex items-start justify-between pr-8">
                                        <div className="flex items-center gap-4">
                                            <div className="h-16 w-16 relative rounded-full overflow-hidden border border-zinc-200 bg-zinc-100">
                                                {channel.avatar ? (
                                                    <Image src={channel.avatar} alt={channel.displayName} fill className="object-cover" />
                                                ) : (
                                                    <div className="h-full w-full bg-zinc-200" />
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg line-clamp-1 pr-2">{channel.displayName}</h3>
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
                                            <div className="text-lg font-bold tabular-nums">{channel.follower.toLocaleString()}</div>
                                            <div className="text-xs text-zinc-500 uppercase">Followers</div>
                                        </div>
                                        <div className="text-center border-l border-zinc-100 dark:border-zinc-800">
                                            <div className="text-lg font-bold tabular-nums">{channel.like.toLocaleString()}</div>
                                            <div className="text-xs text-zinc-500 uppercase">Likes</div>
                                        </div>
                                        <div className="text-center border-l border-zinc-100 dark:border-zinc-800">
                                            <div className="text-lg font-bold tabular-nums">{channel.videoCount.toLocaleString()}</div>
                                            <div className="text-xs text-zinc-500 uppercase">Videos</div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* --- MODAL XÁC NHẬN ĐĂNG XUẤT --- */}
                {channelToDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md p-6 relative animate-in zoom-in-95 duration-200">
                            <button
                                onClick={() => setChannelToDelete(null)}
                                className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                            >
                                <X className="h-5 w-5" />
                            </button>

                            <div className="flex flex-col items-center text-center">
                                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4 text-red-600 dark:bg-red-900/30">
                                    <AlertTriangle className="h-6 w-6" />
                                </div>
                                <h3 className="text-lg font-bold mb-2">Đăng xuất kênh?</h3>
                                <p className="text-zinc-500 text-sm mb-6">
                                    Bạn có chắc muốn đăng xuất kênh <span className="font-bold text-black dark:text-white">@{channelToDelete.username}</span> không?
                                    <br />Hành động này sẽ ngắt kết nối dữ liệu.
                                </p>

                                <div className="flex w-full gap-3">
                                    <button
                                        onClick={() => setChannelToDelete(null)}
                                        className="flex-1 py-2.5 rounded-xl border border-zinc-200 font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800 transition-colors"
                                    >
                                        Hủy bỏ
                                    </button>
                                    <button
                                        onClick={handleConfirmLogout}
                                        disabled={isDeleting}
                                        className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                                    >
                                        {isDeleting ? (
                                            <>
                                                <RefreshCw className="h-4 w-4 animate-spin" /> Đang xóa...
                                            </>
                                        ) : (
                                            "Đồng ý, Đăng xuất"
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}