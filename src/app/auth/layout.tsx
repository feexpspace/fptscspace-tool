// src/app/auth/layout.tsx
import React from "react";
import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">

            {/* 1. MAIN CONTENT: Căn giữa màn hình */}
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-md space-y-8 rounded-2xl bg-white dark:bg-black p-8 shadow-xl border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-300">

                    {/* Header: Logo & Title */}
                    <div className="flex flex-col items-center space-y-2">
                        <div className="flex flex-col items-center">
                            <div className="relative h-16 w-16 shrink-0 rounded-full overflow-hidden shadow-sm border border-zinc-100 dark:border-zinc-800">
                                <Image
                                    src="/logo.png"
                                    alt="Logo"
                                    fill
                                    className="object-cover"
                                    priority
                                    sizes="100px"
                                />
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 text-center">
                            FPTscSpace Tool
                        </h1>
                        <div className="flex flex-col items-center">
                            <span className="text-xs text-zinc-500">v1.0.0</span>
                        </div>
                    </div>

                    {/* Form Login/Register */}
                    {children}
                </div>
            </div>

            {/* 2. FOOTER: Terms & Privacy */}
            <footer className="py-6 shrink-0">
                <div className="flex items-center justify-center gap-6 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    <Link
                        href="/terms"
                        className="hover:text-zinc-900 dark:hover:text-zinc-200 hover:underline underline-offset-4 transition-colors"
                    >
                        Điều khoản dịch vụ
                    </Link>
                    <span className="w-px h-3 bg-zinc-300 dark:bg-zinc-700"></span>
                    <Link
                        href="/privacy"
                        className="hover:text-zinc-900 dark:hover:text-zinc-200 hover:underline underline-offset-4 transition-colors"
                    >
                        Chính sách bảo mật
                    </Link>
                </div>
                <div className="text-center mt-4 text-[10px] text-zinc-400 space-y-1">
                    <p>
                        Support: <a href="mailto:feexpspace@gmail.com" className="font-medium hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">feexpspace@gmail.com</a>
                    </p>
                    <p>&copy; {new Date().getFullYear()} FPTscSpace Tool. Internal Use Only.</p>
                </div>
            </footer>

        </div>
    );
}