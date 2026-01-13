/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/auth/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { loginUser } from "@/lib/auth-service";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Loader2 } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { GoogleAuthProvider, sendPasswordResetEmail, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { User } from "@/types";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState("");

    const [isResetMode, setIsResetMode] = useState(false);

    const router = useRouter();
    const { user, loading } = useAuth();

    const navigateBasedOnRole = (role: string) => {
        if (role === 'member') {
            router.push("/teams");
        } else {
            // Manager hoặc Admin về trang Dashboard chính
            router.push("/");
        }
    };

    useEffect(() => {
        // Tự động chuyển trang nếu đã login và load xong user profile
        if (!loading && user) {
            navigateBasedOnRole(user.role);
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
            await sendPasswordResetEmail(auth, email);
            setMessage("Link đặt lại mật khẩu đã được gửi vào email của bạn. Vui lòng kiểm tra hộp thư (cả mục Spam).");
        } catch (err: any) {
            console.error("Reset Password Error:", err);
            if (err.code === 'auth/user-not-found') {
                setError("Email này chưa được đăng ký trong hệ thống.");
            } else if (err.code === 'auth/invalid-email') {
                setError("Địa chỉ email không hợp lệ.");
            } else {
                setError("Không thể gửi email. Vui lòng thử lại sau.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- XỬ LÝ ĐĂNG NHẬP GOOGLE (Đã hỗ trợ Link Account) ---
    const handleGoogleLogin = async () => {
        setIsSubmitting(true);
        setError("");

        try {
            const provider = new GoogleAuthProvider();
            // Nếu email Google trùng với email/pass đã có, Firebase sẽ trả về đúng UID cũ
            const result = await signInWithPopup(auth, provider);
            const googleUser = result.user;

            // Kiểm tra User trong Firestore
            const userRef = doc(db, "users", googleUser.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                // TRƯỜNG HỢP 1: User hoàn toàn mới -> Tạo mới
                const newUser: User = {
                    id: googleUser.uid,
                    email: googleUser.email || "",
                    name: googleUser.displayName || "User",
                    role: "member",
                    teamId: ""
                };
                // Dùng setDoc để tạo
                await setDoc(userRef, newUser);
            }

            router.push("/");

        } catch (err: any) {
            console.error("Google Login Error:", err);
            if (err.code === 'auth/account-exists-with-different-credential') {
                setError("Email này đã được dùng với phương thức đăng nhập khác.");
            } else {
                setError("Đăng nhập Google thất bại.");
            }
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError("");

        const res = await loginUser(email, password);

        if (res.error) {
            if (res.error.includes("auth/invalid-credential") || res.error.includes("auth/user-not-found")) {
                setError("Email hoặc mật khẩu không chính xác.");
            } else if (res.error.includes("auth/wrong-password")) {
                setError("Mật khẩu không đúng.");
            } else {
                setError("Đã có lỗi xảy ra (" + res.error + ")");
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
                {/* GIAO DIỆN LOGIN (Mặc định)
                   Ẩn đi khi đang ở chế độ Reset Password 
                */}
                {!isResetMode && (
                    <>
                        {/* NÚT GOOGLE */}
                        <button
                            onClick={handleGoogleLogin}
                            disabled={isSubmitting}
                            className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-200 bg-white py-2.5 font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition-all shadow-sm"
                        >
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Tiếp tục với Google
                        </button>

                        {/* DIVIDER */}
                        <div className="relative flex items-center py-2">
                            <div className="flex-grow border-t border-zinc-200 dark:border-zinc-700"></div>
                            <span className="mx-4 flex-shrink-0 text-xs text-zinc-400 font-semibold uppercase">Hoặc đăng nhập với Email</span>
                            <div className="flex-grow border-t border-zinc-200 dark:border-zinc-700"></div>
                        </div>
                    </>
                )}

                {/* FORM CHUNG (Dùng chung layout input) */}
                <form onSubmit={isResetMode ? handleResetPassword : handleSubmit} className="space-y-4">

                    {/* Input Email (Luôn hiển thị) */}
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

                    {/* Input Password & Forgot Link (Chỉ hiển thị khi Login) */}
                    {!isResetMode && (
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-transparent select-none">.</span> {/* Spacer giữ layout nếu cần */}
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

                    {/* Hiển thị lỗi */}
                    {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-500 dark:bg-red-900/20 text-center">{error}</div>}

                    {/* Hiển thị thông báo thành công (Cho reset pass) */}
                    {message && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600 dark:bg-green-900/20 text-center">{message}</div>}

                    {/* Nút Submit */}
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

                    {/* Nút Quay lại đăng nhập (Chỉ hiện khi Reset Mode) */}
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

                {/* Footer Đăng ký (Chỉ hiện khi Login Mode) */}
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