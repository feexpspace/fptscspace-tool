// src/app/actions/team.ts
'use server'

import { adminDb } from "@/lib/firebase-admin"; // Dùng Admin SDK
import { User, Team } from "@/types/index";
import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";

/**
 * Tìm kiếm User để thêm vào team
 * Chỉ trả về các user có role='member' và chưa thuộc team nào (teamId rỗng)
 */
export async function searchAvailableUsers(searchTerm: string) {
    try {
        // Sử dụng Admin SDK để query
        const usersRef = adminDb.collection("users");

        // Query: role là member VÀ chưa có teamId
        const snapshot = await usersRef
            .where("role", "==", "member")
            .where("teamId", "==", "")
            .get();

        const users: User[] = [];
        const lowerTerm = searchTerm.toLowerCase();

        snapshot.forEach((doc) => {
            const data = doc.data();
            // Mapping dữ liệu. Lưu ý xử lý createdAt nếu cần thiết
            const userData = {
                id: doc.id,
                ...data
            } as User;

            // Filter phía server (memory) vì Firestore không hỗ trợ full-text search 'LIKE'
            if (
                userData.email.toLowerCase().includes(lowerTerm) ||
                userData.name.toLowerCase().includes(lowerTerm)
            ) {
                users.push(userData);
            }
        });

        // console.log("Search results:", users);
        return users;
    } catch (error) {
        console.error("Error searching users:", error);
        return [];
    }
}

export async function searchManagers(searchTerm: string) {
    try {
        const usersRef = adminDb.collection("users");

        // Chỉ lấy những user có role là manager
        const snapshot = await usersRef
            .where("role", "==", "manager")
            .get();

        const users: User[] = [];
        const lowerTerm = searchTerm.toLowerCase();

        snapshot.forEach((doc) => {
            const data = doc.data();
            const userData = {
                id: doc.id,
                ...data
            } as User;

            // Filter phía server (memory) theo tên hoặc email
            if (
                userData.email.toLowerCase().includes(lowerTerm) ||
                userData.name.toLowerCase().includes(lowerTerm)
            ) {
                users.push(userData);
            }
        });

        return users;
    } catch (error) {
        console.error("Error searching managers:", error);
        return [];
    }
}

/**
 * Tạo Team mới
 * Sử dụng Batch của Admin SDK để đảm bảo atomic
 */
export async function createNewTeam(
    teamName: string,
    managerIds: string[], // [CẬP NHẬT] Nhận vào mảng ID manager
    memberIds: string[]   // Nhận vào mảng ID member
) {
    try {
        const batch = adminDb.batch();

        // 1. Tạo Document Team mới
        const teamRef = adminDb.collection("teams").doc();

        const newTeamData = {
            name: teamName,
            createdAt: new Date(), // Next.js serialize được Date
            managerIds: managerIds, // Lưu mảng ID
            members: memberIds
        };

        batch.set(teamRef, newTeamData);

        // 2. Cập nhật tất cả Managers (Gán teamId)
        managerIds.forEach((mgrId) => {
            const userRef = adminDb.collection("users").doc(mgrId);
            batch.update(userRef, { teamId: teamRef.id });
        });

        // 3. Cập nhật tất cả Members (Gán teamId)
        memberIds.forEach((memId) => {
            const userRef = adminDb.collection("users").doc(memId);
            batch.update(userRef, { teamId: teamRef.id });
        });

        // Thực thi batch
        await batch.commit();

        // (Tùy chọn) Revalidate để Next.js tự refresh lại dữ liệu mới trên trang
        revalidatePath('/teams');

        return { success: true, teamId: teamRef.id };

    } catch (error) {
        console.error("Create Team Error:", error);
        // Trả về error dạng string để client hiển thị
        return { success: false, error: "Không thể tạo team. Vui lòng thử lại." };
    }
}

export async function addMemberToTeam(teamId: string, userId: string) {
    try {
        const batch = adminDb.batch();

        // 1. Update User: Gán teamId
        const userRef = adminDb.collection("users").doc(userId);
        batch.update(userRef, { teamId: teamId });

        // 2. Update Team: Thêm userId vào mảng members
        const teamRef = adminDb.collection("teams").doc(teamId);
        batch.update(teamRef, {
            members: FieldValue.arrayUnion(userId)
        });

        await batch.commit();

        // Refresh dữ liệu
        revalidatePath('/teams');

        return { success: true };
    } catch (error) {
        console.error("Add Member Error:", error);
        return { success: false, error: "Không thể thêm thành viên. Lỗi quyền hạn hoặc kết nối." };
    }
}

/**
 * Xóa thành viên khỏi Team (Server Action - Tiện tay làm luôn để tránh lỗi tương tự khi xóa)
 */
export async function removeMemberFromTeam(teamId: string, userId: string) {
    try {
        const batch = adminDb.batch();

        // 1. Update Team: Xóa userId khỏi members
        const teamRef = adminDb.collection("teams").doc(teamId);
        batch.update(teamRef, {
            members: FieldValue.arrayRemove(userId)
        });

        // 2. Update User: Xóa teamId
        const userRef = adminDb.collection("users").doc(userId);
        batch.update(userRef, { teamId: "" });

        await batch.commit();
        revalidatePath('/teams');

        return { success: true };
    } catch (error) {
        console.error("Remove Member Error:", error);
        return { success: false, error: "Không thể xóa thành viên." };
    }
}

export async function addManagerToTeam(teamId: string, userId: string) {
    try {
        const batch = adminDb.batch();

        // 1. Update User: Gán teamId và nâng quyền lên Manager
        const userRef = adminDb.collection("users").doc(userId);
        batch.update(userRef, {
            teamId: teamId,
            role: 'manager'
        });

        // 2. Update Team: Thêm userId vào mảng managerIds
        const teamRef = adminDb.collection("teams").doc(teamId);
        batch.update(teamRef, {
            managerIds: FieldValue.arrayUnion(userId)
        });

        await batch.commit();
        revalidatePath('/teams');

        return { success: true };
    } catch (error) {
        console.error("Add Manager Error:", error);
        return { success: false, error: "Không thể thêm manager." };
    }
}

/**
 * 6. Giải tán Team (Xóa Team)
 * Logic:
 * - Xóa doc Team
 * - Tìm tất cả user (manager + member) thuộc team này và set teamId = ""
 */
export async function deleteTeam(teamId: string) {
    try {
        const batch = adminDb.batch();

        // 1. Xóa Document Team
        const teamRef = adminDb.collection("teams").doc(teamId);
        batch.delete(teamRef);

        // 2. Tìm tất cả user thuộc team này để giải phóng
        // (Dùng query server side an toàn hơn là tin vào mảng members ở client)
        const usersInTeamSnap = await adminDb.collection("users")
            .where("teamId", "==", teamId)
            .get();

        usersInTeamSnap.forEach((doc) => {
            batch.update(doc.ref, {
                teamId: "",
                // Optional: Có thể reset role về 'member' nếu muốn, hoặc giữ nguyên
                // role: 'member' 
            });
        });

        await batch.commit();
        revalidatePath('/teams');

        return { success: true };
    } catch (error) {
        console.error("Delete Team Error:", error);
        return { success: false, error: "Không thể giải tán team. Lỗi server." };
    }
}