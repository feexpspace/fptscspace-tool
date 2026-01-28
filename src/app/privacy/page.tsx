// src/app/privacy/page.tsx
"use client";

import { Sidebar } from "@/components/Sidebar";
import { Lock, Eye, Server, Key, Database } from "lucide-react";

export default function PrivacyPage() {
    return (
        <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-300">
            <Sidebar />

            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-16 flex items-center border-b border-zinc-200 dark:border-zinc-800 px-6 bg-white dark:bg-zinc-950 shrink-0 transition-colors">
                    <h1 className="text-lg font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
                        <Lock className="h-5 w-5" />
                        Privacy Policy (Chính sách bảo mật)
                    </h1>
                </header>

                <div className="flex-1 overflow-y-auto p-6 bg-zinc-50/50 dark:bg-zinc-950/50 custom-scrollbar">
                    <div className="max-w-4xl mx-auto space-y-8 pb-10">

                        <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                            <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">
                                Chính sách này mô tả cách hệ thống thu thập, sử dụng và bảo vệ dữ liệu của thành viên và dữ liệu kinh doanh của Team. Chúng tôi cam kết dữ liệu chỉ lưu hành nội bộ và không chia sẻ với bên thứ ba không liên quan.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Dữ liệu thu thập */}
                            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4 text-blue-600">
                                    <Database className="h-5 w-5" />
                                </div>
                                <h3 className="font-bold text-lg mb-3">1. Dữ liệu chúng tôi thu thập</h3>
                                <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300 list-disc pl-4">
                                    <li><strong>Thông tin định danh:</strong> Tên, Email, Role (Vai trò) trong hệ thống.</li>
                                    <li><strong>Nhật ký hoạt động (Logs):</strong> Lịch sử đăng nhập, thao tác tạo/sửa/xóa Script, thao tác thêm/xóa thành viên.</li>
                                    <li><strong>Dữ liệu TikTok:</strong> Access Token, Refresh Token, thông tin kênh và chỉ số video (View, Like, Share) được đồng bộ qua API.</li>
                                </ul>
                            </div>

                            {/* Mục đích sử dụng */}
                            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-4 text-purple-600">
                                    <Eye className="h-5 w-5" />
                                </div>
                                <h3 className="font-bold text-lg mb-3">2. Mục đích sử dụng dữ liệu</h3>
                                <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300 list-disc pl-4">
                                    <li><strong>Quản lý vận hành:</strong> Phân quyền truy cập vào các tính năng phù hợp (Admin/Manager/Member).</li>
                                    <li><strong>Báo cáo hiệu suất:</strong> Tính toán lương thưởng dựa trên hiệu suất video (Editors) và kênh (Managers).</li>
                                    <li><strong>Audit & Bảo mật:</strong> Theo dõi các thay đổi bất thường để ngăn chặn hành vi phá hoại.</li>
                                </ul>
                            </div>

                            {/* Bảo mật TikTok Token */}
                            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 md:col-span-2">
                                <div className="h-10 w-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mb-4 text-yellow-600">
                                    <Key className="h-5 w-5" />
                                </div>
                                <h3 className="font-bold text-lg mb-3">3. Bảo mật Token & Dữ liệu kinh doanh</h3>
                                <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-3">
                                    Đây là tài sản quan trọng nhất của Team. Hệ thống áp dụng các biện pháp:
                                </p>
                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-zinc-600 dark:text-zinc-300">
                                    <li className="flex gap-2 items-start bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg">
                                        <Server className="h-4 w-4 mt-0.5 text-zinc-400" />
                                        <span>Token TikTok được lưu trữ mã hóa và chỉ sử dụng backend-to-backend để đồng bộ dữ liệu.</span>
                                    </li>
                                    <li className="flex gap-2 items-start bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg">
                                        <Lock className="h-4 w-4 mt-0.5 text-zinc-400" />
                                        <span>Chỉ Admin mới có quyền xem toàn bộ dữ liệu hệ thống. Manager chỉ xem dữ liệu thuộc Team mình quản lý.</span>
                                    </li>
                                </ul>
                            </div>

                        </div>

                        <div className="text-center pt-6 border-t border-zinc-200 dark:border-zinc-800">
                            <p className="text-xs text-zinc-500">
                                Mọi thắc mắc về quyền riêng tư dữ liệu, vui lòng liên hệ trực tiếp bộ phận Admin.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}