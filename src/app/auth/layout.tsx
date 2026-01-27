// src/app/auth/layout.tsx
import React from "react";
import Image from "next/image";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
            <div className="w-full max-w-md space-y-8 rounded-2xl bg-white dark:bg-black p-8 shadow-xl border border-zinc-200 dark:border-zinc-800">
                <div className="flex flex-col items-center space-y-2">
                    {/* Container cho Logo và Text */}
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
                    {/* Tiêu đề chính của hệ thống */}
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 text-center">
                        FPTscSpace Tool
                    </h1>
                    <div className="flex flex-col items-center">
                        <span className="text-xs text-zinc-500">v1.0.0</span>
                    </div>
                </div>
                {children}
            </div>
        </div>
    );
}