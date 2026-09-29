"use client";

import { useMemo, useState } from "react";
import { X, ExternalLink, Check, XCircle, Eye, CheckCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { supabase } from "@/lib/supabase";
import { setVideoAcceptance } from "@/app/actions/acceptance";
import { AcceptanceBadge } from "@/components/AcceptanceBadge";
import { AcceptanceStatus } from "@/types";
import { cn } from "@/lib/utils";

interface ChannelAcceptanceModalProps {
    channelId: string;
    channelName: string;
    channelUsername?: string;
    month: string; // 'YYYY-MM' hoặc '' = tất cả thời gian
    onClose: () => void;
}

async function getAccessToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || "";
}

export function ChannelAcceptanceModal({ channelId, channelName, channelUsername, month, onClose }: ChannelAcceptanceModalProps) {
    const { canApprove } = useAuth();
    const { allVideos, updateVideoLocal } = useData();
    const [saving, setSaving] = useState<Set<string>>(new Set());
    const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
    const [error, setError] = useState("");

    const videos = useMemo(() => {
        let list = allVideos.filter(v => v.channelId === channelId);
        if (month) {
            const [year, mon] = month.split('-').map(Number);
            list = list.filter(v => v.createTime.getFullYear() === year && (v.createTime.getMonth() + 1) === mon);
        }
        return [...list].sort((a, b) => b.createTime.getTime() - a.createTime.getTime());
    }, [allVideos, channelId, month]);

    const counts = useMemo(() => ({
        approved: videos.filter(v => v.acceptanceStatus === 'approved').length,
        rejected: videos.filter(v => v.acceptanceStatus === 'rejected').length,
        pending: videos.filter(v => !v.acceptanceStatus).length,
    }), [videos]);

    const monthLabel = month
        ? `Tháng ${Number(month.split('-')[1])}/${month.split('-')[0]}`
        : "Tất cả thời gian";

    const markSaving = (ids: string[], on: boolean) => {
        setSaving(prev => {
            const next = new Set(prev);
            ids.forEach(id => on ? next.add(id) : next.delete(id));
            return next;
        });
    };

    const save = async (ids: string[], updates: { status?: AcceptanceStatus | null; note?: string | null }) => {
        setError("");
        markSaving(ids, true);
        const result = await setVideoAcceptance(await getAccessToken(), ids, updates);
        if (result.success) {
            ids.forEach(id => updateVideoLocal(id, {
                ...('status' in updates ? { acceptanceStatus: updates.status ?? null } : {}),
                ...('note' in updates ? { acceptanceNote: updates.note?.trim() || undefined } : {}),
            }));
        } else {
            setError(result.error || "Không lưu được.");
        }
        markSaving(ids, false);
    };

    const toggleStatus = (videoId: string, current: AcceptanceStatus | null | undefined, target: AcceptanceStatus) => {
        save([videoId], { status: current === target ? null : target });
    };

    const saveNote = (videoId: string, original?: string) => {
        const draft = noteDrafts[videoId];
        if (draft === undefined || draft.trim() === (original || "")) return;
        save([videoId], { note: draft });
    };

    const approveAllPending = () => {
        const ids = videos.filter(v => !v.acceptanceStatus).map(v => v.id);
        if (ids.length === 0) return;
        if (!confirm(`Duyệt nghiệm thu ${ids.length} clip chưa duyệt?`)) return;
        save(ids, { status: 'approved' });
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative flex flex-col w-full max-w-6xl max-h-[90vh] rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-[#1a1a1a] animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-start gap-4 px-5 sm:px-6 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="min-w-0">
                        <h3 className="font-bold text-zinc-900 dark:text-white text-[16px] truncate">
                            {channelName}
                            {channelUsername && <span className="ml-1.5 font-medium text-zinc-400">@{channelUsername}</span>}
                        </h3>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px] font-bold">
                            <span className="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-2 py-1 text-zinc-600 dark:text-zinc-300">{monthLabel}</span>
                            <span className="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-2 py-1 text-zinc-500">{videos.length} clip</span>
                            <span className="rounded-lg bg-green-100 dark:bg-green-900/40 px-2 py-1 text-green-700 dark:text-green-400">{counts.approved} đã duyệt</span>
                            <span className="rounded-lg bg-red-100 dark:bg-red-900/30 px-2 py-1 text-red-600 dark:text-red-400">{counts.rejected} không duyệt</span>
                            <span className="rounded-lg bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 text-yellow-700 dark:text-yellow-400">{counts.pending} chưa duyệt</span>
                        </div>
                    </div>
                    <div className="ml-auto flex items-center gap-2 shrink-0">
                        {canApprove && counts.pending > 0 && (
                            <button
                                onClick={approveAllPending}
                                disabled={saving.size > 0}
                                className="hidden sm:flex items-center gap-1.5 rounded-lg bg-green-600 h-[34px] px-3 text-[12px] font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                            >
                                <CheckCheck className="h-3.5 w-3.5" /> Duyệt tất cả chưa duyệt
                            </button>
                        )}
                        <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mx-5 sm:mx-6 mt-3 rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-[12px] font-medium text-red-600 dark:text-red-400">{error}</div>
                )}
                {!canApprove && (
                    <div className="mx-5 sm:mx-6 mt-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-[12px] text-zinc-500">
                        Bạn chỉ có quyền xem. Liên hệ admin để được cấp quyền duyệt nghiệm thu.
                    </div>
                )}

                {/* Body */}
                <div className="flex-1 overflow-auto custom-scrollbar px-2 sm:px-3 py-3">
                    {videos.length === 0 ? (
                        <div className="flex items-center justify-center py-16 text-zinc-400 text-sm">Không có video nào trong {monthLabel.toLowerCase()}</div>
                    ) : (
                        <table className="w-full text-[11px] sm:text-[12px]">
                            <thead>
                                <tr className="border-b border-zinc-100 dark:border-zinc-800/80">
                                    <th className="px-3 py-3 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest w-8">#</th>
                                    <th className="px-3 py-3 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Ngày đăng</th>
                                    <th className="px-3 py-3 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Caption</th>
                                    <th className="px-3 py-3 text-center text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Link</th>
                                    <th className="px-3 py-3 text-right text-[11px] font-bold text-zinc-400 uppercase tracking-widest"><Eye className="h-3.5 w-3.5 inline" /></th>
                                    <th className="px-3 py-3 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">Nghiệm thu</th>
                                    <th className="px-3 py-3 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest min-w-[220px]">Nhận xét</th>
                                </tr>
                            </thead>
                            <tbody>
                                {videos.map((v, idx) => {
                                    const caption = (v.title || v.description || "").replace(/#\w+/g, "").trim();
                                    const isSaving = saving.has(v.id);
                                    return (
                                        <tr key={v.id} className={cn(
                                            "border-b border-zinc-50/50 last:border-0 dark:border-zinc-800/30 transition-colors",
                                            v.acceptanceStatus === 'approved' && "bg-green-50/40 dark:bg-green-900/5",
                                            v.acceptanceStatus === 'rejected' && "bg-red-50/40 dark:bg-red-900/5",
                                        )}>
                                            <td className="px-3 py-3 text-zinc-400 font-medium">{idx + 1}</td>
                                            <td className="px-3 py-3 font-semibold text-zinc-500 whitespace-nowrap">{v.createTime.toLocaleDateString("vi-VN")}</td>
                                            <td className="px-3 py-3 max-w-[260px]">
                                                <div className="line-clamp-2 leading-relaxed text-zinc-600 dark:text-zinc-400 font-medium" title={caption}>{caption || "—"}</div>
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                {v.link && (
                                                    <a href={v.link} target="_blank" rel="noopener noreferrer"
                                                        className="inline-flex text-zinc-400 hover:text-blue-500 transition-colors bg-white hover:bg-blue-50 dark:bg-zinc-800 dark:hover:bg-blue-900/30 p-2 rounded-lg border border-zinc-100 dark:border-zinc-700/50">
                                                        <ExternalLink className="h-4 w-4 stroke-[2.5]" />
                                                    </a>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-right font-bold text-zinc-900 dark:text-white">{(v.stats?.view || 0).toLocaleString("vi-VN")}</td>
                                            <td className="px-3 py-3">
                                                {canApprove ? (
                                                    <div className={cn("flex items-center gap-1.5", isSaving && "opacity-50 pointer-events-none")}>
                                                        <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-lg border border-zinc-200 dark:border-zinc-700 px-2 py-1.5 hover:border-green-400 transition-colors whitespace-nowrap">
                                                            <input
                                                                type="checkbox"
                                                                checked={v.acceptanceStatus === 'approved'}
                                                                onChange={() => toggleStatus(v.id, v.acceptanceStatus, 'approved')}
                                                                className="h-3.5 w-3.5 accent-green-600 cursor-pointer"
                                                            />
                                                            <span className={cn("font-semibold", v.acceptanceStatus === 'approved' ? "text-green-600 dark:text-green-400" : "text-zinc-500")}>Duyệt NT</span>
                                                        </label>
                                                        <button
                                                            onClick={() => toggleStatus(v.id, v.acceptanceStatus, 'rejected')}
                                                            title="Không duyệt"
                                                            className={cn(
                                                                "inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 font-semibold transition-colors whitespace-nowrap",
                                                                v.acceptanceStatus === 'rejected'
                                                                    ? "border-red-300 bg-red-100 text-red-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400"
                                                                    : "border-zinc-200 text-zinc-400 hover:border-red-300 hover:text-red-500 dark:border-zinc-700"
                                                            )}
                                                        >
                                                            <XCircle className="h-3.5 w-3.5" /> Không duyệt
                                                        </button>
                                                        {isSaving && <div className="h-3 w-3 animate-spin rounded-full border border-zinc-300 border-t-zinc-600" />}
                                                    </div>
                                                ) : (
                                                    <AcceptanceBadge status={v.acceptanceStatus} />
                                                )}
                                            </td>
                                            <td className="px-3 py-3">
                                                {canApprove ? (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            value={noteDrafts[v.id] ?? v.acceptanceNote ?? ""}
                                                            onChange={e => setNoteDrafts(prev => ({ ...prev, [v.id]: e.target.value }))}
                                                            onBlur={() => saveNote(v.id, v.acceptanceNote)}
                                                            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                                            placeholder={v.acceptanceStatus === 'rejected' ? "Lý do không duyệt..." : "Nhận xét..."}
                                                            className={cn(
                                                                "w-full rounded-lg border bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-[12px] text-zinc-900 dark:text-white outline-none focus:border-blue-400",
                                                                v.acceptanceStatus === 'rejected' && !v.acceptanceNote && !noteDrafts[v.id]
                                                                    ? "border-red-300 dark:border-red-800"
                                                                    : "border-zinc-200 dark:border-zinc-700"
                                                            )}
                                                        />
                                                        {noteDrafts[v.id] !== undefined && noteDrafts[v.id].trim() === (v.acceptanceNote || "") && v.acceptanceNote && (
                                                            <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">{v.acceptanceNote || "—"}</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
