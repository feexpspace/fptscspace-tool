"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
    if (totalPages <= 1) return null;

    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);

    for (let i = start; i <= end; i++) {
        pages.push(i);
    }

    return (
        <div className="flex items-center justify-center gap-1 py-4">
            <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
                <ChevronLeft className="h-4 w-4" />
            </button>

            {start > 1 && (
                <>
                    <button onClick={() => onPageChange(1)} className="flex h-8 w-8 items-center justify-center rounded-lg text-sm text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800">1</button>
                    {start > 2 && <span className="px-1 text-zinc-400">...</span>}
                </>
            )}

            {pages.map(p => (
                <button
                    key={p}
                    onClick={() => onPageChange(p)}
                    className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors",
                        p === page
                            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                            : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    )}
                >
                    {p}
                </button>
            ))}

            {end < totalPages && (
                <>
                    {end < totalPages - 1 && <span className="px-1 text-zinc-400">...</span>}
                    <button onClick={() => onPageChange(totalPages)} className="flex h-8 w-8 items-center justify-center rounded-lg text-sm text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800">{totalPages}</button>
                </>
            )}

            <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
                <ChevronRight className="h-4 w-4" />
            </button>
        </div>
    );
}
