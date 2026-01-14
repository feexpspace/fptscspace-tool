// src/app/actions/script.ts
'use server'

import { adminDb } from "@/lib/firebase-admin"; // <--- Dùng Admin SDK
import { Feedback, Script } from "@/types/index";
import { Timestamp } from "firebase-admin/firestore";

// Member gửi kịch bản
export async function createScript(data: Omit<Script, 'id' | 'createdAt' | 'status'>) {
    try {
        await adminDb.collection("scripts").add({
            ...data,
            status: 'draft',
            createdAt: Timestamp.now(), // Dùng Timestamp của Admin SDK
        });
        return { success: true };
    } catch (error) {
        console.error("Lỗi tạo kịch bản:", error);
        throw new Error("Không thể tạo kịch bản");
    }
}

// Manager duyệt/từ chối
export async function updateScriptStatus(scriptId: string, status: 'approved' | 'rejected') {
    try {
        await adminDb.collection("scripts").doc(scriptId).update({
            status: status,
            updatedAt: Timestamp.now() // Nên lưu thêm thời gian cập nhật
        });
        return { success: true };
    } catch (error) {
        console.error("Lỗi cập nhật trạng thái:", error);
        throw new Error("Không thể cập nhật trạng thái");
    }
}

// Manager gửi Feedback
export async function sendFeedback(feedback: Omit<Feedback, 'id' | 'createdAt'>) {
    try {
        await adminDb.collection("feedbacks").add({
            ...feedback,
            createdAt: Timestamp.now(),
            isReaded: false
        });
        return { success: true };
    } catch (error) {
        console.error("Lỗi gửi feedback:", error);
        throw new Error("Không thể gửi feedback");
    }
}