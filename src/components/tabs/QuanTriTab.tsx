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

    const refresh = async () => {
        if (!user) return;
        setLoading(true);
        const [teamsData, usersResult] = await Promise.all([
            getTeamsList(user.id, "admin"),
            getAllUsersWithChannels(),
        ]);
        setTeams(teamsData);
        if (usersResult.success && usersResult.data) setUsers(usersResult.data);
        setLoading(false);
    };

    useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

    const handleCreateTeam = async () => {
        if (!newTeamName.trim()) return;
        setActionLoading(true);
        await createNewTeam(newTeamName.trim(), []);
        setNewTeamName(""); setShowCreateTeam(false);
        await refresh(); setActionLoading(false);
    };

    const handleDeleteTeam = async (teamId: string) => {
        if (!confirm("Bạn có chắc muốn xóa Mảng này?")) return;
        setActionLoading(true);
        await deleteTeam(teamId); setExpandedTeam(null);
        await refresh(); setActionLoading(false);
    };

    const handleRenameTeam = async (teamId: string) => {
        if (!editTeamName.trim()) return;
        setActionLoading(true);
        await updateTeamName(teamId, editTeamName.trim());
        setEditingTeamId(null); await refresh(); setActionLoading(false);
    };

    const handleAssignTeam = async (userId: string, teamId: string) => {
        setActionLoading(true);
        await assignUserToTeam(userId, teamId || null);
        await refresh(); setActionLoading(false);
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
                                    onClick={async () => { setActionLoading(true); await approveUser(u.id); await refresh(); setActionLoading(false); }}
                                    className="flex items-center gap-2 rounded-xl bg-yellow-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(234,179,8,0.25)] hover:bg-yellow-600 active:scale-[0.98] disabled:opacity-50 transition-all">
                                    <ShieldCheck className="h-4 w-4 stroke-[2]" /> Duyệt
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* === Quản lý Mảng === */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-extrabold text-zinc-900 dark:text-white">Quản lý Mảng</h2>
                    <button onClick={() => setShowCreateTeam(!showCreateTeam)}
                        className="flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-[13px] font-bold text-white shadow-[0_4px_14px_rgba(0,0,0,0.15)] hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:shadow-[0_4px_14px_rgba(255,255,255,0.15)] active:scale-[0.98] transition-all">
                        <Plus className="h-4 w-4 stroke-[2]" /> Tạo Mảng
                    </button>
                </div>

                {showCreateTeam && (
                    <div className="mb-4 flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
                        <input type="text" value={newTeamName} onChange={e => setNewTeamName(e.target.value)}
                            placeholder="Tên Mảng mới..."
                            className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                            onKeyDown={e => e.key === 'Enter' && handleCreateTeam()} />
                        <button onClick={handleCreateTeam} disabled={actionLoading || !newTeamName.trim()}
                            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900">
                            Tạo
                        </button>
                        <button onClick={() => setShowCreateTeam(false)} className="p-2 text-zinc-400 hover:text-zinc-600">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {teams.map(team => (
                        <div key={team.id} className="rounded-xl border border-zinc-100/50 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:border-zinc-800/50 dark:bg-[#121212] overflow-hidden transition-all">
                            <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-zinc-50/50 dark:hover:bg-[#1a1a1a]/50"
                                onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}>
                                <div className="flex items-center gap-3">
                                    {expandedTeam === team.id ? <ChevronUp className="h-4 w-4 text-zinc-400 stroke-[2.5]" /> : <ChevronDown className="h-4 w-4 text-zinc-400 stroke-[2.5]" />}
                                    {editingTeamId === team.id ? (
                                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                            <input type="text" value={editTeamName} onChange={e => setEditTeamName(e.target.value)} autoFocus
                                                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-[#1a1a1a] dark:text-white outline-none"
                                                onKeyDown={e => e.key === 'Enter' && handleRenameTeam(team.id)} />
                                            <button onClick={() => handleRenameTeam(team.id)} className="text-green-500 hover:text-green-600 bg-green-50 p-2 rounded-lg dark:bg-green-900/20"><Check className="h-4 w-4" /></button>
                                            <button onClick={() => setEditingTeamId(null)} className="text-zinc-400 hover:text-zinc-600 bg-zinc-50 p-2 rounded-lg dark:bg-zinc-800"><X className="h-4 w-4" /></button>
                                        </div>
                                    ) : (
                                        <span className="font-bold text-zinc-900 dark:text-white">{team.name}</span>
                                    )}
                                    <span className="text-xs font-semibold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full dark:bg-zinc-800">{team.members?.length || 0}</span>
                                </div>
                                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => { setEditingTeamId(team.id); setEditTeamName(team.name); }}
                                        className="p-2 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg dark:hover:bg-blue-900/20 transition-colors">
                                        <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button onClick={() => handleDeleteTeam(team.id)}
                                        className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg dark:hover:bg-red-900/20 transition-colors">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>

                            {expandedTeam === team.id && (
                                <div className="border-t border-zinc-100 dark:border-zinc-800/80 px-5 py-4 bg-zinc-50/30 dark:bg-[#1a1a1a]/30">
                                    <p className="text-[10px] text-zinc-400 mb-3 font-bold uppercase tracking-widest">Thành viên</p>
                                    {team.members?.length > 0 ? (
                                        <div className="space-y-2">
                                            {team.members.map(memId => (
                                                <div key={memId} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                                    {getUserName(memId)}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-[13px] font-medium text-zinc-400 italic">Chưa có thành viên (thêm từ bảng bên dưới)</p>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    {teams.length === 0 && (
                        <div className="col-span-full">
                            <p className="text-center text-sm font-medium text-zinc-400 py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">Chưa có Mảng nào được tạo</p>
                        </div>
                    )}
                </div>
            </div>

            {/* === Tổng quan kênh === */}
            <div className="space-y-4">
                <h2 className="text-lg font-extrabold text-zinc-900 dark:text-white">Tổng quan kênh</h2>
                <div className="overflow-x-auto rounded-xl border border-zinc-100/50 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:border-zinc-800/50 dark:bg-[#121212]">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-zinc-100 dark:border-zinc-800/80">
                                <th className="px-6 py-5 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-[#1a1a1a]/50">Người dùng</th>
                                <th className="px-6 py-5 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-[#1a1a1a]/50">Kênh TikTok</th>
                                <th className="px-6 py-5 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-[#1a1a1a]/50">Mảng</th>
                                <th className="px-6 py-5 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50 dark:bg-[#1a1a1a]/50">Vai trò</th>
                                <th className="px-6 py-5 text-right w-10 bg-zinc-50/50 dark:bg-[#1a1a1a]/50"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.filter(u => u.status === 'approved').map(u => {
                                const currentTeamId = teams.find(t => t.members?.includes(u.id))?.id || "";
                                return (
                                    <tr key={u.id} className="border-b border-zinc-50/50 last:border-0 dark:border-zinc-800/30 hover:bg-zinc-50/50 dark:hover:bg-[#1a1a1a]/50 transition-colors">
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
                                        <td className="px-6 py-4">
                                            <div className="w-40 xl:w-48">
                                                <CustomSelect
                                                    value={currentTeamId}
                                                    disabled={actionLoading}
                                                    onChange={tId => handleAssignTeam(u.id, tId)}
                                                    options={teams.map(t => ({ value: t.id, label: t.name }))}
                                                    placeholder="— Chưa có Mảng —"
                                                    className="px-3 py-2 text-xs font-semibold bg-zinc-50 dark:bg-[#1a1a1a] shadow-sm w-full"
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
                                                        await refresh(); setActionLoading(false);
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
