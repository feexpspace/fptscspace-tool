// src/app/privacy/page.tsx
"use client";

import { Sidebar } from "@/components/Sidebar";
import { Lock, Eye, Server, Key, Database, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function PrivacyPage() {
    const router = useRouter();
    const { user } = useAuth(); // Kiểm tra trạng thái đăng nhập

    return (
        <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-300">

            {/* Chỉ hiển thị Sidebar nếu đã đăng nhập */}
            {user && <Sidebar />}

            <main className="flex-1 flex flex-col h-screen overflow-hidden">

                {/* Header: Centered Title + Back Button */}
                <header className="relative h-16 flex items-center justify-center border-b border-zinc-200 dark:border-zinc-800 px-6 bg-white dark:bg-zinc-950 shrink-0 transition-colors">

                    {/* Nút Quay lại (Absolute Left) */}
                    <button
                        onClick={() => router.back()}
                        className="absolute left-6 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-all flex items-center gap-2 group"
                    >
                        <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-medium hidden sm:inline">Quay lại</span>
                    </button>

                    {/* Title (Centered) */}
                    <h1 className="text-lg font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
                        <Lock className="h-5 w-5" />
                        Chính sách bảo mật
                    </h1>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-zinc-50/50 dark:bg-zinc-950/50 custom-scrollbar">
                    <div className="max-w-4xl mx-auto space-y-8 pb-10">

                        {/* Intro Card */}
                        <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 text-center">
                            <h2 className="text-xl font-bold mb-4">Cam kết bảo mật</h2>
                            <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-2xl mx-auto">
                                Chính sách này mô tả cách hệ thống thu thập, sử dụng và bảo vệ dữ liệu của thành viên và dữ liệu kinh doanh của Team. Chúng tôi cam kết dữ liệu chỉ lưu hành nội bộ và không chia sẻ với bên thứ ba không liên quan.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Dữ liệu thu thập */}
                            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:shadow-md transition-shadow">
                                <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
                                    <Database className="h-6 w-6" />
                                </div>
                                <h3 className="font-bold text-lg mb-3">1. Dữ liệu chúng tôi thu thập</h3>
                                <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300 list-disc pl-4 marker:text-zinc-400">
                                    <li><strong>Thông tin định danh:</strong> Tên, Email, Role (Vai trò) trong hệ thống.</li>
                                    <li><strong>Nhật ký hoạt động (Logs):</strong> Lịch sử đăng nhập, thao tác tạo/sửa/xóa Script, thao tác thêm/xóa thành viên.</li>
                                    <li><strong>Dữ liệu TikTok:</strong> Access Token, Refresh Token, thông tin kênh và chỉ số video (View, Like, Share).</li>
                                </ul>
                            </div>

                            {/* Mục đích sử dụng */}
                            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:shadow-md transition-shadow">
                                <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-4 text-purple-600 dark:text-purple-400">
                                    <Eye className="h-6 w-6" />
                                </div>
                                <h3 className="font-bold text-lg mb-3">2. Mục đích sử dụng dữ liệu</h3>
                                <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300 list-disc pl-4 marker:text-zinc-400">
                                    <li><strong>Quản lý vận hành:</strong> Phân quyền truy cập vào các tính năng phù hợp.</li>
                                    <li><strong>Báo cáo hiệu suất:</strong> Tính toán lương thưởng dựa trên hiệu suất video (Editors) và kênh (Managers).</li>
                                    <li><strong>Audit & Bảo mật:</strong> Theo dõi các thay đổi bất thường để ngăn chặn hành vi phá hoại.</li>
                                </ul>
                            </div>

                            {/* Bảo mật TikTok Token */}
                            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 md:col-span-2 hover:shadow-md transition-shadow">
                                <div className="h-12 w-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center mb-4 text-yellow-600 dark:text-yellow-500">
                                    <Key className="h-6 w-6" />
                                </div>
                                <h3 className="font-bold text-lg mb-3">3. Bảo mật Token & Dữ liệu kinh doanh</h3>
                                <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-4">
                                    Đây là tài sản quan trọng nhất của Team. Hệ thống áp dụng các biện pháp:
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-zinc-600 dark:text-zinc-300">
                                    <div className="flex gap-3 items-start bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
                                        <Server className="h-5 w-5 mt-0.5 text-zinc-400" />
                                        <span>Token TikTok được lưu trữ mã hóa và chỉ sử dụng backend-to-backend.</span>
                                    </div>
                                    <div className="flex gap-3 items-start bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
                                        <Lock className="h-5 w-5 mt-0.5 text-zinc-400" />
                                        <span>Phân quyền chặt chẽ: Manager chỉ xem dữ liệu thuộc Team mình quản lý.</span>
                                    </div>
                                </div>
                            </div>

                        </div>

                        <div className="text-center pt-8 border-t border-zinc-200 dark:border-zinc-800">
                            <p className="text-xs text-zinc-500">
                                Mọi thắc mắc về quyền riêng tư dữ liệu, vui lòng liên hệ trực tiếp bộ phận Admin.
                            </p>
                            <p className="text-[10px] text-zinc-400 mt-1">Last updated: {new Date().toLocaleDateString('vi-VN')}</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}