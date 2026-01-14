'use server'

import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { Statistic, MonthlyStatistic } from "@/types";

/**
 * HÀM 1: Lấy lịch sử thống kê chi tiết (Bảng 'statistics')
 * Thường dùng để vẽ biểu đồ chi tiết trong khoảng thời gian (VD: 30 ngày qua)
 */
export async function getDailyStatistics(
    channelId: string,
    startDate: Date,
    endDate: Date
): Promise<Statistic[]> {
    try {
        const snapshot = await adminDb.collection("statistics")
            .where("channelId", "==", channelId)
            .where("updatedAt", ">=", Timestamp.fromDate(startDate))
            .where("updatedAt", "<=", Timestamp.fromDate(endDate))
            .orderBy("updatedAt", "asc") // Sắp xếp tăng dần theo thời gian để vẽ biểu đồ
            .get();

        const stats: Statistic[] = snapshot.docs.map(doc => {
            const data = doc.data();

            // Xử lý convert Timestamp -> Date
            let updatedAt = new Date();
            if (data.updatedAt && typeof data.updatedAt.toDate === 'function') {
                updatedAt = data.updatedAt.toDate();
            } else if (data.updatedAt) {
                updatedAt = new Date(data.updatedAt);
            }

            return {
                id: doc.id,
                ...data,
                updatedAt: updatedAt
            } as Statistic;
        });

        return stats;
    } catch (error) {
        console.error("Error getting daily statistics:", error);
        return [];
    }
}

/**
 * HÀM 2: Lấy thống kê theo tháng (Bảng 'monthly_statistics')
 * Dùng cho biểu đồ tăng trưởng theo năm (Yearly Growth)
 */
export async function getMonthlyStatistics(
    channelId: string,
    year: number
): Promise<MonthlyStatistic[]> {
    try {
        // Tạo chuỗi lọc tháng, ví dụ "2024-"
        const yearPrefix = `${year}-`;

        // Vì field 'month' là string (YYYY-MM), ta có thể query theo string comparison
        // Hoặc query where('channelId') rồi filter js nếu data ít.
        // Cách tốt nhất với Firestore là query range string.

        const snapshot = await adminDb.collection("monthly_statistics")
            .where("channelId", "==", channelId)
            .where("month", ">=", `${year}-01`)
            .where("month", "<=", `${year}-12`)
            .orderBy("month", "asc")
            .get();

        const stats: MonthlyStatistic[] = snapshot.docs.map(doc => {
            return {
                id: doc.id,
                ...doc.data()
            } as MonthlyStatistic;
        });

        return stats;
    } catch (error) {
        console.error("Error getting monthly statistics:", error);
        return [];
    }
}

/**
 * HÀM 3: Lấy thống kê MỚI NHẤT của một list các User (Dành cho Dashboard Overview)
 * Hàm này thay thế logic phức tạp trong page.tsx cũ
 */
export async function getLatestStatsForTeam(userIds: string[]): Promise<Statistic[]> {
    if (userIds.length === 0) return [];

    try {
        // Firestore không hỗ trợ query lấy "latest per group" trực tiếp hiệu quả.
        // Cách tối ưu nhất: Query song song cho từng user lấy 1 bản ghi mới nhất.

        const promises = userIds.map(async (uid) => {
            const snapshot = await adminDb.collection("statistics")
                .where("userId", "==", uid)
                .orderBy("updatedAt", "desc")
                .limit(1)
                .get();

            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                const data = doc.data();

                // Convert Date
                let updatedAt = new Date();
                if (data.updatedAt && typeof data.updatedAt.toDate === 'function') {
                    updatedAt = data.updatedAt.toDate();
                }

                return {
                    id: doc.id,
                    ...data,
                    updatedAt: updatedAt
                } as Statistic;
            }
            return null;
        });

        const results = await Promise.all(promises);

        // Lọc bỏ các giá trị null (user chưa có thống kê)
        return results.filter((stat): stat is Statistic => stat !== null);

    } catch (error) {
        console.error("Error getting latest stats for team:", error);
        return [];
    }
}