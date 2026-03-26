// src/app/actions/team.ts
'use server'

import { adminDb } from "@/lib/firebase-admin"; // Dùng Admin SDK
import { User, Team } from "@/types/index";
import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";

/**
 * ========================================================
 * 1. TÌM KIẾM NGƯỜI DÙNG
 * ========================================================
 */

export async function searchAvailableUsers(searchTerm: string) {
    try {
        const usersRef = adminDb.collection("users");

        const snapshot = await usersRef
            .where("role", "==", "member")
            .where("teamId", "==", "")
            .get();

        const users: User[] = [];
        const lowerTerm = searchTerm.toLowerCase();

        snapshot.forEach((doc) => {
            const data = doc.data();
            const userData = { id: doc.id, ...data } as User;

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
}

export async function searchManagers(searchTerm: string) {
    try {
        const usersRef = adminDb.collection("users");

        const snapshot = await usersRef
            .where("role", "==", "manager")
            .get();

        const users: User[] = [];
        const lowerTerm = searchTerm.toLowerCase();

        snapshot.forEach((doc) => {
            const data = doc.data();
            const userData = { id: doc.id, ...data } as User;

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
 * ========================================================
 * 2. QUẢN LÝ TEAM (TẠO MỚI / GIẢI TÁN)
 * ========================================================
 */

export async function createNewTeam(
    teamName: string,
    managerIds: string[],
    memberIds: string[]
) {
    try {
        const batch = adminDb.batch();
        const teamRef = adminDb.collection("teams").doc();

        const newTeamData = {
            name: teamName,
            createdAt: new Date(),
            managerIds: managerIds,
            members: memberIds
        };

        batch.set(teamRef, newTeamData);

        // 1. Đối với Managers: Kiểm tra role hiện tại. NẾU KHÔNG PHẢI ADMIN thì mới set thành manager
        const managerDocs = await Promise.all(managerIds.map(id => adminDb.collection("users").doc(id).get()));
        managerDocs.forEach((docSnap) => {
            if (docSnap.exists) {
                const currentRole = docSnap.data()?.role;
                if (currentRole !== 'admin') {
                    batch.update(docSnap.ref, { role: 'manager' });
                }
            }
        });

        // 2. Đối với Members: Gán teamId duy nhất
        memberIds.forEach((memId) => {
            const userRef = adminDb.collection("users").doc(memId);
            batch.update(userRef, { teamId: teamRef.id });
        });

        await batch.commit();
        revalidatePath('/teams');

        return { success: true, teamId: teamRef.id };

    } catch (error) {
        console.error("Create Team Error:", error);
        return { success: false, error: "Không thể tạo team. Vui lòng thử lại." };
    }
}

export async function deleteTeam(teamId: string) {
    try {
        const teamRef = adminDb.collection("teams").doc(teamId);
        const teamDoc = await teamRef.get();
        if (!teamDoc.exists) throw new Error("Team không tồn tại");

        const managerIds: string[] = teamDoc.data()?.managerIds || [];
        const batch = adminDb.batch();

        // 1. Xóa Document Team
        batch.delete(teamRef);

        // 2. Trả tự do cho Members (Xóa teamId)
        const usersInTeamSnap = await adminDb.collection("users").where("teamId", "==", teamId).get();
        usersInTeamSnap.forEach((doc) => {
            batch.update(doc.ref, { teamId: "" });
        });

        await batch.commit();

        // 3. Xử lý Managers: Nếu không còn quản lý team nào khác VÀ KHÔNG PHẢI LÀ ADMIN, giáng cấp thành Member
        for (const mgrId of managerIds) {
            const otherTeams = await adminDb.collection("teams")
                .where("managerIds", "array-contains", mgrId)
                .get();

            if (otherTeams.empty) {
                const userRef = adminDb.collection("users").doc(mgrId);
                const userSnap = await userRef.get();
                if (userSnap.exists && userSnap.data()?.role !== 'admin') {
                    await userRef.update({ role: "member" });
                }
            }
        }

        revalidatePath('/teams');
        return { success: true };
    } catch (error) {
        console.error("Delete Team Error:", error);
        return { success: false, error: "Không thể giải tán team. Lỗi server." };
    }
}

/**
 * ========================================================
 * 3. QUẢN LÝ THÀNH VIÊN & QUẢN LÝ (THÊM / XÓA)
 * ========================================================
 */

export async function addMemberToTeam(teamId: string, userId: string) {
    try {
        const batch = adminDb.batch();
        const userRef = adminDb.collection("users").doc(userId);
        const teamRef = adminDb.collection("teams").doc(teamId);

        batch.update(userRef, { teamId: teamId });
        batch.update(teamRef, { members: FieldValue.arrayUnion(userId) });

        await batch.commit();
        revalidatePath('/teams');

        return { success: true };
    } catch (error) {
        console.error("Add Member Error:", error);
        return { success: false, error: "Không thể thêm thành viên. Lỗi server." };
    }
}

export async function removeMemberFromTeam(teamId: string, userId: string) {
    try {
        const batch = adminDb.batch();
        const teamRef = adminDb.collection("teams").doc(teamId);
        const userRef = adminDb.collection("users").doc(userId);

        batch.update(teamRef, { members: FieldValue.arrayRemove(userId) });
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
        const userRef = adminDb.collection("users").doc(userId);
        const teamRef = adminDb.collection("teams").doc(teamId);

        // Kiểm tra role trước khi nâng quyền lên manager (bảo vệ quyền Admin)
        const userSnap = await userRef.get();
        if (userSnap.exists && userSnap.data()?.role !== 'admin') {
            batch.update(userRef, { role: 'manager' });
        }

        batch.update(teamRef, { managerIds: FieldValue.arrayUnion(userId) });

        await batch.commit();
        revalidatePath('/teams');

        return { success: true };
    } catch (error) {
        console.error("Add Manager Error:", error);
        return { success: false, error: "Không thể thêm quản lý." };
    }
}

export async function removeManagerFromTeam(teamId: string, userId: string) {
    try {
        const teamRef = adminDb.collection("teams").doc(teamId);
        const userRef = adminDb.collection("users").doc(userId);

        // 1. Xóa userId khỏi mảng managerIds của team này
        await teamRef.update({ managerIds: FieldValue.arrayRemove(userId) });

        // 2. Kiểm tra xem Manager này còn quản lý team nào khác không
        const otherTeams = await adminDb.collection("teams")
            .where("managerIds", "array-contains", userId)
            .get();

        // 3. Nếu không quản lý team nào nữa VÀ KHÔNG PHẢI LÀ ADMIN, giáng quyền về member
        if (otherTeams.empty) {
            const userSnap = await userRef.get();
            if (userSnap.exists && userSnap.data()?.role !== 'admin') {
                await userRef.update({ role: "member" });
            }
        }

        revalidatePath('/teams');
        return { success: true };
    } catch (error) {
        console.error("Remove Manager Error:", error);
        return { success: false, error: "Không thể xóa quản lý khỏi team." };
    }
}

export async function updateTeamName(teamId: string, newName: string) {
    try {
        if (!newName || newName.trim() === "") {
            return { success: false, error: "Tên team không được để trống." };
        }

        const teamRef = adminDb.collection("teams").doc(teamId);
        await teamRef.update({
            name: newName.trim()
        });

        revalidatePath('/teams');
        return { success: true };
    } catch (error) {
        console.error("Update Team Name Error:", error);
        return { success: false, error: "Không thể đổi tên team. Lỗi server." };
    }
}