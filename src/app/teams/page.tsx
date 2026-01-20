// src/app/teams/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { User, Team } from "@/types";
import { Plus, Search, X, Users, Loader2, Calendar, Eye, Trash2, UserCog, UserPlus } from "lucide-react"; // Import thêm UserPlus
import { db } from "@/lib/firebase";
import {
    collection, query, where, getDocs, doc, getDoc // Bỏ writeBatch vì đã chuyển sang server
} from "firebase/firestore";
import { ConfirmModal } from "@/components/ConfirmModal";
// [IMPORT MỚI]
import {
    addMemberToTeam,
    createNewTeam,
    removeMemberFromTeam,
    deleteTeam,
    addManagerToTeam,
    searchManagers
} from "@/app/actions/team";

export default function TeamsPage() {
    const { user, loading } = useAuth();

    // ... (Giữ nguyên các state cũ: teams, modals...)
    const [teams, setTeams] = useState<Team[]>([]);
    const [isLoadingTeams, setIsLoadingTeams] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [teamName, setTeamName] = useState("");
    const [createSelectedMembers, setCreateSelectedMembers] = useState<User[]>([]);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [teamMembersDetails, setTeamMembersDetails] = useState<User[]>([]);
    const [teamManagersDetails, setTeamManagersDetails] = useState<User[]>([]);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // [STATE MỚI CHO VIỆC THÊM MANAGER]
    const [addManagerQuery, setAddManagerQuery] = useState("");
    const [addManagerResults, setAddManagerResults] = useState<User[]>([]);
    const [isAddingManager, setIsAddingManager] = useState(false);

    // Loading actions
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeletingMember, setIsDeletingMember] = useState(false);
    const [isDeletingTeam, setIsDeletingTeam] = useState(false);
    const [isAddingMember, setIsAddingMember] = useState(false);

    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: React.ReactNode;
        variant: 'danger' | 'info' | 'warning';
        onConfirm: () => Promise<void>;
        confirmText?: string;
        cancelText?: string;
    }>({
        isOpen: false,
        title: "",
        message: null,
        variant: 'info',
        onConfirm: async () => { },
    });

    // ... (Giữ nguyên fetchTeams) ...
    const fetchTeams = useCallback(async () => {
        if (!user) return;
        setIsLoadingTeams(true);
        try {
            const teamsRef = collection(db, "teams");
            let q;
            if (user.role === 'manager' || user.role === 'admin') {
                q = query(teamsRef, where("managerIds", "array-contains", user.id));
            } else {
                q = query(teamsRef, where("members", "array-contains", user.id));
            }
            const snapshot = await getDocs(q);
            const teamsData = snapshot.docs.map(doc => {
                const data = doc.data();
                let safeManagerIds: string[] = [];
                if (Array.isArray(data.managerIds)) safeManagerIds = data.managerIds;
                else if (data.managerId) safeManagerIds = [data.managerId];
                const safeMembers = Array.isArray(data.members) ? data.members : [];
                return {
                    id: doc.id,
                    ...data,
                    managerIds: safeManagerIds,
                    members: safeMembers,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
                };
            }) as Team[];
            setTeams(teamsData);
        } catch (error) {
            console.error("Lỗi lấy danh sách team:", error);
        } finally {
            setIsLoadingTeams(false);
        }
    }, [user]);

    useEffect(() => { fetchTeams(); }, [fetchTeams]);

    // ... (Giữ nguyên searchAvailableUsers) ...
    const searchAvailableUsers = async (term: string) => {
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("role", "==", "member"), where("teamId", "==", ""));
            const snapshot = await getDocs(q);
            const users: User[] = [];
            const lowerTerm = term.toLowerCase();
            snapshot.forEach((doc) => {
                const userData = { id: doc.id, ...doc.data() } as User;
                if (userData.email.toLowerCase().includes(lowerTerm) || userData.name.toLowerCase().includes(lowerTerm)) {
                    users.push(userData);
                }
            });
            return users;
        } catch (error) {
            console.error("Error searching users:", error);
            return [];
        }
    };

    // ... (Giữ nguyên handleCreateTeam, handleViewDetails, handleRemoveMemberFromTeam) ...
    const handleCreateTeam = async () => {
        if (!user || !teamName.trim()) return;
        setIsSubmitting(true);
        try {
            const managerIds = [user.id];
            const memberIds = createSelectedMembers.map(m => m.id);
            const result = await createNewTeam(teamName, managerIds, memberIds);
            if (result.success) {
                setIsCreateModalOpen(false);
                setTeamName(""); setCreateSelectedMembers([]); setSearchQuery(""); setSearchResults([]);
                fetchTeams();
            } else { alert(result.error); }
        } catch (error) { console.error("Lỗi client:", error); } finally { setIsSubmitting(false); }
    };

    const handleViewDetails = async (team: Team) => {
        setSelectedTeam(team);
        setIsDetailModalOpen(true);
        setIsLoadingDetails(true);
        setTeamMembersDetails([]);
        setTeamManagersDetails([]);
        try {
            if (team.members && team.members.length > 0) {
                const memberPromises = team.members.map(userId => getDoc(doc(db, "users", userId)));
                const memberSnapshots = await Promise.all(memberPromises);
                const membersData = memberSnapshots.filter(snap => snap.exists()).map(snap => ({ id: snap.id, ...snap.data() } as User));
                setTeamMembersDetails(membersData);
            }
            if (team.managerIds && team.managerIds.length > 0) {
                const managerPromises = team.managerIds.map(userId => getDoc(doc(db, "users", userId)));
                const managerSnapshots = await Promise.all(managerPromises);
                const managersData = managerSnapshots.filter(snap => snap.exists()).map(snap => ({ id: snap.id, ...snap.data() } as User));
                setTeamManagersDetails(managersData);
            }
        } catch (error) { console.error("Lỗi lấy chi tiết team:", error); } finally { setIsLoadingDetails(false); }
    };

    const handleRemoveMemberFromTeam = async (memberId: string, memberName: string) => {
        setConfirmConfig({
            isOpen: true,
            title: "Xóa thành viên",
            message: <span>Bạn có chắc chắn muốn xóa <b>{memberName}</b> khỏi team này không?</span>,
            variant: 'danger',
            confirmText: "Xóa ngay",
            onConfirm: async () => {
                if (!selectedTeam) return;
                setIsDeletingMember(true);
                try {
                    const res = await removeMemberFromTeam(selectedTeam.id, memberId);
                    if (res.success) {
                        setTeamMembersDetails(prev => prev.filter(m => m.id !== memberId));
                        setTeams(prev => prev.map(t => t.id === selectedTeam.id ? { ...t, members: (t.members || []).filter(id => id !== memberId) } : t));
                        setSelectedTeam(prev => prev ? ({ ...prev, members: (prev.members || []).filter(id => id !== memberId) }) : null);
                    } else { alert(res.error); }
                } catch (error) { console.error("Lỗi client:", error); } finally { setIsDeletingMember(false); }
            }
        });
    };

    // --- [SỬA LẠI]: LOGIC GIẢI TÁN TEAM (Dùng Server Action) ---
    const handleDisbandTeam = async () => {
        if (!selectedTeam || !user) return;
        if (!selectedTeam.managerIds.includes(user.id)) return;

        setConfirmConfig({
            isOpen: true,
            title: "Giải tán Team",
            message: "Hành động này không thể hoàn tác. Team sẽ bị xóa vĩnh viễn.",
            variant: 'danger',
            confirmText: "Xác nhận Giải tán",
            onConfirm: async () => {
                setIsDeletingTeam(true);
                try {
                    // Gọi Server Action deleteTeam
                    const res = await deleteTeam(selectedTeam.id);

                    if (res.success) {
                        setTeams((prev) => prev.filter((t) => t.id !== selectedTeam!.id));
                        setIsDetailModalOpen(false);
                        setSelectedTeam(null);
                    } else {
                        alert(res.error);
                    }
                } catch (error) {
                    console.error("Lỗi giải tán team:", error);
                } finally {
                    setIsDeletingTeam(false);
                }
            }
        });
    };

    // --- [THÊM MỚI]: LOGIC THÊM MANAGER ---
    const handleAddManagerToTeam = async (userToAdd: User) => {
        if (!selectedTeam || !user) return;
        setConfirmConfig({
            isOpen: true,
            title: "Thêm quản lý",
            message: (
                <span>
                    Bạn có muốn thêm <b>{userToAdd.name}</b> làm Manager của team này?<br />
                    <i>Lưu ý: Role của người dùng này sẽ chuyển thành Manager.</i>
                </span>
            ),
            variant: 'info',
            confirmText: "Thêm Manager",
            onConfirm: async () => {
                setIsAddingManager(true);
                try {
                    const res = await addManagerToTeam(selectedTeam.id, userToAdd.id);
                    if (res.success) {
                        // Update UI
                        const updatedUser = { ...userToAdd, role: 'manager' as const };
                        setTeamManagersDetails(prev => [...prev, updatedUser]);
                        setAddManagerResults(prev => prev.filter(u => u.id !== userToAdd.id));
                        setAddManagerQuery("");

                        setTeams(prev => prev.map(t => t.id === selectedTeam.id ? { ...t, managerIds: [...(t.managerIds || []), userToAdd.id] } : t));
                        setSelectedTeam(prev => prev ? ({ ...prev, managerIds: [...(prev.managerIds || []), userToAdd.id] }) : null);
                    } else {
                        alert(res.error);
                    }
                } catch (error) {
                    console.error("Lỗi thêm manager:", error);
                } finally {
                    setIsAddingManager(false);
                }
            }
        });
    };

    // --- [GIỮ NGUYÊN]: LOGIC THÊM MEMBER ---
    const handleAddMemberToExistingTeam = async (userToAdd: User) => {
        if (!selectedTeam || !user) return;
        setConfirmConfig({
            isOpen: true,
            title: "Thêm thành viên",
            message: `Bạn có muốn thêm ${userToAdd.name} vào team ${selectedTeam.name}?`,
            variant: 'info',
            confirmText: "Thêm vào Team",
            onConfirm: async () => {
                setIsAddingMember(true);
                try {
                    const res = await addMemberToTeam(selectedTeam.id, userToAdd.id);
                    if (res.success) {
                        setTeamMembersDetails(prev => [...prev, userToAdd]);
                        setSearchResults(prev => prev.filter(u => u.id !== userToAdd.id));
                        setSearchQuery("");
                        setTeams(prev => prev.map(t => t.id === selectedTeam.id ? { ...t, members: [...(t.members || []), userToAdd.id] } : t));
                        setSelectedTeam(prev => prev ? ({ ...prev, members: [...(prev.members || []), userToAdd.id] }) : null);
                    } else { alert(res.error); }
                } catch (error) { console.error("Lỗi client:", error); } finally { setIsAddingMember(false); }
            }
        });
    };

    // --- EFFECT SEARCH MEMBER ---
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.trim().length > 0 && (isCreateModalOpen || isDetailModalOpen)) {
                setIsSearching(true);
                const results = await searchAvailableUsers(searchQuery);
                const filtered = results.filter(r => {
                    const inCreateList = createSelectedMembers.some(sel => sel.id === r.id);
                    const inTeamList = teamMembersDetails.some(existing => existing.id === r.id);
                    const inManagerList = teamManagersDetails.some(existing => existing.id === r.id);
                    return !inCreateList && !inTeamList && !inManagerList;
                });
                setSearchResults(filtered);
                setIsSearching(false);
            } else { setSearchResults([]); }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, isCreateModalOpen, isDetailModalOpen, createSelectedMembers, teamMembersDetails, teamManagersDetails]);

    // --- [THÊM MỚI]: EFFECT SEARCH MANAGER ---
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (addManagerQuery.trim().length > 0 && isDetailModalOpen) {
                // setIsSearching(true); // Bạn có thể dùng state loading riêng nếu muốn (ví dụ isSearchingManager)

                // [THAY ĐỔI]: Gọi hàm searchManagers chuyên biệt
                const results = await searchManagers(addManagerQuery);

                const filtered = results.filter(r => {
                    // Loại bỏ những người ĐÃ là Manager của team này rồi
                    const isAlreadyManager = teamManagersDetails.some(existing => existing.id === r.id);
                    return !isAlreadyManager;
                });

                setAddManagerResults(filtered);
                // setIsSearching(false);
            } else {
                setAddManagerResults([]);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [addManagerQuery, isDetailModalOpen, teamManagersDetails]);


    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
            <Sidebar />
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* ... Header & List Teams (Giữ nguyên) ... */}
                <header className="h-16 flex items-center justify-between border-b border-zinc-800 px-6 bg-black shrink-0">
                    <div><h1 className="text-lg font-bold flex items-center gap-2"><Users className="h-5 w-5" /> Quản lý Team</h1></div>
                    {(user?.role === 'manager' || user?.role === 'admin') && (
                        <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 bg-white text-black px-4 py-1.5 text-sm font-bold rounded-full hover:bg-zinc-200 transition-colors"><Plus className="h-4 w-4" /> Thêm Team mới</button>
                    )}
                </header>
                {isLoadingTeams ? <div className="flex justify-center mt-30"><Loader2 className="animate-spin text-zinc-400" /></div> : (
                    <div className="flex-1 overflow-y-auto p-6 bg-black">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {teams.map((team) => (
                                <div key={team.id} className="relative group rounded-2xl bg-white p-6 shadow-sm border border-zinc-100 dark:bg-black dark:border-zinc-800 hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg dark:bg-blue-900/30">{team.name.charAt(0).toUpperCase()}</div>
                                        <div className="flex gap-2">
                                            <span className="px-2 py-1 rounded bg-zinc-100 text-[10px] font-semibold text-zinc-500 uppercase dark:bg-zinc-800">{(team.managerIds?.length || 0)} Managers</span>
                                            <span className="px-2 py-1 rounded bg-zinc-100 text-[10px] font-semibold text-zinc-500 uppercase dark:bg-zinc-800">{(team.members?.length || 0)} Members</span>
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-bold mb-1 truncate">{team.name}</h3>
                                    <div className="space-y-2 mt-4 text-sm text-zinc-500"><div className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span>{new Date(team.createdAt).toLocaleDateString('vi-VN')}</span></div></div>
                                    <button onClick={() => handleViewDetails(team)} className="mt-6 w-full flex items-center justify-center gap-2 rounded-lg border border-zinc-200 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800 transition-colors"><Eye className="h-4 w-4" /> Xem chi tiết</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- MODAL 1: TẠO TEAM (Giữ nguyên) --- */}
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg p-6 relative">
                            <button onClick={() => setIsCreateModalOpen(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-black dark:hover:text-white"><X className="h-5 w-5" /></button>
                            <h2 className="text-xl font-bold mb-6">Tạo Team Mới</h2>
                            <div className="space-y-6">
                                <div><label className="block text-sm font-medium mb-1">Tên Team</label><input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} className="w-full rounded-lg border p-2.5 outline-none focus:ring-2 border-zinc-300 focus:ring-black dark:bg-zinc-800 dark:border-zinc-700" placeholder="Ví dụ: Team A" /></div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Thêm thành viên</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Tìm thành viên..." className="w-full rounded-lg border pl-9 p-2.5 outline-none focus:ring-2 border-zinc-300 focus:ring-black dark:bg-zinc-800 dark:border-zinc-700" />
                                        {isSearching && <div className="absolute right-3 top-2.5"><Loader2 className="h-4 w-4 animate-spin text-zinc-400" /></div>}
                                    </div>
                                    {searchResults.length > 0 && <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border p-1 bg-white shadow-sm dark:bg-zinc-800 dark:border-zinc-700">{searchResults.map((u) => (<div key={u.id} onClick={() => { setCreateSelectedMembers([...createSelectedMembers, u]); setSearchResults(prev => prev.filter(i => i.id !== u.id)); setSearchQuery(""); }} className="flex cursor-pointer items-center justify-between p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded"><div><div className="font-medium text-sm">{u.name}</div><div className="text-xs text-zinc-500">{u.email}</div></div><Plus className="h-4 w-4 text-zinc-400" /></div>))}</div>}
                                </div>
                                {createSelectedMembers.length > 0 && <div className="flex flex-wrap gap-2">{createSelectedMembers.map((m) => (<div key={m.id} className="flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-sm dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"><span>{m.name}</span><button onClick={() => setCreateSelectedMembers(prev => prev.filter(x => x.id !== m.id))}><X className="h-3 w-3" /></button></div>))}</div>}
                                <div className="flex gap-3 pt-2"><button onClick={() => setIsCreateModalOpen(false)} className="flex-1 rounded-lg border border-zinc-200 py-2.5 font-medium hover:bg-zinc-50">Hủy</button><button onClick={handleCreateTeam} disabled={!teamName || isSubmitting} className="flex-1 rounded-lg bg-black py-2.5 font-medium text-white hover:bg-zinc-800 disabled:opacity-50 flex justify-center items-center gap-2">{isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />} Tạo Team</button></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- MODAL 2: CHI TIẾT TEAM --- */}
                {isDetailModalOpen && selectedTeam && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-2xl p-6 relative flex flex-col max-h-[90vh]">
                            <button onClick={() => setIsDetailModalOpen(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-black dark:hover:text-white"><X className="h-5 w-5" /></button>
                            <div className="mb-6 border-b border-zinc-100 pb-4 dark:border-zinc-800"><h2 className="text-xl font-bold">{selectedTeam.name}</h2></div>

                            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                                {/* LIST MANAGERS */}
                                <div>
                                    <h3 className="text-sm font-bold uppercase text-zinc-500 mb-3 flex items-center gap-2"><UserCog className="h-4 w-4" /> Managers ({teamManagersDetails.length})</h3>
                                    <div className="space-y-2">
                                        {teamManagersDetails.map((mgr) => (
                                            <div key={mgr.id} className="flex items-center gap-3 rounded-xl border border-blue-100 p-3 bg-blue-50/30 dark:border-blue-900/50 dark:bg-blue-900/10">
                                                <div className="h-10 w-10 rounded-full bg-blue-200 flex items-center justify-center font-bold text-blue-700">{mgr.name.charAt(0)}</div>
                                                <div><div className="font-medium text-sm">{mgr.name}</div><div className="text-xs text-zinc-500">{mgr.email}</div></div>
                                                <span className="ml-auto text-[10px] uppercase font-bold bg-blue-100 px-2 py-1 rounded text-blue-600">Manager</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* [THÊM MỚI]: UI THÊM MANAGER */}
                                    {(user?.role === 'manager' || user?.role === 'admin') && (
                                        <div className="mt-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100 dark:bg-blue-900/10 dark:border-blue-800">
                                            <h4 className="text-xs font-bold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2"><UserPlus className="h-3.5 w-3.5" /> Thêm Manager khác</h4>
                                            <div className="relative">
                                                <input type="text" value={addManagerQuery} onChange={(e) => setAddManagerQuery(e.target.value)} placeholder="Tìm user để thăng cấp..." className="w-full rounded-lg border pl-3 p-2 text-xs outline-none focus:ring-1 border-blue-200 focus:ring-blue-500 bg-white dark:bg-zinc-900 dark:border-zinc-700" />
                                            </div>
                                            {addManagerResults.length > 0 && (
                                                <div className="mt-2 max-h-32 overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-sm dark:bg-zinc-900 dark:border-zinc-700">
                                                    {addManagerResults.map((u) => (
                                                        <button key={u.id} onClick={() => handleAddManagerToTeam(u)} disabled={isAddingManager} className="w-full flex items-center justify-between p-2 hover:bg-blue-50 dark:hover:bg-zinc-800 text-left transition-colors">
                                                            <div><div className="font-medium text-xs">{u.name}</div><div className="text-[10px] text-zinc-500">{u.email}</div></div>
                                                            {isAddingManager ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3 text-zinc-400" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* LIST MEMBERS */}
                                <div>
                                    <h3 className="text-sm font-bold uppercase text-zinc-500 mb-3 flex items-center gap-2"><Users className="h-4 w-4" /> Members ({teamMembersDetails.length})</h3>
                                    {isLoadingDetails ? <div className="flex justify-center py-4"><Loader2 className="animate-spin text-zinc-400" /></div> : (
                                        <div className="space-y-2">
                                            {teamMembersDetails.length === 0 ? <p className="text-sm text-zinc-400 italic">Chưa có thành viên nào.</p> : (
                                                teamMembersDetails.map((mem) => (
                                                    <div key={mem.id} className="flex items-center gap-3 rounded-xl border border-zinc-100 p-3 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-800/50">
                                                        <div className="h-10 w-10 rounded-full bg-zinc-200 flex items-center justify-center font-bold text-zinc-500">{mem.name.charAt(0)}</div>
                                                        <div><div className="font-medium text-sm">{mem.name}</div><div className="text-xs text-zinc-500">{mem.email}</div></div>
                                                        <div className="ml-auto flex items-center gap-2">
                                                            {(user?.role === 'manager' || user?.role === 'admin') && (
                                                                <button onClick={() => handleRemoveMemberFromTeam(mem.id, mem.name)} disabled={isDeletingMember} className="h-8 w-8 flex items-center justify-center rounded-full text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                                                                    {isDeletingMember ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* THÊM MEMBER */}
                                {(user?.role === 'manager' || user?.role === 'admin') && (
                                    <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 dark:bg-zinc-800/30 dark:border-zinc-800">
                                        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2"><Plus className="h-4 w-4" /> Thêm thành viên mới</h3>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                                            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Tìm thành viên..." className="w-full rounded-lg border pl-9 p-2.5 text-sm outline-none focus:ring-2 border-zinc-300 focus:ring-black bg-white dark:bg-zinc-900 dark:border-zinc-700" />
                                            {isSearching && <div className="absolute right-3 top-2.5"><Loader2 className="h-4 w-4 animate-spin text-zinc-400" /></div>}
                                        </div>
                                        {searchResults.length > 0 && (
                                            <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-sm dark:bg-zinc-900 dark:border-zinc-700">
                                                {searchResults.map((u) => (
                                                    <button key={u.id} onClick={() => handleAddMemberToExistingTeam(u)} disabled={isAddingMember} className="w-full flex items-center justify-between p-3 hover:bg-blue-50 dark:hover:bg-zinc-800 text-left transition-colors group">
                                                        <div><div className="font-medium text-sm">{u.name}</div><div className="text-xs text-zinc-500">{u.email}</div></div>
                                                        {isAddingMember ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 text-zinc-400" />}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Footer: Giải tán Team */}
                            {(user?.role === 'manager' && selectedTeam.managerIds.includes(user.id)) && (
                                <div className="mt-6 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                                    <button onClick={handleDisbandTeam} disabled={isDeletingTeam} className="w-full rounded-lg bg-white border border-red-200 py-2 text-sm font-bold text-red-600 hover:bg-red-600 hover:text-white dark:bg-transparent dark:border-red-800 dark:hover:bg-red-900/50 transition-all flex items-center justify-center gap-2">
                                        {isDeletingTeam ? <Loader2 className="h-4 w-4 animate-spin" /> : "Giải tán Team"}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
            <ConfirmModal isOpen={confirmConfig.isOpen} onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} onConfirm={confirmConfig.onConfirm} title={confirmConfig.title} message={confirmConfig.message} variant={confirmConfig.variant} confirmText={confirmConfig.confirmText} cancelText={confirmConfig.cancelText} />
        </div>
    );
}