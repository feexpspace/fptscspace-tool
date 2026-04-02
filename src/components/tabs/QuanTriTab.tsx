"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, X, ChevronDown, ChevronUp, Pencil, Check, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getAllUsersWithChannels, approveUser, deleteUserAccount, UserWithChannels } from "@/app/actions/account";
import { Team } from "@/types";
import { getTeamsList } from "@/app/actions/helpers";
import { createNewTeam, deleteTeam, updateTeamName, assignUserToTeam } from "@/app/actions/team";
import { CustomSelect } from "@/components/CustomSelect";

export function QuanTriTab() {
    const { user } = useAuth();
    const [teams, setTeams] = useState<Team[]>([]);
    const [users, setUsers] = useState<UserWithChannels[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
    const [showCreateTeam, setShowCreateTeam] = useState(false);
    const [newTeamName, setNewTeamName] = useState("");
    const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
    const [editTeamName, setEditTeamName] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const [filterTeamId, setFilterTeamId] = useState<string>("");

    const refresh = async (showSpinner = true) => {
        if (!user) return;
        if (showSpinner) setLoading(true);
        const [teamsData, usersResult] = await Promise.all([
            getTeamsList(user.id, "admin"),
            getAllUsersWithChannels(),
        ]);
        setTeams(teamsData);
        if (usersResult.success && usersResult.data) setUsers(usersResult.data);
        if (showSpinner) setLoading(false);
    };

    useEffect(() => { refresh(true); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

    const handleCreateTeam = async () => {
        if (!newTeamName.trim()) return;
        setActionLoading(true);
        await createNewTeam(newTeamName.trim(), []);
        setNewTeamName(""); setShowCreateTeam(false);
        await refresh(false); setActionLoading(false);
    };

    const handleDeleteTeam = async (teamId: string) => {
        if (!confirm("Bạn có chắc muốn xóa Mảng này?")) return;
        setActionLoading(true);
        await deleteTeam(teamId); setExpandedTeam(null);
        await refresh(false); setActionLoading(false);
    };

    const handleRenameTeam = async (teamId: string) => {
        if (!editTeamName.trim()) return;
        setActionLoading(true);
        await updateTeamName(teamId, editTeamName.trim());
        setEditingTeamId(null); await refresh(false); setActionLoading(false);
    };

    const handleAssignTeam = async (userId: string, teamId: string) => {
        setActionLoading(true);
        await assignUserToTeam(userId, teamId || null);
        await refresh(false); setActionLoading(false);
    };

    const getUserName = (userId: string) => users.find(u => u.id === userId)?.name || userId;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-white" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
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
                    <div className="flex items-center gap-3">
                        <CustomSelect
                            value={filterTeamId}
                            onChange={v => setFilterTeamId(v)}
                            options={[{ value: "", label: "Tất cả mảng" }, ...teams.map(t => ({ value: t.id, label: t.name }))]}
                            className="bg-white dark:bg-zinc-900 w-48 shadow-none"
                        />
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
                <div className="rounded-xl border border-zinc-100/50 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:border-zinc-800/50 dark:bg-zinc-900">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-zinc-100 dark:border-zinc-800/80">
                                <th className="px-6 py-5 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50">Người dùng</th>
                                <th className="px-6 py-5 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50">Kênh TikTok</th>
                                <th className="px-6 py-5 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50">Mảng</th>
                                <th className="px-6 py-5 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-900/50">Vai trò</th>
                                <th className="px-6 py-5 text-right w-10 bg-zinc-50/50 dark:bg-zinc-900/50"></th>
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
                                        <td className="px-6 py-4">
                                            <div>
                                                <span className="font-bold text-zinc-900 dark:text-white block mb-0.5">{u.name}</span>
                                                <p className="text-xs font-medium text-zinc-400">{u.email}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {u.channels.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {u.channels.map(ch => (
                                                        <span key={ch.id} className="inline-flex items-center rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                                            {ch.displayName || ch.username}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-xs font-medium text-zinc-400 italic">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 max-w-[200px] relative hover:z-50">
                                            <div className="w-40 relative">
                                                <CustomSelect
                                                    value={currentTeamId}
                                                    disabled={actionLoading}
                                                    onChange={tId => handleAssignTeam(u.id, tId)}
                                                    options={teams.map(t => ({ value: t.id, label: t.name }))}
                                                    placeholder="— Chưa có Mảng —"
                                                    className="px-3 py-2 text-xs font-semibold bg-zinc-50 dark:bg-[#1a1a1a] shadow-none w-full"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest ${
                                                u.role === 'admin'
                                                    ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                                    : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                                            }`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
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
        </div>
    );
}
