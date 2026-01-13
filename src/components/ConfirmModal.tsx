// src/components/ConfirmModal.tsx
"use client";

import { useEffect, useState } from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>; // Hàm xử lý logic khi chọn OK
    title: string;
    message: React.ReactNode; // Để có thể truyền xuống dòng hoặc bold text
    variant?: 'danger' | 'info' | 'warning'; // Màu sắc nút bấm
    confirmText?: string;
    cancelText?: string;
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    variant = 'danger',
    confirmText = "Xác nhận",
    cancelText = "Hủy bỏ"
}: ConfirmModalProps) {
    const [isLoading, setIsLoading] = useState(false);

    // Reset loading khi đóng/mở lại modal
    useEffect(() => {
        if (isOpen) setIsLoading(false);
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        setIsLoading(true);
        try {
            await onConfirm();
            onClose(); // Đóng modal sau khi chạy xong logic thành công
        } catch (error) {
            console.error(error);
            // Có thể hiện thông báo lỗi ở đây nếu cần
        } finally {
            setIsLoading(false);
        }
    };

    // Style cho nút confirm dựa trên variant
    const buttonStyles = {
        danger: "bg-red-600 hover:bg-red-700 text-white border-red-600",
        warning: "bg-orange-500 hover:bg-orange-600 text-white border-orange-500",
        info: "bg-black hover:bg-zinc-800 text-white dark:bg-white dark:text-black dark:hover:bg-zinc-200 border-black dark:border-white"
    };

    const iconStyles = {
        danger: "text-red-600 bg-red-100 dark:bg-red-900/30",
        warning: "text-orange-600 bg-orange-100 dark:bg-orange-900/30",
        info: "text-blue-600 bg-blue-100 dark:bg-blue-900/30"
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 border border-zinc-200 dark:border-zinc-800">
                {/* Header */}
                <div className="p-6 pb-0 flex items-start gap-4">
                    <div className={cn("p-3 rounded-full shrink-0 flex items-center justify-center", iconStyles[variant])}>
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                            {title}
                        </h3>
                        <div className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            {message}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Footer Actions */}
                <div className="p-6 flex justify-end gap-3 mt-2">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="rounded-lg px-4 py-2 text-sm font-medium border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className={cn(
                            "rounded-lg px-4 py-2 text-sm font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-70",
                            buttonStyles[variant]
                        )}
                    >
                        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}