// src/app/actions/dashboard.ts
'use server'

import { adminDb } from "@/lib/firebase-admin";
import { Channel, Statistic, Team, MonthlyStatistic } from "@/types";

// Hàm chia nhỏ mảng để tránh giới hạn query 'in' của Firestore (max 30 items)
function chunkArray<T>(array: T[], size: number): T[][] {
    const chunked: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunked.push(array.slice(i, i + size));
    }
    return chunked;
}

export async function getManagerDashboardData(managerId: string, year: number) {
    try {
        // 1. Lấy thông tin Team mà Manager này thuộc về
        const teamSnap = await adminDb.collection("teams")
            .where("managerIds", "array-contains", managerId)
            .limit(1)
            .get();

        if (teamSnap.empty) {
            return { team: null, channels: [], latestStats: [], monthlyStats: [] };
        }

        const teamDoc = teamSnap.docs[0];
        const teamData = teamDoc.data();

        const team: Team = {
            id: teamDoc.id,
            ...teamData,
            createdAt: teamData.createdAt?.toDate ? teamData.createdAt.toDate() : new Date(),
        } as unknown as Team;

        // 2. Gộp ID của tất cả Members và tất cả Managers
        // Vì data đã chuẩn, ta lấy trực tiếp mảng managerIds
        const memberIds: string[] = teamData.members || [];
        const managerIds: string[] = teamData.managerIds || [];

        // Gộp lại và loại bỏ trùng lặp (nếu có user vừa là member vừa là manager - dù hiếm)
        const allUserIds = Array.from(new Set([...memberIds, ...managerIds]));

        if (allUserIds.length === 0) {
            return { team, channels: [], latestStats: [], monthlyStats: [] };
        }

        // 3. Query Channels dựa trên danh sách tổng hợp (allUserIds)
        const userChunks = chunkArray(allUserIds, 10);
        const channelPromises = userChunks.map(chunk =>
            adminDb.collection("channels").where("userId", "in", chunk).get()
        );
        const channelSnapshots = await Promise.all(channelPromises);

        const channels: Channel[] = channelSnapshots.flatMap(snap =>
            snap.docs.map(doc => {
                const d = doc.data();
                return {
                    id: doc.id,
                    ...d,
                    createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : undefined,
                    updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate() : undefined,
                } as unknown as Channel;
            })
        );

        if (channels.length === 0) {
            return { team, channels: [], latestStats: [], monthlyStats: [] };
        }

        const channelIds = channels.map(c => c.id);

        // 4. Lấy Statistics mới nhất
        const statsChunks = chunkArray(channelIds, 10);
        const statsPromises = statsChunks.map(chunk =>
            adminDb.collection("statistics").where("channelId", "in", chunk).get()
        );
        const statsSnapshots = await Promise.all(statsPromises);

        const latestStats: Statistic[] = statsSnapshots.flatMap(snap =>
            snap.docs.map(doc => {
                const d = doc.data();
                return { id: doc.id, ...d, updatedAt: d.updatedAt?.toDate() } as unknown as Statistic;
            })
        );

        // 5. Lấy Monthly Stats theo Năm
        const startMonth = `${year}-01`;
        const endMonth = `${year}-12`;
        const monthlyPromises = statsChunks.map(chunk =>
            adminDb.collection("monthly_statistics")
                .where("channelId", "in", chunk)
                .where("month", ">=", startMonth)
                .where("month", "<=", endMonth)
                .get()
        );
        const monthlySnapshots = await Promise.all(monthlyPromises);
        const monthlyStats: MonthlyStatistic[] = monthlySnapshots.flatMap(snap =>
            snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as MonthlyStatistic))
        );

        return {
            team,
            channels,
            latestStats,
            monthlyStats
        };

    } catch (error) {
        console.error("Error fetching manager dashboard data:", error);
        return { team: null, channels: [], latestStats: [], monthlyStats: [] };
    }
}