"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, X, Search, ChevronDown, ChevronUp, UserPlus, UserMinus, Pencil, Check, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getAllUsersWithChannels, approveUser, deleteUserAccount, UserWithChannels } from "@/app/actions/account";
import { Team } from "@/types";
import { getTeamsList } from "@/app/actions/helpers";
import {
    createNewTeam,
    deleteTeam,
    addMemberToTeam,
    removeMemberFromTeam,
    updateTeamName,
    searchAvailableUsers,
} from "@/app/actions/team";

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
    const [memberSearch, setMemberSearch] = useState("");
    const [memberResults, setMemberResults] = useState<{ id: string; name: string; email: string }[]>([]);
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

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const handleCreateTeam = async () => {
        if (!newTeamName.trim()) return;
        setActionLoading(true);
        await createNewTeam(newTeamName.trim(), []);
        setNewTeamName("");
        setShowCreateTeam(false);
        await refresh();
        setActionLoading(false);
    };

    const handleDeleteTeam = async (teamId: string) => {
        if (!confirm("Bạn có chắc muốn xóa Mảng này?")) return;
        setActionLoading(true);
        await deleteTeam(teamId);
        setExpandedTeam(null);
        await refresh();
        setActionLoading(false);
    };

    const handleRenameTeam = async (teamId: string) => {
        if (!editTeamName.trim()) return;
        setActionLoading(true);
        await updateTeamName(teamId, editTeamName.trim());
        setEditingTeamId(null);
        await refresh();
        setActionLoading(false);
    };

    const handleSearchMembers = async (term: string) => {
        setMemberSearch(term);
        if (term.length < 2) { setMemberResults([]); return; }
        const results = await searchAvailableUsers(term);
        setMemberResults(results.map(u => ({ id: u.id, name: u.name, email: u.email })));
    };

    const handleAddMember = async (teamId: string, userId: string) => {
        setActionLoading(true);
        await addMemberToTeam(teamId, userId);
        setMemberSearch("");
        setMemberResults([]);
        await refresh();
        setActionLoading(false);
    };

    const handleRemoveMember = async (teamId: string, userId: string) => {
        setActionLoading(true);
        await removeMemberFromTeam(teamId, userId);
        await refresh();
        setActionLoading(false);
    };

    const getUserName = (userId: string) => users.find(u => u.id === userId)?.name || userId;
    const getUserEmail = (userId: string) => users.find(u => u.id === userId)?.email || "";

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-white" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* === Tài khoản chờ duyệt === */}
            {users.filter(u => u.status === 'pending').length > 0 && (
                <div>
                    <h2 className="mb-3 text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <span>Chờ duyệt</span>
                        <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400">
                            {users.filter(u => u.status === 'pending').length}
                        </span>
                    </h2>
                    <div className="space-y-2">
                        {users.filter(u => u.status === 'pending').map(u => (
                            <div key={u.id} className="flex items-center justify-between rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 dark:border-yellow-900/40 dark:bg-yellow-900/10">
                                <div>
                                    <p className="font-medium text-zinc-900 dark:text-white">{u.name}</p>
                                    <p className="text-xs text-zinc-500">{u.email}</p>
                                </div>
                                <button
                                    disabled={actionLoading}
                                    onClick={async () => {
                                        setActionLoading(true);
                                        await approveUser(u.id);
                                        await refresh();
                                        setActionLoading(false);
                                    }}
                                    className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                                >
                                    <ShieldCheck className="h-4 w-4" />
                                    Duyệt
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* === Quản lý Mảng === */}
            <div>
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Quản lý Mảng</h2>
                    <button
                        onClick={() => setShowCreateTeam(!showCreateTeam)}
                        className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                        <Plus className="h-4 w-4" />
                        Tạo Mảng
                    </button>
                </div>

                {showCreateTeam && (
                    <div className="mb-4 flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
                        <input
                            type="text"
                            value={newTeamName}
                            onChange={e => setNewTeamName(e.target.value)}
                            placeholder="Tên Mảng mới..."
                            className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                            onKeyDown={e => e.key === 'Enter' && handleCreateTeam()}
                        />
                        <button
                            onClick={handleCreateTeam}
                            disabled={actionLoading || !newTeamName.trim()}
                            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900"
                        >
                            Tạo
                        </button>
                        <button onClick={() => setShowCreateTeam(false)} className="p-2 text-zinc-400 hover:text-zinc-600">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}

                <div className="space-y-2">
                    {teams.map(team => (
                        <div key={team.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                            <div
                                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                                onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
                            >
                                <div className="flex items-center gap-3">
                                    {expandedTeam === team.id ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
                                    {editingTeamId === team.id ? (
                                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                            <input
                                                type="text"
                                                value={editTeamName}
                                                onChange={e => setEditTeamName(e.target.value)}
                                                className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                                                onKeyDown={e => e.key === 'Enter' && handleRenameTeam(team.id)}
                                                autoFocus
                                            />
                                            <button onClick={() => handleRenameTeam(team.id)} className="text-green-500 hover:text-green-600"><Check className="h-4 w-4" /></button>
                                            <button onClick={() => setEditingTeamId(null)} className="text-zinc-400 hover:text-zinc-600"><X className="h-4 w-4" /></button>
                                        </div>
                                    ) : (
                                        <span className="font-medium text-zinc-900 dark:text-white">{team.name}</span>
                                    )}
                                    <span className="text-xs text-zinc-400">{team.members?.length || 0} thành viên</span>
                                </div>
                                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                    <button
                                        onClick={() => { setEditingTeamId(team.id); setEditTeamName(team.name); }}
                                        className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteTeam(team.id)}
                                        className="p-1.5 text-red-400 hover:text-red-600 rounded"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>

                            {expandedTeam === team.id && (
                                <div className="border-t border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
                                    <h4 className="text-xs font-semibold uppercase text-zinc-400">Thành viên</h4>
                                    <div className="space-y-1">
                                        {team.members?.map(memId => (
                                            <div key={memId} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50">
                                                <div>
                                                    <span className="text-sm font-medium text-zinc-900 dark:text-white">{getUserName(memId)}</span>
                                                    <span className="ml-2 text-xs text-zinc-400">{getUserEmail(memId)}</span>
                                                </div>
                                                <button onClick={() => handleRemoveMember(team.id, memId)} className="text-red-400 hover:text-red-600">
                                                    <UserMinus className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                        {(!team.members || team.members.length === 0) && (
                                            <p className="text-xs text-zinc-400 py-1">Chưa có thành viên</p>
                                        )}
                                    </div>

                                    {/* Add Member */}
                                    <div className="relative">
                                        <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-800">
                                            <Search className="h-3.5 w-3.5 text-zinc-400" />
                                            <input
                                                type="text"
                                                value={memberSearch}
                                                onChange={e => handleSearchMembers(e.target.value)}
                                                placeholder="Tìm thành viên..."
                                                className="flex-1 bg-transparent text-sm outline-none dark:text-white"
                                            />
                                        </div>
                                        {memberResults.length > 0 && (
                                            <div className="absolute z-10 mt-1 w-full rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                                                {memberResults.map(r => (
                                                    <button
                                                        key={r.id}
                                                        onClick={() => handleAddMember(team.id, r.id)}
                                                        className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700"
                                                    >
                                                        <span>{r.name} <span className="text-zinc-400">({r.email})</span></span>
                                                        <UserPlus className="h-4 w-4 text-green-500" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {teams.length === 0 && (
                        <p className="text-center text-sm text-zinc-400 py-8">Chưa có Mảng nào</p>
                    )}
                </div>
            </div>

            {/* === Tổng quan kênh === */}
            <div>
                <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-white">Tổng quan kênh</h2>
                <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                                <th className="px-4 py-3 text-left font-medium text-zinc-500">Người dùng</th>
                                <th className="px-4 py-3 text-left font-medium text-zinc-500">Kênh TikTok</th>
                                <th className="px-4 py-3 text-left font-medium text-zinc-500">Mảng</th>
                                <th className="px-4 py-3 text-left font-medium text-zinc-500">Vai trò</th>
                                <th className="px-4 py-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => {
                                const userTeam = teams.find(t => t.members?.includes(u.id));
                                return (
                                    <tr key={u.id} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                                        <td className="px-4 py-3">
                                            <div>
                                                <span className="font-medium text-zinc-900 dark:text-white">{u.name}</span>
                                                <p className="text-xs text-zinc-400">{u.email}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {u.channels.length > 0 ? (
                                                <div className="space-y-1">
                                                    {u.channels.map(ch => (
                                                        <span key={ch.id} className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                                                            {ch.displayName || ch.username}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-zinc-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                                            {userTeam?.name || <span className="text-zinc-400">—</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                                u.role === 'admin'
                                                    ? "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
                                                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                                            }`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {u.role !== 'admin' && (
                                                <button
                                                    disabled={actionLoading}
                                                    onClick={async () => {
                                                        if (!confirm(`Xóa tài khoản ${u.name}? Hành động này không thể hoàn tác.`)) return;
                                                        setActionLoading(true);
                                                        await deleteUserAccount(u.id);
                                                        await refresh();
                                                        setActionLoading(false);
                                                    }}
                                                    className="text-red-400 hover:text-red-600 disabled:opacity-50"
                                                >
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
