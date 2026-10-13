"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ExternalLink, FileText, CheckCircle2, XCircle, Clock, Copy, Check, MessageSquareText, Film, Calendar, User } from "lucide-react";
import { Video } from "@/types";

interface VideoReviewModalProps {
    video: Video | null;
    projectName?: string;
    onClose: () => void;
}

export function VideoReviewModal({ video, projectName, onClose }: VideoReviewModalProps) {
    const [mounted, setMounted] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    if (!mounted || !video) return null;

    const caption = video.title || video.description || "";
    const captionClean = caption.replace(/#\w+/g, "").trim();
    const hashtags = caption.match(/#\w+/g)?.join(" ") || "";

    const isApproved = video.acceptanceStatus === "approved";
    const isRejected = video.acceptanceStatus === "rejected";
    const isPending = !video.acceptanceStatus;

    const handleCopyNote = async () => {
        if (!video.acceptanceNote) return;
        await navigator.clipboard.writeText(video.acceptanceNote);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return createPortal(
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-5">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Dialog */}
            <div className="relative flex flex-col w-full max-w-xl max-h-[90vh] rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-[#18181b] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50">
                    <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl ${
                            isApproved
                                ? "bg-green-100 text-green-600 dark:bg-green-950/60 dark:text-green-400"
                                : isRejected
                                ? "bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400"
                                : "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
                        }`}>
                            <MessageSquareText className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                                Chi tiết nhận xét nghiệm thu
                            </h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Đánh giá và phản hồi của Reviewer cho clip
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                        title="Đóng (Esc)"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-5">
                    {/* Status Banner */}
                    <div className={`flex items-center justify-between p-3.5 rounded-xl border ${
                        isApproved
                            ? "bg-green-50/80 border-green-200 text-green-800 dark:bg-green-950/30 dark:border-green-800/60 dark:text-green-300"
                            : isRejected
                            ? "bg-red-50/80 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-800/60 dark:text-red-300"
                            : "bg-amber-50/80 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800/60 dark:text-amber-300"
                    }`}>
                        <div className="flex items-center gap-2.5">
                            {isApproved && <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />}
                            {isRejected && <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />}
                            {isPending && <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider block">Trạng thái nghiệm thu</span>
                                <span className="text-sm font-semibold">
                                    {isApproved && "Đã duyệt nghiệm thu"}
                                    {isRejected && "Không được duyệt"}
                                    {isPending && "Chưa nghiệm thu"}
                                </span>
                            </div>
                        </div>

                        <span className="text-[11px] font-medium opacity-80">
                            {video.createTime.toLocaleDateString("vi-VN")}
                        </span>
                    </div>

                    {/* Review Note / Comment Card */}
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                                <MessageSquareText className="h-3.5 w-3.5 text-blue-500" />
                                Nhận xét / Ghi chú từ Reviewer
                            </span>
                            {video.acceptanceNote && (
                                <button
                                    onClick={handleCopyNote}
                                    className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="h-3 w-3 text-green-500" />
                                            <span className="text-green-600 dark:text-green-400">Đã chép</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-3 w-3" />
                                            <span>Sao chép</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>

                        {video.acceptanceNote ? (
                            <div className="rounded-lg bg-white dark:bg-zinc-800/80 p-3.5 border border-zinc-200/70 dark:border-zinc-700/60 shadow-xs">
                                <p className="text-sm text-zinc-800 dark:text-zinc-100 whitespace-pre-wrap leading-relaxed select-text font-normal">
                                    {video.acceptanceNote}
                                </p>
                            </div>
                        ) : (
                            <div className="rounded-lg bg-white/60 dark:bg-zinc-800/40 p-4 border border-dashed border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-400 italic">
                                Không có ghi chú nhận xét chi tiết kèm theo cho clip này.
                            </div>
                        )}

                        {isRejected && (
                            <p className="text-[11px] text-red-600 dark:text-red-400 leading-normal pt-1">
                                💡 Video không được duyệt nghiệm thu. Bạn hãy đối chiếu nhận xét ở trên để điều chỉnh clip hoặc trao đổi thêm với Admin/Reviewer nhé.
                            </p>
                        )}
                        {isApproved && (
                            <p className="text-[11px] text-green-600 dark:text-green-400 leading-normal pt-1">
                                🎉 Video đã được duyệt nghiệm thu hợp lệ.
                            </p>
                        )}
                    </div>

                    {/* Video Information Summary */}
                    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 p-4 space-y-3 bg-white dark:bg-zinc-900">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Film className="h-3.5 w-3.5 text-zinc-400" />
                            Thông tin video
                        </span>

                        {/* Caption & Hashtag */}
                        <div>
                            <p className="text-sm font-semibold text-zinc-900 dark:text-white leading-snug">
                                {captionClean || "Không có tiêu đề / caption"}
                            </p>
                            {hashtags && (
                                <p className="mt-1 text-xs font-bold text-blue-500 dark:text-blue-400 break-words">
                                    {hashtags}
                                </p>
                            )}
                        </div>

                        {/* Channel & Project Info */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                            <div>
                                <span className="text-zinc-400 block mb-0.5">Kênh</span>
                                <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate block">
                                    {video.channelDisplayName || video.channelUsername || "—"}
                                </span>
                            </div>
                            <div>
                                <span className="text-zinc-400 block mb-0.5">Dự án</span>
                                <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate block">
                                    {projectName || "—"}
                                </span>
                            </div>
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-center">
                            <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded-lg">
                                <span className="text-[10px] text-zinc-400 block">Lượt xem</span>
                                <span className="text-xs font-bold text-zinc-900 dark:text-white">
                                    {(video.stats?.view || 0).toLocaleString("vi-VN")}
                                </span>
                            </div>
                            <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded-lg">
                                <span className="text-[10px] text-zinc-400 block">Like</span>
                                <span className="text-xs font-bold text-zinc-900 dark:text-white">
                                    {(video.stats?.like || 0).toLocaleString("vi-VN")}
                                </span>
                            </div>
                            <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded-lg">
                                <span className="text-[10px] text-zinc-400 block">Bình luận</span>
                                <span className="text-xs font-bold text-zinc-900 dark:text-white">
                                    {(video.stats?.comment || 0).toLocaleString("vi-VN")}
                                </span>
                            </div>
                            <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded-lg">
                                <span className="text-[10px] text-zinc-400 block">Chia sẻ</span>
                                <span className="text-xs font-bold text-zinc-900 dark:text-white">
                                    {(video.stats?.share || 0).toLocaleString("vi-VN")}
                                </span>
                            </div>
                        </div>

                        {/* Action Links */}
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                            {video.link && (
                                <a
                                    href={video.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors"
                                >
                                    <ExternalLink className="h-3.5 w-3.5 text-blue-500" />
                                    Xem trên TikTok
                                </a>
                            )}
                            {video.fileLink && (
                                <a
                                    href={video.fileLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-xs font-semibold text-emerald-700 dark:text-emerald-300 transition-colors"
                                >
                                    <FileText className="h-3.5 w-3.5" />
                                    Link file dựng
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end px-5 sm:px-6 py-3.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                    <button
                        onClick={onClose}
                        className="rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 text-white px-4 py-2 text-xs font-semibold transition-colors"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
