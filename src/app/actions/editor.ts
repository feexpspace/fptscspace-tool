// src/app/actions/editor.ts
'use server'

import { adminDb } from "@/lib/firebase-admin";
import { Editor, Video } from "@/types";
import { Timestamp } from "firebase-admin/firestore";

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

export async function getEditorStats(editorId: string, year: number) {
    try {
        const startDate = new Date(year, 0, 1); // 1/1
        const endDate = new Date(year, 11, 31, 23, 59, 59); // 31/12

        // 1. Lấy toàn bộ video trong năm
        const query = adminDb.collection("videos")
            .where("editorId", "==", editorId)
            .where("createTime", ">=", Timestamp.fromDate(startDate))
            .where("createTime", "<=", Timestamp.fromDate(endDate))
            .orderBy("createTime", "desc");

        const snapshot = await query.get();

        const videos = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createTime: data.createTime.toDate(),
            } as Video;
        });

        // 2. Tính tổng quan cả năm (Overview)
        const overview = videos.reduce((acc, curr) => ({
            totalVideos: acc.totalVideos + 1,
            totalViews: acc.totalViews + (curr.stats?.view || 0),
            totalEngagement: acc.totalEngagement + (curr.stats?.like || 0) + (curr.stats?.comment || 0) + (curr.stats?.share || 0),
        }), { totalVideos: 0, totalViews: 0, totalEngagement: 0 });

        // 3. Nhóm video theo tháng
        // Cấu trúc Map: Key là tháng (1-12) -> Value là { videos: [], stats: {} }
        const groupsMap = new Map<number, { videos: Video[], monthView: number }>();

        videos.forEach(video => {
            const month = video.createTime.getMonth() + 1; // 1-12

            if (!groupsMap.has(month)) {
                groupsMap.set(month, { videos: [], monthView: 0 });
            }

            const group = groupsMap.get(month)!;
            group.videos.push(video);
            group.monthView += (video.stats?.view || 0);
        });

        // Chuyển Map thành Array và sort giảm dần theo tháng (Tháng 12 -> Tháng 1)
        const monthlyGroups = Array.from(groupsMap.entries())
            .map(([month, data]) => ({
                month,
                videos: data.videos,
                totalViews: data.monthView
            }))
            .sort((a, b) => b.month - a.month);

        return {
            overview,
            monthlyGroups
        };

    } catch (error) {
        console.error("Lỗi lấy thống kê editor:", error);
        return {
            overview: { totalVideos: 0, totalViews: 0, totalEngagement: 0 },
            monthlyGroups: []
        };
    }
}