"use client";

import { useEffect, useState, useRef, useCallback, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Trash2, X, Pencil, Check, ShieldCheck, Unlink, WifiOff, Plus, ChevronDown, FolderKanban, PlayCircle, StopCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getAllUsersWithChannels, approveUser, deleteUserAccount, UserWithChannels, disconnectTikTokToken, disconnectTikTokFull, updateUserSchoolInfo } from "@/app/actions/account";
import { Team, Project } from "@/types";
import { getTeamsList } from "@/app/actions/helpers";
import { assignUserToTeam } from "@/app/actions/team";
import { getProjects, createProject, updateProject, deleteProject } from "@/app/actions/project";
import { CustomSelect } from "@/components/CustomSelect";
import { cn } from "@/lib/utils";

// Palette màu cho từng mảng (round-robin)
const TEAM_COLORS = [
    { bg: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",   ring: "hover:ring-blue-400" },
    { bg: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300", ring: "hover:ring-violet-400" },
    { bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", ring: "hover:ring-emerald-400" },
    { bg: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300", ring: "hover:ring-orange-400" },
    { bg: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",   ring: "hover:ring-rose-400" },
    { bg: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300", ring: "hover:ring-yellow-400" },
    { bg: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",   ring: "hover:ring-cyan-400" },
    { bg: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",   ring: "hover:ring-pink-400" },
];

// Tag + popover chọn mảng
interface TeamTagProps {
    teams: Team[];
    currentTeamId: string;
    disabled?: boolean;
    onAssign: (teamId: string) => void;
}

function TeamTag({ teams, currentTeamId, disabled, onAssign }: TeamTagProps) {
    const [open, setOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const posRef = useRef<CSSProperties>({});
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const currentTeam = teams.find(t => t.id === currentTeamId);
    const colorIdx = teams.findIndex(t => t.id === currentTeamId);
    const palette = TEAM_COLORS[colorIdx % TEAM_COLORS.length];

    const computePos = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const w = 200;
        const overflowR = rect.left + w > window.innerWidth;
        posRef.current = {
            position: "fixed",
            top: `${rect.bottom + 6}px`,
            left: overflowR ? "auto" : `${rect.left}px`,
            right: overflowR ? `${window.innerWidth - rect.right}px` : "auto",
            width: `${w}px`,
            zIndex: 99999,
        };
    }, []);

    const openPopover = useCallback(() => {
        if (disabled) return;
        computePos();
        setOpen(true);
        requestAnimationFrame(() => requestAnimationFrame(() => setIsVisible(true)));
    }, [disabled, computePos]);

    const closePopover = useCallback(() => {
        setIsVisible(false);
        setTimeout(() => setOpen(false), 150);
    }, []);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (triggerRef.current?.contains(e.target as Node) || popoverRef.current?.contains(e.target as Node)) return;
            closePopover();
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open, closePopover]);

    const select = (teamId: string) => {
        onAssign(teamId);
        closePopover();
    };

    return (
        <div className="flex items-center">
            {currentTeam ? (
                <button
                    ref={triggerRef}
                    onClick={open ? closePopover : openPopover}
                    disabled={disabled}
                    className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ring-0 ring-offset-0 hover:ring-2 transition-all",
                        palette.bg,
                        palette.ring,
                        disabled && "opacity-50 cursor-not-allowed"
                    )}
                >
                    {currentTeam.name}
                    <ChevronDown className={cn("h-3 w-3 opacity-60 transition-transform", open && "rotate-180")} />
                </button>
            ) : (
                <button
                    ref={triggerRef}
                    onClick={open ? closePopover : openPopover}
                    disabled={disabled}
                    className="inline-flex items-center gap-1 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 hover:border-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                    <Plus className="h-3 w-3" />
                    Mảng
                </button>
            )}

            {mounted && open && createPortal(
                <div
                    ref={popoverRef}
                    style={{
                        ...posRef.current,
                        opacity: isVisible ? 1 : 0,
                        transform: isVisible ? "translateY(0)" : "translateY(-5px)",
                        transition: "opacity 150ms ease, transform 150ms ease",
                    }}
                    className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-[#1c1c1e] overflow-hidden"
                >
                    <div className="p-1.5">
                        {currentTeamId && (
                            <button
                                onClick={() => select("")}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12px] text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                            >
                                <X className="h-3 w-3" />
                                Bỏ khỏi mảng
                            </button>
                        )}
                        {teams.map((t, i) => {
                            const pal = TEAM_COLORS[i % TEAM_COLORS.length];
                            const selected = t.id === currentTeamId;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => select(t.id)}
                                    className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-[12px] transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                >
                                    <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold", pal.bg)}>{t.name}</span>
                                    {selected && <Check className="h-3.5 w-3.5 text-zinc-500 stroke-[2.5]" />}
                                </button>
                            );
                        })}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

// Tag inline edit cho Trường / Cơ sở
interface InfoTagProps {
    label: string;
    value?: string;
    disabled?: boolean;
    onSave: (val: string) => void;
    color?: string;
}

function InfoTag({ label, value, disabled, onSave, color = "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300" }: InfoTagProps) {
    const [open, setOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [inputVal, setInputVal] = useState(value || "");
    const triggerRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const posRef = useRef<CSSProperties>({});
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const computePos = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const w = 200;
        const overflowR = rect.left + w > window.innerWidth;
        posRef.current = {
            position: "fixed",
            top: `${rect.bottom + 6}px`,
            left: overflowR ? "auto" : `${rect.left}px`,
            right: overflowR ? `${window.innerWidth - rect.right}px` : "auto",
            width: `${w}px`,
            zIndex: 99999,
        };
    }, []);

    const openPopover = useCallback(() => {
        if (disabled) return;
        setInputVal(value || "");
        computePos();
        setOpen(true);
        requestAnimationFrame(() => requestAnimationFrame(() => {
            setIsVisible(true);
            inputRef.current?.focus();
        }));
    }, [disabled, value, computePos]);

    const closePopover = useCallback(() => {
        setIsVisible(false);
        setTimeout(() => setOpen(false), 150);
    }, []);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (triggerRef.current?.contains(e.target as Node) || popoverRef.current?.contains(e.target as Node)) return;
            closePopover();
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open, closePopover]);

    const handleSave = () => {
        onSave(inputVal.trim());
        closePopover();
    };

    return (
        <div className="flex items-center">
            {value ? (
                <button
                    ref={triggerRef}
                    onClick={open ? closePopover : openPopover}
                    disabled={disabled}
                    className={cn(
                        "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold hover:ring-2 hover:ring-teal-400 ring-0 ring-offset-0 transition-all",
                        color,
                        disabled && "opacity-50 cursor-not-allowed"
                    )}
                >
                    {value}
                    <Pencil className="h-2.5 w-2.5 opacity-50" />
                </button>
            ) : (
                <button
                    ref={triggerRef}
                    onClick={open ? closePopover : openPopover}
                    disabled={disabled}
                    className="inline-flex items-center gap-1 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 hover:border-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                    <Plus className="h-3 w-3" />
                    {label}
                </button>
            )}

            {mounted && open && createPortal(
                <div
                    ref={popoverRef}
                    style={{
                        ...posRef.current,
                        opacity: isVisible ? 1 : 0,
                        transform: isVisible ? "translateY(0)" : "translateY(-5px)",
                        transition: "opacity 150ms ease, transform 150ms ease",
                    }}
                    className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-[#1c1c1e] shadow-lg overflow-hidden"
                >
                    <div className="p-3 space-y-2">
                        <input
                            ref={inputRef}
                            value={inputVal}
                            onChange={e => setInputVal(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') handleSave();
                                if (e.key === 'Escape') closePopover();
                            }}
                            placeholder={label}
                            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-[12px] text-zinc-900 dark:text-white outline-none focus:border-teal-400"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleSave}
                                className="flex-1 rounded-lg bg-teal-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-teal-700 transition-colors"
                            >
                                Lưu
                            </button>
                            {value && (
                                <button
                                    onClick={() => { onSave(""); closePopover(); }}
                                    className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-[11px] font-medium text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                >
                                    Xóa
                                </button>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

// Modal xác nhận ngắt kết nối TikTok
interface DisconnectModalProps {
    channelName: string;
    channelId: string;
    onClose: () => void;
    onAction: (channelId: string, full: boolean) => Promise<void>;
    loading: boolean;
}

function DisconnectModal({ channelName, channelId, onClose, onAction, loading }: DisconnectModalProps) {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-sm rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-[#1a1a1a] p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-start gap-4">
                    <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/30">
                        <WifiOff className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-zinc-900 dark:text-white text-[15px]">Ngắt kết nối TikTok</h3>
                        <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Kênh: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{channelName}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="ml-auto shrink-0 p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="space-y-2.5">
                    <button
                        disabled={loading}
                        onClick={() => onAction(channelId, false)}
                        className="w-full text-left rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 hover:border-orange-300 hover:bg-orange-50 dark:hover:border-orange-700/50 dark:hover:bg-orange-900/10 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="flex items-center gap-3">
                            <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30 transition-colors">
                                <Unlink className="h-4 w-4 text-zinc-500 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors" />
                            </div>
                            <div>
                                <p className="font-semibold text-[13px] text-zinc-900 dark:text-white">Chỉ ngắt kết nối</p>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Xóa token, giữ lại channel và toàn bộ video cũ</p>
                            </div>
                        </div>
                    </button>

                    <button
                        disabled={loading}
                        onClick={() => onAction(channelId, true)}
                        className="w-full text-left rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 hover:border-red-300 hover:bg-red-50 dark:hover:border-red-700/50 dark:hover:bg-red-900/10 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="flex items-center gap-3">
                            <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 group-hover:bg-red-100 dark:group-hover:bg-red-900/30 transition-colors">
                                <Trash2 className="h-4 w-4 text-zinc-500 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" />
                            </div>
                            <div>
                                <p className="font-semibold text-[13px] text-red-600 dark:text-red-400">Xóa hoàn toàn</p>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Xóa token, channel và tất cả video — không thể khôi phục</p>
                            </div>
                        </div>
                    </button>
                </div>

                <button
                    onClick={onClose}
                    disabled={loading}
                    className="w-full py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-[13px] font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                >
                    Hủy bỏ
                </button>
            </div>
        </div>
    );
}

export function QuanTriTab() {
    const { user } = useAuth();
    const [teams, setTeams] = useState<Team[]>([]);
    const [users, setUsers] = useState<UserWithChannels[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [filterTeamId, setFilterTeamId] = useState<string>("");
    const [disconnectModal, setDisconnectModal] = useState<{ channelId: string; channelName: string } | null>(null);

    // Project management state
    const [showCreateProject, setShowCreateProject] = useState(false);
    const [newProjectName, setNewProjectName] = useState("");
    const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
    const [editProjectName, setEditProjectName] = useState("");

    const refresh = async (showSpinner = true) => {
        if (!user) return;
        if (showSpinner) setLoading(true);
        const [teamsData, usersResult, projectsData] = await Promise.all([
            getTeamsList(user.id, "admin"),
            getAllUsersWithChannels(),
            getProjects(),
        ]);
        setTeams(teamsData);
        if (usersResult.success && usersResult.data) setUsers(usersResult.data);
        setProjects(projectsData);
        if (showSpinner) setLoading(false);
    };

    useEffect(() => { refresh(true); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

    const handleAssignTeam = async (userId: string, teamId: string) => {
        setActionLoading(true);
        await assignUserToTeam(userId, teamId || null);
        await refresh(false); setActionLoading(false);
    };

    const handleDisconnect = async (channelId: string, full: boolean) => {
        setActionLoading(true);
        if (full) {
            await disconnectTikTokFull(channelId);
        } else {
            await disconnectTikTokToken(channelId);
        }
        setDisconnectModal(null);
        await refresh(false);
        setActionLoading(false);
    };

    const handleUpdateSchool = async (userId: string, field: 'truong' | 'coSo', value: string) => {
        const u = users.find(x => x.id === userId);
        if (!u) return;
        const truong = field === 'truong' ? value : (u.truong || '');
        const coSo = field === 'coSo' ? value : (u.coSo || '');
        setActionLoading(true);
        await updateUserSchoolInfo(userId, truong, coSo);
        await refresh(false);
        setActionLoading(false);
    };

    // Project handlers
    const handleCreateProject = async () => {
        if (!newProjectName.trim()) return;
        setActionLoading(true);
        await createProject(newProjectName.trim());
        setNewProjectName(""); setShowCreateProject(false);
        await refresh(false); setActionLoading(false);
    };

    const handleRenameProject = async (projectId: string) => {
        if (!editProjectName.trim()) return;
        setActionLoading(true);
        await updateProject(projectId, { name: editProjectName.trim() });
        setEditingProjectId(null); await refresh(false); setActionLoading(false);
    };

    const handleToggleProjectStatus = async (p: Project) => {
        setActionLoading(true);
        await updateProject(p.id, { status: p.status === 'active' ? 'ended' : 'active' });
        await refresh(false); setActionLoading(false);
    };

    const handleDeleteProject = async (projectId: string) => {
        if (!confirm("Xóa dự án này? Các video đang thuộc dự án sẽ được bỏ liên kết.")) return;
        setActionLoading(true);
        await deleteProject(projectId);
        await refresh(false); setActionLoading(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-white" />
            </div>
        );
    }

    return (
        <>
            {disconnectModal && (
                <DisconnectModal
                    channelId={disconnectModal.channelId}
                    channelName={disconnectModal.channelName}
                    onClose={() => setDisconnectModal(null)}
                    onAction={handleDisconnect}
                    loading={actionLoading}
                />
            )}

            <div className="space-y-10">
                {/* === Tài khoản chờ duyệt === */}
                {users.filter(u => u.status === 'pending').length > 0 && (
                    <div className="space-y-3">
                        <h2 className="text-lg font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                            Chờ duyệt
                            <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-bold text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400">
                                {users.filter(u => u.status === 'pending').length}
                            </span>
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {users.filter(u => u.status === 'pending').map(u => (
                                <div key={u.id} className="flex items-center justify-between rounded-xl border border-yellow-200/50 bg-gradient-to-br from-yellow-50 to-white px-5 py-4 shadow-[0_4px_24px_rgba(234,179,8,0.06)] dark:border-yellow-900/30 dark:from-yellow-900/10 dark:to-[#121212]">
                                    <div>
                                        <p className="font-bold text-zinc-900 dark:text-white">{u.name}</p>
                                        <p className="text-xs font-medium text-zinc-500">{u.email}</p>
                                    </div>
                                    <button disabled={actionLoading}
                                        onClick={async () => { setActionLoading(true); await approveUser(u.id); await refresh(false); setActionLoading(false); }}
                                        className="flex items-center gap-2 rounded-xl bg-yellow-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(234,179,8,0.25)] hover:bg-yellow-600 active:scale-[0.98] disabled:opacity-50 transition-all">
                                        <ShieldCheck className="h-4 w-4 stroke-[2]" /> Duyệt
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* === Tổng quan kênh === */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div className="shrink-0 min-w-min sm:w-44">
                                <CustomSelect
                                    value={filterTeamId}
                                    onChange={v => setFilterTeamId(v)}
                                    placeholder="Tất cả mảng"
                                    options={teams.map(t => ({ value: t.id, label: t.name }))}
                                />
                            </div>
                            {!loading && (
                                <span className="text-xs font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 px-3 py-1.5 rounded-lg">
                                    {users.filter(u => u.status === 'approved').filter(u => {
                                        if (!filterTeamId) return true;
                                        const currentTeamId = teams.find(t => t.members?.includes(u.id))?.id || "";
                                        return currentTeamId === filterTeamId;
                                    }).reduce((sum, u) => sum + u.channels.length, 0)} kênh
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="rounded-xl border border-zinc-100/50 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:border-zinc-800/50 dark:bg-zinc-900 overflow-x-auto">
                        <table className="w-full text-[11px] sm:text-[12px]">
                            <thead>
                                <tr className="border-b border-zinc-100 dark:border-zinc-800/80">
                                    <th className="px-5 py-4 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50 whitespace-nowrap">Người dùng</th>
                                    <th className="px-5 py-4 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50 whitespace-nowrap">Kênh TikTok</th>
                                    <th className="px-5 py-4 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50 whitespace-nowrap">Mảng</th>
                                    <th className="px-5 py-4 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50 whitespace-nowrap">Trường</th>
                                    <th className="px-5 py-4 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50 whitespace-nowrap">Cơ sở</th>
                                    <th className="px-5 py-4 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50 whitespace-nowrap">Vai trò</th>
                                    <th className="px-5 py-4 text-right w-10 bg-zinc-50/50 dark:bg-zinc-900/50"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.filter(u => u.status === 'approved').filter(u => {
                                    if (!filterTeamId) return true;
                                    const currentTeamId = teams.find(t => t.members?.includes(u.id))?.id || "";
                                    return currentTeamId === filterTeamId;
                                }).map(u => {
                                    const currentTeamId = teams.find(t => t.members?.includes(u.id))?.id || "";
                                    return (
                                        <tr key={u.id} className="border-b border-zinc-50/50 last:border-0 dark:border-zinc-800/30 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                                            <td className="px-5 py-4">
                                                <div>
                                                    <span className="font-bold text-zinc-900 dark:text-white block mb-0.5">{u.name}</span>
                                                    <p className="font-medium text-zinc-400">{u.email}</p>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                {u.channels.length > 0 ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        {u.channels.map(ch => (
                                                            <div key={ch.id} className="group relative inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-2.5 py-1.5 dark:bg-zinc-800">
                                                                <span className="font-bold tracking-tight text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                                                                    {ch.displayName || ch.username}
                                                                </span>
                                                                <button
                                                                    disabled={actionLoading}
                                                                    onClick={() => setDisconnectModal({ channelId: ch.id, channelName: ch.displayName || ch.username || ch.id })}
                                                                    title="Ngắt kết nối TikTok"
                                                                    className="opacity-0 group-hover:opacity-100 flex items-center justify-center h-4 w-4 rounded text-zinc-400 hover:text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-all duration-150 disabled:cursor-not-allowed"
                                                                >
                                                                    <WifiOff className="h-3 w-3" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs font-medium text-zinc-400 italic">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <TeamTag
                                                    teams={teams}
                                                    currentTeamId={currentTeamId}
                                                    disabled={actionLoading}
                                                    onAssign={tId => handleAssignTeam(u.id, tId)}
                                                />
                                            </td>
                                            <td className="px-5 py-4">
                                                <InfoTag
                                                    label="Trường"
                                                    value={u.truong}
                                                    disabled={actionLoading}
                                                    onSave={val => handleUpdateSchool(u.id, 'truong', val)}
                                                    color="bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300"
                                                />
                                            </td>
                                            <td className="px-5 py-4">
                                                <InfoTag
                                                    label="Cơ sở"
                                                    value={u.coSo}
                                                    disabled={actionLoading}
                                                    onSave={val => handleUpdateSchool(u.id, 'coSo', val)}
                                                    color="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                                                />
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest ${
                                                    u.role === 'admin'
                                                        ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                                                }`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                {u.role !== 'admin' && (
                                                    <button disabled={actionLoading}
                                                        onClick={async () => {
                                                            if (!confirm(`Xóa tài khoản ${u.name}?`)) return;
                                                            setActionLoading(true);
                                                            await deleteUserAccount(u.id);
                                                            await refresh(false); setActionLoading(false);
                                                        }}
                                                        className="p-2 text-zinc-400 hover:bg-red-50 hover:text-red-500 rounded-lg dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* === Quản lý Dự án === */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                            <FolderKanban className="h-5 w-5 text-zinc-500" />
                            Dự án
                            <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-bold text-zinc-500 dark:text-zinc-400">
                                {projects.length}
                            </span>
                        </h2>
                        <button
                            disabled={actionLoading}
                            onClick={() => setShowCreateProject(true)}
                            className="flex items-center gap-1.5 rounded-xl bg-zinc-900 dark:bg-white px-4 py-2 text-[12px] font-bold text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors"
                        >
                            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                            Tạo dự án
                        </button>
                    </div>

                    {/* Create project form */}
                    {showCreateProject && (
                        <div className="flex items-center gap-2 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 px-4 py-3">
                            <input
                                autoFocus
                                value={newProjectName}
                                onChange={e => setNewProjectName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleCreateProject(); if (e.key === 'Escape') { setShowCreateProject(false); setNewProjectName(""); } }}
                                placeholder="Tên dự án..."
                                className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-[13px] text-zinc-900 dark:text-white outline-none focus:border-zinc-400"
                            />
                            <button onClick={handleCreateProject} disabled={actionLoading || !newProjectName.trim()}
                                className="flex items-center gap-1 rounded-lg bg-zinc-900 dark:bg-white px-3 py-2 text-[12px] font-semibold text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors">
                                <Check className="h-3.5 w-3.5" /> Tạo
                            </button>
                            <button onClick={() => { setShowCreateProject(false); setNewProjectName(""); }}
                                className="p-2 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    <div className="rounded-xl border border-zinc-100/50 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:border-zinc-800/50 dark:bg-zinc-900 overflow-hidden">
                        {projects.length === 0 ? (
                            <div className="flex items-center justify-center py-12 text-zinc-400 text-sm">
                                Chưa có dự án nào. Nhấn &quot;Tạo dự án&quot; để bắt đầu.
                            </div>
                        ) : (
                            <table className="w-full text-[12px]">
                                <thead>
                                    <tr className="border-b border-zinc-100 dark:border-zinc-800/80">
                                        <th className="px-5 py-4 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50">Tên dự án</th>
                                        <th className="px-5 py-4 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50">Trạng thái</th>
                                        <th className="px-5 py-4 text-right bg-zinc-50/50 dark:bg-zinc-900/50"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {projects.map(p => (
                                        <tr key={p.id} className="border-b border-zinc-50/50 last:border-0 dark:border-zinc-800/30 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                                            <td className="px-5 py-4">
                                                {editingProjectId === p.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            autoFocus
                                                            value={editProjectName}
                                                            onChange={e => setEditProjectName(e.target.value)}
                                                            onKeyDown={e => { if (e.key === 'Enter') handleRenameProject(p.id); if (e.key === 'Escape') setEditingProjectId(null); }}
                                                            className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-[12px] text-zinc-900 dark:text-white outline-none focus:border-blue-400 w-48"
                                                        />
                                                        <button onClick={() => handleRenameProject(p.id)} disabled={actionLoading}
                                                            className="p-1.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors">
                                                            <Check className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button onClick={() => setEditingProjectId(null)}
                                                            className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                                                            <X className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="font-semibold text-zinc-900 dark:text-white">{p.name}</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <button
                                                    onClick={() => handleToggleProjectStatus(p)}
                                                    disabled={actionLoading}
                                                    className={cn(
                                                        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all hover:opacity-80 disabled:opacity-50",
                                                        p.status === 'active'
                                                            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                                                            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                                                    )}
                                                >
                                                    {p.status === 'active'
                                                        ? <><PlayCircle className="h-3 w-3" /> Đang chạy</>
                                                        : <><StopCircle className="h-3 w-3" /> Đã kết thúc</>
                                                    }
                                                </button>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        disabled={actionLoading}
                                                        onClick={() => { setEditingProjectId(p.id); setEditProjectName(p.name); }}
                                                        className="p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg disabled:opacity-50 transition-colors"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        disabled={actionLoading}
                                                        onClick={() => handleDeleteProject(p.id)}
                                                        className="p-2 text-zinc-400 hover:bg-red-50 hover:text-red-500 rounded-lg dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
