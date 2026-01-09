// src/app/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext"; // Đảm bảo bạn đã tạo file này
import { Sidebar } from "@/components/Sidebar"; // Component Sidebar đã tạo
import { Bell, Search, TrendingUp, TrendingDown, MoreHorizontal, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Logic bảo vệ trang: Nếu chưa login thì đá về trang login
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  // 1. Màn hình Loading khi đang kiểm tra đăng nhập
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  // 2. Nếu không có user (đang redirect), không render gì cả để tránh nhấp nháy
  if (!user) return null;

  // 3. Nếu đã login, hiển thị Dashboard
  return (
    <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="flex h-20 items-center justify-between border-b border-zinc-200 px-8 bg-white dark:bg-black dark:border-zinc-800">
          <div>
            <h1 className="text-xl font-bold">
              Xin chào, {user.name} 👋
            </h1>
            <p className="text-sm text-zinc-500">Đây là tổng quan tình hình team TikTok của bạn.</p>
          </div>
          <div className="flex items-center gap-4">
            {/* ... (Giữ nguyên code Header như thiết kế trước) ... */}
            <div className="h-10 w-10 rounded-full bg-zinc-200" />
          </div>
        </header>

        {/* Nội dung Dashboard (Giữ nguyên code Dashboard như thiết kế trước) */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* ... Paste phần Cards, Charts, List từ câu trả lời trước vào đây ... */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-zinc-100 dark:bg-black dark:border-zinc-800">
              <div className="text-sm font-medium text-zinc-500 uppercase">Tổng Lượt Xem</div>
              <div className="mt-2 text-3xl font-bold">1,240,500</div>
            </div>
            {/* Thêm các card khác tương tự... */}
          </div>
        </div>
      </main>
    </div>
  );
}