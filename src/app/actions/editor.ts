// src/app/actions/editor.ts
'use server'

import { adminDb } from "@/lib/firebase-admin";
import { Editor } from "@/types";

/**
 * Lấy danh sách Editor
 */
export async function getEditors() {
    try {
        const snapshot = await adminDb.collection("editors").get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Editor[];
    } catch (error) {
        console.error("Lỗi lấy danh sách editor:", error);
        return [];
    }
}

/**
 * Tạo Editor mới
 */
export async function createEditor(data: { name: string; email?: string }) {
    try {
        // Lưu email rỗng nếu không nhập để tránh lỗi undefined trong DB
        await adminDb.collection("editors").add({
            name: data.name,
            email: data.email || ""
        });

        return { success: true };
    } catch (error) {
        console.error("Lỗi tạo editor:", error);
        return { success: false, error: "Không thể tạo Editor." };
    }
}

/**
 * Cập nhật thông tin Editor
 */
export async function updateEditor(id: string, data: { name: string; email?: string }) {
    try {
        await adminDb.collection("editors").doc(id).update({
            name: data.name,
            email: data.email || ""
        });
        return { success: true };
    } catch (error) {
        console.error("Lỗi cập nhật editor:", error);
        return { success: false, error: "Lỗi cập nhật." };
    }
}

/**
 * Xóa Editor
 */
export async function deleteEditor(id: string) {
    try {
        await adminDb.collection("editors").doc(id).delete();
        return { success: true };
    } catch (error) {
        console.error("Lỗi xóa editor:", error);
        return { success: false, error: "Không thể xóa editor." };
    }
}