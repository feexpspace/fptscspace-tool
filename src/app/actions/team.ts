// src/app/actions/team.ts
'use server'

import { adminDb } from "@/lib/firebase-admin"; // Dùng Admin SDK
import { User, Team } from "@/types/index";

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

/**
 * Tạo Team mới
 * Sử dụng Batch của Admin SDK để đảm bảo atomic
 */
export async function createNewTeam(
    teamName: string,
    managerId: string,
    managerEmail: string,
    managerName: string,
    memberIds: string[]
) {
    try {
        const batch = adminDb.batch();

        // 1. Tạo Document Team mới (Tự sinh ID)
        const teamRef = adminDb.collection("teams").doc();

        const newTeamData: Omit<Team, 'id'> = {
            name: teamName,
            createdAt: new Date(), // Dùng Timestamp của Admin SDK
            managerId,
            managerEmail,
            managerName,
            members: memberIds
        };

        // Batch Set: Tạo team
        batch.set(teamRef, newTeamData);

        // 2. Cập nhật User Manager (Gán teamId cho manager)
        const managerRef = adminDb.collection("users").doc(managerId);
        batch.update(managerRef, { teamId: teamRef.id });

        // 3. Cập nhật từng User Member (Gán teamId cho các thành viên)
        memberIds.forEach((memId) => {
            const memberRef = adminDb.collection("users").doc(memId);
            batch.update(memberRef, { teamId: teamRef.id });
        });

        // Thực thi batch
        await batch.commit();

        return { success: true, teamId: teamRef.id };
    } catch (error) {
        console.error("Create Team Error:", error);
        return { success: false, error: "Không thể tạo team" };
    }
}