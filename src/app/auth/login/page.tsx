// src/app/auth/login/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { loginUser, resetPassword } from "@/lib/auth-service";
import { ensureEmailConfirmed } from "@/app/actions/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Loader2 } from "lucide-react";

function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState("");
    const [isResetMode, setIsResetMode] = useState(false);

    const router = useRouter();
    const { user, loading } = useAuth();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (searchParams.get('registered') === '1') {
            setMessage("Đăng ký thành công! Tài khoản đang chờ Admin duyệt.");
        }
    }, [searchParams]);

    useEffect(() => {
        if (!loading && user) {
            router.push("/");
        }
    }, [user, loading, router]);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError("");
        setMessage("");

        if (!email) {
            setError("Vui lòng nhập địa chỉ email.");
            setIsSubmitting(false);
            return;
        }

        try {
            await resetPassword(email);
            setMessage("Link đặt lại mật khẩu đã được gửi vào email của bạn.");
        } catch {
            setError("Không thể gửi email. Vui lòng thử lại sau.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError("");

        await ensureEmailConfirmed(email);
        const res = await loginUser(email, password);

        if (res.error) {
            if (res.error === 'pending_approval') {
                setError("Tài khoản đang chờ Admin duyệt. Vui lòng liên hệ Admin để được kích hoạt.");
            } else {
                setError("Email hoặc mật khẩu không chính xác.");
            }
            setIsSubmitting(false);
        } else {
            router.push("/");
        }
    };

    const toggleResetMode = (mode: boolean) => {
        setIsResetMode(mode);
        setError("");
        setMessage("");
    };

    if (loading || user) {
        return <div className="flex justify-center mt-10"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="w-full max-w-md mx-auto p-4">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold">
                    {isResetMode ? "Đặt lại mật khẩu" : "Đăng nhập"}
                </h2>
                <p className="text-sm text-zinc-500">
                    {isResetMode
                        ? "Nhập email để nhận link tạo mật khẩu mới"
                        : "Truy cập hệ thống quản lý TikTok"}
                </p>
            </div>

            <div className="space-y-4">
                <form onSubmit={isResetMode ? handleResetPassword : handleSubmit} className="space-y-4">
                    <div>
                        <input
                            type="email"
                            placeholder="Email"
                            required
                            value={email}
                            className="w-full rounded-lg border border-zinc-300 p-3 outline-none focus:ring-2 focus:ring-black dark:bg-zinc-900 dark:border-zinc-700 dark:focus:ring-white"
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>

                    {!isResetMode && (
                        <div>
                            <div className="flex items-center justify-end mb-1">
                                <button
                                    type="button"
                                    onClick={() => toggleResetMode(true)}
                                    className="text-xs font-medium text-zinc-500 hover:text-black dark:hover:text-white hover:underline transition-colors"
                                >
                                    Quên mật khẩu?
                                </button>
                            </div>
                            <input
                                type="password"
                                placeholder="Mật khẩu"
                                required
                                value={password}
                                className="w-full rounded-lg border border-zinc-300 p-3 outline-none focus:ring-2 focus:ring-black dark:bg-zinc-900 dark:border-zinc-700 dark:focus:ring-white"
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isSubmitting}
                            />
                        </div>
                    )}

                    {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-500 dark:bg-red-900/20 text-center">{error}</div>}
                    {message && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600 dark:bg-green-900/20 text-center">{message}</div>}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex w-full items-center justify-center rounded-lg bg-black py-3 font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black transition-all"
                    >
                        {isSubmitting ? (
                            <Loader2 className="animate-spin h-5 w-5" />
                        ) : (
                            isResetMode ? "Gửi link reset" : "Vào hệ thống"
                        )}
                    </button>

                    {isResetMode && (
                        <button
                            type="button"
                            onClick={() => toggleResetMode(false)}
                            className="flex w-full items-center justify-center gap-2 text-sm text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white mt-2"
                        >
                            <ArrowLeft className="h-4 w-4" /> Quay lại đăng nhập
                        </button>
                    )}
                </form>

                {!isResetMode && (
                    <p className="text-center text-sm text-zinc-600 mt-6">
                        Chưa có tài khoản?{" "}
                        <Link href="/auth/register" className="font-semibold text-black dark:text-white hover:underline">
                            Đăng ký ngay
                        </Link>
                    </p>
                )}
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    );
}
