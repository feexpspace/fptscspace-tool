"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { 
    ExternalLink, RefreshCw, Link as LinkIcon, ChevronUp, ChevronDown, 
    Eye, Heart, MessageCircle, Share2, Film, Copy, Check, FileText, 
    FolderKanban, Search, X, RotateCcw, MessageSquareText, Filter
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { Pagination } from "@/components/Pagination";
import { CustomSelect } from "@/components/CustomSelect";
import { updateVideoMeta } from "@/app/actions/videos";
import { AcceptanceBadge } from "@/components/AcceptanceBadge";
import { VideoReviewModal } from "@/components/VideoReviewModal";
import { Video } from "@/types";

export function CaNhanTab() {
    const { user, isAdmin } = useAuth();
    const { allVideos, channelTeamMap, teams, projects, hasChannel, videosLoading, metaLoading, syncing, doSync, updateVideoLocal } = useData();

    // Filters state
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedChannel, setSelectedChannel] = useState("");
    const [selectedTeam, setSelectedTeam] = useState("");
    const [selectedMonth, setSelectedMonth] = useState("");
    const [selectedProject, setSelectedProject] = useState("");
    const [selectedAcceptance, setSelectedAcceptance] = useState("");
    const [selectedNoteStatus, setSelectedNoteStatus] = useState("");
    const [selectedFileStatus, setSelectedFileStatus] = useState("");

    // Sorting & pagination
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
    const [page, setPage] = useState(1);
    const pageSize = 20;

    // Review note modal
    const [viewingReviewVideo, setViewingReviewVideo] = useState<Video | null>(null);

    // Admin copy feature
    const [copyDate, setCopyDate] = useState("");
    const [copied, setCopied] = useState(false);

    // Inline file link editing
    const [editingFileLink, setEditingFileLink] = useState<{ videoId: string; value: string } | null>(null);
    const [savingFileLink, setSavingFileLink] = useState<string | null>(null);
    const fileLinkInputRef = useRef<HTMLInputElement>(null);

    const monthOptions = useMemo(() => {
        const options: { value: string; label: string }[] = [];
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const value = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
            const label = `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
            options.push({ value, label });
        }
        return options;
    }, []);

    const activeProjects = useMemo(() => projects.filter(p => p.status === 'active'), [projects]);
    const projectFilterOptions = useMemo(() => [
        { value: '__unassigned__', label: '— Chưa gán dự án —' },
        ...projects.map(p => ({ value: p.id, label: p.name }))
    ], [projects]);

    const allChannels = useMemo(() => {
        const map = new Map<string, { id: string; displayName: string; username: string }>();
        allVideos.forEach(v => {
            if (!map.has(v.channelId)) {
                map.set(v.channelId, {
                    id: v.channelId,
                    displayName: v.channelDisplayName || v.channelUsername || v.channelId,
                    username: v.channelUsername || '',
                });
            }
        });
        return Array.from(map.values());
    }, [allVideos]);

    // Check if any filter is active
    const hasActiveFilters = Boolean(
        searchQuery.trim() ||
        selectedMonth ||
        selectedChannel ||
        selectedTeam ||
        selectedProject ||
        selectedAcceptance ||
        selectedNoteStatus ||
        selectedFileStatus
    );

    const handleResetFilters = () => {
        setSearchQuery("");
        setSelectedMonth("");
        setSelectedChannel("");
        setSelectedTeam("");
        setSelectedProject("");
        setSelectedAcceptance("");
        setSelectedNoteStatus("");
        setSelectedFileStatus("");
        setPage(1);
    };

    const filteredVideos = useMemo(() => {
        let videos = allVideos;

        // Search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            videos = videos.filter(v => {
                const caption = (v.title || v.description || "").toLowerCase();
                const channel = (v.channelDisplayName || v.channelUsername || "").toLowerCase();
                const note = (v.acceptanceNote || "").toLowerCase();
                const videoId = (v.videoId || "").toLowerCase();
                return caption.includes(query) || channel.includes(query) || note.includes(query) || videoId.includes(query);
            });
        }

        // Channel filter
        if (selectedChannel) {
            videos = videos.filter(v => v.channelId === selectedChannel);
        } else if (isAdmin && selectedTeam) {
            videos = videos.filter(v => channelTeamMap[v.channelId] === selectedTeam);
        }

        // Month filter
        if (selectedMonth) {
            const [year, mon] = selectedMonth.split('-').map(Number);
            videos = videos.filter(v => {
                const d = v.createTime;
                return d.getFullYear() === year && (d.getMonth() + 1) === mon;
            });
        }

        // Project filter
        if (selectedProject === '__unassigned__') {
            videos = videos.filter(v => !v.projectId);
        } else if (selectedProject) {
            videos = videos.filter(v => v.projectId === selectedProject);
        }

        // Acceptance filter
        if (selectedAcceptance === 'pending') {
            videos = videos.filter(v => !v.acceptanceStatus);
        } else if (selectedAcceptance) {
            videos = videos.filter(v => v.acceptanceStatus === selectedAcceptance);
        }

        // Note filter (has comment / no comment)
        if (selectedNoteStatus === 'has_note') {
            videos = videos.filter(v => Boolean(v.acceptanceNote && v.acceptanceNote.trim()));
        } else if (selectedNoteStatus === 'no_note') {
            videos = videos.filter(v => !v.acceptanceNote || !v.acceptanceNote.trim());
        }

        // File link filter
        if (selectedFileStatus === 'has_file') {
            videos = videos.filter(v => Boolean(v.fileLink && v.fileLink.trim()));
        } else if (selectedFileStatus === 'no_file') {
            videos = videos.filter(v => !v.fileLink || !v.fileLink.trim());
        }

        // Sorting
        videos = [...videos].sort((a, b) => {
            let aValue = 0, bValue = 0;
            if (sortConfig.key === 'date') { aValue = a.createTime.getTime(); bValue = b.createTime.getTime(); }
            else if (sortConfig.key === 'view') { aValue = a.stats?.view || 0; bValue = b.stats?.view || 0; }
            else if (sortConfig.key === 'like') { aValue = a.stats?.like || 0; bValue = b.stats?.like || 0; }
            else if (sortConfig.key === 'comment') { aValue = a.stats?.comment || 0; bValue = b.stats?.comment || 0; }
            else if (sortConfig.key === 'share') { aValue = a.stats?.share || 0; bValue = b.stats?.share || 0; }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return videos;
    }, [allVideos, searchQuery, channelTeamMap, selectedChannel, selectedTeam, selectedMonth, selectedProject, selectedAcceptance, selectedNoteStatus, selectedFileStatus, isAdmin, sortConfig]);

    const statsSummary = useMemo(() => {
        let views = 0, likes = 0, comments = 0, shares = 0;
        filteredVideos.forEach(v => {
            views += v.stats?.view || 0;
            likes += v.stats?.like || 0;
            comments += v.stats?.comment || 0;
            shares += v.stats?.share || 0;
        });
        return { views, likes, comments, shares };
    }, [filteredVideos]);

    useEffect(() => { 
        setPage(1); 
    }, [searchQuery, selectedChannel, selectedTeam, selectedMonth, selectedProject, selectedAcceptance, selectedNoteStatus, selectedFileStatus]);

    const totalPages = Math.ceil(filteredVideos.length / pageSize);
    const pagedVideos = filteredVideos.slice((page - 1) * pageSize, page * pageSize);

    const extractHashtags = (text: string) => {
        const matches = text.match(/#\w+/g);
        return matches ? matches.join(" ") : "";
    };

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
        setSortConfig({ key, direction });
        setPage(1);
    };

    const SortIcon = ({ sortKey }: { sortKey: string }) => {
        if (sortConfig.key !== sortKey) return <ChevronDown className="h-3 w-3 opacity-20 transition-opacity group-hover:opacity-100" />;
        return sortConfig.direction === 'asc'
            ? <ChevronUp className="h-3 w-3 text-blue-500" />
            : <ChevronDown className="h-3 w-3 text-blue-500" />;
    };

    // Save file link
    const handleSaveFileLink = async (videoId: string, value: string) => {
        setSavingFileLink(videoId);
        setEditingFileLink(null);
        await updateVideoMeta(videoId, { fileLink: value || null });
        updateVideoLocal(videoId, { fileLink: value || undefined });
        setSavingFileLink(null);
    };

    // Save project
    const handleSaveProject = async (videoId: string, projectId: string) => {
        await updateVideoMeta(videoId, { projectId: projectId || null });
        updateVideoLocal(videoId, { projectId: projectId || undefined });
    };

    // Admin copy feature
    const handleCopy = async () => {
        if (!copyDate) return;
        const [y, m, d] = copyDate.split('-').map(Number);
        const dateVideos = allVideos.filter(v => {
            const t = v.createTime;
            return t.getFullYear() === y && (t.getMonth() + 1) === m && t.getDate() === d;
        });

        if (dateVideos.length === 0) {
            alert("Không có video nào trong ngày này.");
            return;
        }

        const text = dateVideos.map((v, i) => {
            const link = v.link || "";
            const file = v.fileLink || "";
            return `${i + 1}. Tên clip\nLink: ${link}\nFile: ${file}`;
        }).join("\n\n");

        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-5">
            {/* Control & Filter Center */}
            <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 p-4 sm:p-5 shadow-xs">
                {/* Row 1: Search & Main Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-[240px] max-w-full sm:max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Tìm kiếm caption, hashtag, nhận xét..."
                            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50/70 dark:bg-zinc-800/60 pl-9.5 pr-8 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-800 transition-all h-[36px]"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        {/* Admin: Date + Copy */}
                        {isAdmin && (
                            <div className="flex items-center gap-1.5">
                                <input
                                    type="date"
                                    value={copyDate}
                                    onChange={e => setCopyDate(e.target.value)}
                                    className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1 text-[11px] text-zinc-900 dark:text-white outline-none focus:border-blue-400 h-[34px]"
                                />
                                <button
                                    onClick={handleCopy}
                                    disabled={!copyDate || copied}
                                    className="flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 h-[34px] px-3 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap cursor-pointer"
                                >
                                    {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                                    {copied ? "Đã copy!" : "Copy link"}
                                </button>
                            </div>
                        )}

                        {!isAdmin && hasChannel === false && !metaLoading && (
                            <a
                                href={`/api/tiktok/login?userId=${user?.id}`}
                                className="flex items-center gap-1.5 rounded-lg bg-blue-600 h-[34px] px-3 text-[12px] font-semibold text-white hover:bg-blue-700 active:scale-[0.98] transition-all whitespace-nowrap shadow-xs"
                            >
                                <LinkIcon className="h-3.5 w-3.5 stroke-[2]" />
                                Kết nối TikTok
                            </a>
                        )}
                        {(isAdmin || hasChannel) && (
                            <button
                                onClick={doSync}
                                disabled={syncing || videosLoading}
                                className="flex items-center cursor-pointer gap-1.5 rounded-lg bg-blue-600 h-[34px] px-3 text-[12px] font-semibold text-white hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap shadow-xs"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 stroke-[2] ${syncing ? "animate-spin" : ""}`} />
                                {syncing ? "Đang đồng bộ..." : "Đồng bộ"}
                            </button>
                        )}
                    </div>
                </div>

                {/* Row 2: Comprehensive Filters */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-zinc-400 uppercase tracking-wider mr-1 shrink-0">
                        <Filter className="h-3.5 w-3.5" />
                        <span>Bộ lọc:</span>
                    </div>

                    {/* Month filter */}
                    <div className="w-[145px] shrink-0">
                        <CustomSelect
                            value={selectedMonth}
                            onChange={v => setSelectedMonth(v)}
                            options={monthOptions}
                            placeholder="Tất cả thời gian"
                        />
                    </div>

                    {/* Channel filter (Available for both Admin and User if multiple channels exist) */}
                    {(isAdmin || allChannels.length > 1) && (
                        <div className="w-[160px] shrink-0">
                            <CustomSelect
                                value={selectedChannel}
                                onChange={v => { setSelectedChannel(v); if (isAdmin) setSelectedTeam(""); }}
                                options={allChannels.map(ch => ({ 
                                    value: ch.id, 
                                    label: `${ch.displayName}${ch.username ? ` (@${ch.username})` : ""}` 
                                }))}
                                placeholder="Tất cả kênh"
                            />
                        </div>
                    )}

                    {/* Team filter (Admin only) */}
                    {isAdmin && (
                        <div className="w-[140px] shrink-0">
                            <CustomSelect
                                value={selectedTeam}
                                onChange={v => { setSelectedTeam(v); setSelectedChannel(""); }}
                                options={teams.map(t => ({ value: t.id, label: t.name }))}
                                placeholder="Tất cả mảng"
                            />
                        </div>
                    )}

                    {/* Acceptance filter */}
                    <div className="w-[150px] shrink-0">
                        <CustomSelect
                            value={selectedAcceptance}
                            onChange={v => setSelectedAcceptance(v)}
                            options={[
                                { value: 'approved', label: '✅ Đã duyệt NT' },
                                { value: 'rejected', label: '❌ Không duyệt' },
                                { value: 'pending', label: '⏳ Chưa duyệt' },
                            ]}
                            placeholder="Tất cả nghiệm thu"
                        />
                    </div>

                    {/* Comment/Note filter (Crucial for reading reviewer feedback) */}
                    <div className="w-[165px] shrink-0">
                        <CustomSelect
                            value={selectedNoteStatus}
                            onChange={v => setSelectedNoteStatus(v)}
                            options={[
                                { value: 'has_note', label: '💬 Có nhận xét duyệt' },
                                { value: 'no_note', label: 'Chưa có nhận xét' },
                            ]}
                            placeholder="Tất cả nhận xét"
                        />
                    </div>

                    {/* Project filter */}
                    <div className="w-[155px] shrink-0">
                        <CustomSelect
                            value={selectedProject}
                            onChange={v => setSelectedProject(v)}
                            options={projectFilterOptions}
                            placeholder="Tất cả dự án"
                        />
                    </div>

                    {/* File link filter */}
                    <div className="w-[145px] shrink-0">
                        <CustomSelect
                            value={selectedFileStatus}
                            onChange={v => setSelectedFileStatus(v)}
                            options={[
                                { value: 'has_file', label: '📁 Đã có file dựng' },
                                { value: 'no_file', label: 'Chưa có file dựng' },
                            ]}
                            placeholder="Tất cả file dựng"
                        />
                    </div>

                    {/* Reset Filters button */}
                    {hasActiveFilters && (
                        <button
                            onClick={handleResetFilters}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200/80 dark:border-rose-900/50 transition-all cursor-pointer shrink-0 ml-auto"
                        >
                            <RotateCcw className="h-3 w-3" />
                            Xóa bộ lọc
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Summary row */}
            <div className="flex items-center justify-between flex-wrap gap-2 px-1">
                <div className="flex items-center flex-wrap gap-2">
                    {videosLoading ? (
                        <>
                            {[56, 80, 72, 80, 72].map((w, i) => (
                                <div key={i} className="h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" style={{ width: w }} />
                            ))}
                        </>
                    ) : (
                        <>
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-600 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 px-2.5 py-1.5 rounded-lg whitespace-nowrap">
                                <Film className="h-3.5 w-3.5 text-zinc-500" />
                                <span>{filteredVideos.length} clip {hasActiveFilters && allVideos.length !== filteredVideos.length && `(lọc từ ${allVideos.length})`}</span>
                            </span>
                            {filteredVideos.length > 0 && (
                                <>
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 px-2.5 py-1.5 rounded-lg whitespace-nowrap">
                                        <Eye className="h-3.5 w-3.5" />
                                        <span>{statsSummary.views.toLocaleString('vi-VN')}</span>
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400 px-2.5 py-1.5 rounded-lg whitespace-nowrap">
                                        <Heart className="h-3.5 w-3.5" />
                                        <span>{statsSummary.likes.toLocaleString('vi-VN')}</span>
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 px-2.5 py-1.5 rounded-lg whitespace-nowrap">
                                        <MessageCircle className="h-3.5 w-3.5" />
                                        <span>{statsSummary.comments.toLocaleString('vi-VN')}</span>
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400 px-2.5 py-1.5 rounded-lg whitespace-nowrap">
                                        <Share2 className="h-3.5 w-3.5" />
                                        <span>{statsSummary.shares.toLocaleString('vi-VN')}</span>
                                    </span>
                                </>
                            )}
                        </>
                    )}
                </div>

                {hasActiveFilters && !videosLoading && (
                    <span className="text-xs text-zinc-400 italic">
                        Đang áp dụng bộ lọc kết quả
                    </span>
                )}
            </div>

            {/* Video Table Container — Fixed layout to prevent right columns from being clipped */}
            {videosLoading ? (
                <div className="overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-xs custom-scrollbar">
                    <table className={`w-full ${isAdmin ? 'min-w-[1450px]' : 'min-w-[1280px]'} text-[11px] sm:text-[12px]`}>
                        <thead>
                            <tr className="border-b border-zinc-100 dark:border-zinc-800/80">
                                {['48px', '110px', isAdmin ? '160px' : null, '240px', '150px', '56px', '100px', '150px', '180px', '100px', '90px', '90px', '90px'].filter(Boolean).map((w, i) => (
                                    <th key={i} className="px-3 py-4 bg-zinc-50/50 dark:bg-zinc-900/50" style={{ width: w ?? 'auto' }}>
                                        <div className="h-3 rounded bg-zinc-200/70 dark:bg-zinc-700/50 animate-pulse" />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: 8 }).map((_, i) => (
                                <tr key={i} className="border-b border-zinc-50/50 last:border-0 dark:border-zinc-800/30">
                                    {[40, 70, ...(isAdmin ? [90] : []), 180, 100, 40, 40, 100, 120, 60, 50, 60, 50].map((w, j) => (
                                        <td key={j} className="px-3 py-4">
                                            <div className="h-3.5 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" style={{ width: w, opacity: 1 - i * 0.08 }} />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : pagedVideos.length > 0 ? (
                <>
                    {/* Responsive table wrapper with clear scrollbar and explicit minimum width */}
                    <div className="overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-xs custom-scrollbar">
                        <table className={`w-full ${isAdmin ? 'min-w-[1450px]' : 'min-w-[1280px]'} text-[11px] sm:text-[12px] text-left`}>
                            <thead>
                                <tr className="border-b border-zinc-100 dark:border-zinc-800/80">
                                    <th className="w-12 px-3 py-4 text-center text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50">#</th>
                                    <th className="w-28 px-3 py-4 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50 cursor-pointer group hover:bg-zinc-100 dark:hover:bg-zinc-800 whitespace-nowrap" onClick={() => handleSort('date')}>
                                        <div className="flex items-center gap-1.5">Thời gian <SortIcon sortKey="date" /></div>
                                    </th>
                                    {isAdmin && (
                                        <th className="w-40 px-3 py-4 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50 whitespace-nowrap">
                                            Kênh
                                        </th>
                                    )}
                                    <th className="min-w-[200px] max-w-[280px] px-3 py-4 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50">Caption</th>
                                    <th className="min-w-[130px] max-w-[190px] px-3 py-4 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50">Hashtag</th>
                                    <th className="w-14 px-3 py-4 text-center text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50">Link</th>
                                    <th className="w-28 px-3 py-4 text-center text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50">
                                        <div className="flex items-center justify-center gap-1"><FileText className="h-3 w-3" />File dựng</div>
                                    </th>
                                    <th className="w-44 px-3 py-4 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50">
                                        <div className="flex items-center gap-1"><FolderKanban className="h-3 w-3" />Dự án</div>
                                    </th>
                                    <th className="w-52 px-3 py-4 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50 whitespace-nowrap">
                                        Nghiệm thu & Nhận xét
                                    </th>
                                    <th className="w-28 px-3 py-4 text-right text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50 cursor-pointer group hover:bg-zinc-100 dark:hover:bg-zinc-800 whitespace-nowrap" onClick={() => handleSort('view')}>
                                        <div className="flex items-center justify-end gap-1.5"><SortIcon sortKey="view" /> <Eye className="h-3.5 w-3.5" /> Lượt xem</div>
                                    </th>
                                    <th className="w-24 px-3 py-4 text-right text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50 cursor-pointer group hover:bg-zinc-100 dark:hover:bg-zinc-800 whitespace-nowrap" onClick={() => handleSort('like')}>
                                        <div className="flex items-center justify-end gap-1.5"><SortIcon sortKey="like" /> <Heart className="h-3.5 w-3.5" /> Like</div>
                                    </th>
                                    <th className="w-24 px-3 py-4 text-right text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50 cursor-pointer group hover:bg-zinc-100 dark:hover:bg-zinc-800 whitespace-nowrap" onClick={() => handleSort('comment')}>
                                        <div className="flex items-center justify-end gap-1.5"><SortIcon sortKey="comment" /> <MessageCircle className="h-3.5 w-3.5" /> B.luận</div>
                                    </th>
                                    <th className="w-24 px-3 pr-6 py-4 text-right text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50 cursor-pointer group hover:bg-zinc-100 dark:hover:bg-zinc-800 whitespace-nowrap" onClick={() => handleSort('share')}>
                                        <div className="flex items-center justify-end gap-1.5"><SortIcon sortKey="share" /> <Share2 className="h-3.5 w-3.5" /> Chia sẻ</div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagedVideos.map((video, index) => {
                                    const caption = video.title || video.description || "";
                                    const captionClean = caption.replace(/#\w+/g, "").trim();
                                    const hashtags = extractHashtags(caption);
                                    const isEditingFile = editingFileLink?.videoId === video.id;
                                    const isSavingFile = savingFileLink === video.id;
                                    const projectName = projects.find(p => p.id === video.projectId)?.name;

                                    return (
                                        <tr key={video.id} className="border-b border-zinc-100/70 last:border-0 dark:border-zinc-800/40 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                                            {/* Index */}
                                            <td className="px-3 py-4 text-center text-zinc-400 font-medium">
                                                {(page - 1) * pageSize + index + 1}
                                            </td>

                                            {/* Date */}
                                            <td className="px-3 py-4 font-semibold text-zinc-500 whitespace-nowrap">
                                                {video.createTime.toLocaleDateString("vi-VN")}
                                            </td>

                                            {/* Channel (Admin only) */}
                                            {isAdmin && (
                                                <td className="px-3 py-4">
                                                    <span className="font-bold tracking-tight text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800 px-2 py-1.5 rounded-lg whitespace-nowrap block truncate max-w-[150px]" title={video.channelDisplayName || video.channelUsername}>
                                                        {video.channelDisplayName || video.channelUsername}
                                                    </span>
                                                </td>
                                            )}

                                            {/* Caption */}
                                            <td className="px-3 py-4 max-w-[240px] md:max-w-[280px] relative group cursor-help hover:z-50">
                                                <div className="line-clamp-2 leading-relaxed text-zinc-600 dark:text-zinc-400 font-medium">
                                                    {captionClean || "—"}
                                                </div>
                                                {captionClean && (
                                                    <div className="absolute left-10 top-full mt-2 z-[100] hidden group-hover:block rounded-xl border border-zinc-200 bg-white p-3.5 font-medium leading-relaxed text-zinc-700 shadow-xl dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 w-max max-w-[340px] whitespace-pre-wrap">
                                                        {captionClean}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Hashtag */}
                                            <td className="px-3 py-4 max-w-[140px] md:max-w-[180px] relative group cursor-help hover:z-50">
                                                <div className="line-clamp-1 leading-relaxed font-bold text-blue-500 dark:text-blue-400 break-all whitespace-pre-wrap">
                                                    {hashtags || "—"}
                                                </div>
                                                {hashtags && (
                                                    <div className="absolute left-10 top-full mt-2 z-[100] hidden group-hover:block rounded-xl border border-blue-200/80 bg-blue-50 p-3.5 font-bold leading-relaxed text-blue-600 shadow-xl dark:border-blue-900/50 dark:bg-blue-950 dark:text-blue-400 w-max max-w-[280px] whitespace-pre-wrap">
                                                        {hashtags}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Link clip */}
                                            <td className="px-3 py-4 text-center">
                                                {video.link && (
                                                    <a href={video.link} target="_blank" rel="noopener noreferrer"
                                                        title="Xem video trên TikTok"
                                                        className="inline-flex text-zinc-400 hover:text-blue-500 transition-colors bg-white hover:bg-blue-50 dark:bg-zinc-800 dark:hover:bg-blue-900/30 p-2 rounded-lg border border-zinc-200/60 dark:border-zinc-700/50">
                                                        <ExternalLink className="h-4 w-4 stroke-[2.5]" />
                                                    </a>
                                                )}
                                            </td>

                                            {/* Link file — inline edit */}
                                            <td className="px-3 py-4 text-center">
                                                {isEditingFile ? (
                                                    <div className="flex items-center justify-center gap-1">
                                                        <input
                                                            ref={fileLinkInputRef}
                                                            autoFocus
                                                            value={editingFileLink.value}
                                                            onChange={e => setEditingFileLink({ videoId: video.id, value: e.target.value })}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') handleSaveFileLink(video.id, editingFileLink.value);
                                                                if (e.key === 'Escape') setEditingFileLink(null);
                                                            }}
                                                            onBlur={() => handleSaveFileLink(video.id, editingFileLink.value)}
                                                            placeholder="Dán link drive..."
                                                            className="w-[140px] rounded-lg border border-blue-400 bg-white dark:bg-zinc-800 dark:border-blue-500 px-2 py-1 text-[11px] text-zinc-900 dark:text-white outline-none shadow-xs"
                                                        />
                                                    </div>
                                                ) : isSavingFile ? (
                                                    <div className="inline-flex items-center justify-center h-8 w-8">
                                                        <div className="h-3 w-3 animate-spin rounded-full border border-zinc-300 border-t-zinc-600" />
                                                    </div>
                                                ) : video.fileLink ? (
                                                    <button
                                                        onClick={() => setEditingFileLink({ videoId: video.id, value: video.fileLink || "" })}
                                                        title={`Bấm để sửa: ${video.fileLink}`}
                                                        className="inline-flex items-center justify-center text-emerald-600 hover:text-emerald-700 transition-colors bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 p-2 rounded-lg border border-emerald-200/70 dark:border-emerald-800/60 cursor-pointer"
                                                    >
                                                        <FileText className="h-4 w-4 stroke-[2.5]" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => setEditingFileLink({ videoId: video.id, value: "" })}
                                                        title="Thêm link file dựng"
                                                        className="inline-flex items-center justify-center text-zinc-300 hover:text-zinc-500 transition-colors bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 p-2 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700 cursor-pointer"
                                                    >
                                                        <FileText className="h-4 w-4 stroke-[2]" />
                                                    </button>
                                                )}
                                            </td>

                                            {/* Project dropdown */}
                                            <td className="px-3 py-4">
                                                <div className="w-[145px]">
                                                    <CustomSelect
                                                        value={video.projectId || ""}
                                                        onChange={val => handleSaveProject(video.id, val)}
                                                        options={activeProjects.map(p => ({ value: p.id, label: p.name }))}
                                                        placeholder={projectName ? undefined : "— Chọn —"}
                                                    />
                                                    {video.projectId && !activeProjects.find(p => p.id === video.projectId) && projectName && (
                                                        <span className="mt-1 block text-[10px] text-zinc-400 italic truncate">{projectName} (đã kết thúc)</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Acceptance & Review Comment */}
                                            <td className="px-3 py-4">
                                                <div className="flex flex-col gap-1.5 items-start">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <AcceptanceBadge status={video.acceptanceStatus} />
                                                        
                                                        {/* Details button if status is approved/rejected but no comment text */}
                                                        {(!video.acceptanceNote && (video.acceptanceStatus === 'approved' || video.acceptanceStatus === 'rejected')) && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setViewingReviewVideo(video)}
                                                                className="text-[10px] font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                                                                title="Xem thông tin nghiệm thu"
                                                            >
                                                                Chi tiết
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Review comment preview & modal trigger */}
                                                    {video.acceptanceNote && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setViewingReviewVideo(video)}
                                                            className="flex items-center gap-1.5 w-full text-left rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all border group cursor-pointer shadow-2xs
                                                                bg-blue-50/90 text-blue-800 border-blue-200/80 hover:bg-blue-100 hover:border-blue-300
                                                                dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800/60 dark:hover:bg-blue-900/50"
                                                            title="Bấm để đọc toàn bộ nhận xét nghiệm thu"
                                                        >
                                                            <MessageSquareText className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                                                            <span className="truncate flex-1 font-semibold">{video.acceptanceNote}</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Views */}
                                            <td className="px-3 py-4 text-right font-bold text-zinc-900 dark:text-white whitespace-nowrap">
                                                {(video.stats?.view || 0).toLocaleString("vi-VN")}
                                            </td>

                                            {/* Likes */}
                                            <td className="px-3 py-4 text-right font-medium text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                                                {(video.stats?.like || 0).toLocaleString("vi-VN")}
                                            </td>

                                            {/* Comments count */}
                                            <td className="px-3 py-4 text-right font-medium text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                                                {(video.stats?.comment || 0).toLocaleString("vi-VN")}
                                            </td>

                                            {/* Shares count (Right-most column with ample padding) */}
                                            <td className="px-3 pr-6 py-4 text-right font-medium text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                                                {(video.stats?.share || 0).toLocaleString("vi-VN")}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                </>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-400 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/30">
                    <Film className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mb-2" />
                    <p className="font-semibold text-sm text-zinc-600 dark:text-zinc-400">Không tìm thấy video nào</p>
                    <p className="text-xs text-zinc-400 mt-1">
                        {hasActiveFilters ? "Thử điều chỉnh hoặc xóa bớt bộ lọc đang áp dụng." : "Hiện chưa có dữ liệu video trên hệ thống."}
                    </p>
                    {hasActiveFilters && (
                        <button
                            onClick={handleResetFilters}
                            className="mt-4 px-3.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                        >
                            Đặt lại bộ lọc
                        </button>
                    )}
                </div>
            )}

            {/* Video Review Note Modal */}
            <VideoReviewModal
                video={viewingReviewVideo}
                projectName={projects.find(p => p.id === viewingReviewVideo?.projectId)?.name}
                onClose={() => setViewingReviewVideo(null)}
            />
        </div>
    );
}
