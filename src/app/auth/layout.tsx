// src/app/auth/layout.tsx
import React from "react";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
            <div className="w-full max-w-md space-y-8 rounded-2xl bg-white dark:bg-black p-8 shadow-xl border border-zinc-200 dark:border-zinc-800">
                <div className="flex flex-col items-center space-y-2">
                    {/* Bạn có thể thêm Logo ở đây */}
                    <div className="h-12 w-12 rounded-xl bg-black dark:bg-white" />
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 text-center">
                        TikTok Key Members Manager System
                    </h1>
                </div>
                {children}
            </div>
        </div>
    );
}