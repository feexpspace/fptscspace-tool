// src/app/auth/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { loginUser } from "@/lib/auth-service";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false); // State để disable nút khi đang gửi

    const router = useRouter();
    const { user, loading } = useAuth();

    // 1. Nếu đã login rồi thì không cho ở trang login nữa, đá về Home
    useEffect(() => {
        if (!loading && user) {
            router.push("/");
        }
    }, [user, loading, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError("");

        const res = await loginUser(email, password);

        if (res.error) {
            setError("Email hoặc mật khẩu không đúng.");
            setIsSubmitting(false);
        } else {
            // Đăng nhập thành công -> Router sẽ tự chuyển hướng
            // (Hoặc có thể gọi router.push("/") ở đây cho chắc chắn)
            router.push("/");
        }
    };

    // Màn hình chờ khi đang check session
    if (loading || user) {
        return <div className="flex justify-center"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <>
            <div className="text-center">
                <h2 className="text-xl font-semibold">Đăng nhập</h2>
                <p className="text-sm text-zinc-500">Nhập thông tin để truy cập hệ thống</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 mt-6">
                <div>
                    <input
                        type="email"
                        placeholder="Email"
                        required
                        className="w-full rounded-lg border border-zinc-300 p-3 dark:bg-zinc-900 dark:border-zinc-700"
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isSubmitting}
                    />
                </div>
                <div>
                    <input
                        type="password"
                        placeholder="Mật khẩu"
                        required
                        className="w-full rounded-lg border border-zinc-300 p-3 dark:bg-zinc-900 dark:border-zinc-700"
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isSubmitting}
                    />
                </div>

                {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center rounded-lg bg-black py-3 font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black"
                >
                    {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : "Vào hệ thống"}
                </button>
            </form>
            <p className="text-center text-sm text-zinc-600 mt-6">
                Chưa có tài khoản?{" "}
                <Link href="/auth/register" className="font-semibold text-black dark:text-white">
                    Đăng ký ngay
                </Link>
            </p>
        </>
    );
}