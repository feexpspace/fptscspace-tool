// src/app/teams/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { User, Team } from "@/types";
import { Plus, Search, X, Users, Loader2, Calendar, Eye, Trash2 } from "lucide-react";
import { db } from "@/lib/firebase";
import {
    collection, query, where, getDocs, writeBatch, doc, getDoc, arrayUnion,
    arrayRemove
} from "firebase/firestore";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { ConfirmModal } from "@/components/ConfirmModal";

export default function TeamsPage() {
    const { user, loading } = useAuth();

    // State danh sách Team
    const [teams, setTeams] = useState<Team[]>([]);
    const [isLoadingTeams, setIsLoadingTeams] = useState(true);

    // State cho Modal TẠO TEAM
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [teamName, setTeamName] = useState("");
    const [createSearchQuery, setCreateSearchQuery] = useState("");
    const [createSearchResults, setCreateSearchResults] = useState<User[]>([]);
    const [createSelectedMembers, setCreateSelectedMembers] = useState<User[]>([]);

    // State cho Modal CHI TIẾT TEAM
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [teamMembers, setTeamMembers] = useState<User[]>([]); // Chi tiết members của team đang chọn
    const [isLoadingMembers, setIsLoadingMembers] = useState(false);

    // State cho việc THÊM MEMBER vào Team đang chọn (Manager Only)
    const [addMemberQuery, setAddMemberQuery] = useState("");
    const [addMemberResults, setAddMemberResults] = useState<User[]>([]);
    const [isAddingMember, setIsAddingMember] = useState(false);
    const [isDeletingMember, setIsDeletingMember] = useState(false);
    const [isDeletingTeam, setIsDeletingTeam] = useState(false);

    // Chung: Loading search
    const [isSearching, setIsSearching] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: React.ReactNode;
        variant: 'danger' | 'info' | 'warning';
        onConfirm: () => Promise<void>; // Hàm logic sẽ chạy khi user bấm nút Confirm
        confirmText?: string;
        cancelText?: string;
    }>({
        isOpen: false,
        title: "",
        message: null,
        variant: 'info',
        onConfirm: async () => { },
    });

    // --- 1. LẤY DANH SÁCH TEAM ---
    const fetchTeams = useCallback(async () => {
        if (!user) return;
        setIsLoadingTeams(true);
        try {
            const teamsRef = collection(db, "teams");
            let q;
            if (user.role === 'manager') {
                q = query(teamsRef, where("managerId", "==", user.id));
            } else {
                q = query(teamsRef, where("members", "array-contains", user.id));
            }

            const snapshot = await getDocs(q);
            const teamsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date()
            })) as Team[];

            setTeams(teamsData);
        } catch (error) {
            console.error("Lỗi lấy danh sách team:", error);
        } finally {
            setIsLoadingTeams(false);
        }
    }, [user]);

    useEffect(() => { fetchTeams(); }, [fetchTeams]);

    // --- 2. LOGIC TÌM MEMBER KHẢ DỤNG (Chưa có team) ---
    const searchAvailableUsers = async (term: string) => {
        try {
            const usersRef = collection(db, "users");
            const q = query(
                usersRef,
                where("role", "==", "member"),
                where("teamId", "==", "")
            );
            const snapshot = await getDocs(q);
            const users: User[] = [];
            const lowerTerm = term.toLowerCase();
            snapshot.forEach((doc) => {
                const userData = { id: doc.id, ...doc.data() } as User;
                if (
                    userData.email.toLowerCase().includes(lowerTerm) ||
                    userData.name.toLowerCase().includes(lowerTerm)
                ) {
                    users.push(userData);
                }
            });
            return users;
        } catch (error) {
            console.error("Error searching users:", error);
            return [];
        }
    };

    // --- 3. LOGIC TẠO TEAM MỚI ---
    const handleCreateTeam = async () => {
        if (!user || !teamName.trim()) return;
        setIsSubmitting(true);
        try {
            const batch = writeBatch(db);
            const teamRef = doc(collection(db, "teams"));
            const newTeamData = {
                name: teamName,
                createdAt: new Date(),
                managerId: user.id,
                managerEmail: user.email,
                managerName: user.name,
                members: createSelectedMembers.map(m => m.id)
            };
            batch.set(teamRef, newTeamData);

            const managerRef = doc(db, "users", user.id);
            batch.update(managerRef, { teamId: teamRef.id });

            createSelectedMembers.forEach((mem) => {
                const memberRef = doc(db, "users", mem.id);
                batch.update(memberRef, { teamId: teamRef.id });
            });

            await batch.commit();
            setIsCreateModalOpen(false);
            setTeamName(""); setCreateSelectedMembers([]); setCreateSearchResults([]);
            fetchTeams();
        } catch (error) {
            console.error("Create Team Error:", error);
        } finally { setIsSubmitting(false); }
    };

    // --- 4. LOGIC XEM CHI TIẾT TEAM ---
    const handleViewDetails = async (team: Team) => {
        setSelectedTeam(team);
        setIsDetailModalOpen(true);
        setIsLoadingMembers(true);
        setTeamMembers([]);

        try {
            // Lấy thông tin chi tiết từng member dựa trên ID
            if (team.members && team.members.length > 0) {
                // Lưu ý: Nếu list quá dài nên chia nhỏ, ở đây demo fetch song song
                const memberPromises = team.members.map(userId => getDoc(doc(db, "users", userId)));
                const memberSnapshots = await Promise.all(memberPromises);

                const membersData = memberSnapshots
                    .filter(snap => snap.exists())
                    .map(snap => ({ id: snap.id, ...snap.data() } as User));

                setTeamMembers(membersData);
            }
        } catch (error) {
            console.error("Lỗi lấy chi tiết member:", error);
        } finally {
            setIsLoadingMembers(false);
        }
    };

    // --- 5. LOGIC THÊM MEMBER VÀO TEAM ĐANG TỒN TẠI (Trong Popup Details) ---
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
                    const batch = writeBatch(db);

                    // 1. Update User: Gán teamId
                    const userRef = doc(db, "users", userToAdd.id);
                    batch.update(userRef, { teamId: selectedTeam.id });

                    // 2. Update Team: Thêm vào mảng members
                    const teamRef = doc(db, "teams", selectedTeam.id);
                    batch.update(teamRef, {
                        members: arrayUnion(userToAdd.id)
                    });

                    await batch.commit();

                    // 3. Cập nhật UI ngay lập tức
                    setTeamMembers(prev => [...prev, userToAdd]); // Thêm vào list hiển thị
                    setAddMemberResults(prev => prev.filter(u => u.id !== userToAdd.id)); // Xóa khỏi list search
                    setAddMemberQuery(""); // Reset ô search

                    // Cập nhật lại số lượng ở danh sách team bên ngoài
                    setTeams(prev => prev.map(t => {
                        if (t.id === selectedTeam.id) {
                            return { ...t, members: [...t.members, userToAdd.id] };
                        }
                        return t;
                    }));

                    // Cập nhật lại selectedTeam state
                    setSelectedTeam(prev => prev ? ({ ...prev, members: [...prev.members, userToAdd.id] }) : null);

                } catch (error) {
                    console.error("Lỗi thêm thành viên:", error);
                } finally {
                    setIsAddingMember(false);
                }

            }
        });
    };

    const handleRemoveMemberFromTeam = async (memberId: string, memberName: string) => {
        setConfirmConfig({
            isOpen: true,
            title: "Xóa thành viên",
            message: (
                <span>
                    Bạn có chắc chắn muốn xóa <b>{memberName}</b> khỏi team này không?<br />
                    Họ sẽ trở thành thành viên tự do.
                </span>
            ),
            variant: 'danger',
            confirmText: "Xóa ngay",
            onConfirm: async () => {
                if (!selectedTeam || !user) return;

                setIsDeletingMember(true);
                try {
                    const batch = writeBatch(db);

                    // 1. Update Team: Xóa ID khỏi mảng members dùng arrayRemove
                    const teamRef = doc(db, "teams", selectedTeam.id);
                    batch.update(teamRef, {
                        members: arrayRemove(memberId)
                    });

                    // 2. Update User: Xóa teamId (gán về rỗng)
                    const userRef = doc(db, "users", memberId);
                    batch.update(userRef, { teamId: "" });

                    await batch.commit();

                    // 3. Cập nhật UI
                    // Xóa khỏi list trong modal
                    setTeamMembers(prev => prev.filter(m => m.id !== memberId));

                    // Cập nhật lại list teams bên ngoài (giảm số lượng member hiển thị ở card)
                    setTeams(prev => prev.map(t => {
                        if (t.id === selectedTeam.id) {
                            return { ...t, members: t.members.filter(id => id !== memberId) };
                        }
                        return t;
                    }));

                    // Cập nhật selectedTeam state
                    setSelectedTeam(prev => prev ? ({ ...prev, members: prev.members.filter(id => id !== memberId) }) : null);

                } catch (error) {
                    console.error("Lỗi xóa thành viên:", error);
                } finally {
                    setIsDeletingMember(false);
                }
            }
        });
    };

    const handleDisbandTeam = async () => {
        if (!selectedTeam || !user) return;
        if (selectedTeam.managerId !== user.id) return;

        setConfirmConfig({
            isOpen: true,
            title: "Giải tán Team",
            message: (
                <span>
                    CẢNH BÁO: Hành động này <b>không thể hoàn tác</b>.<br /><br />
                    Team <b>&quot;{selectedTeam.name}&quot;</b> sẽ bị xóa vĩnh viễn và tất cả thành viên sẽ rời khỏi team.
                </span>
            ),
            variant: 'danger',
            confirmText: "Xác nhận Giải tán",
            onConfirm: async () => {
                setIsDeletingTeam(true);
                try {
                    const batch = writeBatch(db);

                    // 1. Xóa Team Document
                    const teamRef = doc(db, "teams", selectedTeam.id);
                    batch.delete(teamRef);

                    // 2. Giải phóng Manager (Update teamId = "")
                    const managerRef = doc(db, "users", selectedTeam.managerId);
                    batch.update(managerRef, { teamId: "" });

                    // 3. Giải phóng Members (Update teamId = "")
                    // Lưu ý: selectedTeam.members chứa danh sách User ID
                    if (selectedTeam.members && selectedTeam.members.length > 0) {
                        selectedTeam.members.forEach((memId) => {
                            // Tránh trùng lặp nếu Manager vô tình nằm trong list members (đề phòng)
                            if (memId !== selectedTeam.managerId) {
                                const memRef = doc(db, "users", memId);
                                batch.update(memRef, { teamId: "" });
                            }
                        });
                    }
                    await batch.commit();

                    setTeams((prev) => prev.filter((t) => t.id !== selectedTeam.id));
                    setIsDetailModalOpen(false);
                    setSelectedTeam(null);
                } catch (error) {
                    console.error("Lỗi giải tán team:", error);
                } finally {
                    setIsDeletingTeam(false);
                }
            }
        });
    };

    // --- EFFECTS SEARCH (Debounce) ---
    // 1. Search cho Create Modal
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (createSearchQuery.trim().length > 0 && isCreateModalOpen) {
                setIsSearching(true);
                const results = await searchAvailableUsers(createSearchQuery);
                const filtered = results.filter(r => !createSelectedMembers.some(sel => sel.id === r.id));
                setCreateSearchResults(filtered);
                setIsSearching(false);
            } else { setCreateSearchResults([]); }
        }, 500);
        return () => clearTimeout(timer);
    }, [createSearchQuery, isCreateModalOpen, createSelectedMembers]);

    // 2. Search cho Detail Modal (Add Member)
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (addMemberQuery.trim().length > 0 && isDetailModalOpen) {
                setIsSearching(true);
                const results = await searchAvailableUsers(addMemberQuery);
                // Filter những người chưa ở trong team này
                const filtered = results.filter(r => !teamMembers.some(existing => existing.id === r.id));
                setAddMemberResults(filtered);
                setIsSearching(false);
            } else { setAddMemberResults([]); }
        }, 500);
        return () => clearTimeout(timer);
    }, [addMemberQuery, isDetailModalOpen, teamMembers]);


    // Handlers phụ cho Create Modal
    const handleAddUserToCreateList = (u: User) => {
        setCreateSelectedMembers([...createSelectedMembers, u]);
        setCreateSearchResults(prev => prev.filter(i => i.id !== u.id));
        setCreateSearchQuery("");
    };
    const handleRemoveUserFromCreateList = (id: string) => {
        setCreateSelectedMembers(prev => prev.filter(m => m.id !== id));
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
            <Sidebar />

            <main className="flex-1 flex flex-col h-screen overflow-hidden p-8 relative">
                {/* HEADER */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold">Quản lý Team</h1>
                        <p className="text-zinc-500">
                            {user?.role === 'manager' ? "Danh sách các team bạn đang quản lý." : "Danh sách các team bạn tham gia."}
                        </p>
                    </div>
                    {(user?.role === 'manager' || user?.role === 'admin') && (
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-white hover:bg-zinc-800 dark:bg-white dark:text-black transition-all"
                        >
                            <Plus className="h-4 w-4" /> Tạo Team Mới
                        </button>
                    )}
                </div>

                {/* TEAM LIST */}
                {isLoadingTeams ? (
                    <div className="flex justify-center mt-10"><Loader2 className="animate-spin text-zinc-400" /></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-20">
                        {teams.length === 0 ? (
                            <div className="col-span-full rounded-2xl border border-dashed border-zinc-300 p-12 flex flex-col items-center justify-center text-zinc-400">
                                <Users className="h-10 w-10 mb-2 opacity-50" />
                                <p>Chưa có dữ liệu team.</p>
                            </div>
                        ) : (
                            teams.map((team) => (
                                <div key={team.id} className="relative group rounded-2xl bg-white p-6 shadow-sm border border-zinc-100 dark:bg-black dark:border-zinc-800 hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg dark:bg-blue-900/30">
                                            {team.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="px-2 py-1 rounded bg-zinc-100 text-[10px] font-semibold text-zinc-500 uppercase dark:bg-zinc-800">
                                            {team.members.length} Members
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-bold mb-1 truncate">{team.name}</h3>
                                    <div className="space-y-2 mt-4 text-sm text-zinc-500">
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4" />
                                            <span>Manager: <span className="text-zinc-900 dark:text-zinc-100 font-medium">{team.managerName}</span></span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            <span>{new Date(team.createdAt).toLocaleDateString('vi-VN')}</span>
                                        </div>
                                    </div>

                                    {/* NÚT XEM CHI TIẾT */}
                                    <button
                                        onClick={() => handleViewDetails(team)}
                                        className="mt-6 w-full flex items-center justify-center gap-2 rounded-lg border border-zinc-200 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800 transition-colors"
                                    >
                                        <Eye className="h-4 w-4" /> Xem chi tiết
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* --- MODAL 1: TẠO TEAM MỚI --- */}
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg p-6 relative animate-in zoom-in-95">
                            <button onClick={() => setIsCreateModalOpen(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-black dark:hover:text-white"><X className="h-5 w-5" /></button>
                            <h2 className="text-xl font-bold mb-6">Tạo Team Mới</h2>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Tên Team</label>
                                    <input
                                        type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Ví dụ: Content Team A"
                                        className="w-full rounded-lg border p-2.5 outline-none focus:ring-2 border-zinc-300 focus:ring-black dark:bg-zinc-800 dark:border-zinc-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Thêm thành viên</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                                        <input
                                            type="text" value={createSearchQuery} onChange={(e) => setCreateSearchQuery(e.target.value)} placeholder="Tìm tên hoặc email..."
                                            className="w-full rounded-lg border pl-9 p-2.5 outline-none focus:ring-2 border-zinc-300 focus:ring-black dark:bg-zinc-800 dark:border-zinc-700"
                                        />
                                        {isSearching && <div className="absolute right-3 top-2.5"><Loader2 className="h-4 w-4 animate-spin text-zinc-400" /></div>}
                                    </div>
                                    {createSearchResults.length > 0 && (
                                        <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border p-1 bg-white shadow-sm dark:bg-zinc-800 dark:border-zinc-700">
                                            {createSearchResults.map((u) => (
                                                <div key={u.id} onClick={() => handleAddUserToCreateList(u)} className="flex cursor-pointer items-center justify-between p-2 hover:bg-zinc-50 dark:hover:bg-zinc-700 rounded">
                                                    <div><div className="font-medium text-sm">{u.name}</div><div className="text-xs text-zinc-500">{u.email}</div></div>
                                                    <Plus className="h-4 w-4 text-zinc-400" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {createSelectedMembers.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {createSelectedMembers.map((m) => (
                                            <div key={m.id} className="flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-sm dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                                                <span>{m.name}</span>
                                                <button onClick={() => handleRemoveUserFromCreateList(m.id)}><X className="h-3 w-3" /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => setIsCreateModalOpen(false)} className="flex-1 rounded-lg border border-zinc-200 py-2.5 font-medium hover:bg-zinc-50">Hủy</button>
                                    <button onClick={handleCreateTeam} disabled={!teamName || isSubmitting} className="flex-1 rounded-lg bg-black py-2.5 font-medium text-white hover:bg-zinc-800 disabled:opacity-50 flex justify-center items-center gap-2">
                                        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />} Tạo Team
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- MODAL 2: CHI TIẾT TEAM & THÊM MEMBER --- */}
                {isDetailModalOpen && selectedTeam && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-2xl p-6 relative animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                            <button onClick={() => setIsDetailModalOpen(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-black dark:hover:text-white"><X className="h-5 w-5" /></button>

                            {/* Header Modal */}
                            <div className="mb-6 border-b border-zinc-100 pb-4 dark:border-zinc-800">
                                <h2 className="text-xl font-bold">{selectedTeam.name}</h2>
                                <p className="text-sm text-zinc-500">Quản lý bởi: {selectedTeam.managerName}</p>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2">
                                {/* Danh sách thành viên hiện tại */}
                                <h3 className="text-sm font-bold uppercase text-zinc-500 mb-3">Danh sách thành viên ({teamMembers.length})</h3>
                                {isLoadingMembers ? (
                                    <div className="flex justify-center py-4"><Loader2 className="animate-spin text-zinc-400" /></div>
                                ) : (
                                    <div className="space-y-2 mb-8">
                                        {teamMembers.length === 0 ? (
                                            <p className="text-sm text-zinc-400 italic">Chưa có thành viên nào.</p>
                                        ) : (
                                            teamMembers.map((mem) => (
                                                <div key={mem.id} className="flex items-center gap-3 rounded-xl border border-zinc-100 p-3 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-800/50">
                                                    <div className="h-10 w-10 rounded-full bg-zinc-200 flex items-center justify-center font-bold text-zinc-500">
                                                        {mem.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-sm">{mem.name}</div>
                                                        <div className="text-xs text-zinc-500">{mem.email}</div>
                                                    </div>
                                                    <div className="ml-auto flex items-center gap-2">
                                                        <span className="text-[10px] uppercase font-bold bg-zinc-200 px-2 py-1 rounded text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">{mem.role}</span>
                                                        {(user?.role === 'manager' || user?.role === 'admin') && (
                                                            <button
                                                                onClick={() => handleRemoveMemberFromTeam(mem.id, mem.name)}
                                                                disabled={isDeletingMember}
                                                                title="Xóa khỏi team"
                                                                className="h-8 w-8 flex items-center justify-center rounded-full text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                                                            >
                                                                {isDeletingMember ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}

                                {/* --- PHẦN THÊM THÀNH VIÊN (CHỈ HIỆN VỚI MANAGER) --- */}
                                {(user?.role === 'manager' || user?.role === 'admin') && (
                                    <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 dark:bg-zinc-800/30 dark:border-zinc-800">
                                        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
                                            <Plus className="h-4 w-4" /> Thêm thành viên mới
                                        </h3>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                                            <input
                                                type="text" value={addMemberQuery} onChange={(e) => setAddMemberQuery(e.target.value)}
                                                placeholder="Tìm thành viên chưa có team..."
                                                className="w-full rounded-lg border pl-9 p-2.5 text-sm outline-none focus:ring-2 border-zinc-300 focus:ring-black bg-white dark:bg-zinc-900 dark:border-zinc-700"
                                            />
                                            {(isSearching || isAddingMember) && <div className="absolute right-3 top-2.5"><Loader2 className="h-4 w-4 animate-spin text-zinc-400" /></div>}
                                        </div>

                                        {/* Kết quả tìm kiếm để thêm */}
                                        {addMemberResults.length > 0 && (
                                            <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-sm dark:bg-zinc-900 dark:border-zinc-700">
                                                {addMemberResults.map((u) => (
                                                    <button
                                                        key={u.id}
                                                        onClick={() => handleAddMemberToExistingTeam(u)}
                                                        disabled={isAddingMember}
                                                        className="w-full flex items-center justify-between p-3 hover:bg-blue-50 dark:hover:bg-zinc-800 text-left transition-colors group"
                                                    >
                                                        <div>
                                                            <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-blue-700 dark:group-hover:text-blue-400">{u.name}</div>
                                                            <div className="text-xs text-zinc-500">{u.email}</div>
                                                        </div>
                                                        <Plus className="h-4 w-4 text-zinc-400" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            {(user?.role === 'manager' && user.id === selectedTeam.managerId) && (
                                <div className="mt-8 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                                    <button
                                        onClick={handleDisbandTeam}
                                        disabled={isDeletingTeam}
                                        className="w-full rounded-lg bg-white border border-red-200 py-2 text-sm font-bold text-red-600 hover:bg-red-600 hover:text-white dark:bg-transparent dark:border-red-800 dark:hover:bg-red-900/50 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isDeletingTeam ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            "Giải tán Team"
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </main>
            <ConfirmModal
                isOpen={confirmConfig.isOpen}
                onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmConfig.onConfirm}
                title={confirmConfig.title}
                message={confirmConfig.message}
                variant={confirmConfig.variant}
                confirmText={confirmConfig.confirmText}
                cancelText={confirmConfig.cancelText}
            />
        </div>
    );
}