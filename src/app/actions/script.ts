// src/app/actions/script.ts
'use server'

import { adminDb } from "@/lib/firebase-admin";
import { Script, Channel, ScriptStatus, Feedback, FeedbackStatus } from "@/types";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";

/**
 * Lấy danh sách script của User
 */
export async function getScripts(userId: string) {
    try {
        const snapshot = await adminDb.collection("scripts")
            .where("userId", "==", userId)
            .orderBy("createdAt", "desc")
            .get();

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: (data.createdAt as Timestamp).toDate(),
                updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate() : undefined
            } as Script;
        });
    } catch (error) {
        console.error("Lỗi lấy scripts:", error);
        return [];
    }
}

/**
 * Lấy danh sách Channels của User (để chọn khi viết kịch bản)
 */
export async function getUserChannels(userId: string) {
    try {
        const snapshot = await adminDb.collection("channels")
            .where("userId", "==", userId)
            .get();

        return snapshot.docs.map(doc => {
            const data = doc.data();

            return {
                id: doc.id,
                ...data,
                // [FIX LỖI]: Kiểm tra và convert Timestamp sang Date
                createdAt: data.createdAt && typeof data.createdAt.toDate === 'function'
                    ? data.createdAt.toDate()
                    : null,

                updatedAt: data.updatedAt && typeof data.updatedAt.toDate === 'function'
                    ? data.updatedAt.toDate()
                    : null,

            } as unknown as Channel; // Ép kiểu để khớp với Interface
        });
    } catch (error) {
        console.error("Lỗi lấy channels:", error);
        return [];
    }
}

/**
 * Lưu Script (Tạo mới hoặc Cập nhật)
 * status: 'draft' | 'pending'
 */
export async function saveScript(data: {
    id?: string;
    userId: string;
    userName: string;
    teamId: string; // Bắt buộc phải có teamId
    title: string;
    content: string;
    channelId: string;
    channelDisplayName: string;
    channelUsername: string;
    status: ScriptStatus;

    managerId?: string; // ID người thao tác (để log)
    managerName?: string;
}) {
    try {
        const scriptsRef = adminDb.collection("scripts");
        let scriptId = data.id;

        // 1. TỰ ĐỘNG LẤY DANH SÁCH MANAGER TỪ TEAM
        // Logic: Nếu script chưa có managerIds (tạo mới) hoặc cần cập nhật lại theo team hiện tại
        let managerIds: string[] = [];

        if (data.teamId) {
            const teamDoc = await adminDb.collection("teams").doc(data.teamId).get();
            if (teamDoc.exists) {
                const teamData = teamDoc.data();
                // Lấy mảng managerIds từ team, fallback về mảng rỗng nếu không có
                managerIds = teamData?.managerIds || [];

                // Fallback cho data cũ (nếu team chỉ có managerId string)
                if (managerIds.length === 0 && teamData?.managerId) {
                    managerIds = [teamData.managerId];
                }
            }
        }

        // 2. Chuẩn bị dữ liệu để lưu
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const payload: any = {
            title: data.title,
            content: data.content,
            channelId: data.channelId,
            channelDisplayName: data.channelDisplayName,
            channelUsername: data.channelUsername,
            status: data.status,
            updatedAt: new Date(),

            // Luôn cập nhật danh sách Manager mới nhất từ Team
            managerIds: managerIds,
        };

        // 3. Xử lý trường hợp TẠO MỚI vs CẬP NHẬT
        if (!scriptId) {
            // --- TẠO MỚI ---
            const newDoc = scriptsRef.doc();
            scriptId = newDoc.id;

            payload.id = scriptId;
            payload.userId = data.userId;
            payload.userName = data.userName;
            payload.teamId = data.teamId;
            payload.createdAt = new Date();

            // Khởi tạo các trường mặc định
            payload.isFeedbacked = false;
            payload.isUserUpdated = true;
            payload.isStatusChanged = false;
            payload.readBy = []; // Chưa ai đọc

            await newDoc.set(payload);
        } else {
            // --- CẬP NHẬT ---
            // Nếu là Manager sửa (Auto Save), lưu vết Manager
            if (data.managerId) {
                // Manager sửa thì không tính là "User Updated" để tránh hiện noti cho chính mình
                payload.isUserUpdated = false;
            } else {
                // User sửa -> Đánh dấu để Manager biết có thay đổi
                payload.isUserUpdated = true;
                // Khi User sửa nội dung, reset trạng thái "Đã đọc" của các manager (bắt họ đọc lại)
                payload.readBy = [];
            }

            await scriptsRef.doc(scriptId).update(payload);
        }

        revalidatePath('/scripts');
        revalidatePath('/scripts-manager'); // Refresh cả trang manager

        return { success: true, id: scriptId };

    } catch (error) {
        console.error("Save script error:", error);
        return { success: false, error: "Lỗi khi lưu kịch bản" };
    }
}

/**
 * Lấy danh sách Feedback của 1 Script
 */
export async function getScriptFeedbacks(scriptId: string) {
    try {
        // Query vào collection 'feedbacks'
        const snapshot = await adminDb.collection("feedbacks")
            .where("scriptId", "==", scriptId)
            .orderBy("createdAt", "desc") // Sắp xếp mới nhất lên đầu
            .get();

        // Map dữ liệu trả về
        const feedbacks = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Chuyển đổi Timestamp của Firestore sang Date của JS
                createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(),
            } as Feedback;
        });

        return feedbacks;
    } catch (error) {
        console.error("Lỗi lấy feedback:", error);
        // [QUAN TRỌNG]: Nếu lỗi do thiếu Index, dòng này sẽ in ra link tạo Index trong terminal server
        return [];
    }
}

export async function deleteScript(scriptId: string) {
    try {
        await adminDb.collection("scripts").doc(scriptId).delete();

        // (Tuỳ chọn) Xóa luôn các feedback liên quan để sạch db
        const feedbackSnapshot = await adminDb.collection("feedbacks").where("scriptId", "==", scriptId).get();
        const batch = adminDb.batch();
        feedbackSnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        return { success: true };
    } catch (error) {
        console.error("Lỗi xóa script:", error);
        return { success: false, error: "Không thể xóa kịch bản." };
    }
}

export async function getManagerScripts(managerId: string) {
    try {
        const snapshot = await adminDb.collection("scripts")
            .where("managerIds", "array-contains", managerId)
            .orderBy("updatedAt", "desc")
            .get();

        const scripts = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Chuyển đổi Timestamp
                createdAt: (data.createdAt as Timestamp).toDate(),
                updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate() : undefined
            } as Script;
        });

        // Lọc bỏ bản nháp (nếu cần thiết, hoặc để Client lọc)
        return scripts.filter(script => script.status !== 'draft');
    } catch (error) {
        console.error("Lỗi lấy manager scripts:", error);
        return [];
    }
}

/**
 * Đánh dấu kịch bản là Đã đọc
 */
export async function markScriptAsRead(scriptId: string, userId: string) { // Cần nhận userId
    try {
        await adminDb.collection("scripts").doc(scriptId).update({
            readBy: FieldValue.arrayUnion(userId)
        });
        return { success: true };
    } catch (error) {
        console.error("Lỗi mark read:", error);
        return { success: false, error: "Lỗi cập nhật trạng thái đọc" };
    }
}

/**
 * Cập nhật trạng thái Script (Duyệt/Từ chối)
 */
export async function updateScriptStatus(scriptId: string, status: string) {
    try {
        await adminDb.collection("scripts").doc(scriptId).update({
            status: status,
            isStatusChanged: true, // Báo cho member biết
            updatedAt: Timestamp.now()
        });
        return { success: true };
    } catch (error) {
        return { success: false, error: "Lỗi cập nhật trạng thái" };
    }
}

/**
 * Tạo Feedback mới (Kèm markedText)
 */
export async function createFeedback(data: {
    scriptId: string;
    content: string;
    markedText: string;
    highlightId: string;
    managerId: string;
    managerName: string;
    userId: string;     // ID của member viết bài
    userName: string;   // Tên của member
    scriptContent: string;
}) {
    try {
        await adminDb.collection("feedbacks").add({
            highlightId: data.highlightId,
            scriptId: data.scriptId,
            content: data.content,
            markedText: data.markedText,
            managerId: data.managerId,
            managerName: data.managerName,
            userId: data.userId,
            userName: data.userName,
            status: 'unaddressed' as FeedbackStatus,
            createdAt: Timestamp.now(),
            isRead: false
        });

        // Cập nhật trạng thái Script để báo Member có feedback
        await adminDb.collection("scripts").doc(data.scriptId).update({
            content: data.scriptContent,
            isFeedbacked: true,
            status: 'pending', // Thường có feedback là yêu cầu sửa (hoặc pending tùy logic)
            updatedAt: Timestamp.now()
        });

        return { success: true };
    } catch (error) {
        console.error("Lỗi tạo feedback:", error);
        return { success: false, error: "Không thể gửi feedback" };
    }
}

export async function deleteFeedback(data: {
    feedbackId: string;
    scriptId: string;
    newScriptContent: string; // Nội dung HTML mới sau khi đã gỡ highlight
}) {
    try {
        // 1. Xóa bản ghi trong collection feedbacks
        await adminDb.collection("feedbacks").doc(data.feedbackId).delete();

        // 2. Cập nhật lại nội dung script (để mất màu vàng vĩnh viễn)
        await adminDb.collection("scripts").doc(data.scriptId).update({
            content: data.newScriptContent,
            updatedAt: Timestamp.now()
        });

        return { success: true };
    } catch (error) {
        console.error("Lỗi xóa feedback:", error);
        return { success: false, error: "Không thể xóa feedback" };
    }
}

export async function updateFeedbackStatus(data: {
    feedbackId: string;
    status: FeedbackStatus;
    scriptId?: string;
    newScriptContent?: string;
}) {
    try {
        const batch = adminDb.batch();

        // 1. Update Feedback Status (Bỏ updatedAt nếu không cần)
        const feedbackRef = adminDb.collection("feedbacks").doc(data.feedbackId);
        batch.update(feedbackRef, {
            status: data.status,
            // updatedAt: Timestamp.now() // <-- Bỏ dòng này nếu DB bạn không có field này
        });

        // 2. Update Script Content
        if (data.scriptId && data.newScriptContent !== undefined) {
            const scriptRef = adminDb.collection("scripts").doc(data.scriptId);
            batch.update(scriptRef, {
                content: data.newScriptContent,
                // updatedAt: Timestamp.now() // <-- Tương tự
            });
        }

        await batch.commit();
        return { success: true };
    } catch (error) {
        console.error("Lỗi cập nhật feedback:", error);
        return { success: false, error: "Lỗi hệ thống" };
    }
}