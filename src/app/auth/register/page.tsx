// src/app/auth/register/page.tsx
"use client";

import { useState } from "react";
import { registerUserAction } from "@/app/actions/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function RegisterPage() {
    const [formData, setFormData] = useState({ email: "", password: "", confirm: "", name: "" });
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirm) {
            setError("Mật khẩu nhập lại không khớp.");
            return;
        }
        setIsSubmitting(true);
        setError("");
        const result = await registerUserAction(formData.email, formData.password, formData.name);
        if (result.error) {
            setError(result.error);
            setIsSubmitting(false);
        } else {
            router.push("/auth/login?registered=1");
        }
    };

    return (
        <>
            <div className="text-center">
                <h2 className="text-xl font-semibold">Tạo tài khoản</h2>
                <p className="text-sm text-zinc-500">Đăng ký để quản lý team của bạn</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="text"
                    placeholder="Họ và tên"
                    required
                    className="w-full rounded-lg border border-zinc-300 p-3 outline-none focus:ring-2 focus:ring-black dark:bg-zinc-900 dark:border-zinc-700 dark:focus:ring-white"
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={isSubmitting}
                />
                <input
                    type="email"
                    placeholder="Email"
                    required
                    className="w-full rounded-lg border border-zinc-300 p-3 outline-none focus:ring-2 focus:ring-black dark:bg-zinc-900 dark:border-zinc-700 dark:focus:ring-white"
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={isSubmitting}
                />
                <div className="relative">
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Mật khẩu"
                        required
                        className="w-full rounded-lg border border-zinc-300 p-3 pr-10 outline-none focus:ring-2 focus:ring-black dark:bg-zinc-900 dark:border-zinc-700 dark:focus:ring-white"
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        disabled={isSubmitting}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
                <div className="relative">
                    <input
                        type={showConfirm ? "text" : "password"}
                        placeholder="Nhập lại mật khẩu"
                        required
                        className="w-full rounded-lg border border-zinc-300 p-3 pr-10 outline-none focus:ring-2 focus:ring-black dark:bg-zinc-900 dark:border-zinc-700 dark:focus:ring-white"
                        onChange={(e) => setFormData({ ...formData, confirm: e.target.value })}
                        disabled={isSubmitting}
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
                {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-500 dark:bg-red-900/20 text-center">{error}</p>}
                <button
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center rounded-lg bg-black py-3 font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black transition-all"
                >
                    {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : "Đăng ký tài khoản"}
                </button>
            </form>
            <p className="text-center text-sm text-zinc-600">
                Đã có tài khoản?{" "}
                <Link href="/auth/login" className="font-semibold text-black dark:text-white">
                    Đăng nhập
                </Link>
            </p>
        </>
    );
}
