// src/app/auth/login/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { loginUser, resetPassword } from "@/lib/auth-service";
import { ensureEmailConfirmed } from "@/app/actions/auth";
import { registerUserAction } from "@/app/actions/auth";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react";

type Mode = "login" | "register" | "reset";

function AuthForm() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const searchParams = useSearchParams();
    const [mode, setMode] = useState<Mode>("login");

    // Login state
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    // Register state
    const [name, setName] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showConfirm, setShowConfirm] = useState(false);

    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (searchParams.get('registered') === '1') {
            setMessage("Đăng ký thành công! Tài khoản đang chờ Admin duyệt.");
        }
    }, [searchParams]);

    useEffect(() => {
        if (!loading && user) router.push("/");
    }, [user, loading, router]);

    const switchMode = (m: Mode) => {
        setMode(m);
        setError("");
        setMessage("");
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError("");
        await ensureEmailConfirmed(email);
        const res = await loginUser(email, password);
        if (res.error) {
            setError(res.error === 'pending_approval'
                ? "Tài khoản đang chờ Admin duyệt. Vui lòng liên hệ Admin để được kích hoạt."
                : "Email hoặc mật khẩu không chính xác.");
            setIsSubmitting(false);
        } else {
            router.push("/");
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirm) { setError("Mật khẩu nhập lại không khớp."); return; }
        setIsSubmitting(true);
        setError("");
        const result = await registerUserAction(email, password, name);
        if (result.error) {
            setError(result.error);
            setIsSubmitting(false);
        } else {
            setMessage("Đăng ký thành công! Tài khoản đang chờ Admin duyệt.");
            setMode("login");
            setPassword("");
            setName("");
            setConfirm("");
            setIsSubmitting(false);
        }
    };

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) { setError("Vui lòng nhập địa chỉ email."); return; }
        setIsSubmitting(true);
        setError("");
        try {
            await resetPassword(email);
            setMessage("Link đặt lại mật khẩu đã được gửi vào email của bạn.");
        } catch {
            setError("Không thể gửi email. Vui lòng thử lại sau.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading || user) {
        return <div className="flex justify-center py-8"><Loader2 className="animate-spin h-6 w-6 text-zinc-400" /></div>;
    }

    const inputCls = "w-full rounded-xl border border-zinc-200 p-3.5 text-sm outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-zinc-900/50 dark:border-zinc-800 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500";

    return (
        <div className="space-y-4">
            <div className="text-center">
                <h2 className="text-2xl font-bold">
                    {mode === "login" ? "Đăng nhập" : mode === "register" ? "Tạo tài khoản" : "Đặt lại mật khẩu"}
                </h2>
                <p className="text-sm text-zinc-500">
                    {mode === "login" ? "Truy cập hệ thống quản lý TikTok"
                        : mode === "register" ? "Đăng ký để tham gia hệ thống"
                        : "Nhập email để nhận link tạo mật khẩu mới"}
                </p>
            </div>

            <form onSubmit={mode === "login" ? handleLogin : mode === "register" ? handleRegister : handleReset} className="space-y-4">
                {mode === "register" && (
                    <input type="text" placeholder="Họ và tên" required value={name}
                        className={inputCls} onChange={e => setName(e.target.value)} disabled={isSubmitting} />
                )}

                <input type="email" placeholder="Email" required value={email}
                    className={inputCls} onChange={e => setEmail(e.target.value)} disabled={isSubmitting} />

                {mode !== "reset" && (
                    <div className="relative">
                        {mode === "login" && (
                            <div className="flex justify-end mb-1.5">
                                <button type="button" onClick={() => switchMode("reset")}
                                    className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                                    Quên mật khẩu?
                                </button>
                            </div>
                        )}
                        <div className="relative">
                            <input type={showPassword ? "text" : "password"} placeholder="Mật khẩu" required value={password}
                                className={`${inputCls} pr-10`} onChange={e => setPassword(e.target.value)} disabled={isSubmitting} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                )}

                {mode === "register" && (
                    <div className="relative">
                        <input type={showConfirm ? "text" : "password"} placeholder="Nhập lại mật khẩu" required value={confirm}
                            className={`${inputCls} pr-10`} onChange={e => setConfirm(e.target.value)} disabled={isSubmitting} />
                        <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                )}

                {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-500 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-center">{error}</div>}
                {message && <div className="rounded-xl bg-green-50 p-3 text-sm text-green-600 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 text-center">{message}</div>}

                <button type="submit" disabled={isSubmitting}
                    className="flex w-full items-center justify-center rounded-xl bg-blue-600 py-3.5 font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-600 dark:text-white transition-all mt-6">
                    {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> :
                        mode === "login" ? "Vào hệ thống" :
                        mode === "register" ? "Đăng ký tài khoản" : "Gửi link reset"}
                </button>

                {mode === "reset" && (
                    <button type="button" onClick={() => switchMode("login")}
                        className="flex w-full items-center justify-center gap-2 text-sm text-zinc-500 hover:text-black dark:hover:text-white mt-1">
                        <ArrowLeft className="h-4 w-4" /> Quay lại đăng nhập
                    </button>
                )}
            </form>

            {mode === "login" && (
                <p className="text-center text-sm text-zinc-600 dark:text-zinc-400 mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
                    Chưa có tài khoản?{" "}
                    <button onClick={() => switchMode("register")} className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors">
                        Đăng ký ngay
                    </button>
                </p>
            )}
            {mode === "register" && (
                <p className="text-center text-sm text-zinc-600 dark:text-zinc-400 mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
                    Đã có tài khoản?{" "}
                    <button onClick={() => switchMode("login")} className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors">
                        Đăng nhập
                    </button>
                </p>
            )}
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="animate-spin h-6 w-6 text-zinc-400" /></div>}>
            <AuthForm />
        </Suspense>
    );
}
