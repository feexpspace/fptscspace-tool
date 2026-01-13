'use server'

import { db } from "@/lib/firebase";
import { User, Team } from "@/types/index";
import {
    collection,
    query,
    where,
    getDocs,
    writeBatch,
    doc,
    serverTimestamp
} from "firebase/firestore";

/**
 * Tìm kiếm User để thêm vào team
 * Chỉ trả về các user có role='member' và chưa thuộc team nào (teamId rỗng)
 */
export async function searchAvailableUsers(searchTerm: string) {
    try {
        const usersRef = collection(db, "users");
        const q = query(
            usersRef,
            where("role", "==", "member"),
            where("teamId", "==", "")
        );
        const snapshot = await getDocs(q);
        const users: User[] = [];
        const lowerTerm = searchTerm.toLowerCase();
        snapshot.forEach((doc) => {
            const userData = { id: doc.id, ...doc.data() } as User;
            if (
                userData.email.toLowerCase().includes(lowerTerm) ||
                userData.name.toLowerCase().includes(lowerTerm)
            ) {
                users.push(userData);
            }
        });

        console.log("Search results:", users);
        return users;
    } catch (error) {
        console.error("Error searching users:", error);
        return [];
    }
}

/**
 * Tạo Team mới
 * Sử dụng Batch để đảm bảo atomic: Tạo Team -> Update Manager -> Update Members
 */
export async function createNewTeam(
    teamName: string,
    managerId: string,
    managerEmail: string,
    managerName: string,
    memberIds: string[]
) {
    try {
        const batch = writeBatch(db);

        // 1. Tạo Document Team mới
        const teamRef = doc(collection(db, "teams"));
        const newTeamData: Omit<Team, 'id'> = {
            name: teamName,
            createdAt: new Date(), // Sẽ được convert bởi client hoặc dùng Timestamp
            managerId,
            managerEmail,
            managerName,
            members: memberIds
        };

        batch.set(teamRef, newTeamData);

        // 2. Cập nhật User Manager (Gán teamId cho manager)
        const managerRef = doc(db, "users", managerId);
        batch.update(managerRef, { teamId: teamRef.id });

        // 3. Cập nhật từng User Member (Gán teamId cho các thành viên)
        memberIds.forEach((memId) => {
            const memberRef = doc(db, "users", memId);
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