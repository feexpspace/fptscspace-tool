// src/app/auth/register/page.tsx
"use client";

import { useState } from "react";
import { registerUser } from "@/lib/auth-service";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
    const [formData, setFormData] = useState({ email: "", password: "", name: "" });
    const [error, setError] = useState("");
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const { error } = await registerUser(formData.email, formData.password, formData.name);
        if (error) setError(error);
        else router.push("/auth/login");
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
                    className="w-full rounded-lg border border-zinc-300 p-3 dark:bg-zinc-900 dark:border-zinc-700"
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <input
                    type="email"
                    placeholder="Email"
                    required
                    className="w-full rounded-lg border border-zinc-300 p-3 dark:bg-zinc-900 dark:border-zinc-700"
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <input
                    type="password"
                    placeholder="Mật khẩu"
                    required
                    className="w-full rounded-lg border border-zinc-300 p-3 dark:bg-zinc-900 dark:border-zinc-700"
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                {error && <p className="text-xs text-red-500">{error}</p>}
                <button className="w-full rounded-lg bg-black py-3 font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black">
                    Đăng ký tài khoản
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