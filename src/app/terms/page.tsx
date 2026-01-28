// src/app/terms/page.tsx
"use client";

import { Sidebar } from "@/components/Sidebar";
import { Shield, CheckCircle2, AlertTriangle, FileText, XCircle } from "lucide-react";

export default function TermsPage() {
    return (
        <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-300">
            <Sidebar />

            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-16 flex items-center border-b border-zinc-200 dark:border-zinc-800 px-6 bg-white dark:bg-zinc-950 shrink-0 transition-colors">
                    <h1 className="text-lg font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
                        <Shield className="h-5 w-5" />
                        Terms of Service (Quy định sử dụng)
                    </h1>
                </header>

                <div className="flex-1 overflow-y-auto p-6 bg-zinc-50/50 dark:bg-zinc-950/50 custom-scrollbar">
                    <div className="max-w-4xl mx-auto space-y-8 pb-10">

                        {/* Intro */}
                        <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                            <h2 className="text-2xl font-bold mb-4">Tổng quan</h2>
                            <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">
                                FPTscSpace Tool là nền tảng quản lý nội bộ. Bằng việc đăng nhập và sử dụng hệ thống, bạn xác nhận là thành viên chính thức của team và đồng ý tuân thủ các quy định dưới đây nhằm đảm bảo tính bảo mật và hiệu quả công việc.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-6">

                            {/* 1. Tài khoản */}
                            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                    <FileText className="h-5 w-5" /> 1. Quy định về Tài khoản
                                </h3>
                                <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
                                    <li className="flex gap-3">
                                        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                                        <span>Tài khoản được cấp là <strong>duy nhất</strong> cho mỗi nhân sự. Bạn chịu hoàn toàn trách nhiệm về mọi hoạt động diễn ra dưới tên tài khoản của mình.</span>
                                    </li>
                                    <li className="flex gap-3">
                                        <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                                        <span><strong>Nghiêm cấm:</strong> Chia sẻ mật khẩu hoặc cho người khác mượn tài khoản (bao gồm cả đồng nghiệp).</span>
                                    </li>
                                </ul>
                            </div>

                            {/* 2. Sử dụng Hệ thống */}
                            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                    <FileText className="h-5 w-5" /> 2. Phạm vi sử dụng
                                </h3>
                                <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
                                    <li className="flex gap-3">
                                        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                                        <span>Hệ thống chỉ được sử dụng cho mục đích công việc được giao (Quản lý kênh, Edit video, Báo cáo).</span>
                                    </li>
                                    <li className="flex gap-3">
                                        <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                                        <span><strong>Nghiêm cấm:</strong> Sử dụng dữ liệu của team cho mục đích cá nhân, hoặc sao chép quy trình/kịch bản (Scripts) để kinh doanh bên ngoài.</span>
                                    </li>
                                    <li className="flex gap-3">
                                        <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                                        <span><strong>Nghiêm cấm:</strong> Sử dụng các công cụ tự động (bot, crawler) để can thiệp vào hệ thống.</span>
                                    </li>
                                </ul>
                            </div>

                            {/* 3. Chấm dứt quyền truy cập */}
                            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-orange-600 dark:text-orange-400">
                                    <AlertTriangle className="h-5 w-5" /> 3. Xử lý vi phạm & Chấm dứt
                                </h3>
                                <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-2">
                                    Quyền truy cập hệ thống sẽ bị thu hồi ngay lập tức trong các trường hợp:
                                </p>
                                <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-600 dark:text-zinc-300">
                                    <li>Nhân sự nghỉ việc hoặc chuyển sang bộ phận khác.</li>
                                    <li>Phát hiện hành vi rò rỉ dữ liệu doanh thu, views, hoặc kịch bản ra bên ngoài.</li>
                                    <li>Cố ý phá hoại dữ liệu hệ thống.</li>
                                </ul>
                            </div>

                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}