// src/app/actions/account.ts
'use server'

import { adminDb } from "@/lib/firebase-admin";
import { User, Channel } from "@/types";
import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";

export type UserWithChannels = User & { channels: Channel[] };

/**
 * Lấy danh sách tất cả user cùng các kênh của họ
 */
export async function getAllUsersWithChannels(): Promise<{ success: boolean, data?: UserWithChannels[], error?: string }> {
    try {
        // 1. Lấy tất cả users (Và chuyển đổi Timestamp -> Date)
        const usersSnap = await adminDb.collection("users").get();
        const users: User[] = usersSnap.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Chuyển đổi Timestamp sang Date để Next.js có thể serialize
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt || new Date()),
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : undefined,
            };
        }) as unknown as User[];

        // 2. Lấy tất cả channels (Và chuyển đổi Timestamp -> Date)
        const channelsSnap = await adminDb.collection("channels").get();
        const channels: Channel[] = channelsSnap.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Chuyển đổi Timestamp sang Date
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : undefined,
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : undefined,
            };
        }) as unknown as Channel[];

        // 3. Map channels vào user
        const usersWithChannels: UserWithChannels[] = users.map(user => {
            const userChannels = channels.filter(c => c.userId === user.id);
            return {
                ...user,
                channels: userChannels
            };
        });

        // Sắp xếp: Admin -> Manager -> Member
        const roleOrder = { admin: 1, manager: 2, member: 3 };
        usersWithChannels.sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);

        return { success: true, data: usersWithChannels };
    } catch (error) {
        console.error("Lỗi lấy danh sách user:", error);
        return { success: false, error: "Lỗi server khi lấy dữ liệu người dùng." };
    }
}

/**
 * Đổi Role của User
 */
export async function changeUserRole(userId: string, newRole: 'admin' | 'manager' | 'member') {
    try {
        await adminDb.collection("users").doc(userId).update({ role: newRole });
        revalidatePath('/accounts');
        return { success: true };
    } catch (error) {
        console.error("Lỗi đổi role:", error);
        return { success: false, error: "Lỗi server khi đổi phân quyền." };
    }
}

/**
 * Xóa User khỏi hệ thống (Xóa DB và xóa khỏi các Team)
 */
export async function deleteUserAccount(userId: string) {
    try {
        const batch = adminDb.batch();

        // 1. Xóa Document User
        batch.delete(adminDb.collection("users").doc(userId));

        // 2. Tìm và xóa user khỏi tất cả các Team
        const teamsSnap = await adminDb.collection("teams").get();
        teamsSnap.docs.forEach(doc => {
            const data = doc.data();
            let needsUpdate = false;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updates: any = {};

            if ((data.members || []).includes(userId)) {
                updates.members = FieldValue.arrayRemove(userId);
                needsUpdate = true;
            }
            if ((data.managerIds || []).includes(userId)) {
                updates.managerIds = FieldValue.arrayRemove(userId);
                needsUpdate = true;
            }

            if (needsUpdate) {
                batch.update(doc.ref, updates);
            }
        });

        // Tùy chọn: Đưa các Channel của user này thành "Chưa có chủ" (userId = "")
        const channelsSnap = await adminDb.collection("channels").where("userId", "==", userId).get();
        channelsSnap.docs.forEach(doc => {
            batch.update(doc.ref, { userId: "" });
        });

        await batch.commit();

        revalidatePath('/accounts');
        return { success: true };
    } catch (error) {
        console.error("Lỗi xóa user:", error);
        return { success: false, error: "Lỗi server khi xóa người dùng." };
    }
}